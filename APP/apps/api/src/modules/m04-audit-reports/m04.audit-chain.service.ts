/**
 * M04 — chaîne d'audit inaltérable (EF-04-01/02, RM-04-01).
 * Consomme les événements C5 relayés par l'outbox (abonnement dans m04.module.ts) et les
 * chaîne par empreinte : hash(n) = sha256(prevHash | canonical(événement)).
 * Service EXPORTÉ par le module — M16 consommera verifyChain (alerte critique au Super Admin).
 */
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ChainablePayload, findChainBreak, GENESIS_HASH, StoredEvent } from "../../common/crypto/hash-chain";
import { PrismaService } from "../../common/prisma.service";
import { chainEvent, INTEGRITY_CHECK_DEFAULT_EVENTS } from "./m04.policies";

export interface ChainVerificationResult {
  ok: boolean;
  /** Nombre d'événements contrôlés dans cette passe. */
  checked: number;
  /** Premier maillon cassé (seq, sérialisé en string — BigInt). */
  brokenAtSeq?: string;
  /** Dernier seq contrôlé — pour chaîner les passes (les seq ont des trous). */
  lastCheckedSeq?: string;
}

@Injectable()
export class AuditChainService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * EF-04-01 — ajoute un événement C5 au journal (écriture seule, RM-04-01 : ni update ni delete).
   * Transaction SÉRIALISÉE : lecture du dernier maillon + insertion atomiques — deux appends
   * concurrents ne peuvent pas chaîner le même prevHash (l'un des deux échoue et sera rejoué).
   * Idempotent-safe : toute erreur est PROPAGÉE — l'outbox ne marque pas l'événement traité
   * et le rejouera (CU-04-01 : aucun événement perdu).
   */
  async append(payload: Record<string, unknown>): Promise<{ seq: string }> {
    const entry = this.toChainablePayload(payload);
    // Les conflits de sérialisation (P2034) sont ATTENDUS entre appends concurrents :
    // PostgreSQL demande de rejouer la transaction — on rejoue, le chaînage reste exact.
    const MAX_RETRIES = 5;
    for (let attempt = 1; ; attempt++) {
      try {
        const row = await this.prisma.$transaction(
          async (tx) => {
            const last = await tx.auditEvent.findFirst({ orderBy: { seq: "desc" }, select: { hash: true } });
            // prevHash = empreinte du dernier événement, ou GENESIS_HASH pour le premier (EF-04-02).
            const { prevHash, hash } = chainEvent(last?.hash ?? null, entry);
            return tx.auditEvent.create({
              data: {
                actorId: entry.actorId,
                actorType: entry.actorType,
                action: entry.action,
                resource: entry.resource,
                // RM-04-03 : le contexte arrive déjà épuré (AuditEmitter) — jamais de contenu médical.
                context: entry.context === null ? Prisma.JsonNull : (entry.context as Prisma.InputJsonValue),
                prevHash,
                hash,
                // createdAt = l'horodatage HACHÉ (createdAtIso) : l'empreinte doit se recalculer
                // à l'identique depuis la base seule (verifyChain).
                createdAt: new Date(entry.createdAtIso),
              },
              select: { seq: true },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return { seq: row.seq.toString() };
      } catch (err) {
        const isSerializationConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
        if (!isSerializationConflict || attempt >= MAX_RETRIES) throw err; // transitoire non résolu → l'outbox rejouera
        await new Promise((r) => setTimeout(r, attempt * 25)); // micro-recul progressif
      }
    }
  }

  /**
   * EF-04-02 — vérifie l'intégrité d'un segment de chaîne via findChainBreak.
   * Sans fromSeq : depuis l'origine (prevHash attendu = GENESIS_HASH). Avec fromSeq : le
   * prevHash attendu est l'empreinte du maillon précédant le segment.
   * Appelée par GET /v1/admin/audit/integrity et, à terme, par la vérification quotidienne (M16).
   */
  async verifyChain(fromSeq?: bigint, limit: number = INTEGRITY_CHECK_DEFAULT_EVENTS): Promise<ChainVerificationResult> {
    const rows = await this.prisma.auditEvent.findMany({
      where: fromSeq === undefined ? undefined : { seq: { gte: fromSeq } },
      orderBy: { seq: "asc" },
      take: limit,
    });
    if (rows.length === 0) return { ok: true, checked: 0 };

    const firstSeq = rows[0].seq;
    const previous = await this.prisma.auditEvent.findFirst({
      where: { seq: { lt: firstSeq } },
      orderBy: { seq: "desc" },
      select: { hash: true },
    });
    const expectedPrev = previous?.hash ?? GENESIS_HASH;

    const stored: StoredEvent[] = rows.map((r) => ({
      actorId: r.actorId,
      actorType: r.actorType,
      action: r.action,
      resource: r.resource,
      context: r.context ?? null,
      createdAtIso: r.createdAt.toISOString(),
      prevHash: r.prevHash,
      hash: r.hash,
    }));
    const brokenIndex = findChainBreak(stored, expectedPrev);
    const lastCheckedSeq = rows[rows.length - 1]!.seq.toString();
    if (brokenIndex === -1) return { ok: true, checked: rows.length, lastCheckedSeq };
    // Rupture de chaîne = altération, insertion ou suppression (RM-04-01) — alerte critique (EF-04-02).
    return { ok: false, checked: rows.length, brokenAtSeq: rows[brokenIndex].seq.toString(), lastCheckedSeq };
  }

  /**
   * Normalise le payload outbox "audit.event" (forme AuditEmitter) en charge chaînable.
   * createdAtIso est re-normalisé via toISOString AVANT hachage : l'empreinte reste
   * recalculable depuis la colonne createdAt (précision milliseconde, timestamp(3)).
   * Payload définitivement illisible → entrée de QUARANTAINE chaînée (jamais de pilule
   * empoisonnée qui bloquerait toute la file outbox — revue D-046) ; le brut est conservé
   * tronqué dans le contexte pour investigation.
   */
  private toChainablePayload(payload: Record<string, unknown>): ChainablePayload {
    const action = payload["action"];
    const rawIso = typeof payload["createdAtIso"] === "string" ? payload["createdAtIso"] : new Date().toISOString();
    const createdAt = new Date(rawIso);
    const isoOk = !Number.isNaN(createdAt.getTime());
    if (typeof action !== "string" || action.length === 0 || !isoOk) {
      return {
        actorId: null,
        actorType: "system",
        action: "m04.event.malformed",
        resource: null,
        context: { raw: JSON.stringify(payload).slice(0, 2000) },
        createdAtIso: new Date().toISOString(),
      };
    }
    return {
      actorId: typeof payload["actorId"] === "string" ? payload["actorId"] : null,
      actorType: typeof payload["actorType"] === "string" ? payload["actorType"] : null,
      action,
      resource: typeof payload["resource"] === "string" ? payload["resource"] : null,
      context: payload["context"] ?? null,
      createdAtIso: createdAt.toISOString(),
    };
  }
}

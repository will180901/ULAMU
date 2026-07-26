/**
 * M05 — PresenceService : statut de présence des professionnels (EF-05-05/06 ; CU-05-04).
 * Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * Principes :
 * - RM-05-04 / EF-05-06 : « on ne paie jamais un absent » — disponible pour initiation
 *   = ONLINE **et** battement de cœur plus frais que PM-26. Un ONLINE rassis vaut OFFLINE ;
 * - la bascule automatique en absent (CU-05-04, PM-26) est appliquée À LA LECTURE
 *   (ici et dans l'annuaire) — AUCUN poller dédié ;
 * - cloche (CU-05-05) : quand le professionnel REDEVIENT disponible (heartbeat ou setState
 *   depuis OFFLINE/DND — y compris depuis un ONLINE rassis, équivalent OFFLINE), chaque
 *   alerte non notifiée et non expirée est notifiée UNE seule fois (notify.request C4),
 *   réservation conditionnelle + notifiedAt DANS la même transaction (D-046).
 *
 * Expose le contrat consommé par M06 (signature EXACTE) : isAvailableForInitiation(professionalId).
 */
import { Injectable } from "@nestjs/common";
import { Prisma, PresenceStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { presenceIsAvailable, PresenceStateCode } from "./m05.policies";

export interface PresenceView {
  state: PresenceStateCode;
  since: string; // ISO — début de l'état courant
  lastHeartbeatAt: string; // ISO
  availableForInitiation: boolean; // EF-05-06, calculé à l'instant de la réponse
}

@Injectable()
export class PresenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
  ) {}

  // ── Contrat M06 — signature EXACTE ──────────────────────────────────────────

  /**
   * RM-05-04 : la poignée de main commence par la présence. ONLINE + battement frais
   * (< PM-26 s) — un ONLINE rassis vaut OFFLINE (EF-05-06), évalué à la lecture.
   */
  async isAvailableForInitiation(professionalId: string): Promise<boolean> {
    const pm26S = await this.params.getInt("PM-26");
    const row = await this.prisma.presenceStatus.findUnique({ where: { accountId: professionalId } });
    if (!row) return false; // jamais connecté au web = absent
    return presenceIsAvailable(row.state, row.lastHeartbeatAt.getTime(), Date.now(), pm26S);
  }

  // ── EF-05-05 : battement de cœur web (CU-05-04) ─────────────────────────

  /**
   * Upsert ONLINE + lastHeartbeatAt=now — SAUF en « Ne pas déranger » (choix explicite
   * du professionnel : le battement rafraîchit l'activité mais ne réactive pas la présence).
   * Si le professionnel REDEVIENT disponible (il était OFFLINE/DND/ONLINE rassis), les
   * cloches posées sur lui sont déclenchées dans la même transaction (CU-05-05).
   */
  async heartbeat(accountId: string): Promise<PresenceView> {
    const pm26S = await this.params.getInt("PM-26");
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const existing = await tx.presenceStatus.findUnique({ where: { accountId } });
      const wasAvailable = existing
        ? presenceIsAvailable(existing.state, existing.lastHeartbeatAt.getTime(), now.getTime(), pm26S)
        : false;

      let next: PresenceStatus;
      if (!existing) {
        next = await tx.presenceStatus.create({
          data: { accountId, state: "ONLINE", since: now, lastHeartbeatAt: now },
        });
      } else if (existing.state === "DO_NOT_DISTURB") {
        // EF-05-05 : DND reste DND — seul le battement est rafraîchi.
        next = await tx.presenceStatus.update({ where: { accountId }, data: { lastHeartbeatAt: now } });
      } else {
        next = await tx.presenceStatus.update({
          where: { accountId },
          data: {
            state: "ONLINE",
            lastHeartbeatAt: now,
            // « depuis » ne change que si l'état AFFICHÉ change (OFFLINE → ONLINE).
            ...(existing.state !== "ONLINE" ? { since: now } : {}),
          },
        });
      }

      const isNowAvailable = presenceIsAvailable(next.state, next.lastHeartbeatAt.getTime(), now.getTime(), pm26S);
      if (!wasAvailable && isNowAvailable) {
        await this.fireAvailabilityAlerts(tx, accountId, now); // CU-05-05
      }
      return this.toView(next, now, pm26S);
    });
  }

  // ── EF-05-05 : bascule en un clic (CU-05-04) ────────────────────────────────

  /**
   * Bascule explicite ONLINE / DO_NOT_DISTURB / OFFLINE. L'action vaut activité web :
   * lastHeartbeatAt est rafraîchi. Passage vers ONLINE depuis un état indisponible →
   * déclenchement des cloches (CU-05-05). Audité C5 (action explicite, dans la transaction).
   */
  async setState(accountId: string, state: PresenceStateCode): Promise<PresenceView> {
    const pm26S = await this.params.getInt("PM-26");
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const existing = await tx.presenceStatus.findUnique({ where: { accountId } });
      const wasAvailable = existing
        ? presenceIsAvailable(existing.state, existing.lastHeartbeatAt.getTime(), now.getTime(), pm26S)
        : false;
      const previousState: PresenceStateCode = existing?.state ?? "OFFLINE";

      const next = await tx.presenceStatus.upsert({
        where: { accountId },
        create: { accountId, state, since: now, lastHeartbeatAt: now },
        update: {
          state,
          lastHeartbeatAt: now,
          ...(previousState !== state ? { since: now } : {}),
        },
      });

      const isNowAvailable = presenceIsAvailable(next.state, next.lastHeartbeatAt.getTime(), now.getTime(), pm26S);
      if (!wasAvailable && isNowAvailable) {
        await this.fireAvailabilityAlerts(tx, accountId, now); // CU-05-05
      }

      // C5 : trace de la bascule — états seulement, jamais de contenu métier sensible.
      await this.audit.emit(tx, {
        actorId: accountId,
        actorType: "professional",
        action: "m05.presence.state_changed",
        resource: `account:${accountId}`,
        context: { from: previousState, to: state },
      });
      return this.toView(next, now, pm26S);
    });
  }

  /** Vue de l'état courant (présence du professionnel connecté). */
  async getMine(accountId: string): Promise<PresenceView> {
    const pm26S = await this.params.getInt("PM-26");
    const now = new Date();
    const row = await this.prisma.presenceStatus.findUnique({ where: { accountId } });
    if (!row) {
      return { state: "OFFLINE", since: now.toISOString(), lastHeartbeatAt: now.toISOString(), availableForInitiation: false };
    }
    return this.toView(row, now, pm26S);
  }

  // ── Cloche (EF-05-06 ; CU-05-05) — déclenchement au retour en ligne ─────────

  /**
   * Notifie UNE seule fois chaque alerte non notifiée et non expirée : réservation
   * conditionnelle (updateMany where notifiedAt: null, anti-double-envoi D-046) puis
   * notify.request (C4) — le tout DANS la transaction du changement de présence.
   * RM-14-03 : le payload ne contient aucune donnée médicale (identifiants seulement).
   */
  private async fireAvailabilityAlerts(tx: Prisma.TransactionClient, professionalId: string, now: Date): Promise<void> {
    const candidates = await tx.availabilityAlert.findMany({
      where: { professionalId, notifiedAt: null, expiresAt: { gt: now } },
      select: { id: true, patientId: true },
    });
    for (const alert of candidates) {
      const { count } = await tx.availabilityAlert.updateMany({
        where: { id: alert.id, notifiedAt: null },
        data: { notifiedAt: now },
      });
      if (count === 1) {
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: alert.patientId, template: "m05.pro.available", professionalId },
        });
      }
    }
  }

  private toView(row: PresenceStatus, now: Date, pm26S: number): PresenceView {
    return {
      state: row.state,
      since: row.since.toISOString(),
      lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
      availableForInitiation: presenceIsAvailable(row.state, row.lastHeartbeatAt.getTime(), now.getTime(), pm26S),
    };
  }
}

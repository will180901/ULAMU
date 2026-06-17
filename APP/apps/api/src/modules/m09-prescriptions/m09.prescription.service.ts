/**
 * M09 — PrescriptionService : la prescription, de la session à l'ordonnance scellée.
 * Spec : docs/cahier_des_charges/02_modules/M09_ordonnance_delivrance.md
 *
 * RM-09-01/EF-09-01 : on ne prescrit QUE depuis une session ACTIVE, et SEUL le professionnel
 * de la session (prescripteur d'une catégorie prescriptrice). Le patient et le sous-profil
 * « pour qui » sont ceux de la session — jamais saisis par le client (RM-09-02).
 *
 * Scellement (EF-09-04) : QR opaque fort + empreinte sha256 du contenu canonique, statut
 * ACTIVE, expiration PM-10, entrée PRESCRIPTION au Carnet (C2, dans la transaction), patient
 * notifié (C4), audit (C5). Lignes hors référentiel → file d'enrichissement (EF-09-02).
 *
 * Garde-fou allergies (EF-09-03) : chaque ligne référentielle est comparée aux allergies
 * actives du Carnet (M07). Une correspondance non confirmée par un motif explicite est
 * bloquante (409) ; chaque passage outre laisse une trace AllergyOverride + audit C5.
 *
 * Anti-TOCTOU (D-046) : l'annulation et l'expiration sont des updateMany CONDITIONNELS.
 */
import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CareSessionStatus, Medicament, Prisma, PrescriptionStatus, RecordEntryType, RecordProvenance } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { SessionService } from "../m06-handshake-session/m06.session.service";
import { HealthRecordReaderService } from "../m07-health-record/m07.reader.service";
import { HealthRecordWriterService } from "../m07-health-record/m07.writer.service";
import { CreatePrescriptionDto, PrescriptionLineDto } from "./m09.dto";
import {
  canCancel,
  computeBodyHash,
  expiryDate,
  generateQrToken,
  isExpired,
  isPrescribingCategory,
  matchingAllergies,
  qtyPrescribedValid,
  SealableContent,
} from "./m09.policies";

/** Carnet ciblé : sous-profil si la session est « pour » une personne à charge, sinon le patient. */
interface RecordOwner {
  patientId?: string;
  subProfileId?: string;
}

/** Ligne normalisée après validation de forme (exactement une nature : référentielle OU libre). */
interface NormalizedLine {
  medicamentId: string | null;
  freeText: string | null;
  posology: string;
  durationDays: number | null;
  qtyPrescribed: number;
}

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly sessions: SessionService,
    private readonly recordReader: HealthRecordReaderService,
    private readonly recordWriter: HealthRecordWriterService,
  ) {}

  // ── EF-09-01/02/03/04 : créer en session ────────────────────────────────────

  /**
   * Crée et scelle une ordonnance depuis une session active, par le prescripteur de la session.
   * < 5 s (CU-09-01) : le garde-fou allergies (EF-09-03) interroge le Carnet AVANT la
   * transaction, puis tout le scellement (ordonnance, lignes, Carnet C2, notif, audit) tient
   * dans une seule transaction.
   */
  async createInSession(actor: AuthenticatedActor, sessionId: string, dto: CreatePrescriptionDto) {
    // 1. Session ACTIVE + acteur = prescripteur (RM-09-01, EF-09-01). loadForParticipant
    //    masque la session (404) à quiconque n'en est pas participant.
    const session = await this.sessions.loadForParticipant(actor, sessionId);
    const settled = await this.sessions.settle(session);
    if (settled.status !== CareSessionStatus.ACTIVE) {
      throw new ConflictException("On ne prescrit que depuis une session active (D-014, RM-09-01)");
    }
    if (settled.professionalId !== actor.accountId) {
      throw new ForbiddenException("Seul le professionnel de la session prescrit (RM-09-01)");
    }
    await this.assertPrescriber(actor.accountId);

    // 2. Lignes : exclusivité médicament/freeText, quantité > 0 (EF-09-02).
    const lines = this.normalizeLines(dto.lines);
    const owner: RecordOwner = settled.subProfileId
      ? { subProfileId: settled.subProfileId }
      : { patientId: settled.patientAccountId };

    // 3. Garde-fou allergies (EF-09-03) — sur les lignes référentielles uniquement, AVANT la
    //    transaction. Les médicaments sont chargés une fois (DCI + noms commerciaux).
    const medicamentIds = [...new Set(lines.filter((l) => l.medicamentId).map((l) => l.medicamentId as string))];
    const medicaments = await this.loadMedicaments(medicamentIds);
    const activeAllergies = await this.recordReader.getActiveAllergies(owner);
    const overridesByMed = new Map((dto.overrides ?? []).map((o) => [o.medicamentId, o.reason]));

    // Pour chaque ligne référentielle en conflit : soit un motif (passage outre tracé), soit
    // un blocage 409 listant l'allergie en cause (garde-fou, pas verrou).
    const blocking: Array<{ medicamentId: string; medicamentLabel: string; allergies: string[] }> = [];
    const overridesToTrace: Array<{ medicamentLabel: string; allergyLabel: string; reason: string }> = [];
    for (const line of lines) {
      if (!line.medicamentId) continue;
      const med = medicaments.get(line.medicamentId);
      if (!med) throw new BadRequestException("Médicament hors référentiel : choisissez un médicament valide (EF-09-02)");
      const hits = matchingAllergies([med.dci, ...med.commercialNames], activeAllergies);
      if (hits.length === 0) continue;
      const reason = overridesByMed.get(line.medicamentId);
      const label = this.medicamentLabel(med);
      if (!reason) {
        blocking.push({ medicamentId: line.medicamentId, medicamentLabel: label, allergies: hits });
      } else {
        for (const allergyLabel of hits) overridesToTrace.push({ medicamentLabel: label, allergyLabel, reason });
      }
    }
    if (blocking.length > 0) {
      // EF-09-03 : alerte BLOQUANTE — le prescripteur doit renoncer ou confirmer avec motif.
      throw new ConflictException({
        code: "ALLERGY_GUARD",
        message: "Alerte allergie : confirmez chaque médicament en cause avec un motif explicite (EF-09-03)",
        conflicts: blocking,
      });
    }

    // 4. Scellement (EF-09-04) dans UNE transaction : ordonnance + lignes + overrides +
    //    enrichissement + entrée Carnet (C2) + notification (C4) + audit (C5).
    const now = new Date();
    const pm10Days = await this.params.getInt("PM-10");
    const prescriptionId = randomUUID();
    const expiresAt = expiryDate(now, pm10Days);
    const qrToken = generateQrToken();

    const content: SealableContent = {
      prescriptionId,
      sessionId: settled.id,
      prescriberId: actor.accountId,
      patientAccountId: settled.patientAccountId,
      subProfileId: settled.subProfileId,
      expiresAtIso: expiresAt.toISOString(),
      lines: lines.map((l) => ({
        medicamentId: l.medicamentId,
        freeText: l.freeText,
        posology: l.posology,
        durationDays: l.durationDays,
        qtyPrescribed: l.qtyPrescribed,
      })),
    };
    const bodyHash = computeBodyHash(content);

    await this.prisma.$transaction(async (tx) => {
      await tx.prescription.create({
        data: {
          id: prescriptionId,
          sessionId: settled.id,
          prescriberId: actor.accountId,
          patientAccountId: settled.patientAccountId,
          subProfileId: settled.subProfileId,
          qrToken,
          bodyHash,
          status: PrescriptionStatus.ACTIVE,
          expiresAt,
          lines: {
            create: lines.map((l) => ({
              medicamentId: l.medicamentId,
              freeText: l.freeText,
              posology: l.posology,
              durationDays: l.durationDays,
              qtyPrescribed: l.qtyPrescribed,
            })),
          },
        },
      });

      // EF-09-03 : chaque passage outre du garde-fou est tracé (AllergyOverride + audit C5).
      for (const ov of overridesToTrace) {
        await tx.allergyOverride.create({
          data: {
            prescriptionId,
            lineLabel: ov.medicamentLabel,
            allergyLabel: ov.allergyLabel,
            reason: ov.reason,
            prescriberId: actor.accountId,
          },
        });
        await this.audit.emit(tx, {
          actorId: actor.accountId,
          actorType: "professional",
          action: "m09.allergy.override",
          resource: `prescription:${prescriptionId}`,
          // RM-04-03 : libellés du médicament/allergie et motif — jamais le contenu du Carnet.
          context: { medicament: ov.medicamentLabel, allergy: ov.allergyLabel },
        });
      }

      // EF-09-02 : lignes hors référentiel → file d'enrichissement du référentiel. On relit
      // les lignes créées pour récupérer leurs identifiants.
      const created = await tx.prescriptionLine.findMany({ where: { prescriptionId } });
      for (const cl of created) {
        if (cl.medicamentId === null && cl.freeText) {
          await tx.referentialEnrichmentItem.create({
            data: { prescriptionId, lineId: cl.id, text: cl.freeText },
          });
        }
      }

      // C2 (EF-09-04) : l'ordonnance est versée au Carnet — payload SANS PII inutile
      // (références et données structurées minimales, jamais d'identité étalée).
      await this.recordWriter.appendEntry(tx, {
        ...(owner.subProfileId ? { ownerSubProfileId: owner.subProfileId } : { ownerPatientId: owner.patientId }),
        type: RecordEntryType.PRESCRIPTION,
        provenance: RecordProvenance.RECORDED_BY_PROFESSIONAL,
        authorId: actor.accountId,
        sourceRef: `prescription:${prescriptionId}`,
        payload: {
          event: "sealed",
          prescriptionId,
          lineCount: lines.length,
          expiresAtIso: expiresAt.toISOString(),
        },
      });

      // C4 : le patient (ou le tuteur via M07) est notifié — JAMAIS le contenu (RM-14-03).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: settled.patientAccountId, template: "m09.prescription.sealed", prescriptionId },
      });
      // C5 : traçabilité de bout en bout (RM-09-06) — qui a prescrit, quand, combien de lignes.
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m09.prescription.sealed",
        resource: `prescription:${prescriptionId}`,
        context: { sessionId: settled.id, lineCount: lines.length, overrides: overridesToTrace.length },
      });
    });

    // RM-09-04 : on rend l'ordonnance et son QR au prescripteur/patient — pas le Carnet.
    return this.getPrescriptionForPatient(prescriptionId);
  }

  // ── EF-09-08 / CU-09-04 : annuler ───────────────────────────────────────────

  /**
   * Annule une ordonnance NON entièrement délivrée — SEUL le prescripteur (CU-09-04). Motif
   * obligatoire, QR invalidé (RM-09-05 : pas de réactivation), patient notifié. Transition
   * conditionnelle (D-046) : une délivrance/annulation concurrente fait échouer proprement.
   */
  async cancel(actor: AuthenticatedActor, id: string, reason: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException("Ordonnance introuvable");
    if (prescription.prescriberId !== actor.accountId) {
      throw new ForbiddenException("Seul le prescripteur peut annuler son ordonnance (CU-09-04)");
    }
    if (!canCancel(prescription.status)) {
      throw new ConflictException(
        "Cette ordonnance ne peut plus être annulée (déjà délivrée, expirée ou annulée — RM-09-05)",
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.prescription.updateMany({
        where: { id, status: { in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED] } },
        data: {
          status: PrescriptionStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: reason,
          // RM-09-05 : QR rendu inerte et non devinable — l'unicité (qrToken @unique) est
          // préservée par un préfixe horodaté ; l'ancien jeton ne résout plus rien.
          qrToken: `cancelled:${now.getTime()}:${prescription.qrToken}`,
        },
      });
      if (count === 0) {
        throw new ConflictException("L'ordonnance a changé d'état entre-temps — réessayez (D-046)");
      }
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: prescription.patientAccountId, template: "m09.prescription.cancelled", prescriptionId: id },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m09.prescription.cancelled",
        resource: `prescription:${id}`,
        context: { fromStatus: prescription.status }, // jamais le motif clinique (RM-04-03)
      });
    });
    return this.getPrescriptionForPatient(id);
  }

  // ── EF-09-09 : historique du patient ────────────────────────────────────────

  /** Ordonnances de l'acteur patient (actives, partielles, terminées), récentes d'abord. */
  async listForPatient(actor: AuthenticatedActor) {
    const rows = await this.prisma.prescription.findMany({
      where: { patientAccountId: actor.accountId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { lines: true },
    });
    // Expiration paresseuse (PM-10) au fil de la lecture (EF-09-08).
    const now = new Date();
    const settledRows = [];
    for (const p of rows) {
      settledRows.push(await this.lazyExpire(p, now));
    }
    const meds = await this.loadMedsForLines(settledRows.flatMap((p) => p.lines));
    const items = settledRows.map((settled) => this.toPatientView(settled, settled.lines, meds));
    return { items };
  }

  // ── EF-09-08 : expiration (paresseuse + balayage) ───────────────────────────

  /**
   * Balayage des ordonnances ACTIVE/PARTIALLY_DISPENSED échues → EXPIRED (PM-10). Cadencé par
   * M16/cron — AUCUN poller ici. Transition conditionnelle (D-046) + notification patient.
   */
  async sweepExpired(now: Date = new Date()): Promise<{ expired: number }> {
    const stale = await this.prisma.prescription.findMany({
      where: {
        status: { in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED] },
        expiresAt: { lte: now },
      },
      take: 200,
    });
    let expired = 0;
    for (const p of stale) {
      const before = p.status;
      const after = await this.expireOne(p.id, p.patientAccountId);
      if (after && before !== after) expired += 1;
    }
    return { expired };
  }

  // ── Lecture interne partagée (RM-09-04 : jamais le Carnet) ───────────────────

  /**
   * Détail d'une ordonnance, visible UNIQUEMENT du patient propriétaire ou du prescripteur —
   * 404 sinon (pas de fuite). RM-09-04 : on ne renvoie que l'ordonnance, jamais le Carnet.
   */
  async getForActor(actor: AuthenticatedActor, id: string) {
    const p = await this.prisma.prescription.findUnique({ where: { id }, include: { lines: true } });
    if (!p || (p.patientAccountId !== actor.accountId && p.prescriberId !== actor.accountId)) {
      throw new NotFoundException("Ordonnance introuvable");
    }
    const settled = await this.lazyExpire(p, new Date());
    const meds = await this.loadMedsForLines(settled.lines);
    return this.toPatientView(settled, settled.lines, meds);
  }

  /** Vue patient d'une ordonnance par id — expiration paresseuse appliquée. */
  async getPrescriptionForPatient(id: string) {
    const p = await this.prisma.prescription.findUnique({ where: { id }, include: { lines: true } });
    if (!p) throw new NotFoundException("Ordonnance introuvable");
    const settled = await this.lazyExpire(p, new Date());
    const meds = await this.loadMedsForLines(settled.lines);
    return this.toPatientView(settled, settled.lines, meds);
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  /** RM-09-01 : l'acteur est un professionnel d'une catégorie prescriptrice. */
  private async assertPrescriber(accountId: string): Promise<void> {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { accountId } });
    if (!profile) {
      throw new ForbiddenException("Seul un professionnel peut prescrire (RM-09-01)");
    }
    if (!isPrescribingCategory(profile.category)) {
      throw new ForbiddenException("Votre catégorie professionnelle n'autorise pas la prescription (RM-09-01)");
    }
  }

  /** Valide l'exclusivité médicament/freeText et la quantité (EF-09-02). */
  private normalizeLines(lines: PrescriptionLineDto[]): NormalizedLine[] {
    return lines.map((l, i) => {
      const hasMed = Boolean(l.medicamentId);
      const hasFree = Boolean(l.freeText);
      if (hasMed === hasFree) {
        throw new BadRequestException(
          `Ligne ${i + 1} : exactement un médicament du référentiel OU un texte libre (EF-09-02)`,
        );
      }
      if (!qtyPrescribedValid(l.qtyPrescribed)) {
        throw new BadRequestException(`Ligne ${i + 1} : quantité prescrite strictement positive (EF-09-02)`);
      }
      return {
        medicamentId: l.medicamentId ?? null,
        freeText: l.freeText ?? null,
        posology: l.posology,
        durationDays: l.durationDays ?? null,
        qtyPrescribed: l.qtyPrescribed,
      };
    });
  }

  private async loadMedicaments(ids: string[]): Promise<Map<string, Medicament>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.medicament.findMany({ where: { id: { in: ids }, active: true } });
    return new Map(rows.map((m) => [m.id, m]));
  }

  private medicamentLabel(med: Medicament): string {
    return [med.dci, med.dosage].filter(Boolean).join(" ");
  }

  /** Expire paresseusement une ordonnance échue (EF-09-08) — auto-réparant à la lecture. */
  private async lazyExpire<T extends { id: string; status: PrescriptionStatus; expiresAt: Date; patientAccountId: string }>(
    p: T,
    now: Date,
  ): Promise<T> {
    if (
      (p.status === PrescriptionStatus.ACTIVE || p.status === PrescriptionStatus.PARTIALLY_DISPENSED) &&
      isExpired(p.expiresAt, now)
    ) {
      await this.expireOne(p.id, p.patientAccountId);
      return { ...p, status: PrescriptionStatus.EXPIRED };
    }
    return p;
  }

  /** Transition conditionnelle vers EXPIRED + notification patient (D-046). */
  private async expireOne(id: string, patientAccountId: string): Promise<PrescriptionStatus | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.prescription.updateMany({
        where: {
          id,
          status: { in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED] },
          expiresAt: { lte: new Date() },
        },
        data: { status: PrescriptionStatus.EXPIRED },
      });
      if (count === 0) return null;
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: patientAccountId, template: "m09.prescription.expired", prescriptionId: id },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m09.prescription.expired",
        resource: `prescription:${id}`,
      });
      return PrescriptionStatus.EXPIRED;
    });
  }

  /** Vue patient d'une ordonnance et de ses lignes (jamais le Carnet — RM-09-04). */
  private toPatientView(
    p: { id: string; status: PrescriptionStatus; qrToken: string; expiresAt: Date; createdAt: Date; cancelReason: string | null; subProfileId: string | null },
    lines: Array<{ id: string; medicamentId: string | null; freeText: string | null; posology: string; durationDays: number | null; qtyPrescribed: number; qtyDispensed: number }>,
    medsById: Map<string, Medicament> = new Map(),
  ) {
    return {
      id: p.id,
      status: p.status,
      // Le QR n'est présenté qu'au patient propriétaire (RM-09-02) ; inerte si annulée/expirée.
      qrToken: p.status === PrescriptionStatus.ACTIVE || p.status === PrescriptionStatus.PARTIALLY_DISPENSED ? p.qrToken : null,
      subProfileId: p.subProfileId,
      expiresAt: p.expiresAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      cancelReason: p.cancelReason,
      lines: lines.map((l) => ({
        id: l.id,
        medicamentId: l.medicamentId,
        // Nom réel du médicament référentiel (DCI + dosage) — null pour une ligne en texte libre (EF-09-02).
        medicationName: l.medicamentId ? (medsById.get(l.medicamentId) ? this.medicamentLabel(medsById.get(l.medicamentId)!) : null) : null,
        freeText: l.freeText,
        posology: l.posology,
        durationDays: l.durationDays,
        qtyPrescribed: l.qtyPrescribed,
        qtyDispensed: l.qtyDispensed,
        remaining: Math.max(0, l.qtyPrescribed - l.qtyDispensed),
      })),
    };
  }

  /**
   * Récupère la map des médicaments référencés par un ensemble de lignes, pour AFFICHAGE (une seule
   * requête). Contrairement à loadMedicaments() (utilisé à la prescription), ne filtre PAS sur
   * `active` : une ordonnance déjà émise doit garder le vrai nom même si le médicament a depuis
   * été retiré du référentiel.
   */
  private async loadMedsForLines(lines: Array<{ medicamentId: string | null }>): Promise<Map<string, Medicament>> {
    const ids = [...new Set(lines.map((l) => l.medicamentId).filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.medicament.findMany({ where: { id: { in: ids } } });
    return new Map(rows.map((m) => [m.id, m]));
  }
}

/**
 * M09 — DispensationService : la délivrance en pharmacie (scan, vérification, délivrance).
 * Spec : docs/cahier_des_charges/02_modules/M09_ordonnance_delivrance.md
 *
 * RM-09-02 : l'état d'une ordonnance vit côté SERVEUR — le scan renvoie l'état réel (lignes,
 * quantités RESTANTES, validité). Le QR n'est qu'une clé opaque, jamais une preuve.
 * RM-09-03 : structure vérifiée (C6, M03) + membre porteur du droit « dispense » (M02) +
 * connexion active (toute route est authentifiée) — sans exception.
 * RM-09-04 : le scan ne révèle QUE l'ordonnance, JAMAIS le Carnet du patient.
 *
 * Double délivrance impossible (CU-09-02/03) : état serveur + incrément CONDITIONNEL
 * (qtyDispensed + quantity ≤ qtyPrescribed, D-046). Le solde reste délivrable ailleurs
 * (multi-pharmacies). Lignes hors référentiel : délivrées SANS décrément de stock (M11).
 */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrescriptionStatus, RecordEntryType, RecordProvenance } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService } from "../../common/outbox.service";
import { PrismaService } from "../../common/prisma.service";
import { PermissionsService } from "../m02-roles-structures/m02.permissions.service";
import { VerificationStatusService } from "../m03-verification-contracts/m03.status.service";
import { HealthRecordWriterService } from "../m07-health-record/m07.writer.service";
import { StockAvailabilityService } from "../m11-stocks/m11.availability.service";
import { DispenseDto } from "./m09.dto";
import { dispenseQuantityValid, isDispensable, isExpired, remaining, statusAfterDispensation } from "./m09.policies";

@Injectable()
export class DispensationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly permissions: PermissionsService,
    private readonly verification: VerificationStatusService,
    private readonly recordWriter: HealthRecordWriterService,
    private readonly stock: StockAvailabilityService,
  ) {}

  // ── EF-09-06 : scanner & vérifier ───────────────────────────────────────────

  /**
   * Scan d'un QR par un membre de pharmacie : renvoie l'état RÉEL côté serveur (RM-09-02) —
   * lignes, quantités RESTANTES, validité. Exige le droit « dispense » sur une pharmacie
   * vérifiée (RM-09-03). RM-09-04 : JAMAIS le Carnet du patient.
   */
  async scanVerify(actor: AuthenticatedActor, qrToken: string, facilityId: string) {
    await this.assertCanDispense(actor, facilityId);
    const prescription = await this.loadByQr(qrToken);
    // L'expiration est appliquée paresseusement par le service de prescription ; ici on lit
    // l'état et on calcule la validité d'après l'horloge serveur (RM-09-02).
    const expired = isExpired(prescription.expiresAt, new Date());
    const effectiveStatus = expired && isDispensable(prescription.status) ? PrescriptionStatus.EXPIRED : prescription.status;
    return {
      prescriptionId: prescription.id,
      status: effectiveStatus,
      dispensable: isDispensable(effectiveStatus) && !expired,
      expiresAt: prescription.expiresAt.toISOString(),
      lines: prescription.lines.map((l) => ({
        id: l.id,
        medicamentId: l.medicamentId,
        freeText: l.freeText,
        posology: l.posology,
        durationDays: l.durationDays,
        qtyPrescribed: l.qtyPrescribed,
        qtyDispensed: l.qtyDispensed,
        remaining: remaining(l.qtyPrescribed, l.qtyDispensed),
      })),
    };
  }

  // ── EF-09-07 / CU-09-02 : délivrer (totale ou partielle) ────────────────────

  /**
   * Délivre les quantités saisies (EF-09-07). Une transaction : pour chaque ligne, contrôle
   * du restant (D-046 conditionnel), Dispensation + DispensationLine, décrément stock C3 sur
   * les lignes référentielles (FEFO M11), recalcul du statut (DISPENSED / PARTIALLY_DISPENSED),
   * entrée PRESCRIPTION (délivrance) au Carnet C2, notification C4, audit C5.
   */
  async dispense(actor: AuthenticatedActor, qrToken: string, dto: DispenseDto) {
    await this.assertCanDispense(actor, dto.facilityId);
    const prescription = await this.loadByQr(qrToken);

    if (!isDispensable(prescription.status)) {
      throw new ConflictException("Ordonnance non délivrable (déjà délivrée, expirée ou annulée — RM-09-05)");
    }
    if (isExpired(prescription.expiresAt, new Date())) {
      throw new ConflictException("Ordonnance expirée — délivrance impossible (PM-10, EF-09-08)");
    }

    // Rapproche les lignes saisies des lignes de l'ordonnance (appartenance + restant).
    const linesById = new Map(prescription.lines.map((l) => [l.id, l]));
    const requested = dto.lines.map((d) => {
      const line = linesById.get(d.prescriptionLineId);
      if (!line) throw new BadRequestException("Ligne de prescription absente de cette ordonnance");
      if (!dispenseQuantityValid(d.quantity, line.qtyDispensed, line.qtyPrescribed)) {
        throw new ConflictException(
          `Quantité invalide pour la ligne ${line.id} : il reste ${remaining(line.qtyPrescribed, line.qtyDispensed)} à délivrer (EF-09-07)`,
        );
      }
      return { line, quantity: d.quantity };
    });

    const prescriptionId = prescription.id;
    const owner = prescription.subProfileId
      ? { ownerSubProfileId: prescription.subProfileId }
      : { ownerPatientId: prescription.patientAccountId };

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      // RM-09-05 (correctif anti-TOCTOU, D-046) : on RÉCLAME l'ordonnance dans un état délivrable
      // DANS la transaction. Une annulation/expiration concurrente touche updatedAt et verrouille
      // la ligne ; ce compare-and-swap échoue alors (count === 0) et TOUT est annulé — aucun stock
      // décrémenté, aucune entrée Carnet, aucune délivrance enregistrée sur une ordonnance morte.
      const claim = await tx.prescription.updateMany({
        where: {
          id: prescriptionId,
          status: { in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED] },
          expiresAt: { gt: now },
        },
        data: { updatedAt: now },
      });
      if (claim.count === 0) {
        throw new ConflictException("Ordonnance non délivrable — son état a changé entre-temps (RM-09-05, D-046)");
      }

      const dispensation = await tx.dispensation.create({
        data: { prescriptionId, facilityId: dto.facilityId, memberId: actor.accountId },
      });

      for (const { line, quantity } of requested) {
        // D-046 : incrément CONDITIONNEL — n'aboutit que si le restant est suffisant AU
        // MOMENT de l'écriture (anti double délivrance, anti-course multi-pharmacies).
        const { count } = await tx.prescriptionLine.updateMany({
          where: { id: line.id, qtyDispensed: { lte: line.qtyPrescribed - quantity } },
          data: { qtyDispensed: { increment: quantity } },
        });
        if (count === 0) {
          throw new ConflictException("Délivrance concurrente détectée — l'état a changé, réessayez (RM-09-02, D-046)");
        }
        await tx.dispensationLine.create({
          data: { dispensationId: dispensation.id, prescriptionLineId: line.id, quantity },
        });
        // C3 : lignes référentielles seulement → décrément FEFO du stock (M11). Les lignes
        // hors référentiel (freeText) sont délivrées SANS décrément (pas de produit catalogué).
        // NOTE (limite assumée, MVP) : ce décrément peut entamer du stock physiquement RÉSERVÉ
        // par le dévoilement d'un AUTRE patient (M12). Le stock ne devient jamais négatif
        // (RM-11-01) et le disponible publié reste borné à 0, mais la réservation lésée est
        // rattrapée par la garantie Q-004 — strike + re-dévoilement/remboursement (RM-12-06).
        if (line.medicamentId) {
          await this.stock.consume(tx, {
            facilityId: dto.facilityId,
            medicamentId: line.medicamentId,
            quantity,
            reference: `dispensation:${dispensation.id}`,
            memberId: actor.accountId,
          });
        }
      }

      // Recalcule le statut global depuis l'état des lignes APRÈS incréments (EF-09-08).
      const linesAfter = await tx.prescriptionLine.findMany({ where: { prescriptionId }, orderBy: { id: "asc" } });
      const newStatus = statusAfterDispensation(linesAfter);
      if (newStatus !== prescription.status) {
        // Transition conditionnelle depuis un statut encore délivrable (RM-09-05).
        await tx.prescription.updateMany({
          where: { id: prescriptionId, status: { in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED] } },
          data: { status: newStatus },
        });
      }

      // C2 : la délivrance s'inscrit au Carnet (sans PII inutile) — référence dispensation.
      await this.recordWriter.appendEntry(tx, {
        ...owner,
        type: RecordEntryType.PRESCRIPTION,
        provenance: RecordProvenance.RECORDED_BY_PROFESSIONAL,
        authorId: actor.accountId,
        sourceRef: `dispensation:${dispensation.id}`,
        payload: {
          event: "dispensed",
          prescriptionId,
          dispensationId: dispensation.id,
          lineCount: requested.length,
        },
      });

      // C4 : le patient suit l'avancée de sa délivrance — JAMAIS le contenu (RM-14-03).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: {
          accountId: prescription.patientAccountId,
          template: newStatus === PrescriptionStatus.DISPENSED ? "m09.prescription.dispensed" : "m09.prescription.partially_dispensed",
          prescriptionId,
        },
      });
      // C5 : qui a délivré, quoi, où (RM-09-06) — jamais de contenu médical (RM-04-03).
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m09.dispensation.created",
        resource: `prescription:${prescriptionId}`,
        context: { facilityId: dto.facilityId, dispensationId: dispensation.id, lineCount: requested.length, newStatus },
      });

      return { dispensationId: dispensation.id, status: newStatus, lines: linesAfter };
    });

    // RM-09-04 : on rend l'état de l'ordonnance (lignes + restants) DEPUIS l'état transactionnel —
    // jamais le Carnet, et pas de relecture par QR après commit (qui pourrait 404 si une annulation
    // concurrente a réécrit le QR, ou refaire un contrôle d'autorisation inutile).
    const expired = isExpired(prescription.expiresAt, now);
    return {
      dispensationId: result.dispensationId,
      prescriptionId,
      status: result.status,
      dispensable: isDispensable(result.status) && !expired,
      expiresAt: prescription.expiresAt.toISOString(),
      lines: result.lines.map((l) => ({
        id: l.id,
        medicamentId: l.medicamentId,
        freeText: l.freeText,
        posology: l.posology,
        durationDays: l.durationDays,
        qtyPrescribed: l.qtyPrescribed,
        qtyDispensed: l.qtyDispensed,
        remaining: remaining(l.qtyPrescribed, l.qtyDispensed),
      })),
    };
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  /**
   * RM-09-03 : droit « dispense » sur la pharmacie (M02) + pharmacie vérifiée « peut exercer »
   * (C6, M03). La connexion active est déjà garantie par l'AuthGuard global (EF-09-06).
   */
  private async assertCanDispense(actor: AuthenticatedActor, facilityId: string): Promise<void> {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "dispense");
    const { canPractice } = await this.verification.getForFacility(facilityId);
    if (!canPractice) {
      throw new ConflictException("Délivrance réservée aux pharmacies vérifiées (D-029, RM-09-03)");
    }
  }

  /** Résout une ordonnance par son QR opaque — 404 sinon (jamais de fuite, RM-09-02). */
  private async loadByQr(qrToken: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { qrToken },
      include: { lines: true },
    });
    if (!prescription) throw new NotFoundException("Ordonnance introuvable ou QR invalide");
    return prescription;
  }
}

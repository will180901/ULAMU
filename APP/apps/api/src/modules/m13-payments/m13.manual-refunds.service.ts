/**
 * M13 — remboursements manuels par l'Admin Finance (EF-13-10, CU via M16).
 * RM-13-06 : au-delà de PM-35, DOUBLE VALIDATION par deux admins DISTINCTS —
 * la demande est consignée (ManualRefundRequest) et n'exécute rien tant qu'un
 * second admin n'a pas approuvé.
 */
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CareSessionStatus, ManualRefundStatus, PaymentStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { CreateManualRefundDto } from "./m13.dto";
import { PaymentsService } from "./m13.payments.service";
import { canSecondApprove, needsSecondApproval } from "./m13.policies";

export interface ManualRefundState {
  requestId: string;
  paymentId: string;
  status: ManualRefundStatus;
  requiresSecondApproval: boolean;
}

/** Ligne de la file Finance — la demande ET ce qu'il faut pour la trancher sans quitter l'écran. */
export interface ManualRefundListItem {
  requestId: string;
  paymentId: string;
  reason: string;
  status: ManualRefundStatus;
  /** Admin 1. La double validation RM-13-06 exige que l'approbateur soit différent. */
  requestedBy: string;
  approvedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
  /** `null` seulement si le paiement a disparu — cas anormal, affiché tel quel plutôt que masqué. */
  amountXaf: number | null;
  payerId: string | null;
}

/**
 * Une session dont les gains sont gelés — de l'argent immobilisé qui attend une décision.
 *
 * ⚠️ Les champs `null` signalent un paiement introuvable : anomalie rare, montrée telle quelle
 * plutôt que masquée. Un cadre vide se prend pour « rien à signaler » ; ici il y a bien quelque
 * chose, et c'est même plus grave.
 */
export interface FrozenEarningsItem {
  sessionId: string;
  orderRef: string;
  paymentId: string | null;
  amountXaf: number | null;
  netXaf: number | null;
  commissionXaf: number | null;
  paymentStatus: string | null;
  professionalId: string;
  professionalName: string | null;
  patientName: string | null;
  endedAt: string;
  /** Instant où le dépôt est devenu impossible (fin + PM-30). */
  frozenSince: string;
  frozenDays: number;
  /** Une demande de remboursement déjà déposée pour ce paiement, s'il y en a une. */
  refundRequestStatus: string | null;
}

@Injectable()
export class ManualRefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly audit: AuditEmitter,
    private readonly payments: PaymentsService,
  ) {}

  /** POST /v1/admin/finance/refunds — sous PM-35 : exécution directe tracée ; au-delà : mise en attente. */
  /**
   * Demandes de remboursement manuel, la plus récente d'abord.
   *
   * ⚠️ Cette route manquait entièrement. Le contrôleur d'administration exposait `approve` et
   * `reject` **par identifiant**, mais aucun moyen de DÉCOUVRIR les demandes en attente : un
   * administrateur Finance ne pouvait agir que sur un identifiant obtenu ailleurs — en base. La
   * double validation RM-13-06 était donc inapplicable en pratique, puisque le second administrateur
   * n'avait aucun moyen de savoir qu'on l'attendait.
   *
   * `montantXaf` et `payeur` sont joints ici plutôt que laissés au client : décider d'un
   * remboursement sans voir le montant serait absurde, et faire faire N appels au navigateur pour
   * les reconstituer le serait tout autant.
   */
  async list(status?: ManualRefundStatus): Promise<ManualRefundListItem[]> {
    const requests = await this.prisma.manualRefundRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (requests.length === 0) return [];

    const payments = await this.prisma.payment.findMany({
      where: { id: { in: [...new Set(requests.map((r) => r.paymentId))] } },
      select: { id: true, amountXaf: true, payerId: true },
    });
    const parId = new Map(payments.map((p) => [p.id, p]));

    return requests.map((r) => ({
      requestId: r.id,
      paymentId: r.paymentId,
      reason: r.reason,
      status: r.status,
      requestedBy: r.requestedBy,
      approvedBy: r.approvedBy,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
      amountXaf: parId.get(r.paymentId)?.amountXaf ?? null,
      payerId: parId.get(r.paymentId)?.payerId ?? null,
    }));
  }

  async create(adminId: string, dto: CreateManualRefundDto): Promise<ManualRefundState> {
    const payment = await this.prisma.payment.findUnique({ where: { id: dto.paymentId } });
    if (!payment) throw new NotFoundException("Paiement introuvable");
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new ConflictException(`Seul un paiement réussi peut être remboursé manuellement (statut ${payment.status})`);
    }

    const pm35 = await this.params.getInt("PM-35");
    if (needsSecondApproval(payment.amountXaf, pm35)) {
      // RM-13-06 : rien ne s'exécute — la demande attend un SECOND admin.
      const request = await this.prisma.$transaction(async (tx) => {
        const created = await tx.manualRefundRequest.create({
          data: {
            paymentId: payment.id,
            reason: dto.reason,
            requestedBy: adminId,
            status: ManualRefundStatus.PENDING_SECOND_APPROVAL,
          },
        });
        await this.audit.emit(tx, {
          actorId: adminId,
          actorType: "admin",
          action: "m13.manual_refund.requested",
          resource: `manual_refund:${created.id}`,
          context: { paymentId: payment.id, amountXaf: payment.amountXaf, thresholdXaf: pm35, reason: dto.reason },
        });
        // Les admins finance sont prévenus qu'une approbation est attendue.
        await this.payments.notifyFinanceAdmins(tx, "m13.manual_refund.pending_approval", {
          requestId: created.id,
          amountXaf: payment.amountXaf,
        });
        return created;
      });
      return { requestId: request.id, paymentId: payment.id, status: request.status, requiresSecondApproval: true };
    }

    // Sous le seuil : exécution directe — refund() est idempotent et audite avec la trace requestedBy.
    await this.payments.refund(payment.orderRef, dto.reason, adminId);
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.manualRefundRequest.create({
        data: {
          paymentId: payment.id,
          reason: dto.reason,
          requestedBy: adminId,
          status: ManualRefundStatus.EXECUTED,
          decidedAt: new Date(),
        },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m13.manual_refund.executed",
        resource: `manual_refund:${created.id}`,
        context: { paymentId: payment.id, amountXaf: payment.amountXaf, secondApproval: false },
      });
      return created;
    });
    return { requestId: request.id, paymentId: payment.id, status: request.status, requiresSecondApproval: false };
  }

  /** POST /v1/admin/finance/refunds/:id/approve — approbateur ≠ demandeur (RM-13-06). */
  async approve(adminId: string, requestId: string): Promise<ManualRefundState> {
    const request = await this.prisma.manualRefundRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Demande de remboursement introuvable");
    if (request.status !== ManualRefundStatus.PENDING_SECOND_APPROVAL) {
      throw new ConflictException(`Cette demande a déjà été décidée (statut ${request.status})`);
    }
    if (!canSecondApprove(request.requestedBy, adminId)) {
      throw new ForbiddenException("Double validation : l'approbateur doit être un admin différent du demandeur (RM-13-06)");
    }
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: request.paymentId } });

    // Revendication conditionnelle : deux approbations concurrentes → un seul gagnant (D-046).
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.manualRefundRequest.updateMany({
        where: { id: requestId, status: ManualRefundStatus.PENDING_SECOND_APPROVAL },
        data: { status: ManualRefundStatus.EXECUTED, approvedBy: adminId, decidedAt: new Date() },
      });
      if (count === 0) throw new ConflictException("Cette demande vient d'être décidée par un autre admin");
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m13.manual_refund.approved",
        resource: `manual_refund:${requestId}`,
        context: { paymentId: request.paymentId, requestedBy: request.requestedBy },
      });
    });

    try {
      // refund() est idempotent (RM-13-04) — la trace porte l'approbateur.
      await this.payments.refund(payment.orderRef, request.reason, adminId);
    } catch (err) {
      // Compensation : l'exécution a échoué — la demande redevient approuvable (pas d'état menteur).
      await this.prisma.manualRefundRequest.updateMany({
        where: { id: requestId, status: ManualRefundStatus.EXECUTED, approvedBy: adminId },
        data: { status: ManualRefundStatus.PENDING_SECOND_APPROVAL, approvedBy: null, decidedAt: null },
      });
      throw err;
    }

    return { requestId, paymentId: request.paymentId, status: ManualRefundStatus.EXECUTED, requiresSecondApproval: false };
  }

  /**
   * POST /v1/admin/finance/refunds/:id/reject — tout Admin Finance peut rejeter,
   * Y COMPRIS le demandeur (annulation de sa propre demande) ; décision consignée.
   */
  async reject(adminId: string, requestId: string): Promise<ManualRefundState> {
    const request = await this.prisma.manualRefundRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Demande de remboursement introuvable");

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.manualRefundRequest.updateMany({
        where: { id: requestId, status: ManualRefundStatus.PENDING_SECOND_APPROVAL },
        data: { status: ManualRefundStatus.REJECTED, approvedBy: adminId, decidedAt: new Date() },
      });
      if (count === 0) throw new ConflictException("Cette demande a déjà été décidée");
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m13.manual_refund.rejected",
        resource: `manual_refund:${requestId}`,
        context: { paymentId: request.paymentId, requestedBy: request.requestedBy },
      });
    });

    return { requestId, paymentId: request.paymentId, status: ManualRefundStatus.REJECTED, requiresSecondApproval: false };
  }

  // ── L'argent immobilisé, et personne pour le voir (chantier 64, 07/09/2026) ──

  /**
   * Les sessions dont les gains sont GELÉS : payées, consultées, sans compte-rendu déposé à temps.
   *
   * ── Le défaut mesuré le 07/09/2026 ─────────────────────────────────────────────────────────────
   *
   * En production : une session du 28/08, 5 000 XAF payés par le patient, consultation tenue,
   * **aucun compte-rendu**. À l'échéance (PM-30), le balayage a fait exactement son travail — le
   * professionnel ET les super-administrateurs ont été notifiés, en application et en push, avec
   * une trace au journal. Puis plus rien : **neuf jours plus tard, l'argent n'est ni chez le
   * soignant, ni revenu au patient.**
   *
   * ⚠️ Le mécanisme n'a pas échoué. C'est le SUIVI qui n'existait pas.
   *
   * Une notification est un **événement** : elle passe. De l'argent immobilisé est un **état** : il
   * dure. Un état ne se surveille pas avec une alerte ponctuelle — il se surveille avec une liste,
   * qui montre encore le cas le lendemain, la semaine suivante, jusqu'à ce que quelqu'un tranche.
   *
   * *C'est le même défaut que la file des remboursements avant qu'elle existe : `approve` et
   * `reject` savaient agir sur un identifiant, sans qu'aucune route ne permette de DÉCOUVRIR les
   * demandes en attente. On répare ici l'autre moitié — les cas que personne n'a encore transformés
   * en demande.*
   *
   * ── Ce que cette liste ne décide pas ──────────────────────────────────────────────────────────
   *
   * Elle ne dit pas quoi faire. **Rien, dans la spécification, ne dit ce que devient cet argent** :
   * le gel sanctionne le soignant (RM-06-04, CU-06-03), mais aucune règle ne tranche entre
   * rembourser le patient — qui a eu sa consultation, mais dont le Carnet reste vide — et garder la
   * somme. Cette question appartient au porteur ; la liste rend seulement le cas visible, ce sans
   * quoi aucune décision n'est même possible.
   */
  async listFrozenEarnings(): Promise<FrozenEarningsItem[]> {
    const pm30S = await this.params.getInt("PM-30");
    const limite = new Date(Date.now() - pm30S * 1000);

    /*
      La signature : terminée, sans compte-rendu, et l'échéance PM-30 déjà passée. Une session
      terminée il y a une heure n'est PAS gelée — le soignant a encore le temps d'écrire.
    */
    const sessions = await this.prisma.careSession.findMany({
      where: {
        status: CareSessionStatus.ENDED,
        reportDepositedAt: null,
        endedAt: { not: null, lt: limite },
      },
      orderBy: { endedAt: "asc" }, // les plus anciennes d'abord : elles attendent depuis le plus longtemps
      take: 200,
      select: { id: true, orderRef: true, endedAt: true, professionalId: true, patientAccountId: true },
    });
    if (sessions.length === 0) return [];

    // Les paiements et les noms en deux requêtes, pas deux par ligne.
    const paiements = await this.prisma.payment.findMany({
      where: { orderRef: { in: sessions.map((s) => s.orderRef) } },
      select: { id: true, orderRef: true, amountXaf: true, status: true, split: { select: { netXaf: true, commissionXaf: true } } },
    });
    const parRef = new Map(paiements.map((p) => [p.orderRef, p]));

    const comptes = await this.prisma.account.findMany({
      where: { id: { in: [...new Set(sessions.flatMap((s) => [s.professionalId, s.patientAccountId]))] } },
      select: {
        id: true,
        professionalProfile: { select: { firstName: true, lastName: true } },
        patientProfile: { select: { firstName: true, lastName: true } },
      },
    });
    const nomDe = new Map(
      comptes.map((c) => {
        const p = c.professionalProfile ?? c.patientProfile;
        return [c.id, p ? `${p.firstName} ${p.lastName}`.trim() : "(compte sans profil)"];
      }),
    );

    /*
      Une demande de remboursement déjà déposée retire le cas de la file « à trancher » : sans cela,
      deux administrateurs traiteraient le même dossier en croyant chacun être le premier.
    */
    const demandes = await this.prisma.manualRefundRequest.findMany({
      where: { paymentId: { in: paiements.map((p) => p.id) } },
      select: { paymentId: true, status: true },
    });
    const demandeDe = new Map(demandes.map((d) => [d.paymentId, d.status]));

    return sessions.map((s) => {
      const p = parRef.get(s.orderRef);
      const echeance = new Date((s.endedAt as Date).getTime() + pm30S * 1000);
      return {
        sessionId: s.id,
        orderRef: s.orderRef,
        paymentId: p?.id ?? null,
        // `null` seulement si le paiement a disparu — cas anormal, montré tel quel plutôt que masqué.
        amountXaf: p?.amountXaf ?? null,
        netXaf: p?.split?.netXaf ?? null,
        commissionXaf: p?.split?.commissionXaf ?? null,
        paymentStatus: p?.status ?? null,
        professionalId: s.professionalId,
        professionalName: nomDe.get(s.professionalId) ?? null,
        patientName: nomDe.get(s.patientAccountId) ?? null,
        endedAt: (s.endedAt as Date).toISOString(),
        frozenSince: echeance.toISOString(),
        /** Depuis combien de jours l'argent est immobilisé — c'est ce qui décide de l'ordre d'examen. */
        frozenDays: Math.floor((Date.now() - echeance.getTime()) / 86_400_000),
        refundRequestStatus: p ? (demandeDe.get(p.id) ?? null) : null,
      };
    });
  }
}

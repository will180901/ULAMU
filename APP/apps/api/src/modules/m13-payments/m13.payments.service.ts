/**
 * M13 — PaymentsService : l'API C1 « ordres référencés » consommée par M06/M12 (et M08 en V1).
 * Spec : docs/cahier_des_charges/02_modules/M13_paiements_gains.md
 *
 * Invariants :
 * - RM-13-01 : aveugle au métier — orderRef est OPAQUE, jamais interprété ;
 * - RM-13-02 : aucun solde ne change sans EarningsEntry, dans la MÊME transaction ;
 * - RM-13-03 : ULAMU ne détient pas les fonds — tout passe par AGGREGATOR_GATEWAY ;
 * - RM-13-04 : idempotence absolue — orderRef unique + updateMany conditionnels (D-046) ;
 * - RM-13-05 : tout flux émet audit C5 (dans la transaction) et reçu (D-010).
 *
 * RM-13-07 (taux lus dans le contrat M03 du bénéficiaire) : NON branché en Chantier 2 —
 * M13 ne peut pas importer M03 (périmètre) ; le taux plateforme PM-01 est appliqué.
 * À raccorder quand M03 exposera la lecture du taux contractuel au moment de l'encaissement.
 */
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  EarningsHolderType,
  Payment,
  PaymentOperator,
  PaymentSplit,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditEmitter } from "../../common/audit.emitter";
import { AGGREGATOR_GATEWAY, AggregatorGateway } from "../../common/momo/aggregator.gateway";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { amountIsValid, computeSplit, operatorIsValid, receiptNumber } from "./m13.policies";

// ── Contrat C1 (consommé par M06/M12) ───────────────────────────────────────

export interface ChargeBeneficiary {
  holderType: EarningsHolderType;
  holderId: string;
}

/** IMMEDIATE : crédité dès la confirmation ; DEFERRED : crédité sur ordre capture() (EF-13-03, RM-06-04). */
export type CaptureMode = "IMMEDIATE" | "DEFERRED";

export interface ChargeOrder {
  /** Référence métier OPAQUE (RM-13-01) — unique : un ordre rejoué ne débite jamais deux fois (RM-13-04). */
  orderRef: string;
  payerAccountId: string;
  amountXaf: number;
  /** Opérateur EXPLICITE choisi par le payeur — jamais déduit du préfixe téléphone. */
  operator: PaymentOperator;
  /** Absent = encaissement 100 % ULAMU (dévoilement, PM-03). */
  beneficiary?: ChargeBeneficiary;
  capture: CaptureMode;
}

export interface PaymentState {
  paymentId: string;
  orderRef: string;
  status: PaymentStatus;
  amountXaf: number;
  operator: PaymentOperator;
  failReason: string | null;
}

export interface CaptureResult {
  orderRef: string;
  /** false = la part était déjà capturée ou contre-passée — rejeu sans effet (RM-13-04). */
  captured: boolean;
  netXaf: number;
}

export interface EarningsView {
  holderType: EarningsHolderType;
  holderId: string;
  availableXaf: number;
  /** Parts confirmées mais pas encore capturées (EF-13-06) — en attente de l'ordre de crédit. */
  pendingXaf: number;
  entries: Array<{ id: string; type: string; amountXaf: number; reference: string; createdAt: Date }>;
}

type PaymentWithSplit = Payment & { split: PaymentSplit | null };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    @Inject(AGGREGATOR_GATEWAY) private readonly gateway: AggregatorGateway,
  ) {}

  // ── EF-13-01 : encaissement sur ordre référencé (CU-13-01) ─────────────────

  async requestCharge(order: ChargeOrder): Promise<PaymentState> {
    if (!amountIsValid(order.amountXaf)) {
      throw new BadRequestException("Montant invalide : entier de XAF strictement positif attendu");
    }
    if (!operatorIsValid(order.operator)) {
      throw new BadRequestException("Opérateur Mobile Money inconnu : MTN_MOMO ou AIRTEL_MONEY attendu");
    }
    if (!order.orderRef || order.orderRef.trim().length === 0) {
      throw new BadRequestException("Référence d'ordre requise (RM-13-01)");
    }
    if (order.beneficiary && !order.beneficiary.holderId) {
      throw new BadRequestException("Bénéficiaire incomplet : identifiant du titulaire requis");
    }

    // RM-13-04 : un ordre déjà connu retourne son état, sans JAMAIS redébiter.
    const existing = await this.prisma.payment.findUnique({ where: { orderRef: order.orderRef } });
    if (existing) return this.toState(existing);

    // Le téléphone MoMo du payeur est lu via son compte (M01 = identifiant racine).
    const payer = await this.prisma.account.findUnique({ where: { id: order.payerAccountId } });
    if (!payer || payer.status !== "ACTIVE") {
      throw new BadRequestException("Compte payeur introuvable ou inactif");
    }

    // EF-13-02 / RM-13-07 : taux du CONTRAT EN VIGUEUR du bénéficiaire (M03), repli PM-01 ;
    // sans bénéficiaire = 100 % ULAMU (dévoilement, PM-03).
    const commissionPct = order.beneficiary ? await this.resolveCommissionPct(order.beneficiary) : 0;
    const split = computeSplit(order.amountXaf, commissionPct, Boolean(order.beneficiary));

    const paymentId = randomUUID();
    let payment: Payment;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            id: paymentId,
            orderRef: order.orderRef,
            payerId: order.payerAccountId,
            amountXaf: order.amountXaf,
            operator: order.operator,
            // aggregatorRef = payment.id : notre référence d'idempotence côté agrégateur.
            aggregatorRef: paymentId,
          },
        });
        await tx.paymentSplit.create({
          data: {
            paymentId,
            holderType: order.beneficiary?.holderType ?? null,
            holderId: order.beneficiary?.holderId ?? null,
            grossXaf: split.grossXaf,
            commissionXaf: split.commissionXaf,
            netXaf: split.netXaf,
            // IMMEDIATE : pas de mise « en attente » — la part sera créditée dès la confirmation
            // du paiement (webhook). DEFERRED : capturedAt null jusqu'à l'ordre capture() (EF-13-03).
            capturedAt: order.capture === "IMMEDIATE" ? new Date() : null,
          },
        });
        await this.audit.emit(tx, {
          actorType: "system",
          action: "m13.payment.initiated",
          resource: `payment:${paymentId}`,
          context: {
            orderRef: order.orderRef,
            amountXaf: order.amountXaf,
            operator: order.operator,
            capture: order.capture,
            hasBeneficiary: Boolean(order.beneficiary),
            commissionXaf: split.commissionXaf,
          },
        });
        return created;
      });
    } catch (err) {
      // Course entre deux rejouages du MÊME ordre : l'unicité d'orderRef tranche (RM-13-04).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const winner = await this.prisma.payment.findUnique({ where: { orderRef: order.orderRef } });
        if (winner) return this.toState(winner);
      }
      throw err;
    }

    // Appel RÉSEAU hors transaction (ENF : < 3 s entre l'ordre et la demande sur le téléphone).
    try {
      const res = await this.gateway.requestCharge({
        aggregatorRef: paymentId,
        phone: payer.phone,
        amountXaf: order.amountXaf,
        operator: order.operator,
      });
      if (!res.accepted) {
        return await this.failPayment(paymentId, "Demande refusée par l'agrégateur Mobile Money");
      }
    } catch (err) {
      this.logger.error(`Agrégateur injoignable pour ${paymentId}: ${(err as Error).message}`);
      return await this.failPayment(paymentId, "Agrégateur Mobile Money indisponible — réessayez plus tard");
    }

    return this.toState(payment);
  }

  /** Échec d'initiation : INITIATED → FAILED conditionnel + audit (EF-13-08). */
  private async failPayment(paymentId: string, failReason: string): Promise<PaymentState> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.INITIATED },
        data: { status: PaymentStatus.FAILED, failReason },
      });
      if (count === 1) {
        await this.audit.emit(tx, {
          actorType: "system",
          action: "m13.payment.failed",
          resource: `payment:${paymentId}`,
          context: { failReason, stage: "initiation" },
        });
      }
    });
    const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    return this.toState(fresh);
  }

  // ── Webhook agrégateur (EF-13-01, branché par M13PaymentsModule.onModuleInit) ──

  /**
   * Confirmation/refus asynchrone du paiement (le patient a saisi — ou non — son code MoMo).
   * IDEMPOTENT : transition conditionnelle INITIATED→… (updateMany + count) — un webhook
   * rejoué ne produit ni second reçu, ni double crédit (RM-13-04). Traité en < 5 s (ENF).
   */
  async handleChargeResult(aggregatorRef: string, ok: boolean, reason?: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: aggregatorRef },
      include: { split: true },
    });
    if (!payment) {
      // Webhook inconnu : on n'explose pas (la réconciliation EF-13-09 le rattrapera).
      this.logger.error(`Webhook agrégateur pour une référence inconnue : ${aggregatorRef}`);
      return;
    }
    if (ok) await this.confirmPayment(payment);
    else await this.rejectPayment(payment, reason);
  }

  private async confirmPayment(payment: PaymentWithSplit): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.INITIATED },
        data: { status: PaymentStatus.SUCCEEDED, confirmedAt: new Date() },
      });
      if (count === 0) return; // rejeu : déjà traité (RM-13-04)

      // EF-13-05 / D-010 : reçu numéroté systématique.
      const number = await this.createReceipt(tx, payment.id, "PAYMENT");

      // Capture IMMEDIATE (dévoilement… ou bénéficiaire sans mise en attente) :
      // crédit du bénéficiaire dans la MÊME transaction (RM-13-02), protégé du rejeu
      // par la transition conditionnelle ci-dessus.
      const split = payment.split;
      if (split && split.capturedAt && split.holderType && split.holderId) {
        await this.creditBeneficiary(tx, split.holderType, split.holderId, split.netXaf, payment.orderRef);
      }

      // C1 : le module demandeur apprend l'issue par l'outbox (référence opaque uniquement).
      await this.outbox.emit(tx, { type: "m13.payment.succeeded", payload: { orderRef: payment.orderRef } });
      // C4 : reçu au payeur (CU-13-01).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: payment.payerId, template: "m13.receipt", receiptNumber: number, amountXaf: payment.amountXaf },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m13.payment.succeeded",
        resource: `payment:${payment.id}`,
        context: { orderRef: payment.orderRef, amountXaf: payment.amountXaf, receiptNumber: number },
      });
    });
  }

  private async rejectPayment(payment: PaymentWithSplit, reason?: string): Promise<void> {
    const failReason = reason && reason.trim().length > 0 ? reason : "Paiement refusé ou expiré côté opérateur";
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.INITIATED },
        data: { status: PaymentStatus.FAILED, failReason },
      });
      if (count === 0) return; // rejeu (RM-13-04)

      // C1 : le module demandeur décide de la suite — retry guidé, expiration (EF-13-08, CU-13-01).
      await this.outbox.emit(tx, {
        type: "m13.payment.failed",
        payload: { orderRef: payment.orderRef, failReason },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: payment.payerId, template: "m13.payment.failed", amountXaf: payment.amountXaf, failReason },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m13.payment.failed",
        resource: `payment:${payment.id}`,
        context: { orderRef: payment.orderRef, failReason, stage: "confirmation" },
      });
    });
  }

  // ── EF-13-03 : capture différée (ordre de crédit de M06, RM-06-04 ; CU-13-02) ──

  async capture(orderRef: string): Promise<CaptureResult> {
    const payment = await this.prisma.payment.findUnique({ where: { orderRef }, include: { split: true } });
    if (!payment || !payment.split) throw new NotFoundException("Aucun paiement pour cette référence d'ordre");
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new ConflictException(`Capture impossible : le paiement n'est pas confirmé (statut ${payment.status})`);
    }
    const split = payment.split;

    return this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle (anti-TOCTOU, D-046) : ni déjà capturée, ni contre-passée.
      const { count } = await tx.paymentSplit.updateMany({
        where: { paymentId: payment.id, capturedAt: null, reversedAt: null },
        data: { capturedAt: new Date() },
      });
      if (count === 0) {
        // Rejeu de l'ordre de crédit : no-op idempotent (RM-13-04).
        return { orderRef, captured: false, netXaf: split.netXaf };
      }

      if (split.holderType && split.holderId) {
        // RM-13-02 : crédit + mouvement DANS LA MÊME TRANSACTION.
        await this.creditBeneficiary(tx, split.holderType, split.holderId, split.netXaf, orderRef);
      }
      await this.outbox.emit(tx, { type: "m13.split.captured", payload: { orderRef, netXaf: split.netXaf } });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m13.split.captured",
        resource: `payment:${payment.id}`,
        context: { orderRef, netXaf: split.netXaf },
      });
      return { orderRef, captured: true, netXaf: split.netXaf };
    });
  }

  // ── EF-13-04 / EF-13-10 : remboursement sur ordre référencé (CU-13-03) ──────

  /**
   * Idempotent : un paiement déjà REFUNDED retourne son état sans rien refaire.
   * `requestedBy` trace l'admin à l'origine d'un remboursement manuel (RM-13-06) —
   * absent pour les remboursements automatiques ordonnés par les modules (D-008).
   */
  async refund(orderRef: string, reason: string, requestedBy?: string): Promise<PaymentState> {
    const payment = await this.prisma.payment.findUnique({ where: { orderRef }, include: { split: true } });
    if (!payment) throw new NotFoundException("Aucun paiement pour cette référence d'ordre");
    if (payment.status === PaymentStatus.REFUNDED) return this.toState(payment); // rejeu (RM-13-04)
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new ConflictException(`Seul un paiement réussi peut être remboursé (statut ${payment.status})`);
    }

    let won = false;
    await this.prisma.$transaction(async (tx) => {
      // Transition conditionnelle SUCCEEDED→REFUNDED : un seul gagnant en cas de course.
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.SUCCEEDED },
        data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
      });
      if (count === 0) return;
      won = true;

      // Reçu d'annulation systématique (EF-13-05, CU-13-03) — clé composite (paymentId, kind)
      // garantit l'unicité PAYMENT/REFUND ; idempotent par construction (la transition gagne une fois).
      const refundReceiptNumber = await this.createReceipt(tx, payment.id, "REFUND");

      // BLOQUANT corrigé (D-047) : on RE-LIT le split DANS la transaction — le verrou de ligne
      // garantit une vue fraîche du capturedAt, même si capture() s'est intercalée entre la
      // lecture initiale et ici. La décision « débit miroir vs scellement seul » se prend alors
      // sur deux updateMany conditionnels mutuellement exclusifs (jamais les deux, jamais aucun perdu).
      const reversed = await tx.paymentSplit.updateMany({
        where: { paymentId: payment.id, capturedAt: { not: null }, reversedAt: null },
        data: { reversedAt: new Date() },
      });
      if (reversed.count === 1) {
        // La part avait été créditée → débit miroir (le solde PEUT devenir négatif : tracé, RM-13-02).
        const fresh = await tx.paymentSplit.findUniqueOrThrow({ where: { paymentId: payment.id } });
        if (fresh.holderType && fresh.holderId) {
          const account = await this.upsertEarningsAccount(tx, fresh.holderType, fresh.holderId);
          await tx.earningsEntry.create({
            data: { accountId: account.id, type: "REVERSAL", amountXaf: -fresh.netXaf, reference: orderRef },
          });
          await tx.earningsAccount.update({ where: { id: account.id }, data: { availableXaf: { decrement: fresh.netXaf } } });
        }
      } else {
        // Part jamais capturée : on la scelle simplement (aucun mouvement de gains à passer).
        await tx.paymentSplit.updateMany({
          where: { paymentId: payment.id, capturedAt: null, reversedAt: null },
          data: { reversedAt: new Date() },
        });
      }

      await this.outbox.emit(tx, { type: "m13.payment.refunded", payload: { orderRef, reason } });
      // CU-13-03 : le patient est notifié avec le motif.
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: payment.payerId, template: "m13.refund", amountXaf: payment.amountXaf, reason },
      });
      await this.audit.emit(tx, {
        actorId: requestedBy,
        actorType: requestedBy ? "admin" : "system",
        action: "m13.payment.refunded",
        resource: `payment:${payment.id}`,
        context: { orderRef, reason, amountXaf: payment.amountXaf, refundReceiptNumber },
      });
    });

    if (won) {
      // Réseau HORS transaction. En cas d'échec, la base reste la vérité côté ULAMU :
      // l'écart sera détecté par la réconciliation quotidienne (EF-13-09) + alerte immédiate.
      try {
        const res = await this.gateway.refundCharge(payment.aggregatorRef ?? payment.id);
        if (!res.accepted) await this.alertRefundGatewayFailure(payment, reason);
      } catch (err) {
        this.logger.error(`Remboursement agrégateur en échec pour ${payment.id}: ${(err as Error).message}`);
        await this.alertRefundGatewayFailure(payment, reason);
      }
    }

    const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return this.toState(fresh);
  }

  private async alertRefundGatewayFailure(payment: Payment, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m13.refund.gateway_failed",
        resource: `payment:${payment.id}`,
        context: { orderRef: payment.orderRef, reason },
      });
      await this.notifyFinanceAdmins(tx, "m13.refund.gateway_failed", { paymentId: payment.id });
    });
  }

  // ── EF-13-06 : consultation des gains (C1 / M16) ────────────────────────────

  /** Solde disponible + EN ATTENTE + 50 derniers mouvements — le journal est la vérité (RM-13-02). */
  async getEarnings(holderType: EarningsHolderType, holderId: string): Promise<EarningsView> {
    // EF-13-06 : « en attente » = parts de paiements confirmés, non encore capturées ni contre-passées.
    const pending = await this.prisma.paymentSplit.aggregate({
      _sum: { netXaf: true },
      where: {
        holderType,
        holderId,
        capturedAt: null,
        reversedAt: null,
        payment: { status: PaymentStatus.SUCCEEDED },
      },
    });
    const pendingXaf = pending._sum.netXaf ?? 0;

    const account = await this.prisma.earningsAccount.findUnique({
      where: { holderType_holderId: { holderType, holderId } },
    });
    if (!account) return { holderType, holderId, availableXaf: 0, pendingXaf, entries: [] };
    const entries = await this.prisma.earningsEntry.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      holderType,
      holderId,
      availableXaf: account.availableXaf,
      pendingXaf,
      entries: entries.map((e) => ({ id: e.id, type: e.type, amountXaf: e.amountXaf, reference: e.reference, createdAt: e.createdAt })),
    };
  }

  // ── EF-13-05 : reçus consultables et exportables à vie (côté payeur) ────────

  /** Reçus du payeur authentifié — consultables à vie (D-010). */
  async listReceiptsForPayer(payerId: string): Promise<Array<{ number: string; kind: string; orderRef: string; amountXaf: number; createdAt: Date }>> {
    const receipts = await this.prisma.receipt.findMany({
      where: { payment: { payerId } },
      include: { payment: true },
      orderBy: { seq: "desc" },
      take: 200,
    });
    return receipts.map((r) => ({
      number: r.number,
      kind: r.kind,
      orderRef: r.payment.orderRef,
      amountXaf: r.payment.amountXaf,
      createdAt: r.createdAt,
    }));
  }

  // ── Aides partagées (M13 interne) ───────────────────────────────────────────

  /** Alerte les SUPER_ADMIN / ADMIN_FINANCE en priorité critique (EF-13-09, CU-13-04/05). */
  async notifyFinanceAdmins(tx: Prisma.TransactionClient, template: string, payload: Record<string, unknown>): Promise<void> {
    const admins = await tx.adminRoleAssignment.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN_FINANCE"] } },
    });
    for (const admin of admins) {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: admin.accountId, template, priority: "critical", ...payload },
      });
    }
  }

  /**
   * RM-13-07 : taux de commission lu sur la dernière version de contrat SIGNÉE du bénéficiaire
   * (M03). Lecture Prisma directe — pas d'import de module (frontière C). Repli PM-01 + audit
   * si aucun contrat signé n'est trouvé (cohérent avec D-029 : on ne crédite pas un non-vérifié,
   * mais le repli garantit qu'aucun encaissement ne casse faute de contrat).
   */
  private async resolveCommissionPct(beneficiary: ChargeBeneficiary): Promise<number> {
    const where =
      beneficiary.holderType === "PROFESSIONAL"
        ? { professionalId: beneficiary.holderId }
        : { facilityId: beneficiary.holderId };
    const vcase = await this.prisma.verificationCase.findUnique({
      where,
      include: { agreement: { include: { versions: { where: { signedAt: { not: null } }, orderBy: { version: "desc" }, take: 1 } } } },
    });
    const signed = vcase?.agreement?.versions[0];
    if (signed) return signed.commissionPct;
    this.logger.warn(`Aucun contrat signé pour ${beneficiary.holderType}:${beneficiary.holderId} — repli PM-01`);
    return this.params.getInt("PM-01");
  }

  /** Compte de gains du titulaire — créé au premier crédit (EF-13-06). */
  private async upsertEarningsAccount(tx: Prisma.TransactionClient, holderType: EarningsHolderType, holderId: string) {
    return tx.earningsAccount.upsert({
      where: { holderType_holderId: { holderType, holderId } },
      create: { holderType, holderId },
      update: {},
    });
  }

  /**
   * Crédit du bénéficiaire (CU-13-02) : mouvement CREDIT + solde dans la MÊME transaction
   * (RM-13-02 — jamais de solde modifié sans mouvement). Notifie le titulaire (« +4 500 XAF »).
   */
  private async creditBeneficiary(
    tx: Prisma.TransactionClient,
    holderType: EarningsHolderType,
    holderId: string,
    netXaf: number,
    reference: string,
  ): Promise<void> {
    const account = await this.upsertEarningsAccount(tx, holderType, holderId);
    await tx.earningsEntry.create({
      data: { accountId: account.id, type: "CREDIT", amountXaf: netXaf, reference },
    });
    await tx.earningsAccount.update({ where: { id: account.id }, data: { availableXaf: { increment: netXaf } } });

    // C4 : professionnel = son propre compte ; structure = son titulaire actif (OWNER).
    const recipient =
      holderType === "PROFESSIONAL"
        ? holderId
        : (await tx.facilityMember.findFirst({ where: { facilityId: holderId, role: "OWNER", active: true } }))?.accountId;
    if (recipient) {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: recipient, template: "m13.earnings.credited", amountXaf: netXaf },
      });
    }
  }

  /**
   * Reçu numéroté "RC-<année>-<seq 6 chiffres>" (EF-13-05). La séquence est l'autoincrément
   * base : connue seulement APRÈS l'insertion → numéro provisoire puis mise en forme dans la
   * MÊME transaction — de l'extérieur, une seule insertion est jamais visible (table à vie, D-010).
   */
  private async createReceipt(tx: Prisma.TransactionClient, paymentId: string, kind: "PAYMENT" | "REFUND"): Promise<string> {
    const created = await tx.receipt.create({ data: { paymentId, kind, number: `tmp-${paymentId}` } });
    const number = receiptNumber(new Date().getFullYear(), created.seq);
    await tx.receipt.update({ where: { seq: created.seq }, data: { number } });
    return number;
  }

  private toState(payment: Payment): PaymentState {
    return {
      paymentId: payment.id,
      orderRef: payment.orderRef,
      status: payment.status,
      amountXaf: payment.amountXaf,
      operator: payment.operator,
      failReason: payment.failReason,
    };
  }
}

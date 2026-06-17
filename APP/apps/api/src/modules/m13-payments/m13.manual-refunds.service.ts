/**
 * M13 — remboursements manuels par l'Admin Finance (EF-13-10, CU via M16).
 * RM-13-06 : au-delà de PM-35, DOUBLE VALIDATION par deux admins DISTINCTS —
 * la demande est consignée (ManualRefundRequest) et n'exécute rien tant qu'un
 * second admin n'a pas approuvé.
 */
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ManualRefundStatus, PaymentStatus } from "@prisma/client";
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

@Injectable()
export class ManualRefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly audit: AuditEmitter,
    private readonly payments: PaymentsService,
  ) {}

  /** POST /v1/admin/finance/refunds — sous PM-35 : exécution directe tracée ; au-delà : mise en attente. */
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
}

/**
 * M13 — routes Admin Finance (EF-13-09/10).
 * AdminGuard : TOTP obligatoire (RM-01-06) ; ADMIN_FINANCE requis (SUPER_ADMIN passe partout).
 */
import { Body, Controller, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { AdminRole } from "@prisma/client";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { CreateManualRefundDto } from "./m13.dto";
import { ManualRefundsService } from "./m13.manual-refunds.service";
import { ReconciliationService } from "./m13.reconciliation.service";

@Controller("v1/admin/finance")
@UseGuards(AdminGuard)
export class M13AdminController {
  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly manualRefunds: ManualRefundsService,
  ) {}

  /**
   * Réconciliation à la demande (EF-13-09, CU-13-05) — retourne le rapport d'écarts.
   * La cadence quotidienne automatique sera branchée par M16 (cron) — documenté dans le service.
   */
  @AdminOnly(AdminRole.ADMIN_FINANCE)
  @Post("reconcile")
  @HttpCode(200)
  reconcile(@Actor() actor: AuthenticatedActor) {
    return this.reconciliation.runDaily(actor.accountId);
  }

  /** Remboursement manuel (EF-13-10) : direct sous PM-35, double validation au-delà (RM-13-06). */
  @AdminOnly(AdminRole.ADMIN_FINANCE)
  @Post("refunds")
  createRefund(@Actor() actor: AuthenticatedActor, @Body() dto: CreateManualRefundDto) {
    return this.manualRefunds.create(actor.accountId, dto);
  }

  /** Seconde validation par un admin DISTINCT du demandeur (RM-13-06). */
  @AdminOnly(AdminRole.ADMIN_FINANCE)
  @Post("refunds/:id/approve")
  @HttpCode(200)
  approveRefund(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.manualRefunds.approve(actor.accountId, id);
  }

  /** Rejet consigné de la demande. */
  @AdminOnly(AdminRole.ADMIN_FINANCE)
  @Post("refunds/:id/reject")
  @HttpCode(200)
  rejectRefund(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.manualRefunds.reject(actor.accountId, id);
  }
}

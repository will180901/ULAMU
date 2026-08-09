/**
 * M13 — routes Admin Finance (EF-13-09/10).
 * AdminGuard : TOTP obligatoire (RM-01-06) ; ADMIN_FINANCE requis (SUPER_ADMIN passe partout).
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
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

  /**
   * File des remboursements manuels (EF-13-10).
   *
   * ⚠️ Cette route manquait : `approve` et `reject` n'existaient que **par identifiant**, sans aucun
   * moyen de découvrir les demandes en attente. La double validation RM-13-06 était donc
   * inapplicable en pratique — le second administrateur ne pouvait pas savoir qu'on l'attendait.
   *
   * `status` est optionnel : sans filtre on renvoie tout l'historique récent, ce qui permet de
   * vérifier une décision passée sans ouvrir la base.
   */
  @AdminOnly(AdminRole.ADMIN_FINANCE)
  @Get("refunds")
  listRefunds(@Query("status") status?: string) {
    const connus = ["PENDING_SECOND_APPROVAL", "APPROVED", "REJECTED", "EXECUTED"] as const;
    const filtre = connus.find((s) => s === status);
    return this.manualRefunds.list(filtre as never);
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

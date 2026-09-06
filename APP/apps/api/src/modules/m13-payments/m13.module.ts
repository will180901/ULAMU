import { Module, OnModuleInit } from "@nestjs/common";
import { DevAggregatorGateway } from "../../common/momo/aggregator.gateway";
import { M01AccountsModule } from "../m01-accounts/m01.module";
import { M02RolesStructuresModule } from "../m02-roles-structures/m02.module";
import { M13AdminController } from "./m13.admin.controller";
import { M13Controller } from "./m13.controller";
import { EarningsService } from "./m13.earnings.service";
import { ManualRefundsService } from "./m13.manual-refunds.service";
import { PaymentsService } from "./m13.payments.service";
import { ReconciliationService } from "./m13.reconciliation.service";

/**
 * M13 — Paiements & Gains (MVP Chantier 2).
 * Spec : docs/cahier_des_charges/02_modules/M13_paiements_gains.md
 * RM-13-01 : module AVEUGLE au métier — il n'expose que des ordres référencés (C1).
 * Exporte PaymentsService (requestCharge / capture / refund / getEarnings) → M06, M12 (et M08 en V1).
 * Importe M01 (mot de passe + OTP action sensible) et M02 (PermissionsService — OWNER de structure).
 *
 * NOTE : aucun second poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11) ;
 * la réconciliation quotidienne (EF-13-09) sera cadencée par M16/cron (voir ReconciliationService).
 */
@Module({
  imports: [M01AccountsModule, M02RolesStructuresModule],
  controllers: [M13Controller, M13AdminController],
  providers: [PaymentsService, EarningsService, ReconciliationService, ManualRefundsService],
  // M16 cadence la réconciliation quotidienne (EF-13-09) via ReconciliationService.runDaily.
  /* EarningsService est exporté depuis le 06/09/2026 (chantier 50) : le balayage horaire de M16
     rattrape les retraits orphelins, et c'est ici que vit `failAndRecredit`. */
  exports: [PaymentsService, ReconciliationService, EarningsService],
})
export class M13PaymentsModule implements OnModuleInit {
  constructor(
    private readonly devAggregator: DevAggregatorGateway,
    private readonly payments: PaymentsService,
  ) {}

  onModuleInit(): void {
    // Webhook agrégateur (EF-13-01) : confirmation/refus asynchrone du paiement —
    // handleChargeResult est IDEMPOTENT (RM-13-04), un webhook rejoué est sans effet.
    this.devAggregator.onChargeResult = (aggregatorRef, ok, reason) =>
      this.payments.handleChargeResult(aggregatorRef, ok, reason);
  }
}

/**
 * M03 — Vérification & Contrats (MVP Chantier 1).
 * Spec : docs/cahier_des_charges/02_modules/M03_verification_contrats.md
 * Fabrique la confiance : Badge Vérifié + contrat numérique signé (RM-03-01, D-011/D-029).
 */
import { Module, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { M01AccountsModule } from "../m01-accounts/m01.module";
import { M03AdminController } from "./m03.admin.controller";
import { M03Controller } from "./m03.controller";
import { M03Service } from "./m03.service";
import { VerificationStatusService } from "./m03.status.service";

@Module({
  imports: [M01AccountsModule], // signature électronique : mot de passe + OTP « action sensible » (CU-03-03)
  controllers: [M03Controller, M03AdminController],
  providers: [M03Service, VerificationStatusService],
  // C6 (VerificationStatusService) → M02, M05, M06, M11, M12 ; M03Service → M16 (avenant sur
  // changement de taux, EF-16-04 : reissueAgreement).
  exports: [VerificationStatusService, M03Service],
})
export class M03VerificationContractsModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly service: M03Service,
  ) {}

  onModuleInit(): void {
    // Ouverture automatique des dossiers (spec §7 « Consomme ») — handlers idempotents (rejouage outbox, ADR-11).
    this.outbox.on("m01.account.professional_created", (p) => this.service.handleProfessionalCreated(p)); // CU-01-02 → EF-03-01
    this.outbox.on("m02.facility.created", (p) => this.service.handleFacilityCreated(p)); // EF-03-02
    // Transfert de titularité (EF-02-06 / CU-02-05) → revalidation du dossier de la structure.
    this.outbox.on("m03.case.recheck", (p) => this.service.handleCaseRecheck(p));
  }
}

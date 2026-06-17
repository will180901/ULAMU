import { Module } from "@nestjs/common";
import { M02RolesStructuresModule } from "../m02-roles-structures/m02.module";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { M06HandshakeSessionModule } from "../m06-handshake-session/m06.module";
import { M07HealthRecordModule } from "../m07-health-record/m07.module";
import { M11StocksModule } from "../m11-stocks/m11.module";
import { M09Controller } from "./m09.controller";
import { DispensationService } from "./m09.dispensation.service";
import { PrescriptionService } from "./m09.prescription.service";

/**
 * M09 — Ordonnance & Délivrance (MVP Chantier 4).
 * Spec : docs/cahier_des_charges/02_modules/M09_ordonnance_delivrance.md
 *
 * Remplace l'ordonnance papier par un document scellé, infalsifiable et traçable — de la
 * prescription en session jusqu'à la délivrance en pharmacie.
 *
 * Importe (contrats inter-modules, signatures imposées) :
 * - M06 : SessionService (contexte de session active — on ne prescrit qu'en session, RM-09-01) ;
 * - M07 : HealthRecordReaderService (garde-fou allergies EF-09-03) + WriterService (C2, Carnet) ;
 * - M11 : StockAvailabilityService.consume (C3 — décrément FEFO à la délivrance) ;
 * - M02 : PermissionsService (droit « dispense ») ; M03 : VerificationStatusService (C6).
 *
 * NOTE : aucun poller outbox ici — le relais (notifications C4, audit C5, inter-modules) est
 * DÉJÀ assuré par M04 (ADR-11). Les balayages (sweepExpired) seront cadencés par M16/cron.
 */
@Module({
  imports: [
    M06HandshakeSessionModule,
    M07HealthRecordModule,
    M11StocksModule,
    M02RolesStructuresModule,
    M03VerificationContractsModule,
  ],
  controllers: [M09Controller],
  providers: [PrescriptionService, DispensationService],
  // M16 cadence sweepExpired des ordonnances (PM-10) via le scheduler.
  exports: [PrescriptionService],
})
export class M09PrescriptionsModule {}

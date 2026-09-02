import { Module } from "@nestjs/common";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { M06HandshakeSessionModule } from "../m06-handshake-session/m06.module";
import { M07HealthRecordModule } from "../m07-health-record/m07.module";
import { M09Controller } from "./m09.controller";
import { M09ReferentielController } from "./m09.referentiel.controller";
import { PrescriptionService } from "./m09.prescription.service";

/**
 * M09 — Ordonnance (MVP Chantier 4).
 *
 * ⚠️ **« & Délivrance » est retiré le 02/09/2026 (chantier 26).** ULAMU couvre trois acteurs — le
 * patient, le médecin, l'administration. La pharmacie n'en est pas un : le scan du QR, la
 * délivrance et le décrément de stock sont partis avec M11. Ce qui reste est le cœur du module :
 * prescrire en session, sceller, consulter, annuler — et le **référentiel médicaments** (EF-09-02),
 * rapatrié de M12 parce qu'il n'a jamais été une donnée de pharmacie.
 * Spec : docs/cahier_des_charges/02_modules/M09_ordonnance_delivrance.md
 *
 * Remplace l'ordonnance papier par un document scellé, infalsifiable et traçable — de la
 * prescription en session jusqu'à la délivrance en pharmacie.
 *
 * Importe (contrats inter-modules, signatures imposées) :
 * - M06 : SessionService (contexte de session active — on ne prescrit qu'en session, RM-09-01) ;
 * - M07 : HealthRecordReaderService (garde-fou allergies EF-09-03) + WriterService (C2, Carnet) ;
 * - M03 : VerificationStatusService (C6).
 *
 * NOTE : aucun poller outbox ici — le relais (notifications C4, audit C5, inter-modules) est
 * DÉJÀ assuré par M04 (ADR-11). Les balayages (sweepExpired) seront cadencés par M16/cron.
 */
@Module({
  imports: [
    M06HandshakeSessionModule,
    M07HealthRecordModule,
    M03VerificationContractsModule,
  ],
  controllers: [M09Controller, M09ReferentielController],
  providers: [PrescriptionService],
  // M16 cadence sweepExpired des ordonnances (PM-10) via le scheduler.
  exports: [PrescriptionService],
})
export class M09PrescriptionsModule {}

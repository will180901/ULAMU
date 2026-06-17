import { Module, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { M01AccountsModule } from "../m01-accounts/m01.module";
import { M07Controller } from "./m07.controller";
import { HealthRecordReaderService } from "./m07.reader.service";
import { M07Service } from "./m07.service";
import { HealthRecordWriterService } from "./m07.writer.service";

/**
 * M07 — Carnet (MVP Chantier 3).
 * Spec : docs/cahier_des_charges/02_modules/M07_carnet.md
 * Exporte les contrats C2 :
 * - HealthRecordWriterService.appendEntry → M06 (comptes-rendus), M09 (ordonnances),
 *   M10 (résultats), M08-V1 (constantes) — EF-07-05 ;
 * - HealthRecordReaderService (getSummary / getFullRecord / getActiveAllergies)
 *   → M06 (lecture en session, RM-06-05) et M09 (garde-fou allergies, CU-07-02).
 * Importe M01 (OTP « action sensible » du tuteur pour le transfert à la majorité, CU-07-05).
 *
 * NOTE : aucun second poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11).
 */
@Module({
  imports: [M01AccountsModule],
  controllers: [M07Controller],
  providers: [M07Service, HealthRecordWriterService, HealthRecordReaderService],
  exports: [HealthRecordWriterService, HealthRecordReaderService],
})
export class M07HealthRecordModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly service: M07Service,
  ) {}

  onModuleInit(): void {
    // EF-07-01 : création automatique du Carnet à l'inscription patient (CU-01-01) —
    // handler IDEMPOTENT : un rejouage de l'outbox ne crée jamais un second Carnet (RM-07-01).
    this.outbox.on("m01.account.patient_created", (p) => this.service.handlePatientCreated(p));
  }
}

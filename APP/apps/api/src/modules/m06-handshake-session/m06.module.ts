/**
 * M06 — Poignée de main & Session ⭐ (MVP Chantier 3) — LE CŒUR DU SYSTÈME.
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * Orchestre l'acte médical complet : initiation → confirmation → paiement → session
 * chronométrée → compte-rendu → notation (fusion RDV + messagerie + consultation, D-026).
 *
 * Importe (contrats inter-modules, signatures imposées) :
 * - M05 : OffersService.getActiveOffer + PresenceService.isAvailableForInitiation ;
 * - M03 : VerificationStatusService (C6 — « peut exercer », D-029) ;
 * - M13 : PaymentsService (C1 — requestCharge / capture / refund, références opaques) ;
 * - M07 : HealthRecordWriterService (C2 — compte-rendu au Carnet) + Reader (lecture en session).
 *
 * S'abonne aux issues de paiement (C1) : c'est le webhook M13 — relayé par l'outbox —
 * qui prononce CONFIRMED → PAID et ouvre la session (RM-06-01).
 *
 * NOTE : aucun second poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11).
 * Les balayages publics (sweepExpired, sweepOverduePreparing, sweepElapsedActive,
 * remindMissingReports) seront cadencés par M16/cron au chantier suivant.
 */
import { Module, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { M05DirectoryModule } from "../m05-directory/m05.module";
import { M07HealthRecordModule } from "../m07-health-record/m07.module";
import { M13PaymentsModule } from "../m13-payments/m13.module";
import { M06Controller } from "./m06.controller";
import { HandshakeService } from "./m06.handshake.service";
import { RecordAccessService } from "./m06.record-access.service";
import { ReportService } from "./m06.report.service";
import { SessionService } from "./m06.session.service";

@Module({
  imports: [M05DirectoryModule, M03VerificationContractsModule, M13PaymentsModule, M07HealthRecordModule],
  controllers: [M06Controller],
  providers: [HandshakeService, SessionService, ReportService, RecordAccessService],
  // « Session active de P avec Pr » (spec §7) : M09 (ordonnance) et M10 (examens) ne se
  // déclencheront que depuis ce contexte — SessionService est leur point d'entrée.
  // M16 cadence les balayages temporels (sweepOverduePreparing/sweepElapsedActive → D-008 ;
  // HandshakeService.sweepExpired → PM-07 ; ReportService.remindMissingReports → PM-30).
  exports: [SessionService, HandshakeService, ReportService],
})
export class M06HandshakeSessionModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly handshakes: HandshakeService,
  ) {}

  onModuleInit(): void {
    // EF-06-03 (C1) : l'issue du paiement arrive par l'outbox commun — handlers IDEMPOTENTS
    // (transitions conditionnelles D-046) : un événement rejoué est sans effet.
    this.outbox.on("m13.payment.succeeded", (p) => this.handshakes.onPaymentSucceeded(p));
    this.outbox.on("m13.payment.failed", (p) => this.handshakes.onPaymentFailed(p));
  }
}

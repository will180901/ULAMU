import { Module, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { M11StocksModule } from "../m11-stocks/m11.module";
import { M13PaymentsModule } from "../m13-payments/m13.module";
import { M12Controller } from "./m12.controller";
import { DisclosureService } from "./m12.disclosure.service";
import { SearchService } from "./m12.search.service";

/**
 * M12 — Recherche & Dévoilement ⭐ (MVP Chantier 4) — LE MODÈLE SIGNATURE (D-009).
 * Spec : docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md
 *
 * Dire GRATUITEMENT « le médicament existe près de chez toi » (recherche anonyme par
 * arrondissement), et VENDRE 500 XAF (PM-03) « voici exactement où, réservé 24 h pour toi ».
 *
 * Importe (contrats inter-modules, signatures imposées) :
 * - M11 : StockAvailabilityService (C7 — searchAnonymous / pickOptimalFacility / availableQuantity /
 *   isPublishable / touchFreshness) ;
 * - M13 : PaymentsService (C1 — requestCharge 100 % ULAMU / refund intégral idempotent) ;
 * - M03 : importé pour cohérence de graphe (le statut C6 est appliqué par M11.isPublishable —
 *   on ne le rajoute pas, D-029).
 *
 * S'abonne aux issues de paiement (C1) : le webhook M13 — relayé par l'outbox — prononce
 * PENDING_PAYMENT → ACTIVE et ouvre la session de dévoilement (CU-12-02). M12 n'écoute QUE ses
 * propres ordres ("disclosure:") et ignore le reste (canal C1 partagé avec M06 « handshake: »).
 *
 * NOTE : aucun second poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11). Le balayage
 * public sweepExpired() (CU-12-05) sera cadencé par M16/cron au chantier suivant.
 */
@Module({
  imports: [M11StocksModule, M13PaymentsModule, M03VerificationContractsModule],
  controllers: [M12Controller],
  providers: [SearchService, DisclosureService],
  exports: [DisclosureService],
})
export class M12SearchDisclosureModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly disclosures: DisclosureService,
  ) {}

  onModuleInit(): void {
    // CU-12-02 (C1) : l'issue du paiement arrive par l'outbox commun — handlers IDEMPOTENTS
    // (transitions conditionnelles D-046). Un événement rejoué est sans effet.
    this.outbox.on("m13.payment.succeeded", (p) => this.disclosures.onPaymentSucceeded(p));
    this.outbox.on("m13.payment.failed", (p) => this.disclosures.onPaymentFailed(p));
  }
}

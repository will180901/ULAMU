import { Module } from "@nestjs/common";
import { M02RolesStructuresModule } from "../m02-roles-structures/m02.module";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { StockAvailabilityService } from "./m11.availability.service";
import { M11Controller } from "./m11.controller";
import { StockService } from "./m11.stock.service";

/**
 * M11 — Stocks & Catalogues (MVP Chantier 4).
 * Spec : docs/cahier_des_charges/02_modules/M11_stocks_catalogues.md
 * Donne à chaque pharmacie un stock vivant et fiable (anti R-03) et expose :
 * - C7 (disponibilité) à M12 via StockAvailabilityService (availableQuantity / isPublishable /
 *   searchAnonymous / pickOptimalFacility) ;
 * - C3 (décrément automatique à la délivrance) à M09 via StockAvailabilityService.consume.
 * Importe M02 (droit « stock ») et M03 (statut C6 « peut exercer », RM-11-02).
 *
 * NOTE : aucun poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11).
 */
@Module({
  imports: [M02RolesStructuresModule, M03VerificationContractsModule],
  controllers: [M11Controller],
  providers: [StockService, StockAvailabilityService],
  exports: [StockAvailabilityService],
})
export class M11StocksModule {}

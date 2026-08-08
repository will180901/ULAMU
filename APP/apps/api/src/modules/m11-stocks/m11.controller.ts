/**
 * M11 — routes membres de pharmacie (gestion du stock, EF-11-02/03/05/06/08/09/10).
 * AuthGuard global : tout est authentifié ; le droit « stock » sur la pharmacie ciblée est
 * vérifié SERVEUR dans StockService (M02) — jamais seulement masqué au client (RM-11-05).
 * La recherche/dévoilement (M12) et le décrément C3 (M09) passent par StockAvailabilityService,
 * pas par ces routes.
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import {
  ImportCsvDto,
  MovementsQueryDto,
  SetThresholdDto,
  StockCorrectionDto,
  StockEntryDto,
  StockExitDto,
} from "./m11.dto";
import { StockService } from "./m11.stock.service";

@Controller("v1/stocks/:facilityId")
export class M11Controller {
  constructor(private readonly stock: StockService) {}

  /** EF-11-02 : approvisionnement (lot, fournisseur, quantité, péremption, prix). */
  @Post("entries")
  addEntry(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string, @Body() dto: StockEntryDto) {
    return this.stock.addEntry(actor, facilityId, dto);
  }

  /** EF-11-03 : sortie manuelle motivée (vente hors ULAMU, perte, péremption…). */
  @Post("exits")
  addExit(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string, @Body() dto: StockExitDto) {
    return this.stock.addExit(actor, facilityId, dto);
  }

  /** EF-11-09 : correction d'inventaire vers une quantité cible. */
  @Post("corrections")
  correct(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string, @Body() dto: StockCorrectionDto) {
    return this.stock.correctInventory(actor, facilityId, dto);
  }

  /** EF-11-05 : seuil de stock faible par produit. */
  @Post("thresholds")
  setThreshold(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string, @Body() dto: SetThresholdDto) {
    return this.stock.setThreshold(actor, facilityId, dto);
  }

  /** EF-11-08 / CU-11-03 : « stock à jour » — réintègre la pharmacie à la recherche. */
  @Post("freshness")
  @HttpCode(200)
  confirmFreshness(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string) {
    return this.stock.confirmFreshness(actor, facilityId);
  }

  /** EF-11-06 : journal des mouvements par lot/pharmacie, paginé. */
  /** Inventaire courant, lot par lot, trié FEFO (RM-11-02). */
  @Get("items")
  items(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string) {
    return this.stock.listItems(actor, facilityId);
  }

  @Get("movements")
  movements(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string, @Query() query: MovementsQueryDto) {
    return this.stock.listMovements(actor, facilityId, query);
  }

  /** EF-11-05 : alertes (stock faible, rupture, péremption proche). */
  @Get("alerts")
  alerts(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string) {
    return this.stock.alerts(actor, facilityId);
  }

  /** EF-11-10 : import initial guidé (lignes déjà parsées) — rapproche, valide, applique. */
  @Post("import")
  @HttpCode(200)
  importCsv(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string, @Body() dto: ImportCsvDto) {
    return this.stock.importCsv(actor, facilityId, dto);
  }
}

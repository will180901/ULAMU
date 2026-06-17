/**
 * M12 — routes Recherche & Dévoilement (toutes authentifiées : AuthGuard global).
 * Spec : docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md
 *
 * Répartition des rôles (vérifiée dans les services, au plus près des données) :
 * - PATIENT : rechercher (gratuit), poser une cloche, payer un dévoilement, consulter, signaler ;
 * - PHARMACIE (membre actif) : marquer servi, contester un strike.
 * Les routes « mine » précèdent « :id » (ordre de résolution NestJS).
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import {
  CatalogQueryDto,
  ContestStrikeDto,
  CreateAlertDto,
  HistoryQueryDto,
  RequestDisclosureDto,
  SearchByPrescriptionDto,
  SearchDto,
} from "./m12.dto";
import { DisclosureService } from "./m12.disclosure.service";
import { SearchService } from "./m12.search.service";
import { clampHistoryPageSize } from "./m12.policies";

@Controller("v1")
export class M12Controller {
  constructor(
    private readonly search: SearchService,
    private readonly disclosures: DisclosureService,
  ) {}

  // ── Référentiel médicaments (EF-09-02) ───────────────────────────────────────

  /** Recherche du catalogue par nom (DCI/marque) — pour composer une recherche M12. */
  @Get("medicaments")
  catalog(@Query() dto: CatalogQueryDto) {
    return this.search.searchCatalog(dto.q, dto.limit);
  }

  // ── Recherche gratuite (EF-12-01/02 ; CU-12-01) ──────────────────────────────

  /** Recherche anonyme par produits libres (PATIENT) — anonyme par arrondissement (< 4 s, ENF-03). */
  @Post("search")
  @HttpCode(200)
  doSearch(@Actor() actor: AuthenticatedActor, @Body() dto: SearchDto) {
    return this.search.search(actor, dto);
  }

  /** Recherche par ordonnance (PATIENT) — lignes restantes d'une ordonnance ACTIVE (CU-12-01). */
  @Post("search/by-prescription")
  @HttpCode(200)
  searchByPrescription(@Actor() actor: AuthenticatedActor, @Body() dto: SearchByPrescriptionDto) {
    return this.search.searchByPrescription(actor, dto.prescriptionId, dto.district);
  }

  /** Poser une cloche « me prévenir si disponible » (PATIENT, EF-12-06). */
  @Post("search/alerts")
  createAlert(@Actor() actor: AuthenticatedActor, @Body() dto: CreateAlertDto) {
    return this.search.createAlert(actor, dto);
  }

  // ── Dévoilement payé (EF-12-03 → EF-12-07 ; CU-12-02/03/04/05) ──────────────

  /** Demande de dévoilement (PATIENT) — paiement PM-03 (C1) ; rien n'est révélé sans paiement (CU-12-02). */
  @Post("disclosures")
  requestDisclosure(@Actor() actor: AuthenticatedActor, @Body() dto: RequestDisclosureDto) {
    return this.disclosures.requestDisclosure(actor, dto);
  }

  /** Mes dévoilements (PATIENT) — historique, expiration paresseuse appliquée (EF-12-09). */
  @Get("disclosures/mine")
  listMine(@Actor() actor: AuthenticatedActor, @Query() query: HistoryQueryDto) {
    return this.disclosures.listMine(actor, clampHistoryPageSize(query.limit));
  }

  /** Prix courant du dévoilement (PM-03) — à afficher AVANT de payer (route "mine"/"price" avant ":id"). */
  @Get("disclosures/price")
  getDisclosurePrice() {
    return this.disclosures.getPrice();
  }

  /**
   * État + révélation (PATIENT propriétaire) — RM-12-01 : identité visible UNIQUEMENT si ACTIVE ;
   * l'expiration 24 h est appliquée à la lecture (CU-12-05).
   */
  @Get("disclosures/:disclosureId")
  getDisclosure(@Actor() actor: AuthenticatedActor, @Param("disclosureId") disclosureId: string) {
    return this.disclosures.getDisclosure(actor, disclosureId);
  }

  /** « Produit non disponible » (PATIENT, garantie Q-004) — re-dévoilement gratuit ou remboursement (EF-12-06). */
  @Post("disclosures/:disclosureId/report-unavailable")
  @HttpCode(200)
  reportUnavailable(@Actor() actor: AuthenticatedActor, @Param("disclosureId") disclosureId: string) {
    return this.disclosures.reportUnavailable(actor, disclosureId);
  }

  /** Marquer « réservation servie » (PHARMACIE révélée) — clôture propre (CU-12-03, RM-12-03). */
  @Post("disclosures/:disclosureId/mark-served")
  @HttpCode(200)
  markServed(@Actor() actor: AuthenticatedActor, @Param("disclosureId") disclosureId: string) {
    return this.disclosures.markServed(actor, disclosureId);
  }

  /** Contester un strike de fiabilité (PHARMACIE) — ACTIVE → CONTESTED, arbitrage M16 (EF-12-07). */
  @Post("strikes/:strikeId/contest")
  @HttpCode(200)
  contestStrike(
    @Actor() actor: AuthenticatedActor,
    @Param("strikeId") strikeId: string,
    @Body() dto: ContestStrikeDto,
  ) {
    return this.disclosures.contestStrike(actor, strikeId, dto.reason);
  }
}

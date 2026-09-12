/**
 * M05 — routes de l'Annuaire des Professionnels.
 * Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * - Vitrine : @Public() — l'annuaire se parcourt SANS compte (EF-05-04, acquisition) ;
 *   toute action (offres, présence, cloche) exige la connexion (AuthGuard global).
 * - Offres et présence : réservées aux PROFESSIONNELS (EF-05-02/05) — type vérifié ici
 *   (les services de présence gardent les signatures imposées, sans notion d'acteur).
 */
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor, Public } from "../../common/auth/auth.guard";
import { CreateOfferDto, DirectoryQueryDto, SetPresenceStateDto, UpdateMyProfileDto, UpdateOfferDto } from "./m05.dto";
import { DirectoryService } from "./m05.directory.service";
import { OffersService } from "./m05.offers.service";
import { PresenceService } from "./m05.presence.service";

@Controller("v1")
export class M05Controller {
  constructor(
    private readonly offers: OffersService,
    private readonly presence: PresenceService,
    private readonly directory: DirectoryService,
  ) {}

  // ── Profil public (EF-05-01) — professionnel authentifié ────────────────────

  /** Modifie mon profil public (bio/spécialité/arrondissement) — M01 est réservé aux patients. */
  @Patch("me/professional-profile")
  updateMyProfile(@Actor() actor: AuthenticatedActor, @Body() dto: UpdateMyProfileDto) {
    this.assertProfessional(actor);
    return this.offers.updateMyProfile(actor, dto);
  }

  // ── Offres (EF-05-02 ; CU-05-03) — professionnel authentifié ────────────────

  /** Offres du professionnel connecté (actives et inactives — écran de gestion). */
  @Get("offers")
  listMyOffers(@Actor() actor: AuthenticatedActor) {
    return this.offers.listMine(actor);
  }

  /**
   * Bornes de composition d'une offre (PM-09/PM-06/PM-25) — annoncées AVANT la saisie.
   *
   * Déclarée ici, et non fondue dans `GET /v1/offers` : envelopper la liste aurait changé la forme
   * d'un contrat existant pour une donnée qui ne bouge presque jamais.
   */
  @Get("offers/limits")
  myOfferLimits(@Actor() actor: AuthenticatedActor) {
    return this.offers.limitsForMine(actor);
  }

  /** Création — PM-09/PM-06/PM-25 + vérification M03 (RM-05-01, D-029). */
  @Post("offers")
  createOffer(@Actor() actor: AuthenticatedActor, @Body() dto: CreateOfferDto) {
    return this.offers.createOffer(actor, dto);
  }

  /** Modification / activation / désactivation (CU-05-03). */
  @Patch("offers/:offerId")
  updateOffer(@Actor() actor: AuthenticatedActor, @Param("offerId") offerId: string, @Body() dto: UpdateOfferDto) {
    return this.offers.updateOffer(actor, offerId, dto);
  }

  /** DELETE = désactivation (CU-05-03) — l'historique des sessions garde sa référence. */
  @Delete("offers/:offerId")
  @HttpCode(204)
  async deleteOffer(@Actor() actor: AuthenticatedActor, @Param("offerId") offerId: string): Promise<void> {
    await this.offers.deactivateOffer(actor, offerId);
  }

  // ── Présence (EF-05-05/06 ; CU-05-04) ───────────────────────────────────────

  /**
   * Battement de cœur — upsert ONLINE sauf Ne pas déranger (PM-26 à la lecture).
   *
   * ── ⚠️ Ouvert à TOUT compte depuis le chantier 102 ──────────────────────────────────────────
   *
   * Il était réservé au professionnel, et c'était juste tant que la présence ne servait qu'à une
   * chose : la **disponibilité dans l'annuaire**. Depuis le chantier 98, le bandeau de consultation
   * du soignant dit « en ligne » ou « vu il y a tant » **du patient** — et le patient ne pouvait pas
   * donner signe de vie. *J'ai branché l'appel sans vérifier que la porte s'ouvrait, et le refus
   * était avalé en silence : le statut disait « hors ligne » pour toujours, sans que rien ne le
   * signale.*
   *
   * ⚠️ **Ce que cela n'ouvre PAS.** Une ligne de présence pour un patient n'entre nulle part
   * ailleurs : l'annuaire ne lit la présence que des comptes qu'il a déjà retenus comme
   * professionnels, et `fireAvailabilityAlerts` sort immédiatement faute d'offre de soin. Les deux
   * routes qui décident vraiment de la disponibilité — `presence/state` et `presence/me` — restent
   * réservées au professionnel.
   *
   * *Ouvrir une porte n'est pas ouvrir la maison : ce qui se lit derrière compte plus que qui frappe.*
   */
  @Post("presence/heartbeat")
  @HttpCode(200)
  heartbeat(@Actor() actor: AuthenticatedActor) {
    return this.presence.heartbeat(actor.accountId);
  }

  /** Bascule en un clic : ONLINE / DO_NOT_DISTURB / OFFLINE (CU-05-04). */
  @Post("presence/state")
  @HttpCode(200)
  setPresenceState(@Actor() actor: AuthenticatedActor, @Body() dto: SetPresenceStateDto) {
    this.assertProfessional(actor);
    return this.presence.setState(actor.accountId, dto.state);
  }

  /** Présence courante du professionnel connecté (état + disponibilité calculée). */
  @Get("presence/me")
  myPresence(@Actor() actor: AuthenticatedActor) {
    this.assertProfessional(actor);
    return this.presence.getMine(actor.accountId);
  }

  // ── Vitrine PUBLIQUE (EF-05-03/04 ; CU-05-01/02) ────────────────────────────

  /** Recherche avec filtres et tris — consultable SANS compte (EF-05-04). */
  @Public()
  @Get("directory")
  search(@Query() query: DirectoryQueryDto) {
    return this.directory.search(query);
  }

  /** Fiche publique complète : profil EF-05-01 + offres actives + notations (EF-05-07). */
  @Public()
  @Get("directory/:professionalId")
  profile(@Param("professionalId") professionalId: string) {
    return this.directory.getProfile(professionalId);
  }

  // ── Cloche (EF-05-06 ; CU-05-05) — patient authentifié ──────────────────────

  /** « M'avertir quand il est disponible » — upsert, une notification max, 7 jours (spec). */
  @Post("directory/:professionalId/availability-alert")
  @HttpCode(200)
  poseAvailabilityAlert(@Actor() actor: AuthenticatedActor, @Param("professionalId") professionalId: string) {
    return this.directory.poseAvailabilityAlert(actor, professionalId);
  }

  // ── Aides ────────────────────────────────────────────────────────────────────

  private assertProfessional(actor: AuthenticatedActor): void {
    if (actor.accountType !== "PROFESSIONAL") {
      throw new ForbiddenException("Action réservée aux professionnels de santé");
    }
  }
}

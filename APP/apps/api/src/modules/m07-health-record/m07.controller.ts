/**
 * M07 — routes patient du Carnet (EF-07-03/06/08/09).
 * AuthGuard global : tout est authentifié ; la portée (soi-même ou sous-profil dont
 * on est le tuteur, RM-07-06) est vérifiée serveur dans M07Service — jamais le client.
 * L'accès professionnel en session N'EST PAS ici : il relève de M06 (RM-07-05).
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { ClaimByCodeDto, ClaimSubProfileDto, CreateSubProfileDto, DeclareEntryDto, OwnerScopeQueryDto, RecordQueryDto } from "./m07.dto";
import { M07Service } from "./m07.service";

@Controller("v1/health-record")
export class M07Controller {
  constructor(private readonly service: M07Service) {}

  // ── Déclarations patient (EF-07-06, CU-07-02) ───────────────────────────────

  /** Déclare allergie/antécédent/vaccination/note — pour soi, ou pour un sous-profil (tuteur). */
  @Post("me/entries")
  declareEntry(@Actor() actor: AuthenticatedActor, @Body() dto: DeclareEntryDto, @Query() scope: OwnerScopeQueryDto) {
    return this.service.declareEntry(actor, dto, scope.subProfileId);
  }

  // ── Lecture (EF-07-03/07 ; RM-07-04 : le patient voit tout) ─────────────────

  /** Fiche synthèse calculée : groupe sanguin, allergies actives, maladies chroniques. */
  @Get("me/summary")
  getSummary(@Actor() actor: AuthenticatedActor, @Query() scope: OwnerScopeQueryDto) {
    return this.service.getMySummary(actor, scope.subProfileId);
  }

  /** Export JSON complet + empreinte sha256 vérifiable (EF-07-08) — chaque export est tracé C5. */
  @Get("me/export")
  exportRecord(@Actor() actor: AuthenticatedActor, @Query() scope: OwnerScopeQueryDto) {
    return this.service.exportMyRecord(actor, scope.subProfileId);
  }

  /** Chronologie filtrable par type, paginée par curseur (CU-07-01). */
  @Get("me")
  getRecord(@Actor() actor: AuthenticatedActor, @Query() query: RecordQueryDto) {
    return this.service.getMyRecord(actor, query);
  }

  // ── Carnet familial (EF-07-09, D-033 ; CU-07-04/05) ─────────────────────────

  /** Crée une personne à charge ET son Carnet distinct (transaction unique). */
  @Post("me/sub-profiles")
  createSubProfile(@Actor() actor: AuthenticatedActor, @Body() dto: CreateSubProfileDto) {
    return this.service.createSubProfile(actor, dto);
  }

  /** Personnes à charge du tuteur (statut visible ; Carnet accessible si DEPENDENT). */
  @Get("me/sub-profiles")
  listSubProfiles(@Actor() actor: AuthenticatedActor) {
    return this.service.listSubProfiles(actor);
  }

  /** Étape 1 du transfert à la majorité : le TUTEUR reçoit l'OTP de confirmation (CU-07-05). */
  @Post("sub-profiles/:id/claim/start")
  @HttpCode(200)
  startClaim(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.service.startClaim(actor, id);
  }

  /** Étape 2 : le MAJEUR revendique depuis son compte, OTP du tuteur à l'appui (RM-07-06). */
  @Post("sub-profiles/:id/claim")
  @HttpCode(200)
  claim(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: ClaimSubProfileDto) {
    return this.service.claim(actor, id, dto);
  }

  /**
   * Étape 2, par le seul CODE DICTABLE (dette n°26, 06/09/2026).
   *
   * ⚠️ **Le sous-profil n'est PAS dans l'URL, et c'est tout l'intérêt.** La route ci-dessus oblige le
   * majeur à connaître `subProfileId` *et* `intentId` — 73 caractères d'UUID que son tuteur doit lui
   * faire parvenir par écrit. Or les deux personnes sont le plus souvent dans la même pièce. Ici, le
   * code de huit signes désigne le transfert à lui seul, et le serveur retrouve le reste.
   *
   * Le chemin d'origine reste servi : une application déjà déployée continue de fonctionner.
   */
  @Post("sub-profiles/claim-by-code")
  @HttpCode(200)
  claimByCode(@Actor() actor: AuthenticatedActor, @Body() dto: ClaimByCodeDto) {
    return this.service.claimByCode(actor, dto.code, dto.otpCode);
  }
}

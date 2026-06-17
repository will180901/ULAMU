/**
 * M03 — côté déposant (CU-03-01/03).
 * « Me » = le dossier de la structure dont l'acteur est titulaire (OWNER, M02),
 * sinon son dossier professionnel.
 */
import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { AddDocumentDto, SignAgreementDto } from "./m03.dto";
import { M03Service } from "./m03.service";

@Controller("v1/verification")
export class M03Controller {
  constructor(private readonly service: M03Service) {}

  /**
   * Statut + pièces + décisions motivées (CU-03-02) + contrat.
   * ?facilityId= cible explicitement le dossier d'une structure dont l'acteur est
   * titulaire — un professionnel devenu titulaire garde ainsi accès à ses deux dossiers.
   */
  @Get("me")
  getMine(@Actor() actor: AuthenticatedActor, @Query("facilityId") facilityId?: string) {
    return this.service.getMine(actor.accountId, facilityId);
  }

  /** Téléversement d'une pièce justificative (EF-03-01/02). */
  @Post("me/documents")
  addDocument(@Actor() actor: AuthenticatedActor, @Body() dto: AddDocumentDto, @Query("facilityId") facilityId?: string) {
    return this.service.addDocument(actor, dto, facilityId);
  }

  /** Dépôt du dossier — jeu minimal de pièces exigé (CU-03-01). */
  @Post("me/submit")
  @HttpCode(200)
  submit(@Actor() actor: AuthenticatedActor, @Query("facilityId") facilityId?: string) {
    return this.service.submit(actor, facilityId);
  }

  /** Démarrage de la signature : OTP « action sensible » (CU-03-03). */
  @Post("me/agreement/sign/start")
  @HttpCode(200)
  signStart(@Actor() actor: AuthenticatedActor, @Query("facilityId") facilityId?: string) {
    return this.service.signStart(actor.accountId, facilityId);
  }

  /** Signature électronique : mot de passe + OTP (EF-03-06, CU-03-03). */
  @Post("me/agreement/sign")
  @HttpCode(200)
  sign(@Actor() actor: AuthenticatedActor, @Body() dto: SignAgreementDto, @Query("facilityId") facilityId?: string) {
    return this.service.sign(actor, dto, facilityId);
  }
}

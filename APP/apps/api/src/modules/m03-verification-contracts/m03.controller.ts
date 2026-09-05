/**
 * M03 — côté déposant (CU-03-01/03).
 * « Me » = le dossier de la structure dont l'acteur est titulaire (OWNER, M02),
 * sinon son dossier professionnel.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, StreamableFile } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { SignAgreementDto, UploadDocumentDto } from "./m03.dto";
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

  /*
    ── `POST me/documents` est RETIRÉE le 05/09/2026 (écart F) ─────────────────────────────────

    Elle attendait une `fileKey` — une clé de fichier « déjà téléversé » — qu'**aucun point d'entrée
    de l'API ne savait produire** pour un dossier de vérification. Un client qui l'appelait ne
    pouvait donc jamais aboutir : il n'existait aucun moyen légitime d'obtenir la valeur à mettre
    dedans. Le commentaire de `m03.dto.ts` le disait déjà, et la route est restée.

    `POST me/documents/upload` ci-dessous fait le travail en un appel, et c'est elle que le web
    utilise. Aucun client — web ni mobile — n'appelait la route retirée : vérifié avant la coupe.

    ⚠️ **La MÉTHODE `addDocument` du service reste**, et ce n'est pas un oubli : `uploadDocument`
    l'appelle pour rattacher la pièce après stockage. Ce qui disparaît, c'est son exposition en
    HTTP — plus personne du dehors ne peut prétendre fournir une `fileKey`.

    *Une route qui ne peut pas aboutir est un piège pour qui la lira dans six mois : elle a l'air
    d'une fonctionnalité, et elle coûte une demi-journée avant qu'on comprenne qu'elle ment.*
  */

  /** Téléversement + rattachement d'une pièce, en un appel (EF-03-01/02). */
  @Post("me/documents/upload")
  uploadDocument(@Actor() actor: AuthenticatedActor, @Body() dto: UploadDocumentDto, @Query("facilityId") facilityId?: string) {
    return this.service.uploadDocument(actor, dto, facilityId);
  }

  /**
   * Lecture d'une pièce que l'on a soi-même déposée — le bouton « Voir » de l'écran.
   *
   * Par identifiant de pièce, jamais par clé de stockage : la clé n'est plus servie au client du
   * tout (voir `getMine`), et une clé qui fuite serait rejouable sans contrôle de propriétaire.
   */
  @Get("me/documents/:id/file")
  async ownDocumentFile(
    @Actor() actor: AuthenticatedActor,
    @Param("id") id: string,
    @Query("facilityId") facilityId?: string,
  ): Promise<StreamableFile> {
    const f = await this.service.readOwnDocument(actor.accountId, id, facilityId);
    return new StreamableFile(f.buffer, { type: f.contentType });
  }

  /** Retrait d'une pièce, pour pouvoir la remplacer (EF-03-01/04). */
  @Delete("me/documents/:id")
  @HttpCode(200)
  removeDocument(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Query("facilityId") facilityId?: string) {
    return this.service.removeDocument(actor, id, facilityId);
  }

  /** Dépôt du dossier — jeu minimal de pièces exigé (CU-03-01). */  /** Dépôt du dossier — jeu minimal de pièces exigé (CU-03-01). */
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

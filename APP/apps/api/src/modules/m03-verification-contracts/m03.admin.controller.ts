/**
 * M03 — côté Admin Vérification (EF-03-03/04/08, CU-03-02/05).
 * Réservé au sous-rôle ADMIN_VERIFICATION (matrice M02 §5) — TOTP exigé par AdminGuard (RM-01-06).
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query, StreamableFile, UseGuards } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { DecideDto, QueueQueryDto, RevokeDto } from "./m03.dto";
import { M03Service } from "./m03.service";

@Controller("v1/admin/verification")
@UseGuards(AdminGuard)
@AdminOnly("ADMIN_VERIFICATION")
export class M03AdminController {
  constructor(private readonly service: M03Service) {}

  /** File de traitement : tri par ancienneté, dépassement 2×PM-11 signalé (EF-03-03). */
  @Get("queue")
  queue(@Query() query: QueueQueryDto) {
    return this.service.queue(query.status);
  }

  /**
   * Lecture d'une pièce justificative pour l'examiner.
   *
   * Sans cette route, l'administration devait décider de la vérification d'un soignant SANS pouvoir
   * ouvrir son diplôme ni sa pièce d'identité : les fichiers étaient stockés et chiffrés, et aucune
   * route ne savait les servir. L'accès est tracé au journal d'audit (loi n° 29-2019).
   */
  @Get(":caseId/documents/:id/file")
  async documentFile(
    @Actor() actor: AuthenticatedActor,
    @Param("caseId") caseId: string,
    @Param("id") id: string,
  ): Promise<StreamableFile> {
    const f = await this.service.readDocumentAsAdmin(actor.accountId, caseId, id);
    return new StreamableFile(f.buffer, { type: f.contentType });
  }

  /** Prise en examen d'un dossier déposé (CU-03-02). */  /** Prise en examen d'un dossier déposé (CU-03-02). */
  @Post(":caseId/claim")
  @HttpCode(200)
  claim(@Actor() actor: AuthenticatedActor, @Param("caseId") caseId: string) {
    return this.service.claim(actor.accountId, caseId);
  }

  /** Décision motivée : vérifié / refusé / complément demandé (EF-03-04, RM-03-02). */
  @Post(":caseId/decide")
  @HttpCode(200)
  decide(@Actor() actor: AuthenticatedActor, @Param("caseId") caseId: string, @Body() dto: DecideDto) {
    return this.service.decide(actor.accountId, caseId, dto);
  }

  /** Révocation du badge — fraude, documents falsifiés (EF-03-08, CU-03-05). */
  @Post(":caseId/revoke")
  @HttpCode(200)
  revoke(@Actor() actor: AuthenticatedActor, @Param("caseId") caseId: string, @Body() dto: RevokeDto) {
    return this.service.revoke(actor.accountId, caseId, dto.reasons);
  }

  /** Avenant (EF-03-07, D-022) : nouvelle version du contrat au taux PM-01 courant, préavis notifié. */
  @Post(":caseId/agreement/reissue")
  @HttpCode(200)
  reissue(@Actor() actor: AuthenticatedActor, @Param("caseId") caseId: string) {
    return this.service.reissueAgreement(actor.accountId, caseId);
  }
}

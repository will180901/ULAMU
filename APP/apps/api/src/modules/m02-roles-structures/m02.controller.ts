/**
 * M02 — routes des espaces structures. Toutes authentifiées (AuthGuard global, RM-02-03) ;
 * les contrôles fins (titulaire, droits internes) vivent dans le service (EF-02-02).
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import {
  AcceptInvitationDto,
  ConfirmTransferDto,
  CreateFacilityDto,
  InviteMemberDto,
  StartTransferDto,
  UpdateMemberRightsDto,
} from "./m02.dto";
import { M02Service } from "./m02.service";

@Controller("v1")
export class M02Controller {
  constructor(private readonly service: M02Service) {}

  // ── Espace structure (EF-02-03 ; CU-02-01) ─────────────────────────────────

  @Post("facilities")
  createFacility(@Actor() actor: AuthenticatedActor, @Body() dto: CreateFacilityDto) {
    return this.service.createFacility(actor.accountId, dto);
  }

  /**
   * Ma structure — `null` si le compte n'est rattaché à aucune.
   *
   * Déclaré AVANT `facilities/:id`, sinon « me » serait capturé comme un identifiant par la route
   * paramétrée : l'ordre des routes est significatif dans NestJS.
   */
  @Get("facilities/me")
  getMyFacility(@Actor() actor: AuthenticatedActor) {
    return this.service.getMyFacility(actor.accountId);
  }

  /** Détail + liste des membres — tout membre actif de la structure (pas seulement le titulaire). */
  @Get("facilities/:id")
  getFacility(@Actor() actor: AuthenticatedActor, @Param("id") facilityId: string) {
    return this.service.getFacilityDetail(actor.accountId, facilityId);
  }

  // ── Invitations (EF-02-04 ; CU-02-02) ──────────────────────────────────────

  @Post("facilities/:id/invitations")
  inviteMember(@Actor() actor: AuthenticatedActor, @Param("id") facilityId: string, @Body() dto: InviteMemberDto) {
    return this.service.inviteMember(actor.accountId, facilityId, dto);
  }

  @Post("invitations/accept")
  @HttpCode(200)
  acceptInvitation(@Actor() actor: AuthenticatedActor, @Body() dto: AcceptInvitationDto) {
    return this.service.acceptInvitation(actor.accountId, dto.invitationId);
  }

  // ── Membres (EF-02-05/07 ; CU-02-03/04) ────────────────────────────────────

  @Patch("facilities/:id/members/:memberId")
  updateMemberRights(
    @Actor() actor: AuthenticatedActor,
    @Param("id") facilityId: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMemberRightsDto,
  ) {
    return this.service.updateMemberRights(actor.accountId, facilityId, memberId, dto.rights);
  }

  /** Suspension (active=false) — l'historique reste attribué au membre (CU-02-04). */
  @Delete("facilities/:id/members/:memberId")
  @HttpCode(204)
  async suspendMember(
    @Actor() actor: AuthenticatedActor,
    @Param("id") facilityId: string,
    @Param("memberId") memberId: string,
  ) {
    await this.service.suspendMember(actor.accountId, facilityId, memberId);
  }

  // ── Transfert de titularité (EF-02-06 ; CU-02-05) ──────────────────────────

  @Post("facilities/:id/transfer/start")
  @HttpCode(200)
  startTransfer(@Actor() actor: AuthenticatedActor, @Param("id") facilityId: string, @Body() dto: StartTransferDto) {
    return this.service.startOwnershipTransfer(actor.accountId, facilityId, dto.toMemberId);
  }

  @Post("facilities/:id/transfer/confirm")
  @HttpCode(200)
  confirmTransfer(@Actor() actor: AuthenticatedActor, @Param("id") facilityId: string, @Body() dto: ConfirmTransferDto) {
    return this.service.confirmOwnershipTransfer(actor.accountId, facilityId, dto.intentId, dto.ownerOtpCode, dto.targetOtpCode);
  }
}

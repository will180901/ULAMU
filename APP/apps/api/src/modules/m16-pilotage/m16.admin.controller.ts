/**
 * M16 — routes Back-office Équipe ULAMU (EF-16-03/04/06/07).
 * AdminGuard : TOTP obligatoire (RM-01-06) ; sous-rôles au plus juste (matrice M02) :
 * - paramètres = SUPER_ADMIN seul (EF-16-04) ;
 * - sanctions de compte & arbitrage des strikes = SUPER_ADMIN / ADMIN_VERIFICATION / ADMIN_MAP ;
 * - procédures support = SUPER_ADMIN / ADMIN_VERIFICATION (interventions sensibles).
 * SUPER_ADMIN passe partout. Motif obligatoire sur chaque action (RM-16-03).
 */
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { AdminRole } from "@prisma/client";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { AdminService } from "./m16.admin.service";
import {
  AnswerSupportRequestDto,
  CancelSupportProcedureDto,
  CompleteSupportProcedureDto,
  ListSupportProceduresQueryDto,
  ListSupportRequestsQueryDto,
  MotiveDto,
  OpenSupportProcedureDto,
  ResolveStrikeDto,
  SearchAccountsQueryDto,
  UpdateParameterDto,
} from "./m16.dto";
import { ParametersService } from "./m16.parameters.service";
import { SupportRequestService } from "./m16.support-requests.service";
import { SupportProcedureService } from "./m16.support.service";

@Controller("v1/admin")
@UseGuards(AdminGuard)
export class M16AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly parameters: ParametersService,
    private readonly support: SupportProcedureService,
    private readonly supportRequests: SupportRequestService,
  ) {}

  // ── Comptes & sanctions (EF-16-03/07) ────────────────────────────────────────

  /** Recherche de comptes (téléphone OU nom) — données minimales (RM-16-02). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Get("accounts")
  searchAccounts(@Query() query: SearchAccountsQueryDto) {
    return this.admin.searchAccounts(query.query);
  }

  /** CU-16-01 : suspension motivée (effet < 1 min, remboursement des sessions vives). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Post("accounts/:id/suspend")
  @HttpCode(200)
  suspend(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: MotiveDto) {
    return this.admin.suspendAccount(actor.accountId, id, dto.reason);
  }

  /** Réactivation motivée d'un compte suspendu. */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Post("accounts/:id/reactivate")
  @HttpCode(200)
  reactivate(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: MotiveDto) {
    return this.admin.reactivateAccount(actor.accountId, id, dto.reason);
  }

  /** EF-16-07 : demande de bannissement définitif (en attente d'un 2ᵉ admin). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Post("accounts/:id/ban")
  @HttpCode(200)
  requestBan(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: MotiveDto) {
    return this.admin.requestBan(actor.accountId, id, dto.reason);
  }

  /** EF-16-07 : seconde approbation par un admin DISTINCT du demandeur. */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Post("sanctions/:id/approve")
  @HttpCode(200)
  approveBan(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.admin.approveBan(actor.accountId, id);
  }

  /** Rejet d'une demande de bannissement (tout admin, y compris le demandeur). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Post("sanctions/:id/reject")
  @HttpCode(200)
  rejectBan(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.admin.rejectBan(actor.accountId, id);
  }

  /** EF-12-07 : arbitrage d'un strike de fiabilité (maintenu / levé). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION, AdminRole.ADMIN_MAP)
  @Post("strikes/:id/resolve")
  @HttpCode(200)
  resolveStrike(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: ResolveStrikeDto) {
    return this.admin.resolveStrike(actor.accountId, id, dto.uphold, dto.reason);
  }

  // ── Paramètres plateforme (EF-16-04) — SUPER_ADMIN seul ──────────────────────

  /** CU-16-02 : changement d'un PM-xx (valeur + date d'effet + motif), avenant si taux. */
  @AdminOnly(AdminRole.SUPER_ADMIN)
  @Put("parameters/:key")
  updateParameter(@Actor() actor: AuthenticatedActor, @Param("key") key: string, @Body() dto: UpdateParameterDto) {
    return this.parameters.updateParameter(actor.accountId, key, dto.value, dto.effectiveAt, dto.reason);
  }

  /**
   * Tableau des paramètres (EF-16-04).
   *
   * ⚠️ Cette route manquait : on pouvait modifier un PM-xx et lire son historique, mais pas savoir
   * lesquels existent. Sans elle, changer un seuil imposait une migration de base — alors que tout
   * le mécanisme de modification était déjà là.
   *
   * Déclarée AVANT `parameters/:key/history` : Nest apparie dans l'ordre de déclaration, et une
   * route générique posée trop tôt avalerait la spécifique.
   */
  @AdminOnly(AdminRole.SUPER_ADMIN)
  @Get("parameters")
  listParameters() {
    return this.parameters.list();
  }

  /**
   * S5 — ce que coûterait le changement de ce paramètre, AVANT de le faire (famille 4, point 11).
   *
   * Déclarée avant `parameters/:key/history` pour la même raison que `parameters` : Nest apparie
   * dans l'ordre de déclaration.
   */
  @AdminOnly(AdminRole.SUPER_ADMIN)
  @Get("parameters/:key/impact")
  parameterImpact(@Param("key") key: string) {
    return this.parameters.impactOf(key);
  }

  /** Historique d'un paramètre plateforme. */
  @AdminOnly(AdminRole.SUPER_ADMIN)
  @Get("parameters/:key/history")
  parameterHistory(@Param("key") key: string) {
    return this.parameters.listHistory(key);
  }

  // ── Procédures support (EF-16-03, CU-16-04) ──────────────────────────────────

  /** Ouvre une procédure support guidée et auditée. */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION)
  @Post("support-procedures")
  openProcedure(@Actor() actor: AuthenticatedActor, @Body() dto: OpenSupportProcedureDto) {
    return this.support.openProcedure(actor.accountId, dto);
  }

  /** Avance / clôture une procédure support. */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION)
  @Post("support-procedures/:id/complete")
  @HttpCode(200)
  completeProcedure(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: CompleteSupportProcedureDto) {
    return this.support.completeProcedure(actor.accountId, id, dto);
  }

  /** Annulation motivée d'une procédure support. */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION)
  @Post("support-procedures/:id/cancel")
  @HttpCode(200)
  cancelProcedure(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: CancelSupportProcedureDto) {
    return this.support.cancelProcedure(actor.accountId, id, dto);
  }

  /** Liste filtrée des procédures support. */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION)
  /*
    ── Les demandes de support (01/09/2026, dette 8quater) ───────────────────────────────────────

    Mêmes habilitations que les procédures support : ce sont deux moitiés du même geste — l'une est
    ce qu'on demande, l'autre ce qu'un administrateur fait. Répondre n'exerce aucun pouvoir sur un
    compte : l'effet réel passe toujours par la procédure du module propriétaire (RM-16-01).
  */
  @AdminOnly(AdminRole.SUPER_ADMIN, AdminRole.ADMIN_VERIFICATION)
  @Get("support-requests")
  listSupportRequests(@Query() q: ListSupportRequestsQueryDto) {
    return this.supportRequests.list(q.status);
  }

  @AdminOnly(AdminRole.SUPER_ADMIN, AdminRole.ADMIN_VERIFICATION)
  @Post("support-requests/:id/answer")
  @HttpCode(200)
  answerSupportRequest(
    @Actor() actor: AuthenticatedActor,
    @Param("id") id: string,
    @Body() dto: AnswerSupportRequestDto,
  ) {
    return this.supportRequests.answer(actor.accountId, id, dto.answer);
  }

  @Get("support-procedures")
  listProcedures(@Query() query: ListSupportProceduresQueryDto) {
    return this.support.listProcedures(query);
  }
}

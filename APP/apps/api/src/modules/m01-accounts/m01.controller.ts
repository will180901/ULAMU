import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OtpPurpose } from "@prisma/client";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor, Public } from "../../common/auth/auth.guard";
import {
  CheckUsernameDto,
  CloseAccountDto,
  ConfirmPhoneChangeDto,
  ConfirmTotpDto,
  DisableTotpDto,
  LoginDto,
  RegisterFacilityMemberDto,
  RegisterPatientDto,
  RegisterProfessionalDto,
  RequestOtpDto,
  ResetPasswordDto,
  StartPhoneChangeDto,
  UpdateAvatarDto,
  UpdateProfileDto,
} from "./m01.dto";
import { M01Service } from "./m01.service";

@Controller("v1")
export class M01Controller {
  constructor(private readonly service: M01Service) {}

  // ── Public (inscription, connexion, récupération) ──────────────────────────

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("accounts/otp/request")
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.service.requestOtp(dto.phone, dto.purpose as OtpPurpose);
  }

  @Public()
  @Get("accounts/username-available")
  checkUsername(@Query() dto: CheckUsernameDto) {
    return this.service.isUsernameAvailable(dto.username);
  }

  @Public()
  @Post("accounts/register/patient")
  registerPatient(@Body() dto: RegisterPatientDto) {
    return this.service.registerPatient(dto);
  }

  @Public()
  @Post("accounts/register/professional")
  registerProfessional(@Body() dto: RegisterProfessionalDto) {
    return this.service.registerProfessional(dto);
  }

  @Public()
  @Post("accounts/register/facility-member")
  registerFacilityMember(@Body() dto: RegisterFacilityMemberDto) {
    return this.service.registerFacilityMember(dto);
  }

  @Public()
  @Post("auth/login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Public()
  @Post("auth/password-reset")
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto);
  }

  // ── Authentifié ─────────────────────────────────────────────────────────────

  /** Identité du compte connecté (header d'accueil, Mon Espace) — sans secret. */
  @Get("accounts/me")
  getMe(@Actor() actor: AuthenticatedActor) {
    return this.service.getMe(actor.accountId);
  }

  /** Mise à jour de son profil patient (CRUD compte) — n'affecte que soi. */
  @Patch("accounts/me")
  updateMe(@Actor() actor: AuthenticatedActor, @Body() dto: UpdateProfileDto) {
    return this.service.updateMyProfile(actor.accountId, dto);
  }

  @Post("accounts/me/avatar")
  setAvatar(@Actor() actor: AuthenticatedActor, @Body() dto: UpdateAvatarDto) {
    return this.service.setAvatar(actor.accountId, dto.imageBase64, dto.mime);
  }

  @Delete("accounts/me/avatar")
  removeAvatar(@Actor() actor: AuthenticatedActor) {
    return this.service.removeAvatar(actor.accountId);
  }

  @Get("accounts/me/sessions")
  listSessions(@Actor() actor: AuthenticatedActor) {
    return this.service.listSessions(actor.accountId, actor.sessionId);
  }

  @Delete("accounts/me/sessions/:id")
  @HttpCode(204)
  async revokeSession(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    await this.service.revokeSession(actor.accountId, id);
  }

  /** Déconnexion : révoque la session COURANTE (celle du jeton utilisé) côté serveur, pas seulement en local. */
  @Post("accounts/me/logout")
  @HttpCode(204)
  async logout(@Actor() actor: AuthenticatedActor) {
    await this.service.revokeSession(actor.accountId, actor.sessionId);
  }

  @Post("accounts/me/phone-change/start")
  @HttpCode(200)
  startPhoneChange(@Actor() actor: AuthenticatedActor, @Body() dto: StartPhoneChangeDto) {
    return this.service.startPhoneChange(actor.accountId, dto.newPhone);
  }

  @Post("accounts/me/phone-change/confirm")
  @HttpCode(200)
  confirmPhoneChange(@Actor() actor: AuthenticatedActor, @Body() dto: ConfirmPhoneChangeDto) {
    return this.service.confirmPhoneChange(actor.accountId, dto.newPhone, dto.oldPhoneCode, dto.newPhoneCode);
  }

  @Post("accounts/me/close/request-otp")
  @HttpCode(200)
  requestCloseOtp(@Actor() actor: AuthenticatedActor) {
    return this.service.requestCloseOtp(actor.accountId);
  }

  @Post("accounts/me/close")
  @HttpCode(200)
  closeAccount(@Actor() actor: AuthenticatedActor, @Body() dto: CloseAccountDto) {
    return this.service.closeAccount(actor.accountId, dto.password, dto.otpCode);
  }

  @Post("accounts/me/totp/setup")
  setupTotp(@Actor() actor: AuthenticatedActor) {
    return this.service.setupTotp(actor.accountId);
  }

  @Post("accounts/me/totp/confirm")
  confirmTotp(@Actor() actor: AuthenticatedActor, @Body() dto: ConfirmTotpDto) {
    return this.service.confirmTotp(actor.accountId, dto.code);
  }

  @Post("accounts/me/totp/disable")
  @HttpCode(200)
  disableTotp(@Actor() actor: AuthenticatedActor, @Body() dto: DisableTotpDto) {
    return this.service.disableTotp(actor.accountId, dto.password, dto.code);
  }
}

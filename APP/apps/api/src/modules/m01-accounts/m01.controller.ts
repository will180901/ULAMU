import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OtpPurpose } from "@prisma/client";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor, Public } from "../../common/auth/auth.guard";
import {
  ChangePasswordDto,
  CheckEmailDto,
  CheckPhoneDto,
  CheckUsernameDto,
  CloseAccountDto,
  ConfirmEmailChangeDto,
  ConfirmPhoneChangeDto,
  ConfirmTotpDto,
  DisableEmailTwoFactorDto,
  DisableTotpDto,
  EnableEmailTwoFactorDto,
  LoginDto,
  RegenerateBackupCodesDto,
  RegisterFacilityMemberDto,
  RegisterPatientDto,
  RegisterProfessionalDto,
  RequestOtpDto,
  ResetPasswordDto,
  ResetPasswordTotpDto,
  ResetTotpDto,
  StartEmailChangeDto,
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
    return this.service.requestOtp({ email: dto.email }, dto.purpose as OtpPurpose);
  }

  @Public()
  @Get("accounts/username-available")
  checkUsername(@Query() dto: CheckUsernameDto) {
    return this.service.isUsernameAvailable(dto.username);
  }

  /**
   * Disponibilité de l'email / du téléphone pendant la saisie de l'inscription — évite à l'utilisateur
   * de remplir trois écrans et de recevoir un code pour se heurter à un refus au dernier moment.
   *
   * Débit volontairement plus serré que le reste : ces routes répondent « ce compte existe-t-il ? », ce
   * qui sur une plateforme de santé est une information sensible (cf. commentaire détaillé du service).
   * 30/min laisse passer une frappe normale — la saisie est temporisée côté client — tout en rendant le
   * balayage d'un plan de numérotation ou d'une liste d'adresses inexploitable.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("accounts/email-available")
  checkEmail(@Query() dto: CheckEmailDto) {
    return this.service.isEmailAvailable(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("accounts/phone-available")
  checkPhone(@Query() dto: CheckPhoneDto) {
    return this.service.isPhoneAvailable(dto.phone);
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

  /** Réinitialisation web par TOTP — jamais de SMS pour la récupération côté web (règle à respecter). */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("auth/password-reset/totp")
  @HttpCode(200)
  resetPasswordByTotp(@Body() dto: ResetPasswordTotpDto) {
    return this.service.resetPasswordByTotp(dto);
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

  /**
   * Changement de mot de passe depuis une session ouverte. `sessionId` est passé au service pour
   * qu'il épargne la session courante en fermant les autres.
   */
  @Post("accounts/me/password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(@Actor() actor: AuthenticatedActor, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(actor.accountId, dto.currentPassword, dto.newPassword, actor.sessionId);
  }

  /** Première adresse email du compte, ou remplacement — preuve exigée sur chaque adresse concernée. */
  @Post("accounts/me/email/start")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  startEmailChange(@Actor() actor: AuthenticatedActor, @Body() dto: StartEmailChangeDto) {
    return this.service.startEmailChange(actor.accountId, dto.newEmail);
  }

  @Post("accounts/me/email/confirm")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirmEmailChange(@Actor() actor: AuthenticatedActor, @Body() dto: ConfirmEmailChangeDto) {
    return this.service.confirmEmailChange(actor.accountId, dto.newEmail, dto.newEmailCode, dto.oldEmailCode);
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

  /** Versions des CGU et de la politique acceptées, et quand (EF-01-08 — preuve légale). */
  @Get("accounts/me/consents")
  myConsents(@Actor() actor: AuthenticatedActor) {
    return this.service.myConsents(actor.accountId);
  }

  /** Les trois conditions de clôture, telles que le serveur les appliquera au moment du geste. */
  @Get("accounts/me/close/prerequisites")
  closePrerequisites(@Actor() actor: AuthenticatedActor) {
    return this.service.closePrerequisites(actor.accountId);
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

  /** Nouveau lot de codes de secours — l'ancien lot est détruit, les nouveaux ne s'affichent qu'une fois. */
  @Post("accounts/me/totp/backup-codes")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  regenerateBackupCodes(@Actor() actor: AuthenticatedActor, @Body() dto: RegenerateBackupCodesDto) {
    return this.service.regenerateBackupCodes(actor.accountId, dto.password, dto.code);
  }

  /**
   * Ré-association de l'appareil d'authentification. Renvoie un secret à scanner ; l'écran enchaîne
   * sur `totp/confirm`, comme à la première configuration.
   */
  @Post("accounts/me/totp/reset")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetTotp(@Actor() actor: AuthenticatedActor, @Body() dto: ResetTotpDto) {
    return this.service.resetTotp(actor.accountId, dto.password, dto.code);
  }

  // 2FA par email — la double authentification du mobile (le TOTP ci-dessus reste réservé au web).

  @Post("accounts/me/2fa/email/request")
  @HttpCode(200)
  requestEmailTwoFactorOtp(@Actor() actor: AuthenticatedActor) {
    return this.service.requestEmailTwoFactorOtp(actor.accountId);
  }

  @Post("accounts/me/2fa/email/enable")
  @HttpCode(200)
  enableEmailTwoFactor(@Actor() actor: AuthenticatedActor, @Body() dto: EnableEmailTwoFactorDto) {
    return this.service.enableEmailTwoFactor(actor.accountId, dto.otpCode);
  }

  @Post("accounts/me/2fa/email/disable")
  @HttpCode(200)
  disableEmailTwoFactor(@Actor() actor: AuthenticatedActor, @Body() dto: DisableEmailTwoFactorDto) {
    return this.service.disableEmailTwoFactor(actor.accountId, dto.password);
  }
}

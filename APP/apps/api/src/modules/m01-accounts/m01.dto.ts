import { Equals, IsBoolean, IsEmail, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

/**
 * Consentement explicite aux CGU et à la politique de confidentialité (EF-01-08, loi n° 29-2019).
 *
 * ⚠️ Avant le 2026-08-05, les enregistrements de consentement étaient créés **inconditionnellement**
 * à chaque inscription, sans qu'aucun champ ne dise que l'utilisateur avait accepté. Le modèle de
 * données qualifie pourtant cette entité de « preuve légale, immuable ». Une preuve fabriquée
 * automatiquement, identique que l'utilisateur ait coché ou non — et sur le web il n'était même
 * jamais interrogé — ne prouve rien du tout. Le champ est donc OBLIGATOIRE et doit valoir `true` :
 * une inscription sans acceptation est refusée par la validation, avant d'atteindre le service.
 */
export const ACCEPT_TERMS_MSG =
  "Vous devez accepter les conditions générales et la politique de confidentialité pour créer un compte.";

/** Nom d'utilisateur (D-049) : 3 à 30 caractères, lettres/chiffres/._-, début et fin alphanumériques. */
export const USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,28})[A-Za-z0-9]$/;
export const USERNAME_MSG = "Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)";

/** 2026-07 : OTP inscription/réinitialisation part désormais par EMAIL (plus par SMS — cf. décision :
 * Twilio trial limité à 5 numéros vérifiés, inutilisable en conditions réelles pour la soutenance). */
export class RequestOtpDto {
  @IsEmail() email!: string;
  @IsIn(["REGISTRATION", "PASSWORD_RESET"]) purpose!: "REGISTRATION" | "PASSWORD_RESET";
}

export class CheckUsernameDto {
  @IsString() @IsNotEmpty() username!: string;
}

/** Disponibilité de l'email / du téléphone, vérifiée pendant la saisie de l'inscription.
 * `@IsString` et non `@IsEmail` : le champ est interrogé au fil de la frappe, une adresse encore
 * incomplète doit répondre « indisponible » plutôt que déclencher une erreur 400 à chaque lettre. */
export class CheckEmailDto {
  @IsString() @IsNotEmpty() email!: string;
}

export class CheckPhoneDto {
  @IsString() @IsNotEmpty() phone!: string;
}

export class RegisterPatientDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsISO8601() birthDate!: string;
  @IsIn(["M", "F"]) sex!: "M" | "F";
  @IsString() @IsNotEmpty() @MaxLength(80) district!: string;
  @IsBoolean() @Equals(true, { message: ACCEPT_TERMS_MSG }) acceptTerms!: boolean;
  @IsIn(["mobile", "web"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

export class RegisterProfessionalDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsIn(["GENERAL_PRACTITIONER", "SPECIALIST", "DENTIST", "MIDWIFE", "NURSE", "COMMUNITY_HEALTH_WORKER"])
  category!: "GENERAL_PRACTITIONER" | "SPECIALIST" | "DENTIST" | "MIDWIFE" | "NURSE" | "COMMUNITY_HEALTH_WORKER";
  @IsOptional() @IsString() @MaxLength(120) specialty?: string;
  @IsBoolean() @Equals(true, { message: ACCEPT_TERMS_MSG }) acceptTerms!: boolean;
  @IsIn(["mobile", "web"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

/** Compte membre de structure (D-003/D-045) — futur titulaire ou invité (CU-02-02). */
export class RegisterFacilityMemberDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsBoolean() @Equals(true, { message: ACCEPT_TERMS_MSG }) acceptTerms!: boolean;
  @IsIn(["mobile", "web"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

/** `username` accepte un nom d'utilisateur OU une adresse email (2026-07) — le service détecte lequel. */
export class LoginDto {
  @IsString() @MinLength(3) @MaxLength(254) username!: string;
  @IsString() @IsNotEmpty() password!: string;
  @IsIn(["mobile", "web"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
  @IsOptional() @IsString() @Length(6, 10) totpCode?: string;
  /** 2FA par email (mobile) — code reçu après la 1re tentative, cf. { otpRequired } dans la réponse. */
  @IsOptional() @IsString() @Length(6, 6) otpCode?: string;
}

/** Activation de la 2FA par email (mobile) — confirme le code reçu à l'adresse du compte. */
export class EnableEmailTwoFactorDto {
  @IsString() @Length(6, 6) otpCode!: string;
}

/** Désactivation de la 2FA par email — mot de passe exigé (on retire une protection). */
export class DisableEmailTwoFactorDto {
  @IsString() @IsNotEmpty() password!: string;
}

export class ResetPasswordDto {
  @IsEmail() email!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) newPassword!: string;
}

/** Réinitialisation par TOTP (web uniquement — RG-WEB-01 : jamais de SMS pour la récupération web). */
export class ResetPasswordTotpDto {
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 10) code!: string;
  @IsString() @Length(8, 128) newPassword!: string;
}

export class StartPhoneChangeDto {
  @IsString() @IsNotEmpty() newPhone!: string;
}

export class ConfirmPhoneChangeDto {
  @IsString() @IsNotEmpty() newPhone!: string;
  @IsString() @Length(6, 6) oldPhoneCode!: string;
  @IsString() @Length(6, 6) newPhoneCode!: string;
}

export class CloseAccountDto {
  @IsString() @IsNotEmpty() password!: string;
  @IsString() @Length(6, 6) otpCode!: string;
}

/** Mise à jour du profil patient (CRUD compte) — tous champs optionnels. */
export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) lastName?: string;
  @IsOptional() @IsISO8601() birthDate?: string;
  @IsOptional() @IsIn(["M", "F"]) sex?: "M" | "F";
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) district?: string;
}

/** Photo de profil — image encodée en base64 (le client peut préfixer un data-URI). */
export class UpdateAvatarDto {
  @IsString() @IsNotEmpty() @MaxLength(12_000_000) imageBase64!: string;
  @IsIn(["image/jpeg", "image/jpg", "image/png", "image/webp"], { message: "Image JPEG, PNG ou WebP attendue" }) mime!: string;
}

export class ConfirmTotpDto {
  @IsString() @Length(6, 6) code!: string;
}

export class DisableTotpDto {
  @IsString() @IsNotEmpty() password!: string;
  @IsString() @Length(6, 10) code!: string;
}

// ── « Mes paramètres » (B3) — gestes du compte depuis une session déjà ouverte ────────────────────

/**
 * Changement de mot de passe par quelqu'un qui est DÉJÀ connecté.
 *
 * À ne pas confondre avec `ResetPasswordDto` : là, l'utilisateur a perdu son accès et prouve son
 * identité par un code reçu. Ici il l'a encore, et prouve simplement que c'est bien lui devant le
 * clavier — sur un poste partagé, une session laissée ouverte ne doit pas suffire à voler le compte.
 */
export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword!: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword!: string;
}

/** Nouveau lot de codes de secours : mot de passe + un facteur (code TOTP courant OU code de secours). */
export class RegenerateBackupCodesDto {
  @IsString() @IsNotEmpty() password!: string;
  @IsString() @Length(6, 10) code!: string;
}

/**
 * Ré-association de l'appareil d'authentification (téléphone perdu, changé, réinitialisé).
 *
 * `code` accepte un code TOTP courant **ou un code de secours** : c'est précisément quand l'appareil
 * n'est plus lisible qu'on a besoin de ce geste, et exiger un code TOTP reviendrait à réserver la
 * réparation à ceux qui n'en ont pas besoin.
 */
export class ResetTotpDto {
  @IsString() @IsNotEmpty() password!: string;
  @IsString() @Length(6, 10) code!: string;
}

/** Première adresse email d'un compte, ou remplacement de celle en place. */
export class StartEmailChangeDto {
  @IsEmail({}, { message: "Adresse email invalide" }) @MaxLength(160) newEmail!: string;
}

export class ConfirmEmailChangeDto {
  @IsEmail({}, { message: "Adresse email invalide" }) @MaxLength(160) newEmail!: string;
  /** Code reçu à la NOUVELLE adresse — prouve qu'elle est relevée par l'utilisateur. */
  @IsString() @Length(6, 6) newEmailCode!: string;
  /** Code reçu à l'ANCIENNE adresse. Absent quand le compte n'en avait pas encore. */
  @IsOptional() @IsString() @Length(6, 6) oldEmailCode?: string;
}

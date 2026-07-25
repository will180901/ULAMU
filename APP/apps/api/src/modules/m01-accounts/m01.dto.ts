import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

/** Nom d'utilisateur (D-049) : 3 à 30 caractères, lettres/chiffres/._-, début et fin alphanumériques. */
export const USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,28})[A-Za-z0-9]$/;
export const USERNAME_MSG = "Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)";

export class RequestOtpDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsIn(["REGISTRATION", "PASSWORD_RESET"]) purpose!: "REGISTRATION" | "PASSWORD_RESET";
}

export class CheckUsernameDto {
  @IsString() @IsNotEmpty() username!: string;
}

export class RegisterPatientDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsISO8601() birthDate!: string;
  @IsIn(["M", "F"]) sex!: "M" | "F";
  @IsString() @IsNotEmpty() @MaxLength(80) district!: string;
  @IsIn(["mobile", "desktop"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

export class RegisterProfessionalDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsIn(["GENERAL_PRACTITIONER", "SPECIALIST", "DENTIST", "MIDWIFE", "NURSE", "COMMUNITY_HEALTH_WORKER"])
  category!: "GENERAL_PRACTITIONER" | "SPECIALIST" | "DENTIST" | "MIDWIFE" | "NURSE" | "COMMUNITY_HEALTH_WORKER";
  @IsOptional() @IsString() @MaxLength(120) specialty?: string;
  @IsIn(["mobile", "desktop"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

/** Compte membre de structure (D-003/D-045) — futur titulaire ou invité (CU-02-02). */
export class RegisterFacilityMemberDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(6, 6) otpCode!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsIn(["mobile", "desktop"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

export class LoginDto {
  @IsString() @MinLength(3) @MaxLength(30) username!: string;
  @IsString() @IsNotEmpty() password!: string;
  @IsIn(["mobile", "desktop"]) client!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
  @IsOptional() @IsString() @Length(6, 10) totpCode?: string;
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @Length(6, 6) otpCode!: string;
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

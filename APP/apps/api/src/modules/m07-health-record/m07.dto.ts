import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from "class-validator";
import { PATIENT_DECLARABLE_TYPES, PatientDeclarableType, RECORD_ENTRY_TYPES, RecordEntryTypeCode } from "./m07.policies";

/**
 * Portée « me » : par défaut le Carnet du patient connecté ; avec subProfileId, le Carnet
 * d'une personne à charge — accessible au TUTEUR uniquement (EF-07-09, RM-07-06).
 */
export class OwnerScopeQueryDto {
  @IsOptional() @IsUUID(undefined, { message: "Identifiant de sous-profil invalide" }) subProfileId?: string;
}

/** Déclaration patient (EF-07-06, CU-07-02) — types déclarables uniquement. */
export class DeclareEntryDto {
  @IsIn([...PATIENT_DECLARABLE_TYPES], {
    message: "Type non déclarable par le patient : ALLERGY, MEDICAL_HISTORY, VACCINATION ou PERSONAL_NOTE attendu (EF-07-06)",
  })
  type!: PatientDeclarableType;

  /** Contenu structuré libre (libellé d'allergie, antécédent…) — jamais relayé dans l'audit ni les notifications. */
  @IsObject({ message: "Le contenu de l'entrée doit être un objet JSON" })
  payload!: Record<string, unknown>;

  /** Correction (RM-07-02) : identifiant de l'entrée remplacée — même Carnet, même type. */
  @IsOptional() @IsUUID(undefined, { message: "Identifiant d'entrée remplacée invalide" }) supersedesId?: string;
}

/** Chronologie filtrable et paginée (EF-07-03). */
export class RecordQueryDto {
  @IsOptional()
  @IsIn([...RECORD_ENTRY_TYPES], { message: "Type d'entrée inconnu (EF-07-02)" })
  type?: RecordEntryTypeCode;

  @IsOptional() @IsUUID(undefined, { message: "Curseur de pagination invalide" }) cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La taille de page doit être un entier" })
  @Min(1, { message: "La taille de page doit être au moins 1" })
  limit?: number;

  @IsOptional() @IsUUID(undefined, { message: "Identifiant de sous-profil invalide" }) subProfileId?: string;
}

/** Création d'un sous-profil « personne à charge » (EF-07-09, D-033, CU-07-04). */
export class CreateSubProfileDto {
  @IsString() @IsNotEmpty({ message: "Prénom requis" }) @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty({ message: "Nom requis" }) @MaxLength(80) lastName!: string;
  @IsISO8601({}, { message: "Date de naissance invalide (format ISO 8601 attendu)" }) birthDate!: string;
  @IsIn(["M", "F"], { message: "Sexe : M ou F attendu" }) sex!: "M" | "F";
}

/** Revendication du Carnet à la majorité (CU-07-05) — confirmée par l'OTP du tuteur. */
export class ClaimSubProfileDto {
  @IsUUID(undefined, { message: "Identifiant d'intention de transfert invalide" }) intentId!: string;
  @IsString() @Length(6, 6, { message: "Code OTP à 6 chiffres requis" }) otpCode!: string;
}

/**
 * Revendication par le seul CODE DICTABLE (dette n°26) — le chemin utilisable quand le tuteur et le
 * majeur sont dans la même pièce.
 *
 * La longueur n'est pas contrainte ici : `normalizeClaimCode` accepte les tirets, les espaces et les
 * minuscules avant de juger. Valider la forme brute rejetterait « abcd-efgh », qui est pourtant
 * exactement ce qu'on aura écrit sous la dictée.
 */
export class ClaimByCodeDto {
  @IsString() @IsNotEmpty({ message: "Code de transfert requis" }) @MaxLength(32) code!: string;
  @IsString() @Length(6, 6, { message: "Code OTP à 6 chiffres requis" }) otpCode!: string;
}

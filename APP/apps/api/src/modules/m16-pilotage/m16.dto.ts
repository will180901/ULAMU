/**
 * M16 — DTO d'entrée (class-validator). RM-16-03 : tout pouvoir laisse une trace —
 * le MOTIF est obligatoire sur chaque action d'administration (suspension, ban, strike,
 * paramètre, procédure support).
 */
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** Recherche de comptes (EF-16-03) — par téléphone OU nom, jamais de donnée médicale. */
export class SearchAccountsQueryDto {
  @IsString() @IsNotEmpty({ message: "Terme de recherche requis" }) @MaxLength(120) query!: string;
}

/** Action motivée générique (suspension, réactivation, demande de ban). */
export class MotiveDto {
  @IsString() @IsNotEmpty({ message: "Motif obligatoire (RM-16-03)" }) @MinLength(3) @MaxLength(2000) reason!: string;
}

/** Arbitrage d'un strike de fiabilité (EF-12-07, CU via M16) : maintenu ou levé. */
export class ResolveStrikeDto {
  /** true = strike maintenu (ACTIVE) ; false = strike levé (CANCELLED). */
  @IsBoolean() uphold!: boolean;
  @IsString() @IsNotEmpty({ message: "Motif obligatoire (RM-16-03)" }) @MinLength(3) @MaxLength(2000) reason!: string;
}

/** Modification d'un paramètre plateforme (EF-16-04, Super Admin) : valeur + date d'effet + motif. */
export class UpdateParameterDto {
  /** Nouvelle valeur (texte — le référentiel PM-xx stocke en chaîne, ex. "600"). */
  @IsString() @IsNotEmpty({ message: "Nouvelle valeur requise" }) @MaxLength(500) value!: string;
  /** Date d'effet ISO-8601 : les modules servent la valeur à compter de cette date (CU-16-02). */
  @IsISO8601({}, { message: "Date d'effet au format ISO-8601 attendue" }) effectiveAt!: string;
  @IsString() @IsNotEmpty({ message: "Motif obligatoire (RM-16-03)" }) @MinLength(3) @MaxLength(2000) reason!: string;
}

/** Types de procédure support (alignés sur l'enum Prisma SupportProcedureType). */
export const SUPPORT_PROCEDURE_TYPES = ["PHONE_CHANGE", "OWNER_UNREACHABLE", "RECORD_TRANSFER", "OTHER"] as const;
export type SupportProcedureTypeCode = (typeof SUPPORT_PROCEDURE_TYPES)[number];

/** Une étape guidée et horodatée d'une procédure support (CU-16-04). */
export class SupportStepDto {
  @IsString() @IsNotEmpty({ message: "Libellé d'étape requis" }) @MaxLength(500) label!: string;
  /** Note libre de l'exécutant — jamais de contenu médical (RM-16-02). */
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

/** Ouverture d'une procédure support (EF-16-03, CU-16-04). */
export class OpenSupportProcedureDto {
  @IsIn(SUPPORT_PROCEDURE_TYPES) type!: SupportProcedureTypeCode;
  /** Compte concerné (facultatif selon le type de procédure). */
  @IsOptional() @IsUUID() accountId?: string;
  @IsString() @IsNotEmpty({ message: "Justification obligatoire (RM-16-03)" }) @MinLength(3) @MaxLength(2000) justification!: string;
  @IsArray() @Type(() => SupportStepDto) steps!: SupportStepDto[];
}

/** Avancement / clôture d'une procédure support : nouvelles étapes franchies. */
export class CompleteSupportProcedureDto {
  @IsArray() @Type(() => SupportStepDto) steps!: SupportStepDto[];
}

/**
 * Écrire à l'administration (01/09/2026, dette 8quater).
 *
 * `subject` reprend les catégories de `SupportProcedureType` : la demande désigne ainsi directement
 * la procédure guidée qui la traitera. 2000 caractères, comme les motifs d'administration — au-delà
 * personne ne lit, et une demande qu'on ne lit pas ne sert à rien.
 */
export class CreateSupportRequestDto {
  @IsIn(SUPPORT_PROCEDURE_TYPES) subject!: SupportProcedureTypeCode;
  @IsString() @IsNotEmpty({ message: "Décrivez votre demande" }) @MinLength(10, { message: "Décrivez votre demande en quelques mots (10 caractères minimum)" }) @MaxLength(2000) body!: string;
}

/** La réponse de l'administration — elle se lit dans l'application, jamais dans un courriel. */
export class AnswerSupportRequestDto {
  @IsString() @IsNotEmpty({ message: "Une réponse vide n'en est pas une" }) @MinLength(3) @MaxLength(4000) answer!: string;
}

/** Filtre de la file des demandes de support. */
export class ListSupportRequestsQueryDto {
  @IsOptional() @IsIn(["OPEN", "ANSWERED"] as const) status?: "OPEN" | "ANSWERED";
}

/** Annulation motivée d'une procédure support. */
export class CancelSupportProcedureDto {
  @IsString() @IsNotEmpty({ message: "Motif obligatoire (RM-16-03)" }) @MinLength(3) @MaxLength(2000) reason!: string;
}

/** Filtre de la liste des procédures support. */
export class ListSupportProceduresQueryDto {
  @IsOptional() @IsIn(SUPPORT_PROCEDURE_TYPES) type?: SupportProcedureTypeCode;
  @IsOptional() @IsIn(["OPEN", "COMPLETED", "CANCELLED"]) status?: "OPEN" | "COMPLETED" | "CANCELLED";
}

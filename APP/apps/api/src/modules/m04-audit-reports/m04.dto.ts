/**
 * M04 — DTO des routes audit & signalements (validation côté serveur, menaces §4.2).
 * Les paramètres de requête vides ("actorId=") sont traités comme absents.
 */
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import {
  AUDIT_QUERY_MAX_PAGE_SIZE,
  INTEGRITY_CHECK_MAX_EVENTS,
  REPORT_DECISIONS,
  REPORT_REASON_CODES,
  REPORT_TARGET_TYPES,
  ReportDecision,
  ReportReasonCode,
  ReportTargetTypeCode,
} from "./m04.policies";

/** "" → undefined : un paramètre de requête vide vaut absence de filtre. */
const emptyToUndefined = ({ value }: { value: unknown }): unknown => (value === "" ? undefined : value);
/** "" → undefined, sinon conversion numérique (les query params arrivent en string). */
const emptyToUndefinedNumber = ({ value }: { value: unknown }): unknown =>
  value === "" || value === undefined || value === null ? undefined : Number(value);

// ── Signalements (EF-04-05) ──────────────────────────────────────────────────

export class CreateReportDto {
  @IsIn(REPORT_TARGET_TYPES) targetType!: ReportTargetTypeCode;
  @IsString() @IsNotEmpty() @MaxLength(64) targetId!: string;
  /** Liste fermée de motifs (EF-04-05) — le texte libre passe par reasonText. */
  @IsIn(REPORT_REASON_CODES) reasonCode!: ReportReasonCode;
  @IsOptional() @IsString() @MaxLength(1000) reasonText?: string;
}

// ── Consultation du journal (EF-04-04) ───────────────────────────────────────

export class QueryAuditDto {
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(64) actorId?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(120) action?: string;
  /** Filtre « ressource » (EF-04-04) : ex. "account:uuid", "case:uuid". */
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(120) resource?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsISO8601() from?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsISO8601() to?: string;
  /** Curseur de pagination = seq (BigInt) du dernier élément reçu, en chiffres. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d+$/, { message: "cursor doit être un entier (seq)" })
  cursor?: string;

  @Transform(emptyToUndefinedNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(AUDIT_QUERY_MAX_PAGE_SIZE)
  limit?: number;
}

// ── Intégrité (EF-04-02) ─────────────────────────────────────────────────────

export class IntegrityQueryDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d+$/, { message: "fromSeq doit être un entier (seq)" })
  fromSeq?: string;

  @Transform(emptyToUndefinedNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(INTEGRITY_CHECK_MAX_EVENTS)
  limit?: number;
}

// ── File de modération (EF-04-06) ────────────────────────────────────────────

export class ListReportsQueryDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(["OPEN", "IN_REVIEW", "DISMISSED", "ACTION_TAKEN"])
  status?: "OPEN" | "IN_REVIEW" | "DISMISSED" | "ACTION_TAKEN";

  @Transform(emptyToUndefinedNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(AUDIT_QUERY_MAX_PAGE_SIZE)
  limit?: number;
}

export class DecideReportDto {
  /** Issues possibles (EF-04-06) : rejet motivé, avertissement, transmission M16/M03. */
  @IsIn(REPORT_DECISIONS) decision!: ReportDecision;
  /** Décision motivée, toujours (CU-04-04). */
  @IsString() @IsNotEmpty() @MaxLength(2000) reasons!: string;
}

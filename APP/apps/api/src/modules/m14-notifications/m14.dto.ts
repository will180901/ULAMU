/**
 * M14 — DTO des routes notifications (validation côté serveur, menaces §4.2).
 * Les paramètres de requête vides ("cursor=") sont traités comme absents.
 */
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { NOTIFICATION_PAGE_MAX } from "./m14.policies";
import { NOTIFICATION_CATEGORIES, NotificationCategory } from "./m14.templates";

/** "" → undefined : un paramètre de requête vide vaut absence. */
const emptyToUndefined = ({ value }: { value: unknown }): unknown => (value === "" ? undefined : value);
/** "" → undefined, sinon conversion numérique (les query params arrivent en string). */
const emptyToUndefinedNumber = ({ value }: { value: unknown }): unknown =>
  value === "" || value === undefined || value === null ? undefined : Number(value);

// ── Centre in-app (EF-14-07) ─────────────────────────────────────────────────

export class ListNotificationsQueryDto {
  /** Curseur = id de la dernière notification reçue (pagination du plus récent au plus ancien). */
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(64) cursor?: string;

  @Transform(emptyToUndefinedNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(NOTIFICATION_PAGE_MAX)
  limit?: number;
}

// ── Préférences (EF-14-04) ───────────────────────────────────────────────────

export class UpdatePreferenceDto {
  /** Les 5 catégories du catalogue — "critical" est refusée par le service (RM-14-02). */
  @IsIn(NOTIFICATION_CATEGORIES) category!: NotificationCategory;
  @IsBoolean() enabled!: boolean;
}

/** Suppression groupée de notifications (centre in-app) — uniquement les SIENNES (cloisonnement). */
export class DeleteNotificationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(NOTIFICATION_PAGE_MAX)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  ids!: string[];
}

// ── Appareils push (EF-14-02) ────────────────────────────────────────────────

export class RegisterDeviceDto {
  /** Jeton FCM/APNs de l'appareil. */
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
  @IsIn(["android", "ios"], { message: "Plateforme inconnue : android ou ios attendu" }) platform!: string;
}

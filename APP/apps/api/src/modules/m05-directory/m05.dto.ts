/**
 * M05 — DTO des routes Annuaire. La validation de FORME vit ici ; les chiffres
 * MÉTIER (bornes PM-09, plancher PM-06, plafond PM-25) sont vérifiés côté service
 * via ParamsService — jamais en dur dans les décorateurs (RT §3).
 */
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  DIRECTORY_SORTS,
  DirectorySortCode,
  OFFER_KINDS,
  OfferKindCode,
  PRESENCE_STATES,
  PresenceStateCode,
  PROFESSIONAL_CATEGORIES,
  ProfessionalCategoryCode,
} from "./m05.policies";

// ── Offres (EF-05-02 ; CU-05-03) ─────────────────────────────────────────────

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty({ message: "Libellé de l'offre requis" })
  @MaxLength(120, { message: "Libellé trop long : 120 caractères maximum" })
  label!: string;

  /** Durée en minutes — bornes PM-09 vérifiées côté service. */
  @Type(() => Number)
  @IsInt({ message: "La durée doit être un nombre entier de minutes" })
  @Min(1, { message: "La durée doit être strictement positive" })
  durationMin!: number;

  /** Prix FINAL patient en XAF, commission incluse (D-010, RM-05-03) — plancher PM-06 vérifié côté service. */
  @Type(() => Number)
  @IsInt({ message: "Le prix doit être un nombre entier de XAF" })
  @Min(1, { message: "Le prix doit être strictement positif" })
  priceXaf!: number;

  @IsOptional()
  @IsIn([...OFFER_KINDS], { message: "Type d'offre inconnu : STANDARD ou FOLLOW_UP attendu" })
  kind?: OfferKindCode;
}

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Libellé de l'offre requis" })
  @MaxLength(120, { message: "Libellé trop long : 120 caractères maximum" })
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La durée doit être un nombre entier de minutes" })
  @Min(1, { message: "La durée doit être strictement positive" })
  durationMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Le prix doit être un nombre entier de XAF" })
  @Min(1, { message: "Le prix doit être strictement positif" })
  priceXaf?: number;

  @IsOptional()
  @IsIn([...OFFER_KINDS], { message: "Type d'offre inconnu : STANDARD ou FOLLOW_UP attendu" })
  kind?: OfferKindCode;

  /** Activation/désactivation (EF-05-02) — la RÉACTIVATION repasse par le plafond PM-25 et D-029. */
  @IsOptional()
  @IsBoolean({ message: "active doit être un booléen" })
  active?: boolean;
}

// ── Présence (EF-05-05 ; CU-05-04) ───────────────────────────────────────────

export class SetPresenceStateDto {
  @IsIn([...PRESENCE_STATES], { message: "État de présence inconnu : ONLINE, DO_NOT_DISTURB ou OFFLINE attendu" })
  state!: PresenceStateCode;
}

// ── Vitrine publique (EF-05-03/04 ; CU-05-01) ────────────────────────────────

export class DirectoryQueryDto {
  @IsOptional()
  @IsIn([...PROFESSIONAL_CATEGORIES], { message: "Catégorie de professionnel inconnue" })
  category?: ProfessionalCategoryCode;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: "Spécialité : 80 caractères maximum" })
  specialty?: string;

  /** Prix maximum de l'offre la moins chère (XAF). */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Prix maximum : entier de XAF attendu" })
  @Min(0, { message: "Prix maximum : valeur positive attendue" })
  maxPrice?: number;

  /** Note moyenne minimum (échelle PM-13). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Note minimum : nombre attendu" })
  @Min(0, { message: "Note minimum : valeur positive attendue" })
  minRating?: number;

  /** « Disponible maintenant » (EF-05-03) — true seul est filtrant. */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === "true" || value === "1"))
  @IsBoolean()
  availableNow?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: "Arrondissement : 80 caractères maximum" })
  district?: string;

  @IsOptional()
  @IsIn([...DIRECTORY_SORTS], { message: "Tri inconnu : relevance, price, rating ou reactivity attendu" })
  sort?: DirectorySortCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Page : entier attendu" })
  @Min(1, { message: "Page : 1 au minimum" })
  page?: number;

  /** Taille de page — bornée côté service (clampPageSize). */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Taille de page : entier attendu" })
  @Min(1, { message: "Taille de page : 1 au minimum" })
  pageSize?: number;
}

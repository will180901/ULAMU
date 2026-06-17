/**
 * M12 — DTO des routes Recherche & Dévoilement. La validation de FORME vit ici ; les chiffres
 * MÉTIER (PM-03 prix, PM-08 durée) sont lus côté service via ParamsService — jamais en dur dans
 * les décorateurs (RT §3). Aucune identité de structure n'apparaît jamais en entrée (D-009).
 */
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { MOMO_OPERATORS, MomoOperatorCode } from "../m13-payments/m13.policies";

// ── Item de recherche (un médicament référencé + quantité voulue) ────────────

export class SearchItemDto {
  /** Médicament du référentiel M11 — la recherche s'appuie sur le référentiel (EF-09-02). */
  @IsUUID(undefined, { message: "Identifiant de médicament invalide" })
  medicamentId!: string;

  /** Quantité voulue (entier strictement positif). */
  @Type(() => Number)
  @IsInt({ message: "Quantité : entier attendu" })
  @Min(1, { message: "Quantité : 1 au minimum" })
  quantity!: number;
}

// ── Référentiel médicaments (EF-09-02) ───────────────────────────────────────

export class CatalogQueryDto {
  @IsString()
  @IsNotEmpty({ message: "Terme de recherche requis" })
  @MaxLength(80, { message: "Terme trop long : 80 caractères maximum" })
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limite : entier attendu" })
  @Min(1, { message: "Limite : 1 au minimum" })
  limit?: number;
}

// ── Recherche gratuite et illimitée (EF-12-01/02 ; CU-12-01) ─────────────────

export class SearchDto {
  /** Arrondissement ciblé — absent = tous les arrondissements (résultat agrégé par district). */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Arrondissement vide" })
  @MaxLength(120, { message: "Arrondissement trop long" })
  district?: string;

  /** Produits recherchés (au moins un, plafonné pour éviter les requêtes abusives). */
  @IsArray({ message: "Produits : liste attendue" })
  @ArrayMinSize(1, { message: "Indiquez au moins un produit à rechercher" })
  @ArrayMaxSize(50, { message: "Recherche : 50 produits maximum" })
  @ValidateNested({ each: true })
  @Type(() => SearchItemDto)
  items!: SearchItemDto[];
}

// ── Cloche « me prévenir si disponible » (EF-12-06, CU-12-01) ────────────────

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty({ message: "Arrondissement requis pour poser une alerte" })
  @MaxLength(120, { message: "Arrondissement trop long" })
  district!: string;

  /** Médicaments suivis par la cloche (au moins un). */
  @IsArray({ message: "Produits : liste attendue" })
  @ArrayMinSize(1, { message: "Indiquez au moins un produit à surveiller" })
  @ArrayMaxSize(50, { message: "Alerte : 50 produits maximum" })
  @IsUUID(undefined, { each: true, message: "Identifiant de médicament invalide" })
  medicamentIds!: string[];
}

// ── Dévoilement payé (EF-12-03 ; CU-12-02) ───────────────────────────────────

export class RequestDisclosureDto {
  /** Arrondissement choisi : le dévoilement révèle UNE pharmacie de cet arrondissement (EF-12-03). */
  @IsString()
  @IsNotEmpty({ message: "Arrondissement requis pour un dévoilement" })
  @MaxLength(120, { message: "Arrondissement trop long" })
  district!: string;

  @IsArray({ message: "Produits : liste attendue" })
  @ArrayMinSize(1, { message: "Indiquez au moins un produit à dévoiler" })
  @ArrayMaxSize(50, { message: "Dévoilement : 50 produits maximum" })
  @ValidateNested({ each: true })
  @Type(() => SearchItemDto)
  items!: SearchItemDto[];

  /** Opérateur Mobile Money EXPLICITE — jamais déduit du préfixe téléphone (M13). */
  @IsIn([...MOMO_OPERATORS], { message: "Opérateur Mobile Money inconnu : MTN_MOMO ou AIRTEL_MONEY attendu" })
  operator!: MomoOperatorCode;
}

// ── Dévoilement par ordonnance (EF-12-01 ; CU-12-01) ─────────────────────────

export class SearchByPrescriptionDto {
  /** Ordonnance ACTIVE du patient (M09) — ses lignes restantes deviennent les items recherchés. */
  @IsUUID(undefined, { message: "Identifiant d'ordonnance invalide" })
  prescriptionId!: string;

  /** Restreindre la recherche à un arrondissement (sinon agrégat tous arrondissements). */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Arrondissement vide" })
  @MaxLength(120, { message: "Arrondissement trop long" })
  district?: string;
}

// ── Contestation d'un strike (côté pharmacie, EF-12-07) ──────────────────────

export class ContestStrikeDto {
  /** Motif court de la contestation (arbitrage M16) — jamais de contenu médical (RM-04-03). */
  @IsString()
  @IsNotEmpty({ message: "Motif de contestation requis" })
  @MaxLength(500, { message: "Motif : 500 caractères maximum" })
  reason!: string;
}

// ── Historique (EF-12-09) ─────────────────────────────────────────────────────

export class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Taille de page : entier attendu" })
  @Min(1, { message: "Taille de page : 1 au minimum" })
  limit?: number;
}

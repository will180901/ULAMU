import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * Toutes les routes de gestion ciblent une pharmacie précise (facilityId) — le droit « stock »
 * sur CETTE pharmacie est vérifié serveur (M02). RM-11-05 : un membre ne voit jamais le stock
 * d'une autre pharmacie. Les chiffres saisis sont des données pharmacie, pas des chiffres métier.
 */

/** Approvisionnement / entrée (EF-11-02). */
export class StockEntryDto {
  @IsUUID(undefined, { message: "Médicament invalide" }) medicamentId!: string;
  @IsString() @IsNotEmpty({ message: "Code de lot requis" }) @MaxLength(64) lotCode!: string;
  @IsInt({ message: "Quantité entière requise" }) @Min(1, { message: "Quantité d'entrée strictement positive" }) quantity!: number;
  @IsISO8601({}, { message: "Date de péremption invalide (ISO 8601)" }) expiryDate!: string;
  @IsInt({ message: "Prix de vente entier (XAF) requis" }) @Min(0, { message: "Prix de vente positif ou nul" }) priceXaf!: number;
  @IsOptional() @IsString() @MaxLength(120) supplier?: string;
}

/** Sortie manuelle motivée (EF-11-03) — motif OBLIGATOIRE. */
export class StockExitDto {
  @IsUUID(undefined, { message: "Médicament invalide" }) medicamentId!: string;
  @IsString() @IsNotEmpty({ message: "Code de lot requis" }) @MaxLength(64) lotCode!: string;
  @IsInt({ message: "Quantité entière requise" }) @Min(1, { message: "Quantité de sortie strictement positive" }) quantity!: number;
  @IsString() @IsNotEmpty({ message: "Motif obligatoire pour une sortie (EF-11-03)" }) @MaxLength(200) reason!: string;
}

/** Correction d'inventaire vers une quantité cible (EF-11-09). */
export class StockCorrectionDto {
  @IsUUID(undefined, { message: "Médicament invalide" }) medicamentId!: string;
  @IsString() @IsNotEmpty({ message: "Code de lot requis" }) @MaxLength(64) lotCode!: string;
  @IsInt({ message: "Quantité cible entière requise" }) @Min(0, { message: "Quantité cible positive ou nulle" }) targetQuantity!: number;
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

/** Seuil de stock faible par produit (EF-11-05). */
export class SetThresholdDto {
  @IsUUID(undefined, { message: "Médicament invalide" }) medicamentId!: string;
  @IsInt({ message: "Seuil entier requis" }) @Min(0, { message: "Seuil positif ou nul" }) lowStock!: number;
}

/** Pagination du journal des mouvements (EF-11-06). */
export class MovementsQueryDto {
  @IsOptional() @IsUUID(undefined, { message: "Médicament invalide" }) medicamentId?: string;
  @IsOptional() @IsString() @MaxLength(64) lotCode?: string;
  @IsOptional() @IsUUID(undefined, { message: "Curseur de pagination invalide" }) cursor?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La taille de page doit être un entier" })
  @Min(1, { message: "La taille de page doit être au moins 1" })
  limit?: number;
}

/** Une ligne d'import CSV déjà parsée (EF-11-10). */
export class ImportLineDto {
  @IsUUID(undefined, { message: "Médicament invalide" }) medicamentId!: string;
  @IsString() @IsNotEmpty({ message: "Code de lot requis" }) @MaxLength(64) lotCode!: string;
  @IsInt({ message: "Quantité entière requise" }) @Min(1, { message: "Quantité strictement positive" }) quantity!: number;
  @IsISO8601({}, { message: "Date de péremption invalide (ISO 8601)" }) expiryDate!: string;
  @IsInt({ message: "Prix de vente entier (XAF) requis" }) @Min(0, { message: "Prix de vente positif ou nul" }) priceXaf!: number;
}

/** Import initial guidé (EF-11-10) : on rapproche, on valide, on n'applique qu'après. */
export class ImportCsvDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Au moins une ligne à importer" })
  @ArrayMaxSize(2000, { message: "Import limité à 2000 lignes par lot" })
  @ValidateNested({ each: true })
  @Type(() => ImportLineDto)
  lines!: ImportLineDto[];

  /** false = validation/rapprochement seulement (rien n'est publié, CU-11-06) ; true = applique. */
  @IsOptional() @IsBoolean({ message: "apply doit être un booléen" }) apply?: boolean;
}

/**
 * M09 — DTO des routes Ordonnance & Délivrance. La validation de FORME vit ici ; les chiffres
 * MÉTIER (PM-10) sont vérifiés côté service via ParamsService — jamais en dur (RT §3).
 * Une ligne est référentielle (medicamentId) OU hors référentiel (freeText) : l'exclusivité
 * et la cohérence (qtyPrescribed > 0) sont contrôlées côté service (EF-09-02).
 */
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

// ── Création en session (EF-09-01/02/03/04 ; CU-09-01) ───────────────────────

/** Une ligne de prescription : médicament du référentiel OU texte libre hors référentiel. */
export class PrescriptionLineDto {
  /** Médicament du référentiel (EF-09-02) — exclusif avec freeText (vérifié côté service). */
  @IsOptional()
  @IsUUID(undefined, { message: "Médicament invalide" })
  medicamentId?: string;

  /** Ligne hors référentiel (EF-09-02) : texte libre, SANS garde-fou automatique. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Le texte libre d'une ligne hors référentiel ne peut être vide" })
  @MaxLength(300, { message: "Texte libre : 300 caractères maximum" })
  freeText?: string;

  @IsString()
  @IsNotEmpty({ message: "Posologie requise (EF-09-02)" })
  @MaxLength(300, { message: "Posologie : 300 caractères maximum" })
  posology!: string;

  /** Durée en jours (optionnelle : certaines lignes sont « jusqu'à épuisement »). */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Durée : entier de jours attendu" })
  @Min(1, { message: "Durée : au moins un jour" })
  durationDays?: number;

  /** Quantité prescrite — bornes vérifiées côté service (entier strictement positif). */
  @Type(() => Number)
  @IsInt({ message: "Quantité : entier attendu" })
  @Min(1, { message: "Quantité prescrite strictement positive (EF-09-02)" })
  qtyPrescribed!: number;
}

/** Passage outre une alerte allergie, motivé (EF-09-03) — « garde-fou, pas verrou ». */
export class AllergyOverrideDto {
  /** Médicament concerné par le passage outre (doit être une ligne référentielle de l'ordonnance). */
  @IsUUID(undefined, { message: "Médicament invalide" })
  medicamentId!: string;

  @IsString()
  @IsNotEmpty({ message: "Motif explicite requis pour passer outre une alerte allergie (EF-09-03)" })
  @MaxLength(500, { message: "Motif : 500 caractères maximum" })
  reason!: string;
}

export class CreatePrescriptionDto {
  @IsArray({ message: "Lignes de prescription : liste attendue" })
  @ArrayMinSize(1, { message: "Au moins une ligne de prescription" })
  @ArrayMaxSize(50, { message: "Ordonnance limitée à 50 lignes" })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionLineDto)
  lines!: PrescriptionLineDto[];

  /** Confirmations motivées de passage outre du garde-fou allergies (EF-09-03). */
  @IsOptional()
  @IsArray({ message: "Passages outre : liste attendue" })
  @ArrayMaxSize(50, { message: "Passages outre : 50 maximum" })
  @ValidateNested({ each: true })
  @Type(() => AllergyOverrideDto)
  overrides?: AllergyOverrideDto[];
}

// ── Annulation (EF-09-08 ; CU-09-04) ─────────────────────────────────────────

export class CancelPrescriptionDto {
  @IsString()
  @IsNotEmpty({ message: "Motif d'annulation obligatoire (EF-09-08, CU-09-04)" })
  @MaxLength(500, { message: "Motif : 500 caractères maximum" })
  reason!: string;
}

// ── Délivrance en pharmacie (EF-09-06/07 ; CU-09-02) ─────────────────────────

/** Une ligne délivrée : quantité par ligne d'ordonnance (le restant vit côté serveur). */
export class DispenseLineDto {
  @IsUUID(undefined, { message: "Ligne de prescription invalide" })
  prescriptionLineId!: string;

  @Type(() => Number)
  @IsInt({ message: "Quantité : entier attendu" })
  @Min(1, { message: "Quantité délivrée strictement positive (EF-09-07)" })
  quantity!: number;
}

export class DispenseDto {
  /** Pharmacie qui délivre — le droit « dispense » sur CETTE pharmacie est vérifié serveur (RM-09-03). */
  @IsUUID(undefined, { message: "Pharmacie invalide" })
  facilityId!: string;

  @IsArray({ message: "Lignes à délivrer : liste attendue" })
  @ArrayMinSize(1, { message: "Au moins une ligne à délivrer" })
  @ArrayMaxSize(50, { message: "Délivrance limitée à 50 lignes" })
  @ValidateNested({ each: true })
  @Type(() => DispenseLineDto)
  lines!: DispenseLineDto[];
}

/**
 * M06 — DTO des routes Poignée de main & Session. La validation de FORME vit ici ;
 * les chiffres MÉTIER (PM-07, PM-13, PM-27/28/29/30) sont vérifiés côté service via
 * ParamsService — jamais en dur dans les décorateurs (RT §3).
 */
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { RecordEntryType } from "@prisma/client";
import { MOMO_OPERATORS, MomoOperatorCode } from "../m13-payments/m13.policies";
import { SESSION_MESSAGE_KINDS, SessionMessageKindCode } from "./m06.policies";

// ── Poignée de main (EF-06-01/02/03 ; CU-06-01) ──────────────────────────────

export class InitiateHandshakeDto {
  /** Offre ACTIVE de l'annuaire (M05) — point de départ de la poignée de main. */
  @IsUUID(undefined, { message: "Identifiant d'offre invalide" })
  offerId!: string;

  /** Consultation « pour » une personne à charge (Carnet familial, D-033) — l'acteur doit en être le tuteur. */
  @IsOptional()
  @IsUUID(undefined, { message: "Identifiant de sous-profil invalide" })
  subProfileId?: string;
}

export class RefuseHandshakeDto {
  /** Motif court affiché au patient (CU-06-01 : occupé, hors domaine…). */
  @IsString()
  @IsNotEmpty({ message: "Motif de refus requis (motif court : occupé, hors domaine…)" })
  @MaxLength(200, { message: "Motif trop long : 200 caractères maximum" })
  reason!: string;
}

export class PayHandshakeDto {
  /** Opérateur Mobile Money EXPLICITE — jamais déduit du préfixe téléphone (M13). */
  @IsIn([...MOMO_OPERATORS], { message: "Opérateur Mobile Money inconnu : MTN_MOMO ou AIRTEL_MONEY attendu" })
  operator!: MomoOperatorCode;
}

// ── Pré-consultation (EF-06-04 ; D-019) ──────────────────────────────────────

export class SubmitPreConsultationDto {
  @IsString()
  @IsNotEmpty({ message: "Décrivez vos symptômes — c'est ce qui prépare le professionnel (D-019)" })
  @MaxLength(4000, { message: "Symptômes : 4000 caractères maximum" })
  symptoms!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "« Depuis quand » : 200 caractères maximum" })
  sinceWhen?: string;

  /** Clés de fichiers (photos) déjà téléversées — jamais d'URL publique. */
  @IsOptional()
  @IsArray({ message: "Pièces jointes : liste de clés de fichiers attendue" })
  @ArrayMaxSize(10, { message: "Pièces jointes : 10 maximum" })
  @IsString({ each: true, message: "Pièce jointe : clé de fichier attendue" })
  @MaxLength(500, { each: true, message: "Clé de fichier trop longue" })
  attachments?: string[];
}

// ── Messages (EF-06-05/13 ; RM-06-03, ADR-12) ────────────────────────────────

export class SendMessageDto {
  /** Clé d'idempotence de la file hors ligne (EF-06-13, ADR-12) : un rejeu = un seul message. */
  @IsUUID(undefined, { message: "clientMsgId invalide : UUID attendu (idempotence hors ligne, ADR-12)" })
  clientMsgId!: string;

  @IsIn([...SESSION_MESSAGE_KINDS], { message: "Type de message inconnu : TEXT, PHOTO, VOICE ou DOCUMENT attendu" })
  kind!: SessionMessageKindCode;

  @IsOptional()
  @IsString()
  @MaxLength(8000, { message: "Message trop long : 8000 caractères maximum" })
  body?: string;

  /** Clé S3 du média (note vocale / document, ou photo unique) — cohérence type/contenu vérifiée côté service. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Clé de fichier vide" })
  @MaxLength(500, { message: "Clé de fichier trop longue" })
  fileKey?: string;

  /** Album de photos (plusieurs clés en une bulle) — max 10. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: "10 photos maximum par message" })
  @IsString({ each: true })
  @MaxLength(500, { each: true, message: "Clé de fichier trop longue" })
  mediaKeys?: string[];

  /** Réponse/citation à un message de la même session. */
  @IsOptional()
  @IsUUID(undefined, { message: "Identifiant de message cité invalide" })
  replyToId?: string;
}

/** Édition d'un message texte (≤ 15 min, auteur). */
export class EditMessageDto {
  @IsString()
  @IsNotEmpty({ message: "Le message ne peut pas être vide" })
  @MaxLength(8000, { message: "Message trop long : 8000 caractères maximum" })
  body!: string;
}

/** Suppression d'un message : « pour tout le monde » (auteur ≤ 15 min) ou « pour moi ». */
export class DeleteMessageDto {
  @IsBoolean()
  forEveryone!: boolean;
}

/** Bascule d'une réaction emoji sur un message (1 par participant, façon WhatsApp). */
export class ReactToMessageDto {
  // 8 car. : couvre un emoji composé (peau/genre) encodé en UTF-16 surrogate pairs + ZWJ.
  @IsString()
  @IsNotEmpty({ message: "Emoji requis" })
  @MaxLength(8, { message: "Emoji invalide" })
  emoji!: string;
}

/** Téléversement d'un média de session (photo ou note vocale) — fichier encodé en base64. */
export class UploadSessionMediaDto {
  // 112M caractères ≈ 80 Mo décodés (base64 ×4/3 + marge) — cohérent avec StorageService.maxBytes.
  @IsString() @IsNotEmpty() @MaxLength(112_000_000) fileBase64!: string;
  @IsIn(["image/jpeg", "image/jpg", "image/png", "image/webp", "audio/mp4", "audio/m4a", "audio/aac", "audio/mpeg", "audio/ogg", "audio/wav"], {
    message: "Média non supporté : image (JPEG/PNG/WebP) ou audio (m4a/aac/mp3/ogg/wav) attendu",
  })
  mime!: string;
}

export class ListMessagesQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: "Curseur de pagination invalide" })
  cursor?: string;

  /** Taille de page — bornée côté service (clampMessagePageSize). */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Taille de page : entier attendu" })
  @Min(1, { message: "Taille de page : 1 au minimum" })
  limit?: number;
}

// ── Prolongation (EF-06-07 ; D-016) ──────────────────────────────────────────

export class ExtendSessionDto {
  /** Minutes ajoutées — pas de pas imposé, mais > 0 ; cumul plafonné PM-29 côté service. */
  @Type(() => Number)
  @IsInt({ message: "La prolongation doit être un nombre entier de minutes" })
  @Min(1, { message: "La prolongation doit être d'au moins une minute" })
  minutes!: number;
}

// ── Compte-rendu (EF-06-08 ; D-021) ──────────────────────────────────────────

export class DepositReportDto {
  @IsString()
  @IsNotEmpty({ message: "Diagnostic requis (compte-rendu obligatoire, D-021)" })
  @MaxLength(8000, { message: "Diagnostic : 8000 caractères maximum" })
  diagnosis!: string;

  @IsString()
  @IsNotEmpty({ message: "Recommandations requises (compte-rendu obligatoire, D-021)" })
  @MaxLength(8000, { message: "Recommandations : 8000 caractères maximum" })
  recommendations!: string;
}

// ── Notation (EF-06-11 ; PM-13) ──────────────────────────────────────────────

export class RateSessionDto {
  /** Note entière — bornes PM-13 vérifiées côté service (jamais en dur ici). */
  @Type(() => Number)
  @IsInt({ message: "La note doit être un nombre entier" })
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "Commentaire : 2000 caractères maximum" })
  comment?: string;
}

// ── Accès Carnet en session (EF-06-06 ; RM-06-05) ────────────────────────────

export class SessionRecordQueryDto {
  @IsOptional()
  @IsIn(Object.values(RecordEntryType), { message: "Type d'entrée du Carnet inconnu" })
  type?: RecordEntryType;

  @IsOptional()
  @IsUUID(undefined, { message: "Curseur de pagination invalide" })
  cursor?: string;
}

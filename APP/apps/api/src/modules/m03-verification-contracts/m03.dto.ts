import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from "class-validator";
import { DOCUMENT_KINDS, DocumentKind, VERIFICATION_STATUSES, VerificationStatusCode } from "./m03.policies";

/**
 * Pièce justificative (EF-03-01/02) — le fichier est déjà téléversé (clé de stockage) ;
 * il n'est jamais public ni partagé (RM-03-03).
 */
export class AddDocumentDto {
  @IsIn([...DOCUMENT_KINDS]) kind!: DocumentKind;
  @IsString() @IsNotEmpty() @MaxLength(512) fileKey!: string;
  /** Date d'expiration éventuelle de la pièce (EF-03-09). */
  @IsOptional() @IsISO8601() expiresAt?: string;
}

/**
 * Téléversement d'une pièce justificative — le fichier ET son rattachement au dossier, en un appel.
 *
 * ⚠️ `AddDocumentDto` attend une `fileKey` « déjà téléversée », mais **aucun endpoint ne produisait
 * cette clé pour les pièces de vérification** : seuls les avatars (M01) et les médias de session
 * (M06) avaient une voie d'écriture. Le dossier de vérification était donc impossible à remplir
 * depuis un client — trou constaté le 2026-08-05 en construisant l'écran web.
 *
 * Base64 comme partout ailleurs dans ce backend (avatars, médias de session) : le projet a fait le
 * choix assumé de zéro dépendance native, donc pas de `multipart`. Cohérence avant tout.
 */
export class UploadDocumentDto {
  @IsIn([...DOCUMENT_KINDS]) kind!: DocumentKind;
  @IsString() @IsNotEmpty() fileBase64!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) mime!: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}

/** Décision d'examen (CU-03-02) — toujours motivée (RM-03-02). */
export class DecideDto {
  @IsIn(["VERIFIED", "REJECTED", "NEEDS_INFO"]) decision!: "VERIFIED" | "REJECTED" | "NEEDS_INFO";
  @IsString() @IsNotEmpty() @MaxLength(2000) reasons!: string;
}

/** Révocation du badge (EF-03-08) — motif consigné (CU-03-05). */
export class RevokeDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) reasons!: string;
}

/** Signature électronique = mot de passe + OTP (CU-03-03). */
export class SignAgreementDto {
  @IsString() @IsNotEmpty() password!: string;
  @IsString() @Length(6, 6) otpCode!: string;
}

/** Filtre de la file de vérification (EF-03-03). */
export class QueueQueryDto {
  @IsOptional() @IsIn([...VERIFICATION_STATUSES]) status?: VerificationStatusCode;
}

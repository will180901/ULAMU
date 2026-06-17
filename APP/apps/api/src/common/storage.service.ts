/**
 * Stockage de fichiers média (photos de profil, photos/notes vocales de consultation).
 * MVP local : écrit sur disque sous `uploads/`, clé = `<préfixe>_<uuid>.<ext>`. L'abstraction par
 * CLÉ (et non URL) permet de basculer vers minio/S3 plus tard sans toucher aux appelants.
 * Entrée en base64 (le client mobile envoie l'image/le son encodé — pas de multipart/multer).
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import { openBuffer, sealBuffer } from "./crypto/secretbox";

const ROOT = resolve(process.cwd(), "uploads");

/** MIME accepté → extension. On borne aux types attendus (images + audio court). */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

/**
 * Signatures binaires d'exécutables connus — liste NOIRE (ne rejette que ces signatures précises,
 * ne valide pas le contenu réel). Empêche un exécutable renommé en .jpg de passer le seul contrôle
 * de mime déclaré par le client.
 */
const EXECUTABLE_SIGNATURES: Buffer[] = [
  Buffer.from([0x4d, 0x5a]), // MZ — PE (Windows .exe/.dll)
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF (Linux)
  Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // Mach-O 32-bit
  Buffer.from([0xfe, 0xed, 0xfa, 0xcf]), // Mach-O 64-bit
  Buffer.from([0xce, 0xfa, 0xed, 0xfe]), // Mach-O 32-bit (endian inversé)
  Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), // Mach-O 64-bit (endian inversé)
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Mach-O universal (aussi magic .class Java — indésirable ici aussi)
  Buffer.from("#!", "ascii"), // script shell (shebang)
];

function looksLikeExecutable(buf: Buffer): boolean {
  return EXECUTABLE_SIGNATURES.some((sig) => buf.length >= sig.length && buf.subarray(0, sig.length).equals(sig));
}

@Injectable()
export class StorageService {
  /**
   * Garde-fou mémoire : 80 Mo après décodage — dimensionné contre les 512 Mo de RAM du plan
   * gratuit Render (le process entier, pas juste cette requête), avec large marge. Couvre une
   * note vocale de plusieurs heures ; en pratique bornée de toute façon par la durée de session.
   */
  private readonly maxBytes = 80 * 1024 * 1024;

  /** Enregistre un base64 et renvoie la clé de stockage. Tolère un préfixe data-URI. */
  async save(prefix: string, base64: string, mime: string): Promise<string> {
    const ext = EXT_BY_MIME[mime.toLowerCase()];
    if (!ext) {
      throw new BadRequestException("Type de fichier non supporté");
    }
    const raw = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 0) {
      throw new BadRequestException("Fichier vide ou base64 invalide");
    }
    if (looksLikeExecutable(buf)) {
      throw new BadRequestException("Type de fichier non supporté");
    }
    if (buf.length > this.maxBytes) {
      throw new BadRequestException("Fichier trop volumineux (max 80 Mo)");
    }
    await fs.mkdir(ROOT, { recursive: true });
    const key = `${prefix}_${randomUUID()}.${ext}`;
    // Chiffré au repos (AES-256-GCM, même primitive que les secrets TOTP) — le disque ne voit jamais le clair.
    await fs.writeFile(join(ROOT, key), sealBuffer(buf));
    return key;
  }

  /** Lit un fichier par clé. null si absent ou clé non sûre. */
  async read(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.isSafeKey(key)) {
      return null;
    }
    const ext = key.split(".").pop() ?? "";
    try {
      const raw = await fs.readFile(join(ROOT, key));
      let buffer: Buffer;
      try {
        buffer = openBuffer(raw);
      } catch {
        // Rétrocompatibilité : fichier écrit AVANT l'ajout du chiffrement au repos — encore en clair.
        buffer = raw;
      }
      return { buffer, contentType: CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async remove(key: string | null | undefined): Promise<void> {
    if (!key || !this.isSafeKey(key)) {
      return;
    }
    await fs.rm(join(ROOT, key), { force: true });
  }

  /** Anti-traversal : clé alphanumérique + _.- sans séparateur de chemin ni « .. ». */
  private isSafeKey(key: string): boolean {
    return /^[a-zA-Z0-9_.-]+$/.test(key) && !key.includes("..");
  }
}

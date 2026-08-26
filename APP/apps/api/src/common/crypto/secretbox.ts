/**
 * Chiffrement symétrique des secrets au repos (secret TOTP…) — AES-256-GCM.
 * Clé : env SECRETBOX_KEY (32 octets base64). Format : v1$iv_b64$tag_b64$ct_b64
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.SECRETBOX_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length === 32) return k;
  }
  // Dev uniquement : clé dérivée stable — JAMAIS en production (menaces §4.1).
  return createHash("sha256").update("ulamu-dev-secretbox").digest();
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1$${iv.toString("base64")}$${cipher.getAuthTag().toString("base64")}$${ct.toString("base64")}`;
}

export function openSecret(sealed: string): string {
  const [v, ivB64, tagB64, ctB64] = sealed.split("$");
  if (v !== "v1" || !ivB64 || !tagB64 || !ctB64) throw new Error("secretbox: format invalide");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}

/** Variante binaire (médias) — même primitive, format compact : [1 octet version][12 iv][16 tag][ct...]. */
const BUFFER_VERSION = 1;
/** Taille de l'en-tête en clair qui précède le chiffré : 1 (version) + 12 (iv) + 16 (tag). */
const BUFFER_HEADER_BYTES = 29;

export function sealBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([BUFFER_VERSION]), iv, cipher.getAuthTag(), ct]);
}

/**
 * Ce blob porte-t-il l'en-tête de `sealBuffer` ? Autrement dit : est-il CHIFFRÉ ?
 *
 * L'en-tête (version, iv, tag) est stocké en clair : cette reconnaissance ne dépend donc PAS de la
 * clé. C'est ce qui permet à `StorageService` de distinguer les deux causes d'échec de `openBuffer`,
 * qu'il confondait auparavant : « fichier d'avant le chiffrement, encore en clair » (à servir tel
 * quel) et « fichier bien chiffré que la clé courante n'ouvre pas » (incident `SECRETBOX_KEY`).
 *
 * Aucun format accepté à l'écriture ne commence par l'octet 1 — PDF `%` (0x25), JPEG (0xFF), PNG
 * (0x89), WebP/WAV `R`, OGG `O`, MP3 (0xFF ou `I`), MP4/M4A (taille de boîte, 0x00…). Un ancien
 * fichier en clair ne peut donc pas être pris pour un chiffré.
 */
export function looksSealed(buf: Buffer): boolean {
  return buf.length >= BUFFER_HEADER_BYTES && buf[0] === BUFFER_VERSION;
}

/**
 * Lève si `sealed` n'a pas cet en-tête, et lève aussi — sur le tag d'authentification — quand la
 * clé courante n'est pas celle qui a scellé. Les deux cas se ressemblent ici : c'est à l'appelant
 * de les séparer avec `looksSealed`, car ils n'appellent pas du tout la même réaction.
 */
export function openBuffer(sealed: Buffer): Buffer {
  if (!looksSealed(sealed)) throw new Error("secretbox: format binaire invalide");
  const iv = sealed.subarray(1, 13);
  const tag = sealed.subarray(13, BUFFER_HEADER_BYTES);
  const ct = sealed.subarray(BUFFER_HEADER_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

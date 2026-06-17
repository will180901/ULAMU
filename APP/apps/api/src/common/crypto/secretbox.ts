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

export function sealBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([BUFFER_VERSION]), iv, cipher.getAuthTag(), ct]);
}

/** Lève si `sealed` n'est pas dans ce format (utilisé par StorageService pour retomber sur du clair ancien). */
export function openBuffer(sealed: Buffer): Buffer {
  if (sealed.length < 29 || sealed[0] !== BUFFER_VERSION) throw new Error("secretbox: format binaire invalide");
  const iv = sealed.subarray(1, 13);
  const tag = sealed.subarray(13, 29);
  const ct = sealed.subarray(29);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/**
 * TOTP — RFC 6238 (HMAC-SHA1, 30 s, 6 chiffres), zéro dépendance (EF-01-10, D-027).
 * Tolérance ±1 pas à la vérification (dérive d'horloge des téléphones).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("base32 invalide");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpAt(secretB32: string, epochSeconds: number): string {
  const counter = Math.floor(epochSeconds / STEP_SECONDS);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const offset = (hmac[hmac.length - 1] as number) & 0x0f;
  const code =
    (((hmac[offset] as number) & 0x7f) << 24) |
    (((hmac[offset + 1] as number) & 0xff) << 16) |
    (((hmac[offset + 2] as number) & 0xff) << 8) |
    ((hmac[offset + 3] as number) & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function verifyTotp(secretB32: string, code: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const given = Buffer.from(code);
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(totpAt(secretB32, nowSeconds + drift * STEP_SECONDS));
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
  }
  return false;
}

/** URI de provisionnement pour le QR (CU-01-08). */
export function provisioningUri(secretB32: string, accountLabel: string): string {
  const issuer = "ULAMU";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** La période d'un code, en secondes (RFC 6238). Exportée : les écrans doivent la LIRE, pas l'écrire. */
export const TOTP_STEP_SECONDS = STEP_SECONDS;

/**
 * Secondes restantes avant qu'un NOUVEAU code apparaisse — le rythme, vu du serveur.
 *
 * ── Pourquoi le serveur, et pas le navigateur ─────────────────────────────────────────────────
 *
 * Un code TOTP se calcule sur des tranches de temps ABSOLUES : `floor(unixSeconds / 30)`. Le
 * téléphone et le serveur la calculent chacun de leur côté. Si l'horloge du navigateur dérive de
 * dix-sept secondes, un décompte calculé localement serait **déphasé** de dix-sept secondes avec ce
 * que le téléphone affiche — et l'écran donnerait une seconde vérité sur le même instant.
 *
 * C'est la règle du projet, écrite dans `useDecompteurServeur` : *« Le temps du serveur fait foi ;
 * les horloges clients sont indicatives. »*
 *
 * ── Ce que ce nombre dit, et ce qu'il ne dit PAS ──────────────────────────────────────────────
 *
 * Il dit **quand un nouveau code apparaîtra**. Il ne dit pas quand le code courant cessera d'être
 * accepté : `verifyTotp` tolère ±1 pas, donc un code reste valable jusqu'à la fin du pas SUIVANT.
 * Annoncer une expiration ici serait faux — et ferait attendre inutilement quelqu'un qui a déjà un
 * code parfaitement valide sous les yeux.
 */
export function secondsUntilNextTotpStep(nowSeconds = Math.floor(Date.now() / 1000)): number {
  return STEP_SECONDS - (nowSeconds % STEP_SECONDS);
}

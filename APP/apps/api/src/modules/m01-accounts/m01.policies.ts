/**
 * M01 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M01_comptes_authentification.md
 */

export interface LockoutConfig {
  maxFailures: number; // PM-18[0] = 5
  windowSeconds: number; // PM-18[1] = 900
  blockSeconds: number; // PM-18[2] = 900
}

/**
 * Blocage de connexion (EF-01-06, PM-18) : N échecs dans la fenêtre → blocage.
 * `failureTimes` : horodatages (ms) des échecs récents, ordre quelconque.
 * Retourne le timestamp (ms) de fin de blocage, ou null si non bloqué.
 */
export function lockoutUntil(failureTimes: number[], cfg: LockoutConfig, nowMs: number): number | null {
  const windowStart = nowMs - cfg.windowSeconds * 1000;
  const recent = failureTimes.filter((t) => t >= windowStart && t <= nowMs).sort((a, b) => a - b);
  if (recent.length < cfg.maxFailures) return null;
  const nthLast = recent[recent.length - cfg.maxFailures] as number;
  const blockedUntil = nthLast + cfg.blockSeconds * 1000;
  return blockedUntil > nowMs ? blockedUntil : null;
}

/**
 * Limite d'envoi d'OTP (PM-19) : max N envois par numéro par heure glissante.
 */
export function canSendOtp(sentTimes: number[], maxPerHour: number, nowMs: number): boolean {
  const hourAgo = nowMs - 3600_000;
  return sentTimes.filter((t) => t >= hourAgo && t <= nowMs).length < maxPerHour;
}

/**
 * Numéro congolais : indicatif +242 + numéro national de 9 chiffres commençant par 0
 * (06/05/04… — le 0 fait partie du numéro). Canonique : "+242061234567".
 */
export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-.]/g, "");
  const m = /^(?:\+?242)?(0[45678]\d{7})$/.exec(cleaned);
  if (!m) return null;
  return `+242${m[1] as string}`;
}

/** Âge minimum (PM-16) — calcul en UTC (PM-14). */
export function isAdult(birthDate: Date, minYears: number, now: Date): boolean {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - minYears, now.getUTCMonth(), now.getUTCDate()));
  return birthDate.getTime() <= cutoff.getTime();
}

/** Force minimale du mot de passe (RM-01-02 — détail durci en Phase 3/pentest). */
export function isAcceptablePassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && /\d/.test(pw) && /[a-zA-Z]/.test(pw);
}

/**
 * Nom d'utilisateur (D-049) — identifiant de connexion alternatif.
 * 3 à 30 caractères [a-z0-9._-], ne commence/finit pas par un séparateur. Normalisé en minuscules
 * AVANT stockage ET avant lookup (l'unicité Prisma étant sensible à la casse).
 */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;
export function normalizeUsername(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}
export function isAcceptableUsername(raw: string): boolean {
  const u = normalizeUsername(raw);
  return u.length >= 3 && u.length <= 30 && USERNAME_RE.test(u);
}

/**
 * Validation côté CLIENT — miroir des règles pures de l'API (m01.policies.ts).
 * Le SERVEUR reste la source de vérité : ces fonctions servent à donner un retour immédiat
 * à l'utilisateur (UX) avant l'appel réseau, jamais à remplacer la validation serveur.
 */

/**
 * Numéro congolais : indicatif +242 + numéro national de 9 chiffres commençant par 0
 * (04/05/06/07/08). Canonique : "+242061234567". Retourne null si invalide.
 * IDENTIQUE à apps/api .../m01.policies.normalizePhone (ne pas diverger).
 */
export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-.]/g, "");
  const m = /^(?:\+?242)?(0[45678]\d{7})$/.exec(cleaned);
  if (!m) return null;
  return `+242${m[1] as string}`;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Force minimale du mot de passe (RM-01-02) : ≥ 8 caractères, au moins une lettre et un chiffre. */
export function isAcceptablePassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && /\d/.test(pw) && /[a-zA-Z]/.test(pw);
}

/** Code OTP / TOTP : exactement `len` chiffres (6 par défaut). */
export function isValidOtp(code: string, len = 6): boolean {
  return new RegExp(`^\\d{${len}}$`).test(code);
}

/**
 * Âge minimum (PM-16, défaut 18) — calcul en UTC (PM-14), aligné sur m01.policies.isAdult.
 * birthDate au format ISO 8601 (AAAA-MM-JJ) ; retourne false si la date est invalide.
 */
export function isAdultIso(birthDateIso: string, minYears: number, now: Date): boolean {
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - minYears, now.getUTCMonth(), now.getUTCDate()));
  return birth.getTime() <= cutoff.getTime();
}

/** Champ texte non vide après trim, borné à `max` caractères (noms, arrondissement…). */
export function isNonEmptyBounded(value: string, max = 80): boolean {
  const v = (value ?? "").trim();
  return v.length > 0 && v.length <= max;
}

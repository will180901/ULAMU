/**
 * Validation côté CLIENT — VENDORÉ (source de vérité : packages/shared/src/validation.ts,
 * elle-même miroir de apps/api .../m01.policies.ts). Le SERVEUR reste la vérité.
 */

export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-.]/g, '');
  const m = /^(?:\+?242)?(0[45678]\d{7})$/.exec(cleaned);
  if (!m) {
    return null;
  }
  return `+242${m[1] as string}`;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** ≥ 8 caractères, au moins une lettre et un chiffre (RM-01-02). */
export function isAcceptablePassword(pw: string): boolean {
  return typeof pw === 'string' && pw.length >= 8 && /\d/.test(pw) && /[a-zA-Z]/.test(pw);
}

/** Nom d'utilisateur (D-049) — miroir EXACT du backend m01.policies.ts. */
export function normalizeUsername(raw: string): string {
  return (raw ?? '').trim().toLowerCase();
}
export function isValidUsername(raw: string): boolean {
  const u = normalizeUsername(raw);
  return u.length >= 3 && u.length <= 30 && /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/.test(u);
}

/** Exactement `len` chiffres (6 par défaut). */
export function isValidOtp(code: string, len = 6): boolean {
  return new RegExp(`^\\d{${len}}$`).test(code);
}

/** Âge minimum (PM-16) en UTC (PM-14). birthDateIso = AAAA-MM-JJ. */
export function isAdultIso(birthDateIso: string, minYears: number, now: Date): boolean {
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) {
    return false;
  }
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - minYears, now.getUTCMonth(), now.getUTCDate()));
  return birth.getTime() <= cutoff.getTime();
}

export function isNonEmptyBounded(value: string, max = 80): boolean {
  const v = (value ?? '').trim();
  return v.length > 0 && v.length <= max;
}

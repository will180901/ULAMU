/**
 * M14 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M14_notifications_rappels.md
 * Invariants : service aveugle au métier (RM-14-01) ; les critiques ne sont jamais
 * désactivables (RM-14-02, EF-14-04) ; jamais de contenu médical (RM-14-03, EF-14-06) ;
 * modèle inconnu → repli générique, on ne jette JAMAIS (pas de pilule empoisonnée).
 */
import {
  GENERIC_TEMPLATE,
  NotificationCategory,
  NotificationTemplate,
  TEMPLATE_CATALOG,
  TemplatePayload,
} from "./m14.templates";

// ── Priorités (EF-14-01) ──────────────────────────────────────────────────────

/** Priorités C4 (EF-14-01) : critique / normale / faible — alignées sur Notification.priority. */
export const NOTIFICATION_PRIORITIES = ["critical", "normal", "low"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

/** Priorité C4 brute → priorité connue, ou undefined si absente/inconnue (payload opaque). */
export function normalizePriority(raw: unknown): NotificationPriority | undefined {
  return typeof raw === "string" && (NOTIFICATION_PRIORITIES as readonly string[]).includes(raw)
    ? (raw as NotificationPriority)
    : undefined;
}

/**
 * Priorité effective d'une demande C4 (EF-14-01) : la priorité explicite du module
 * émetteur prime ; sinon la catégorie "critical" du modèle impose "critical" ;
 * sinon "normal" — jamais d'échec sur une priorité inconnue (pas de pilule empoisonnée).
 */
export function effectivePriority(raw: unknown, category: NotificationCategory): NotificationPriority {
  return normalizePriority(raw) ?? (category === "critical" ? "critical" : "normal");
}

// ── Résolution et rendu des modèles (EF-14-03) ────────────────────────────────

/** Modèle du catalogue, ou gabarit générique "system" si inconnu — ne jette JAMAIS. */
export function resolveTemplate(template: string): NotificationTemplate {
  return TEMPLATE_CATALOG[template] ?? GENERIC_TEMPLATE;
}

export interface RenderedNotification {
  category: NotificationCategory;
  title: string;
  body: string;
}

/**
 * Rendu d'un modèle rempli (RM-14-01) — défensif de bout en bout : un payload
 * inattendu ne fait JAMAIS échouer la livraison (l'outbox rejouerait à l'infini) ;
 * en cas de gabarit fautif on retombe sur le texte générique.
 * RM-14-03 : title/body proviennent exclusivement du catalogue — aucun contenu médical.
 */
export function renderNotification(template: string, payload: TemplatePayload): RenderedNotification {
  const resolved = resolveTemplate(template);
  let title: string;
  let body: string;
  try {
    title = resolved.title(payload ?? {});
  } catch {
    title = GENERIC_TEMPLATE.title({});
  }
  try {
    body = resolved.body(payload ?? {});
  } catch {
    body = GENERIC_TEMPLATE.body({});
  }
  return { category: resolved.category, title, body };
}

// ── Préférences et droit d'envoi push (EF-14-04, RM-14-02) ────────────────────

/** Une préférence est ajustable pour toute catégorie SAUF "critical" (RM-14-02). */
export function isPreferenceAdjustable(category: NotificationCategory): boolean {
  return category !== "critical";
}

/** Une notification est critique par sa catégorie OU sa priorité (EF-14-04/08). */
export function isCriticalNotification(category: NotificationCategory, priority: NotificationPriority): boolean {
  return category === "critical" || priority === "critical";
}

/**
 * Table de vérité de l'envoi push (EF-14-02/04) :
 * - critique (catégorie ou priorité) → TOUJOURS envoyé, préférence ignorée (RM-14-02) ;
 * - sinon → uniquement si la préférence de la catégorie est active (défaut : active).
 */
export function pushAllowed(
  category: NotificationCategory,
  priority: NotificationPriority,
  prefEnabled: boolean,
): boolean {
  if (isCriticalNotification(category, priority)) return true; // RM-14-02
  return prefEnabled;
}

// ── Livraison garantie des critiques (EF-14-08) ───────────────────────────────

/** Borne TECHNIQUE de renvoi des push critiques en échec (EF-14-08) — pas un PM-xx. */
export const MAX_CRITICAL_PUSH_ATTEMPTS = 5;

/** Un push critique en échec est rejouable tant que attempts < MAX_CRITICAL_PUSH_ATTEMPTS. */
export function canRetryCriticalPush(attempts: number): boolean {
  return attempts < MAX_CRITICAL_PUSH_ATTEMPTS;
}

// ── Rétention du centre in-app (EF-14-07, PM-37) ──────────────────────────────

/**
 * Date charnière de rétention (PM-37) : tout ce qui est STRICTEMENT antérieur à
 * `now - retentionDays` est hors rétention (purge et filtre de lecture).
 * La valeur de PM-37 vient de ParamsService — jamais en dur ici.
 */
export function purgeBefore(retentionDays: number, now: Date): Date {
  return new Date(now.getTime() - retentionDays * 86_400_000);
}

// ── Pagination du centre in-app (EF-14-07) ────────────────────────────────────

/** Bornes TECHNIQUES de pagination (pas des paramètres métier PM-xx). */
export const NOTIFICATION_PAGE_MAX = 100;
export const NOTIFICATION_PAGE_DEFAULT = 20;

/** Taille de page effective : défaut si absente, plancher 1, plafond NOTIFICATION_PAGE_MAX. */
export function clampNotificationPageSize(requested?: number): number {
  const wanted = requested === undefined ? NOTIFICATION_PAGE_DEFAULT : Math.floor(requested);
  return Math.min(Math.max(1, wanted), NOTIFICATION_PAGE_MAX);
}

// ── Audit C5 — type d'acteur ──────────────────────────────────────────────────

/** Type d'acteur C5 à partir du type de compte (AccountType → AuditEntry.actorType). */
export function auditActorTypeFor(
  accountType: string,
): "patient" | "professional" | "facility_member" | "admin" | "system" {
  switch (accountType) {
    case "PATIENT":
      return "patient";
    case "PROFESSIONAL":
      return "professional";
    case "FACILITY_MEMBER":
      return "facility_member";
    case "ADMIN":
      return "admin";
    default:
      return "system";
  }
}

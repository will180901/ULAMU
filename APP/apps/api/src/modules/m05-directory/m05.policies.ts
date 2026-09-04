/**
 * M05 — règles métier pures de l'Annuaire (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * RM-05-02 : LE CLASSEMENT NE SE VEND PAS — l'algorithme de pertinence est intégralement
 * documenté ici (poids constants, publics, testés). Aucun paramètre payant n'existe,
 * aucun réglage par professionnel : les constantes sont celles de l'algorithme, pas des PM.
 * Les chiffres MÉTIER (PM-06, PM-09, PM-13, PM-25, PM-26) sont INJECTÉS par les services
 * via ParamsService — jamais codés en dur ici (RT §3).
 */

// ── Référentiels (alignés sur les enums Prisma — D3) ─────────────────────────

/** Types d'offre (EF-05-02) : consultation standard ou de suivi. */
export const OFFER_KINDS = ["STANDARD", "FOLLOW_UP"] as const;
export type OfferKindCode = (typeof OFFER_KINDS)[number];

/** États de présence (EF-05-05) — « absent » = OFFLINE ou DO_NOT_DISTURB. */
export const PRESENCE_STATES = ["ONLINE", "DO_NOT_DISTURB", "OFFLINE"] as const;
export type PresenceStateCode = (typeof PRESENCE_STATES)[number];

/** Onglets de catégories de l'Accueil (EF-05-08, D-013) — alignés sur ProfessionalCategory. */
export const PROFESSIONAL_CATEGORIES = [
  "GENERAL_PRACTITIONER",
  "SPECIALIST",
  "DENTIST",
  "MIDWIFE",
  "NURSE",
  "COMMUNITY_HEALTH_WORKER",
] as const;
export type ProfessionalCategoryCode = (typeof PROFESSIONAL_CATEGORIES)[number];

/** Tris de la recherche (EF-05-03) : pertinence (défaut), prix, note, réactivité. */
export const DIRECTORY_SORTS = ["relevance", "price", "rating", "reactivity"] as const;
export type DirectorySortCode = (typeof DIRECTORY_SORTS)[number];

// ── Offres (EF-05-02 ; CU-05-03) ─────────────────────────────────────────────

/**
 * Durée d'offre dans les bornes PM-09 (liste « min,max » en minutes, via getIntList).
 * Bornes corrompues (seed) → erreur franche : on ne valide JAMAIS à l'aveugle.
 */
export function durationIsValid(durationMin: number, boundsMin: readonly number[]): boolean {
  if (boundsMin.length < 2) throw new Error("Paramètre PM-09 invalide : liste « min,max » attendue");
  const [min, max] = boundsMin;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || min > max) {
    throw new Error("Paramètre PM-09 invalide : bornes entières positives min ≤ max attendues");
  }
  return Number.isInteger(durationMin) && durationMin >= min && durationMin <= max;
}

/** Prix FINAL patient (commission incluse, D-010/RM-05-03) ≥ plancher PM-06, entier de XAF. */
export function priceIsValid(priceXaf: number, floorXaf: number): boolean {
  if (!Number.isInteger(floorXaf) || floorXaf < 0) {
    throw new Error("Paramètre PM-06 invalide : plancher entier de XAF attendu");
  }
  return Number.isInteger(priceXaf) && priceXaf >= floorXaf;
}

/** EF-05-02 : une offre est valide si durée (PM-09) ET prix (PM-06) le sont. */
export function offerIsValid(
  durationMin: number,
  priceXaf: number,
  boundsMin: readonly number[],
  floorXaf: number,
): boolean {
  return durationIsValid(durationMin, boundsMin) && priceIsValid(priceXaf, floorXaf);
}

// ── Présence (EF-05-05/06 ; CU-05-04) ────────────────────────────────────────

/**
 * EF-05-06 / RM-05-04 : disponible pour initiation = ONLINE **et** battement de cœur frais
 * (âge STRICTEMENT inférieur à PM-26 secondes). Un ONLINE rassis vaut OFFLINE : la bascule
 * automatique en « absent » (CU-05-04) est appliquée À LA LECTURE — aucun poller.
 * Âge négatif (horloges désynchronisées) : considéré frais.
 */
export function presenceIsAvailable(
  state: PresenceStateCode,
  lastHeartbeatAtMs: number,
  nowMs: number,
  pm26S: number,
): boolean {
  if (!Number.isFinite(pm26S) || pm26S <= 0) {
    throw new Error("Paramètre PM-26 invalide : durée en secondes strictement positive attendue");
  }
  if (state !== "ONLINE") return false;
  return nowMs - lastHeartbeatAtMs < pm26S * 1000;
}

/**
 * État AFFICHÉ dans la vitrine : un ONLINE rassis est montré OFFLINE — jamais de bouton
 * « initier » actif périmé (spec §8 : la présence se rafraîchit en temps réel).
 */
export function effectivePresenceState(
  state: PresenceStateCode,
  lastHeartbeatAtMs: number,
  nowMs: number,
  pm26S: number,
): PresenceStateCode {
  if (state === "ONLINE" && !presenceIsAvailable(state, lastHeartbeatAtMs, nowMs, pm26S)) return "OFFLINE";
  return state;
}

// ── Indicateurs de réactivité et de notation (EF-05-01) ──────────────────────

/** Compteurs cumulés de ProfessionalStats — alimentés par les événements M06 (spec §7). */
export interface ReactivityStats {
  initiationsTotal: number;
  confirmedTotal: number;
  confirmDelaySumS: number;
  ratingSum: number;
  ratingCount: number;
  incidentsTotal: number;
  /** Refus motivés — hors dénominateur depuis la dette n°23 (facultatif : lignes d'avant = 0). */
  refusedTotal?: number;
}

/**
 * Taux de confirmation des poignées de main, 0..1 (EF-05-01).
 *
 * ── Ce que le dénominateur exclut, et pourquoi (dette n°23, 04/09/2026) ──────────────────────
 *
 * Il valait `confirmées / initiées`. `initiationsTotal` monte à la SOLLICITATION, avant toute
 * réponse — un refus motivé y restait donc, et pesait exactement autant qu'une demande laissée
 * expirer sans un mot.
 *
 * Or les deux ne rendent pas le même service. **Un refus rapide fait GAGNER du temps au patient**,
 * qui va voir ailleurs sans attendre ; une expiration lui en fait perdre. Confondre les deux
 * décourageait le seul des deux comportements qui serve le patient — un indicateur public qui
 * punit la bonne conduite fabrique la mauvaise.
 *
 * Le taux répond donc maintenant à : « quand ce médecin RÉPOND, dit-il oui ? », et non plus
 * « prend-il des patients ? ». Le refus reste compté à part (`refusedTotal`), donc rien n'est perdu.
 *
 * ⚠️ **Cette fonction est la SEULE définition du taux.** Elle l'est devenue le 04/09 : la formule
 * était recopiée à la main dans `m16.dashboard.service.ts` et `m16.kpi.service.ts`, si bien que
 * changer la règle ici aurait fait dire deux chiffres différents à deux écrans pour un même
 * médecin. *Une règle recopiée est une règle qui dérive.*
 */
export function confirmRate(stats: ReactivityStats): number {
  // Les refus sortent du dénominateur ; ils restent dans `initiationsTotal`, qui reste
  // réconciliable avec la table Handshake.
  const repondables = stats.initiationsTotal - (stats.refusedTotal ?? 0);
  if (repondables <= 0) return 0;
  return Math.min(1, Math.max(0, stats.confirmedTotal / repondables));
}

/**
 * Le dénominateur du taux, exposé pour que les écrans puissent DIRE sur quoi il porte.
 * Un pourcentage sans son assiette ne se vérifie pas : « 100 % » sur deux demandes et « 100 % »
 * sur deux cents ne disent pas la même chose.
 */
export function confirmDenominator(stats: ReactivityStats): number {
  return Math.max(0, stats.initiationsTotal - (stats.refusedTotal ?? 0));
}

/** Taux de confirmation affichable en % entier (EF-05-01 : « taux de confirmation % »). */
export function confirmRatePct(stats: ReactivityStats): number {
  return Math.round(confirmRate(stats) * 100);
}

/** Délai moyen de confirmation en secondes — null si aucune confirmation (affiché « — »). */
export function avgConfirmDelayS(stats: ReactivityStats): number | null {
  if (stats.confirmedTotal <= 0) return null;
  return stats.confirmDelaySumS / stats.confirmedTotal;
}

/** Note moyenne (échelle PM-13) — null si aucun avis (affichage honnête, EF-05-07). */
export function ratingAvg(stats: ReactivityStats): number | null {
  if (stats.ratingCount <= 0) return null;
  return stats.ratingSum / stats.ratingCount;
}

// ── Pertinence (EF-05-03 ; RM-05-02 : algorithme documenté, JAMAIS vendu) ────
//
//   score = W.reactivity × R + W.rating × N + W.activity × A − W.incidents × I, borné à [0;1]
//
//   R (réactivité) = moyenne de (taux de confirmation) et (facteur délai), où
//       facteur délai = DELAY_REF_S / (DELAY_REF_S + délai moyen en s) — 1 si immédiat,
//       0,5 à DELAY_REF_S, tend vers 0 si très lent ; 0 si initiations sans AUCUNE confirmation.
//       Sans aucune initiation : composante NEUTRE (boost de découverte, spec §9
//       « Premiers arrivés » — les nouveaux vérifiés restent visibles en milieu de classement).
//   N (note) = note moyenne normalisée sur l'échelle PM-13 ([min;max] → [0;1]) ;
//       sans aucun avis : composante NEUTRE (même boost de découverte).
//   A (activité récente) = 1 si signe de vie (stats ou battement de cœur) dans la fenêtre, sinon 0.
//   I (incidents) = part de sessions remboursées (D-008) parmi les confirmées — pénalité.
//
// Ces poids sont des CONSTANTES D'ALGORITHME publiques, versionnées et testées — aucun
// paramètre payant, aucun réglage par professionnel (garde-fous du modèle économique).

export const RELEVANCE_WEIGHTS = { reactivity: 0.45, rating: 0.35, activity: 0.2, incidents: 0.25 } as const;

/** Délai de référence du facteur délai : un délai moyen égal à cette valeur vaut 0,5. */
export const DELAY_REF_S = 300;

/** Composante neutre du boost de découverte (spec §9) — milieu de l'échelle [0;1]. */
export const NEUTRAL_COMPONENT = 0.5;

/** Fenêtre « activité récente » de l'algorithme documenté (composante A). */
export const RECENT_ACTIVITY_WINDOW_DAYS = 30;

/** Composante A : dernier signe de vie (stats OU battement de cœur) dans la fenêtre. */
export function hasRecentActivity(
  lastSignalAtMs: number | null,
  nowMs: number,
  windowDays: number = RECENT_ACTIVITY_WINDOW_DAYS,
): boolean {
  if (lastSignalAtMs === null) return false;
  return nowMs - lastSignalAtMs < windowDays * 24 * 3_600_000;
}

/**
 * Score de pertinence [0;1] (formule documentée ci-dessus, RM-05-02).
 * `ratingScale` = échelle PM-13 « min,max » injectée par le service (défaut [1;5], D-021).
 * `stats` null (aucun événement M06 encore) = professionnel NEUTRE — il apparaît quand même.
 */
export function relevanceScore(
  stats: ReactivityStats | null,
  recentActivity: boolean,
  ratingScale: readonly number[] = [1, 5],
): number {
  if (ratingScale.length < 2) throw new Error("Échelle de notation invalide : liste « min,max » attendue (PM-13)");
  const [minRating, maxRating] = ratingScale;
  if (!Number.isFinite(minRating) || !Number.isFinite(maxRating) || minRating >= maxRating) {
    throw new Error("Échelle de notation invalide : min < max attendus (PM-13)");
  }

  const W = RELEVANCE_WEIGHTS;

  let reactivity = NEUTRAL_COMPONENT; // boost de découverte (spec §9)
  if (stats && stats.initiationsTotal > 0) {
    const delay = avgConfirmDelayS(stats);
    const delayFactor = delay === null ? 0 : DELAY_REF_S / (DELAY_REF_S + Math.max(0, delay));
    reactivity = (confirmRate(stats) + delayFactor) / 2;
  }

  let rating = NEUTRAL_COMPONENT; // boost de découverte (spec §9)
  if (stats && stats.ratingCount > 0) {
    const avg = ratingAvg(stats) as number;
    rating = Math.min(1, Math.max(0, (avg - minRating) / (maxRating - minRating)));
  }

  let incidents = 0;
  if (stats && stats.confirmedTotal > 0) {
    incidents = Math.min(1, Math.max(0, stats.incidentsTotal / stats.confirmedTotal));
  }

  const raw =
    W.reactivity * reactivity + W.rating * rating + W.activity * (recentActivity ? 1 : 0) - W.incidents * incidents;
  return Math.min(1, Math.max(0, raw));
}

// ── Cloche de disponibilité (EF-05-06 ; CU-05-05) ────────────────────────────

/**
 * Validité d'une cloche : 7 jours — chiffre DE SPEC (CU-05-05 : « une seule [notification]
 * par cloche, valable 7 jours »), pas un paramètre PM réglable.
 */
export const ALERT_VALIDITY_DAYS = 7;

/** Une cloche se notifie UNE seule fois, avant expiration (CU-05-05). */
export function alertIsNotifiable(notifiedAt: Date | null, expiresAtMs: number, nowMs: number): boolean {
  return notifiedAt === null && nowMs < expiresAtMs;
}

// ── Pagination de la vitrine (bornes TECHNIQUES, pas des paramètres métier) ──

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/** Taille de page demandée → bornée [1;MAX_PAGE_SIZE], défaut DEFAULT_PAGE_SIZE. */
export function clampPageSize(requested?: number): number {
  if (requested === undefined || !Number.isInteger(requested) || requested < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(requested, MAX_PAGE_SIZE);
}

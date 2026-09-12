/**
 * M06 — règles métier pures de la Poignée de main & Session (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * Tous les chiffres MÉTIER (PM-07, PM-13, PM-27, PM-28, PM-29, PM-30) sont INJECTÉS
 * par les services via ParamsService — jamais codés en dur ici (RT §3). Les seules
 * constantes locales sont des chiffres DE SPEC non paramétrés (relances EF-06-08)
 * ou des bornes purement techniques (pagination).
 */

// ── Cycle de vie de la poignée de main (spec §2 ; D-007) ─────────────────────

/** `initiée → confirmée → payée` (sorties : expirée PM-07, refusée, abandonnée). */
export const HANDSHAKE_STATUSES = ["INITIATED", "CONFIRMED", "PAID", "EXPIRED", "REFUSED", "ABANDONED"] as const;
export type HandshakeStatusCode = (typeof HANDSHAKE_STATUSES)[number];

/**
 * Machine d'états de la poignée de main (spec §2) :
 * - INITIATED → CONFIRMED (EF-06-02) | REFUSED (motif court) | EXPIRED (PM-07) | ABANDONED ;
 * - CONFIRMED → PAID (EF-06-03, via webhook M13 uniquement) | EXPIRED (PM-07) | ABANDONED ;
 * - PAID / EXPIRED / REFUSED / ABANDONED : terminaux — on réinitie, on ne ressuscite pas.
 */
const HANDSHAKE_TRANSITIONS: Record<HandshakeStatusCode, readonly HandshakeStatusCode[]> = {
  INITIATED: ["CONFIRMED", "REFUSED", "EXPIRED", "ABANDONED"],
  CONFIRMED: ["PAID", "EXPIRED", "ABANDONED"],
  PAID: [],
  EXPIRED: [],
  REFUSED: [],
  ABANDONED: [],
};

/** Toute écriture de statut passe par ici ET par un updateMany conditionnel (D-046). */
export function canTransitionHandshake(from: HandshakeStatusCode, to: HandshakeStatusCode): boolean {
  return (HANDSHAKE_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Expiration paresseuse (EF-06-02/03 ; CU-06-01) — chaque étape a SA fenêtre PM-07 :
 * - INITIATED : expirée si now ≥ initiatedAt + PM-07 (le professionnel n'a pas confirmé) ;
 * - CONFIRMED : expirée si now ≥ confirmExpiresAt (le patient n'a pas payé) ;
 *   confirmExpiresAt absent sur une CONFIRMED = anomalie de données → EXPIRÉE
 *   (fail-closed : JAMAIS de paiement sans fenêtre de confirmation valide, RM-06-01) ;
 * - tout autre statut : jamais « expirable ».
 */
export function handshakeExpired(
  status: HandshakeStatusCode,
  initiatedAt: Date,
  confirmExpiresAt: Date | null,
  pm07S: number,
  nowMs: number,
): boolean {
  if (!Number.isFinite(pm07S) || pm07S <= 0) {
    throw new Error("Paramètre PM-07 invalide : durée en secondes strictement positive attendue");
  }
  if (status === "INITIATED") return nowMs >= initiatedAt.getTime() + pm07S * 1000;
  if (status === "CONFIRMED") {
    if (confirmExpiresAt === null) return true; // fail-closed (RM-06-01)
    return nowMs >= confirmExpiresAt.getTime();
  }
  return false;
}

// ── Cycle de vie de la session (spec §2 ; D-006) ─────────────────────────────

/** `en préparation → active → terminée` (sortie spéciale : remboursée D-008/EF-06-10). */
export const SESSION_STATUSES = ["PREPARING", "ACTIVE", "ENDED", "REFUNDED"] as const;
export type CareSessionStatusCode = (typeof SESSION_STATUSES)[number];

/**
 * - PREPARING → ACTIVE (pré-consultation D-019, ou démarrage auto PM-28) | REFUNDED (annulation EF-06-10) ;
 * - ACTIVE → ENDED (décompteur épuisé) | REFUNDED (annulation EF-06-10 avant tout message du pro) ;
 * - ENDED → REFUNDED (D-008 : aucun message du professionnel) ;
 * - REFUNDED : terminal.
 */
const SESSION_TRANSITIONS: Record<CareSessionStatusCode, readonly CareSessionStatusCode[]> = {
  PREPARING: ["ACTIVE", "REFUNDED"],
  ACTIVE: ["ENDED", "REFUNDED"],
  ENDED: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransitionSession(from: CareSessionStatusCode, to: CareSessionStatusCode): boolean {
  return (SESSION_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * EF-06-04 : démarrage automatique — une session PREPARING dont paidAt + PM-28 ≤ now
 * doit passer ACTIVE (appliqué paresseusement à toute lecture/écriture).
 */
export function autoStartDue(paidAtMs: number, pm28S: number, nowMs: number): boolean {
  if (!Number.isFinite(pm28S) || pm28S <= 0) {
    throw new Error("Paramètre PM-28 invalide : durée en secondes strictement positive attendue");
  }
  return nowMs >= paidAtMs + pm28S * 1000;
}

/**
 * RM-06-02 / D-025 : le décompteur est calculé par le SERVEUR — les horloges clientes
 * sont indicatives. endsAt absent (session pas encore démarrée) ou dépassé → 0.
 * Arrondi au plafond : tant qu'il reste une fraction de seconde, elle compte.
 */
export function sessionRemainingSeconds(endsAt: Date | null, nowMs: number): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt.getTime() - nowMs) / 1000));
}

// ── Départ du décompteur (EF-06-04, revu au chantier 104) ────────────────────

/**
 * Ce message ouvre-t-il la séance ?
 *
 * ── ⚠️ La règle, et ce qu'elle protège ────────────────────────────────────────────────────────
 *
 * Décision du porteur (12/09/2026), qui remplace la pré-consultation : *« la séance démarre quand le
 * patient ouvre la conversation et écrit le premier message — même si le médecin envoie un tas de
 * messages, le compteur ne démarre pas tant que le patient n'écrit pas. »*
 *
 * C'est l'intention d'EF-06-04 rendue plus juste. La règle disait « le décompteur ne démarre qu'à la
 * transmission » : elle protégeait les minutes payées d'un patient qui n'est pas encore là. Elle les
 * protège mieux maintenant — *le patient n'a plus à remplir un formulaire pour signaler qu'il est
 * prêt : il lui suffit de parler.*
 *
 * ⚠️ **Et les messages du SOIGNANT n'ouvrent rien.** Il peut écrire pendant la préparation — saluer,
 * demander depuis quand — sans qu'une seule minute payée soit consommée. *Le temps appartient au
 * patient : personne d'autre ne peut décider qu'il commence.*
 *
 * ⚠️ Le filet de PM-28 reste ailleurs : dix minutes après le paiement, la séance démarre seule.
 * Sans lui, un patient qui paie puis disparaît laisserait la séance ouverte indéfiniment.
 */
export function messageOuvreLaSeance(
  status: "PREPARING" | "ACTIVE" | "ENDED" | "REFUNDED",
  senderId: string,
  patientAccountId: string,
): boolean {
  return status === "PREPARING" && senderId === patientAccountId;
}

// ── Prolongation gratuite (EF-06-07 ; D-016) ─────────────────────────────────

/**
 * À la seule initiative du professionnel ; pas de pas imposé, mais une durée entière
 * strictement positive, et un CUMUL plafonné à PM-29 secondes (≤ inclusif : on peut
 * atteindre exactement le plafond). Le service rejoue cette condition en updateMany
 * conditionnel (compare-and-swap sur extensionTotalSec, D-046).
 *
 * ── ⚠️ PM-29 à ZÉRO = aucun plafond (chantier 103, 12/09/2026) ────────────────────────────────
 *
 * Décision du porteur : *« pour le prolongement, le médecin a le droit d'ajouter autant de minutes »*.
 *
 * Le plafond n'est pas RETIRÉ du code — il devient une valeur. Zéro veut dire « sans limite ». Deux
 * raisons de faire ainsi plutôt que d'effacer la règle :
 *
 *   • la décision reste **réversible depuis l'écran d'administration**, sans nous ni déploiement ;
 *   • D-016 avait posé ce plafond pour une raison ; l'effacer du code effacerait la question avec.
 *     *Une règle qu'on désactive se rediscute ; une règle qu'on supprime s'oublie.*
 *
 * ⚠️ **Une valeur NÉGATIVE reste une erreur** : elle signifierait « plafond impossible », c'est-à-dire
 * une prolongation jamais permise sans que personne l'ait décidé. On préfère l'exception au silence.
 */
export function canExtend(extensionTotalSec: number, addSec: number, pm29S: number): boolean {
  if (!Number.isFinite(pm29S) || pm29S < 0) {
    throw new Error("Paramètre PM-29 invalide : plafond en secondes positif attendu (0 = sans limite)");
  }
  if (!Number.isInteger(addSec) || addSec <= 0) return false;
  if (!Number.isInteger(extensionTotalSec) || extensionTotalSec < 0) return false;
  if (pm29S === 0) return true;
  return extensionTotalSec + addSec <= pm29S;
}

// ── Compte-rendu (EF-06-08 ; D-021, RM-06-04) ────────────────────────────────

/**
 * Fenêtre de dépôt du compte-rendu : pendant la session (endedAt null → toujours ouverte)
 * et jusqu'à PM-30 STRICTEMENT après la fin (now ≥ endedAt + PM-30 → gains gelés, CU-06-03).
 */
export function reportWindowOpen(endedAt: Date | null, pm30S: number, nowMs: number): boolean {
  if (!Number.isFinite(pm30S) || pm30S <= 0) {
    throw new Error("Paramètre PM-30 invalide : durée en secondes strictement positive attendue");
  }
  if (endedAt === null) return true; // session encore active : rédigeable pendant la session
  return nowMs < endedAt.getTime() + pm30S * 1000;
}

/**
 * Relances automatiques du compte-rendu à 12 h et 23 h après la fin (EF-06-08).
 * Chiffres DE SPEC (relatifs à PM-30 = 24 h), non référencés au paramétrage PM —
 * comme ALERT_VALIDITY_DAYS en M05. En secondes.
 */
export const REPORT_REMINDER_OFFSETS_S: readonly number[] = [12 * 3600, 23 * 3600];

/**
 * Une échéance (endedAt + offset) est « due » si elle tombe dans la fenêtre de balayage
 * (now − windowS, now]. La déduplication repose sur le CADENCEMENT du cron (M16) aligné
 * sur windowS — il n'existe pas de table de relances (voir remindMissingReports, documenté).
 */
export function reminderDue(endedAtMs: number, offsetS: number, windowS: number, nowMs: number): boolean {
  if (!Number.isFinite(windowS) || windowS <= 0) {
    throw new Error("Fenêtre de balayage invalide : durée en secondes strictement positive attendue");
  }
  const dueAtMs = endedAtMs + offsetS * 1000;
  return dueAtMs <= nowMs && dueAtMs > nowMs - windowS * 1000;
}

// ── Remboursement automatique (EF-06-09 ; D-008 — INVARIANT N°9) ─────────────

/**
 * D-008 : session terminée sans AUCUN message du professionnel → remboursement intégral.
 * Un seul message du professionnel (même un simple « Bonjour », risque documenté spec §9)
 * suffit à annuler le remboursement automatique — garde-fous : notation + signalement.
 */
export function refundRequired(messages: ReadonlyArray<{ senderId: string }>, professionalId: string): boolean {
  return messages.every((m) => m.senderId !== professionalId);
}

// ── Notation (EF-06-11 ; PM-13, D-021) ───────────────────────────────────────

/**
 * Note ENTIÈRE dans l'échelle PM-13 (« min,max », injectée via getIntList).
 * Bornes corrompues (seed) → erreur franche : on ne valide jamais à l'aveugle.
 */
export function ratingValid(score: number, bounds: readonly number[]): boolean {
  if (bounds.length < 2) throw new Error("Paramètre PM-13 invalide : liste « min,max » attendue");
  const [min, max] = bounds;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
    throw new Error("Paramètre PM-13 invalide : bornes entières min < max attendues");
  }
  return Number.isInteger(score) && score >= min && score <= max;
}

// ── Messages de session (EF-06-05 ; RM-06-03) ────────────────────────────────

/** Types de message — alignés sur l'enum Prisma SessionMessageKind (D3). */
export const SESSION_MESSAGE_KINDS = ["TEXT", "PHOTO", "VOICE", "DOCUMENT"] as const;
export type SessionMessageKindCode = (typeof SESSION_MESSAGE_KINDS)[number];

/**
 * Cohérence contenu/type : un TEXT exige un corps non vide ; photo / note vocale /
 * document exigent une clé de fichier (le corps reste possible en légende).
 */
export function messageContentValid(
  kind: SessionMessageKindCode,
  body: string | null | undefined,
  fileKey: string | null | undefined,
): boolean {
  const hasBody = typeof body === "string" && body.trim().length > 0;
  const hasFile = typeof fileKey === "string" && fileKey.trim().length > 0;
  if (kind === "TEXT") return hasBody;
  return hasFile;
}

// ── Fiche anonymisée (EF-06-01) ──────────────────────────────────────────────

/** Âge révolu en années — la notification d'initiation ne porte que prénom + âge. */
export function ageInYears(birthDate: Date, now: Date): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const anniversaryPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!anniversaryPassed) age -= 1;
  return Math.max(0, age);
}

// ── Référence d'ordre C1 (RM-13-01 : opaque pour M13, structurée pour M06) ───

export const HANDSHAKE_ORDER_REF_PREFIX = "handshake:";

/** Référence du PREMIER essai de paiement d'une poignée de main. */
export function orderRefForHandshake(handshakeId: string): string {
  return `${HANDSHAKE_ORDER_REF_PREFIX}${handshakeId}`;
}

/**
 * Nouvel ESSAI après un échec (EF-06-03 : « échec → nouvel essai dans la fenêtre ») :
 * M13 considère FAILED comme terminal (un nouvel essai = un NOUVEL ordre), donc M06
 * suffixe la référence. La seconde est la granularité d'idempotence du retry : deux
 * double-clics dans la même seconde produisent le MÊME ordre (RM-13-04).
 */
export function retryOrderRefForHandshake(handshakeId: string, nowMs: number): string {
  return `${HANDSHAKE_ORDER_REF_PREFIX}${handshakeId}:r${Math.floor(nowMs / 1000)}`;
}

/**
 * Identifiant de poignée de main porté par une référence d'ordre — null si la référence
 * vient d'un autre module (dévoilement M12…) : le webhook M13 est partagé (C1).
 */
export function handshakeIdFromOrderRef(orderRef: string): string | null {
  if (!orderRef.startsWith(HANDSHAKE_ORDER_REF_PREFIX)) return null;
  const rest = orderRef.slice(HANDSHAKE_ORDER_REF_PREFIX.length);
  const sep = rest.indexOf(":");
  const id = sep === -1 ? rest : rest.slice(0, sep);
  return id.length > 0 ? id : null;
}

// ── Pagination (bornes TECHNIQUES, pas des paramètres métier) ────────────────

export const DEFAULT_MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_PAGE_SIZE = 100;

/** Taille de page demandée → bornée [1;MAX], défaut DEFAULT. */
export function clampMessagePageSize(requested?: number): number {
  if (requested === undefined || !Number.isInteger(requested) || requested < 1) return DEFAULT_MESSAGE_PAGE_SIZE;
  return Math.min(requested, MAX_MESSAGE_PAGE_SIZE);
}

// ── Compteur de retard du soignant (D-032) ───────────────────────────────────
/** Tolérance : le soignant a droit à 30 s entre deux messages avant que le retard ne soit comptabilisé. */
export const PROFESSIONAL_DELAY_TOLERANCE_SEC = 30;

/**
 * Retard CUMULÉ du soignant (secondes), mesuré sur les écarts entre deux messages consécutifs :
 * pour chaque message ENVOYÉ PAR LE SOIGNANT précédé d'un écart > tolérance, on ajoute l'excédent
 * (écart − tolérance). Ex : si le soignant répond après 45 s, +15 s ; après 31 s, +1 s. (D-032)
 */
export function accumulatedProfessionalDelaySec(
  messages: ReadonlyArray<{ senderId: string; createdAt: Date }>,
  professionalId: string,
  toleranceSec: number = PROFESSIONAL_DELAY_TOLERANCE_SEC,
): number {
  const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let acc = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].senderId !== professionalId) continue;
    /*
      ⚠️ **On ne compte que si le PATIENT attendait** (corrigé au chantier 93, 11/09/2026).

      La version d'origine comptait tout écart précédant un message du soignant — y compris quand
      le message précédent était **le sien**. Un soignant qui écrit « Bonjour », réfléchit dix
      minutes, puis ajoute son analyse, se voyait facturer neuf minutes et demie de « retard »
      alors que personne n'attendait.

      Mesuré sur une consultation réelle le 11/09 : **1 930 s affichés, dont 1 840 s (95 %)
      venaient des messages du soignant après ses propres messages.** Le patient n'avait
      réellement attendu que 90 s.

      Le commentaire d'origine disait déjà la règle juste — « si le soignant **répond** après
      45 s » : *répondre, c'est répondre à quelqu'un*. Le code, lui, mesurait autre chose.

      *Quand un commentaire et son code divergent, c'est presque toujours le commentaire qui dit
      l'intention et le code qui a dérivé.*
    */
    if (sorted[i - 1].senderId === professionalId) continue;
    const gapSec = (sorted[i].createdAt.getTime() - sorted[i - 1].createdAt.getTime()) / 1000;
    if (gapSec > toleranceSec) acc += Math.floor(gapSec - toleranceSec);
  }
  return acc;
}

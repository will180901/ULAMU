/**
 * M13 — règles financières pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M13_paiements_gains.md
 * RM-13-01 : l'Argent est aveugle — aucune entité métier ici, uniquement des montants,
 * des références opaques et des machines d'états.
 */

// ── Opérateurs Mobile Money (EF-13-01) ───────────────────────────────────────

export type MomoOperatorCode = "MTN_MOMO" | "AIRTEL_MONEY";

export const MOMO_OPERATORS: readonly MomoOperatorCode[] = ["MTN_MOMO", "AIRTEL_MONEY"];

/** L'opérateur est un paramètre EXPLICITE de l'ordre — jamais déduit du préfixe téléphone. */
export function operatorIsValid(operator: string): operator is MomoOperatorCode {
  return (MOMO_OPERATORS as readonly string[]).includes(operator);
}

// ── Montants ─────────────────────────────────────────────────────────────────

/** Tout montant M13 est un entier strictement positif de francs CFA (pas de centimes au XAF). */
export function amountIsValid(amountXaf: number): boolean {
  return Number.isInteger(amountXaf) && amountXaf > 0;
}

// ── Répartition (EF-13-02) ───────────────────────────────────────────────────

export interface SplitAmounts {
  grossXaf: number;
  commissionXaf: number;
  netXaf: number;
}

/**
 * Répartition d'un encaissement :
 * - avec bénéficiaire : commission ULAMU = arrondi(montant × taux % ) (PM-01 injecté par
 *   l'appelant — jamais de chiffre en dur, RT §3), net = montant − commission.
 *   L'arrondi porte UNIQUEMENT sur la commission : la somme commission + net est
 *   exactement égale au montant encaissé — aucun franc ne se perd (EF-13-09, chaque franc rapproché) ;
 * - sans bénéficiaire (dévoilement, PM-03) : 100 % ULAMU — commission = montant, net = 0 (EF-13-02).
 */
export function computeSplit(amountXaf: number, commissionPct: number, hasBeneficiary: boolean): SplitAmounts {
  if (!amountIsValid(amountXaf)) {
    throw new Error("Montant invalide : entier strictement positif de XAF attendu");
  }
  if (!hasBeneficiary) {
    return { grossXaf: amountXaf, commissionXaf: amountXaf, netXaf: 0 };
  }
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    throw new Error("Taux de commission invalide : pourcentage entre 0 et 100 attendu (PM-01)");
  }
  const commissionXaf = Math.round((amountXaf * commissionPct) / 100);
  return { grossXaf: amountXaf, commissionXaf, netXaf: amountXaf - commissionXaf };
}

// ── Reçus (EF-13-05, D-010) ──────────────────────────────────────────────────

/**
 * Numéro de reçu lisible : "RC-<année>-<séquence sur 6 chiffres>".
 * La séquence vient de l'autoincrément base (Receipt.seq) — unicité garantie par la base,
 * le numéro n'est qu'une mise en forme déterministe (au-delà de 999 999 : pas de troncature).
 */
export function receiptNumber(year: number, seq: number): string {
  if (!Number.isInteger(year) || year < 2000) throw new Error("Année de reçu invalide");
  if (!Number.isInteger(seq) || seq < 1) throw new Error("Séquence de reçu invalide");
  return `RC-${year}-${String(seq).padStart(6, "0")}`;
}

// ── Machine d'états du paiement (EF-13-01/04/08) ─────────────────────────────

export type PaymentStatusCode = "INITIATED" | "SUCCEEDED" | "FAILED" | "REFUNDED";

/**
 * - INITIATED → SUCCEEDED (le payeur confirme sur son téléphone, CU-13-01) ;
 * - INITIATED → FAILED (refus ou délai opérateur — le module demandeur décide de la suite, EF-13-08) ;
 * - SUCCEEDED → REFUNDED (ordre de remboursement, EF-13-04 / EF-13-10) ;
 * - FAILED et REFUNDED : terminaux — un nouvel essai est un NOUVEL ordre du module demandeur.
 */
const PAYMENT_TRANSITIONS: Record<PaymentStatusCode, readonly PaymentStatusCode[]> = {
  INITIATED: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

/** Toute écriture de statut de paiement passe par ici (et par un updateMany conditionnel en base). */
export function canTransitionPayment(from: PaymentStatusCode, to: PaymentStatusCode): boolean {
  return (PAYMENT_TRANSITIONS[from] ?? []).includes(to);
}

/** Cible de la transition décidée par le webhook agrégateur (EF-13-01). */
export function chargeResultTarget(ok: boolean): PaymentStatusCode {
  return ok ? "SUCCEEDED" : "FAILED";
}

// ── Écritures conditionnelles (anti-TOCTOU, D-046) ──────────────────────────
// Ces prédicats SONT les clauses `where` des updateMany du service : si le prédicat est
// faux au moment de l'écriture, count === 0 → no-op idempotent (RM-13-04). Les tests du
// .spec rejouent chaque opération pour vérifier qu'un second passage est sans effet.

/**
 * Capture d'une part (EF-13-03) : seulement si elle n'est NI déjà capturée NI contre-passée.
 * → `updateMany where { paymentId, capturedAt: null, reversedAt: null }`.
 */
export function splitIsCapturable(capturedAt: Date | null, reversedAt: Date | null): boolean {
  return capturedAt === null && reversedAt === null;
}

/**
 * Débit d'un retrait (EF-13-07) : solde vérifié AU MOMENT du débit, dans la transaction.
 * → `updateMany where { id, availableXaf: { gte: amountXaf } }`.
 */
export function withdrawalDebitAllowed(availableXaf: number, amountXaf: number): boolean {
  return amountIsValid(amountXaf) && availableXaf >= amountXaf;
}

// ── Retraits (EF-13-07, PM-02) ───────────────────────────────────────────────

/** Commission ULAMU sur retrait — PM-02 injecté (0 % en D-022, mais JAMAIS codé en dur). */
export function withdrawalFee(amountXaf: number, pm02Pct: number): number {
  if (!amountIsValid(amountXaf)) throw new Error("Montant de retrait invalide");
  if (!Number.isFinite(pm02Pct) || pm02Pct < 0 || pm02Pct > 100) {
    throw new Error("Taux de commission de retrait invalide (PM-02)");
  }
  return Math.round((amountXaf * pm02Pct) / 100);
}

// ── Remboursements manuels (EF-13-10, RM-13-06) ──────────────────────────────

/** Double validation exigée STRICTEMENT au-delà du seuil PM-35 (« au-delà de PM-35 »). */
export function needsSecondApproval(amountXaf: number, pm35ThresholdXaf: number): boolean {
  return amountXaf > pm35ThresholdXaf;
}

/** RM-13-06 : l'approbateur doit être un admin DISTINCT du demandeur. */
export function canSecondApprove(requestedBy: string, approverId: string): boolean {
  return requestedBy !== approverId && approverId.length > 0;
}

// ── Retraits orphelins (chantier 50) ─────────────────────────────────────────

/**
 * ── Le trou que ces deux règles bouchent ──────────────────────────────────────
 *
 * `confirmWithdrawal` débite le solde dans une première transaction, appelle l'agrégateur HORS
 * transaction (RM-13-03 — on ne tient pas une transaction ouverte pendant un appel réseau), puis
 * conclut dans une seconde. **Si le processus meurt entre les deux, l'argent est débité et rien ne
 * le sait** : le retrait reste `PENDING` avec son `aggregatorRef` posé, l'utilisateur ne peut plus
 * réessayer, la réconciliation ne lit que les `EXECUTED`, et aucune route ne débloque.
 *
 * Le plan gratuit de Render endort le service après ~15 min et le redémarre à la demande.
 */

/**
 * Ce retrait est-il orphelin — c'est-à-dire débité, mais jamais soldé ?
 *
 * La signature est précise, et la distinction vaut de l'argent : un `PENDING` **sans**
 * `aggregatorRef` n'a rien débité, il attend seulement le mot de passe et l'OTP de son propriétaire.
 * Le ramasser serait annuler un retrait que personne n'a abandonné.
 *
 * Le délai n'est pas une politesse : il évite d'attraper un `confirmWithdrawal` encore en vol.
 */
export function isOrphanWithdrawal(
  status: string,
  aggregatorRef: string | null,
  requestedAtMs: number,
  nowMs: number,
  delayMs: number,
): boolean {
  return status === "PENDING" && aggregatorRef !== null && nowMs - requestedAtMs >= delayMs;
}

/**
 * Que faire d'un retrait orphelin ? **On ne devine pas : on lit le relevé de l'agrégateur.**
 *
 * Re-créditer un retrait dont le virement est effectivement parti paierait DEUX FOIS le soignant —
 * et personne ne s'en apercevrait avant la réconciliation du lendemain, voire jamais si le montant
 * se noie dans le flux. La présence d'une ligne `PAYOUT` portant cette référence est donc la SEULE
 * chose qui autorise à solder sans re-créditer.
 *
 * `"ATTENDRE"` quand le relevé est illisible : ne rien faire est le seul choix sûr, et le prochain
 * passage réessaiera.
 */
export function decideOrphanWithdrawal(
  aggregatorRef: string | null,
  payoutRefs: readonly string[] | null,
): "SOLDER" | "RECREDITER" | "ATTENDRE" {
  if (payoutRefs === null) return "ATTENDRE"; // relevé indisponible : on ne décide pas sans lui
  if (aggregatorRef === null) return "ATTENDRE"; // pas orphelin, rien à décider
  return payoutRefs.includes(aggregatorRef) ? "SOLDER" : "RECREDITER";
}

// ── Titulaires de gains (EF-13-06) ───────────────────────────────────────────

/**
 * Le TYPE garde `FACILITY` : c'est une colonne de base (`EarningsAccount.holderType`), et l'en
 * retirer demanderait une migration sur la production. Il décrit ce que le serveur peut LIRE.
 */
export type EarningsHolderTypeCode = "PROFESSIONAL" | "FACILITY";

/**
 * La liste ACCEPTÉE en entrée, en revanche, se réduit à `PROFESSIONAL` le 03/09/2026 (dette n°17).
 *
 * ── La distinction qui compte ─────────────────────────────────────────────────────────────────
 *
 * Un type dit ce qu'on peut **relire**. Cette liste dit ce qu'on accepte de **recevoir**. Les deux
 * se confondaient jusqu'ici, et c'est ce qui laissait une route ouverte sur un cas mort.
 *
 * Plus aucun compte `FACILITY_MEMBER` ne peut naître (D-051), et l'inventaire de la base de
 * production a confirmé le 03/09 : **zéro compte de gains de type FACILITY**, zéro adhésion. Une
 * requête `holderType=FACILITY` ne pouvait donc que se faire refuser après trois requêtes en base.
 * Elle est désormais refusée à la porte, par la validation, avec un message qui dit quoi envoyer.
 */
export const EARNINGS_HOLDER_TYPES: readonly EarningsHolderTypeCode[] = ["PROFESSIONAL"];

/**
 * Tests des règles M13 — critères d'acceptation CU-13-01/02/03/04 et RM-13-04/06
 * (arrondis EF-13-02, reçus EF-13-05, machine d'états EF-13-01/04, idempotence D-046).
 */
import {
  amountIsValid,
  canSecondApprove,
  canTransitionPayment,
  chargeResultTarget,
  computeSplit,
  decideOrphanWithdrawal,
  isOrphanWithdrawal,
  needsSecondApproval,
  operatorIsValid,
  receiptNumber,
  splitIsCapturable,
  withdrawalDebitAllowed,
  withdrawalFee,
} from "./m13.policies";

describe("Opérateur Mobile Money explicite (EF-13-01)", () => {
  it.each([
    ["MTN_MOMO", true],
    ["AIRTEL_MONEY", true],
    ["ORANGE_MONEY", false], // opérateur absent du Congo-Brazzaville côté ULAMU
    ["mtn_momo", false], // identifiants stables, sensibles à la casse
    ["", false],
  ])("%s → %s", (op, ok) => {
    expect(operatorIsValid(op)).toBe(ok);
  });
});

describe("Montants en XAF entiers (RM-13-02 : le journal est exact)", () => {
  it.each([
    [5000, true],
    [1, true],
    [0, false],
    [-500, false],
    [10.5, false], // pas de centimes au XAF
    [Number.NaN, false],
  ])("%p → %s", (amount, ok) => {
    expect(amountIsValid(amount as number)).toBe(ok);
  });
});

describe("Répartition computeSplit (EF-13-02, PM-01)", () => {
  it("5 000 XAF à 10 % → commission 500, net 4 500 (CU-13-01)", () => {
    expect(computeSplit(5000, 10, true)).toEqual({ grossXaf: 5000, commissionXaf: 500, netXaf: 4500 });
  });

  it("333 XAF à 10 % → arrondi : commission 33, net 300 — somme exacte", () => {
    expect(computeSplit(333, 10, true)).toEqual({ grossXaf: 333, commissionXaf: 33, netXaf: 300 });
  });

  it("montant impair 335 XAF à 10 % → 33,5 arrondi à 34, net 301 — somme exacte", () => {
    expect(computeSplit(335, 10, true)).toEqual({ grossXaf: 335, commissionXaf: 34, netXaf: 301 });
  });

  it("petit montant 5 XAF à 10 % → commission 1 (arrondi de 0,5), net 4", () => {
    expect(computeSplit(5, 10, true)).toEqual({ grossXaf: 5, commissionXaf: 1, netXaf: 4 });
  });

  it("invariant : commission + net == montant pour TOUT montant (chaque franc rapproché, EF-13-09)", () => {
    for (let amount = 1; amount <= 2000; amount++) {
      const split = computeSplit(amount, 10, true);
      expect(split.commissionXaf + split.netXaf).toBe(amount);
      expect(split.netXaf).toBeGreaterThanOrEqual(0);
    }
  });

  it("sans bénéficiaire (dévoilement, PM-03) : 100 % ULAMU — commission = montant, net = 0", () => {
    expect(computeSplit(500, 10, false)).toEqual({ grossXaf: 500, commissionXaf: 500, netXaf: 0 });
  });

  it("rejette les montants invalides (entier > 0 exigé)", () => {
    expect(() => computeSplit(0, 10, true)).toThrow(/Montant invalide/);
    expect(() => computeSplit(-100, 10, true)).toThrow(/Montant invalide/);
    expect(() => computeSplit(99.9, 10, true)).toThrow(/Montant invalide/);
  });

  it("rejette un taux hors [0;100] (PM-01 corrompu)", () => {
    expect(() => computeSplit(1000, -1, true)).toThrow(/Taux de commission invalide/);
    expect(() => computeSplit(1000, 101, true)).toThrow(/Taux de commission invalide/);
  });
});

describe("Numéro de reçu (EF-13-05, D-010)", () => {
  it("format RC-<année>-<seq 6 chiffres>", () => {
    expect(receiptNumber(2026, 1)).toBe("RC-2026-000001");
    expect(receiptNumber(2026, 999999)).toBe("RC-2026-999999");
  });
  it("au-delà de 999 999 : pas de troncature (unicité avant esthétique)", () => {
    expect(receiptNumber(2027, 1234567)).toBe("RC-2027-1234567");
  });
  it("rejette année ou séquence invalides", () => {
    expect(() => receiptNumber(1999, 1)).toThrow(/Année/);
    expect(() => receiptNumber(2026, 0)).toThrow(/Séquence/);
    expect(() => receiptNumber(2026, -3)).toThrow(/Séquence/);
  });
});

describe("Machine d'états du paiement (EF-13-01/04/08)", () => {
  it.each([
    ["INITIATED", "SUCCEEDED", true], // confirmation téléphone (CU-13-01)
    ["INITIATED", "FAILED", true], // refus / délai opérateur
    ["SUCCEEDED", "REFUNDED", true], // ordre de remboursement (EF-13-04)
    ["INITIATED", "REFUNDED", false], // on ne rembourse pas un paiement non confirmé
    ["SUCCEEDED", "SUCCEEDED", false], // rejeu de webhook = no-op (RM-13-04)
    ["FAILED", "SUCCEEDED", false], // FAILED est terminal : un retry = un NOUVEL ordre
    ["REFUNDED", "SUCCEEDED", false],
    ["REFUNDED", "REFUNDED", false], // remboursement rejoué = no-op
  ] as const)("%s → %s : %s", (from, to, ok) => {
    expect(canTransitionPayment(from, to)).toBe(ok);
  });

  it("le webhook vise SUCCEEDED si ok, FAILED sinon", () => {
    expect(chargeResultTarget(true)).toBe("SUCCEEDED");
    expect(chargeResultTarget(false)).toBe("FAILED");
  });
});

describe("Idempotence logique des écritures conditionnelles (RM-13-04, D-046)", () => {
  // Chaque prédicat est la clause `where` d'un updateMany : rejouer l'opération après
  // qu'elle a réussi rend le prédicat faux → count === 0 → aucun second effet.

  it("webhook rejoué : la transition INITIATED→SUCCEEDED ne passe qu'une fois", () => {
    // 1er passage : updateMany where { status: INITIATED } — la transition est légale.
    expect(canTransitionPayment("INITIATED", chargeResultTarget(true))).toBe(true);
    // Rejeu : le paiement est déjà SUCCEEDED — count === 0, pas de second reçu ni double crédit.
    expect(canTransitionPayment("SUCCEEDED", chargeResultTarget(true))).toBe(false);
  });

  it("capture rejouée : updateMany where { capturedAt: null, reversedAt: null }", () => {
    expect(splitIsCapturable(null, null)).toBe(true); // 1er passage : capture + crédit
    expect(splitIsCapturable(new Date(), null)).toBe(false); // rejeu : déjà capturée → no-op
    expect(splitIsCapturable(null, new Date())).toBe(false); // contre-passée (remboursée avant capture) → jamais créditée
    expect(splitIsCapturable(new Date(), new Date())).toBe(false);
  });

  it("retrait : débit conditionnel where { availableXaf: { gte: montant } }, revérifié DANS la transaction", () => {
    // CU-13-04 : solde 47 000, retrait 40 000 → débit possible une seule fois.
    expect(withdrawalDebitAllowed(47000, 40000)).toBe(true);
    // Rejeu après débit : solde 7 000 < 40 000 → count === 0, pas de double débit.
    expect(withdrawalDebitAllowed(7000, 40000)).toBe(false);
    // Solde exactement égal au montant : autorisé (gte).
    expect(withdrawalDebitAllowed(40000, 40000)).toBe(true);
    expect(withdrawalDebitAllowed(40000, 0)).toBe(false); // montant invalide
  });
});

describe("Commission de retrait (EF-13-07, PM-02)", () => {
  it("PM-02 = 0 % → aucun frais ULAMU", () => {
    expect(withdrawalFee(40000, 0)).toBe(0);
  });
  it("résiste à un futur PM-02 non nul (arrondi)", () => {
    expect(withdrawalFee(333, 1)).toBe(3); // 3,33 → 3
  });
  it("rejette montant ou taux invalides", () => {
    expect(() => withdrawalFee(0, 0)).toThrow(/invalide/);
    expect(() => withdrawalFee(1000, -1)).toThrow(/PM-02/);
  });
});

describe("Remboursement manuel : double validation (EF-13-10, RM-13-06, PM-35)", () => {
  const PM35 = 50000; // valeur seedée — injectée ici comme en production (ParamsService)

  it("au seuil exact : pas de double validation (« au-delà de PM-35 » = strictement supérieur)", () => {
    expect(needsSecondApproval(50000, PM35)).toBe(false);
  });
  it("au-delà du seuil : double validation exigée", () => {
    expect(needsSecondApproval(50001, PM35)).toBe(true);
  });
  it("sous le seuil : exécution directe tracée", () => {
    expect(needsSecondApproval(4999, PM35)).toBe(false);
  });

  it("l'approbateur doit être différent du demandeur (RM-13-06)", () => {
    expect(canSecondApprove("admin-a", "admin-b")).toBe(true);
    expect(canSecondApprove("admin-a", "admin-a")).toBe(false);
    expect(canSecondApprove("admin-a", "")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Retraits orphelins — chantier 50, 06/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Le trou que ces tests gardent ─────────────────────────────────────────────────────────────

  `confirmWithdrawal` débite le solde dans une transaction, appelle l'agrégateur HORS transaction
  (RM-13-03 — on ne tient pas une transaction ouverte pendant un appel réseau), puis conclut dans
  une seconde. **Si le processus meurt entre les deux, l'argent est débité et rien ne le sait.**

  Le retrait reste `PENDING` avec son `aggregatorRef` posé, et rien ne le rattrapait : l'utilisateur
  ne peut pas réessayer (la revendication exige `aggregatorRef: null`), la réconciliation ne lit que
  les `EXECUTED`, aucune route d'administration ne débloque, et le retrait **empêche même la clôture
  du compte**. Le plan gratuit de Render endort le service après ~15 min : un redémarrage suffit.

  ⚠️ **Le danger du remède est pire que le mal.** Re-créditer un retrait dont le virement est
  effectivement parti paierait DEUX FOIS — et personne ne le verrait avant la réconciliation du
  lendemain, voire jamais. C'est ce que la seconde règle interdit, et c'est LE test de ce bloc.
*/
describe("Retraits orphelins — repérage (chantier 50)", () => {
  const QUART_HEURE = 15 * 60 * 1000;
  const MAINTENANT = 1_757_000_000_000;

  it("un retrait revendiqué et vieux est orphelin", () => {
    expect(isOrphanWithdrawal("PENDING", "ref-1", MAINTENANT - QUART_HEURE, MAINTENANT, QUART_HEURE)).toBe(true);
  });

  /*
    LA distinction qui vaut de l'argent. Un `PENDING` SANS `aggregatorRef` n'a **rien débité** : il
    attend le mot de passe et l'OTP de son propriétaire. Le ramasser annulerait un retrait que
    personne n'a abandonné — et le soignant verrait sa demande disparaître sans explication.
  */
  it("un retrait PENDING sans référence n’a rien débité : jamais orphelin", () => {
    expect(isOrphanWithdrawal("PENDING", null, MAINTENANT - 10 * QUART_HEURE, MAINTENANT, QUART_HEURE)).toBe(false);
  });

  /* Le délai protège un `confirmWithdrawal` encore en vol : l'appel agrégateur dure des secondes. */
  it("un retrait revendiqué à l’instant n’est pas encore orphelin", () => {
    expect(isOrphanWithdrawal("PENDING", "ref-1", MAINTENANT - 1_000, MAINTENANT, QUART_HEURE)).toBe(false);
  });

  it.each(["EXECUTED", "FAILED"])("un retrait déjà soldé (%s) n’est pas orphelin", (statut) => {
    expect(isOrphanWithdrawal(statut, "ref-1", MAINTENANT - 10 * QUART_HEURE, MAINTENANT, QUART_HEURE)).toBe(false);
  });
});

describe("Retraits orphelins — décision (chantier 50)", () => {
  /*
    ── LE test du chantier ───────────────────────────────────────────────────────────────────

    Le virement EST parti. Re-créditer paierait le soignant deux fois : une fois par l'agrégateur,
    une fois par le solde. C'est le relevé — et lui seul — qui l'interdit.
  */
  it("le virement est au relevé : on SOLDE, on ne re-crédite pas", () => {
    expect(decideOrphanWithdrawal("ref-1", ["ref-1", "ref-2"])).toBe("SOLDER");
  });

  it("le virement est absent du relevé : l’argent revient au soignant", () => {
    expect(decideOrphanWithdrawal("ref-1", ["ref-2", "ref-3"])).toBe("RECREDITER");
  });

  it("relevé vide : rien n’est parti, donc on re-crédite", () => {
    expect(decideOrphanWithdrawal("ref-1", [])).toBe("RECREDITER");
  });

  /*
    Le cas qu'on oublie, et le seul où ne rien faire est la bonne réponse. Sans relevé, les deux
    décisions sont dangereuses : solder à tort vole le soignant, re-créditer à tort le paie deux
    fois. On attend le prochain passage — le retrait reste visible dans `scripts/etat-retraits.ts`.
  */
  it("relevé illisible : on n’en décide RIEN", () => {
    expect(decideOrphanWithdrawal("ref-1", null)).toBe("ATTENDRE");
  });

  it("sans référence, il n’y a rien à décider", () => {
    expect(decideOrphanWithdrawal(null, ["ref-1"])).toBe("ATTENDRE");
  });
});

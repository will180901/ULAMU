/**
 * Tests des règles M07 — EF-07-03 (fiche synthèse calculée), EF-07-04/RM-07-02
 * (corrections par remplacement), EF-07-06 (types déclarables), EF-07-09/PM-16
 * (majorité du sous-profil), pagination et garde-fou de taille (ENF-02).
 */
import {
  canSupersede,
  CLAIM_CODE_ALPHABET,
  clampRecordPageSize,
  computeSummary,
  declaredPayloadSizeOk,
  formatClaimCode,
  isOwnerAdult,
  isPatientDeclarable,
  MAX_DECLARED_PAYLOAD_BYTES,
  normalizeClaimCode,
  PATIENT_DECLARABLE_TYPES,
  RECORD_ENTRY_TYPES,
  RECORD_PAGE_DEFAULT,
  RECORD_PAGE_MAX,
  SummaryEntryInput,
  supersededIdSet,
} from "./m07.policies";

/** Fabrique d'entrée de synthèse — défauts raisonnables, surcharge à la carte. */
function entry(partial: Partial<SummaryEntryInput> & { id: string }): SummaryEntryInput {
  return {
    type: "ALLERGY",
    payload: {},
    supersedesId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  };
}

// ── Remplacement d'entrées (RM-07-02, EF-07-04) ───────────────────────────────

describe("canSupersede (RM-07-02)", () => {
  it("autorise même Carnet ET même type", () => {
    expect(canSupersede({ recordId: "r1", type: "ALLERGY" }, { recordId: "r1", type: "ALLERGY" })).toBe(true);
  });
  it("refuse un Carnet différent", () => {
    expect(canSupersede({ recordId: "r1", type: "ALLERGY" }, { recordId: "r2", type: "ALLERGY" })).toBe(false);
  });
  it("refuse un type différent (une allergie ne corrige pas un antécédent)", () => {
    expect(canSupersede({ recordId: "r1", type: "ALLERGY" }, { recordId: "r1", type: "MEDICAL_HISTORY" })).toBe(false);
  });
});

describe("supersededIdSet", () => {
  it("collecte les entrées référencées comme remplacées, ignore les null", () => {
    const set = supersededIdSet([
      { supersedesId: null },
      { supersedesId: "a" },
      { supersedesId: "b" },
      { supersedesId: "a" }, // doublon toléré
    ]);
    expect(set).toEqual(new Set(["a", "b"]));
  });
});

// ── Fiche synthèse (EF-07-03) ─────────────────────────────────────────────────

describe("computeSummary — allergies actives (CU-07-02)", () => {
  it("liste les allergies effectives, ignore les remplacées (chaîne A←B←C)", () => {
    const summary = computeSummary([
      entry({ id: "a", payload: { label: "Pénicilline" } }),
      entry({ id: "b", payload: { label: "Pénicilline (confirmée)" }, supersedesId: "a" }),
      entry({ id: "c", payload: { label: "Pénicilline (sévère)" }, supersedesId: "b" }),
      entry({ id: "d", payload: { label: "Arachide" } }),
    ]);
    // a et b sont remplacées — seule la dernière correction et l'arachide restent.
    expect(summary.activeAllergies).toEqual(["Pénicilline (sévère)", "Arachide"]);
  });

  it("une correction resolved=true clôt l'allergie (plus active, historique conservé)", () => {
    const summary = computeSummary([
      entry({ id: "a", payload: { label: "Amoxicilline" } }),
      entry({ id: "b", payload: { label: "Amoxicilline", resolved: true }, supersedesId: "a" }),
    ]);
    expect(summary.activeAllergies).toEqual([]);
  });

  it("ignore les payloads sans libellé exploitable et déduplique", () => {
    const summary = computeSummary([
      entry({ id: "a", payload: { label: "  Arachide  " } }),
      entry({ id: "b", payload: { label: "Arachide" } }), // doublon après trim
      entry({ id: "c", payload: {} }), // pas de label → inaffichable, ignorée
      entry({ id: "d", payload: { label: 42 } }), // type inattendu → ignorée
      entry({ id: "e", payload: null }),
    ]);
    expect(summary.activeAllergies).toEqual(["Arachide"]);
  });
});

describe("computeSummary — maladies chroniques et groupe sanguin (EF-07-03)", () => {
  it("maladies chroniques = MEDICAL_HISTORY kind=chronic_disease non remplacées", () => {
    const summary = computeSummary([
      entry({ id: "a", type: "MEDICAL_HISTORY", payload: { kind: "chronic_disease", label: "Diabète type 2" } }),
      entry({ id: "b", type: "MEDICAL_HISTORY", payload: { kind: "chronic_disease", label: "Hypertension" } }),
      entry({ id: "c", type: "MEDICAL_HISTORY", payload: { kind: "surgery", label: "Appendicectomie" } }), // autre kind
      entry({ id: "d", type: "MEDICAL_HISTORY", payload: { kind: "chronic_disease", label: "Asthme" }, supersedesId: "b" }),
    ]);
    // b remplacée par d : Hypertension disparaît, Asthme apparaît.
    expect(summary.chronicDiseases).toEqual(["Diabète type 2", "Asthme"]);
  });

  it("groupe sanguin = MEDICAL_HISTORY {kind:blood_type, value} LA PLUS RÉCENTE non remplacée", () => {
    const summary = computeSummary([
      entry({
        id: "a",
        type: "MEDICAL_HISTORY",
        payload: { kind: "blood_type", value: "A+" },
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
      entry({
        id: "b",
        type: "MEDICAL_HISTORY",
        payload: { kind: "blood_type", value: "O+" },
        createdAt: new Date("2026-03-01T00:00:00Z"),
      }),
    ]);
    expect(summary.bloodType).toBe("O+");
  });

  it("un groupe sanguin remplacé est ignoré ; jamais renseigné → null", () => {
    expect(
      computeSummary([
        entry({
          id: "a",
          type: "MEDICAL_HISTORY",
          payload: { kind: "blood_type", value: "AB-" },
          createdAt: new Date("2026-05-01T00:00:00Z"),
        }),
        entry({
          id: "b",
          type: "MEDICAL_HISTORY",
          payload: { kind: "blood_type", value: "B+" },
          supersedesId: "a",
          createdAt: new Date("2026-05-02T00:00:00Z"),
        }),
      ]).bloodType,
    ).toBe("B+"); // a remplacée par b
    expect(computeSummary([]).bloodType).toBeNull();
  });

  it("une entrée VITALS ne fournit JAMAIS le groupe sanguin (choix documenté)", () => {
    const summary = computeSummary([entry({ id: "a", type: "VITALS", payload: { kind: "blood_type", value: "O-" } })]);
    expect(summary.bloodType).toBeNull();
  });
});

// ── Types déclarables (EF-07-06) ──────────────────────────────────────────────

describe("isPatientDeclarable (EF-07-06)", () => {
  it("seuls ALLERGY, MEDICAL_HISTORY, VACCINATION, PERSONAL_NOTE sont déclarables", () => {
    for (const t of PATIENT_DECLARABLE_TYPES) expect(isPatientDeclarable(t)).toBe(true);
    for (const t of RECORD_ENTRY_TYPES.filter((x) => !(PATIENT_DECLARABLE_TYPES as readonly string[]).includes(x))) {
      expect(isPatientDeclarable(t)).toBe(false); // comptes-rendus & co arrivent par C2 (EF-07-05)
    }
    expect(isPatientDeclarable("N_IMPORTE_QUOI")).toBe(false);
  });
});

// ── Majorité du sous-profil (EF-07-09, PM-16) ─────────────────────────────────

describe("isOwnerAdult (PM-16, calcul UTC — même règle que M01)", () => {
  const now = new Date("2026-06-12T10:00:00Z");
  it("exactement l'âge minimum le jour J → majeur", () => {
    expect(isOwnerAdult(new Date("2008-06-12T00:00:00Z"), 18, now)).toBe(true);
  });
  it("un jour trop jeune → mineur", () => {
    expect(isOwnerAdult(new Date("2008-06-13T00:00:00Z"), 18, now)).toBe(false);
  });
  it("le seuil vient de PM-16 — jamais en dur (21 ans : la frontière bouge)", () => {
    expect(isOwnerAdult(new Date("2008-06-12T00:00:00Z"), 21, now)).toBe(false);
    expect(isOwnerAdult(new Date("2005-06-12T00:00:00Z"), 21, now)).toBe(true);
  });
});

// ── Pagination (EF-07-03) ─────────────────────────────────────────────────────

describe("clampRecordPageSize", () => {
  it("défaut si absente, plancher 1, plafond RECORD_PAGE_MAX", () => {
    expect(clampRecordPageSize(undefined)).toBe(RECORD_PAGE_DEFAULT);
    expect(clampRecordPageSize(0)).toBe(1);
    expect(clampRecordPageSize(-5)).toBe(1);
    expect(clampRecordPageSize(7.9)).toBe(7);
    expect(clampRecordPageSize(10_000)).toBe(RECORD_PAGE_MAX);
  });
});

// ── Garde-fou de taille d'une déclaration (ENF-02) ────────────────────────────

describe("declaredPayloadSizeOk", () => {
  it("accepte un payload raisonnable, refuse au-delà de la borne", () => {
    expect(declaredPayloadSizeOk({ label: "Pénicilline" })).toBe(true);
    expect(declaredPayloadSizeOk({ note: "x".repeat(MAX_DECLARED_PAYLOAD_BYTES + 1) })).toBe(false);
  });
  it("refuse une structure non sérialisable (cycle) plutôt que d'exploser", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;
    expect(declaredPayloadSizeOk(cyclic)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Le code de transfert dictable — dette n°26, 06/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  Le chantier 48 a livré le transfert d'un Carnet à la majorité. Pour revendiquer, le majeur devait
  connaître `subProfileId` ET `intentId` : **73 caractères d'UUID**, que son tuteur devait lui faire
  parvenir par écrit — alors que, le plus souvent, les deux personnes sont dans la même pièce.

  Ce code se dicte. Tout le reste en découle :

  **1. L'alphabet n'a AUCUNE paire douteuse.** Ni 0/O, ni 1/I/L, ni U — et les DEUX membres de chaque
  paire sont exclus, pas seulement l'un. Garder « O » en écartant « 0 » laisserait celui qui écoute
  hésiter quand même, et sa faute serait alors silencieuse.

  **2. Tolérant sur la forme, strict sur le fond.** On l'aura écrit avec un tiret, un espace, en
  minuscules — rien de tout cela ne change le code. Mais un signe hors alphabet est une faute
  d'écoute : le taire enverrait au serveur un code qui reviendrait « aucun transfert », et les deux
  personnes chercheraient le défaut dans le transfert plutôt que dans la dictée.
*/
describe("Code de transfert dictable (dette n°26)", () => {
  it("l'alphabet ne contient aucune paire confondable à l'oral ni à l'œil", () => {
    for (const douteux of ["0", "O", "1", "I", "L", "U"]) {
      expect(CLAIM_CODE_ALPHABET.includes(douteux)).toBe(false);
    }
    // Et il reste assez large pour que le code ne se devine pas : 30⁸ ≈ 6,5 × 10¹¹.
    expect(CLAIM_CODE_ALPHABET.length).toBeGreaterThanOrEqual(30);
    expect(new Set(CLAIM_CODE_ALPHABET).size).toBe(CLAIM_CODE_ALPHABET.length); // aucun doublon
  });

  it.each([
    ["tel quel", "ABCD2345"],
    ["avec le tiret d'affichage", "ABCD-2345"],
    ["en minuscules", "abcd2345"],
    ["avec des espaces", " ABCD 2345 "],
    ["écrit sous la dictée, tiret et minuscules", "abcd-2345"],
  ])("accepte un code %s", (_cas, brut) => {
    expect(normalizeClaimCode(brut)).toBe("ABCD2345");
  });

  /*
    Le cas qui compte. Un signe hors alphabet ne peut venir que d'une erreur d'écoute ou de saisie :
    le refuser ICI donne « répétez », le laisser passer donnerait « ce transfert n'existe pas ».
  */
  it.each([
    ["il contient un zéro", "ABCD2340"],
    ["il contient un O", "ABCDO345"],
    ["il contient un I", "ABCDI345"],
    ["il contient un U", "ABCDU345"],
    ["il est trop court", "ABCD234"],
    ["il est trop long", "ABCD23456"],
    ["il est vide", ""],
    ["ce n'est pas un code", "bonjour !"],
  ])("refuse quand %s", (_cas, brut) => {
    expect(normalizeClaimCode(brut)).toBeNull();
  });

  it("s'affiche par groupes de quatre — on ne dicte pas huit signes d'affilée", () => {
    expect(formatClaimCode("ABCD2345")).toBe("ABCD-2345");
    // Et ce qui est affiché se relit : la boucle est fermée.
    expect(normalizeClaimCode(formatClaimCode("ABCD2345"))).toBe("ABCD2345");
  });
});

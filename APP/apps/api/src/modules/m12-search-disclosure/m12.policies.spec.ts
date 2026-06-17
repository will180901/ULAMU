/**
 * M12 — tests EXHAUSTIFS des règles métier pures (sans base).
 * Spec : docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md
 * Aucun chiffre métier figé : les fonctions sont paramétrées (PM-08, PM-34… injectés par le service).
 */
import {
  canTransitionDisclosure,
  clampHistoryPageSize,
  DEFAULT_HISTORY_PAGE_SIZE,
  DISCLOSURE_STATUSES,
  disclosureExpired,
  disclosureIdFromOrderRef,
  DisclosureStatusCode,
  excludedFacilityIds,
  MAX_HISTORY_PAGE_SIZE,
  normalizeItems,
  orderRefForDisclosure,
  reachesStrikeThreshold,
  remainingItemsFromLines,
  remainingSeconds,
  revealIfActive,
  RevealedFacility,
  STRIKE_EXCLUSION_THRESHOLD,
} from "./m12.policies";

const T0 = Date.UTC(2026, 5, 13, 12, 0, 0);

describe("orderRef du dévoilement (RM-13-01 : opaque pour M13, structuré pour M12)", () => {
  it("aller-retour : orderRefForDisclosure ↔ disclosureIdFromOrderRef", () => {
    const ref = orderRefForDisclosure("abc-123");
    expect(ref).toBe("disclosure:abc-123");
    expect(disclosureIdFromOrderRef(ref)).toBe("abc-123");
  });

  it("ignore (null) tout ordre d'un AUTRE module — canal C1 partagé avec M06", () => {
    expect(disclosureIdFromOrderRef("handshake:xyz")).toBeNull();
    expect(disclosureIdFromOrderRef("withdrawal:1")).toBeNull();
    expect(disclosureIdFromOrderRef("disclosure:")).toBeNull(); // préfixe sans id
    expect(disclosureIdFromOrderRef("")).toBeNull();
  });

  it("préfixe seul sans corps → null (pas de dévoilement vide)", () => {
    expect(disclosureIdFromOrderRef("disclosure:abc")).toBe("abc");
    // un orderRef de re-dévoilement suffixé reste un id M12 (le préfixe suffit à l'identifier)
    expect(disclosureIdFromOrderRef("disclosure:abc:redisclose:123")).toBe("abc:redisclose:123");
  });
});

describe("canTransitionDisclosure — machine d'états (spec §5, D-009)", () => {
  const allowed: Array<[DisclosureStatusCode, DisclosureStatusCode]> = [
    ["PENDING_PAYMENT", "ACTIVE"],
    ["PENDING_PAYMENT", "REFUNDED"],
    ["PENDING_PAYMENT", "EXPIRED"],
    ["ACTIVE", "SERVED"],
    ["ACTIVE", "EXPIRED"],
    ["ACTIVE", "REFUNDED"],
  ];

  it("autorise exactement les transitions du cycle (et aucune depuis un état terminal)", () => {
    for (const from of DISCLOSURE_STATUSES) {
      for (const to of DISCLOSURE_STATUSES) {
        const expected = allowed.some(([f, t]) => f === from && t === to);
        expect(canTransitionDisclosure(from, to)).toBe(expected);
      }
    }
  });

  it("SERVED / EXPIRED / REFUNDED sont terminaux", () => {
    for (const term of ["SERVED", "EXPIRED", "REFUNDED"] as DisclosureStatusCode[]) {
      for (const to of DISCLOSURE_STATUSES) {
        expect(canTransitionDisclosure(term, to)).toBe(false);
      }
    }
  });
});

describe("disclosureExpired — expiration paresseuse 24 h (EF-12-04, CU-12-05)", () => {
  const expiresAt = new Date(T0 + 1000); // échoit dans 1 s

  it("ACTIVE échu (now ≥ expiresAt) → expiré", () => {
    expect(disclosureExpired("ACTIVE", expiresAt, T0 + 1000)).toBe(true);
    expect(disclosureExpired("ACTIVE", expiresAt, T0 + 5000)).toBe(true);
  });

  it("ACTIVE encore dans la fenêtre → non expiré", () => {
    expect(disclosureExpired("ACTIVE", expiresAt, T0)).toBe(false);
  });

  it("ACTIVE sans expiresAt = anomalie → expiré (fail-closed, RM-12-01)", () => {
    expect(disclosureExpired("ACTIVE", null, T0)).toBe(true);
  });

  it("aucun autre statut n'est expirable", () => {
    for (const s of ["PENDING_PAYMENT", "SERVED", "EXPIRED", "REFUNDED"] as DisclosureStatusCode[]) {
      expect(disclosureExpired(s, null, T0 + 1_000_000)).toBe(false);
    }
  });
});

describe("remainingSeconds — compte à rebours SERVEUR (RM-06-02 / D-025)", () => {
  it("arrondit au plafond (une fraction de seconde compte encore)", () => {
    expect(remainingSeconds(new Date(T0 + 1500), T0)).toBe(2);
    expect(remainingSeconds(new Date(T0 + 1000), T0)).toBe(1);
  });

  it("0 si échu ou absent (jamais négatif)", () => {
    expect(remainingSeconds(new Date(T0 - 1), T0)).toBe(0);
    expect(remainingSeconds(null, T0)).toBe(0);
  });
});

describe("reachesStrikeThreshold — alerte titulaire (EF-12-07)", () => {
  it(`atteint le seuil à ${STRIKE_EXCLUSION_THRESHOLD} strikes ACTIVE`, () => {
    expect(reachesStrikeThreshold(STRIKE_EXCLUSION_THRESHOLD - 1)).toBe(false);
    expect(reachesStrikeThreshold(STRIKE_EXCLUSION_THRESHOLD)).toBe(true);
    expect(reachesStrikeThreshold(STRIKE_EXCLUSION_THRESHOLD + 1)).toBe(true);
  });
});

describe("revealIfActive — RÈGLE D'OR du masquage (RM-12-01)", () => {
  const facility: RevealedFacility = {
    facilityId: "f1",
    name: "Pharmacie du Centre",
    phone: "+242000",
    quarter: "Centre-ville",
    latitude: 1,
    longitude: 2,
  };

  it("révèle l'identité UNIQUEMENT pendant un dévoilement ACTIVE", () => {
    expect(revealIfActive("ACTIVE", facility)).toEqual(facility);
  });

  it("masque (null) pour tout autre statut, même si la pharmacie est connue", () => {
    for (const s of ["PENDING_PAYMENT", "SERVED", "EXPIRED", "REFUNDED"] as DisclosureStatusCode[]) {
      expect(revealIfActive(s, facility)).toBeNull();
    }
  });

  it("null en entrée reste null (rien à révéler)", () => {
    expect(revealIfActive("ACTIVE", null)).toBeNull();
  });
});

describe("remainingItemsFromLines — lignes restantes d'ordonnance (EF-12-01, CU-09-03)", () => {
  it("ne garde que les lignes référencées avec un reste > 0, et cumule par médicament", () => {
    const items = remainingItemsFromLines([
      { medicamentId: "m1", qtyPrescribed: 10, qtyDispensed: 3 }, // reste 7
      { medicamentId: "m1", qtyPrescribed: 5, qtyDispensed: 0 }, // reste 5 (cumul → 12)
      { medicamentId: "m2", qtyPrescribed: 4, qtyDispensed: 4 }, // reste 0 → écarté
      { medicamentId: null, qtyPrescribed: 9, qtyDispensed: 0 }, // hors référentiel → écarté
    ]);
    expect(items).toEqual([{ medicamentId: "m1", quantity: 12 }]);
  });

  it("ordonnance entièrement délivrée → aucun item", () => {
    expect(remainingItemsFromLines([{ medicamentId: "m1", qtyPrescribed: 2, qtyDispensed: 2 }])).toEqual([]);
  });
});

describe("normalizeItems — items propres avant M11/réservation", () => {
  it("déduplique par médicament, cumule, écarte quantités ≤ 0 ou non entières", () => {
    expect(
      normalizeItems([
        { medicamentId: "m1", quantity: 2 },
        { medicamentId: "m1", quantity: 3 },
        { medicamentId: "m2", quantity: 0 },
        { medicamentId: "m3", quantity: 1.5 },
      ]),
    ).toEqual([{ medicamentId: "m1", quantity: 5 }]);
  });
});

describe("excludedFacilityIds — chaîne de re-dévoilement (EF-12-06, RM-12-06)", () => {
  it("déduplique et écarte les null/undefined (dévoilements jamais activés)", () => {
    expect(excludedFacilityIds(["f1", null, "f2", "f1", undefined])).toEqual(["f1", "f2"]);
    expect(excludedFacilityIds([null, undefined])).toEqual([]);
  });
});

describe("clampHistoryPageSize — borne technique", () => {
  it("défaut hors borne, clampe à MAX, accepte une valeur valide", () => {
    expect(clampHistoryPageSize(undefined)).toBe(DEFAULT_HISTORY_PAGE_SIZE);
    expect(clampHistoryPageSize(0)).toBe(DEFAULT_HISTORY_PAGE_SIZE);
    expect(clampHistoryPageSize(10)).toBe(10);
    expect(clampHistoryPageSize(9999)).toBe(MAX_HISTORY_PAGE_SIZE);
  });
});

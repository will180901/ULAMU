/**
 * M06 — tests EXHAUSTIFS des règles métier pures (sans base).
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 * Les valeurs PM utilisées ici (300 s, 600 s, 1800 s, 86400 s, « 1,5 ») reproduisent le
 * seed — mais chaque fonction reste paramétrée : aucun chiffre métier n'est figé en code.
 */
import {
  ageInYears,
  autoStartDue,
  canExtend,
  canTransitionHandshake,
  canTransitionSession,
  clampMessagePageSize,
  DEFAULT_MESSAGE_PAGE_SIZE,
  HANDSHAKE_STATUSES,
  handshakeExpired,
  handshakeIdFromOrderRef,
  HandshakeStatusCode,
  MAX_MESSAGE_PAGE_SIZE,
  messageContentValid,
  orderRefForHandshake,
  ratingValid,
  refundRequired,
  reminderDue,
  REPORT_REMINDER_OFFSETS_S,
  reportWindowOpen,
  retryOrderRefForHandshake,
  SESSION_STATUSES,
  sessionRemainingSeconds,
} from "./m06.policies";

const T0 = Date.UTC(2026, 5, 12, 12, 0, 0); // base de temps arbitraire

describe("canTransitionHandshake — machine d'états (spec §2, D-007)", () => {
  const allowed: Array<[HandshakeStatusCode, HandshakeStatusCode]> = [
    ["INITIATED", "CONFIRMED"],
    ["INITIATED", "REFUSED"],
    ["INITIATED", "EXPIRED"],
    ["INITIATED", "ABANDONED"],
    ["CONFIRMED", "PAID"],
    ["CONFIRMED", "EXPIRED"],
    ["CONFIRMED", "ABANDONED"],
  ];

  it("autorise exactement les transitions du cycle initiée → confirmée → payée (+ sorties)", () => {
    for (const from of HANDSHAKE_STATUSES) {
      for (const to of HANDSHAKE_STATUSES) {
        const expected = allowed.some(([f, t]) => f === from && t === to);
        expect(canTransitionHandshake(from, to)).toBe(expected);
      }
    }
  });

  it("RM-06-01 / INVARIANT N°1 : PAID n'est atteignable que depuis CONFIRMED", () => {
    for (const from of HANDSHAKE_STATUSES) {
      expect(canTransitionHandshake(from, "PAID")).toBe(from === "CONFIRMED");
    }
  });

  it("les statuts terminaux ne bougent plus (PAID, EXPIRED, REFUSED, ABANDONED)", () => {
    for (const from of ["PAID", "EXPIRED", "REFUSED", "ABANDONED"] as const) {
      for (const to of HANDSHAKE_STATUSES) {
        expect(canTransitionHandshake(from, to)).toBe(false);
      }
    }
  });
});

describe("handshakeExpired — fenêtres PM-07 (EF-06-02/03, expiration paresseuse)", () => {
  const pm07S = 300; // 5 min (seed)
  const initiatedAt = new Date(T0);

  it("INITIATED : fraîche avant la fenêtre, expirée à la borne exacte et après (≥)", () => {
    expect(handshakeExpired("INITIATED", initiatedAt, null, pm07S, T0 + 299_999)).toBe(false);
    expect(handshakeExpired("INITIATED", initiatedAt, null, pm07S, T0 + 300_000)).toBe(true); // borne = expirée
    expect(handshakeExpired("INITIATED", initiatedAt, null, pm07S, T0 + 300_001)).toBe(true);
  });

  it("CONFIRMED : pilotée par confirmExpiresAt (sa PROPRE fenêtre PM-07)", () => {
    const confirmExpiresAt = new Date(T0 + 300_000);
    expect(handshakeExpired("CONFIRMED", initiatedAt, confirmExpiresAt, pm07S, T0 + 299_999)).toBe(false);
    expect(handshakeExpired("CONFIRMED", initiatedAt, confirmExpiresAt, pm07S, T0 + 300_000)).toBe(true);
    expect(handshakeExpired("CONFIRMED", initiatedAt, confirmExpiresAt, pm07S, T0 + 600_000)).toBe(true);
  });

  it("CONFIRMED sans confirmExpiresAt : anomalie → expirée (fail-closed, RM-06-01)", () => {
    expect(handshakeExpired("CONFIRMED", initiatedAt, null, pm07S, T0)).toBe(true);
  });

  it("les autres statuts ne sont jamais expirables", () => {
    for (const status of ["PAID", "EXPIRED", "REFUSED", "ABANDONED"] as const) {
      expect(handshakeExpired(status, initiatedAt, null, pm07S, T0 + 10 * 86_400_000)).toBe(false);
    }
  });

  it("PM-07 corrompu (≤ 0, NaN) → erreur franche, jamais de validation à l'aveugle", () => {
    expect(() => handshakeExpired("INITIATED", initiatedAt, null, 0, T0)).toThrow();
    expect(() => handshakeExpired("INITIATED", initiatedAt, null, -5, T0)).toThrow();
    expect(() => handshakeExpired("INITIATED", initiatedAt, null, Number.NaN, T0)).toThrow();
  });
});

describe("canTransitionSession — machine d'états (spec §2, D-006/D-008)", () => {
  const allowed: Array<[string, string]> = [
    ["PREPARING", "ACTIVE"],
    ["PREPARING", "REFUNDED"],
    ["ACTIVE", "ENDED"],
    ["ACTIVE", "REFUNDED"],
    ["ENDED", "REFUNDED"],
  ];

  it("autorise exactement préparation → active → terminée (+ remboursée)", () => {
    for (const from of SESSION_STATUSES) {
      for (const to of SESSION_STATUSES) {
        const expected = allowed.some(([f, t]) => f === from && t === to);
        expect(canTransitionSession(from, to)).toBe(expected);
      }
    }
  });

  it("REFUNDED est terminal", () => {
    for (const to of SESSION_STATUSES) {
      expect(canTransitionSession("REFUNDED", to)).toBe(false);
    }
  });
});

describe("autoStartDue — démarrage automatique PM-28 (EF-06-04)", () => {
  const pm28S = 600; // 10 min (seed)

  it("non due avant l'échéance, due à la borne exacte et après", () => {
    expect(autoStartDue(T0, pm28S, T0 + 599_999)).toBe(false);
    expect(autoStartDue(T0, pm28S, T0 + 600_000)).toBe(true);
    expect(autoStartDue(T0, pm28S, T0 + 3_600_000)).toBe(true);
  });

  it("PM-28 corrompu → erreur franche", () => {
    expect(() => autoStartDue(T0, 0, T0)).toThrow();
    expect(() => autoStartDue(T0, Number.NaN, T0)).toThrow();
  });
});

describe("sessionRemainingSeconds — l'horloge du serveur fait foi (RM-06-02, D-025)", () => {
  it("session non démarrée (endsAt null) → 0", () => {
    expect(sessionRemainingSeconds(null, T0)).toBe(0);
  });

  it("compte à rebours exact, arrondi au plafond (une fraction de seconde compte)", () => {
    expect(sessionRemainingSeconds(new Date(T0 + 30_000), T0)).toBe(30);
    expect(sessionRemainingSeconds(new Date(T0 + 30_001), T0)).toBe(31); // ceil
    expect(sessionRemainingSeconds(new Date(T0 + 1), T0)).toBe(1);
  });

  it("échue ou dépassée → 0, jamais négatif", () => {
    expect(sessionRemainingSeconds(new Date(T0), T0)).toBe(0);
    expect(sessionRemainingSeconds(new Date(T0 - 60_000), T0)).toBe(0);
  });
});

describe("canExtend — prolongation gratuite plafonnée PM-29 (EF-06-07, D-016)", () => {
  const pm29S = 1800; // +30 min cumulés (seed)

  it("accepte une durée entière positive tant que le CUMUL reste ≤ PM-29 (plafond atteignable)", () => {
    expect(canExtend(0, 600, pm29S)).toBe(true); // +10 min
    expect(canExtend(1200, 600, pm29S)).toBe(true); // atteint exactement 1800
    expect(canExtend(0, 1800, pm29S)).toBe(true); // tout d'un coup
  });

  it("refuse le dépassement du cumul, même d'une seconde", () => {
    expect(canExtend(1201, 600, pm29S)).toBe(false);
    expect(canExtend(1800, 1, pm29S)).toBe(false);
    expect(canExtend(0, 1801, pm29S)).toBe(false);
  });

  it("refuse une durée nulle, négative ou non entière (minutes > 0, pas de pas imposé)", () => {
    expect(canExtend(0, 0, pm29S)).toBe(false);
    expect(canExtend(0, -60, pm29S)).toBe(false);
    expect(canExtend(0, 90.5, pm29S)).toBe(false);
  });

  it("refuse un cumul existant incohérent (négatif ou non entier)", () => {
    expect(canExtend(-1, 60, pm29S)).toBe(false);
    expect(canExtend(0.5, 60, pm29S)).toBe(false);
  });

  it("PM-29 corrompu → erreur franche", () => {
    expect(() => canExtend(0, 60, 0)).toThrow();
    expect(() => canExtend(0, 60, Number.NaN)).toThrow();
  });
});

describe("reportWindowOpen — fenêtre de dépôt PM-30 (EF-06-08, D-021)", () => {
  const pm30S = 86_400; // 24 h (seed)

  it("session encore active (endedAt null) : toujours rédigeable", () => {
    expect(reportWindowOpen(null, pm30S, T0)).toBe(true);
  });

  it("ouverte pendant PM-30 après la fin, fermée à la borne exacte (gains gelés, CU-06-03)", () => {
    const endedAt = new Date(T0);
    expect(reportWindowOpen(endedAt, pm30S, T0)).toBe(true);
    expect(reportWindowOpen(endedAt, pm30S, T0 + 86_399_999)).toBe(true);
    expect(reportWindowOpen(endedAt, pm30S, T0 + 86_400_000)).toBe(false); // borne = gelé
    expect(reportWindowOpen(endedAt, pm30S, T0 + 86_400_001)).toBe(false);
  });

  it("PM-30 corrompu → erreur franche", () => {
    expect(() => reportWindowOpen(new Date(T0), 0, T0)).toThrow();
    expect(() => reportWindowOpen(new Date(T0), -1, T0)).toThrow();
  });
});

describe("REPORT_REMINDER_OFFSETS_S / reminderDue — relances 12 h et 23 h (EF-06-08)", () => {
  it("les décalages de spec valent 12 h et 23 h, en secondes", () => {
    expect(REPORT_REMINDER_OFFSETS_S).toEqual([43_200, 82_800]);
  });

  it("une échéance est due si elle tombe dans (now − fenêtre, now]", () => {
    const endedAtMs = T0;
    const offsetS = 43_200; // 12 h
    const windowS = 3_600; // balayage horaire
    const dueAt = T0 + 43_200_000;
    expect(reminderDue(endedAtMs, offsetS, windowS, dueAt)).toBe(true); // pile à l'échéance
    expect(reminderDue(endedAtMs, offsetS, windowS, dueAt + 3_599_999)).toBe(true); // fin de fenêtre
    expect(reminderDue(endedAtMs, offsetS, windowS, dueAt + 3_600_000)).toBe(false); // fenêtre suivante
    expect(reminderDue(endedAtMs, offsetS, windowS, dueAt - 1)).toBe(false); // pas encore due
  });

  it("fenêtre corrompue → erreur franche", () => {
    expect(() => reminderDue(T0, 43_200, 0, T0)).toThrow();
  });
});

describe("refundRequired — D-008, INVARIANT N°9 (EF-06-09)", () => {
  const pro = "pro-1";

  it("aucun message du tout → remboursement requis", () => {
    expect(refundRequired([], pro)).toBe(true);
  });

  it("uniquement des messages du patient → remboursement requis", () => {
    expect(refundRequired([{ senderId: "patient-1" }, { senderId: "patient-1" }], pro)).toBe(true);
  });

  it("UN seul message du professionnel (même un « Bonjour », risque spec §9) → pas de remboursement", () => {
    expect(refundRequired([{ senderId: "patient-1" }, { senderId: pro }], pro)).toBe(false);
    expect(refundRequired([{ senderId: pro }], pro)).toBe(false);
  });
});

describe("ratingValid — notation dans l'échelle PM-13 (EF-06-11, D-021)", () => {
  const bounds = [1, 5]; // seed « 1,5 »

  it("accepte les entiers de l'échelle, bornes incluses", () => {
    for (const score of [1, 2, 3, 4, 5]) expect(ratingValid(score, bounds)).toBe(true);
  });

  it("refuse hors bornes et non-entiers", () => {
    expect(ratingValid(0, bounds)).toBe(false);
    expect(ratingValid(6, bounds)).toBe(false);
    expect(ratingValid(2.5, bounds)).toBe(false);
    expect(ratingValid(Number.NaN, bounds)).toBe(false);
  });

  it("échelle corrompue → erreur franche (liste trop courte, min ≥ max, non entière)", () => {
    expect(() => ratingValid(3, [1])).toThrow();
    expect(() => ratingValid(3, [5, 1])).toThrow();
    expect(() => ratingValid(3, [1.5, 5])).toThrow();
  });
});

describe("messageContentValid — cohérence type/contenu (EF-06-05)", () => {
  it("TEXT exige un corps non vide", () => {
    expect(messageContentValid("TEXT", "Bonjour docteur", null)).toBe(true);
    expect(messageContentValid("TEXT", "", null)).toBe(false);
    expect(messageContentValid("TEXT", "   ", null)).toBe(false);
    expect(messageContentValid("TEXT", undefined, "s3/key")).toBe(false); // un fichier ne fait pas un texte
  });

  it("PHOTO / VOICE / DOCUMENT exigent une clé de fichier (légende facultative)", () => {
    for (const kind of ["PHOTO", "VOICE", "DOCUMENT"] as const) {
      expect(messageContentValid(kind, null, "s3/key")).toBe(true);
      expect(messageContentValid(kind, "légende", "s3/key")).toBe(true);
      expect(messageContentValid(kind, "légende seule", null)).toBe(false);
      expect(messageContentValid(kind, null, "  ")).toBe(false);
    }
  });
});

describe("ageInYears — fiche anonymisée prénom + âge (EF-06-01)", () => {
  it("âge révolu : anniversaire passé, le jour même, pas encore passé", () => {
    const birth = new Date(Date.UTC(2000, 5, 12)); // 12 juin 2000
    expect(ageInYears(birth, new Date(Date.UTC(2026, 5, 12)))).toBe(26); // jour J
    expect(ageInYears(birth, new Date(Date.UTC(2026, 5, 11)))).toBe(25); // veille
    expect(ageInYears(birth, new Date(Date.UTC(2026, 5, 13)))).toBe(26); // lendemain
    expect(ageInYears(birth, new Date(Date.UTC(2026, 0, 1)))).toBe(25); // début d'année
  });

  it("jamais négatif (horloges incohérentes)", () => {
    expect(ageInYears(new Date(Date.UTC(2030, 0, 1)), new Date(Date.UTC(2026, 0, 1)))).toBe(0);
  });
});

describe("références d'ordre C1 — handshake:<id> (RM-13-01 : opaques pour M13)", () => {
  it("référence du premier essai et analyse inverse", () => {
    expect(orderRefForHandshake("abc-123")).toBe("handshake:abc-123");
    expect(handshakeIdFromOrderRef("handshake:abc-123")).toBe("abc-123");
  });

  it("référence de NOUVEL essai (échec M13 terminal) — suffixée, idempotente à la seconde", () => {
    const ref = retryOrderRefForHandshake("abc-123", T0);
    expect(ref).toBe(`handshake:abc-123:r${Math.floor(T0 / 1000)}`);
    expect(handshakeIdFromOrderRef(ref)).toBe("abc-123"); // l'analyse retombe sur l'id
    // Deux essais dans la même seconde = même ordre (RM-13-04).
    expect(retryOrderRefForHandshake("abc-123", T0 + 999)).toBe(ref);
    expect(retryOrderRefForHandshake("abc-123", T0 + 1000)).not.toBe(ref);
  });

  it("référence d'un autre module (C1 partagé) ou malformée → null", () => {
    expect(handshakeIdFromOrderRef("unveiling:xyz")).toBeNull();
    expect(handshakeIdFromOrderRef("handshake:")).toBeNull();
    expect(handshakeIdFromOrderRef("")).toBeNull();
  });
});

describe("clampMessagePageSize — borne technique de pagination", () => {
  it("défaut, plafond, et valeurs invalides", () => {
    expect(clampMessagePageSize()).toBe(DEFAULT_MESSAGE_PAGE_SIZE);
    expect(clampMessagePageSize(10)).toBe(10);
    expect(clampMessagePageSize(0)).toBe(DEFAULT_MESSAGE_PAGE_SIZE);
    expect(clampMessagePageSize(-3)).toBe(DEFAULT_MESSAGE_PAGE_SIZE);
    expect(clampMessagePageSize(2.5)).toBe(DEFAULT_MESSAGE_PAGE_SIZE);
    expect(clampMessagePageSize(10_000)).toBe(MAX_MESSAGE_PAGE_SIZE);
  });
});

/**
 * Tests des règles M05 — critères d'acceptation CU-05-01/03/04/05,
 * EF-05-02 (bornes d'offres), EF-05-06/RM-05-04 (présence fraîche),
 * RM-05-02 (algorithme de pertinence documenté + boost de découverte spec §9).
 */
import {
  ALERT_VALIDITY_DAYS,
  alertIsNotifiable,
  avgConfirmDelayS,
  clampPageSize,
  confirmDenominator,
  confirmRate,
  confirmRatePct,
  DEFAULT_PAGE_SIZE,
  DELAY_REF_S,
  durationIsValid,
  effectivePresenceState,
  hasRecentActivity,
  MAX_PAGE_SIZE,
  NEUTRAL_COMPONENT,
  offerIsValid,
  presenceIsAvailable,
  priceIsValid,
  ratingAvg,
  ReactivityStats,
  RELEVANCE_WEIGHTS,
  relevanceScore,
} from "./m05.policies";

/** Valeurs seedées (PM-09 = "10,60", PM-06 = 500, PM-26 = 900 s) — injectées, jamais en dur dans le code testé. */
const PM09_BOUNDS = [10, 60] as const;
const PM06_FLOOR = 500;
const PM26_S = 900;
const PM13_SCALE = [1, 5] as const;

function stats(partial: Partial<ReactivityStats>): ReactivityStats {
  return {
    initiationsTotal: 0,
    confirmedTotal: 0,
    confirmDelaySumS: 0,
    ratingSum: 0,
    ratingCount: 0,
    incidentsTotal: 0,
    refusedTotal: 0,
    ...partial,
  };
}

// ── Offres (EF-05-02 ; CU-05-03) ─────────────────────────────────────────────

describe("durationIsValid (PM-09)", () => {
  it.each([
    [30, true], // « Consultation 30 min » (CU-05-03)
    [10, true], // borne basse incluse
    [60, true], // borne haute incluse
    [9, false],
    [61, false],
    [0, false],
    [-15, false],
    [30.5, false], // minutes entières
  ])("%p min → %s", (duration, ok) => {
    expect(durationIsValid(duration as number, PM09_BOUNDS)).toBe(ok);
  });

  it("refuse de valider avec des bornes PM-09 corrompues", () => {
    expect(() => durationIsValid(30, [10])).toThrow(/PM-09/);
    expect(() => durationIsValid(30, [60, 10])).toThrow(/PM-09/);
    expect(() => durationIsValid(30, [0, 60])).toThrow(/PM-09/);
  });
});

describe("priceIsValid (PM-06, prix final commission incluse D-010)", () => {
  it.each([
    [5000, true], // « 5 000 XAF » (CU-05-03)
    [500, true], // plancher inclus
    [499, false],
    [0, false],
    [5000.5, false], // pas de centimes au XAF
  ])("%p XAF → %s", (price, ok) => {
    expect(priceIsValid(price as number, PM06_FLOOR)).toBe(ok);
  });

  it("refuse un plancher PM-06 corrompu", () => {
    expect(() => priceIsValid(5000, -1)).toThrow(/PM-06/);
    expect(() => priceIsValid(5000, 10.5)).toThrow(/PM-06/);
  });
});

describe("offerIsValid (EF-05-02 : durée ET prix)", () => {
  it("CU-05-03 : « Consultation 30 min — 5 000 XAF » est valide", () => {
    expect(offerIsValid(30, 5000, PM09_BOUNDS, PM06_FLOOR)).toBe(true);
  });
  it("durée valide mais prix sous le plancher → invalide", () => {
    expect(offerIsValid(30, 100, PM09_BOUNDS, PM06_FLOOR)).toBe(false);
  });
  it("prix valide mais durée hors bornes → invalide", () => {
    expect(offerIsValid(90, 5000, PM09_BOUNDS, PM06_FLOOR)).toBe(false);
  });
});

// ── Présence (EF-05-05/06 ; RM-05-04 ; CU-05-04) ─────────────────────────────

describe("presenceIsAvailable (EF-05-06 : on ne paie jamais un absent)", () => {
  const now = 1_750_000_000_000;

  it("ONLINE avec battement frais → disponible", () => {
    expect(presenceIsAvailable("ONLINE", now - 30_000, now, PM26_S)).toBe(true);
  });

  it("ONLINE rassis (inactivité ≥ PM-26) vaut OFFLINE (CU-05-04, bascule à la lecture)", () => {
    expect(presenceIsAvailable("ONLINE", now - (PM26_S * 1000 + 1), now, PM26_S)).toBe(false);
  });

  it("borne exacte : âge = PM-26 → indisponible (strictement inférieur exigé)", () => {
    expect(presenceIsAvailable("ONLINE", now - PM26_S * 1000, now, PM26_S)).toBe(false);
  });

  it("DO_NOT_DISTURB → indisponible même avec battement frais (EF-05-05)", () => {
    expect(presenceIsAvailable("DO_NOT_DISTURB", now, now, PM26_S)).toBe(false);
  });

  it("OFFLINE → indisponible", () => {
    expect(presenceIsAvailable("OFFLINE", now, now, PM26_S)).toBe(false);
  });

  it("horloges désynchronisées (âge négatif) → considéré frais", () => {
    expect(presenceIsAvailable("ONLINE", now + 5_000, now, PM26_S)).toBe(true);
  });

  it("refuse un PM-26 corrompu", () => {
    expect(() => presenceIsAvailable("ONLINE", now, now, 0)).toThrow(/PM-26/);
    expect(() => presenceIsAvailable("ONLINE", now, now, Number.NaN)).toThrow(/PM-26/);
  });
});

describe("effectivePresenceState (jamais de présence périmée affichée, spec §8)", () => {
  const now = 1_750_000_000_000;
  it("ONLINE rassis affiché OFFLINE", () => {
    expect(effectivePresenceState("ONLINE", now - PM26_S * 1000 - 1, now, PM26_S)).toBe("OFFLINE");
  });
  it("ONLINE frais affiché ONLINE", () => {
    expect(effectivePresenceState("ONLINE", now - 1_000, now, PM26_S)).toBe("ONLINE");
  });
  it("DO_NOT_DISTURB affiché tel quel (choix explicite du professionnel)", () => {
    expect(effectivePresenceState("DO_NOT_DISTURB", now - PM26_S * 2000, now, PM26_S)).toBe("DO_NOT_DISTURB");
  });
});

// ── Indicateurs (EF-05-01) ───────────────────────────────────────────────────

describe("confirmRate / confirmRatePct / avgConfirmDelayS / ratingAvg", () => {
  it("aucune initiation → taux 0", () => {
    expect(confirmRate(stats({}))).toBe(0);
    expect(confirmRatePct(stats({}))).toBe(0);
  });

  it("8 confirmées sur 10 initiations → 0,8 (80 %)", () => {
    const s = stats({ initiationsTotal: 10, confirmedTotal: 8 });
    expect(confirmRate(s)).toBe(0.8);
    expect(confirmRatePct(s)).toBe(80);
  });

  it("compteurs incohérents (confirmées > initiations) → borné à 1", () => {
    expect(confirmRate(stats({ initiationsTotal: 2, confirmedTotal: 5 }))).toBe(1);
  });

  it("délai moyen : 600 s cumulées pour 4 confirmations → 150 s ; aucune confirmation → null", () => {
    expect(avgConfirmDelayS(stats({ confirmedTotal: 4, confirmDelaySumS: 600 }))).toBe(150);
    expect(avgConfirmDelayS(stats({}))).toBeNull();
  });

  it("note moyenne : 18/4 → 4,5 ; aucun avis → null (affichage honnête EF-05-07)", () => {
    expect(ratingAvg(stats({ ratingSum: 18, ratingCount: 4 }))).toBe(4.5);
    expect(ratingAvg(stats({}))).toBeNull();
  });
});

/*
  ── Le refus motivé sort du dénominateur — dette n°23, 04/09/2026 ─────────────────────────────

  Le taux valait `confirmées / initiées`. `initiationsTotal` monte à la SOLLICITATION, avant toute
  réponse : un refus motivé y restait donc, et pesait exactement autant qu'une demande laissée
  expirer sans un mot.

  Or les deux ne rendent pas le même service au patient. Un refus rapide lui fait GAGNER du temps —
  il va voir ailleurs ; une expiration lui en fait perdre. Un indicateur public qui les confond
  décourage le seul des deux comportements qui le serve.

  Ces tests défendent la nouvelle définition ET sa borne : **l'expiration, elle, pèse toujours.**
  Sans ce dernier test, on aurait pu vider le dénominateur de tout ce qui n'est pas une
  confirmation, et le taux ne dirait plus rien du tout.
*/
describe("confirmRate — les refus motivés hors du dénominateur (dette n°23)", () => {
  it("8 confirmées, 10 sollicitations dont 2 refusées → 100 %, pas 80 %", () => {
    const s = stats({ initiationsTotal: 10, confirmedTotal: 8, refusedTotal: 2 });

    expect(confirmRate(s)).toBe(1);
    expect(confirmRatePct(s)).toBe(100);
  });

  /*
    LA garde de cette dette. Le médecin qui n'ouvre jamais l'application laisse expirer : ces
    demandes RESTENT au dénominateur, et son taux baisse. C'est tout l'intérêt de la distinction.
  */
  it("une demande laissée expirer pèse toujours — seul le refus MOTIVÉ sort", () => {
    // 10 sollicitations, 5 confirmées, 5 expirées sans un mot : rien ne sort du dénominateur.
    expect(confirmRate(stats({ initiationsTotal: 10, confirmedTotal: 5, refusedTotal: 0 }))).toBe(0.5);
  });

  it("un médecin qui refuse TOUT n’affiche pas 100 % : plus rien au dénominateur → 0", () => {
    expect(confirmRate(stats({ initiationsTotal: 4, confirmedTotal: 0, refusedTotal: 4 }))).toBe(0);
  });

  /*
    Les lignes écrites AVANT la migration n'ont pas le champ (il est facultatif dans le type). Le
    taux doit alors valoir exactement ce qu'il valait avant — sans quoi la mise en production
    changerait les chiffres de tout le monde avant même le recalcul.
  */
  it("sans refusedTotal (lignes d’avant la migration), le taux est celui d’avant", () => {
    const ancien = { initiationsTotal: 10, confirmedTotal: 8, confirmDelaySumS: 0, ratingSum: 0, ratingCount: 0, incidentsTotal: 0 };

    expect(confirmRate(ancien)).toBe(0.8);
    expect(confirmDenominator(ancien)).toBe(10);
  });

  it("confirmDenominator dit sur combien de demandes le taux porte", () => {
    expect(confirmDenominator(stats({ initiationsTotal: 10, refusedTotal: 3 }))).toBe(7);
    // Jamais négatif, même sur des compteurs incohérents : un écran afficherait « sur -1 demandes ».
    expect(confirmDenominator(stats({ initiationsTotal: 2, refusedTotal: 5 }))).toBe(0);
  });
});

// ── Pertinence (RM-05-02) ────────────────────────────────────────────────────

describe("relevanceScore (algorithme documenté, RM-05-02)", () => {
  it("professionnel parfait (taux 100 %, délai 0, note max, actif, zéro incident) → 1", () => {
    const s = stats({ initiationsTotal: 10, confirmedTotal: 10, confirmDelaySumS: 0, ratingSum: 50, ratingCount: 10 });
    expect(relevanceScore(s, true, PM13_SCALE)).toBeCloseTo(1, 10);
  });

  it("nouveau vérifié SANS stats (boost de découverte, spec §9) → score neutre, jamais 0", () => {
    const expected = RELEVANCE_WEIGHTS.reactivity * NEUTRAL_COMPONENT + RELEVANCE_WEIGHTS.rating * NEUTRAL_COMPONENT;
    expect(relevanceScore(null, false, PM13_SCALE)).toBeCloseTo(expected, 10); // 0,4
    expect(relevanceScore(null, true, PM13_SCALE)).toBeCloseTo(expected + RELEVANCE_WEIGHTS.activity, 10); // 0,6
    expect(relevanceScore(null, false, PM13_SCALE)).toBeGreaterThan(0);
  });

  it("stats à zéro (ligne créée mais aucun événement) = même neutralité que null", () => {
    expect(relevanceScore(stats({}), true, PM13_SCALE)).toBeCloseTo(relevanceScore(null, true, PM13_SCALE), 10);
  });

  it("un délai moyen égal à DELAY_REF_S donne un facteur délai de 0,5 (formule documentée)", () => {
    const s = stats({
      initiationsTotal: 10,
      confirmedTotal: 10,
      confirmDelaySumS: DELAY_REF_S * 10, // délai moyen = DELAY_REF_S
    });
    // R = (1 + 0,5)/2 = 0,75 ; N neutre ; A = 0 ; I = 0
    const expected = RELEVANCE_WEIGHTS.reactivity * 0.75 + RELEVANCE_WEIGHTS.rating * NEUTRAL_COMPONENT;
    expect(relevanceScore(s, false, PM13_SCALE)).toBeCloseTo(expected, 10);
  });

  it("plus rapide à confirmer → mieux classé (réactivité, EF-05-03)", () => {
    const lent = stats({ initiationsTotal: 10, confirmedTotal: 10, confirmDelaySumS: 6000 });
    const rapide = stats({ initiationsTotal: 10, confirmedTotal: 10, confirmDelaySumS: 300 });
    expect(relevanceScore(rapide, true, PM13_SCALE)).toBeGreaterThan(relevanceScore(lent, true, PM13_SCALE));
  });

  it("mieux noté → mieux classé", () => {
    const moyen = stats({ ratingSum: 30, ratingCount: 10 }); // 3/5
    const excellent = stats({ ratingSum: 48, ratingCount: 10 }); // 4,8/5
    expect(relevanceScore(excellent, true, PM13_SCALE)).toBeGreaterThan(relevanceScore(moyen, true, PM13_SCALE));
  });

  it("initiations jamais confirmées → réactivité au plancher (pire qu'un nouveau, honnêteté du classement)", () => {
    const fantome = stats({ initiationsTotal: 20, confirmedTotal: 0 });
    expect(relevanceScore(fantome, true, PM13_SCALE)).toBeLessThan(relevanceScore(null, true, PM13_SCALE));
  });

  it("les incidents (sessions remboursées, D-008) pénalisent le score", () => {
    const sain = stats({ initiationsTotal: 10, confirmedTotal: 10, confirmDelaySumS: 600 });
    const incidents = { ...sain, incidentsTotal: 5 };
    expect(relevanceScore(incidents, true, PM13_SCALE)).toBeLessThan(relevanceScore(sain, true, PM13_SCALE));
  });

  it("l'activité récente compte pour exactement W.activity", () => {
    const s = stats({ initiationsTotal: 10, confirmedTotal: 8, confirmDelaySumS: 800, ratingSum: 40, ratingCount: 10 });
    expect(relevanceScore(s, true, PM13_SCALE) - relevanceScore(s, false, PM13_SCALE)).toBeCloseTo(
      RELEVANCE_WEIGHTS.activity,
      10,
    );
  });

  it("le score reste TOUJOURS dans [0;1], même avec des compteurs extrêmes", () => {
    const cas: Array<[ReactivityStats | null, boolean]> = [
      [null, false],
      [stats({ initiationsTotal: 1000, confirmedTotal: 0 }), false],
      [stats({ initiationsTotal: 10, confirmedTotal: 10, incidentsTotal: 100 }), false],
      [stats({ initiationsTotal: 1, confirmedTotal: 1, ratingSum: 5, ratingCount: 1 }), true],
      [stats({ ratingSum: 500, ratingCount: 100 }), true],
    ];
    for (const [s, actif] of cas) {
      const score = relevanceScore(s, actif, PM13_SCALE);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("refuse une échelle PM-13 corrompue", () => {
    expect(() => relevanceScore(null, false, [5])).toThrow(/PM-13/);
    expect(() => relevanceScore(null, false, [5, 1])).toThrow(/PM-13/);
  });
});

describe("hasRecentActivity (composante A de l'algorithme)", () => {
  const now = 1_750_000_000_000;
  it("signe de vie dans la fenêtre → actif", () => {
    expect(hasRecentActivity(now - 24 * 3_600_000, now)).toBe(true);
  });
  it("au-delà de la fenêtre → inactif ; jamais de signal → inactif", () => {
    expect(hasRecentActivity(now - 31 * 24 * 3_600_000, now, 30)).toBe(false);
    expect(hasRecentActivity(null, now)).toBe(false);
  });
});

// ── Cloche (EF-05-06 ; CU-05-05) ─────────────────────────────────────────────

describe("alertIsNotifiable (une notification max par cloche, valable 7 jours — CU-05-05)", () => {
  const now = 1_750_000_000_000;

  it("la validité de 7 jours vient de la SPEC (CU-05-05), pas d'un PM", () => {
    expect(ALERT_VALIDITY_DAYS).toBe(7);
  });

  it("non notifiée et non expirée → notifiable", () => {
    expect(alertIsNotifiable(null, now + 1_000, now)).toBe(true);
  });
  it("déjà notifiée → plus jamais (une seule par cloche)", () => {
    expect(alertIsNotifiable(new Date(now - 1_000), now + 1_000_000, now)).toBe(false);
  });
  it("expirée → non notifiable (y compris à l'instant exact d'expiration)", () => {
    expect(alertIsNotifiable(null, now - 1, now)).toBe(false);
    expect(alertIsNotifiable(null, now, now)).toBe(false);
  });
});

// ── Pagination (bornes techniques) ───────────────────────────────────────────

describe("clampPageSize", () => {
  it("défaut quand absent ou invalide", () => {
    expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(2.5)).toBe(DEFAULT_PAGE_SIZE);
  });
  it("borne haute appliquée", () => {
    expect(clampPageSize(500)).toBe(MAX_PAGE_SIZE);
  });
  it("valeur raisonnable conservée", () => {
    expect(clampPageSize(10)).toBe(10);
  });
});

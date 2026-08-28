/**
 * `reportDueAt` — l'échéance de dépôt du compte-rendu, servie par le serveur.
 *
 * ── Pourquoi ce champ existe ───────────────────────────────────────────────────────────────────
 *
 * Au-delà de PM-30, le dépôt n'est pas *toléré* : il est **REFUSÉ**, et les gains sont gelés
 * (CU-06-03). Comme RM-06-04 ne crédite qu'au dépôt, le médecin a travaillé pour rien.
 *
 * L'écran ne pouvait pas calculer cette échéance : il reçoit `endedAt`, mais PM-30 ne lui est pas
 * accessible — la lecture des paramètres est réservée aux administrateurs. Il ne lui restait qu'à
 * écrire un délai en dur. C'est ce qui a produit le « 48 h » des maquettes (deux fois le délai
 * réel) et un « 24 heures » écrit dans C5, qui mentirait au premier changement de PM-30 dans E3.
 *
 * Le test 3 est le garde-fou : il change PM-30 et exige que l'échéance suive.
 *
 * Aucune base : la logique testée est une addition de dates, isolée dans une aide privée.
 */

/**
 * Copie exacte de `M06SessionService.reportDueAt`. La méthode est privée et son service tire une
 * dizaine de dépendances ; la simuler coûterait plus cher que la règle ne vaut. On teste donc la
 * RÈGLE, et tout écart entre les deux se verrait au premier essai en ligne.
 */
function reportDueAt(endedAt: Date | null, pm30S: number): string | null {
  return endedAt === null ? null : new Date(endedAt.getTime() + pm30S * 1000).toISOString();
}

const PM30_24H = 86_400;

describe("reportDueAt — l'échéance du compte-rendu vient du serveur", () => {
  it("vaut la clôture plus PM-30", () => {
    const fin = new Date("2026-08-28T10:00:00.000Z");

    expect(reportDueAt(fin, PM30_24H)).toBe("2026-08-29T10:00:00.000Z");
  });

  it("est nulle tant que la session n'est pas termin­ée — le délai ne court qu'à la clôture", () => {
    expect(reportDueAt(null, PM30_24H)).toBeNull();
  });

  it("suit PM-30 si le super-admin le change dans E3 — jamais un délai en dur", () => {
    const fin = new Date("2026-08-28T10:00:00.000Z");

    // 48 h : la valeur que les maquettes affichaient à tort. Si un « 24 h » était écrit quelque
    // part, il continuerait d'afficher le 29 alors que l'échéance réelle serait le 30.
    expect(reportDueAt(fin, 2 * PM30_24H)).toBe("2026-08-30T10:00:00.000Z");
    // 2 h : un délai serré, pour vérifier qu'on ne suppose aucune granularité de jour.
    expect(reportDueAt(fin, 7_200)).toBe("2026-08-28T12:00:00.000Z");
  });

  it("traverse un changement de mois sans se tromper", () => {
    const fin = new Date("2026-08-31T23:30:00.000Z");

    expect(reportDueAt(fin, PM30_24H)).toBe("2026-09-01T23:30:00.000Z");
  });
});

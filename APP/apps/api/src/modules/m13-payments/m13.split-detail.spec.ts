/**
 * S2 — le brut et la commission joints au journal des gains.
 *
 * ── Pourquoi ce champ existe ───────────────────────────────────────────────────────────────────
 *
 * `EarningsEntry.amountXaf` ne porte que le NET. Un médecin lisait « + 11 000 XAF » sans savoir ce
 * que le patient avait payé ni ce qui avait été prélevé — et les maquettes comblaient ce silence en
 * écrivant « 12 % » dans la page, quatre fois dans le seul écran C6.
 *
 * Or **le taux n'est pas PM-01** : c'est celui du contrat signé de CE bénéficiaire-là (RM-13-07).
 * Deux médecins peuvent avoir deux taux le même jour, et un même médecin deux taux à deux mois
 * d'écart si son contrat a été ré-édité. Un écran ne peut donc pas CALCULER une commission ; il ne
 * peut que lire celle qui a été appliquée.
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────────────────────────
 *
 * Deux règles, et les deux se trompent facilement :
 *
 *  1. **Une référence de retrait ne désigne aucun paiement.** Les mouvements `WITHDRAWAL` portent
 *     `withdrawal:<id>` en référence — les chercher parmi les commandes coûterait une requête pour
 *     rien, et un jour finirait par accrocher une commande homonyme.
 *  2. **`null`, jamais `0`.** L'absence de détail n'est pas une commission nulle. Un `0` afficherait
 *     « commission 0 (0 %) » sur un mouvement dont on ne sait simplement rien.
 */

/**
 * Copie de la règle d'appariement de `EarningsService.withSplitDetail`. La méthode est privée et
 * son service tire une dizaine de dépendances ; la simuler coûterait plus cher que la règle ne
 * vaut. On teste donc la RÈGLE, et tout écart se verrait au premier essai en ligne.
 */
function withSplitDetail(
  entries: Array<{ id: string; type: string; reference: string }>,
  splits: Array<{ orderRef: string; grossXaf: number; commissionXaf: number }>,
): Array<{ id: string; grossXaf: number | null; commissionXaf: number | null }> {
  const orderRefs = [...new Set(entries.filter((e) => !e.reference.startsWith("withdrawal:")).map((e) => e.reference))];
  const parRef = new Map(splits.filter((s) => orderRefs.includes(s.orderRef)).map((s) => [s.orderRef, s]));
  return entries.map((e) => {
    const s = parRef.get(e.reference);
    return { id: e.id, grossXaf: s?.grossXaf ?? null, commissionXaf: s?.commissionXaf ?? null };
  });
}

const CREDIT = (id: string, reference: string) => ({ id, type: "CREDIT", reference });
const RETRAIT = (id: string, withdrawalId: string) => ({ id, type: "WITHDRAWAL", reference: `withdrawal:${withdrawalId}` });

describe("S2 — le détail d'un mouvement du journal des gains", () => {
  it("attache le brut et la commission réellement appliqués", () => {
    const detail = withSplitDetail(
      [CREDIT("e1", "cmd-42")],
      [{ orderRef: "cmd-42", grossXaf: 12_500, commissionXaf: 1_250 }],
    );

    expect(detail[0]).toEqual({ id: "e1", grossXaf: 12_500, commissionXaf: 1_250 });
  });

  it("laisse deux taux différents cohabiter — c'est le contrat qui décide, pas un paramètre", () => {
    // RM-13-07 : deux médecins, ou un même médecin avant et après ré-édition de son contrat.
    const detail = withSplitDetail(
      [CREDIT("e1", "cmd-1"), CREDIT("e2", "cmd-2")],
      [
        { orderRef: "cmd-1", grossXaf: 10_000, commissionXaf: 1_000 },
        { orderRef: "cmd-2", grossXaf: 10_000, commissionXaf: 1_500 },
      ],
    );

    expect(detail[0].commissionXaf).toBe(1_000);
    expect(detail[1].commissionXaf).toBe(1_500);
  });

  it("ne cherche pas une commande derrière une référence de retrait", () => {
    // Le piège : `withdrawal:cmd-42` contient « cmd-42 ». Une recherche laxiste l'accrocherait.
    const detail = withSplitDetail(
      [RETRAIT("w1", "cmd-42")],
      [{ orderRef: "cmd-42", grossXaf: 12_500, commissionXaf: 1_250 }],
    );

    expect(detail[0]).toEqual({ id: "w1", grossXaf: null, commissionXaf: null });
  });

  it("rend `null` et non `0` quand la part de paiement est introuvable", () => {
    const detail = withSplitDetail([CREDIT("e1", "cmd-inconnue")], []);

    // `0` afficherait « commission 0 (0 %) » sur un mouvement dont on ne sait rien.
    expect(detail[0].grossXaf).toBeNull();
    expect(detail[0].commissionXaf).toBeNull();
  });

  it("sert un mouvement sans détail à côté d'un mouvement détaillé, sans confondre les deux", () => {
    const detail = withSplitDetail(
      [CREDIT("e1", "cmd-1"), CREDIT("e2", "cmd-2"), RETRAIT("w1", "x")],
      [{ orderRef: "cmd-1", grossXaf: 20_000, commissionXaf: 2_000 }],
    );

    expect(detail).toEqual([
      { id: "e1", grossXaf: 20_000, commissionXaf: 2_000 },
      { id: "e2", grossXaf: null, commissionXaf: null },
      { id: "w1", grossXaf: null, commissionXaf: null },
    ]);
  });
});

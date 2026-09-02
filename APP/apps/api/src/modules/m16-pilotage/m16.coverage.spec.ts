/**
 * S6 — la couverture par arrondissement.
 *
 * ── Ce que ce compte remplace ──────────────────────────────────────────────────────────────────
 *
 * La maquette E5 écrit six arrondissements avec leurs effectifs **en dur** — « Bacongo 78 soignants ·
 * 21 officines » — et conclut : « Makélékélé et Talangaï restent sous-couverts : moins d'un soignant
 * vérifié pour 8 000 habitants ».
 *
 * Deux choses distinctes s'y mélangent. Les **effectifs sont calculables** : chaque fiche
 * professionnelle porte son arrondissement. La **population ne l'est pas** — aucune donnée de
 * recensement n'existe, et ULAMU n'a aucune raison d'en détenir. Le tableau devient donc vrai ; la
 * phrase sur les habitants disparaît.
 *
 * ── Les officines ne sont plus comptées (02/09/2026, chantier 26) ──────────────────────────────
 *
 * Elles l'étaient — structures `PHARMACY` au statut `ACTIVE` — et six tests protégeaient ce compte.
 * La chaîne du médicament est sortie du périmètre d'ULAMU : plus personne n'alimente ces données.
 *
 * **Le retrait n'est pas cosmétique.** Un indicateur de couverture qui additionne un chiffre vivant
 * (les soignants) et un chiffre figé (les officines) donne un total faux, et il le donne dans le
 * bon sens de la crédibilité : le territoire paraît mieux couvert qu'il ne l'est. Sur un écran où
 * l'on décide où la plateforme manque, l'erreur est du mauvais côté.
 *
 * ⚠️ Ce fichier est une **copie de la règle** du service. Il avait continué de compter les officines
 * après que le service eut cessé de le faire — deux vérités pour une même règle, et c'est le test
 * qui mentait. Remis en phase le 02/09.
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────────────────────────
 *
 * **Qui compte comme « soignant » d'un arrondissement.** Le même filtre que le KPI « professionnels
 * vérifiés et actifs » : dossier `VERIFIED` **et** contrat signé (D-029). Compter les vérifiés non
 * signés gonflerait la couverture d'exerçants qui n'exercent pas — c'est-à-dire de médecins qu'aucun
 * patient ne peut joindre. Sur un indicateur d'accès aux soins, l'erreur est du mauvais côté.
 */

interface Soignant {
  district: string | null;
  verifie: boolean;
  contratSigne: boolean;
}

/**
 * Copie de la règle de `PilotKpiService.couvertureParArrondissement`. Le service tire Prisma ; on
 * teste donc la RÈGLE de sélection et de tri, qui est tout l'enjeu.
 */
function couverture(soignants: Soignant[]): Array<{ district: string; professionals: number }> {
  const parDistrict = new Map<string, { district: string; professionals: number }>();

  for (const s of soignants) {
    if (s.district === null || !s.verifie || !s.contratSigne) continue;
    const e = parDistrict.get(s.district) ?? { district: s.district, professionals: 0 };
    e.professionals += 1;
    parDistrict.set(s.district, e);
  }
  return [...parDistrict.values()].sort((a, b) => b.professionals - a.professionals);
}

const EXERCANT = (district: string | null): Soignant => ({ district, verifie: true, contratSigne: true });

describe("S6 — la couverture par arrondissement", () => {
  it("compte les soignants exerçants de chaque arrondissement", () => {
    const c = couverture([EXERCANT("Bacongo"), EXERCANT("Bacongo"), EXERCANT("Moungali")]);

    expect(c).toEqual([
      { district: "Bacongo", professionals: 2 },
      { district: "Moungali", professionals: 1 },
    ]);
  });

  it("EXCLUT un soignant vérifié qui n'a pas signé son contrat", () => {
    // Il ne peut pas exercer (D-029) : le compter gonflerait la couverture de praticiens
    // qu'aucun patient ne peut joindre.
    const c = couverture([EXERCANT("Bacongo"), { district: "Bacongo", verifie: true, contratSigne: false }]);

    expect(c[0].professionals).toBe(1);
  });

  it("exclut un soignant dont le dossier n'est pas vérifié", () => {
    const c = couverture([{ district: "Bacongo", verifie: false, contratSigne: true }]);

    expect(c).toEqual([]);
  });

  it("n'invente aucun arrondissement « non renseigné »", () => {
    // Une ligne sans district ressemblerait à un territoire dans un tableau de couverture.
    const c = couverture([EXERCANT(null), EXERCANT("Bacongo")]);

    expect(c).toEqual([{ district: "Bacongo", professionals: 1 }]);
  });

  it("trie du mieux couvert au moins couvert — la fin de liste est ce qui intéresse", () => {
    const c = couverture([EXERCANT("Bacongo"), EXERCANT("Bacongo"), EXERCANT("Bacongo"), EXERCANT("Makélékélé")]);

    expect(c.map((l) => l.district)).toEqual(["Bacongo", "Makélékélé"]);
  });

  it("répond une liste vide quand rien n'est encore couvert", () => {
    expect(couverture([])).toEqual([]);
  });

  /*
    Le compte des officines a disparu de la règle. On le verrouille, parce que le remettre serait
    la régression la plus naturelle du monde : le champ existe encore en base, et quelqu'un
    « compléterait » un jour un tableau qui paraît incomplet.
  */
  it("ne renvoie AUCUN compte d'officine — la chaîne du médicament est hors périmètre", () => {
    const c = couverture([EXERCANT("Bacongo")]);

    expect(Object.keys(c[0])).toEqual(["district", "professionals"]);
  });
});

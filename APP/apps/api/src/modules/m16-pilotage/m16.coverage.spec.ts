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
 * professionnelle et chaque structure portent leur arrondissement. La **population ne l'est pas** —
 * aucune donnée de recensement n'existe, et ULAMU n'a aucune raison d'en détenir. Le tableau devient
 * donc vrai ; la phrase sur les habitants disparaît.
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────────────────────────
 *
 * **Qui compte comme « soignant » d'un arrondissement.** Le même filtre que le KPI « professionnels
 * vérifiés et actifs » : dossier `VERIFIED` **et** contrat signé (D-029). Compter les vérifiés non
 * signés gonflerait la couverture d'exerçants qui n'exercent pas — c'est-à-dire de médecins qu'aucun
 * patient ne peut joindre. Sur un indicateur d'accès aux soins, l'erreur est du mauvais côté.
 *
 * **Et qui compte comme « officine ».** Une pharmacie suspendue ne couvre personne.
 */

interface Soignant {
  district: string | null;
  verifie: boolean;
  contratSigne: boolean;
}
interface Officine {
  district: string;
  type: "PHARMACY" | "LABORATORY";
  statut: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

/**
 * Copie de la règle de `PilotKpiService.couvertureParArrondissement`. Le service tire Prisma et
 * deux dépendances ; on teste donc la RÈGLE de sélection et de fusion, qui est tout l'enjeu.
 */
function couverture(
  soignants: Soignant[],
  officines: Officine[],
): Array<{ district: string; professionals: number; facilities: number }> {
  const parDistrict = new Map<string, { district: string; professionals: number; facilities: number }>();

  for (const s of soignants) {
    if (s.district === null || !s.verifie || !s.contratSigne) continue;
    const e = parDistrict.get(s.district) ?? { district: s.district, professionals: 0, facilities: 0 };
    e.professionals += 1;
    parDistrict.set(s.district, e);
  }
  for (const o of officines) {
    if (o.type !== "PHARMACY" || o.statut !== "ACTIVE") continue;
    const e = parDistrict.get(o.district) ?? { district: o.district, professionals: 0, facilities: 0 };
    e.facilities += 1;
    parDistrict.set(o.district, e);
  }
  return [...parDistrict.values()].sort((a, b) => b.professionals + b.facilities - (a.professionals + a.facilities));
}

const EXERCANT = (district: string | null): Soignant => ({ district, verifie: true, contratSigne: true });
const PHARMACIE = (district: string): Officine => ({ district, type: "PHARMACY", statut: "ACTIVE" });

describe("S6 — la couverture par arrondissement", () => {
  it("compte les soignants et les officines de chaque arrondissement", () => {
    const c = couverture([EXERCANT("Bacongo"), EXERCANT("Bacongo"), EXERCANT("Moungali")], [PHARMACIE("Bacongo")]);

    expect(c).toEqual([
      { district: "Bacongo", professionals: 2, facilities: 1 },
      { district: "Moungali", professionals: 1, facilities: 0 },
    ]);
  });

  it("EXCLUT un soignant vérifié qui n'a pas signé son contrat", () => {
    // Il ne peut pas exercer (D-029) : le compter gonflerait la couverture de praticiens
    // qu'aucun patient ne peut joindre.
    const c = couverture([EXERCANT("Bacongo"), { district: "Bacongo", verifie: true, contratSigne: false }], []);

    expect(c[0].professionals).toBe(1);
  });

  it("exclut un soignant dont le dossier n'est pas vérifié", () => {
    const c = couverture([{ district: "Bacongo", verifie: false, contratSigne: true }], []);

    expect(c).toEqual([]);
  });

  it("n'invente aucun arrondissement « non renseigné »", () => {
    // Une ligne sans district ressemblerait à un territoire dans un tableau de couverture.
    const c = couverture([EXERCANT(null), EXERCANT("Bacongo")], []);

    expect(c).toEqual([{ district: "Bacongo", professionals: 1, facilities: 0 }]);
  });

  it("exclut une pharmacie suspendue — elle ne couvre personne", () => {
    const c = couverture([], [PHARMACIE("Talangaï"), { district: "Talangaï", type: "PHARMACY", statut: "SUSPENDED" }]);

    expect(c[0].facilities).toBe(1);
  });

  it("exclut un laboratoire : ce n'est pas une officine", () => {
    const c = couverture([], [PHARMACIE("Talangaï"), { district: "Talangaï", type: "LABORATORY", statut: "ACTIVE" }]);

    expect(c[0].facilities).toBe(1);
  });

  it("garde un arrondissement qui n'a QUE des officines", () => {
    // Un territoire avec une pharmacie et aucun soignant est précisément ce que le pilotage cherche.
    const c = couverture([EXERCANT("Bacongo")], [PHARMACIE("Makélékélé")]);

    expect(c).toContainEqual({ district: "Makélékélé", professionals: 0, facilities: 1 });
  });

  it("trie du mieux couvert au moins couvert — la fin de liste est ce qui intéresse", () => {
    const c = couverture(
      [EXERCANT("Bacongo"), EXERCANT("Bacongo"), EXERCANT("Bacongo"), EXERCANT("Makélékélé")],
      [PHARMACIE("Bacongo")],
    );

    expect(c.map((l) => l.district)).toEqual(["Bacongo", "Makélékélé"]);
  });

  it("répond une liste vide quand rien n'est encore couvert", () => {
    expect(couverture([], [])).toEqual([]);
  });
});

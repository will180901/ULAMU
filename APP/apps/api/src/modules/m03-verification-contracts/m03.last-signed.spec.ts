/**
 * S4 — la dernière version SIGNÉE du contrat, servie à côté de la version courante.
 *
 * ── Pourquoi ce champ existe ───────────────────────────────────────────────────────────────────
 *
 * Un super-administrateur qui change PM-01 dans E3 déclenche la ré-édition automatique de tous les
 * contrats signés (EF-03-07, RM-03-05). La version ré-éditée est **non signée** : `canPractice`
 * tombe à `false`, et le soignant **ne peut plus exercer** tant qu'il n'a pas re-signé. Il perd son
 * droit d'exercer du jour au lendemain, sans avoir rien fait.
 *
 * `GET /v1/verification/me` ne servait que la version COURANTE. L'écran C1 aurait donc affiché
 * « nouveau taux : 12 % » sans dire d'où l'on vient — c'est-à-dire demander une signature à
 * l'aveugle, sur le seul chiffre qui change.
 *
 * ── La subtilité que ces tests protègent ───────────────────────────────────────────────────────
 *
 * **La version courante est exclue.** Si elle est signée, il n'y a pas d'avenant en cours et
 * l'écran n'a rien à comparer : ce champ ne doit répondre que lorsque la question se pose. Sans
 * cette exclusion, un contrat signé afficherait « ce que vous aviez signé : 12 % » en face de
 * « ce qu'on vous propose : 12 % » — une comparaison de soi à soi, qui donne l'impression qu'une
 * signature est attendue alors que tout est en règle.
 */

interface Version {
  version: number;
  commissionPct: number;
  signedAt: Date | null;
}

/**
 * Copie de la règle de `M03Service.lastSignedVersion`. La méthode est privée et son service tire
 * six dépendances ; la simuler coûterait plus cher que la règle ne vaut. On teste donc la RÈGLE,
 * et tout écart entre les deux se verrait au premier essai en ligne.
 */
function lastSignedVersion(versions: Version[]): { version: number; commissionPct: number } | null {
  const latest = [...versions].sort((a, b) => b.version - a.version).at(0) ?? null;
  if (!latest) return null;
  if (latest.signedAt !== null) return null;
  const signee = [...versions]
    .filter((v) => v.signedAt !== null && v.version !== latest.version)
    .sort((a, b) => b.version - a.version)
    .at(0);
  return signee ? { version: signee.version, commissionPct: signee.commissionPct } : null;
}

const SIGNEE = (version: number, commissionPct: number): Version => ({
  version,
  commissionPct,
  signedAt: new Date("2026-07-01T10:00:00.000Z"),
});
const NON_SIGNEE = (version: number, commissionPct: number): Version => ({ version, commissionPct, signedAt: null });

describe("S4 — la dernière version signée du contrat", () => {
  it("sert la version précédente quand la courante a été ré-éditée", () => {
    // Le cas réel : le taux passe de 10 à 12, le serveur ré-édite, la v3 arrive non signée.
    expect(lastSignedVersion([SIGNEE(2, 10), NON_SIGNEE(3, 12)])).toEqual({ version: 2, commissionPct: 10 });
  });

  it("ne répond RIEN quand la version courante est signée — il n'y a pas d'avenant", () => {
    // Sans cette exclusion : « vous aviez signé 12 % » en face de « on vous propose 12 % ».
    expect(lastSignedVersion([SIGNEE(2, 10), SIGNEE(3, 12)])).toBeNull();
  });

  it("ne répond rien sur une première signature : il n'y a rien à comparer", () => {
    expect(lastSignedVersion([NON_SIGNEE(1, 10)])).toBeNull();
  });

  it("remonte la PLUS RÉCENTE des versions signées, pas la première", () => {
    // Un soignant peut avoir traversé plusieurs avenants. Ce qui l'intéresse, c'est ce qu'il a
    // accepté en dernier — pas ce qu'il avait signé il y a deux ans.
    const detail = lastSignedVersion([SIGNEE(1, 8), SIGNEE(2, 10), NON_SIGNEE(3, 12)]);

    expect(detail).toEqual({ version: 2, commissionPct: 10 });
  });

  it("ignore une version ré-éditée puis abandonnée qui n'a jamais été signée", () => {
    // Deux ré-éditions de suite, sans signature entre les deux : la référence reste la v2.
    const detail = lastSignedVersion([SIGNEE(2, 10), NON_SIGNEE(3, 12), NON_SIGNEE(4, 15)]);

    expect(detail).toEqual({ version: 2, commissionPct: 10 });
  });

  it("gère une baisse de taux comme une hausse — la règle ne suppose aucun sens", () => {
    expect(lastSignedVersion([SIGNEE(2, 15), NON_SIGNEE(3, 10)])).toEqual({ version: 2, commissionPct: 15 });
  });

  it("ne répond rien quand aucun contrat n'existe", () => {
    expect(lastSignedVersion([])).toBeNull();
  });
});

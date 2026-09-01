/**
 * S5 — ce qu'un changement de paramètre coûterait, AVANT de le faire.
 *
 * ── Pourquoi cette lecture existe ──────────────────────────────────────────────────────────────
 *
 * Changer PM-01 ré-édite tous les contrats signés (D-022). La version ré-éditée est **non signée** :
 * chacun de ces soignants **cesse immédiatement de pouvoir exercer** — il disparaît de l'annuaire et
 * ne reçoit plus aucune demande — jusqu'à sa re-signature dans C1.
 *
 * `updateParameter` renvoie bien `reissuedCount`, mais APRÈS coup. Le super-administrateur validait
 * donc à l'aveugle, et la maquette comblait ce vide par une case morale — « je comprends les
 * conséquences » — sans jamais dire lesquelles. Une case à cocher n'est pas une information.
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────────────────────────
 *
 * **Le compte doit sélectionner exactement ce que l'action ré-édite.** `reissueSignedAgreements`
 * cherche les dossiers `VERIFIED` ayant au moins une version signée ; `impactOf` doit compter les
 * mêmes. Un compte qui diverge de l'action serait pire qu'aucun compte : il ferait valider un
 * changement sur une estimation fausse, et c'est le droit d'exercer de vraies personnes qui tombe.
 *
 * **Et seul PM-01 casse quelque chose.** M03 ne lit que lui pour fabriquer le texte du contrat
 * (`m16.policies`) : changer un délai, un prix ou un plafond ne ré-édite rien. Annoncer un impact
 * sur ces paramètres-là ferait hésiter devant un geste sans conséquence.
 */

interface Dossier {
  status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "VERIFIED" | "REJECTED" | "NEEDS_INFO" | "REVOKED";
  versionsSignees: number;
}

/** Le seul taux porté par le contrat — copie de `RATE_PARAMETER_KEYS` (`m16.policies`). */
const isRateParameter = (key: string): boolean => ["PM-01"].includes(key);

/**
 * Copie de la règle de `ParametersService.impactOf`, et du filtre de `reissueSignedAgreements` —
 * les deux DOIVENT sélectionner la même chose. Les services tirent Prisma et quatre dépendances ;
 * on teste donc la règle, et tout écart se verrait au premier changement de taux en ligne.
 */
function impactOf(key: string, dossiers: Dossier[]): { isRateParameter: boolean; signedAgreements: number } {
  if (!isRateParameter(key)) return { isRateParameter: false, signedAgreements: 0 };
  return {
    isRateParameter: true,
    signedAgreements: dossiers.filter((d) => d.status === "VERIFIED" && d.versionsSignees > 0).length,
  };
}

const VERIFIE_SIGNE: Dossier = { status: "VERIFIED", versionsSignees: 1 };
const VERIFIE_NON_SIGNE: Dossier = { status: "VERIFIED", versionsSignees: 0 };
const EN_EXAMEN_SIGNE: Dossier = { status: "IN_REVIEW", versionsSignees: 1 };

describe("S5 — l'impact d'un changement de paramètre", () => {
  it("compte les soignants dont le contrat signé sera ré-édité", () => {
    expect(impactOf("PM-01", [VERIFIE_SIGNE, VERIFIE_SIGNE, VERIFIE_NON_SIGNE])).toEqual({
      isRateParameter: true,
      signedAgreements: 2,
    });
  });

  it("ignore un dossier vérifié qui n'a JAMAIS signé — il n'a rien à perdre", () => {
    // Il ne peut déjà pas exercer : ré-éditer son contrat ne lui retire rien.
    expect(impactOf("PM-01", [VERIFIE_NON_SIGNE, VERIFIE_NON_SIGNE]).signedAgreements).toBe(0);
  });

  it("ignore un dossier signé qui n'est PLUS vérifié — même filtre que la ré-édition", () => {
    // `reissueSignedAgreements` exige `status: VERIFIED`. Compter plus large annoncerait un dégât
    // supérieur au dégât réel, et ferait renoncer à un changement légitime.
    expect(impactOf("PM-01", [EN_EXAMEN_SIGNE, VERIFIE_SIGNE]).signedAgreements).toBe(1);
  });

  it("ne promet aucun dégât sur un paramètre qui n'est pas un taux contractuel", () => {
    // PM-30 (délai de compte-rendu), PM-11 (délai de vérification), PM-35 (double validation) :
    // aucun n'apparaît dans le texte du contrat. Les changer ne ré-édite rien.
    for (const cle of ["PM-11", "PM-30", "PM-35", "PM-02"]) {
      expect(impactOf(cle, [VERIFIE_SIGNE, VERIFIE_SIGNE])).toEqual({ isRateParameter: false, signedAgreements: 0 });
    }
  });

  it("répond zéro quand aucun contrat n'a jamais été signé", () => {
    expect(impactOf("PM-01", [])).toEqual({ isRateParameter: true, signedAgreements: 0 });
  });

  it("distingue « ce n'est pas un taux » de « c'est un taux sans impact »", () => {
    // Les deux renvoient zéro, mais pas pour la même raison — et l'écran doit dire laquelle.
    expect(impactOf("PM-30", [VERIFIE_SIGNE]).isRateParameter).toBe(false);
    expect(impactOf("PM-01", []).isRateParameter).toBe(true);
  });
});

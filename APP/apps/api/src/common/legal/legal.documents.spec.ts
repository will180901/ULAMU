/**
 * Les textes acceptés à l'inscription — chantier 62, 07/09/2026 (EF-01-08, loi n° 29-2019).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * **1. La preuve et le texte ne peuvent plus diverger.** `ConsentRecord` enregistre « CGU v1.0 » et
 * le modèle qualifie cette ligne de preuve légale immuable. Tant que la version était écrite en dur
 * dans le service d'inscription et le texte en dur dans un composant du web, rien ne les reliait :
 * une phrase pouvait changer sans que la version bouge, et **tous les consentements passés se
 * mettaient à désigner un texte qui n'était plus celui qu'on avait lu**.
 *
 * **2. Ce que le texte AFFIRME doit être vrai.** Il est accepté à l'inscription : une phrase fausse
 * ici expose autant qu'un fait faux ailleurs. Le 24/08/2026, la politique affirmait un hébergement
 * « au Congo-Brazzaville » alors que `render.yaml` déclare `region: frankfurt` et la base Neon
 * `eu-central-1`. Le test ci-dessous empêche ce mensonge précis de revenir.
 */
import { consentRecordsToStore, currentVersion, LEGAL_DOCUMENTS } from "./legal.documents";

describe("Les documents légaux — une seule source", () => {
  it("porte exactement les deux documents dont l'acceptation est enregistrée", () => {
    expect(LEGAL_DOCUMENTS.map((d) => d.type)).toEqual(["CGU", "PRIVACY"]);
  });

  /*
    LE test de ce chantier. Ce que l'inscription écrit dans `ConsentRecord` est FABRIQUÉ à partir des
    documents : le jour où une version change, la preuve suit toute seule. Une liste recopiée à la
    main ne suivrait pas — c'est exactement ce qui existait avant.
  */
  it("fabrique les lignes de preuve à partir des documents, jamais à côté", () => {
    expect(consentRecordsToStore()).toEqual([
      { documentType: "CGU", documentVersion: "1.0" },
      { documentType: "PRIVACY", documentVersion: "1.0" },
    ]);
    // Et surtout : les deux listes disent la même chose, quelle que soit la version courante.
    expect(consentRecordsToStore()).toEqual(
      LEGAL_DOCUMENTS.map((d) => ({ documentType: d.type, documentVersion: d.version })),
    );
  });

  it("sait donner la version courante d'un document, et refuse un type inconnu", () => {
    expect(currentVersion("CGU")).toBe("1.0");
    expect(currentVersion("PRIVACY")).toBe("1.0");
    expect(() => currentVersion("AUTRE" as never)).toThrow();
  });

  it("donne un titre et un texte non vides — un document vide ne s'accepte pas", () => {
    for (const d of LEGAL_DOCUMENTS) {
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.version.length).toBeGreaterThan(0);
      expect(d.paragraphs.length).toBeGreaterThan(0);
      for (const p of d.paragraphs) {
        expect(p.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Ce que les textes affirment", () => {
  const confidentialite = LEGAL_DOCUMENTS.find((d) => d.type === "PRIVACY")!.paragraphs.join(" ");

  /*
    ⚠️ Non-régression du 24/08/2026. La phrase affirmait « hébergées au Congo-Brazzaville » ; tout
    est en Allemagne. Ce texte est accepté à l'inscription, donc il vaut preuve — et une preuve qui
    affirme un fait faux ne vaut rien, elle expose.
  */
  it("dit où les données sont RÉELLEMENT hébergées", () => {
    expect(confidentialite).toContain("Allemagne");
    expect(confidentialite).not.toMatch(/hébergé\w*\s+(au|en)\s+Congo/i);
  });

  it("nomme la loi qui s'applique", () => {
    expect(confidentialite).toContain("29-2019");
  });

  /*
    Les officines sont sorties du produit le 02/09/2026 (D-051, chantier 26). Les laisser dans les
    CGU promettrait par écrit un service qui n'existe plus — à des gens qui signent.
  */
  it("ne promet plus de mise en relation avec des officines", () => {
    const cgu = LEGAL_DOCUMENTS.find((d) => d.type === "CGU")!.paragraphs.join(" ");
    expect(cgu).not.toMatch(/officine|pharmaci/i);
  });
});

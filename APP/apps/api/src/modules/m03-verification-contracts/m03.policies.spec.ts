/**
 * Tests des règles M03 — critères d'acceptation CU-03-01/02/03/05 (EF-03-01→08, PM-01/PM-11).
 */
import { createHash } from "node:crypto";
import {
  buildAgreementText,
  canAddDocuments,
  canPracticeEffective,
  canTransition,
  isOverdue,
  missingRequiredDocs,
  requiredDocsSatisfied,
  VERIFICATION_STATUSES,
  VerificationStatusCode,
} from "./m03.policies";

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

describe("Machine d'états du dossier (EF-03-01/04/08, EF-02-06)", () => {
  const LEGAL: Array<[VerificationStatusCode, VerificationStatusCode]> = [
    ["DRAFT", "SUBMITTED"], // dépôt (CU-03-01)
    ["SUBMITTED", "IN_REVIEW"], // prise en examen (CU-03-02)
    ["IN_REVIEW", "VERIFIED"],
    ["IN_REVIEW", "REJECTED"],
    ["IN_REVIEW", "NEEDS_INFO"],
    ["REJECTED", "SUBMITTED"], // re-soumission après refus (EF-03-04)
    ["NEEDS_INFO", "SUBMITTED"], // re-soumission après complément (EF-03-04)
    ["VERIFIED", "REVOKED"], // révocation pour fraude (EF-03-08)
    ["VERIFIED", "IN_REVIEW"], // revalidation après transfert de titularité (EF-02-06)
    ["REVOKED", "IN_REVIEW"], // rétablissement d'une révocation prononcée à tort (dette n°25)
  ];

  it.each(LEGAL)("%s → %s : autorisée", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it("toute autre transition (y compris sur soi-même) est interdite", () => {
    const legalSet = new Set(LEGAL.map(([f, t]) => `${f}>${t}`));
    for (const from of VERIFICATION_STATUSES) {
      for (const to of VERIFICATION_STATUSES) {
        if (!legalSet.has(`${from}>${to}`)) {
          expect(canTransition(from, to)).toBe(false);
        }
      }
    }
  });

  /*
    ── Ce test disait l'inverse jusqu'au 04/09/2026 ───────────────────────────────────────────

    Il affirmait « REVOKED est terminal », et il avait raison de l'affirmer : le code disait
    `REVOKED: []`. La dette n°25 a montré ce que cette règle coûtait — `professionalId` étant
    `@unique`, un dossier révoqué sans sortie ferme l'accès du soignant à la plateforme **à vie**,
    y compris sur une erreur d'administration.

    Le test n'est pas supprimé : il est **resserré**. Ce qu'il défend maintenant est plus exigeant
    que ce qu'il défendait avant — REVOKED a exactement UNE sortie, et surtout PAS le retour direct
    au badge. Un rétablissement remet en examen ; il ne re-vérifie personne.
  */
  it("REVOKED n'a qu'une seule sortie : le retour en examen, jamais le badge (dette n°25)", () => {
    expect(canTransition("REVOKED", "IN_REVIEW")).toBe(true);

    for (const to of VERIFICATION_STATUSES) {
      if (to !== "IN_REVIEW") expect(canTransition("REVOKED", to)).toBe(false);
    }
    // La garde qui compte : on ne se re-décerne pas un badge en un clic.
    expect(canTransition("REVOKED", "VERIFIED")).toBe(false);
  });

  it("aucune décision sans prise en examen : SUBMITTED → VERIFIED interdit (CU-03-02)", () => {
    expect(canTransition("SUBMITTED", "VERIFIED")).toBe(false);
    expect(canTransition("DRAFT", "VERIFIED")).toBe(false);
  });
});

describe("Pièces modifiables par le déposant (CU-03-01, EF-03-04)", () => {
  it.each([
    ["DRAFT", true],
    ["NEEDS_INFO", true],
    ["REJECTED", true],
    ["SUBMITTED", false],
    ["IN_REVIEW", false],
    ["VERIFIED", false],
    ["REVOKED", false],
  ] as Array<[VerificationStatusCode, boolean]>)("%s → %s", (status, expected) => {
    expect(canAddDocuments(status)).toBe(expected);
  });
});

describe("Jeu minimal de pièces (EF-03-01 professionnel, EF-03-02 structure)", () => {
  it("professionnel : ID + DIPLOMA + LICENSE + PHOTO → complet", () => {
    expect(requiredDocsSatisfied("PROFESSIONAL", ["ID", "DIPLOMA", "LICENSE", "PHOTO"])).toBe(true);
  });

  it("professionnel : il manque la photo → incomplet, et le manque est nommé", () => {
    expect(requiredDocsSatisfied("PROFESSIONAL", ["ID", "DIPLOMA", "LICENSE"])).toBe(false);
    expect(missingRequiredDocs("PROFESSIONAL", ["ID", "DIPLOMA", "LICENSE"])).toEqual(["PHOTO"]);
  });

  it("structure : LICENSE + ID + ADDRESS_PROOF → complet ; DIPLOMA n'est pas exigé", () => {
    expect(requiredDocsSatisfied("FACILITY", ["LICENSE", "ID", "ADDRESS_PROOF"])).toBe(true);
    expect(requiredDocsSatisfied("FACILITY", ["LICENSE", "ID"])).toBe(false);
    expect(missingRequiredDocs("FACILITY", [])).toEqual(["LICENSE", "ID", "ADDRESS_PROOF"]);
  });

  it("les doublons et pièces surnuméraires ne changent rien", () => {
    expect(requiredDocsSatisfied("PROFESSIONAL", ["ID", "ID", "DIPLOMA", "LICENSE", "PHOTO", "ADDRESS_PROOF"])).toBe(true);
  });

  it("dossier vide → incomplet (CU-03-01 : rien n'est visible des patients)", () => {
    expect(requiredDocsSatisfied("PROFESSIONAL", [])).toBe(false);
  });
});

describe("Texte du contrat (EF-03-06) — déterminisme de l'empreinte", () => {
  it("mêmes entrées ⇒ même texte ⇒ même sha256 (scellement CU-03-03)", () => {
    const a = buildAgreementText("Dr Awa Ndiaye", 10, 1);
    const b = buildAgreementText("Dr Awa Ndiaye", 10, 1);
    expect(a).toBe(b);
    expect(sha256(a)).toBe(sha256(b));
  });

  it("le texte porte l'identité du signataire, le taux et la version", () => {
    const text = buildAgreementText("Pharmacie Mavré", 10, 2);
    expect(text).toContain("Pharmacie Mavré");
    expect(text).toContain("10 %");
    expect(text).toContain("VERSION 2");
  });

  it("changer le nom, le taux ou la version change l'empreinte (RM-03-05 : versions distinctes)", () => {
    const ref = sha256(buildAgreementText("Dr Awa Ndiaye", 10, 1));
    expect(sha256(buildAgreementText("Dr Awa Ndiayé", 10, 1))).not.toBe(ref);
    expect(sha256(buildAgreementText("Dr Awa Ndiaye", 12, 1))).not.toBe(ref);
    expect(sha256(buildAgreementText("Dr Awa Ndiaye", 10, 2))).not.toBe(ref);
  });
});

describe("Dépassement de file (spec §8 : 2× PM-11)", () => {
  const t0 = Date.parse("2026-06-11T08:00:00Z");
  const hours = (n: number) => n * 3_600_000;
  const PM11 = 72; // délai cible en heures (valeur de test — la prod lit ParamsService)

  it("en dessous de 2×PM-11 → pas d'alerte", () => {
    expect(isOverdue(t0, PM11, t0 + hours(143))).toBe(false);
  });

  it("exactement 2×PM-11 → pas encore dépassé (strictement au-delà)", () => {
    expect(isOverdue(t0, PM11, t0 + hours(144))).toBe(false);
  });

  it("au-delà de 2×PM-11 → signalé", () => {
    expect(isOverdue(t0, PM11, t0 + hours(144) + 1)).toBe(true);
  });

  it("le seuil suit PM-11 (aucun chiffre en dur)", () => {
    expect(isOverdue(t0, 1, t0 + hours(3))).toBe(true); // PM-11 = 1 h ⇒ alerte après 2 h
    expect(isOverdue(t0, 1, t0 + hours(1))).toBe(false);
  });
});

describe("Statut effectif « peut exercer » (C6, RM-03-01, EF-03-05)", () => {
  it("VERIFIED + version courante signée → peut exercer", () => {
    expect(canPracticeEffective("VERIFIED", true)).toBe(true);
  });

  it("VERIFIED sans signature → ne peut pas exercer (EF-03-06 : sans signature, pas d'activation)", () => {
    expect(canPracticeEffective("VERIFIED", false)).toBe(false);
  });

  it("tout autre statut → jamais, même contrat signé (révocation, examen…)", () => {
    for (const status of VERIFICATION_STATUSES.filter((s) => s !== "VERIFIED")) {
      expect(canPracticeEffective(status, true)).toBe(false);
    }
  });
});

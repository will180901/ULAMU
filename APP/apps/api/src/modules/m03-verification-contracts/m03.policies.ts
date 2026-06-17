/**
 * M03 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M03_verification_contrats.md
 */

/** Statuts du dossier (EF-03-01) — alignés sur l'enum Prisma `VerificationStatus`. */
export type VerificationStatusCode =
  | "DRAFT" // à compléter
  | "SUBMITTED" // déposé
  | "IN_REVIEW" // en examen
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_INFO" // complément demandé
  | "REVOKED";

export const VERIFICATION_STATUSES: readonly VerificationStatusCode[] = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "VERIFIED",
  "REJECTED",
  "NEEDS_INFO",
  "REVOKED",
];

/** Sujet du dossier : un professionnel (EF-03-01) ou une structure (EF-03-02). */
export type SubjectKind = "PROFESSIONAL" | "FACILITY";

/** Types de pièces justificatives admis (EF-03-01/02). */
export type DocumentKind = "ID" | "DIPLOMA" | "LICENSE" | "PHOTO" | "ADDRESS_PROOF";

export const DOCUMENT_KINDS: readonly DocumentKind[] = ["ID", "DIPLOMA", "LICENSE", "PHOTO", "ADDRESS_PROOF"];

/**
 * Jeu minimal de pièces par type de sujet :
 * - professionnel (EF-03-01) : identité, diplôme, autorisation d'exercice, photo de profil ;
 * - structure (EF-03-02) : autorisation de l'officine, identité du titulaire, justificatif de localisation.
 * ⚠️ Liste à confirmer avec les autorités (spec §9) — d'où ce point de réglage unique.
 */
export const REQUIRED_DOCS: Record<SubjectKind, readonly DocumentKind[]> = {
  PROFESSIONAL: ["ID", "DIPLOMA", "LICENSE", "PHOTO"],
  FACILITY: ["LICENSE", "ID", "ADDRESS_PROOF"],
};

/**
 * Machine d'états du dossier de vérification :
 * - DRAFT → SUBMITTED (dépôt, CU-03-01) ; SUBMITTED → IN_REVIEW (prise en examen, CU-03-02) ;
 * - IN_REVIEW → VERIFIED | REJECTED | NEEDS_INFO (décision motivée, EF-03-04) ;
 * - REJECTED/NEEDS_INFO → SUBMITTED (re-soumission possible, EF-03-04) ;
 * - VERIFIED → REVOKED (fraude, EF-03-08) ;
 * - VERIFIED → IN_REVIEW (revalidation système après transfert de titularité, EF-02-06 / CU-02-05) ;
 * - REVOKED : terminal — rien n'est effacé, le dossier reste comme preuve (RM-03-04).
 */
const LEGAL_TRANSITIONS: Record<VerificationStatusCode, readonly VerificationStatusCode[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW"],
  IN_REVIEW: ["VERIFIED", "REJECTED", "NEEDS_INFO"],
  VERIFIED: ["REVOKED", "IN_REVIEW"],
  REJECTED: ["SUBMITTED"],
  NEEDS_INFO: ["SUBMITTED"],
  REVOKED: [],
};

/** Valide une transition de statut — toute écriture de statut passe par ici. */
export function canTransition(from: VerificationStatusCode, to: VerificationStatusCode): boolean {
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

/** Les pièces ne se modifient que lorsque le dossier est entre les mains du déposant (CU-03-01, EF-03-04). */
export function canAddDocuments(status: VerificationStatusCode): boolean {
  return status === "DRAFT" || status === "NEEDS_INFO" || status === "REJECTED";
}

/** Pièces obligatoires encore absentes (sert aux messages d'erreur précis, CU-03-01). */
export function missingRequiredDocs(subject: SubjectKind, providedKinds: readonly string[]): DocumentKind[] {
  const provided = new Set(providedKinds);
  return REQUIRED_DOCS[subject].filter((kind) => !provided.has(kind));
}

/** Jeu minimal réuni ? (CU-03-01 : « toutes les pièces obligatoires sont téléversées ») */
export function requiredDocsSatisfied(subject: SubjectKind, providedKinds: readonly string[]): boolean {
  return missingRequiredDocs(subject, providedKinds).length === 0;
}

/**
 * Dossier en attente trop longtemps ? (spec §8 : aucun dossier sans réponse au-delà de 2× PM-11
 * sans alerte — le facteur 2 vient de la spec, PM-11 est le délai cible en heures, EF-03-03).
 * MVP : heures pleines — les « heures ouvrées » seront affinées avec le modèle opérationnel (spec §9).
 */
export function isOverdue(waitingSinceMs: number, pm11Hours: number, nowMs: number): boolean {
  return nowMs - waitingSinceMs > 2 * pm11Hours * 3_600_000;
}

/**
 * Texte du contrat numérique (EF-03-06, D-011) — DÉTERMINISTE : mêmes entrées ⇒ même texte
 * ⇒ même empreinte sha256 (scellement CU-03-03). Aucune horloge, aucun aléa ici.
 * Contenu exigé : identité du signataire, taux (PM-01 injecté), engagements de service,
 * clause de mise à jour du stock pour les pharmacies.
 */
export function buildAgreementText(name: string, commissionPct: number, version: number): string {
  return [
    `CONTRAT NUMÉRIQUE ULAMU — VERSION ${version}`,
    ``,
    `Entre la plateforme ULAMU (Congo-Brazzaville) et ${name}, ci-après « le Signataire ».`,
    ``,
    `Article 1 — Objet`,
    `Le présent contrat encadre l'activité du Signataire sur la plateforme ULAMU :`,
    `mise en relation avec les patients, prestations de santé et services associés.`,
    ``,
    `Article 2 — Conditions financières`,
    `ULAMU prélève une commission de ${commissionPct} % sur chaque prestation payée`,
    `(consultations, suivis, missions de triage). Le solde est crédité au Signataire.`,
    ``,
    `Article 3 — Engagements de service`,
    `Le Signataire s'engage à exercer sous sa véritable identité vérifiée, à respecter`,
    `le secret médical, à honorer les sessions payées et à tenir ses informations à jour.`,
    ``,
    `Article 4 — Mise à jour du stock (structures de type pharmacie)`,
    `Lorsque le Signataire est une pharmacie, il s'engage à maintenir son stock à jour ;`,
    `un stock obsolète est exclu de la recherche conformément aux règles de la plateforme.`,
    ``,
    `Article 5 — Avenants`,
    `Toute évolution des conditions (notamment du taux de commission) fait l'objet d'une`,
    `nouvelle version notifiée à l'avance, à re-signer pour rester actif.`,
    ``,
    `Article 6 — Révocation`,
    `En cas de fraude ou de manquement grave, ULAMU peut révoquer le Badge Vérifié ;`,
    `les sessions déjà payées sont honorées ou remboursées.`,
    ``,
    `Signataire : ${name} — Version ${version} — Commission : ${commissionPct} %.`,
  ].join("\n");
}

/**
 * C6 / RM-03-01 : « peut exercer » = Badge Vérifié ET version courante du contrat signée
 * (EF-03-05 posture stricte, EF-03-06 : sans signature, pas d'activation).
 */
export function canPracticeEffective(status: VerificationStatusCode, currentVersionSigned: boolean): boolean {
  return status === "VERIFIED" && currentVersionSigned;
}

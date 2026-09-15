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
 * - REVOKED → IN_REVIEW (rétablissement d'une révocation prononcée à tort — voir ci-dessous).
 *
 * ── Pourquoi REVOKED n'est plus terminal (04/09/2026, dette n°25) ─────────────────────────────
 *
 * Il l'était : `REVOKED: []`. RM-03-04 dit « rien n'est effacé, le dossier reste comme preuve » —
 * et cela reste vrai, un rétablissement n'efface RIEN : la décision de révocation et son motif
 * demeurent au dossier et au journal. Mais « ne rien effacer » avait été lu comme « ne rien
 * pouvoir reprendre », et les deux ne sont pas la même chose.
 *
 * Ce que cette lecture coûtait, constaté en construisant l'écran de révocation (chantier 42) :
 * `VerificationCase.professionalId` est `@unique`, donc un professionnel n'a **qu'un dossier, à
 * vie**. Un dossier révoqué et sans sortie fermait donc l'accès de ce soignant à la plateforme
 * **pour toujours** — y compris quand la révocation venait d'une erreur d'administration. La seule
 * issue était une écriture directe en base, c'est-à-dire hors de tout journal.
 *
 * Une plateforme de santé ne peut pas faire dépendre la carrière d'un soignant de l'absence
 * d'erreur d'un administrateur. La transition existe donc — **et elle est étroite** :
 *   • réservée au SUPER_ADMIN (`m03.admin.controller.ts`), pas à l'examinateur qui a révoqué ;
 *   • motivée, journalisée, et notifiée au soignant comme l'est la révocation ;
 *   • elle ne rend PAS le badge : elle remet le dossier en examen. Le rétablissement se décide
 *     ensuite par la voie normale (IN_REVIEW → VERIFIED), avec des pièces regardées.
 *
 * *Un geste irréversible n'est acceptable que si son irréversibilité sert à quelque chose. Ici
 * elle ne protégeait personne — elle punissait seulement l'erreur de celui qui n'a pas le clavier.*
 */
const LEGAL_TRANSITIONS: Record<VerificationStatusCode, readonly VerificationStatusCode[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW"],
  IN_REVIEW: ["VERIFIED", "REJECTED", "NEEDS_INFO"],
  VERIFIED: ["REVOKED", "IN_REVIEW"],
  REJECTED: ["SUBMITTED"],
  NEEDS_INFO: ["SUBMITTED"],
  REVOKED: ["IN_REVIEW"],
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
 * Le modèle de rédaction d'un contrat.
 *
 * ⚠️ **Le texte d'un contrat signé ne se réécrit JAMAIS.** Il n'est pas stocké : il est régénéré à
 * chaque lecture, puis comparé à l'empreinte scellée. Modifier la rédaction sans versionner le
 * modèle ferait basculer d'un coup **tous les contrats déjà signés** en « intégrité rompue » — et
 * leur titulaire ne les verrait plus, sans avoir rien fait.
 *
 * > **Une empreinte qui protège un texte protège aussi la faute qu'il contient : on ne peut plus le
 * > corriger sans détruire les preuves de ceux qui l'ont signé.**
 *
 * `null` désigne le modèle d'origine, celui d'avant que les modèles existent.
 */
export type ModeleContrat = "2026-09" | null;

/** Le modèle employé pour toute NOUVELLE version émise à partir d'aujourd'hui. */
export const MODELE_CONTRAT_COURANT: ModeleContrat = "2026-09";

/**
 * Texte du contrat numérique (EF-03-06, D-011) — DÉTERMINISTE : mêmes entrées ⇒ même texte
 * ⇒ même empreinte sha256 (scellement CU-03-03). Aucune horloge, aucun aléa ici.
 */
export function buildAgreementText(
  name: string,
  commissionPct: number,
  version: number,
  modele: ModeleContrat = null,
): string {
  return modele === "2026-09"
    ? contrat2026_09(name, commissionPct, version)
    : contratOrigine(name, commissionPct, version);
}

/**
 * ⚠️ **LE MODÈLE D'ORIGINE — INTOUCHABLE.**
 *
 * Des contrats signés en dépendent : leur empreinte a été calculée sur ces octets exacts. Changer
 * ne serait-ce qu'une virgule ici les rendrait illisibles pour ceux qui les ont signés.
 *
 * Il contient une faute connue — un « Article 4 » sur le stock des pharmacies, alors que la chaîne
 * du médicament a été retirée du produit (D-052) et les structures aussi (D-051). **Cette faute
 * reste ici**, parce qu'elle a été signée : *on ne corrige pas un contrat déjà signé, on en émet un
 * nouveau.* C'est ce que fait le modèle 2026-09.
 */
function contratOrigine(name: string, commissionPct: number, version: number): string {
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
 * ── Le modèle 2026-09 — chantier 133, 15/09/2026 ──────────────────────────────────────────────
 *
 * Écrit après relecture du modèle d'origine, qui présentait **une clause fausse et sept manques** :
 *
 *   ⚠️ **Article 4 sur le stock des pharmacies** : la chaîne du médicament a été retirée du produit
 *      (D-052), les structures aussi (D-051). *On faisait signer à des médecins un engagement sur
 *      un stock de pharmacie, pour une fonctionnalité qui n'existe plus.*
 *
 * Et ce qui manquait, dans un contrat de TÉLÉMÉDECINE :
 *
 *   1. **la responsabilité de l'acte** — la clause la plus importante d'un contrat de soin, et la
 *      seule qui compte le jour d'un litige ; elle était absente ;
 *   2. **la résiliation par le Signataire** — seule ULAMU pouvait rompre : *un contrat où une seule
 *      partie peut sortir n'est pas un contrat, c'est une adhésion* ;
 *   3. **les données de santé** — le Signataire accède à des Carnets de patients, et rien ne
 *      l'encadrait ;
 *   4. **le paiement des gains** — retrait à tout moment, commission de retrait (PM-02), délai de
 *      sécurité de 24 h après changement de numéro (PM-41) ;
 *   5. **le remboursement automatique** — règle réelle du produit : le soignant qui ne répond pas
 *      n'est pas payé. *Une règle qui décide de votre rémunération doit figurer au contrat qui la
 *      fonde, pas seulement dans le code qui l'applique* ;
 *   6. **la loi applicable et le tribunal compétent** — un contrat congolais qui ne dit pas devant
 *      qui l'on plaide laisse la question ouverte au pire moment ;
 *   7. **la durée et l'entrée en vigueur**.
 *
 * ⚠️ **Toujours DÉTERMINISTE** : aucune date, aucune horloge, aucun aléa. La date de signature vit
 * sur la version, pas dans le texte — *un texte qui contient sa propre date change d'empreinte
 * chaque jour et ne peut plus être scellé.*
 *
 * 📌 Les montants et délais ne sont PAS écrits en dur : la commission est injectée (PM-01). Les
 * autres paramètres sont nommés sans être chiffrés — *un contrat qui recopie un chiffre réglable
 * ment le jour où l'administration le change.*
 */
function contrat2026_09(name: string, commissionPct: number, version: number): string {
  return [
    `CONTRAT DE PARTENARIAT ULAMU`,
    `Version ${version} — modèle 2026-09`,
    ``,
    `ENTRE :`,
    `ULAMU, plateforme de télémédecine exploitée en République du Congo, ci-après « la Plateforme ».`,
    ``,
    `ET :`,
    `${name}, professionnel de santé vérifié, ci-après « le Praticien ».`,
    ``,
    `ARTICLE 1 — OBJET`,
    `La Plateforme met à la disposition du Praticien un service de mise en relation avec des`,
    `patients, un espace de consultation par messagerie, et les outils associés : compte-rendu,`,
    `ordonnance électronique et encaissement des honoraires.`,
    `La Plateforme n'exerce aucune activité de soin et ne s'immisce dans aucune décision médicale.`,
    ``,
    `ARTICLE 2 — RESPONSABILITÉ DE L'ACTE MÉDICAL`,
    `Le Praticien exerce en son nom propre, sous sa seule responsabilité professionnelle, et`,
    `demeure seul responsable de ses diagnostics, prescriptions et conseils.`,
    `Il lui appartient d'apprécier si l'état du patient permet une prise en charge à distance et,`,
    `à défaut, de l'orienter vers une consultation en présentiel ou vers l'urgence.`,
    `Le Praticien déclare être couvert par une assurance de responsabilité civile professionnelle`,
    `en cours de validité.`,
    ``,
    `ARTICLE 3 — CONDITIONS D'EXERCICE SUR LA PLATEFORME`,
    `Le Praticien s'engage à exercer sous l'identité vérifiée par la Plateforme, à maintenir à jour`,
    `ses informations professionnelles, et à répondre aux consultations qu'il a acceptées.`,
    `Il respecte le secret professionnel et n'utilise les informations auxquelles il accède qu'aux`,
    `fins du soin.`,
    ``,
    `ARTICLE 4 — DONNÉES DE SANTÉ`,
    `Le Praticien accède au dossier médical du patient pendant la durée de la consultation, et`,
    `uniquement dans cette limite. Chaque accès est journalisé.`,
    `Il s'interdit d'extraire, de conserver hors de la Plateforme ou de communiquer à un tiers les`,
    `données auxquelles il accède, sauf obligation légale ou continuité des soins.`,
    `Les échanges et les pièces sont chiffrés au repos par la Plateforme.`,
    ``,
    `ARTICLE 5 — HONORAIRES ET COMMISSION`,
    `Le Praticien fixe librement le prix de ses offres, dans les bornes publiées par la Plateforme.`,
    `Le prix affiché au patient est le prix final : aucun frais ne s'y ajoute.`,
    `La Plateforme retient une commission de ${commissionPct} % sur chaque prestation payée. Le solde`,
    `est crédité au Praticien.`,
    ``,
    `ARTICLE 6 — VERSEMENT DES GAINS`,
    `Les gains crédités sont retirables à tout moment, sans montant minimum, vers un numéro Mobile`,
    `Money dont le Praticien a prouvé qu'il en dispose.`,
    `Une commission de retrait, publiée par la Plateforme, peut s'appliquer.`,
    `Tout changement du numéro de retrait ouvre un délai de sécurité avant le retrait suivant.`,
    ``,
    `ARTICLE 7 — CONSULTATION NON HONORÉE`,
    `Lorsqu'une consultation payée reste sans réponse du Praticien, le patient est intégralement`,
    `remboursé par la Plateforme et aucun gain n'est crédité au Praticien.`,
    `Lorsque le compte-rendu n'est pas déposé dans le délai publié, les gains correspondants ne sont`,
    `pas crédités.`,
    ``,
    `ARTICLE 8 — DURÉE ET RÉSILIATION`,
    `Le contrat prend effet à sa signature électronique et se poursuit sans terme fixé.`,
    `Le Praticien peut y mettre fin à tout moment depuis son espace, sans motif ni préavis. Les`,
    `consultations déjà payées et en cours sont menées à leur terme, et les gains acquis lui restent`,
    `dus.`,
    `La Plateforme peut suspendre ou révoquer le Badge Vérifié en cas de fraude, de manquement grave`,
    `ou de perte des conditions d'exercice ; la décision est motivée et notifiée.`,
    `Dans tous les cas, les consultations déjà payées sont honorées ou remboursées.`,
    ``,
    `ARTICLE 9 — ÉVOLUTION DU CONTRAT`,
    `Toute évolution des conditions fait l'objet d'une nouvelle version, notifiée au Praticien.`,
    `Elle doit être signée pour que l'activité se poursuive ; à défaut, le compte reste accessible`,
    `mais le Praticien n'apparaît plus dans l'annuaire.`,
    ``,
    `ARTICLE 10 — PREUVE`,
    `La signature s'effectue par mot de passe et code à usage unique. Le texte signé est scellé par`,
    `une empreinte cryptographique qui permet, à tout moment, de vérifier qu'il n'a pas été modifié.`,
    `Les parties reconnaissent à ce procédé la valeur de preuve de leur engagement.`,
    ``,
    `ARTICLE 11 — LOI APPLICABLE`,
    `Le présent contrat est régi par le droit de la République du Congo.`,
    `Les parties rechercheront une solution amiable avant toute action ; à défaut, le litige relève`,
    `des tribunaux compétents de Brazzaville.`,
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

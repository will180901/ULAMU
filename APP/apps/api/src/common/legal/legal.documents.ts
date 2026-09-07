/**
 * Les textes acceptés à l'inscription — LA source, unique. Chantier 62, 07/09/2026 (EF-01-08).
 *
 * ── Pourquoi ils vivent ici, et plus dans un écran ─────────────────────────────────────────────
 *
 * `ConsentRecord` enregistre « CGU v1.0 » et « PRIVACY v1.0 » à chaque inscription, et le modèle
 * qualifie cet enregistrement de **preuve légale, immuable** (loi n° 29-2019). Or les textes
 * eux-mêmes vivaient en dur dans un composant du web, et la version « 1.0 » en dur dans ce service :
 * deux endroits sans lien, et une application mobile qui n'en montrait **aucun des deux**.
 *
 * ⚠️ **Une preuve qui dit « v1.0 » sans que rien ne définisse v1.0 ne prouve rien.** Le jour où une
 * phrase change dans l'écran, la version enregistrée ne bouge pas : tous les consentements passés
 * se mettent à désigner un texte qui n'est plus celui qui a été lu — et personne ne s'en aperçoit,
 * puisque rien ne relie les deux.
 *
 * Ici, le texte et sa version sont **le même objet**. Changer l'un oblige à regarder l'autre, la
 * route les sert ensemble, et les deux clients affichent forcément la même chose que ce que le
 * serveur enregistre.
 *
 * ── Ce que ces textes engagent ────────────────────────────────────────────────────────────────
 *
 * Ils sont acceptés à l'inscription : **ils valent preuve**. Une phrase fausse ici expose autant
 * qu'un fait faux ailleurs — c'est la leçon du « hébergées au Congo-Brazzaville » corrigé le
 * 24/08/2026, alors que `render.yaml` déclare `region: frankfurt` et la base Neon `eu-central-1`.
 *
 * ── Faire évoluer un texte ────────────────────────────────────────────────────────────────────
 *
 * Toute modification de fond exige une **nouvelle version** : les consentements déjà enregistrés
 * désignent l'ancienne, et la réécrire sous eux reviendrait à leur faire dire ce qu'ils n'ont
 * jamais dit. Une coquille sans effet juridique peut se corriger à version constante ; le doute
 * tranche en faveur d'une version de plus.
 */

/** Les deux documents dont l'acceptation est enregistrée (EF-01-08). */
export type LegalDocumentType = "CGU" | "PRIVACY";

export interface LegalDocument {
  type: LegalDocumentType;
  /** Enregistrée telle quelle dans `ConsentRecord.documentVersion`. */
  version: string;
  title: string;
  /** Le texte, paragraphe par paragraphe — sans mise en forme, que les clients habillent. */
  paragraphs: string[];
}

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    type: "CGU",
    version: "1.0",
    title: "Conditions générales d'utilisation",
    paragraphs: [
      // La mention des officines a été retirée le 02/09/2026 (chantier 26) : ULAMU ne met plus en
      // relation que des patients et des professionnels de santé vérifiés (D-051).
      "ULAMU met en relation des patients et des professionnels de santé vérifiés au Congo-Brazzaville. Le service ne remplace ni les urgences, ni une consultation présentielle lorsque l'état du patient l'exige.",
      "Le professionnel s'engage à ne répondre qu'aux demandes relevant de sa compétence et de sa vérification, et à orienter sans délai vers une structure adaptée dans le cas contraire.",
      "Toute décision médicale prise via la plateforme reste sous la responsabilité du professionnel qui la signe.",
    ],
  },
  {
    type: "PRIVACY",
    version: "1.0",
    title: "Politique de confidentialité",
    paragraphs: [
      // ⚠️ « en Allemagne » et non « au Congo-Brazzaville » : c'est la réalité de l'hébergement
      // (render.yaml → frankfurt, Neon → eu-central-1). Corrigé le 24/08/2026 — une preuve qui
      // affirme un fait faux ne vaut rien, et pire, elle expose.
      "Les données de santé sont traitées conformément à la loi n° 29-2019 sur la protection des données à caractère personnel. Elles sont chiffrées au repos comme en transit, et hébergées sur des serveurs situés en Allemagne (Francfort, Union européenne).",
      "Seuls les professionnels engagés dans une consultation ont accès au dossier concerné, et chaque accès est inscrit au journal d'audit, consultable par l'administration.",
      "La clôture d'un compte n'efface pas les comptes-rendus signés : leur conservation est une obligation légale.",
    ],
  },
];

/**
 * Ce qu'une inscription enregistre — dérivé des documents eux-mêmes, jamais réécrit à la main.
 *
 * C'est le point de tout ce fichier : la ligne de preuve et le texte lu ne peuvent plus diverger,
 * puisque la première est fabriquée à partir du second.
 */
export function consentRecordsToStore(): Array<{ documentType: LegalDocumentType; documentVersion: string }> {
  return LEGAL_DOCUMENTS.map((d) => ({ documentType: d.type, documentVersion: d.version }));
}

/** La version courante d'un document — pour l'annoncer avant de faire accepter. */
export function currentVersion(type: LegalDocumentType): string {
  const doc = LEGAL_DOCUMENTS.find((d) => d.type === type);
  if (!doc) throw new Error(`Document légal inconnu : ${type}`);
  return doc.version;
}

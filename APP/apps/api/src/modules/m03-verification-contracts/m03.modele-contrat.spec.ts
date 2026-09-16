/**
 * Le contrat : deux modèles, et l'ancien ne bouge jamais — chantier 133, 15/09/2026 (EF-03-06).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Le texte d'un contrat n'est pas stocké** : il est régénéré à chaque lecture, puis comparé à
 * l'empreinte scellée à la signature. Si les deux divergent, le serveur refuse de servir le texte —
 * et l'écran affiche « ce contrat ne correspond plus à son empreinte scellée ».
 *
 * C'est une bonne défense : elle interdit de réécrire en silence un contrat déjà signé. Mais elle a
 * une conséquence que rien ne disait, et que ce chantier a découverte en voulant corriger le texte :
 * **modifier la fonction de rédaction casse TOUS les contrats déjà signés d'un coup.**
 *
 * > **Une empreinte qui protège un texte protège aussi la faute qu'il contient : on ne peut plus le
 * > corriger sans détruire les preuves de ceux qui l'ont signé.**
 *
 * D'où deux modèles, et ces tests : *l'ancien est un dépôt d'archives, pas un brouillon.*
 *
 * ── La faute que le nouveau modèle corrige ────────────────────────────────────────────────────
 *
 * Le modèle d'origine fait signer aux médecins un « Article 4 » sur **le stock des pharmacies** —
 * alors que la chaîne du médicament a été retirée du produit (D-052) et les structures aussi
 * (D-051). Il était par ailleurs muet sur la **responsabilité de l'acte médical**, la résiliation
 * par le praticien, les données de santé, le versement des gains, le remboursement automatique et
 * la loi applicable.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAgreementText, MODELE_CONTRAT_COURANT } from "./m03.policies";

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

describe("Le modèle d'ORIGINE — une archive, pas un brouillon", () => {
  /*
    ⚠️ LE test de ce chantier. Cette empreinte a été calculée sur le texte tel qu'il existait le
    15/09/2026, avant qu'on y touche. Des contrats signés en dépendent : s'il bouge d'une virgule,
    leurs titulaires ne les voient plus.

    Si ce test tombe, la réponse n'est JAMAIS de mettre à jour l'empreinte : c'est de remettre le
    texte comme il était et d'écrire un nouveau modèle à côté.
  */
  it("rend exactement le texte sur lequel les contrats existants ont été scellés", () => {
    const texte = buildAgreementText("Armel Konaté", 10, 2, null);

    /*
      Cette empreinte a été VÉRIFIÉE contre la version du fichier antérieure au chantier 133
      (`git show HEAD:…m03.policies.ts`) : les 29 lignes du texte d'origine sont identiques, ligne à
      ligne. Ce n'est donc pas un chiffre relevé après coup sur le code d'aujourd'hui — c'est la
      preuve que l'archive n'a pas bougé.
    */
    expect(sha256(texte)).toBe("47264bc6c70b37048f4100ebc42fe302fae8e86eb15b6394c915e9a250aa988c");
  });

  /*
    La faute reste dans l'archive, et c'est voulu : on ne corrige pas un contrat déjà signé, on en
    émet un nouveau. Ce cas fige ce choix pour que personne ne « nettoie » l'ancien texte.
  */
  it("garde sa clause fautive sur les pharmacies — on ne réécrit pas ce qui a été signé", () => {
    const texte = buildAgreementText("Armel Konaté", 10, 1, null);

    expect(texte).toContain("Article 4 — Mise à jour du stock (structures de type pharmacie)");
  });

  it("reste le modèle par défaut, pour les versions d'avant la colonne", () => {
    expect(buildAgreementText("X", 10, 1)).toBe(buildAgreementText("X", 10, 1, null));
  });
});

describe("Le modèle 2026-09 — ce qu'un contrat de télémédecine doit dire", () => {
  const texte = buildAgreementText("Armel Konaté", 10, 3, "2026-09");

  it("ne parle plus d'un stock de pharmacie", () => {
    expect(texte).not.toMatch(/pharmacie/i);
    expect(texte).not.toMatch(/stock/i);
  });

  /*
    ⚠️ La clause la plus importante d'un contrat de soin, et la seule qui compte le jour d'un
    litige. Elle était absente.
  */
  it("dit qui répond de l'acte médical", () => {
    expect(texte).toContain("RESPONSABILITÉ DE L'ACTE MÉDICAL");
    expect(texte).toMatch(/sous sa seule responsabilité professionnelle/);
    expect(texte).toMatch(/responsabilité civile professionnelle/);
    // La plateforme dit aussi ce qu'elle N'EST pas : c'est ce qui protège les deux parties.
    expect(texte).toMatch(/n'exerce aucune activité de soin/);
  });

  /*
    Un contrat où une seule partie peut sortir n'est pas un contrat, c'est une adhésion.
  */
  it("laisse le praticien partir, et protège ses gains acquis", () => {
    expect(texte).toMatch(/peut y mettre fin à tout moment/);
    expect(texte).toMatch(/gains acquis lui restent/);
  });

  it("encadre l'accès aux données de santé", () => {
    expect(texte).toContain("DONNÉES DE SANTÉ");
    expect(texte).toMatch(/Chaque accès est journalisé/);
  });

  /*
    Une règle qui décide de votre rémunération doit figurer au contrat qui la fonde, pas seulement
    dans le code qui l'applique.
  */
  it("dit ce qui arrive quand une consultation n'est pas honorée", () => {
    expect(texte).toMatch(/intégralement\s*\n?\s*rembours/);
    expect(texte).toMatch(/aucun gain n'est crédité/);
  });

  it("nomme la loi applicable et le tribunal", () => {
    expect(texte).toMatch(/droit de la République du Congo/);
    expect(texte).toMatch(/tribunaux compétents de Brazzaville/);
  });

  /*
    📌 Un contrat qui recopie un chiffre réglable ment le jour où l'administration le change. Seule
    la commission est injectée — les autres paramètres sont nommés sans être chiffrés.
  */
  it("n'écrit aucun délai ni montant en dur", () => {
    const sansCommission = texte.replace(/10 %/g, "");

    expect(sansCommission).not.toMatch(/\b24\s*(h|heures)\b/);
    expect(sansCommission).not.toMatch(/\b\d+\s*jours?\b/);
    expect(sansCommission).not.toMatch(/\bXAF\b|\bFCFA\b/);
  });

  /*
    ⚠️ DÉTERMINISTE : aucune date, aucune horloge. Un texte qui contient sa propre date change
    d'empreinte chaque jour et ne peut plus être scellé.
  */
  it("reste identique à lui-même, appel après appel", () => {
    expect(buildAgreementText("Armel Konaté", 10, 3, "2026-09")).toBe(texte);
    expect(sha256(buildAgreementText("Armel Konaté", 10, 3, "2026-09"))).toBe(sha256(texte));
  });

  it("porte le taux injecté, jamais un taux écrit en dur", () => {
    expect(buildAgreementText("X", 12, 1, "2026-09")).toContain("commission de 12 %");
    expect(buildAgreementText("X", 8, 1, "2026-09")).toContain("commission de 8 %");
  });

  it("est bien le modèle courant", () => {
    expect(MODELE_CONTRAT_COURANT).toBe("2026-09");
  });
});

/*
  ── ⚠️ Les deux branchements que rien ne retenait ─────────────────────────────────────────────

  L'injection du 15/09 l'a montré : on pouvait faire régénérer un contrat signé avec le modèle
  COURANT, et faire ignorer à l'émission tout changement de modèle — **sans qu'un seul test tombe**.
  Ce sont pourtant les deux fautes les plus graves de ce chantier :

    • la première **casse tous les contrats déjà signés** d'un coup : l'empreinte ne correspond plus,
      et leur titulaire ne les voit plus, sans avoir rien fait ;
    • la seconde rend la correction **inutile** : le taux n'ayant pas changé, aucune nouvelle version
      n'est émise, et les praticiens restent engagés par l'ancien texte. *Une correction de contrat
      que personne n'est invité à signer n'a corrigé aucun contrat.*

  Ces deux règles ne sont pas des fonctions : ce sont des branchements dans un service qui tire six
  dépendances — ce fichier-ci l'a déjà constaté pour `lastSignedVersion`. On les ancre donc dans la
  SOURCE, comme le filet des promesses d'écran le fait déjà.

  *Un test faible sur une règle que rien ne gardait vaut mieux qu'un test parfait qu'on n'écrit pas.*
*/
describe("Ce que le service ne doit jamais se remettre à faire", () => {
  const source = readFileSync(resolve(__dirname, "m03.service.ts"), "utf8");

  /*
    ⚠️ On relit un contrat avec les mots qu'il portait quand il a été signé, jamais avec ceux
    d'aujourd'hui.
  */
  it("relit chaque version avec SON modèle, jamais avec le modèle courant", () => {
    expect(/latest\.template as ModeleContrat/.test(source)).toBe(true);

    // La régénération ne doit pas se voir passer le modèle courant : ce serait la faute exacte.
    const appel = /const regenerated = buildAgreementText\(([\s\S]{0,200}?)\);/.exec(source);
    expect(appel).toBeTruthy();
    expect((appel as RegExpExecArray)[1]).not.toContain("MODELE_CONTRAT_COURANT");
  });

  /*
    ⚠️ Sans le modèle dans cette condition, une nouvelle rédaction ne serait jamais proposée à
    personne — le taux n'ayant pas changé, la fonction repartirait sans rien faire.
  */
  it("émet une nouvelle version quand le MODÈLE change, pas seulement le taux", () => {
    expect(/last\.template === MODELE_CONTRAT_COURANT/.test(source)).toBe(true);
  });

  it("scelle la nouvelle version avec le modèle dont elle est issue", () => {
    expect(/template: MODELE_CONTRAT_COURANT/.test(source)).toBe(true);
  });

  /*
    ⚠️ **Le chaînon manquant du chantier 133, trouvé le 16/09 (chantier 136).**

    La règle ci-dessus vit dans le service — encore faut-il que quelqu'un puisse la déclencher. La
    seule voie est le bouton « rééditer » de l'écran d'administration, et cet écran ne recevait que
    les TAUX. Un contrat au bon taux mais à l'ancienne rédaction s'y affichait donc comme « il n'y a
    rien à rééditer », **sans bouton** — et le contrat corrigé n'aurait été proposé à personne.

    > **Une correction de contrat que personne n'est invité à signer n'a corrigé aucun contrat.**

    *Une règle juste dans un service que rien n'appelle n'est pas une règle : c'est une intention.*
  */
  it("sert le MODÈLE du contrat à l'écran qui décide de le rééditer", () => {
    expect(/agreementTemplate: latest\?\.template \?\? null/.test(source)).toBe(true);
    expect(/currentTemplate: MODELE_CONTRAT_COURANT/.test(source)).toBe(true);
  });
});

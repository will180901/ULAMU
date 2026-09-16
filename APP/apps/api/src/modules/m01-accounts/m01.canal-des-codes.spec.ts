/**
 * Par où partent les codes à usage unique — chantier 138, 16/09/2026 (M01).
 *
 * ── Ce qui s'est passé ────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Aucun SMS ne quitte ce déploiement.** La seule passerelle branchée est celle de
 * développement : elle journalise le message et n'appelle aucun opérateur. Le constat existait déjà
 * dans le code — `requestCloseOtp` l'écrivait noir sur blanc, et avait été corrigé pour ça — mais il
 * n'avait été tiré qu'à **un seul endroit**. La signature de contrat, elle, était restée au SMS.
 *
 * Résultat, mesuré en ligne le 16/09 : le porteur, à qui l'on demandait un « code reçu », a cherché
 * un code qui n'arrivait nulle part. Pendant ce temps l'annuaire restait vide, faute de signature.
 *
 * > **Un correctif appliqué à un seul appelant n'est pas un correctif, c'est une exception.**
 *
 * ── Pourquoi ces cas lisent la SOURCE ─────────────────────────────────────────────────────────
 *
 * Le parcours complet est éprouvé par `test/m01.int.spec.ts`, qui demande une base de données et ne
 * tourne donc pas dans la suite unitaire. Ce que ces cas gardent est d'une autre nature : **une
 * décision de routage** — quel canal pour quel code — qu'une refonte bien intentionnée peut défaire
 * sans casser un seul parcours. *Un test faible sur une règle que rien ne gardait vaut mieux qu'un
 * test parfait qu'on n'écrit pas.*
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Par où partent les codes à usage unique", () => {
  const source = readFileSync(resolve(__dirname, "m01.service.ts"), "utf8");

  /*
    ⚠️ LE cas de ce chantier. `{ phone: account.phone }` désigne le numéro du TITULAIRE — jamais une
    ligne qu'on cherche à prouver. Tout code qui partait par là partait dans les journaux du serveur.
  */
  it("n'envoie plus aucun code au numéro du titulaire", () => {
    expect(/requestOtp\(\{ phone: account\.phone \}/.test(source)).toBe(false);
  });

  /*
    La décision est écrite UNE fois et tous les appelants la traversent. C'est ce qui empêche qu'un
    correctif redevienne une exception.
  */
  it("fait passer tous les codes du titulaire par la même décision", () => {
    expect(/private async requestOtpToOwner\(/.test(source)).toBe(true);
    // Action sensible (signature de contrat), clôture de compte, changement de numéro.
    expect([...source.matchAll(/this\.requestOtpToOwner\(/g)].length).toBeGreaterThanOrEqual(3);
  });

  /*
    📌 **Pas de repli silencieux.** Retomber sur un canal qui n'arrive nulle part fait croire qu'un
    code est parti et laisse quelqu'un l'attendre — c'est exactement ce qui vient de coûter une
    matinée. *Un code envoyé nulle part est pire qu'un refus qui dit comment s'en sortir.*
  */
  it("refuse, et le refus porte le geste à faire", () => {
    const decision = /private async requestOtpToOwner\(([\s\S]*?)\n  \}/.exec(source);
    expect(decision).toBeTruthy();
    const corps = (decision as RegExpExecArray)[1];

    expect(corps).toContain("BadRequestException");
    expect(corps).toContain("Mes paramètres");
    // Aucun repli vers un canal qui n'arrive nulle part.
    expect(corps).not.toContain("phone");
  });

  /*
    ⚠️ **Le garde-fou qui compte dans l'autre sens.** Deux codes ne DOIVENT PAS passer à l'email, et
    les convertir « par cohérence » serait une faute grave :
      • `MOMO_VERIFY` prouve qu'on tient la ligne Mobile Money **qui reçoit l'argent** ;
      • un code de ce genre envoyé ailleurs laisserait déclarer le numéro de n'importe qui.

    > **Un code envoyé ailleurs qu'à la ligne qu'il prétend prouver ne prouve rien.**

    Conséquence assumée et écrite : tant qu'aucune passerelle SMS réelle n'existe, **vérifier un
    numéro de retrait est impossible**. C'est une limite de déploiement, pas une règle à contourner.
  */
  it("garde le SMS là où il PROUVE quelque chose — le numéro Mobile Money", () => {
    expect(/requestOtp\(\{ phone: ligne\.msisdn \}, OtpPurpose\.MOMO_VERIFY\)/.test(source)).toBe(true);
  });

  /*
    La réponse dit OÙ le code est parti. Sans cela, l'écran ne peut qu'annoncer « un code vient de
    vous être envoyé » — et *on ne cherche pas dans une boîte dont on ignore l'existence.*
  */
  it("dit par où le code est parti, et vers quelle adresse", () => {
    expect(/channel: "email", hint: masquerEmail\(account\.email\)/.test(source)).toBe(true);
  });
});

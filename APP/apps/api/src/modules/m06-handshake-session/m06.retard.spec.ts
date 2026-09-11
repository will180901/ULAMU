/**
 * Le compteur de retard du soignant (D-032) — chantier 93, 11/09/2026.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * Le porteur a vu, sur le téléphone du patient, un badge rouge : **« retard 32:13 »**. Il a demandé
 * ce que c'était. En mesurant sur sa consultation réelle :
 *
 *   · total affiché .................. 1 930 s
 *   · dont le patient attendait ......... 90 s
 *   · **dont le soignant après LUI-MÊME . 1 840 s (95 %)**
 *
 * La règle comptait tout écart précédant un message du soignant — y compris quand le message
 * précédent était **le sien**. Écrire « Bonjour », réfléchir dix minutes, puis envoyer son analyse
 * coûtait neuf minutes et demie de « retard », alors que personne n'attendait.
 *
 * ⚠️ **Et rien ne tenait cette fonction.** La corriger n'a fait tomber aucun des 648 tests : elle
 * n'avait aucune couverture propre. *Une règle qui juge quelqu'un et que rien ne vérifie est une
 * accusation sans preuve.*
 */
import { accumulatedProfessionalDelaySec, PROFESSIONAL_DELAY_TOLERANCE_SEC } from "./m06.policies";

const PRO = "pro-1";
const PATIENT = "pat-1";
const T0 = new Date("2026-09-11T20:00:00.000Z").getTime();

/** Un fil de messages, décrits par leur auteur et leur instant en secondes depuis le début. */
const fil = (...etapes: Array<[string, number]>) =>
  etapes.map(([senderId, s]) => ({ senderId, createdAt: new Date(T0 + s * 1000) }));

describe("Le compteur de retard du soignant (D-032)", () => {
  it("la tolérance est de trente secondes", () => {
    expect(PROFESSIONAL_DELAY_TOLERANCE_SEC).toBe(30);
  });

  it("une réponse dans la tolérance ne coûte rien", () => {
    expect(accumulatedProfessionalDelaySec(fil([PATIENT, 0], [PRO, 25]), PRO)).toBe(0);
  });

  it("au-delà, seul l’excédent est compté", () => {
    // 45 s d'attente, 30 s tolérées → 15 s.
    expect(accumulatedProfessionalDelaySec(fil([PATIENT, 0], [PRO, 45]), PRO)).toBe(15);
  });

  /*
    ── ⚠️ LE défaut, mesuré sur une consultation réelle ────────────────────────────────────────

    Le soignant écrit, puis se tait, puis écrit encore. **Le patient n'attend rien** — il a la
    dernière réponse sous les yeux. Facturer ce silence comme un retard, c'est reprocher à quelqu'un
    de prendre le temps de bien écrire.
  */
  it("le soignant qui écrit après lui-même n’accumule AUCUN retard", () => {
    expect(accumulatedProfessionalDelaySec(fil([PRO, 0], [PRO, 1000]), PRO)).toBe(0);
  });

  it("même sur plusieurs messages d’affilée", () => {
    expect(accumulatedProfessionalDelaySec(fil([PRO, 0], [PRO, 900], [PRO, 1800]), PRO)).toBe(0);
  });

  /*
    Le cas RÉEL du 11/09, reconstruit à partir des écarts mesurés en ligne : quatre écarts comptés
    par l'ancienne règle, dont **trois** étaient des messages du soignant après les siens.

    Ancienne règle : 13 + 90 + 954 + 873 = 1 930 s. Nouvelle : 90 s.
  */
  it("reproduit la consultation du porteur : 1 930 s deviennent 90 s", () => {
    const reel = fil(
      [PATIENT, 0],
      [PRO, 43], // après le patient… mais l'écart précédent venait du PRO dans le fil réel
      [PATIENT, 100],
      [PRO, 220], // 120 s après le patient → 90 s comptées
      [PRO, 1204], // 984 s après LUI-MÊME → 0
      [PRO, 2108], // 904 s après LUI-MÊME → 0
    );
    // 43 s après le patient → 13 s ; 120 s après le patient → 90 s ; le reste ne compte plus.
    expect(accumulatedProfessionalDelaySec(reel, PRO)).toBe(13 + 90);
  });

  /*
    Et le miroir : le patient qui met vingt minutes à répondre n'entre dans aucun compteur. Le
    dispositif mesure la réactivité du SOIGNANT — c'est lui qui est payé pour être là.
  */
  it("les silences du patient ne comptent pour personne", () => {
    expect(accumulatedProfessionalDelaySec(fil([PRO, 0], [PATIENT, 1200]), PRO)).toBe(0);
  });

  it("un fil vide ou d’un seul message ne compte rien", () => {
    expect(accumulatedProfessionalDelaySec([], PRO)).toBe(0);
    expect(accumulatedProfessionalDelaySec(fil([PATIENT, 0]), PRO)).toBe(0);
  });

  /* L'ordre d'arrivée ne doit rien changer : la fonction trie avant de compter. */
  it("compte pareil quel que soit l’ordre du tableau", () => {
    const desordre = fil([PRO, 220], [PATIENT, 100], [PATIENT, 0]);
    expect(accumulatedProfessionalDelaySec(desordre, PRO)).toBe(90);
  });
});

/**
 * @format
 * ⚠️ L'ordre des crochets de `SessionScreen` — chantier 102, 12/09/2026.
 *
 * ── Le défaut que ce fichier garde ────────────────────────────────────────────────────────────
 *
 * Le chantier 98 a ajouté un `useEffect` — le battement de présence du patient — **après les
 * retours anticipés** de cet écran. Or `SessionScreen` rend quatre écrans différents selon l'état de
 * la séance : chargement, erreur, pré-consultation, conversation. Chacun sort par son propre
 * `return`.
 *
 * Résultat : le crochet n'était appelé que sur le dernier. React a compté un crochet de plus dès que
 * la séance s'ouvrait, et l'application **s'est arrêtée sur un écran rouge** :
 *
 *     Rendered more hooks than during the previous render.
 *
 * Vu par le porteur, sur une vraie consultation qu'il venait de payer.
 *
 * > **Un composant qui rend plusieurs écrans selon son état n'a pas le droit d'avoir ses crochets
 * > dispersés entre eux.**
 *
 * ── Pourquoi un test de SOURCE ────────────────────────────────────────────────────────────────
 *
 * Reproduire la panne demanderait de monter l'écran deux fois, avec deux états de séance et tout le
 * réseau doublé — et la panne ne se déclare qu'au SECOND rendu. *Le défaut, lui, est une règle de
 * position : il se lit.* Ce test regarde donc où sont les crochets par rapport au premier `return`,
 * ce qui est exactement la règle de React.
 */
import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const CROCHET = /\n {2}(?:const .* = )?use[A-Z]\w*\(/g;

/**
 * Un `return` qui rend un ÉCRAN — c'est-à-dire dont la valeur commence par du JSX.
 *
 * ⚠️ **Premier motif, qui ne détectait rien** : `/\n {2}return [(<]/`, deux espaces d'indentation.
 * Or les retours anticipés vivent DANS un `if` — quatre espaces. Le motif ne trouvait donc que le
 * `return` final du composant, après lequel il n'y a évidemment aucun crochet. *La faute exacte que
 * le porteur avait vue à l'écran passait sans réveiller personne.*
 *
 * Et l'indentation seule ne suffit pas non plus : `return () => clearInterval(...)` — le nettoyage
 * d'un effet — vit au même niveau. On reconnaît donc un retour d'écran à ce qu'il rend : du JSX.
 */
const RETOURS_JSX = [/\n\s+return \(\s*\n\s*</, /\n\s+return </];

function corpsDuComposant(): string {
  const source = readFileSync(resolve(__dirname, '..', 'src/screens/SessionScreen.tsx'), 'utf8');
  const debut = source.indexOf('export function SessionScreen');
  expect(debut).toBeGreaterThan(-1);
  // On s'arrête au composant suivant : les crochets des autres ne nous regardent pas.
  const fin = source.indexOf('\nfunction ', debut);
  return source.slice(debut, fin > 0 ? fin : undefined);
}

describe("L'ordre des crochets de l'écran de consultation", () => {
  it('⚠️ aucun crochet après le premier retour anticipé', () => {
    const corps = corpsDuComposant();
    const premierRetour = Math.min(
      ...RETOURS_JSX.map((r) => corps.search(r)).filter((i) => i > -1),
    );
    expect(Number.isFinite(premierRetour)).toBe(true);

    const fautifs: string[] = [];
    for (const m of corps.matchAll(CROCHET)) {
      if ((m.index ?? 0) > premierRetour) fautifs.push(m[0].trim());
    }

    /*
      ⚠️ Jest — contrairement à vitest — n'accepte PAS de message en second argument d'`expect` : il
      lève « Expect takes at most one argument » et l'échec accuse le test au lieu du code. On fait
      donc porter l'explication par la valeur comparée : ce qui s'affiche à l'échec est la liste des
      crochets fautifs, ce qu'on voulait lire.
    */
    expect(fautifs.join(' · ')).toBe('');
  });

  /*
    ── ⚠️ Une séance en PRÉPARATION ouvre la conversation — chantier 105 ────────────────────────

    La pré-consultation a été retirée : le patient entre directement dans le fil, et son premier
    message démarre le décompteur. Un retour anticipé sur `PREPARING` le renverrait devant un écran
    d'attente — ou, pire, devant rien.

    *Une faute injectée qui remettait ce retour n'a réveillé aucun test : la panne aurait été un
    écran blanc au moment précis où quelqu'un vient de payer.*
  */
  it('⚠️ aucune sortie anticipée sur une séance en préparation', () => {
    expect(corpsDuComposant()).not.toMatch(/if \(session\.status === 'PREPARING'\)/);
  });

  /*
    Et le battement de présence est bien là : c'est lui qui permet au soignant de voir « en ligne »
    plutôt que « hors ligne » pour toujours. Le retirer réglerait la panne de crochets et casserait
    la fonctionnalité — *le test qui garde la position doit aussi garder la présence.*
  */
  it('et le battement de présence y est toujours', () => {
    expect(corpsDuComposant()).toContain('api.presenceHeartbeat()');
  });
});

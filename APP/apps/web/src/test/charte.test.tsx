/**
 * Conformité à la charte — interdictions absolues de CG-06 §07 et CG-09 §05.
 *
 * ⚠️ **État transitoire (09/08/2026).** Cinq de ces règles portaient sur la coquille applicative —
 * barre latérale, topbar, menus, navigation — retirée par la refonte shadcn. Elles ne sont pas
 * abandonnées : elles sont suspendues en `it.todo`, ce qui les fait apparaître à chaque exécution
 * comme une dette visible plutôt que de disparaître silencieusement du dépôt. Chacune doit redevenir
 * une assertion réelle quand la coquille correspondante est reconstruite.
 *
 * Ce qui reste vérifié ici ne dépend d'aucun composant : ce sont des propriétés des JETONS, donc
 * vraies quelle que soit l'implémentation qui les consomme.
 *
 * **Pourquoi ces règles existent.** Le système de design du web est un port de CMS-SARIS, qui
 * désactive toutes les ombres en thème sombre — au motif, juste, qu'une ombre portée ne se voit
 * presque pas sur un fond déjà sombre : pour une CARTE posée sur la page, la hiérarchie passe alors
 * par la bordure. Mais un MENU n'est pas une carte : il flotte au-dessus du contenu. En sombre, il
 * devenait donc strictement plat — ce que CG-06 §07 range parmi les interdictions absolues
 * (« jamais plat »). D'où le token `--ombre-flottante`, défini séparément dans les deux thèmes.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CSS = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8')

/** Extrait la valeur d'un token dans un bloc donné (`:root` ou `.dark`). */
function token(bloc: ':root' | '.dark', nom: string): string | null {
  const debut = CSS.indexOf(`${bloc} {`)
  if (debut < 0) return null
  const fin = CSS.indexOf('\n}', debut)
  const corps = CSS.slice(debut, fin)
  const m = corps.match(new RegExp(`${nom}\\s*:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}

describe('CG-06 §07 — interdictions absolues', () => {
  it('les surfaces flottantes ont une élévation dans les DEUX thèmes (« menu jamais plat »)', () => {
    const clair = token(':root', '--ombre-flottante')
    const sombre = token('.dark', '--ombre-flottante')

    expect(clair, '--ombre-flottante manquant en thème clair').toBeTruthy()
    expect(sombre, '--ombre-flottante manquant en thème sombre').toBeTruthy()
    // C'est précisément le piège : en sombre, --ombre-4 vaut `none`. Un menu qui s'y raccrocherait
    // serait plat. Le token doit donc survivre à la refonte — les composants shadcn s'y brancheront.
    expect(sombre).not.toBe('none')
    expect(clair).not.toBe('none')
  })

  // ── Suspendues avec la coquille supprimée — à réactiver sur l'implémentation shadcn ────────────
  it.todo('les surfaces flottantes (menu, palette, infobulle, barre latérale) utilisent --ombre-flottante et jamais --ombre-4')
  it.todo('la barre latérale porte le verre dépoli (« sidebar sans glassmorphism » interdit)')
  it.todo('la topbar reste sticky et porte le grain (deux interdictions explicites)')
  it.todo('les libellés de groupe de navigation sont en monospace majuscule')
  it.todo('l’item de navigation actif a un FOND et une COULEUR, pas seulement l’un des deux')
})

describe('CG-09 §05 — mouvement', () => {
  it('aucune transition d’interaction courante ne dépasse le plafond de 400 ms', () => {
    const durees = [...CSS.matchAll(/--dur-[a-z]+:\s*(\d+)ms/g)].map((m) => Number(m[1]))
    expect(durees.length).toBeGreaterThan(0)
    expect(Math.max(...durees)).toBeLessThanOrEqual(400)
  })

  it('prefers-reduced-motion est implémenté (obligation explicite)', () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  CONTRASTE — le seul endroit où « c'est joli » se démontre au lieu de se discuter
  ══════════════════════════════════════════════════════════════════════════════════════════════

  Ajouté le 09/09/2026, après que le même défaut soit apparu DEUX fois en une journée :

  1. Chantier 69 — le texte tertiaire du thème SOMBRE donnait 3,80:1. Le défaut avait été trouvé et
     corrigé dans le thème CLAIR le 20/08, et le sombre n'avait jamais été re-mesuré.
  2. Chantier 70 — le bandeau des six mois donnait 4,30:1 en thème CLAIR. J'avais vérifié le sombre,
     pas le clair. **La faute exactement symétrique, une heure après avoir écrit la leçon.**

  D'où ce test : il n'attend plus que quelqu'un pense à regarder l'autre palette. Il lit les jetons
  et calcule, pour LES DEUX thèmes à la fois.

  ⚠️ Il porte sur les paires que le système emploie réellement — une encre sur une SURFACE. Il ne
  peut pas remplacer un regard sur l'écran : il ne voit ni les fonds semi-transparents, ni les
  couleurs écrites dans un composant. Ce qu'il garantit, c'est qu'aucune retouche de palette ne
  pourra plus faire passer une encre sous le seuil sans que rien ne proteste.
*/

/** Luminance relative d'un `#rrggbb`, formule WCAG 2.1. */
function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const canaux = [n.slice(0, 2), n.slice(2, 4), n.slice(4, 6)].map((p) => {
    const v = parseInt(p, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2]
}

/** Rapport de contraste entre deux couleurs, arrondi au centième. */
function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100
}

/** Le seuil AA pour du texte courant. Les grandes tailles ont droit à 3:1 — on ne s'en sert pas. */
const SEUIL_AA = 4.5

describe('WCAG AA — les trois encres restent lisibles sur les surfaces, dans les DEUX thèmes', () => {
  const themes: Array<':root' | '.dark'> = [':root', '.dark']

  for (const bloc of themes) {
    const nomTheme = bloc === ':root' ? 'clair' : 'sombre'

    for (const encre of ['--texte-primaire', '--texte-secondaire', '--texte-tertiaire']) {
      for (const surface of ['--fond-page', '--fond-surface']) {
        it(`${nomTheme} : ${encre} sur ${surface}`, () => {
          const couleurEncre = token(bloc, encre)
          const couleurFond = token(bloc, surface)
          expect(couleurEncre, `${encre} absent de ${bloc}`).toBeTruthy()
          expect(couleurFond, `${surface} absent de ${bloc}`).toBeTruthy()

          const mesure = contraste(couleurEncre as string, couleurFond as string)
          expect(
            mesure,
            `${nomTheme} : ${encre} (${couleurEncre}) sur ${surface} (${couleurFond}) donne ${mesure}:1, il faut ${SEUIL_AA}`,
          ).toBeGreaterThanOrEqual(SEUIL_AA)
        })
      }
    }
  }

  /*
    ⚠️ Le piège nommé, pour qu'il ne se retrouve pas dans un écran par accident.

    `--fond-surface-2` est la surface la plus CLAIRE du thème clair (#E4E6E9) : l'encre tertiaire y
    tombe à 4,30:1, alors qu'elle tient à 4,87:1 sur la même surface en sombre. C'est exactement le
    piège du chantier 70 — une paire qui passe dans un thème et pas dans l'autre.

    Ce test ne demande PAS de corriger la palette : `--fond-surface-2` sert de teinte d'alternance
    et d'en-tête de panneau, où elle apparaît mélangée (donc plus claire) et où la mesure passe.
    Il fige le fait, pour que la prochaine personne qui pose de l'encre tertiaire sur cette surface
    PLEINE sache ce qu'elle fait.
  */
  it('mémo : l’encre tertiaire sur --fond-surface-2 PLEIN ne passe pas en clair (piège connu)', () => {
    const mesure = contraste(token(':root', '--texte-tertiaire') as string, token(':root', '--fond-surface-2') as string)
    expect(mesure).toBeLessThan(SEUIL_AA)
    // Si un jour la palette est retouchée et que cette paire devient sûre, ce test tombe : le
    // supprimer sera alors une bonne nouvelle, à écrire au journal.
  })
})

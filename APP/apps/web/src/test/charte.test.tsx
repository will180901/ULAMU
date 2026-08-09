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

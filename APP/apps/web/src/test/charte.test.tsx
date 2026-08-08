/**
 * Conformité à la charte — interdictions absolues de CG-06 §07.
 *
 * Ces règles ne se vérifient pas en lisant un composant : elles dépendent de la CASCADE, donc du
 * thème actif. Le défaut qu'elles protègent a réellement failli être livré.
 *
 * **Ce qui s'est passé.** Le système de design du web est un port de CMS-SARIS, qui désactive toutes
 * les ombres en thème sombre — au motif, juste, qu'une ombre portée ne se voit presque pas sur un
 * fond déjà sombre : pour une CARTE posée sur la page, la hiérarchie passe alors par la bordure.
 * Mais un MENU n'est pas une carte : il flotte au-dessus du contenu. En sombre, il devenait donc
 * strictement plat — ce que CG-06 §07 range parmi les interdictions absolues (« jamais plat »).
 *
 * D'où le token `--ombre-flottante`, défini séparément dans les deux thèmes, et ce test qui vérifie
 * la valeur CALCULÉE plutôt que la déclaration.
 */
import { afterEach, describe, expect, it } from 'vitest'
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

afterEach(() => {
  document.documentElement.className = ''
})

describe('CG-06 §07 — interdictions absolues', () => {
  it('les surfaces flottantes ont une élévation dans les DEUX thèmes (« menu jamais plat »)', () => {
    const clair = token(':root', '--ombre-flottante')
    const sombre = token('.dark', '--ombre-flottante')

    expect(clair, '--ombre-flottante manquant en thème clair').toBeTruthy()
    expect(sombre, '--ombre-flottante manquant en thème sombre').toBeTruthy()
    // C'est précisément le piège : en sombre, --ombre-4 vaut `none`. Un menu qui s'y raccrocherait
    // serait plat.
    expect(sombre).not.toBe('none')
    expect(clair).not.toBe('none')
  })

  it('les 4 surfaces flottantes utilisent ce token, et jamais une ombre neutralisée en sombre', () => {
    // Menu contextuel, palette de commandes, infobulle, barre latérale en surimpression.
    const usages = CSS.match(/box-shadow: var\(--ombre-flottante\)/g) ?? []
    expect(usages.length).toBeGreaterThanOrEqual(4)

    // Aucune surface flottante ne doit retomber sur --ombre-4 : il vaut `none` en sombre.
    const menu = CSS.slice(CSS.indexOf('.ul-menu {'), CSS.indexOf('.ul-menu {') + 500)
    expect(menu).not.toMatch(/box-shadow: var\(--ombre-4\)/)
  })

  it('la barre latérale porte toujours le verre dépoli (« sidebar sans glassmorphism » interdit)', () => {
    const bloc = CSS.slice(CSS.indexOf('.ul-sidebar {'), CSS.indexOf('.ul-sidebar {') + 700)
    expect(bloc).toMatch(/backdrop-filter: blur\(var\(--glass-sidebar-blur\)\)/)
    expect(bloc).toMatch(/background: var\(--glass-sidebar-bg\)/)
  })

  it('la topbar reste sticky et porte le grain (deux interdictions explicites)', () => {
    const bloc = CSS.slice(CSS.indexOf('.ul-topbar {'), CSS.indexOf('.ul-topbar {') + 700)
    expect(bloc).toMatch(/position: sticky/)
    // Le grain est appliqué par la classe `saris-grain-fine` sur l'élément lui-même (TopHeader.tsx).
    const topbar = readFileSync(resolve(__dirname, '../components/layout/TopHeader.tsx'), 'utf8')
    expect(topbar).toMatch(/ul-topbar saris-grain-fine/)
  })

  it('les libellés de groupe de navigation sont en monospace majuscule (bonne pratique obligatoire)', () => {
    const bloc = CSS.slice(CSS.indexOf('.ul-nav-group-label {'), CSS.indexOf('.ul-nav-group-label {') + 500)
    expect(bloc).toMatch(/font-family: var\(--font-mono\)/)
    expect(bloc).toMatch(/text-transform: uppercase/)
  })

  it('l’item de navigation actif a un FOND et une COULEUR, pas seulement l’un des deux', () => {
    const bloc = CSS.slice(CSS.indexOf('.ul-nav-item.is-active {'), CSS.indexOf('.ul-nav-item.is-active {') + 300)
    expect(bloc).toMatch(/background: rgba\(var\(--ap-400-rgb\), 0\.12\)/)
    expect(bloc).toMatch(/color: var\(--ap-400\)/)
  })
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

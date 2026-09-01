/**
 * Les tableaux deviennent des cartes sous 1024 px — chantier 21, 01/09/2026.
 *
 * ── Ce qui a été mesuré ────────────────────────────────────────────────────────────────────────
 *
 * Cinq écrans portent un tableau large, tenu par un `min-width` dans un conteneur à défilement
 * horizontal. À 375 px : C4 « Consultations » cachait **549 px** hors écran, E1 « File de
 * vérification » 529, E3 429, E4 389. Et à 768 px — une tablette — C4 en cachait encore 214.
 *
 * Rien ne « débordait » au sens du chantier 18 : le contenu était simplement invisible tant qu'on
 * ne le tirait pas latéralement. C'est pourquoi l'auditeur précédent ne l'avait pas vu — il
 * ignorait délibérément ce qui vit dans un conteneur à défilement.
 *
 * ── Pourquoi ce test lit la SOURCE ─────────────────────────────────────────────────────────────
 *
 * La correction est en CSS : sous 1024 px, chaque ligne devient une carte et chaque cellule affiche
 * le nom de sa colonne, lu dans `data-libelle`. jsdom n'applique aucune feuille de style — un test
 * de rendu ne verrait donc jamais la différence, et c'est précisément ce qui a permis aux 422 tests
 * existants de passer sans une modification.
 *
 * Ce qui peut se casser n'est pas le rendu, c'est **l'attribut** : une colonne ajoutée demain sans
 * son `data-libelle` donnerait, en mode carte, une valeur sans intitulé — une donnée orpheline dont
 * personne ne saurait dire ce qu'elle est. C'est cet invariant mécanique qu'on verrouille, en
 * lisant les fichiers, comme `charte.test.tsx` lit la feuille de style.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Les cinq écrans à tableau, et le nombre de colonnes de chacun. */
const ECRANS = [
  { rel: 'modules/consultation/pages/ConsultationsPage.tsx', nom: 'C4 · Consultations', colonnes: 7 },
  { rel: 'modules/admin/pages/FileVerificationPage.tsx', nom: 'E1 · File de vérification', colonnes: 7 },
  { rel: 'modules/admin/pages/ParametresMetierPage.tsx', nom: 'E3 · Paramètres métier', colonnes: 5 },
  { rel: 'modules/admin/pages/AdministrateursPage.tsx', nom: 'E4 · Administrateurs', colonnes: 4 },
  { rel: 'modules/admin/pages/ComptesPage.tsx', nom: 'E7 · Comptes', colonnes: 4 },
]

const source = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8')

describe('Les cinq tableaux basculent en cartes sur petit écran', () => {
  it.each(ECRANS)('$nom porte la classe qui déclenche les cartes', ({ rel }) => {
    expect(source(rel)).toContain('ul-tableau-cartes')
  })

  it.each(ECRANS)('$nom : chaque cellule dit de quelle colonne elle vient', ({ rel, colonnes }) => {
    const s = source(rel)
    const cellules = s.match(/<td\b[^>]*/g) ?? []

    expect(cellules.length, 'aucune cellule trouvée — le gabarit a changé').toBe(colonnes)
    for (const c of cellules) {
      // Sans cet attribut, la valeur apparaîtrait seule dans la carte : un montant, une date ou un
      // statut dont plus rien ne dit ce qu'il est.
      expect(c, `une cellule sans data-libelle dans ${rel}`).toMatch(/data-libelle=/)
    }
  })

  /*
    `display: block` sur `tr` et `td` fait PERDRE au navigateur la sémantique de tableau : un lecteur
    d'écran n'annoncerait plus « colonne Statut, ligne 3 ». Les `role` explicites la restituent. Ils
    sont redondants sur grand écran — et indispensables en dessous.
  */
  it.each(ECRANS)('$nom garde sa sémantique de tableau une fois en cartes', ({ rel }) => {
    const s = source(rel)
    expect(s, 'role="table" manquant').toContain('role="table"')
    expect(s, 'role="row" manquant').toContain('role="row"')
    expect(s, 'role="columnheader" manquant').toContain('role="columnheader"')
    expect(s, 'role="cell" manquant').toContain('role="cell"')
  })
})

describe('La règle CSS qui porte tout cela', () => {
  const css = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8')

  it('bascule à 1023 px, la largeur RÉELLEMENT mesurée', () => {
    // 767 aurait laissé les tablettes derrière : à 768 px, C4 cachait encore 214 px.
    expect(css).toMatch(/@media \(max-width: 1023px\)/)
    expect(css).toContain('.ul-tableau-cartes')
  })

  it('affiche le nom de la colonne devant chaque valeur', () => {
    expect(css).toMatch(/content:\s*attr\(data-libelle\)/)
  })

  it('retire l’en-tête de la VUE, pas de l’arbre d’accessibilité', () => {
    // `display: none` l'aurait retiré des deux. Le lecteur d'écran doit continuer de le lire.
    const bloc = css.slice(css.indexOf('@media (max-width: 1023px)'))
    const entete = bloc.slice(bloc.indexOf('.ul-tableau-cartes thead'), bloc.indexOf('.ul-tableau-cartes tbody'))
    expect(entete).not.toMatch(/display:\s*none/)
    expect(entete).toMatch(/clip-path/)
  })

  it('neutralise le `min-width` — c’est lui qui forçait le défilement', () => {
    expect(css).toMatch(/\.ul-tableau-cartes\s*\{[^}]*min-width:\s*0/)
  })
})

describe('La barre d’onglets de B3 ne cache plus rien', () => {
  it('passe à la ligne au lieu de défiler', () => {
    const s = source('modules/settings/pages/SettingsPage.tsx')
    const nav = s.slice(s.indexOf('aria-label="Sections des paramètres"'))
    const classes = nav.slice(nav.indexOf('className='), nav.indexOf('>', nav.indexOf('className=')))

    // Elle faisait 812 px pour 341 visibles : trois onglets sur cinq hors écran, sans le moindre
    // indice qu'il fallait balayer. Un onglet qu'on ne voit pas n'existe pas.
    expect(classes).toContain('flex-wrap')
    expect(classes).not.toContain('overflow-x-auto')
  })
})

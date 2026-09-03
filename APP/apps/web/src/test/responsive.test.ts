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
  /* 5 depuis le 02/09/2026 (chantier 32) : « Second facteur » est ajoutée en contrepartie de D-053.
     Ce compte n'est pas décoratif — il a fait tomber ce test, ce qui a rappelé que la nouvelle
     cellule devait porter son `data-libelle`, sans quoi elle serait apparue sans intitulé en mode
     carte, sous 1024 px. */
  { rel: 'modules/admin/pages/AdministrateursPage.tsx', nom: 'E4 · Administrateurs', colonnes: 5 },
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
  const settings = () => source('modules/settings/pages/SettingsPage.tsx')

  it('ne défile plus horizontalement', () => {
    // Elle faisait 812 px pour 341 visibles : trois onglets sur cinq hors écran, sans le moindre
    // indice qu'il fallait balayer. Un onglet qu'on ne voit pas n'existe pas.
    const nav = settings().slice(settings().indexOf('<nav'))
    expect(nav.slice(0, 400)).not.toContain('overflow-x-auto')
  })

  /*
    Deux formes pour une seule navigation (01/09/2026, choix du porteur) : le rail VERTICAL au-dessus
    de 1024 px — la place ne manque pas, chaque section y montre son libellé complet et son aide — et
    `Segments` en dessous, la forme retenue pour tous les onglets de l'application.

    Les libellés courts ne sont pas un caprice : les complets demandent **659 px pour 365
    disponibles** à 375 px. Aucun jeu de mots plus courts ne fait tenir cinq segments sur une ligne,
    d'où le repli à la ligne — et d'où le fait que `Segments` doive savoir le faire.
  */
  it('devient `Segments` sous 1024 px, et garde le rail au-dessus', () => {
    const s = settings()
    expect(s, 'la forme en segments manque').toContain('<Segments')
    expect(s, 'le seuil doit être celui des tableaux').toContain('useEtroit(1024)')
    expect(s, 'le rail vertical a disparu').toContain('lg:flex-col')
  })

  it('chaque section porte un libellé court pour cette forme', () => {
    const s = settings()
    const sections = s.slice(s.indexOf('const SECTIONS'), s.indexOf('] as const'))
    const cles = sections.match(/cle: '/g) ?? []
    const courts = sections.match(/court: '/g) ?? []

    // Une section ajoutée sans libellé court afficherait son nom complet dans un segment, et
    // pousserait le groupe sur une rangée de plus.
    expect(courts.length, 'une section sans libellé court').toBe(cles.length)
  })

  it('`Segments` sait passer à la ligne — sinon les onglets ressortiraient de l’écran', () => {
    const parts = source('components/ulamu/parts.tsx')
    const segments = parts.slice(parts.indexOf('export function Segments'))
    expect(segments.slice(0, 1600)).toContain('flex-wrap')
  })
})

/**
 * La hauteur de la coquille — `dvh` et non `vh` (01/09/2026).
 *
 * Sur un navigateur mobile, `100vh` vaut la hauteur de l'écran **barre d'adresse escamotée**, pas
 * la hauteur réellement visible. `AppShell` étant aussi en `overflow-hidden`, la coquille ne défile
 * jamais : ce qui dépassait passait sous la barre du navigateur, **sans aucun moyen d'y accéder**.
 * En consultation, c'est le composeur de messages qui disparaissait.
 *
 * Aucune émulation ne montre ce défaut — le volet de développement n'a pas de barre d'adresse. Il
 * ne se voit que sur un vrai téléphone, ou en lisant l'unité employée. D'où ce test.
 */
describe('La hauteur suit le viewport RÉEL, pas l’écran', () => {
  it('la coquille est en `h-dvh`, jamais en `h-screen`', () => {
    const s = source('components/layout/AppShell.tsx')
    expect(s).toContain('h-dvh')
    expect(s, '`h-screen` (= 100vh) est revenu').not.toMatch(/className="[^"]*h-screen/)
  })

  it('les écrans pleine page aussi', () => {
    expect(source('components/layout/GardeFou.tsx')).toContain('min-h-dvh')
    expect(source('modules/auth/pages/TotpSetupPage.tsx')).toContain('min-h-dvh')
  })

  it('les deux règles CSS gardent un repli pour les navigateurs sans `dvh`', () => {
    const css = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8')
    for (const classe of ['.ul-auth', '.ul-totp']) {
      const regle = css.slice(css.indexOf(`${classe} {`))
      // L'ordre compte : `100vh` d'abord, `100dvh` ensuite. Un navigateur qui ignore la seconde
      // déclaration garde la première.
      expect(regle.slice(0, 90)).toMatch(/min-height: 100vh; min-height: 100dvh/)
    }
  })
})

/**
 * La largeur des panneaux latéraux (01/09/2026).
 *
 * `sheet.tsx` portait sa largeur dans des sélecteurs `data-[side=right]:w-3/4` et
 * `data-[side=right]:sm:max-w-sm`. Un sélecteur d'attribut a une **spécificité plus forte** qu'une
 * classe simple : le `w-full` et le `sm:max-w-2xl` que les écrans passaient étaient donc
 * systématiquement perdants, et `tailwind-merge` ne pouvait rien y faire — il ne fusionne que des
 * classes de même famille.
 *
 * Résultat : **tous les panneaux faisaient 75 % de l'écran sur téléphone et 384 px sur grand
 * écran**, quoi que demande l'écran. Le panneau d'examen d'un dossier de vérification travaillait
 * sur la moitié de la place prévue.
 */
describe('Un panneau latéral obéit à l’écran qui l’ouvre', () => {
  /*
    On lit le fichier SANS ses commentaires : celui qui explique ce bug cite forcément la forme
    fautive, et un test qui interdit des mots finirait par interdire les explications. On cherche
    la classe telle qu'elle serait APPLIQUÉE, pas telle qu'elle est racontée.
  */
  const sheet = () => source('components/ui/sheet.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('la largeur n’est plus enfermée dans un sélecteur d’attribut', () => {
    expect(sheet(), 'la largeur est redevenue prioritaire sur celle de l’écran').not.toMatch(
      /data-\[side=(left|right)\]:w-3\/4/,
    )
    expect(sheet()).not.toMatch(/data-\[side=(left|right)\]:sm:max-w-sm/)
  })

  it('le défaut existe toujours, mais en classes simples que l’écran peut couvrir', () => {
    // Sans défaut du tout, un panneau ouvert sans classe explicite n'aurait aucune largeur.
    expect(sheet()).toMatch(/w-3\/4 sm:max-w-sm/)
  })
})


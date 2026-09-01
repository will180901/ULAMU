/**
 * Les squelettes de chargement — chantier 22, 01/09/2026.
 *
 * ── La distinction que ce fichier protège ─────────────────────────────────────────────────────
 *
 * Deux attentes, deux signaux, et les confondre est le défaut d'origine :
 *
 *  • On attend des **données qui vont remplir un espace** → un squelette. Il dit CE QUI arrive, et
 *    il réserve la place, donc rien ne saute à l'arrivée du contenu.
 *  • On attend une **action qu'on vient de déclencher** → un rond qui tourne, dans le bouton. Il
 *    n'y a aucune forme à annoncer, et le bouton ne doit pas changer de taille.
 *
 * Vingt-deux écrans utilisaient un rond là où il fallait une forme. Le projet avait pourtant déjà
 * tranché : `.ul-shimmer` existe dans `globals.css` depuis la reconstruction.
 *
 * ── Et le piège, qui est d'accessibilité ──────────────────────────────────────────────────────
 *
 * Un squelette est **muet**. Remplacer « Lecture des habilitations… » par des rectangles gris
 * retirerait l'information à qui ne les voit pas. Chaque squelette garde donc sa phrase en
 * `sr-only`, dans une zone `role="status"` — un lecteur d'écran entend exactement ce qu'il entendait
 * avant. C'est ce que ce fichier vérifie en premier.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  SqueletteCartes,
  SqueletteFil,
  SqueletteLignes,
  SqueletteReglages,
  SqueletteTableau,
  SqueletteTuiles,
} from '@/components/ulamu/Squelette'

const source = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8')

describe('Un squelette n’est jamais muet', () => {
  const formes = [
    { nom: 'tableau', noeud: <SqueletteTableau colonnes={4} libelle="Lecture des habilitations…" /> },
    { nom: 'cartes', noeud: <SqueletteCartes libelle="Lecture de vos demandes…" /> },
    { nom: 'tuiles', noeud: <SqueletteTuiles libelle="Calcul des indicateurs…" /> },
    { nom: 'lignes', noeud: <SqueletteLignes libelle="Lecture du journal…" /> },
    { nom: 'fil', noeud: <SqueletteFil libelle="Chargement du fil…" /> },
    { nom: 'réglages', noeud: <SqueletteReglages libelle="Lecture de vos préférences…" /> },
  ]

  it.each(formes)('$nom : la phrase reste lisible par un lecteur d’écran', ({ noeud }) => {
    const { container } = render(noeud)

    const zone = container.querySelector('[role="status"]')
    expect(zone, 'aucune zone role="status"').not.toBeNull()
    expect(zone).toHaveAttribute('aria-busy', 'true')

    // La phrase existe dans le DOM, mais masquée à l'œil.
    const phrase = container.querySelector('.sr-only')
    expect(phrase?.textContent).toMatch(/…$/)
  })

  it.each(formes)('$nom : les rectangles eux-mêmes ne disent rien', ({ noeud }) => {
    const { container } = render(noeud)

    const blocs = container.querySelectorAll('.ul-shimmer')
    expect(blocs.length, 'aucun bloc dessiné').toBeGreaterThan(0)
    for (const b of blocs) {
      // Un rectangle décoratif annoncé serait du bruit : « groupe, groupe, groupe… ».
      expect(b).toHaveAttribute('aria-hidden', 'true')
    }
  })
})

describe('Chaque forme ressemble à ce qu’elle annonce', () => {
  it('un tableau à 7 colonnes ne ressemble pas à un tableau à 4', () => {
    const { container: sept } = render(<SqueletteTableau colonnes={7} lignes={3} libelle="Chargement…" />)
    const { container: quatre } = render(<SqueletteTableau colonnes={4} lignes={3} libelle="Chargement…" />)

    // Sinon le squelette ne dit rien de plus qu'un rond : il faut que la forme informe.
    expect(sept.querySelectorAll('.ul-shimmer').length).toBeGreaterThan(
      quatre.querySelectorAll('.ul-shimmer').length,
    )
  })

  it('un fil de discussion alterne les côtés', () => {
    const { container } = render(<SqueletteFil nombre={4} libelle="Chargement du fil…" />)
    const cotes = [...container.querySelectorAll('[role="status"] > div')].map((d) =>
      d.className.includes('justify-end') ? 'droite' : 'gauche',
    )

    // Des bulles toutes du même côté ne ressembleraient à aucune conversation.
    expect(new Set(cotes).size).toBe(2)
  })

  it('le squelette de tableau suit la bascule en cartes de 1024 px', () => {
    const { container } = render(<SqueletteTableau colonnes={5} libelle="Chargement…" />)
    const html = container.innerHTML

    // Sinon il annoncerait, sur téléphone, une forme que le contenu ne prendra pas (chantier 21).
    expect(html).toContain('lg:hidden')
    expect(html).toContain('lg:flex')
  })
})

describe('Le rond qui tourne reste là où il a un sens', () => {
  /** Les écrans où une attente de DONNÉES subsistait sous forme de rond. */
  const ECRANS = [
    'modules/admin/pages/AdministrateursPage.tsx',
    'modules/admin/pages/ComptesPage.tsx',
    'modules/admin/pages/FileVerificationPage.tsx',
    'modules/admin/pages/FinancePage.tsx',
    'modules/admin/pages/ParametresMetierPage.tsx',
    'modules/admin/pages/PilotagePage.tsx',
    'modules/admin/pages/SignalementsPage.tsx',
    'modules/consultation/pages/ConsultationPage.tsx',
    'modules/consultation/pages/ConsultationsPage.tsx',
    'modules/demandes/pages/DemandesPage.tsx',
    'modules/gains/pages/GainsPage.tsx',
    'modules/settings/sections/SectionAide.tsx',
    'modules/settings/sections/SectionPreferences.tsx',
    'modules/settings/sections/SectionSessions.tsx',
    'modules/verification/pages/VerificationPage.tsx',
  ]

  it.each(ECRANS)('%s : plus aucune attente de données sur un rond', (rel) => {
    const s = source(rel)

    // Le motif exact qu'on a remplacé : un rond suivi d'une phrase d'attente de LECTURE. Un rond
    // dans un bouton, lui, est suivi de « Envoi… » ou n'est suivi de rien — et doit rester.
    const attentesDeDonnees = s.match(
      /<Spinner[^/]*\/>\s*(Lecture|Chargement|Calcul|Recherche)[^<]*…/g,
    )
    expect(attentesDeDonnees, `un rond attend encore des données dans ${rel}`).toBeNull()
  })

  it('les boutons gardent le leur : rien à annoncer, et pas de saut de taille', () => {
    // Un squelette dans un bouton n'aurait aucune forme à décrire, et changerait sa taille au
    // moment précis où le doigt le vise.
    const s = source('modules/settings/sections/SectionAide.tsx')
    expect(s).toMatch(/envoyer\.isPending \? <Spinner/)
  })
})

describe('L’ondulation respecte le mouvement réduit', () => {
  it('`.ul-shimmer` s’arrête sous prefers-reduced-motion', () => {
    const css = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8')
    const bloc = css.slice(css.indexOf('.ul-shimmer {'))

    // CG-09 §05. Une animation infinie qu'on ne peut pas couper est un problème d'accessibilité,
    // pas un détail de confort.
    expect(bloc).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.ul-shimmer \{ animation: none/)
  })

  it('les squelettes s’appuient tous sur cette classe, jamais sur une animation à eux', () => {
    const s = source('components/ulamu/Squelette.tsx')
    expect(s).toContain('ul-shimmer')
    expect(s, 'une animation locale échapperait à la règle de mouvement réduit').not.toMatch(
      /animate-pulse|animation:/,
    )
  })
})

describe('L’écran d’accueil aussi', () => {
  it('le squelette du tableau de bord n’est plus muet', () => {
    const s = source('modules/dashboard/pages/DashboardPage.tsx')

    // Il précédait les autres et n'avait qu'un `aria-busy` : pas un mot pour qui ne le voit pas.
    expect(s).toContain('SqueletteTuiles')
    expect(s).toMatch(/libelle="Lecture de votre tableau de bord…"/)
  })
})

describe('Ce que le rendu produit vraiment', () => {
  it('la phrase est trouvable par son rôle, comme avant le changement', () => {
    render(<SqueletteTableau colonnes={4} libelle="Lecture des habilitations…" />)

    // C'est ce qui a permis aux 447 tests existants de passer sans une modification : les tests
    // qui cherchaient ce texte le trouvent toujours.
    expect(screen.getByText('Lecture des habilitations…')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })
})

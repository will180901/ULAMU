/**
 * Les flèches « Précédent / Suivant » et la mémoire d'écran — chantier 94, 11/09/2026.
 *
 * Demande du porteur : *« ajoute un moyen de retourner en arrière, en avant ; on doit aussi avoir
 * en mémoire l'état des pages pendant qu'on navigue, comme avec le projet CMS »*.
 *
 * ── Ce que ces tests gardent ──────────────────────────────────────────────────────────────────
 *
 * Deux choses, et la seconde est la plus facile à casser sans s'en apercevoir :
 *
 *  1. une flèche n'est active que s'il y a **vraiment** quelque part où aller ;
 *  2. l'état retrouvé est bien celui de l'écran qu'on rouvre, et **pas** celui d'un autre.
 */
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { FlechesNavigation, TraqueurNavigation } from '@/components/layout/FlechesNavigation'
import { peutAvancer, peutReculer, usePileNavigation } from '@/state/usePileNavigation'
import { useEtatPersistant } from '@/state/useEtatPersistant'

const etat = () => usePileNavigation.getState()

describe('La pile de navigation — ce qu’elle sait dire', () => {
  beforeEach(() => usePileNavigation.setState({ chemins: [], index: -1 }))

  it('au départ, on ne peut aller nulle part', () => {
    expect(peutReculer(etat())).toBe(false)
    expect(peutAvancer(etat())).toBe(false)
  })

  it('après deux pages, on peut reculer mais pas avancer', () => {
    etat().empiler('/a')
    etat().empiler('/b')

    expect(peutReculer(etat())).toBe(true)
    expect(peutAvancer(etat())).toBe(false)
  })

  it('et après un retour, on peut faire les deux', () => {
    etat().empiler('/a')
    etat().empiler('/b')
    etat().glisser('/a')

    expect(peutReculer(etat())).toBe(false)
    expect(peutAvancer(etat())).toBe(true)
  })

  /*
    Une navigation NEUVE après un retour coupe ce qu'il y avait devant — exactement comme un
    navigateur. Sans cela, « suivant » ramènerait à une page qu'on a quittée pour une autre.
  */
  it('une nouvelle page efface ce qu’il y avait devant', () => {
    etat().empiler('/a')
    etat().empiler('/b')
    etat().glisser('/a')
    etat().empiler('/c')

    expect(etat().chemins).toEqual(['/a', '/c'])
    expect(peutAvancer(etat())).toBe(false)
  })

  /* Une redirection remplace l'entrée courante : elle n'est pas un endroit où l'on a voulu aller. */
  it('une redirection ne laisse pas de trace derrière elle', () => {
    etat().empiler('/a')
    etat().remplacer('/b')

    expect(etat().chemins).toEqual(['/b'])
    expect(peutReculer(etat())).toBe(false)
  })

  /* La même page deux fois de suite ne s'empile pas : « retour » doit mener ailleurs. */
  it('la même page deux fois ne s’empile pas', () => {
    etat().empiler('/a')
    etat().empiler('/a')

    expect(etat().chemins).toEqual(['/a'])
  })

  /*
    ⚠️ Un saut que la pile n'attendait pas — le bouton du navigateur enfoncé trois fois, un lien
    collé — ne doit pas la figer. *Une pile qui ne décrit plus rien vaut moins qu'une pile qui se
    reconstruit.*
  */
  it('un saut inattendu la fait repartir au lieu de la bloquer', () => {
    etat().empiler('/a')
    etat().empiler('/b')
    etat().glisser('/inconnu')

    expect(etat().chemins[etat().index]).toBe('/inconnu')
    expect(peutReculer(etat())).toBe(true)
  })
})

function EcranQuiNavigue() {
  const navigate = useNavigate()
  return (
    <>
      <FlechesNavigation />
      <TraqueurNavigation />
      <button type="button" onClick={() => navigate('/b')}>
        aller en B
      </button>
    </>
  )
}

describe('Les flèches, à l’écran', () => {
  beforeEach(() => usePileNavigation.setState({ chemins: [], index: -1 }))

  it('sont éteintes tant qu’il n’y a nulle part où aller', async () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={<EcranQuiNavigue />} />
          <Route path="/b" element={<EcranQuiNavigue />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Page précédente')).toBeDisabled()
    expect(screen.getByLabelText('Page suivante')).toBeDisabled()
  })

  /*
    Elles restent MONTÉES même éteintes : les faire disparaître ferait bouger le fil d'Ariane à
    chaque page. *Une commande qui apparaît et disparaît se cherche ; une commande éteinte
    s'attend.*
  */
  it('elles restent affichées, jamais retirées', async () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={<EcranQuiNavigue />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Page précédente')).toBeInTheDocument()
    expect(screen.getByLabelText('Page suivante')).toBeInTheDocument()
  })

  it('« précédent » s’allume dès qu’on a changé d’écran, et ramène en arrière', async () => {
    const utilisateur = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={<EcranQuiNavigue />} />
          <Route path="/b" element={<EcranQuiNavigue />} />
        </Routes>
      </MemoryRouter>,
    )

    await utilisateur.click(await screen.findByRole('button', { name: 'aller en B' }))
    await waitFor(() => expect(screen.getByLabelText('Page précédente')).toBeEnabled())

    await utilisateur.click(screen.getByLabelText('Page précédente'))

    // Revenu en A : « suivant » devient à son tour possible.
    await waitFor(() => expect(screen.getByLabelText('Page suivante')).toBeEnabled())
    expect(screen.getByLabelText('Page précédente')).toBeDisabled()
  })
})

function EcranAvecMemoire({ ecran }: { ecran: string }) {
  const [valeur, setValeur] = useEtatPersistant(ecran, 'recherche', '')
  const [brouillon, setBrouillon] = useState('')
  return (
    <>
      <label htmlFor={`r-${ecran}`}>Recherche {ecran}</label>
      <input id={`r-${ecran}`} value={valeur} onChange={(e) => setValeur(e.target.value)} />
      <label htmlFor={`b-${ecran}`}>Brouillon {ecran}</label>
      <input id={`b-${ecran}`} value={brouillon} onChange={(e) => setBrouillon(e.target.value)} />
    </>
  )
}

describe('La mémoire d’écran', () => {
  beforeEach(() => sessionStorage.clear())

  it('retrouve sa valeur quand on rouvre le même écran', async () => {
    const utilisateur = userEvent.setup()
    const { unmount } = render(<EcranAvecMemoire ecran="registre" />)
    await utilisateur.type(screen.getByLabelText('Recherche registre'), 'palpitations')
    unmount()

    render(<EcranAvecMemoire ecran="registre" />)

    expect(screen.getByLabelText('Recherche registre')).toHaveValue('palpitations')
  })

  /*
    ⚠️ **Rangée par ÉCRAN.** Sans cette séparation, la recherche du registre des consultations
    remplirait le champ de recherche des demandes — et on croirait à un filtre qu'on n'a pas posé.
  */
  it('mais ne déborde pas d’un écran sur l’autre', async () => {
    const utilisateur = userEvent.setup()
    const { unmount } = render(<EcranAvecMemoire ecran="registre" />)
    await utilisateur.type(screen.getByLabelText('Recherche registre'), 'palpitations')
    unmount()

    render(<EcranAvecMemoire ecran="demandes" />)

    expect(screen.getByLabelText('Recherche demandes')).toHaveValue('')
  })

  /*
    ⚠️ **Et ce qui n'est PAS persisté repart bien à zéro.** C'est la règle reprise de CMS : jamais
    de brouillon ni de fenêtre modale dans cette mémoire.

    *Rouvrir un écran et y trouver une décision en suspens qu'on ne se souvient pas d'avoir
    commencée est pire que de tout retaper — sur un écran de soin, c'est une confirmation donnée
    sans l'avoir voulue.*
  */
  it('un brouillon, lui, repart vide — la règle qui protège les décisions', async () => {
    const utilisateur = userEvent.setup()
    const { unmount } = render(<EcranAvecMemoire ecran="registre" />)
    await utilisateur.type(screen.getByLabelText('Brouillon registre'), 'diagnostic à moitié écrit')
    unmount()

    render(<EcranAvecMemoire ecran="registre" />)

    expect(screen.getByLabelText('Brouillon registre')).toHaveValue('')
  })

  /*
    ⚠️ Deux incréments dans le MÊME geste. Le hook relit la valeur la plus à jour du magasin au lieu
    de fermer sur celle de son rendu : sans cela le premier `+1` serait écrasé par le second, et on
    passerait de la page 1 à la page 2 en cliquant deux fois sur « suivant ».

    *Une fermeture périmée ne se voit jamais sur un seul appel — elle ne se voit qu'en enchaînant.*
  */
  it('deux incréments dans le même geste ne s’écrasent pas', async () => {
    function Compteur() {
      const [n, setN] = useEtatPersistant('pagination', 'page', 0)
      return (
        <button
          type="button"
          onClick={() => {
            setN((v) => v + 1)
            setN((v) => v + 1)
          }}
        >
          page {n}
        </button>
      )
    }
    const utilisateur = userEvent.setup()
    render(<Compteur />)

    await utilisateur.click(screen.getByRole('button', { name: /page 0/ }))

    expect(await screen.findByRole('button', { name: 'page 2' })).toBeInTheDocument()
  })
})

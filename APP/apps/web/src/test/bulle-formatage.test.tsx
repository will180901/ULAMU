/**
 * La bulle de mise en forme s'attache à N'IMPORTE QUELLE zone de saisie — chantier 87.
 *
 * ── Ce que ce fichier prouve, et que les tests de la consultation ne prouvent pas ─────────────
 *
 * Le porteur l'a essayée dans le compte-rendu, elle n'y était pas : au chantier 86 je l'avais
 * câblée au seul composeur de la consultation. Elle est désormais montée dans la coquille et
 * s'attache d'elle-même à toute zone de saisie multiligne.
 *
 * Ces tests montent donc des champs **qui n'ont rien à voir avec une consultation**, contrôlés par
 * React comme le sont les vingt-trois champs de l'application. Si la bulle y fonctionne, elle
 * fonctionne partout — c'est le seul moyen de tester « partout » sans écrire vingt-trois tests.
 *
 * ── ⚠️ Le piège que l'injection a révélé ──────────────────────────────────────────────────────
 *
 * La première version de ces tests écrivait :
 *
 *     await waitFor(() => expect(barre()).not.toBeInTheDocument())
 *
 * **Cela passe toujours.** `waitFor` réussit dès que l'assertion est vraie — et au premier
 * instant, la bulle n'a pas encore eu le temps d'apparaître. Deux fautes injectées (l'échappatoire
 * ignorée, les champs d'une seule ligne acceptés) n'ont réveillé personne.
 *
 * *Un test d'absence doit d'abord prouver que la chose SAIT apparaître.* On sélectionne donc dans
 * un champ normal, on attend la bulle, **puis** on va dans le champ qui doit la refuser et on
 * attend qu'elle disparaisse. Avec la faute, elle reste — et le test tombe.
 */
import { useState } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BulleFormatageGlobale } from '@/components/ulamu/BulleFormatageGlobale'

/** Des champs contrôlés quelconques — la forme exacte qu'ont tous les champs de l'application. */
function EcranQuelconque({ auClavier }: { auClavier?: (e: React.KeyboardEvent) => void }) {
  const [motif, setMotif] = useState('')
  // Une valeur d'emblee : le test n'a pas a taper dedans, ce qui brouillerait le focus.
  const [technique, setTechnique] = useState('du repos')
  return (
    <>
      <label htmlFor="motif">Motif</label>
      <textarea id="motif" value={motif} onChange={(e) => setMotif(e.target.value)} onKeyDown={auClavier} />

      <label htmlFor="technique">Clé technique</label>
      <textarea
        id="technique"
        data-sans-formatage="true"
        value={technique}
        onChange={(e) => setTechnique(e.target.value)}
      />

      <label htmlFor="tel">Téléphone</label>
      <input id="tel" type="text" defaultValue="0690000000" />

      <BulleFormatageGlobale />
    </>
  )
}

const champ = (nom = 'Motif') => screen.getByLabelText(nom) as HTMLTextAreaElement
const barre = () => screen.queryByRole('toolbar', { name: 'Mise en forme du texte' })

/**
 * Pose une sélection et prévient le document.
 *
 * `userEvent` ne sait pas surligner dans un `<textarea>` : il tape et il clique. On émet donc
 * `selectionchange`, qui est exactement l'événement qu'écoute la bulle.
 */
const selectionner = (el: HTMLTextAreaElement | HTMLInputElement, debut: number, fin: number) => {
  el.focus()
  el.setSelectionRange(debut, fin)
  document.dispatchEvent(new Event('selectionchange'))
}

describe('La bulle de mise en forme — partout (chantier 87)', () => {
  it('s’attache à un champ qui n’a rien à voir avec une consultation', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')

    selectionner(champ(), 3, 8)

    const outils = await screen.findByRole('toolbar', { name: 'Mise en forme du texte' })
    for (const nom of ['Gras', 'Italique', 'Barré', 'Souligné', 'Agrandir', 'Liste à puces', 'Liste numérotée']) {
      expect(within(outils).getByRole('button', { name: nom })).toBeInTheDocument()
    }
  })

  /*
    ⚠️ **Le cœur technique du chantier.** Ces champs sont CONTRÔLÉS par React : écrire
    `champ.value = …` ne suffirait pas, React réécrirait l'ancienne valeur au rendu suivant. La
    bulle passe par le setter natif puis émet un vrai `input` — ce que fait un clavier.

    Si ce test tombe, la bulle paraîtra fonctionner puis le texte reviendra en arrière, et c'est le
    genre de défaut qu'on ne voit qu'en le cherchant.
  */
  it('écrit vraiment dans un champ contrôlé par React — la valeur ne revient pas en arrière', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')
    selectionner(champ(), 3, 8)

    await utilisateur.click(within(await screen.findByRole('toolbar')).getByRole('button', { name: 'Gras' }))

    expect(champ().value).toBe('du *repos*')
    await waitFor(() => expect(champ().value).toBe('du *repos*'))
    expect(champ().value.slice(champ().selectionStart, champ().selectionEnd)).toBe('repos')
  })

  it('Ctrl+Entrée continue la liste dans ce champ aussi', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), '• du repos')

    await utilisateur.keyboard('{Control>}{Enter}{/Control}')

    expect(champ().value).toBe('• du repos\n• ')
  })

  it('et sur une ligne vide, il en sort', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), '• du repos')
    await utilisateur.keyboard('{Control>}{Enter}{/Control}')

    await utilisateur.keyboard('{Control>}{Enter}{/Control}')

    expect(champ().value).toBe('• du repos\n')
  })

  /*
    ── Ctrl+Entrée est pris EN CAPTURE, donc l'écran ne le voit jamais ──────────────────────────

    Sans cela, un écran dont « Entrée » valide — le composeur de la consultation, par exemple —
    partirait avant nous : Ctrl+Entrée n'a pas la touche Maj et ressemble à un envoi.

    Ce test regarde la seule chose observable de ce choix : **le gestionnaire de l'écran n'est pas
    appelé**. Sans lui, retirer la capture ne réveillait aucun test — le composeur se protège aussi
    de son côté, et les deux protections se couvraient mutuellement.
  */
  it('Ctrl+Entrée n’atteint jamais le gestionnaire de l’écran', async () => {
    const ecran = vi.fn()
    render(<EcranQuelconque auClavier={ecran} />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), '• du repos')
    ecran.mockClear()

    await utilisateur.keyboard('{Control>}{Enter}{/Control}')

    /*
      On vise la touche ENTRÉE, pas « aucun appel » : l'appui sur Control lui-même produit son
      propre `keydown`, qui atteint l'écran tout à fait normalement. Une première version assertait
      « jamais appelé » et tombait pour cette raison-là — *un test qui vise trop large échoue sur
      autre chose que ce qu'il garde, et on finit par le croire fragile.*
    */
    const touches = ecran.mock.calls.map(([e]) => (e as React.KeyboardEvent).key)
    expect(touches).not.toContain('Enter')
    expect(champ().value).toBe('• du repos\n• ')
  })

  /*
    Un champ d'une seule ligne ne reçoit pas la bulle : on y écrit un nom, un numéro, un code —
    jamais une phrase. Mettre un numéro de téléphone en gras n'a pas de sens, et une barre d'outils
    qui surgit sur un champ de recherche est du bruit.

    ⚠️ On prouve D'ABORD que la bulle sait apparaître, sinon le test passerait sans rien garder.
  */
  it('mais pas à un champ d’une seule ligne', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')

    selectionner(champ(), 3, 8)
    await screen.findByRole('toolbar', { name: 'Mise en forme du texte' })

    selectionner(screen.getByLabelText('Téléphone') as HTMLInputElement, 0, 4)

    await waitFor(() => expect(barre()).not.toBeInTheDocument())
  })

  /*
    L'échappatoire existe pour le jour où un champ portera un contenu qui ne se met pas en forme —
    une clé, un identifiant, un texte relu par un tiers qui ne connaîtrait pas cette grammaire.
    Aucun champ de l'application ne l'utilise aujourd'hui : le porteur a demandé « partout ».

    ⚠️ Même précaution : on prouve d'abord que la bulle sait apparaître.
  */
  it('un champ peut refuser la mise en forme', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')
    selectionner(champ(), 3, 8)
    await screen.findByRole('toolbar', { name: 'Mise en forme du texte' })

    selectionner(champ('Clé technique'), 3, 8)

    /*
      ⚠️ `act` puis une assertion SYNCHRONE, et non `waitFor(… not.toBeInTheDocument)`.

      Passer d'un champ à l'autre fait perdre le focus au premier, donc la bulle disparaît un
      instant **quelle que soit** la suite. Un `waitFor` négatif réussit à ce moment-là, avant même
      que la bulle ait eu une chance de revenir — et la faute « l'échappatoire est ignorée »
      passait sans réveiller personne.

      `act` laisse React appliquer l'état ; on regarde ensuite, une seule fois, le résultat établi.
    */
    await act(async () => {
      await Promise.resolve()
    })

    expect(barre()).not.toBeInTheDocument()
  })

  it('et elle disparaît quand la sélection se réduit à rien', async () => {
    render(<EcranQuelconque />)
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')
    selectionner(champ(), 3, 8)
    await screen.findByRole('toolbar')

    selectionner(champ(), 5, 5)

    await waitFor(() => expect(barre()).not.toBeInTheDocument())
  })
})

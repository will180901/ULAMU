/**
 * `GardeFou` — le filet sous les écrans (01/09/2026).
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * Pendant la relecture visuelle du chantier 18, deux écrans sur seize ont fait disparaître
 * l'application ENTIÈRE : page blanche, aucun message, aucun retour possible sans recharger. Dans
 * les deux cas la faute était minuscule — une réponse serveur revenue en 200 mais dont la forme
 * n'était pas celle attendue. C'est le comportement normal de React : une erreur de rendu que ne
 * rattrape aucune limite démonte l'arbre en entier. Il n'y avait aucune limite dans l'application.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **La panne est circonscrite.** Ce qui entoure la limite survit. C'est toute la valeur : la
 *     barre latérale reste debout, donc le moyen de partir ailleurs aussi.
 *  2. **La panne est nommée.** Le message technique est MONTRÉ, pas caché derrière « une erreur est
 *     survenue » — celui qui corrige est celui qui lit.
 *  3. **On peut repartir.** Un bouton réessaye ; et remonter la limite (`key`) la remet à zéro,
 *     sans quoi l'erreur resterait affichée sur tous les écrans suivants.
 *  4. **Rien n'est rattrapé en silence.** Un écran qui va bien ne doit rien voir de tout ceci.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { GardeFou } from '@/components/layout/GardeFou'

/** Un composant qui casse à la demande, comme cassait `SectionPreferences`. */
function Fragile({ casse }: { casse: boolean }) {
  if (casse) {
    const donnees = {} as { preferences?: Array<{ category: string }> }
    // Exactement la faute constatée : une forme inattendue, lue sans précaution.
    return <p>{donnees.preferences!.find((p) => p.category === 'care')?.category}</p>
  }
  return <p>contenu de l’écran</p>
}

beforeEach(() => {
  // React écrit l'erreur rattrapée sur la console : c'est attendu, on ne veut pas polluer la sortie.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GardeFou — ce qu’une page blanche ne faisait pas', () => {
  it('laisse debout ce qui l’entoure : la coquille survit à l’écran', () => {
    render(
      <div>
        <nav aria-label="Navigation principale">barre latérale</nav>
        <GardeFou portee="zone">
          <Fragile casse />
        </GardeFou>
      </div>,
    )

    // C'est toute la valeur de la limite : le moyen de partir ailleurs est encore là.
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('nomme la panne au lieu de la taire', () => {
    render(
      <GardeFou portee="zone">
        <Fragile casse />
      </GardeFou>,
    )

    expect(screen.getByText(/s’est interrompu|s'est interrompu/)).toBeInTheDocument()
    // Le message technique est montré : sans lui, il faudrait reproduire la panne pour la corriger.
    expect(screen.getByText(/Cannot read properties of undefined/)).toBeInTheDocument()
  })

  it('dit que rien n’est parti au serveur — c’est la première question qu’on se pose', () => {
    render(
      <GardeFou portee="zone">
        <Fragile casse />
      </GardeFou>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/n'a été envoyé au serveur|n’a été envoyé au serveur/)
  })

  it('propose de réessayer, et remonte l’écran quand la cause a disparu', async () => {
    const utilisateur = userEvent.setup()

    function Essai() {
      const [casse, setCasse] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setCasse(false)}>
            réparer la cause
          </button>
          <GardeFou portee="zone">
            <Fragile casse={casse} />
          </GardeFou>
        </>
      )
    }

    render(<Essai />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Réessayer alors que la cause tient toujours doit ramener l'alerte, pas une page blanche.
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await utilisateur.click(screen.getByRole('button', { name: 'réparer la cause' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(screen.getByText('contenu de l’écran')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('se remet à zéro quand on la remonte : changer d’écran doit effacer l’erreur', () => {
    const { rerender } = render(
      <GardeFou key="/parametres" portee="zone">
        <Fragile casse />
      </GardeFou>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // `key={pathname}` dans la coquille : sans cela, l'erreur resterait affichée sur TOUS les
    // écrans suivants et la navigation semblerait gelée.
    rerender(
      <GardeFou key="/admin/pilotage" portee="zone">
        <Fragile casse={false} />
      </GardeFou>,
    )
    expect(screen.getByText('contenu de l’écran')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ne s’interpose jamais quand l’écran va bien', () => {
    render(
      <GardeFou portee="zone">
        <Fragile casse={false} />
      </GardeFou>,
    )

    expect(screen.getByText('contenu de l’écran')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hors coquille, ne promet pas une navigation qui n’existe pas', () => {
    render(
      <GardeFou portee="page">
        <Fragile casse />
      </GardeFou>,
    )

    // Sur un écran d'entrée il n'y a pas de menu de gauche : proposer d'y aller serait mentir.
    expect(screen.getByRole('button', { name: /Recharger la page/ })).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('menu de gauche')
  })
})

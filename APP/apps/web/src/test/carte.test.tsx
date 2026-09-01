/**
 * `Carte` — le bandeau d'en-tête des cartes (01/09/2026).
 *
 * ── Le défaut ─────────────────────────────────────────────────────────────────────────────────
 *
 * À 375 px, sur E7 « Comptes », le titre « Procédures support » s'affichait dans **18 px** : il ne
 * restait qu'une lettre. La cause n'était pas le titre mais son voisin — le groupe de segments
 * « Ouvertes / Closes / Annulées », posé en `action`, mesure 239 px et refusait de se comprimer
 * (`shrink-0`). Le titre, lui, était en `flex-1 min-w-0` : il acceptait donc de tout céder.
 *
 * Une largeur de base pour le titre inverse la priorité, et `flex-wrap` donne à l'action un endroit
 * où aller quand elle ne tient plus. Sur grand écran, rien ne change : tout tient sur une ligne.
 *
 * jsdom ne calcule aucune mise en page — on ne peut pas mesurer 18 px ici. On verrouille donc les
 * deux propriétés qui ont manqué, pas leur effet.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileText } from 'lucide-react'
import { Carte } from '@/components/ulamu/parts'

function bandeau(): HTMLElement {
  return screen.getByRole('heading', { level: 2 }).parentElement!.parentElement as HTMLElement
}

describe('Carte — le bandeau ne doit pas écraser son titre', () => {
  it('le bandeau passe à la ligne quand son action ne tient plus', () => {
    render(
      <Carte icone={FileText} titre="Procédures support" action={<span>Ouvertes Closes Annulées</span>}>
        contenu
      </Carte>,
    )

    // Sans `flex-wrap`, l'action n'a nulle part où aller : elle prend la place du titre.
    expect(bandeau().className).toContain('flex-wrap')
  })

  it('le titre réclame une largeur de base avant de céder quoi que ce soit', () => {
    render(
      <Carte icone={FileText} titre="Procédures support" action={<span>Ouvertes Closes Annulées</span>}>
        contenu
      </Carte>,
    )

    const bloc = screen.getByRole('heading', { level: 2 }).parentElement as HTMLElement
    // `flex-1 min-w-0` seul veut dire « je cède tout » — c'est ce qui l'avait réduit à 18 px.
    expect(bloc.className).toContain('basis-40')
    expect(bloc.className).toContain('min-w-0')
  })

  it('le titre reste un vrai titre, et le sous-titre le suit', () => {
    render(
      <Carte icone={FileText} titre="Procédures support" sousTitre="Les interventions faites pour quelqu'un">
        contenu
      </Carte>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Procédures support' })).toBeInTheDocument()
    expect(screen.getByText("Les interventions faites pour quelqu'un")).toBeInTheDocument()
  })

  it('sans action, le bandeau reste ce qu’il était', () => {
    render(
      <Carte icone={FileText} titre="Procédures support">
        contenu
      </Carte>,
    )

    expect(bandeau().querySelectorAll(':scope > *')).toHaveLength(2)
    expect(screen.getByText('contenu')).toBeInTheDocument()
  })
})

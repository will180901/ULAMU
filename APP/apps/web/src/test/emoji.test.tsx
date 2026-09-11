/**
 * Le rendu des emoji — chantier 78, 11/09/2026.
 *
 * ── Pourquoi ces règles méritent des tests ────────────────────────────────────────────────────
 *
 * Un emoji écrit en texte est dessiné par l'APPAREIL : le même 🙏 n'a pas la même forme sur un
 * Android d'entrée de gamme, un iPhone et un poste Windows — et certains manquent. Dans une
 * consultation, un patient qui envoie 😟 et un soignant qui voit un carré vide, c'est un
 * malentendu sur un écran où l'on décide de soins.
 *
 * Ce que ces tests figent, ce n'est donc pas une décoration : c'est **la garantie que les deux
 * bouts d'une conversation voient la même chose**.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Emoji, graphemes, seulementDesEmoji, texteAvecEmoji } from '@/modules/consultation/Emoji'
import { EMOJI_CATEGORIES, EMOJI_POSITION, SPRITE_COLONNES } from '@/modules/consultation/emoji-donnees'

describe('La table des emoji', () => {
  /*
    Elle est GÉNÉRÉE (`outils/construire-emoji.mjs`) et commitée, pour n'ajouter aucune dépendance.
    Si quelqu'un la régénère en cassant sa forme, tout le rendu tombe — ces deux tests le disent
    tout de suite, au lieu de laisser des carrés vides arriver en production.
  */
  it('porte les emoji courants d’un échange de soin', () => {
    for (const e of ['👍', '🙏', '❤️', '😀', '😟']) {
      expect(EMOJI_POSITION[e], `${e} devrait être dans la table`).toBeDefined()
    }
  })

  it('range tout en huit catégories, sans catégorie vide', () => {
    expect(EMOJI_CATEGORIES).toHaveLength(8)
    for (const c of EMOJI_CATEGORIES) expect(c.emojis.length).toBeGreaterThan(0)
  })
})

describe('Un emoji se rend en image, pas en texte', () => {
  it('devient une image accessible, portant le caractère', () => {
    render(<Emoji natif="👍" />)

    const img = screen.getByRole('img', { name: '👍' })
    // C'est bien la feuille du site qui le dessine, et pas la police du système.
    expect(img.style.backgroundImage).toContain('emoji/apple-64.png')
    expect(img.style.backgroundSize).toContain(`${SPRITE_COLONNES * 100}%`)
  })

  /*
    ⚠️ Un emoji absent de la table — un drapeau récent, un caractère exotique — se rend en TEXTE.
    Mieux vaut le dessin du système qu'un carré vide ou un trou dans la phrase : on dégrade, on ne
    perd pas.
  */
  it('un emoji inconnu retombe sur le texte plutôt que de disparaître', () => {
    render(<Emoji natif="🫟" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('🫟')).toBeInTheDocument()
  })
})

describe('Un message tout en emoji se rend en grand', () => {
  it('reconnaît un message qui n’est que des emoji', () => {
    expect(seulementDesEmoji('👍')).toBe(true)
    expect(seulementDesEmoji('👍🙏')).toBe(true)
    expect(seulementDesEmoji('  ❤️  ')).toBe(true)
  })

  it('un seul mot suffit à en faire un message ordinaire', () => {
    expect(seulementDesEmoji('👍 merci')).toBe(false)
    expect(seulementDesEmoji('2 👍')).toBe(false)
  })

  /*
    Au-delà de huit, ce n'est plus une réaction mais un texte — et le grand format le rendrait
    illisible sur un téléphone.
  */
  it('au-delà de huit, ce n’est plus une réaction', () => {
    expect(seulementDesEmoji('👍👍👍👍👍👍👍👍')).toBe(true)
    expect(seulementDesEmoji('👍👍👍👍👍👍👍👍👍')).toBe(false)
  })

  it('un message vide n’est pas un message d’emoji', () => {
    expect(seulementDesEmoji('')).toBe(false)
    expect(seulementDesEmoji('   ')).toBe(false)
  })
})

describe('Le découpage en graphèmes', () => {
  /*
    ⚠️ Un emoji composé — une famille, un drapeau, une teinte de peau — est fait de plusieurs
    points de code. Le découper en `[...texte]` le casserait en morceaux illisibles au milieu
    d'une phrase.
  */
  it('garde un emoji composé entier', () => {
    expect(graphemes('👨‍👩‍👧')).toHaveLength(1)
    expect(graphemes('a👍b')).toEqual(['a', '👍', 'b'])
  })
})

describe('Le texte d’un message n’est jamais transformé', () => {
  /*
    ⚠️ LE point de ce chantier qui n'est pas cosmétique.

    Le corps d'un message de consultation porte des données de santé. On remplace les emoji par
    leurs images — et RIEN d'autre : aucune balise interprétée, aucun lien fabriqué. Un patient qui
    écrit `<b>` doit lire `<b>`, et un soignant aussi.
  */
  it('rend le texte tel quel, et seulement les emoji en images', () => {
    const { container } = render(<p>{texteAvecEmoji('Tension <b>13/8</b> 👍')}</p>)

    expect(container.querySelectorAll('b')).toHaveLength(0)
    expect(container.textContent).toContain('Tension <b>13/8</b>')
    expect(screen.getByRole('img', { name: '👍' })).toBeInTheDocument()
  })

  it('un texte sans emoji ne produit aucune image', () => {
    const { container } = render(<p>{texteAvecEmoji('Bonjour Docteur')}</p>)

    expect(container.querySelectorAll('[role="img"]')).toHaveLength(0)
    expect(container.textContent).toBe('Bonjour Docteur')
  })
})

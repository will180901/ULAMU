/**
 * Le rogneur de vidéo — chantier 100, 12/09/2026.
 *
 * ── Ce que ce fichier garde ───────────────────────────────────────────────────────────────────
 *
 * Le stockage plafonne à 8 Mo et une vidéo de téléphone pèse de 1 à 4 Mo par seconde : sans
 * découpe, ouvrir la vidéo aux consultations reviendrait à l'ouvrir puis à la refuser presque
 * toujours. Le rogneur est donc la pièce **dont dépend la fonctionnalité entière**.
 *
 * Les calculs se vérifient ici, séparément de l'écran qui les utilise : *ce sont eux qui décident
 * si l'extrait passera, et une erreur d'un facteur dix ne se voit pas à l'œil.*
 */
import { describe, expect, it } from 'vitest'

import { LIMITE_OCTETS, VIDEO_MAX_S } from '@/modules/consultation/media'
import { debitPourTenir, poidsEstime, portionMaximale } from '@/modules/consultation/rogneur'

const MO = 1024 * 1024

describe('La plus longue portion qu’on peut garder', () => {
  /*
    Une vidéo légère et longue : c'est la durée voulue qui borne, pas le poids. Trente secondes,
    parce qu'au-delà la fenêtre de sélection couvre tout le film et ne se déplace plus — on croit
    alors le rogneur bloqué. (Leçon reprise de CMS, qui est passé de 120 s à 30 s pour cela.)
  */
  it('sur une vidéo légère, c’est la durée de 30 s qui borne', () => {
    // 2 Mo pour 5 minutes : le poids n'est jamais un problème.
    expect(portionMaximale(2 * MO, 300)).toBe(VIDEO_MAX_S)
  })

  /*
    ⚠️ **Et sur une vidéo lourde, c'est le POIDS qui borne.** C'est la moitié qu'on oublie : une
    vidéo 4K de dix secondes pèse 40 Mo, donc sa portion tient en deux secondes, pas en trente.
    Sans cette borne, on proposerait de garder trente secondes d'un film dont trois ne passent pas.
  */
  it('⚠️ mais sur une vidéo lourde, c’est le poids qui borne', () => {
    // 40 Mo pour 10 s = 4 Mo/s. À 90 % de 8 Mo, il reste 1,8 s.
    const portion = portionMaximale(40 * MO, 10)

    expect(portion).toBeLessThan(2)
    expect(portion).toBeGreaterThan(1.5)
    // Et l'extrait estimé tient sous la limite : c'est tout ce qu'on lui demande.
    expect(poidsEstime(40 * MO, 10, portion)).toBeLessThanOrEqual(LIMITE_OCTETS)
  })

  it('et jamais plus long que la vidéo elle-même', () => {
    expect(portionMaximale(1 * MO, 4)).toBe(4)
  })

  /* Durée inconnue (métadonnées illisibles) : on ne bloque pas, on retombe sur la durée voulue. */
  it('et sur une durée inconnue, il reste quelque chose à proposer', () => {
    expect(portionMaximale(5 * MO, 0)).toBe(VIDEO_MAX_S)
  })

  /* Un plancher d'une seconde : une fenêtre de zéro seconde ne se saisit pas. */
  it('avec un plancher d’une seconde, même sur un film énorme', () => {
    expect(portionMaximale(500 * MO, 10)).toBe(1)
  })
})

describe('Le poids estimé d’un extrait', () => {
  it('est proportionnel à la durée gardée', () => {
    expect(poidsEstime(10 * MO, 20, 5)).toBe(2.5 * MO)
  })

  /* Durée inconnue : on annonce le fichier entier — la pire hypothèse, jamais la meilleure. */
  it('et annonce le fichier entier quand la durée est inconnue', () => {
    expect(poidsEstime(7 * MO, 0, 5)).toBe(7 * MO)
  })
})

describe('Le débit demandé à l’enregistreur', () => {
  /*
    ⚠️ **Sans consigne, `MediaRecorder` produit souvent PLUS GROS que l'original.** Le débit est donc
    borné par ce que la limite autorise pour la durée retenue.

    *Un rogneur qui rend un extrait plus lourd que le film n'a rien rogné du tout.*
  */
  it('⚠️ tient sous la limite pour la durée retenue', () => {
    const portion = 30
    const debit = debitPourTenir(200 * MO, 600, portion)

    // Le poids que ce débit produira, en octets, sur la portion demandée.
    expect((debit * portion) / 8).toBeLessThanOrEqual(LIMITE_OCTETS)
  })

  /*
    Et il ne dépasse jamais le débit de la SOURCE : ré-encoder plus riche que l'original ajoute des
    octets sans ajouter une image.
  */
  it('sans jamais dépasser la qualité de la source', () => {
    // Une source très pauvre : 1 Mo pour 60 s ≈ 140 kbit/s.
    const debit = debitPourTenir(1 * MO, 60, 5)

    expect(debit).toBeLessThanOrEqual(1_000_000)
  })

  /*
    ⚠️ Mais avec un plancher : en dessous, l'extrait devient une bouillie. *Une vidéo de soin qu'on
    ne peut pas regarder ne vaut pas mieux qu'une vidéo absente.*
  */
  it('⚠️ et jamais sous le plancher qui la rend regardable', () => {
    expect(debitPourTenir(100_000, 600, 30)).toBe(300_000)
  })
})

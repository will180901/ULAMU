/**
 * Le rogneur À L'ÉCRAN — chantier 101, 12/09/2026.
 *
 * ── Pourquoi ce fichier est à part ────────────────────────────────────────────────────────────
 *
 * **jsdom ne lit la durée d'aucun média.** `HTMLMediaElement.duration` y vaut toujours zéro : la
 * branche vidéo de l'aperçu — celle qui installe la fenêtre de découpe, calcule le poids estimé et
 * dessine la pellicule — n'était donc **jamais parcourue** par les tests de `consultation.test.tsx`.
 *
 * Je l'ai découvert en injectant une faute qui n'a réveillé personne. *Un test qui ne peut pas
 * atteindre le mécanisme ne le garde pas — et l'absence d'échec ressemble exactement à une réussite.*
 *
 * On double donc la seule chose que jsdom ne sait pas faire : dire la durée d'un fichier. Tout le
 * reste — le calcul de la portion, le poids estimé, le blocage — reste le vrai code.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApercuMedias } from '@/modules/consultation/ApercuMedias'

/** Une vidéo de 60 s pesant 40 Mo : quatre fois la limite, comme un film de téléphone. */
const DUREE = 60
const POIDS = 40 * 1024 * 1024

vi.mock('@/modules/consultation/rogneur', async (original) => {
  const vrai = await original<typeof import('@/modules/consultation/rogneur')>()
  return {
    ...vrai,
    /*
      La seule chose que jsdom ne sait pas faire. La durée suit le NOM du fichier : « court » dure
      10 s, le reste 60 s — de quoi distinguer un film qui tient entier d'un film qu'il faut couper.
    */
    dureeMedia: async (f: File) => (f.name.startsWith('court') ? 10 : DUREE),
    // La pellicule demande un décodage vidéo : on rend une liste vide, ce que le composant tolère.
    vignettes: async () => [],
  }
})

function video(nom = 'film.mp4', octets = POIDS): File {
  const f = new File([new Uint8Array(16)], nom, { type: 'video/mp4' })
  Object.defineProperty(f, 'size', { value: octets })
  return f
}

function monter(fichiers: File[]) {
  return render(
    <ApercuMedias fichiers={fichiers} enCours={false} onFermer={() => {}} onEnvoyer={() => {}} />,
  )
}

describe('Le rogneur, dans l’aperçu', () => {
  /*
    ⚠️ **Une vidéo trop lourde doit proposer un PASSAGE, pas un refus.** C'est toute la raison d'être
    du rogneur : *un refus qui précède le remède n'est pas une protection, c'est une porte fermée.*
  */
  it('⚠️ propose de choisir un passage au lieu de refuser le film', async () => {
    monter([video()])

    expect(await screen.findByText('Choisissez le passage à envoyer')).toBeInTheDocument()
    expect(screen.queryByText(/maximum 8,0 Mo/)).not.toBeInTheDocument()
  })

  /*
    ⚠️ **Et la fenêtre proposée TIENT sous la limite.** C'est la borne qu'on oublie : 40 Mo pour 60 s
    font 0,67 Mo/s, donc la portion utile est d'environ 11 s — pas les 30 s qu'on s'autorise.

    *Proposer trente secondes d'un film dont onze passent, c'est faire travailler quelqu'un pour un
    refus.*
  */
  it('⚠️ et la fenêtre proposée tient sous la limite, pas 30 s au hasard', async () => {
    monter([video()])

    // « 0:00 → 0:11 · ≈ 7,2 Mo » : les deux bornes et le poids estimé, dans le même souffle.
    const resume = await screen.findByText(/0:00 → 0:1\d · ≈ \d/)

    expect(resume).toBeInTheDocument()
    expect(resume.textContent).not.toMatch(/0:30/)
  })

  /*
    Un film qui tient déjà entier ne propose rien à découper : on ne fait pas travailler pour rien.

    ⚠️ « Tenir entier » veut dire DEUX choses, et mon premier test n'en voyait qu'une : assez léger
    **et** assez court. Une vidéo de 2 Mo mais de soixante secondes doit quand même être coupée —
    trente secondes est un plafond de durée, pas seulement de poids.
  */
  it('mais un film qui tient déjà entier ne demande aucune découpe', async () => {
    // 10 s et 2 Mo : sous les deux plafonds.
    monter([video('court.mp4', 2 * 1024 * 1024)])

    await screen.findByRole('group', { name: 'Aperçu avant envoi' })
    await waitFor(() => expect(screen.queryByText('Choisissez le passage à envoyer')).not.toBeInTheDocument())
  })

  /*
    ⚠️ **La fenêtre se déplace au CLAVIER.** Elle se saisit à la souris sur la pellicule ; sans les
    flèches, elle n'existerait pas pour qui ne peut pas viser. *Une commande qui n'existe qu'à la
    souris n'existe pas pour tout le monde.*
  */
  it('⚠️ et la fenêtre se déplace aussi au clavier', async () => {
    const utilisateur = userEvent.setup()
    monter([video()])

    const pellicule = await screen.findByRole('slider', { name: 'Début du passage à envoyer' })
    expect(pellicule).toHaveAttribute('aria-valuenow', '0')

    pellicule.focus()
    await utilisateur.keyboard('{Shift>}{ArrowRight}{/Shift}')

    await waitFor(() => expect(pellicule).toHaveAttribute('aria-valuenow', '5'))
    // Et la fin suit le début : la fenêtre se DÉPLACE, elle ne s'étire pas.
    expect(pellicule.getAttribute('aria-valuetext')).toMatch(/de 0:05 à 0:1\d/)
  })

  /* Et elle ne sort jamais du film : au bout, elle s'arrête au lieu de proposer du vide. */
  it('sans jamais sortir du film', async () => {
    const utilisateur = userEvent.setup()
    monter([video()])

    const pellicule = await screen.findByRole('slider', { name: 'Début du passage à envoyer' })
    pellicule.focus()
    for (let i = 0; i < 20; i += 1) await utilisateur.keyboard('{Shift>}{ArrowRight}{/Shift}')

    const debut = Number(pellicule.getAttribute('aria-valuenow'))
    const max = Number(pellicule.getAttribute('aria-valuemax'))

    expect(debut).toBeLessThanOrEqual(max)
    expect(max).toBeLessThan(DUREE)
  })
})

/**
 * Le rendu des pièces jointes — chantier 104, 12/09/2026.
 *
 * ── Le défaut que ces tests gardent ───────────────────────────────────────────────────────────
 *
 * Depuis le chantier 99 on pouvait envoyer une vidéo et un PDF — et **pas les relire** : le fil ne
 * connaissait que le son et l'image, et une vidéo reçue tombait dans une balise `<img>`,
 * c'est-à-dire nulle part. Le porteur l'a dit en une phrase : *« je ne peux ni rogner la vidéo, ni
 * la lire après l'envoi »*.
 *
 * ── Ce qui se vérifie ici, et qui est le cœur ─────────────────────────────────────────────────
 *
 * Que chaque genre soit rendu POUR CE QU'IL EST, et surtout que **rien de lourd ne se télécharge
 * sans qu'on l'ait demandé** : *charger dix vidéos pour en regarder une est un coût qu'on fait payer
 * à quelqu'un qui n'a rien demandé à voir.*
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LecteurPiece, PieceJointe } from '@/modules/consultation/PieceJointe'
import { lireMediaSession } from '@/lib/api'

vi.mock('@/lib/api', async (original) => {
  const vrai = await original<typeof import('@/lib/api')>()
  return { ...vrai, lireMediaSession: vi.fn() }
})

const lire = vi.mocked(lireMediaSession)

beforeEach(() => {
  lire.mockReset()
  lire.mockResolvedValue({ url: 'blob:piece', type: 'image/png' })
})

describe('Une pièce jointe dans une bulle', () => {
  /*
    ⚠️ **Le cœur du chantier.** Une vidéo ne se télécharge pas toute seule : la bulle montre une
    carte « ▶ », et le fichier n'est demandé qu'au clic.
  */
  it('⚠️ une vidéo ne se télécharge pas tant qu’on ne l’a pas demandée', async () => {
    render(<PieceJointe cle="sm_abc.mp4" onOuvrir={() => {}} />)

    expect(await screen.findByRole('button', { name: 'Lire la vidéo' })).toBeInTheDocument()
    expect(lire).not.toHaveBeenCalled()
  })

  it('et un document non plus — c’est une fiche, pas un aperçu', async () => {
    render(<PieceJointe cle="sm_abc.pdf" onOuvrir={() => {}} />)

    expect(await screen.findByRole('button', { name: 'Ouvrir le document' })).toBeInTheDocument()
    expect(lire).not.toHaveBeenCalled()
  })

  /*
    L'image et la note vocale, elles, se chargent tout de suite : ce sont les deux qu'on regarde sans
    les demander, et les deux qui restent légers.
  */
  it('mais une photo se charge tout de suite, puisqu’on la regarde sans la demander', async () => {
    render(<PieceJointe cle="sm_abc.png" onOuvrir={() => {}} />)

    await waitFor(() => expect(lire).toHaveBeenCalledWith('sm_abc.png'))
    expect(await screen.findByRole('button', { name: 'Voir la photo en grand' })).toBeInTheDocument()
  })

  it('et une note vocale ouvre son lecteur', async () => {
    lire.mockResolvedValue({ url: 'blob:son', type: 'audio/mp4' })
    render(<PieceJointe cle="sm_abc.m4a" onOuvrir={() => {}} />)

    expect(await screen.findByLabelText('Écouter la note vocale')).toBeInTheDocument()
  })

  /*
    ⚠️ **Une clé sans extension ne doit pas faire perdre le genre.** Une clé d'avant la convention,
    ou écrite à la main, ferait passer une note vocale pour un document — et le lecteur
    disparaîtrait sans que rien ne le signale. Le message, lui, porte son type depuis toujours.

    *Deux sources imparfaites qui se complètent valent mieux qu'une seule qui se tait.*
  */
  it('⚠️ et sans extension dans la clé, c’est le type du message qui tranche', async () => {
    lire.mockResolvedValue({ url: 'blob:son', type: 'audio/mp4' })
    render(<PieceJointe cle="k-audio" genreDeSecours="audio" onOuvrir={() => {}} />)

    expect(await screen.findByLabelText('Écouter la note vocale')).toBeInTheDocument()
  })

  /*
    ⚠️ Là où aucun lecteur ne peut s'ouvrir — le Carnet, qui vit dans le rail — la pièce se montre
    sans être cliquable. *Une commande qui ne peut pas tenir sa promesse ne doit pas être offerte ;
    un bouton mort se remarque plus qu'un bouton absent.*
  */
  it('⚠️ sans lecteur possible, la photo n’est pas un bouton', async () => {
    render(<PieceJointe cle="sm_abc.png" />)

    expect(await screen.findByAltText('Photo transmise en consultation')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Voir la photo en grand' })).not.toBeInTheDocument()
  })

  it('et une pièce illisible le dit, au lieu de laisser un trou', async () => {
    lire.mockRejectedValue(new Error('réseau'))
    render(<PieceJointe cle="sm_abc.png" onOuvrir={() => {}} />)

    expect(await screen.findByText('Pièce indisponible.')).toBeInTheDocument()
  })
})

describe('Le lecteur plein panneau', () => {
  it('ouvre une vidéo dans un vrai lecteur', async () => {
    lire.mockResolvedValue({ url: 'blob:film', type: 'video/mp4' })
    const { container } = render(<LecteurPiece cle="sm_abc.mp4" onFermer={() => {}} />)

    await waitFor(() => expect(container.querySelector('video')).not.toBeNull())
    expect(container.querySelector('video')).toHaveAttribute('controls')
  })

  /*
    ⚠️ **Un PDF s'ouvre dans un cadre ISOLÉ.** Un PDF peut embarquer du script ; celui-ci ne doit
    rien pouvoir lire de la consultation autour. Même précaution que pour les pièces de
    vérification — et elle ne se voit pas à l'œil, d'où ce test.
  */
  it('⚠️ et un document dans un cadre isolé, jamais dans la page', async () => {
    lire.mockResolvedValue({ url: 'blob:doc', type: 'application/pdf' })
    const { container } = render(<LecteurPiece cle="sm_abc.pdf" onFermer={() => {}} />)

    const cadre = await waitFor(() => {
      const el = container.querySelector('iframe')
      expect(el).not.toBeNull()
      return el as HTMLIFrameElement
    })
    expect(cadre).toHaveAttribute('sandbox', '')
  })

  it('et se referme', async () => {
    const utilisateur = userEvent.setup()
    const fermer = vi.fn()
    render(<LecteurPiece cle="sm_abc.png" onFermer={fermer} />)

    await utilisateur.click(await screen.findByRole('button', { name: 'Fermer' }))

    expect(fermer).toHaveBeenCalled()
  })
})

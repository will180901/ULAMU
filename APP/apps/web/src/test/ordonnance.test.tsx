/**
 * C7 « Ordonnance » — la prescription depuis une séance active.
 *
 * Ce qui est verrouillé ici tient en une phrase : **le garde-fou allergies doit rester un garde-fou,
 * ni un verrou, ni un décor.**
 *
 *  1. Le 409 du serveur n'est PAS une panne. C'est une étape de la rédaction : l'écran doit nommer
 *     le médicament ET l'allergie, et proposer les deux issues prévues par EF-09-03 — retirer, ou
 *     prescrire avec un motif. Le transformer en « une erreur est survenue » reviendrait à faire
 *     abandonner le médecin devant un mur.
 *  2. Un conflit non tranché bloque le scellement. Sinon le garde-fou ne garde rien.
 *  3. Le motif part réellement au serveur, où il est tracé (EF-09-03).
 *  4. Une ligne hors référentiel est marquée « non vérifié » (EF-09-02) — c'est la limite du
 *     dispositif, et elle doit être lisible là où le médecin décide.
 *  5. L'avertissement d'immuabilité (RM-09-05) est affiché AVANT le bouton, pas après.
 *  6. Aucune durée de validité n'est écrite : `expiresAt` vient du serveur (PM-10).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PanneauOrdonnance } from '@/modules/ordonnance/PanneauOrdonnance'
import { api, ApiError, type Medicament, type Prescription } from '@/lib/api'

// Le QR est fabriqué sur le poste par `qrcode`. On le remplace : les tests portent sur les règles
// de prescription, pas sur la génération d'une image.
vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,') } }))

const AMOXICILLINE: Medicament = {
  id: 'med-amox',
  dci: 'Amoxicilline',
  commercialNames: ['Clamoxyl', 'pénicilline'],
  form: 'gélule',
  dosage: '500 mg',
}

function ordonnance(over: Partial<Prescription> = {}): Prescription {
  return {
    id: 'ord-1',
    sessionId: 's1',
    status: 'ACTIVE',
    qrToken: 'jeton-qr',
    subProfileId: null,
    expiresAt: '2026-09-27T10:00:00.000Z',
    createdAt: '2026-08-28T10:00:00.000Z',
    cancelReason: null,
    lines: [
      {
        id: 'l1',
        medicamentId: 'med-amox',
        medicationName: 'Amoxicilline 500 mg',
        freeText: null,
        posology: '1 gélule matin et soir',
        durationDays: 7,
        qtyPrescribed: 14,
        qtyDispensed: 0,
      },
    ],
    ...over,
  }
}

/** Le 409 du garde-fou, tel que Nest le renvoie (EF-09-03). */
const alerteAllergie = () =>
  new ApiError(409, 'CONFLICT', 'Alerte allergie', {
    code: 'ALLERGY_GUARD',
    message: 'Alerte allergie',
    conflicts: [{ medicamentId: 'med-amox', medicamentLabel: 'Amoxicilline 500 mg', allergies: ['Pénicilline'] }],
  })

async function monter(active = true, deja: Prescription[] = []) {
  vi.spyOn(api, 'myPrescribed').mockResolvedValue({ items: deja })
  if (!vi.isMockFunction(api.searchMedicaments)) {
    vi.spyOn(api, 'searchMedicaments').mockResolvedValue({ items: [AMOXICILLINE] })
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <PanneauOrdonnance sessionId="s1" active={active} />
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Ordonnance' })
}

/** Ouvre le panneau et remplit une ligne complète avec l'Amoxicilline du référentiel. */
async function remplirUneLigne(utilisateur: ReturnType<typeof userEvent.setup>) {
  await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))
  await utilisateur.type(await screen.findByLabelText('Chercher un médicament'), 'amox')
  await utilisateur.click(await screen.findByRole('button', { name: /Amoxicilline 500 mg/ }))
  await utilisateur.type(screen.getByLabelText('Posologie'), '1 gélule matin et soir')
  const quantite = screen.getByLabelText('Quantité à délivrer')
  await utilisateur.clear(quantite)
  await utilisateur.type(quantite, '14')
}

beforeEach(() => {
  vi.restoreAllMocks()
  // Radix pose `pointer-events: none` et `data-scroll-locked` sur le <body> tant qu'un menu ou un
  // panneau est ouvert, et les LAISSE en place si le composant est démonté dans cet état. Le test
  // suivant ne peut alors plus cliquer nulle part — `userEvent` respecte `pointer-events`. Symptôme
  // trompeur : un test qui passe seul et échoue dans la suite complète, sur un élément bien présent.
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('C7 — le garde-fou allergies', () => {
  it("transforme le 409 en décision : il nomme le médicament ET l'allergie", async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'createPrescription').mockRejectedValue(alerteAllergie())
    await monter()
    await remplirUneLigne(utilisateur)

    await utilisateur.click(screen.getByRole('button', { name: /Sceller l'ordonnance/ }))

    // Les deux noms, pas un message d'erreur opaque.
    expect(await screen.findByText(/Alerte allergie/)).toBeInTheDocument()
    expect(screen.getByText('Amoxicilline 500 mg')).toBeInTheDocument()
    expect(screen.getByText('Pénicilline')).toBeInTheDocument()
    // Les deux issues d'EF-09-03 sont offertes.
    expect(screen.getByLabelText(/Motif de la prescription malgré l'alerte/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retirer ce médicament/ })).toBeInTheDocument()
  })

  it('bloque le scellement tant qu’un conflit n’est pas tranché', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'createPrescription').mockRejectedValue(alerteAllergie())
    await monter()
    await remplirUneLigne(utilisateur)
    await utilisateur.click(screen.getByRole('button', { name: /Sceller l'ordonnance/ }))
    await screen.findByText(/Alerte allergie/)

    // Sans motif écrit, le bouton reste hors service — le garde-fou garde quelque chose.
    expect(screen.getByRole('button', { name: /Sceller l'ordonnance/ })).toBeDisabled()
    expect(screen.getByText(/Retirez le médicament en cause, ou écrivez le motif/)).toBeInTheDocument()
  })

  it('un motif écrit rouvre le scellement et part au serveur (EF-09-03)', async () => {
    const utilisateur = userEvent.setup()
    const creer = vi.spyOn(api, 'createPrescription').mockRejectedValueOnce(alerteAllergie()).mockResolvedValue(ordonnance())
    await monter()
    await remplirUneLigne(utilisateur)
    await utilisateur.click(screen.getByRole('button', { name: /Sceller l'ordonnance/ }))
    await screen.findByText(/Alerte allergie/)

    await utilisateur.type(
      screen.getByLabelText(/Motif de la prescription malgré l'alerte/),
      'Allergie ancienne, réintroduction surveillée',
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /Sceller l'ordonnance/ })).toBeEnabled())
    await utilisateur.click(screen.getByRole('button', { name: /Sceller l'ordonnance/ }))

    await waitFor(() => expect(creer).toHaveBeenCalledTimes(2))
    expect(creer.mock.calls[1][1].overrides).toEqual([
      { medicamentId: 'med-amox', reason: 'Allergie ancienne, réintroduction surveillée' },
    ])
  })

  it('« retirer ce médicament » enlève la ligne et le conflit avec elle', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'createPrescription').mockRejectedValue(alerteAllergie())
    await monter()
    await remplirUneLigne(utilisateur)
    await utilisateur.click(screen.getByRole('button', { name: /Sceller l'ordonnance/ }))
    await screen.findByText(/Alerte allergie/)

    await utilisateur.click(screen.getByRole('button', { name: /Retirer ce médicament/ }))

    await waitFor(() => expect(screen.queryByText(/Alerte allergie/)).not.toBeInTheDocument())
    // La ligne est repartie à zéro : le champ de recherche est revenu.
    expect(screen.getByLabelText('Chercher un médicament')).toBeInTheDocument()
  })

  it('dit en permanence que le contrôle n’est ni universel ni exhaustif (EF-09-02)', async () => {
    const utilisateur = userEvent.setup()
    await monter()
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))

    expect(await screen.findByText(/il est utile, il n'est pas exhaustif/)).toBeInTheDocument()
    expect(screen.getByText(/Une ligne hors référentiel n'est vérifiée par personne/)).toBeInTheDocument()
  })

  it('marque « non vérifié » une ligne hors référentiel, là où le médecin la saisit', async () => {
    const utilisateur = userEvent.setup()
    await monter()
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))
    await utilisateur.click(await screen.findByRole('button', { name: 'Prescrire hors référentiel' }))

    expect(await screen.findByLabelText(/Médicament \(hors référentiel\)/)).toBeInTheDocument()
    expect(screen.getByText(/Non vérifié : le contrôle des allergies ne s'applique pas/)).toBeInTheDocument()
  })
})

describe('C7 — le scellement', () => {
  it('envoie la quantité, que le type web oubliait et que le serveur exige', async () => {
    const utilisateur = userEvent.setup()
    const creer = vi.spyOn(api, 'createPrescription').mockResolvedValue(ordonnance())
    await monter()
    await remplirUneLigne(utilisateur)
    await utilisateur.click(screen.getByRole('button', { name: /Sceller l'ordonnance/ }))

    await waitFor(() => expect(creer).toHaveBeenCalled())
    expect(creer.mock.calls[0][1].lines[0]).toMatchObject({
      medicamentId: 'med-amox',
      posology: '1 gélule matin et soir',
      qtyPrescribed: 14,
    })
  })

  it('avertit de l’immuabilité AVANT le bouton, pas après (RM-09-05)', async () => {
    const utilisateur = userEvent.setup()
    await monter()
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))

    const avertissement = await screen.findByText(/ni vous ni personne ne pourra la modifier/)
    const bouton = screen.getByRole('button', { name: /Sceller l'ordonnance/ })
    // `compareDocumentPosition` : l'avertissement précède le bouton dans le document.
    expect(avertissement.compareDocumentPosition(bouton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('reste hors service tant qu’une ligne est incomplète (EF-09-02)', async () => {
    const utilisateur = userEvent.setup()
    await monter()
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))

    expect(await screen.findByRole('button', { name: /Sceller l'ordonnance/ })).toBeDisabled()
    expect(screen.getByText(/Chaque ligne demande un médicament, une posologie et une quantité/)).toBeInTheDocument()
  })
})

describe('C7 — une ordonnance déjà scellée', () => {
  it("affiche l'échéance servie par le serveur, sans écrire aucune durée (PM-10)", async () => {
    const utilisateur = userEvent.setup()
    await monter(true, [ordonnance()])
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))

    expect(await screen.findByText(/Valable jusqu'au 27\/09\/2026/)).toBeInTheDocument()
    // Ni « 30 jours », ni « un mois » : PM-10 n'a pas à être deviné par l'écran.
    expect(document.body.textContent).not.toMatch(/\d+ jours de validité|valable 30 jours/i)
  })

  it('propose l’annulation motivée, seule issue après une erreur (CU-09-04)', async () => {
    const utilisateur = userEvent.setup()
    const annuler = vi.spyOn(api, 'cancelPrescription').mockResolvedValue(ordonnance({ status: 'CANCELLED' }))
    await monter(true, [ordonnance()])
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))

    await utilisateur.click(await screen.findByRole('button', { name: /Annuler cette ordonnance/ }))
    // Le motif est obligatoire : sans lui, la confirmation reste hors service.
    expect(screen.getByRole('button', { name: /Confirmer l'annulation/ })).toBeDisabled()

    await utilisateur.type(screen.getByLabelText("Motif de l'annulation"), 'Erreur de dosage')
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirmer l'annulation/ })).toBeEnabled())
    await utilisateur.click(screen.getByRole('button', { name: /Confirmer l'annulation/ }))

    await waitFor(() => expect(annuler).toHaveBeenCalledWith('ord-1', 'Erreur de dosage'))
  })

  /*
    ── Ce test s'était SILENCIEUSEMENT désarmé (02/09/2026, chantier 29) ────────────────────────

    Il portait deux assertions, et le chantier 27 en avait vidé une sans la faire tomber :
    `queryByAltText('Code à scanner en pharmacie')` cherchait un texte alternatif que ce même
    chantier venait de renommer en « Sceau de l'ordonnance ». L'assertion « ce texte n'est pas là »
    est restée verte pour la mauvaise raison — il n'existait plus nulle part, ordonnance annulée ou
    non. Elle ne surveillait plus le QR, elle surveillait une chaîne morte.

    C'est la même famille que le témoin d'`app.boot.spec.ts` au chantier 26 : **une assertion
    négative dont la cible a été renommée cesse de tester sans jamais échouer.** Elle vise donc
    désormais le texte alternatif RÉEL.

    La première assertion, elle, a bien échoué — la phrase d'annulation a changé le même jour, et
    c'est ainsi qu'on a découvert la seconde.
  */
  it('une ordonnance annulée ne montre plus aucun sceau (RM-09-05)', async () => {
    const utilisateur = userEvent.setup()
    await monter(true, [ordonnance({ status: 'CANCELLED', qrToken: null, cancelReason: 'Erreur de dosage' })])
    await utilisateur.click(screen.getByRole('button', { name: /Rédiger l'ordonnance/ }))

    expect(await screen.findByText(/elle ne doit plus être suivie/)).toBeInTheDocument()
    // Le motif saisi par le prescripteur est rendu à côté, entre parenthèses.
    expect(screen.getByText(/Erreur de dosage/)).toBeInTheDocument()
    // Le texte alternatif RÉEL du sceau — celui que porte une ordonnance active.
    expect(screen.queryByAltText('Sceau de l’ordonnance')).not.toBeInTheDocument()
  })
})

describe('C7 — hors d’une séance active', () => {
  it('ne propose aucune rédaction sur une séance close (RM-09-01)', async () => {
    await monter(false)

    expect(screen.getByText(/Aucune ordonnance n'a été rédigée pendant cette consultation/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Rédiger l'ordonnance/ })).not.toBeInTheDocument()
  })

  it('laisse relire une ordonnance déjà scellée, sans permettre d’en écrire une autre', async () => {
    const utilisateur = userEvent.setup()
    await monter(false, [ordonnance()])

    // `findBy` et non `getBy` : le libellé du bouton dépend des ordonnances chargées, qui arrivent
    // après le premier rendu. Tant qu'elles ne sont pas là, il dit encore « Rédiger ».
    await utilisateur.click(await screen.findByRole('button', { name: /Revoir l'ordonnance/ }))

    expect(await screen.findByText(/On ne prescrit que depuis une séance active/)).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /Sceller/ })).not.toBeInTheDocument()
  })
})

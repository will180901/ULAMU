/**
 * Le carnet de numéros Mobile Money — chantier 114.
 *
 * Ce qui se vérifie ici n'est pas le dessin : c'est qu'un numéro enregistré **se voit**, que le
 * doute sur l'opérateur **se dit**, et qu'aucune de ces deux choses n'interdit quoi que ce soit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { SectionMobileMoney } from '@/modules/settings/sections/SectionMobileMoney'
import { api, type MomoNumber } from '@/lib/api'

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <SectionMobileMoney />
    </QueryClientProvider>,
  )
}

const mtn: MomoNumber = { operator: 'MTN_MOMO', msisdn: '+242061234567', verified: false, looksRight: true }

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Mes numéros Mobile Money', () => {
  it('montre les deux opérateurs, et dit quand il n’y a rien', async () => {
    vi.spyOn(api, 'myMomoNumbers').mockResolvedValue([])
    monter()

    expect(await screen.findByText('MTN MoMo')).toBeInTheDocument()
    expect(screen.getByText('Airtel Money')).toBeInTheDocument()
    expect(await screen.findAllByText(/Aucun numéro/)).toHaveLength(2)
  })

  /*
    ⚠️ **Le repli doit être ÉCRIT.** Sans numéro enregistré, la demande de paiement part sur le
    numéro de connexion — c'est le comportement d'avant le carnet, conservé pour ne casser aucun
    compte existant. *Un repli tu est un piège ; un repli annoncé est un choix.*
  */
  it('⚠️ et il annonce ce qui se passe si l’on n’enregistre rien', async () => {
    vi.spyOn(api, 'myMomoNumbers').mockResolvedValue([])
    monter()

    expect(await screen.findByText(/numéro de votre compte — celui de la connexion/)).toBeInTheDocument()
  })

  it('affiche le numéro enregistré', async () => {
    vi.spyOn(api, 'myMomoNumbers').mockResolvedValue([mtn])
    monter()

    expect(await screen.findByText('+242061234567')).toBeInTheDocument()
  })

  it('enregistre un numéro saisi', async () => {
    vi.spyOn(api, 'myMomoNumbers').mockResolvedValue([])
    const poser = vi.spyOn(api, 'setMomoNumber').mockResolvedValue(mtn)
    monter()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Enregistrer' }))[0]!)
    /*
      On valide au clavier plutôt qu'au bouton : les deux opérateurs portent le même libellé, et
      viser « le bon Enregistrer » demanderait de nommer une zone que l'écran n'a pas besoin de
      nommer. *Un test ne doit pas forcer l'interface à s'adapter à lui.*
    */
    await userEvent.type(screen.getByLabelText('Numéro MTN MoMo'), '061234567{Enter}')

    await waitFor(() => expect(poser).toHaveBeenCalledWith('MTN_MOMO', '061234567'))
  })

  /*
    ⚠️ **Le doute se dit, il n'interdit pas.** La portabilité existe : un 05 peut vivre chez MTN.
    *Un préfixe qui interdit se trompe le jour où l'opérateur ouvre une nouvelle tranche ; un
    préfixe qui prévient ne se trompe jamais tout à fait.*
  */
  it('⚠️ prévient quand le numéro ne ressemble pas à son opérateur — sans rien bloquer', async () => {
    vi.spyOn(api, 'myMomoNumbers').mockResolvedValue([
      { operator: 'MTN_MOMO', msisdn: '+242051234567', verified: false, looksRight: false },
    ])
    monter()

    expect(await screen.findByText(/ne commence pas par 06/)).toBeInTheDocument()
    /* Le numéro reste affiché et modifiable : rien n'est retiré à qui a porté son numéro. */
    expect(screen.getByText('+242051234567')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Modifier' }).length).toBeGreaterThan(0)
  })

  it('retire un numéro', async () => {
    vi.spyOn(api, 'myMomoNumbers').mockResolvedValue([mtn])
    const oter = vi.spyOn(api, 'removeMomoNumber').mockResolvedValue({ removed: true })
    monter()

    await userEvent.click(await screen.findByRole('button', { name: 'Retirer' }))

    await waitFor(() => expect(oter).toHaveBeenCalledWith('MTN_MOMO'))
  })
})

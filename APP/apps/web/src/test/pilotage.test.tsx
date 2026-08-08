/**
 * Pilotage — M16 (CU-16-03) et M04 (EF-04-03).
 *
 * Ces 7 indicateurs décideront de la suite du projet : « V1 si vert, pivot si rouge »
 * (`plan_releases §3`). Ce ne sont donc pas des chiffres décoratifs, et deux règles les protègent :
 *
 *  1. **Le verdict vient du SERVEUR.** Le recalculer ici créerait une seconde source de vérité qui
 *     finirait par diverger de la règle métier — et un pivot se déciderait sur un chiffre faux.
 *  2. **Le verdict est ÉCRIT**, pas seulement coloré : « atteint » se lit, un vert se devine (CG-11).
 *
 * Le dernier test porte sur l'intégrité du journal : un tableau de bord dont on ne peut pas prouver
 * que les données n'ont pas été retouchées ne vaut rien.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PilotagePage } from '@/modules/admin/pages/PilotagePage'
import { api, type PilotKpi } from '@/lib/api'

const KPIS: PilotKpi[] = [
  { key: 'pros', label: 'Professionnels vérifiés actifs', value: 34, target: 30, unit: 'count', status: 'GREEN' },
  { key: 'sessions', label: 'Sessions réalisées', value: 420, target: 1000, unit: 'count', status: 'RED' },
  { key: 'retour', label: 'Patients revenus une 2ᵉ fois', value: 22, target: 40, unit: '%', status: 'RED' },
]

function monter() {
  return render(
    <MemoryRouter>
      <PilotagePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'pilotKpis').mockResolvedValue(KPIS)
})

describe('pilotage du pilote', () => {
  it('reprend le verdict du serveur sans le recalculer', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('Professionnels vérifiés actifs')).toBeInTheDocument())

    // 34 ≥ 30 → atteint ; 420 < 1000 → en retard. Les deux verdicts viennent du champ `status`.
    const ligneOk = screen.getByText('Professionnels vérifiés actifs').closest('li') as HTMLElement
    expect(within(ligneOk).getByText('Atteint')).toBeInTheDocument()

    const ligneKo = screen.getByText('Sessions réalisées').closest('li') as HTMLElement
    expect(within(ligneKo).getByText('En retard')).toBeInTheDocument()
  })

  it('affiche la valeur ET la cible, pas seulement une barre', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('420')).toBeInTheDocument())
    expect(screen.getByText(/Cible : 1 000/)).toBeInTheDocument()
    // Les taux portent leur unité : « 22 » sans « % » ne veut rien dire à côté d'un effectif.
    expect(screen.getByText('22 %')).toBeInTheDocument()
    expect(screen.getByText(/Cible : 40 %/)).toBeInTheDocument()
  })

  it('résume combien de critères sont atteints', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('1 / 3 atteints')).toBeInTheDocument())
  })

  it('alerte clairement quand la chaîne d’audit est rompue (EF-04-03)', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'auditIntegrity').mockResolvedValue({ ok: false, checked: 1200, brokenAtSeq: 843 })
    monter()
    await waitFor(() => expect(screen.getByRole('button', { name: /Vérifier la chaîne/i })).toBeInTheDocument())

    await u.click(screen.getByRole('button', { name: /Vérifier la chaîne/i }))

    await waitFor(() => expect(screen.getByText('Rupture détectée')).toBeInTheDocument())
    // Le numéro d'événement est donné : sans lui, « chaîne rompue » n'est pas actionnable.
    expect(screen.getByText(/n° 843/)).toBeInTheDocument()
    expect(screen.getByText(/Conservez la base en l’état/i)).toBeInTheDocument()
  })
})

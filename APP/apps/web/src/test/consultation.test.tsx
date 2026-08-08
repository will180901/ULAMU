/**
 * Consultation de soin — M06, CU-06-02 à CU-06-05.
 *
 * La règle la plus lourde de conséquences est D-021 : **le compte-rendu est obligatoire**. C'est ce
 * document qui est versé au Carnet de santé à vie du patient. Sans lui, une consultation payée ne
 * laisse aucune trace exploitable par le prochain soignant — le patient a payé pour rien de durable.
 *
 * Les deux autres tests protègent la confiance dans le décompteur : il vient du SERVEUR (RM-06-02).
 * Un soignant qui verrait plus de temps qu'il n'en reste facturerait un temps qu'il n'a pas.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConsultationPage } from '@/modules/sessions/pages/ConsultationPage'
import { api, type CareSession } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const ME: MeResponse = {
  accountId: 'p1',
  accountType: 'PROFESSIONAL',
  adminRole: null,
  username: 'dr.konate',
  phone: '+242060000010',
  firstName: 'Armel',
  lastName: 'Konaté',
  district: null,
  category: 'GENERAL_PRACTITIONER',
  specialty: null,
  biography: null,
  totpEnabled: true,
}

const BASE: CareSession = {
  id: 's1',
  handshakeId: 'h1',
  status: 'ACTIVE',
  patientAccountId: 'pat1',
  professionalId: 'p1',
  subProfileId: null,
  durationMin: 20,
  paidAt: '2026-08-05T10:00:00.000Z',
  startedAt: '2026-08-05T10:01:00.000Z',
  endsAt: '2026-08-05T10:21:00.000Z',
  endedAt: null,
  remainingSeconds: 615,
  autoStartAt: null,
  extensionTotalSec: 0,
  professionalDelaySec: 0,
  reportDepositedAt: null,
  preConsultation: {
    symptoms: 'Fièvre depuis trois jours',
    sinceWhen: '3 jours',
    attachments: [],
    submittedAt: '2026-08-05T10:00:30.000Z',
  },
  rated: false,
  otherPartyTyping: false,
}

function monter(session: CareSession) {
  useSessionStore.getState().setSession('jeton', ME)
  vi.spyOn(api, 'session').mockResolvedValue(session)
  vi.spyOn(api, 'sessionMessages').mockResolvedValue({ items: [], nextCursor: null })
  return render(
    <MemoryRouter initialEntries={['/consultations/s1']}>
      <Routes>
        <Route path="/consultations/:id" element={<ConsultationPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('consultation de soin', () => {
  it('affiche le temps restant tel que le SERVEUR le donne (RM-06-02)', async () => {
    monter(BASE)
    // 615 s = 10:15 — aucune reconstruction locale à partir de endsAt : l'horloge du poste peut être
    // fausse, celle du serveur fait foi.
    await waitFor(() => expect(screen.getByText('10:15')).toBeInTheDocument())
  })

  it('montre au soignant le motif renseigné par le patient', async () => {
    monter(BASE)
    await waitFor(() => expect(screen.getByText(/Fièvre depuis trois jours/i)).toBeInTheDocument())
  })

  it('exige diagnostic ET recommandations avant de déposer le compte-rendu (D-021)', async () => {
    const u = userEvent.setup({ delay: null })
    const depot = vi.spyOn(api, 'depositReport').mockResolvedValue({ ...BASE, status: 'ENDED' })
    monter({ ...BASE, status: 'ENDED', remainingSeconds: 0 })

    await waitFor(() => expect(screen.getByRole('heading', { name: /Compte-rendu/i })).toBeInTheDocument())
    const bouton = screen.getByRole('button', { name: /Déposer le compte-rendu/i })
    expect(bouton).toBeDisabled()

    await u.type(screen.getByLabelText(/Diagnostic/i), 'Paludisme simple')
    expect(bouton).toBeDisabled() // un seul des deux champs ne suffit pas

    await u.type(screen.getByLabelText(/Recommandations/i), 'Repos, hydratation, contrôle à 48 h')
    expect(bouton).toBeEnabled()

    await u.click(bouton)
    expect(depot).toHaveBeenCalledWith('s1', {
      diagnosis: 'Paludisme simple',
      recommendations: 'Repos, hydratation, contrôle à 48 h',
    })
  })

  it('annonce la portée du compte-rendu AVANT les champs, pas après une erreur', async () => {
    monter({ ...BASE, status: 'ENDED', remainingSeconds: 0 })
    await waitFor(() => expect(screen.getByText(/Carnet de santé du patient/i)).toBeInTheDocument())
    expect(screen.getByText(/aucune trace médicale/i)).toBeInTheDocument()
  })

  it('ne propose plus d’envoyer de message une fois la consultation terminée', async () => {
    monter({ ...BASE, status: 'ENDED', remainingSeconds: 0 })
    await waitFor(() => expect(screen.getByText(/Échanges/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Envoyer$/i })).not.toBeInTheDocument()
  })
})

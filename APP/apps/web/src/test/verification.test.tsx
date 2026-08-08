/**
 * Dossier de vérification (M03) — l'écran qui manquait pour que l'inscription professionnelle mène
 * quelque part.
 *
 * `CU-01-02` impose une redirection obligatoire vers le dépôt du dossier à la création du compte, et
 * `RM-02-04` rend le compte invisible de l'annuaire tant qu'il n'existe pas. Avant cet écran,
 * l'inscription atterrissait sur un tableau de bord vide : un professionnel ne pouvait donc jamais
 * devenir opérationnel.
 *
 * Ce qui est verrouillé ici :
 *   1. le jeu minimal de pièces affiché correspond à celui du serveur (`REQUIRED_DOCS`) ;
 *   2. on ne peut pas déposer un dossier incomplet — le bouton reste inerte ;
 *   3. le motif d'une décision négative est montré, sinon l'utilisateur ne sait pas quoi corriger ;
 *   4. les codes serveur (`NEEDS_INFO`…) ne sortent jamais à l'écran.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VerificationPage } from '@/modules/verification/pages/VerificationPage'
import { api, type VerificationCase } from '@/lib/api'

const DOSSIER_VIDE: VerificationCase = {
  caseId: 'c1',
  subjectKind: 'PROFESSIONAL',
  status: 'DRAFT',
  canPractice: false,
  documents: [],
  decisions: [],
  agreement: null,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('dossier de vérification (M03)', () => {
  it('affiche les 4 pièces exigées d’un professionnel, toutes manquantes', async () => {
    vi.spyOn(api, 'verificationMine').mockResolvedValue(DOSSIER_VIDE)
    render(<VerificationPage />)

    await waitFor(() => expect(screen.getByText('Pièce d’identité')).toBeInTheDocument())
    expect(screen.getByText('Diplôme')).toBeInTheDocument()
    expect(screen.getByText('Autorisation d’exercice')).toBeInTheDocument()
    expect(screen.getByText('Photo de profil')).toBeInTheDocument()
    // Le justificatif de localisation ne concerne que les STRUCTURES — il ne doit pas apparaître ici.
    expect(screen.queryByText('Justificatif de localisation')).not.toBeInTheDocument()
  })

  it('interdit de déposer un dossier incomplet', async () => {
    vi.spyOn(api, 'verificationMine').mockResolvedValue(DOSSIER_VIDE)
    render(<VerificationPage />)

    const bouton = await screen.findByRole('button', { name: /Déposer mon dossier/i })
    expect(bouton).toBeDisabled()
    expect(screen.getByText(/Il manque encore/i)).toBeInTheDocument()
  })

  it('autorise le dépôt quand les 4 pièces sont fournies', async () => {
    vi.spyOn(api, 'verificationMine').mockResolvedValue({
      ...DOSSIER_VIDE,
      documents: (['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'] as const).map((kind, i) => ({
        id: `d${i}`,
        kind,
        fileKey: `k${i}`,
        expiresAt: null,
        createdAt: '2026-08-05T10:00:00.000Z',
      })),
    })
    render(<VerificationPage />)

    const bouton = await screen.findByRole('button', { name: /Déposer mon dossier/i })
    expect(bouton).toBeEnabled()
    expect(screen.queryByText(/Il manque encore/i)).not.toBeInTheDocument()
  })

  it('montre le motif d’un complément demandé, en français et jamais le code serveur', async () => {
    vi.spyOn(api, 'verificationMine').mockResolvedValue({
      ...DOSSIER_VIDE,
      status: 'NEEDS_INFO',
      decisions: [{ id: 'x', decision: 'NEEDS_INFO', reasons: 'Le diplôme fourni est illisible.', decidedAt: '2026-08-05T10:00:00.000Z' }],
    })
    render(<VerificationPage />)

    await waitFor(() => expect(screen.getByText('Le diplôme fourni est illisible.')).toBeInTheDocument())
    expect(screen.getByText('Complément demandé')).toBeInTheDocument()
    // « NEEDS_INFO » n'est pas une phrase : le code serveur ne doit jamais atteindre l'utilisateur.
    expect(screen.queryByText(/NEEDS_INFO/)).not.toBeInTheDocument()
  })

  it('n’affiche jamais un contrat dont le sceau d’intégrité est rompu', async () => {
    vi.spyOn(api, 'verificationMine').mockResolvedValue({
      ...DOSSIER_VIDE,
      status: 'VERIFIED',
      canPractice: false,
      agreement: {
        version: 1,
        commissionPct: 10,
        bodyHash: 'abc',
        body: null,
        integrity: false,
        signedAt: null,
        effectiveAt: null,
      },
    })
    render(<VerificationPage />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/sceau d’intégrité/i))
  })
})

/**
 * Mes consultations — M06. Point d'entrée vers chaque session de soin.
 *
 * Trié par urgence et non par date : une consultation ACTIVE où un patient attend une réponse passe
 * avant une consultation terminée d'hier. Et une consultation terminée SANS compte-rendu remonte en
 * tête avec un avertissement — c'est une dette envers le patient (D-021), pas une ligne d'historique.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, type CareSession } from '@/lib/api'

/** Plus le rang est bas, plus la ligne remonte. */
function rang(s: CareSession): number {
  if (s.status === 'ACTIVE') return 0
  if (s.status === 'ENDED' && !s.reportDepositedAt) return 1 // dette envers le patient
  if (s.status === 'PREPARING') return 2
  return 3
}

export function ConsultationsPage() {
  const naviguer = useNavigate()
  const [liste, setListe] = useState<CareSession[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const charger = useCallback(async () => {
    try {
      setListe(await api.mySessions())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const triees = useMemo(
    () => [...(liste ?? [])].sort((a, b) => rang(a) - rang(b) || +new Date(b.paidAt) - +new Date(a.paidAt)),
    [liste],
  )
  const sansCompteRendu = triees.filter((s) => s.status === 'ENDED' && !s.reportDepositedAt).length

  if (etat === 'chargement') return <LoadingState label="Chargement de vos consultations…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />

  return (
    <div>
      <PageHeader
        icon={<MessageSquare size={20} />}
        title="Mes consultations"
        subtitle="Vos sessions de soin, les plus urgentes en premier."
      />

      {sansCompteRendu > 0 ? (
        <div className="ul-notice ul-notice--warning" role="status">
          <p className="t-text-sm" style={{ margin: 0 }}>
            {sansCompteRendu} consultation{sansCompteRendu > 1 ? 's' : ''} terminée{sansCompteRendu > 1 ? 's' : ''} sans
            compte-rendu. Sans ce document, la consultation payée par le patient ne laisse aucune trace dans son
            Carnet de santé.
          </p>
        </div>
      ) : null}

      <section className="ul-card">
        {triees.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={22} />}
            title="Aucune consultation"
            description="Vos consultations apparaîtront ici dès qu’un patient aura réglé une demande que vous avez confirmée."
            action={
              <Button variant="ghost" onClick={() => naviguer('/demandes')}>
                Voir mes demandes
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {triees.map((s) => (
              <li className="ul-docrow" key={s.id}>
                <span className="ul-docrow__label">
                  Consultation du {new Date(s.paidAt).toLocaleDateString('fr-FR')}
                  <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                    {s.durationMin} min · réglée à {new Date(s.paidAt).toLocaleTimeString('fr-FR')}
                  </span>
                </span>

                {s.status === 'ACTIVE' ? (
                  <StatusPill tone="success">En cours</StatusPill>
                ) : s.status === 'ENDED' && !s.reportDepositedAt ? (
                  <StatusPill tone="warning">Compte-rendu manquant</StatusPill>
                ) : s.status === 'ENDED' ? (
                  <StatusPill tone="neutral">Terminée</StatusPill>
                ) : (
                  <StatusPill tone="info">{s.status === 'PREPARING' ? 'En préparation' : s.status}</StatusPill>
                )}

                <Button variant="ghost" size="sm" onClick={() => naviguer(`/consultations/${s.id}`)}>
                  Ouvrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

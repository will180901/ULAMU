/**
 * Supervision financière — M13, EF-13-09/10. Sous-rôle ADMIN_FINANCE.
 *
 * Ce sous-rôle n'avait **aucun écran** : un administrateur Finance se connectait et ne voyait rien.
 * Un rôle avec un espace vide est pire qu'un rôle absent — il laisse croire que l'outil existe.
 *
 * ⚠️ **RM-13-06 — la double validation.** Au-delà de PM-35, un remboursement exige un SECOND
 * administrateur, **différent du demandeur**. Le serveur le refuse déjà (`canSecondApprove`), mais
 * l'écran doit le dire AVANT le clic : découvrir l'interdiction par une erreur rouge après coup
 * laisse penser à une panne, et pousse à réessayer.
 *
 * Le montant est affiché sur chaque ligne. Décider d'un remboursement sans le voir serait absurde —
 * c'est précisément ce qu'imposait l'absence de route de liste, qui obligeait à travailler depuis la
 * base de données.
 */
import { useCallback, useEffect, useState } from 'react'
import { Banknote, Check, RefreshCw, ScaleIcon, X } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type ReconciliationReport, type RefundRequest, type RefundStatus } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const TON: Record<RefundStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING_SECOND_APPROVAL: 'warning',
  APPROVED: 'success',
  EXECUTED: 'success',
  REJECTED: 'neutral',
}
const LIBELLE: Record<RefundStatus, string> = {
  PENDING_SECOND_APPROVAL: 'Attend un second avis',
  APPROVED: 'Approuvé',
  EXECUTED: 'Exécuté',
  REJECTED: 'Rejeté',
}

export function FinancePage() {
  const me = useSessionStore((s) => s.me)
  const [demandes, setDemandes] = useState<RefundRequest[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      setDemandes(await api.adminRefunds())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const decider = async (id: string, action: 'approve' | 'reject') => {
    setErreur(null)
    setEnCours(id)
    try {
      if (action === 'approve') await api.approveRefund(id)
      else await api.rejectRefund(id)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Décision impossible — réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  if (etat === 'chargement') return <LoadingState label="Chargement des demandes…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />

  const enAttente = (demandes ?? []).filter((d) => d.status === 'PENDING_SECOND_APPROVAL')
  const decidees = (demandes ?? []).filter((d) => d.status !== 'PENDING_SECOND_APPROVAL')

  return (
    <div>
      <PageHeader
        icon={<Banknote size={20} />}
        title="Supervision financière"
        subtitle="Remboursements manuels et réconciliation avec l’agrégateur Mobile Money."
      />

      <section className="ul-card" aria-labelledby="attente-titre">
        <div className="ul-card__head">
          <h2 id="attente-titre" className="t-display-sm" style={{ margin: 0 }}>
            Remboursements à trancher
          </h2>
          {enAttente.length > 0 ? <StatusPill tone="warning">{enAttente.length}</StatusPill> : null}
        </div>

        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Au-delà du seuil PM-35, un remboursement exige <strong>deux administrateurs différents</strong>.
          Vous ne pouvez donc pas approuver une demande que vous avez vous-même formulée.
        </p>

        {enAttente.length === 0 ? (
          <EmptyState
            icon={<Banknote size={22} />}
            title="Aucune demande en attente"
            description="Les remboursements sous le seuil s’exécutent directement. Seuls ceux qui le dépassent apparaissent ici, en attente d’un second avis."
            action={
              <Button variant="ghost" onClick={charger}>
                <RefreshCw size={15} /> Actualiser
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {enAttente.map((d) => {
              const sienne = d.requestedBy === me?.accountId
              return (
                <li className="ul-docrow ul-docrow--bloc" key={d.requestId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
                    <span className="ul-docrow__label">
                      {d.amountXaf !== null ? `${d.amountXaf.toLocaleString('fr-FR')} XAF` : 'Montant indisponible'}
                      <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                        {d.reason} · demandé le {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                    <StatusPill tone={TON[d.status]}>{LIBELLE[d.status]}</StatusPill>
                  </div>

                  {/* RM-13-06 dit AVANT le clic, pas après : une erreur serveur ressemble à une panne. */}
                  {sienne ? (
                    <p className="t-caption" style={{ color: 'var(--alerte-texte)', margin: 0 }}>
                      Vous avez formulé cette demande — un autre administrateur Finance doit la trancher.
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
                    <Button
                      onClick={() => decider(d.requestId, 'approve')}
                      loading={enCours === d.requestId}
                      disabled={sienne || enCours !== null}
                    >
                      <Check size={15} /> Approuver
                    </Button>
                    <Button variant="ghost" onClick={() => decider(d.requestId, 'reject')} disabled={enCours !== null}>
                      <X size={15} /> Rejeter
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {erreur ? (
          <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
            {erreur}
          </p>
        ) : null}
      </section>

      {decidees.length > 0 ? (
        <section className="ul-card" aria-labelledby="historique-titre">
          <div className="ul-card__head">
            <h2 id="historique-titre" className="t-display-sm" style={{ margin: 0 }}>
              Décisions récentes
            </h2>
          </div>
          <ul className="ul-doclist">
            {decidees.map((d) => (
              <li className="ul-docrow" key={d.requestId}>
                <span className="ul-docrow__label">
                  {d.amountXaf !== null ? `${d.amountXaf.toLocaleString('fr-FR')} XAF` : '—'}
                  <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                    {d.reason}
                    {d.decidedAt ? ` · tranché le ${new Date(d.decidedAt).toLocaleDateString('fr-FR')}` : ''}
                  </span>
                </span>
                <StatusPill tone={TON[d.status]}>{LIBELLE[d.status]}</StatusPill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SectionReconciliation />
    </div>
  )
}

/* ── Réconciliation — EF-13-09 ────────────────────────────────────────────────────────────────── */

function SectionReconciliation() {
  const [rapport, setRapport] = useState<ReconciliationReport | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const lancer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      setRapport(await api.runReconciliation())
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Réconciliation impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const ecarts = rapport
    ? rapport.missingInDb.length + rapport.missingAtAggregator.length + rapport.amountMismatch.length
    : 0

  return (
    <section className="ul-card" aria-labelledby="reconciliation-titre">
      <div className="ul-card__head">
        <h2 id="reconciliation-titre" className="t-display-sm" style={{ margin: 0 }}>
          Réconciliation
        </h2>
        {rapport ? (
          <StatusPill tone={rapport.hasGaps ? 'error' : 'success'}>
            {rapport.hasGaps ? `${ecarts} écart${ecarts > 1 ? 's' : ''}` : 'Aucun écart'}
          </StatusPill>
        ) : null}
      </div>

      <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
        Compare le relevé de l’agrégateur Mobile Money avec les paiements enregistrés. Un écart
        signifie qu’un franc est passé d’un côté sans être vu de l’autre — c’est le seul contrôle qui
        détecte un paiement perdu.
      </p>

      <div>
        <Button onClick={lancer} loading={occupe} disabled={occupe}>
          <ScaleIcon size={15} /> Lancer la réconciliation
        </Button>
      </div>

      {rapport ? (
        <div className="ul-notice" role="status">
          <p className="t-label-md" style={{ margin: 0 }}>
            {rapport.aggregatorLines} ligne{rapport.aggregatorLines > 1 ? 's' : ''} chez l’agrégateur ·{' '}
            {rapport.dbLines} en base
          </p>
          {rapport.hasGaps ? (
            <ul className="t-text-sm" style={{ margin: 0, paddingLeft: '1.2em' }}>
              {rapport.missingInDb.length > 0 ? (
                <li>{rapport.missingInDb.length} confirmé(s) chez l’agrégateur, absent(s) en base</li>
              ) : null}
              {rapport.missingAtAggregator.length > 0 ? (
                <li>{rapport.missingAtAggregator.length} en base, absent(s) chez l’agrégateur</li>
              ) : null}
              {rapport.amountMismatch.length > 0 ? (
                <li>{rapport.amountMismatch.length} montant(s) divergent(s)</li>
              ) : null}
            </ul>
          ) : (
            <p className="t-text-sm" style={{ margin: 0 }}>
              Les deux relevés concordent au franc près.
            </p>
          )}
        </div>
      ) : null}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

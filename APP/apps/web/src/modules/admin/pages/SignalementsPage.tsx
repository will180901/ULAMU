/**
 * Signalements — M04, CU-04-04. Sous-rôle **Super**.
 *
 * Un signalement non traité, dans un produit de santé, c'est un soignant qui continue d'exercer
 * pendant qu'un patient attend une réponse. Le délai cible (PM-23) est donc traité comme une dette :
 * les dossiers en retard remontent, et le retard est **écrit**.
 *
 * Les quatre issues de `EF-04-06` sont montrées ensemble avec leur conséquence réelle — « transmis
 * au pilotage » et « transmis à la vérification » n'ont pas du tout le même effet, et un intitulé
 * technique (`ESCALATED_M16`) n'aurait rien dit au modérateur.
 */
import { useCallback, useEffect, useState } from 'react'
import { Flag, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type ReportDecision, type UserReport } from '@/lib/api'

const ISSUES: { code: ReportDecision; label: string; aide: string }[] = [
  { code: 'DISMISSED', label: 'Rejeter', aide: 'Le signalement n’est pas fondé.' },
  { code: 'WARNING', label: 'Avertir', aide: 'Un avertissement est adressé à la personne visée.' },
  { code: 'ESCALATED_M16', label: 'Transmettre au pilotage', aide: 'Suspension ou bannissement à instruire.' },
  { code: 'ESCALATED_M03', label: 'Transmettre à la vérification', aide: 'Le badge de la personne est à réexaminer.' },
]

export function SignalementsPage() {
  const [liste, setListe] = useState<UserReport[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const charger = useCallback(async () => {
    try {
      setListe((await api.reports('PENDING')).items)
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  if (etat === 'chargement') return <LoadingState label="Chargement des signalements…" onRetry={charger} />
  if (etat === 'erreur' || !liste) return <ErrorState onRetry={charger} />

  // En retard d'abord, puis les plus anciens : un signalement vieillit mal.
  const triee = [...liste].sort(
    (a, b) => Number(b.isOverdue) - Number(a.isOverdue) || +new Date(a.createdAt) - +new Date(b.createdAt),
  )
  const enRetard = triee.filter((r) => r.isOverdue).length

  return (
    <div>
      <PageHeader
        icon={<Flag size={20} />}
        title="Signalements"
        subtitle="Un signalement non traité, c’est un patient sans réponse et un risque qui perdure."
      />

      {enRetard > 0 ? (
        <div className="ul-notice ul-notice--warning" role="status">
          <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TriangleAlert size={15} aria-hidden="true" /> {enRetard} signalement{enRetard > 1 ? 's' : ''} hors délai
          </p>
        </div>
      ) : null}

      <section className="ul-card">
        {triee.length === 0 ? (
          <EmptyState
            icon={<Flag size={22} />}
            title="Aucun signalement en attente"
            description="Les signalements déposés par les utilisateurs apparaîtront ici."
            action={
              <Button variant="ghost" onClick={charger}>
                Actualiser
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {triee.map((r) => (
              <LigneSignalement key={r.id} report={r} onDecide={charger} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function LigneSignalement({ report, onDecide }: { report: UserReport; onDecide: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [decision, setDecision] = useState<ReportDecision>('DISMISSED')
  const [motif, setMotif] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const trancher = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.decideReport(report.id, { decision, reasons: motif.trim() })
      setOuvert(false)
      setMotif('')
      onDecide()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Décision impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <li className="ul-docrow ul-docrow--bloc">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
        <span className="ul-docrow__label">
          {report.reasonCode}
          <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
            {report.targetType} · déposé le {new Date(report.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </span>
        {report.isOverdue ? <StatusPill tone="error">Hors délai</StatusPill> : <StatusPill tone="neutral">{report.status}</StatusPill>}
        {!ouvert ? (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)}>
            Traiter
          </Button>
        ) : null}
      </div>

      {report.reasonText ? (
        <p className="t-text-sm" style={{ margin: 0, color: 'var(--texte-secondaire)', whiteSpace: 'pre-wrap' }}>
          {report.reasonText}
        </p>
      ) : null}

      {ouvert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-2)', width: '100%' }}>
          <div className="ul-choix" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {ISSUES.map((i) => (
              <button
                key={i.code}
                type="button"
                aria-pressed={decision === i.code}
                onClick={() => setDecision(i.code)}
                className={['ul-choix__item', 'saris-focus-ring', decision === i.code ? 'is-active' : ''].filter(Boolean).join(' ')}
              >
                <span>
                  {/* Libellé PARLANT, jamais le code technique : « ESCALATED_M16 » ne dit rien à
                      quelqu'un qui doit décider du sort d'un compte. */}
                  <span className="t-label-md" style={{ display: 'block' }}>
                    {i.label}
                  </span>
                  <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
                    {i.aide}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <Field
            label="Motif de la décision"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={2000}
            hint="Obligatoire, y compris pour un rejet — c’est la seule trace de l’instruction."
          />

          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={trancher} loading={occupe} disabled={occupe || motif.trim().length === 0}>
              Enregistrer la décision
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)} disabled={occupe}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </li>
  )
}

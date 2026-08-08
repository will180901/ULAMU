/**
 * File de vérification — M03, CU-03-04. Sous-rôle **Vérification** uniquement.
 *
 * C'est le goulot d'étranglement de tout le produit : tant qu'un dossier n'est pas tranché, le
 * professionnel reste invisible de l'annuaire (`RM-02-04`) et la pharmacie ne publie rien. Un dossier
 * oublié ici, c'est un soignant qui attend des patients qui ne peuvent pas le voir.
 *
 * Trois partis pris :
 *  • **Le tri est celui de l'attente**, pas de l'arrivée : les dossiers en retard sur l'objectif
 *    PM-11 remontent en tête, avec leur retard écrit. Une file triée par date masquerait justement
 *    ceux qu'on a laissés filer.
 *  • **On s'attribue un dossier avant de décider.** Sans cette étape, deux vérificateurs travaillent
 *    sur le même pendant que la file s'allonge.
 *  • **Toute décision exige un motif**, y compris l'acceptation. C'est ce texte qui sera lu par le
 *    professionnel, et c'est la seule trace en cas de contestation.
 */
import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type VerificationQueue } from '@/lib/api'

const heures = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)

export function FileVerificationPage() {
  const [file, setFile] = useState<VerificationQueue | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const charger = useCallback(async () => {
    try {
      setFile(await api.verificationQueue())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  if (etat === 'chargement') return <LoadingState label="Chargement de la file…" onRetry={charger} />
  if (etat === 'erreur' || !file) return <ErrorState onRetry={charger} />

  // Tri par URGENCE : en retard critique, puis au-delà de l'objectif, puis par ancienneté.
  const triee = [...file.items].sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      Number(b.overdueTarget) - Number(a.overdueTarget) ||
      +new Date(a.waitingSince) - +new Date(b.waitingSince),
  )
  const enRetard = triee.filter((i) => i.overdueTarget).length

  return (
    <div>
      <PageHeader
        icon={<ClipboardCheck size={20} />}
        title="File de vérification"
        subtitle={`Objectif de traitement : ${file.targetHours} h. Un dossier en attente, c’est un soignant invisible des patients.`}
      />

      {enRetard > 0 ? (
        <div className="ul-notice ul-notice--warning" role="status">
          <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TriangleAlert size={15} aria-hidden="true" /> {enRetard} dossier{enRetard > 1 ? 's' : ''} au-delà de l’objectif
          </p>
        </div>
      ) : null}

      <section className="ul-card">
        {triee.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={22} />}
            title="File vide"
            description="Aucun dossier en attente. Les nouveaux dépôts apparaîtront ici."
            action={
              <Button variant="ghost" onClick={charger}>
                Actualiser
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {triee.map((d) => (
              <LigneDossier key={d.caseId} dossier={d} onDecide={charger} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function LigneDossier({
  dossier,
  onDecide,
}: {
  dossier: VerificationQueue['items'][number]
  onDecide: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [decision, setDecision] = useState<'VERIFIED' | 'REJECTED' | 'NEEDS_INFO'>('VERIFIED')
  const [motif, setMotif] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const attente = heures(dossier.waitingSince)

  const ouvrir = async () => {
    setErreur(null)
    try {
      // On s'attribue le dossier AVANT d'ouvrir le formulaire : deux vérificateurs ne doivent pas
      // travailler sur le même pendant que la file s'allonge.
      await api.claimCase(dossier.caseId)
      setOuvert(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Ce dossier est peut-être déjà pris en charge.')
    }
  }

  const trancher = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.decideCase(dossier.caseId, { decision, reasons: motif.trim() })
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
          {dossier.subjectName}
          <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
            {dossier.subjectKind} · {dossier.documentCount} pièce{dossier.documentCount > 1 ? 's' : ''} · en attente depuis {attente} h
          </span>
        </span>

        {/* Le retard est écrit, pas seulement coloré : c'est l'information qui décide de l'ordre de
            traitement, elle ne doit pas dépendre de la perception des teintes (CG-11). */}
        {dossier.overdue ? (
          <StatusPill tone="error">En retard critique</StatusPill>
        ) : dossier.overdueTarget ? (
          <StatusPill tone="warning">Au-delà de l’objectif</StatusPill>
        ) : (
          <StatusPill tone="neutral">{dossier.status}</StatusPill>
        )}

        {!ouvert ? (
          <Button variant="ghost" size="sm" onClick={ouvrir}>
            Examiner
          </Button>
        ) : null}
      </div>

      {ouvert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-2)', width: '100%' }}>
          <div className="ul-choix">
            {(
              [
                { code: 'VERIFIED' as const, label: 'Vérifier', aide: 'Le badge est accordé, le compte devient visible.' },
                { code: 'NEEDS_INFO' as const, label: 'Compléter', aide: 'Une pièce manque ou n’est pas lisible.' },
                { code: 'REJECTED' as const, label: 'Refuser', aide: 'Le dossier ne peut pas être accepté.' },
              ]
            ).map((d) => (
              <button
                key={d.code}
                type="button"
                aria-pressed={decision === d.code}
                onClick={() => setDecision(d.code)}
                className={['ul-choix__item', 'saris-focus-ring', decision === d.code ? 'is-active' : ''].filter(Boolean).join(' ')}
              >
                <span>
                  <span className="t-label-md" style={{ display: 'block' }}>
                    {d.label}
                  </span>
                  <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
                    {d.aide}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Le motif est exigé pour TOUTE décision, acceptation comprise : c'est ce texte que lira
              le professionnel, et la seule trace en cas de contestation. */}
          <Field
            label="Motif de la décision"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={2000}
            hint="Ce texte est transmis au demandeur."
            placeholder={
              decision === 'NEEDS_INFO' ? 'Le diplôme est illisible, merci de redéposer une photo nette.' : 'Pièces conformes.'
            }
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

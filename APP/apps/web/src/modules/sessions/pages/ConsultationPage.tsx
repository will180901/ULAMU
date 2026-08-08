/**
 * Consultation en cours — M06, CU-06-02 à CU-06-05. Le pendant de `SessionScreen` côté patient.
 *
 * Quatre états pilotés par le SERVEUR, jamais déduits d'une horloge locale (RM-06-02) :
 *  • **PREPARING** — le patient renseigne sa pré-consultation ; le chronomètre n'a pas démarré.
 *  • **ACTIVE** — messagerie, décompte, prolongation possible.
 *  • **ENDED** — le compte-rendu devient exigible (D-021).
 *  • **REFUNDED / CANCELLED** — écran terminal.
 *
 * Deux choses que cette page refuse de faire, et c'est délibéré :
 *
 *  1. **Elle ne prétend jamais connaître le temps restant.** `remainingSeconds` vient du serveur et
 *     est resynchronisé à chaque interrogation ; l'horloge locale n'anime qu'entre deux réponses.
 *     Un soignant qui verrait 2 min de plus que la réalité facturerait un temps qu'il n'a pas.
 *  2. **Elle ne laisse pas partir sans compte-rendu.** D-021 le rend obligatoire : c'est ce document
 *     qui est versé au Carnet à vie du patient. Un écran qui l'oublierait produirait des
 *     consultations payées dont il ne reste aucune trace médicale.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, FileText, Plus, Send, Stethoscope } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type CareSession, type SessionMessage } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { BlocOrdonnance } from '../components/BlocOrdonnance'

const CADENCE_MS = 3000
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

export function ConsultationPage() {
  const { id = '' } = useParams()
  const moi = useSessionStore((s) => s.me?.accountId)
  const [session, setSession] = useState<CareSession | null>(null)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const rafraichir = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([api.session(id), api.sessionMessages(id)])
      setSession(s)
      setMessages(m.items)
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [id])

  useEffect(() => {
    rafraichir()
  }, [rafraichir])

  // Interrogation suspendue hors premier plan — même règle que les demandes, et même raison :
  // solliciter le serveur toutes les 3 s pour une page que personne ne regarde n'apporte rien.
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null
    const demarrer = () => {
      if (t === null && document.visibilityState === 'visible') t = setInterval(rafraichir, CADENCE_MS)
    }
    const arreter = () => {
      if (t !== null) {
        clearInterval(t)
        t = null
      }
    }
    const surVisibilite = () => (document.visibilityState === 'visible' ? demarrer() : arreter())
    demarrer()
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      arreter()
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [rafraichir])

  if (etat === 'chargement') return <LoadingState label="Ouverture de la consultation…" onRetry={rafraichir} />
  if (etat === 'erreur' || !session) return <ErrorState onRetry={rafraichir} />

  return (
    <div>
      <PageHeader
        icon={<Stethoscope size={20} />}
        title="Consultation"
        subtitle={
          session.status === 'PREPARING'
            ? 'Le patient renseigne son motif — le chronomètre n’a pas encore démarré.'
            : session.status === 'ACTIVE'
              ? 'Consultation en cours.'
              : 'Consultation terminée.'
        }
      />

      <EnTeteSession session={session} onProlonge={rafraichir} />

      {session.preConsultation ? <BlocPreConsultation session={session} /> : null}

      {session.status === 'ACTIVE' || session.status === 'ENDED' ? (
        <Fil session={session} messages={messages} moi={moi} onEnvoye={rafraichir} />
      ) : null}

      {/* RM-09-01 : on ne prescrit que depuis une session ACTIVE. Le bloc disparaît donc avec elle,
          plutôt que d'afficher un formulaire dont l'envoi serait refusé. */}
      {session.status === 'ACTIVE' ? <BlocOrdonnance sessionId={session.id} onDeposee={rafraichir} /> : null}

      {session.status === 'ENDED' ? <BlocCompteRendu session={session} onDepose={rafraichir} /> : null}
    </div>
  )
}

/* ── Bandeau d'état : décompte serveur, retard, prolongation ──────────────────────────────────── */

function EnTeteSession({ session, onProlonge }: { session: CareSession; onProlonge: () => void }) {
  const [restant, setRestant] = useState(session.remainingSeconds)
  const [occupe, setOccupe] = useState(false)
  const statut = session.status

  // Resynchronisation à chaque réponse : le serveur fait foi.
  useEffect(() => {
    setRestant(session.remainingSeconds)
  }, [session.remainingSeconds])

  // Dépend du seul STATUT — dépendre de l'objet entier relancerait l'intervalle toutes les 3 s.
  useEffect(() => {
    if (statut !== 'ACTIVE') return
    const t = setInterval(() => setRestant((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [statut])

  const prolonger = async () => {
    setOccupe(true)
    try {
      await api.extendSession(session.id, 5)
      onProlonge()
    } catch {
      /* le message d'erreur remonte au prochain rafraîchissement */
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="etat-titre">
      <div className="ul-card__head">
        <h2 id="etat-titre" className="t-display-sm" style={{ margin: 0 }}>
          <Clock size={16} aria-hidden="true" /> {statut === 'ACTIVE' ? 'Temps restant' : 'État'}
        </h2>
        {statut === 'ACTIVE' ? (
          <StatusPill tone={restant <= 120 ? 'error' : 'success'}>{mmss(restant)}</StatusPill>
        ) : (
          <StatusPill tone={statut === 'ENDED' ? 'neutral' : 'info'}>
            {statut === 'PREPARING' ? 'En préparation' : statut === 'ENDED' ? 'Terminée' : statut}
          </StatusPill>
        )}
      </div>

      <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
        Durée réglée : {session.durationMin} min
        {session.extensionTotalSec > 0 ? ` · prolongée de ${Math.round(session.extensionTotalSec / 60)} min` : ''}
      </p>

      {/* D-032 : le retard cumulé du soignant est mesuré par le serveur. L'afficher n'est pas une
          punition — c'est ce qui permet de le corriger avant qu'il ne pèse sur la réputation. */}
      {session.professionalDelaySec > 60 ? (
        <div className="ul-notice ul-notice--warning" role="status">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Temps de réponse cumulé : {Math.round(session.professionalDelaySec / 60)} min. Le patient attend
            entre vos messages — c’est ce délai qui pèse le plus sur la qualité perçue d’une consultation.
          </p>
        </div>
      ) : null}

      {statut === 'ACTIVE' ? (
        <div>
          <Button variant="ghost" onClick={prolonger} loading={occupe} disabled={occupe}>
            <Plus size={15} /> Prolonger de 5 minutes
          </Button>
        </div>
      ) : null}
    </section>
  )
}

/* ── Pré-consultation renseignée par le patient ───────────────────────────────────────────────── */

function BlocPreConsultation({ session }: { session: CareSession }) {
  const p = session.preConsultation!
  return (
    <section className="ul-card" aria-labelledby="pre-titre">
      <div className="ul-card__head">
        <h2 id="pre-titre" className="t-display-sm" style={{ margin: 0 }}>
          Motif renseigné par le patient
        </h2>
      </div>
      <p className="t-text-md" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {p.symptoms}
      </p>
      {p.sinceWhen ? (
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Depuis : {p.sinceWhen}
        </p>
      ) : null}
    </section>
  )
}

/* ── Fil de messages ──────────────────────────────────────────────────────────────────────────── */

function Fil({
  session,
  messages,
  moi,
  onEnvoye,
}: {
  session: CareSession
  messages: SessionMessage[]
  moi?: string
  onEnvoye: () => void
}) {
  const [texte, setTexte] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)
  const dernierSignal = useRef(0)

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  const envoyer = async () => {
    const corps = texte.trim()
    if (!corps) return
    setErreur(null)
    setOccupe(true)
    try {
      // Clé d'idempotence (ADR-12) : si le réseau rejoue la requête, le serveur ne crée qu'un message.
      await api.sendMessage(session.id, { clientMsgId: crypto.randomUUID(), kind: 'TEXT', body: corps })
      setTexte('')
      onEnvoye()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Envoi impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  /** Signale la frappe au plus une fois toutes les 3 s : le signal serveur vit ~6 s, inutile de le
   *  renvoyer à chaque touche. */
  const signalerFrappe = () => {
    const t = Date.now()
    if (t - dernierSignal.current < 3000) return
    dernierSignal.current = t
    api.typing(session.id).catch(() => undefined)
  }

  return (
    <section className="ul-card" aria-labelledby="fil-titre">
      <div className="ul-card__head">
        <h2 id="fil-titre" className="t-display-sm" style={{ margin: 0 }}>
          Échanges
        </h2>
        {session.otherPartyTyping ? <StatusPill tone="info">Le patient écrit…</StatusPill> : null}
      </div>

      <div className="ul-fil" role="log" aria-label="Fil de la consultation">
        {messages.length === 0 ? (
          <p className="t-text-sm" style={{ color: 'var(--texte-tertiaire)', textAlign: 'center', margin: 0 }}>
            Aucun message. C’est à vous d’ouvrir l’échange — le patient a déjà payé et attend.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={['ul-bulle', m.senderId === moi ? 'ul-bulle--moi' : ''].filter(Boolean).join(' ')}>
              {m.deletedAt ? (
                <span className="t-text-sm" style={{ fontStyle: 'italic', color: 'var(--texte-tertiaire)' }}>
                  Message supprimé
                </span>
              ) : (
                <span className="t-text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {m.body}
                </span>
              )}
              <span className="ul-bulle__heure">{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))
        )}
        <div ref={finRef} />
      </div>

      {session.status === 'ACTIVE' ? (
        <div style={{ display: 'flex', gap: 'var(--espace-2)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field
              label="Votre message"
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value)
                signalerFrappe()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  envoyer()
                }
              }}
              maxLength={8000}
            />
          </div>
          <Button onClick={envoyer} loading={occupe} disabled={occupe || texte.trim().length === 0}>
            <Send size={15} /> Envoyer
          </Button>
        </div>
      ) : (
        <p className="t-text-sm" style={{ color: 'var(--texte-tertiaire)', margin: 0 }}>
          La consultation est terminée : le fil reste consultable, mais plus aucun message ne peut être envoyé.
        </p>
      )}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

/* ── Compte-rendu — OBLIGATOIRE (D-021) ───────────────────────────────────────────────────────── */

function BlocCompteRendu({ session, onDepose }: { session: CareSession; onDepose: () => void }) {
  const [diagnosis, setDiagnosis] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const deposer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.depositReport(session.id, { diagnosis: diagnosis.trim(), recommendations: recommendations.trim() })
      onDepose()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Dépôt impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  if (session.reportDepositedAt) {
    return (
      <section className="ul-card" aria-labelledby="cr-titre">
        <div className="ul-card__head">
          <h2 id="cr-titre" className="t-display-sm" style={{ margin: 0 }}>
            Compte-rendu
          </h2>
          <StatusPill tone="success">Déposé</StatusPill>
        </div>
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Versé au Carnet de santé du patient le {new Date(session.reportDepositedAt).toLocaleString('fr-FR')}. Il y
          restera à vie et ne peut plus être modifié.
        </p>
      </section>
    )
  }

  return (
    <section className="ul-card" aria-labelledby="cr-titre">
      <div className="ul-card__head">
        <h2 id="cr-titre" className="t-display-sm" style={{ margin: 0 }}>
          <FileText size={16} aria-hidden="true" /> Compte-rendu
        </h2>
        <StatusPill tone="warning">Obligatoire</StatusPill>
      </div>

      {/* D-021 : sans compte-rendu, une consultation payée ne laisse AUCUNE trace médicale. Le dire
          avant les champs, pas après un message d'erreur. */}
      <div className="ul-notice ul-notice--warning" role="note">
        <p className="t-text-sm" style={{ margin: 0 }}>
          Ce document est versé au Carnet de santé du patient, où il restera à vie. Sans lui, la consultation
          qu’il a payée ne laisse aucune trace médicale exploitable par un autre soignant.
        </p>
      </div>

      <div className="ul-field">
        <label className="ul-field__label" htmlFor="diag">
          Diagnostic
        </label>
        <textarea
          id="diag"
          className="ul-field__input"
          rows={4}
          maxLength={8000}
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="ul-field">
        <label className="ul-field__label" htmlFor="reco">
          Recommandations
        </label>
        <textarea
          id="reco"
          className="ul-field__input"
          rows={4}
          maxLength={8000}
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div>
        <Button
          onClick={deposer}
          loading={occupe}
          disabled={occupe || diagnosis.trim().length === 0 || recommendations.trim().length === 0}
        >
          Déposer le compte-rendu
        </Button>
      </div>

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

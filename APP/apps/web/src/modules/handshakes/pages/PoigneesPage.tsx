/**
 * Poignées de main reçues — M06, CU-06-01. ⭐ Le cœur du produit.
 *
 * C'est la contrepartie exacte de `HandshakeScreen` côté patient : le patient sollicite depuis le
 * mobile, le soignant répond ici. Sans cette page, une poignée de main initiée depuis l'application
 * patiente n'avait **aucun destinataire** — elle expirait toujours, et le parcours complet
 * (consultation, paiement, ordonnance) restait inatteignable malgré un backend complet et testé.
 *
 * Trois leçons de l'audit de navigation mobile du 05/08 sont appliquées ici, parce qu'elles
 * décrivent exactement les mêmes pièges :
 *
 *  • **Interrogation liée au FOCUS, pas au montage.** Côté mobile, `Handshake` interrogeait le
 *    serveur depuis un effet de montage et continuait à tourner sous l'écran de paiement, produisant
 *    deux `Session` empilées. Ici, on suspend dès que l'onglet passe en arrière-plan.
 *  • **Le décompte ne dépend que du STATUT.** Dépendre de l'objet entier relançait l'intervalle à
 *    chaque interrogation, et le compte à rebours sautait des secondes.
 *  • **Le serveur fait foi** (RM-06-02). L'horloge locale n'existe que pour animer entre deux
 *    réponses ; chaque interrogation la resynchronise.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Handshake as HandshakeIcon, X } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type Handshake } from '@/lib/api'

/** Cadence d'interrogation — alignée sur celle de l'app patiente, pour que les deux écrans réagissent
 *  au même rythme et qu'aucun des deux ne paraisse en retard sur l'autre. */
const CADENCE_MS = 2500

/** Une poignée que le soignant doit trancher MAINTENANT. */
const EN_ATTENTE: Handshake['status'][] = ['INITIATED']
/** Confirmée : la balle est dans le camp du patient (fenêtre de paiement PM-07). */
const EN_COURS: Handshake['status'][] = ['CONFIRMED']

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

export function PoigneesPage() {
  const naviguer = useNavigate()
  const [liste, setListe] = useState<Handshake[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const interroger = useCallback(async () => {
    try {
      setListe(await api.myHandshakes())
      setEtat('pret')
    } catch {
      // Une interrogation ratée ne doit pas effacer ce qui est déjà à l'écran : on ne bascule en
      // erreur que si l'on n'a jamais rien reçu. Un réseau qui hoquette ne doit pas vider la page.
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    interroger()
  }, [interroger])

  // Interrogation SUSPENDUE quand l'onglet n'est pas au premier plan : inutile de solliciter le
  // serveur toutes les 2,5 s pour une page que personne ne regarde.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const demarrer = () => {
      if (id === null && document.visibilityState === 'visible') {
        interroger()
        id = setInterval(interroger, CADENCE_MS)
      }
    }
    const arreter = () => {
      if (id !== null) {
        clearInterval(id)
        id = null
      }
    }
    const surVisibilite = () => (document.visibilityState === 'visible' ? demarrer() : arreter())

    demarrer()
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      arreter()
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [interroger])

  const aTrancher = useMemo(() => (liste ?? []).filter((h) => EN_ATTENTE.includes(h.status)), [liste])
  const confirmees = useMemo(() => (liste ?? []).filter((h) => EN_COURS.includes(h.status)), [liste])

  if (etat === 'chargement') return <LoadingState label="Chargement de vos demandes…" onRetry={interroger} />
  if (etat === 'erreur') return <ErrorState onRetry={interroger} />

  return (
    <div>
      <PageHeader
        icon={<HandshakeIcon size={20} />}
        title="Demandes de consultation"
        subtitle="Un patient vous sollicite : confirmez que vous êtes prêt à le recevoir, ou refusez en expliquant pourquoi."
      />

      <section className="ul-card" aria-labelledby="attente-titre">
        <div className="ul-card__head">
          <h2 id="attente-titre" className="t-display-sm" style={{ margin: 0 }}>
            À traiter
          </h2>
          {aTrancher.length > 0 ? <StatusPill tone="warning">{aTrancher.length}</StatusPill> : null}
        </div>

        {aTrancher.length === 0 ? (
          <EmptyState
            icon={<HandshakeIcon size={22} />}
            title="Aucune demande en attente"
            description="Les demandes apparaissent ici dès qu’un patient vous sollicite, sans avoir à rafraîchir la page. Vous devez être « en ligne » sur votre vitrine pour en recevoir."
            /* Navigation côté client : `window.location` rechargerait toute l'application et ferait
               repasser par l'hydratation de session pour un simple changement de page. */
            action={
              <Button variant="ghost" onClick={() => naviguer('/vitrine')}>
                Voir ma vitrine
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {aTrancher.map((h) => (
              <LignePoignee key={h.id} poignee={h} onFait={interroger} />
            ))}
          </ul>
        )}
      </section>

      {confirmees.length > 0 ? (
        <section className="ul-card" aria-labelledby="confirmees-titre">
          <div className="ul-card__head">
            <h2 id="confirmees-titre" className="t-display-sm" style={{ margin: 0 }}>
              En attente de paiement
            </h2>
          </div>
          <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
            Vous avez confirmé. Le patient dispose d’un délai pour régler ; la consultation s’ouvrira
            automatiquement dès le paiement reçu.
          </p>
          <ul className="ul-doclist">
            {confirmees.map((h) => (
              <li className="ul-docrow" key={h.id}>
                <span className="ul-docrow__label">
                  Patient sollicitant
                  <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                    Confirmée à {new Date(h.confirmedAt ?? h.initiatedAt).toLocaleTimeString('fr-FR')}
                  </span>
                </span>
                <Decompte poignee={h} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/* ── Une demande à trancher ───────────────────────────────────────────────────────────────────── */

function LignePoignee({ poignee, onFait }: { poignee: Handshake; onFait: () => void }) {
  const [refusOuvert, setRefusOuvert] = useState(false)
  const [motif, setMotif] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const confirmer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.confirmHandshake(poignee.id)
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Confirmation impossible — réessayez.')
      setOccupe(false)
    }
  }

  const refuser = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.refuseHandshake(poignee.id, motif.trim())
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Refus impossible — réessayez.')
      setOccupe(false)
    }
  }

  return (
    <li className="ul-docrow ul-docrow--bloc">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
        <span className="ul-docrow__label">
          Nouvelle demande
          <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
            Reçue à {new Date(poignee.initiatedAt).toLocaleTimeString('fr-FR')}
          </span>
        </span>
        <Decompte poignee={poignee} />
      </div>

      {!refusOuvert ? (
        <div style={{ display: 'flex', gap: 'var(--espace-2)', width: '100%' }}>
          <Button onClick={confirmer} loading={occupe} disabled={occupe}>
            <Check size={15} /> Je suis prêt à recevoir
          </Button>
          <Button variant="ghost" onClick={() => setRefusOuvert(true)} disabled={occupe}>
            <X size={15} /> Refuser
          </Button>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--espace-2)' }}>
          {/* Le motif est exigé par le serveur, et c'est justifié : un refus sec laisse le patient
              sans savoir s'il doit attendre, reformuler, ou chercher un autre soignant. */}
          <Field
            label="Motif du refus"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={200}
            placeholder="Occupé jusqu’à 16 h, hors de mon domaine…"
            hint="Le patient le lira. Une phrase courte suffit."
            autoFocus
          />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button variant="danger" onClick={refuser} loading={occupe} disabled={occupe || motif.trim().length === 0}>
              Envoyer le refus
            </Button>
            <Button variant="ghost" onClick={() => setRefusOuvert(false)} disabled={occupe}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </li>
  )
}

/* ── Compte à rebours PM-07 ───────────────────────────────────────────────────────────────────── */

function Decompte({ poignee }: { poignee: Handshake }) {
  const [restant, setRestant] = useState(poignee.windowRemainingSeconds)
  const statut = poignee.status

  // Resynchronisation à chaque réponse du serveur : c'est LUI qui fait foi (RM-06-02), l'horloge
  // locale ne sert qu'à animer entre deux interrogations.
  const dernierServeur = useRef(poignee.windowRemainingSeconds)
  if (dernierServeur.current !== poignee.windowRemainingSeconds) {
    dernierServeur.current = poignee.windowRemainingSeconds
  }
  useEffect(() => {
    setRestant(poignee.windowRemainingSeconds)
  }, [poignee.windowRemainingSeconds])

  // Dépend du seul STATUT : dépendre de l'objet entier relancerait l'intervalle à chaque
  // interrogation, soit toutes les 2,5 s, et le décompte sauterait des secondes.
  useEffect(() => {
    if (statut !== 'INITIATED' && statut !== 'CONFIRMED') return
    const id = setInterval(() => setRestant((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [statut])

  const urgent = restant <= 60
  return (
    <StatusPill tone={urgent ? 'error' : 'neutral'}>
      {restant > 0 ? `Expire dans ${mmss(restant)}` : 'Expirée'}
    </StatusPill>
  )
}

/**
 * Ma vitrine — M05, CU-05-01 (profil public), CU-05-03 (offres), CU-05-04 (présence).
 *
 * C'est tout ce qu'un patient voit d'un soignant avant de l'engager. Sans cette page, un
 * professionnel vérifié restait introuvable dans l'annuaire : pas d'offre publiée, donc rien à
 * réserver, et une présence bloquée à « hors ligne » faute de pouvoir la déclarer.
 *
 * ⚠️ Le prix saisi est le prix FINAL payé par le patient, commission ULAMU incluse (D-010 /
 * RM-05-03). C'est contre-intuitif — beaucoup de plateformes demandent le net perçu — donc l'écran
 * le dit explicitement, plutôt que de laisser un soignant découvrir l'écart sur son premier virement.
 */
import { useCallback, useEffect, useState } from 'react'
import { CircleDot, Moon, Plus, Power, Store } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type Offer, type Presence, type PresenceState } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

/**
 * Battement de cœur. PM-26 fait retomber une présence « rassie » à hors ligne au bout de 15 minutes ;
 * on signale donc bien plus souvent que ce seuil, sans pour autant bavarder. Volontairement maintenu
 * quand l'onglet passe en arrière-plan : un soignant qui attend des patients laisse la fenêtre
 * ouverte derrière son travail — s'arrêter là le rendrait invisible au pire moment.
 */
const BATTEMENT_MS = 4 * 60 * 1000

const ETATS: { code: PresenceState; label: string; aide: string }[] = [
  { code: 'ONLINE', label: 'En ligne', aide: 'Les patients peuvent vous solliciter.' },
  { code: 'DO_NOT_DISTURB', label: 'Ne pas déranger', aide: 'Visible, mais aucune sollicitation.' },
  { code: 'OFFLINE', label: 'Hors ligne', aide: 'Invisible des patients.' },
]

export function VitrinePage() {
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)

  const [presence, setPresence] = useState<Presence | null>(null)
  const [offres, setOffres] = useState<Offer[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setEtat('chargement')
    try {
      const [p, o] = await Promise.all([api.myPresence(), api.myOffers()])
      setPresence(p)
      setOffres(o)
      setEtat('pret')
    } catch {
      setEtat('erreur')
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  // Le battement ne tourne QUE si l'on est réellement joignable : signaler une présence en étant
  // « hors ligne » serait un mensonge coûteux — un patient engagerait une poignée de main que
  // personne ne confirmerait.
  useEffect(() => {
    if (presence?.state !== 'ONLINE') return
    const id = setInterval(() => {
      api.presenceHeartbeat().then(setPresence).catch(() => undefined)
    }, BATTEMENT_MS)
    return () => clearInterval(id)
  }, [presence?.state])

  const changerEtat = async (state: PresenceState) => {
    setErreur(null)
    try {
      setPresence(await api.setPresence(state))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Changement impossible — réessayez.')
    }
  }

  if (etat === 'chargement') return <LoadingState label="Chargement de votre vitrine…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />

  return (
    <div>
      <PageHeader
        icon={<Store size={20} />}
        title="Ma vitrine"
        subtitle="Ce que les patients voient de vous : votre présence, votre profil et vos offres de soin."
      />

      {/* ── Présence — CU-05-04 ─────────────────────────────────────────────────────────────── */}
      <section className="ul-card" aria-labelledby="presence-titre">
        <div className="ul-card__head">
          <h2 id="presence-titre" className="t-display-sm" style={{ margin: 0 }}>
            Ma présence
          </h2>
          {presence?.availableForInitiation ? (
            <StatusPill tone="success">Joignable</StatusPill>
          ) : (
            <StatusPill tone="neutral">Non joignable</StatusPill>
          )}
        </div>

        <div className="ul-choix">
          {ETATS.map((e) => (
            <button
              key={e.code}
              type="button"
              onClick={() => changerEtat(e.code)}
              aria-pressed={presence?.state === e.code}
              className={['ul-choix__item', 'saris-focus-ring', presence?.state === e.code ? 'is-active' : ''].filter(Boolean).join(' ')}
            >
              {e.code === 'ONLINE' ? <CircleDot size={16} /> : e.code === 'DO_NOT_DISTURB' ? <Moon size={16} /> : <Power size={16} />}
              <span>
                <span className="t-label-md" style={{ display: 'block' }}>
                  {e.label}
                </span>
                <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
                  {e.aide}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Le serveur fait retomber une présence sans signe de vie : le dire évite qu'un soignant
            croie rester joignable en ayant fermé l'onglet la veille. */}
        <p className="t-caption" style={{ color: 'var(--texte-tertiaire)', margin: 0 }}>
          Votre présence est maintenue tant que cette page reste ouverte. Fermée, elle retombe
          automatiquement hors ligne après quelques minutes.
        </p>
      </section>

      <SectionProfil me={me} setMe={setMe} />
      <SectionOffres offres={offres ?? []} recharger={charger} />

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)' }}>
          {erreur}
        </p>
      ) : null}
    </div>
  )
}

/* ── Profil public — CU-05-01 ─────────────────────────────────────────────────────────────────── */

function SectionProfil({ me, setMe }: { me: ReturnType<typeof useSessionStore.getState>['me']; setMe: (m: never) => void }) {
  const [specialty, setSpecialty] = useState(me?.specialty ?? '')
  const [biography, setBiography] = useState(me?.biography ?? '')
  const [district, setDistrict] = useState(me?.district ?? '')
  const [occupe, setOccupe] = useState(false)
  const [fait, setFait] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const modifie =
    specialty !== (me?.specialty ?? '') || biography !== (me?.biography ?? '') || district !== (me?.district ?? '')

  const enregistrer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      const maj = await api.updateMyProfessionalProfile({ specialty, biography, district })
      setMe(maj as never)
      setFait(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Enregistrement impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="profil-titre">
      <div className="ul-card__head">
        <h2 id="profil-titre" className="t-display-sm" style={{ margin: 0 }}>
          Profil public
        </h2>
      </div>

      <Field label="Spécialité" value={specialty} onChange={(e) => setSpecialty(e.target.value)} maxLength={120} />
      <Field label="Arrondissement" value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={80} />

      <div className="ul-field">
        <label className="ul-field__label" htmlFor="bio">
          Biographie
        </label>
        <textarea
          id="bio"
          className="ul-field__input"
          rows={5}
          maxLength={2000}
          value={biography}
          onChange={(e) => setBiography(e.target.value)}
          style={{ resize: 'vertical' }}
        />
        {/* Le compteur n'apparaît qu'en approchant la limite : afficher « 0 / 2000 » sur un champ vide
            met la contrainte en avant avant même qu'on ait commencé à écrire. */}
        {biography.length > 1700 ? (
          <span className="ul-field__msg">{biography.length} / 2000 caractères</span>
        ) : null}
      </div>

      {fait && !modifie ? (
        <div className="ul-notice" role="status">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Profil enregistré. Il est visible immédiatement dans l’annuaire.
          </p>
        </div>
      ) : null}

      <div>
        <Button onClick={enregistrer} loading={occupe} disabled={occupe || !modifie}>
          Enregistrer
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

/* ── Offres de soin — CU-05-03 ────────────────────────────────────────────────────────────────── */

function SectionOffres({ offres, recharger }: { offres: Offer[]; recharger: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [label, setLabel] = useState('')
  const [duree, setDuree] = useState('30')
  const [prix, setPrix] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const creer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.createOffer({ label: label.trim(), durationMin: Number(duree), priceXaf: Number(prix) })
      setLabel('')
      setPrix('')
      setOuvert(false)
      recharger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Création impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const basculer = async (o: Offer) => {
    setErreur(null)
    try {
      if (o.active) await api.deactivateOffer(o.id)
      else await api.updateOffer(o.id, { active: true })
      recharger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Modification impossible — réessayez.')
    }
  }

  return (
    <section className="ul-card" aria-labelledby="offres-titre">
      <div className="ul-card__head">
        <h2 id="offres-titre" className="t-display-sm" style={{ margin: 0 }}>
          Mes offres de soin
        </h2>
        {!ouvert ? (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)}>
            <Plus size={15} /> Nouvelle offre
          </Button>
        ) : null}
      </div>

      {offres.length === 0 && !ouvert ? (
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Aucune offre publiée. Tant qu’il n’y en a pas, les patients ne peuvent pas vous solliciter.
        </p>
      ) : null}

      {ouvert ? (
        <>
          <Field label="Intitulé" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="Consultation générale" />
          <Field label="Durée (minutes)" value={duree} onChange={(e) => setDuree(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          <Field
            label="Prix payé par le patient (XAF)"
            value={prix}
            onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            /* D-010 : le prix affiché au patient est le prix FINAL. Le dire ici évite qu'un soignant
               saisisse son net attendu et découvre l'écart sur son premier virement. */
            hint="Prix final, commission ULAMU incluse — c’est le montant que verra le patient."
          />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={creer} loading={occupe} disabled={occupe || label.trim().length === 0 || !prix || !duree}>
              Publier l’offre
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>
        </>
      ) : null}

      {offres.length > 0 ? (
        <ul className="ul-doclist">
          {offres.map((o) => (
            <li className="ul-docrow" key={o.id}>
              <span className="ul-docrow__label">
                {o.label}
                <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                  {o.durationMin} min · {o.priceXaf.toLocaleString('fr-FR')} XAF
                  {o.kind === 'FOLLOW_UP' ? ' · suivi' : ''}
                </span>
              </span>
              <StatusPill tone={o.active ? 'success' : 'neutral'}>{o.active ? 'Publiée' : 'Retirée'}</StatusPill>
              {/* « Retirer » et non « Supprimer » : le serveur DÉSACTIVE, il ne détruit pas — les
                  sessions déjà vendues sur cette offre doivent rester lisibles. */}
              <Button variant="ghost" size="sm" onClick={() => basculer(o)}>
                {o.active ? 'Retirer' : 'Republier'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

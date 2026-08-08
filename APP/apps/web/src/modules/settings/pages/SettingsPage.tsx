/**
 * Mes paramètres — sécurité du compte. M01, CU-01-05/06/07.
 *
 * Trois fonctions que le web n'avait pas alors que le mobile les a toutes les trois : la liste des
 * appareils connectés avec déconnexion à distance (`EF-01-05`), le changement de numéro (`EF-01-07`)
 * et la clôture de compte (`EF-01-09`). Un professionnel dont le poste d'officine avait été utilisé
 * par quelqu'un d'autre n'avait, jusqu'ici, aucun moyen de couper cette session depuis le web.
 *
 * Cette page répare aussi un lien mort : le menu utilisateur pointait déjà vers `/parametres`.
 *
 * Aucune boîte de dialogue de confirmation ici, et c'est délibéré :
 *  • révoquer un appareil est réversible (il suffit de se reconnecter) — une confirmation en deux
 *    temps suffit, et évite d'empiler une modale sur une action bénigne ;
 *  • clôturer un compte est irréversible, mais `CU-01-07` définit déjà sa confirmation : **mot de
 *    passe + code OTP**. Ajouter un « êtes-vous sûr ? » par-dessus deux secrets serait du théâtre.
 */
import { useCallback, useEffect, useState } from 'react'
import { Laptop, LogOut, Phone, Smartphone, Trash2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type SessionInfo } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        icon={<Laptop size={20} />}
        title="Mes paramètres"
        subtitle="Sécurité de votre compte — appareils connectés, numéro de téléphone et clôture."
      />
      <SectionAppareils />
      <SectionNumero />
      <SectionCloture />
    </div>
  )
}

/* ── EF-01-05 / CU-01-06 — appareils connectés ────────────────────────────────────────────────── */

function SectionAppareils() {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setEtat('chargement')
    try {
      setSessions(await api.sessions())
      setEtat('pret')
    } catch {
      setEtat('erreur')
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const revoquer = async (id: string) => {
    setErreur(null)
    try {
      await api.revokeSession(id)
      setAConfirmer(null)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Déconnexion impossible — réessayez.')
    }
  }

  return (
    <section className="ul-card" aria-labelledby="appareils-titre">
      <div className="ul-card__head">
        <h2 id="appareils-titre" className="t-display-sm" style={{ margin: 0 }}>
          Appareils connectés
        </h2>
      </div>
      <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
        Chaque connexion ouvre une session. Si vous ne reconnaissez pas un appareil, déconnectez-le : l’effet
        est immédiat.
      </p>

      {etat === 'chargement' ? <LoadingState label="Chargement de vos sessions…" onRetry={charger} /> : null}
      {etat === 'erreur' ? <ErrorState onRetry={charger} /> : null}

      {etat === 'pret' && sessions ? (
        <ul className="ul-doclist">
          {sessions.map((s) => (
            <li className="ul-docrow" key={s.id}>
              <span className="ul-docrow__icon">{s.client === 'web' ? <Laptop size={16} /> : <Smartphone size={16} />}</span>
              <span className="ul-docrow__label">
                {s.deviceLabel ?? (s.client === 'web' ? 'Navigateur' : 'Application mobile')}
                <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                  Dernière activité {new Date(s.lastActiveAt).toLocaleString('fr-FR')}
                </span>
              </span>

              {/* CU-01-06 : la session courante n'a pas de bouton — on ne se déconnecte pas soi-même
                  par mégarde depuis une liste. Pour cela, il y a « Se déconnecter » dans le menu. */}
              {s.current ? (
                <StatusPill tone="accent">Cet appareil</StatusPill>
              ) : aConfirmer === s.id ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setAConfirmer(null)}>
                    Annuler
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => revoquer(s.id)}>
                    Confirmer
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAConfirmer(s.id)}>
                  <LogOut size={14} /> Déconnecter
                </Button>
              )}
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

/* ── EF-01-07 / CU-01-05 — changement de numéro ───────────────────────────────────────────────── */

function SectionNumero() {
  const setMe = useSessionStore((s) => s.setMe)
  const [etape, setEtape] = useState<'repos' | 'numero' | 'codes'>('repos')
  const [nouveau, setNouveau] = useState('')
  const [codeAncien, setCodeAncien] = useState('')
  const [codeNouveau, setCodeNouveau] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  const demarrer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.startPhoneChange({ newPhone: nouveau })
      setEtape('codes')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Envoi impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const confirmer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      setMe(await api.confirmPhoneChange({ newPhone: nouveau, oldPhoneCode: codeAncien, newPhoneCode: codeNouveau }))
      setFait(true)
      setEtape('repos')
      setNouveau('')
      setCodeAncien('')
      setCodeNouveau('')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Confirmation impossible — vérifiez les codes.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="numero-titre">
      <div className="ul-card__head">
        <h2 id="numero-titre" className="t-display-sm" style={{ margin: 0 }}>
          Numéro de téléphone
        </h2>
      </div>
      <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
        Votre numéro est l’identifiant racine de votre compte. Le changer exige donc un code sur l’ancien
        <strong> et</strong> sur le nouveau : c’est la parade contre le vol de numéro (EF-01-07).
      </p>

      {fait ? (
        <div className="ul-notice" role="status">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Numéro modifié. Les deux numéros en ont été informés.
          </p>
        </div>
      ) : null}

      {etape === 'repos' ? (
        <Button variant="ghost" onClick={() => setEtape('numero')}>
          <Phone size={16} /> Changer de numéro
        </Button>
      ) : null}

      {etape === 'numero' ? (
        <>
          <Field label="Nouveau numéro" value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="+242…" />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={demarrer} loading={occupe} disabled={occupe || nouveau.trim().length < 9}>
              Recevoir les codes
            </Button>
            <Button variant="ghost" onClick={() => setEtape('repos')}>
              Annuler
            </Button>
          </div>
        </>
      ) : null}

      {etape === 'codes' ? (
        <>
          <Field label="Code reçu sur l’ANCIEN numéro" value={codeAncien} onChange={(e) => setCodeAncien(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <Field label="Code reçu sur le NOUVEAU numéro" value={codeNouveau} onChange={(e) => setCodeNouveau(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={confirmer} loading={occupe} disabled={occupe || codeAncien.length < 6 || codeNouveau.length < 6}>
              Valider le changement
            </Button>
            {/* Recul d'ÉTAPE, pas sortie : on corrige souvent un numéro mal saisi. Même règle que
                l'inscription et « mot de passe oublié » côté mobile. */}
            <Button variant="ghost" onClick={() => setEtape('numero')}>
              Retour
            </Button>
          </div>
        </>
      ) : null}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

/* ── EF-01-09 / CU-01-07 — clôture de compte ──────────────────────────────────────────────────── */

function SectionCloture() {
  const logout = useSessionStore((s) => s.logout)
  const [etape, setEtape] = useState<'repos' | 'confirmation'>('repos')
  const [motDePasse, setMotDePasse] = useState('')
  const [code, setCode] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const demanderCode = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.requestCloseOtp()
      setEtape('confirmation')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Envoi impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const cloturer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.closeAccount({ password: motDePasse, otpCode: code })
      logout('volontaire')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Clôture impossible — vérifiez vos informations.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="cloture-titre">
      <div className="ul-card__head">
        <h2 id="cloture-titre" className="t-display-sm" style={{ margin: 0 }}>
          Clôturer mon compte
        </h2>
      </div>

      <div className="ul-notice ul-notice--warning" role="note">
        <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TriangleAlert size={15} aria-hidden="true" /> Cette action ferme votre compte
        </p>
        <p className="t-text-sm" style={{ margin: 0 }}>
          Vos sessions sont révoquées et vous ne pourrez plus vous connecter. Les données médicales restent
          conservées selon la loi. Une réactivation reste possible pendant 30 jours auprès du support.
        </p>
      </div>

      {etape === 'repos' ? (
        <Button variant="ghost" onClick={demanderCode} loading={occupe}>
          <Trash2 size={16} /> Recevoir le code de confirmation
        </Button>
      ) : (
        <>
          {/* CU-01-07 : la confirmation EST le mot de passe + le code. Pas de « êtes-vous sûr ? »
              par-dessus deux secrets — ce serait du théâtre, pas une garantie. */}
          <Field label="Votre mot de passe" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          <Field label="Code reçu" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button variant="danger" onClick={cloturer} loading={occupe} disabled={occupe || !motDePasse || code.length < 6}>
              Clôturer définitivement
            </Button>
            <Button variant="ghost" onClick={() => setEtape('repos')}>
              Annuler
            </Button>
          </div>
        </>
      )}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

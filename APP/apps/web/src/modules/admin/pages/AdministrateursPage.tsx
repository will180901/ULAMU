/**
 * Administrateurs & sous-rôles — M02, EF-02-08 / CU-02-06. SUPER_ADMIN seul.
 *
 * ⚠️ Tout le mécanisme existait côté serveur — créer un compte d'administration, attribuer un
 * sous-rôle, le révoquer — mais **par identifiant de compte**, sans aucune route pour savoir qui sont
 * les administrateurs. Attribuer un rôle Finance ou Vérification imposait donc, en pratique, de
 * modifier le seed et de rejouer la base entière. C'était le dernier geste d'exploitation qui exigeait
 * un développeur.
 *
 * Deux règles réelles que l'écran doit porter, et pas seulement le serveur :
 *
 *  • **On ne révoque pas son propre rôle** — « continuité d'administration ». Si le dernier Super
 *    Admin se retire ses droits, plus personne ne peut en attribuer : la plateforme devient
 *    inadministrable. Le serveur le refuse ; le bouton doit être inerte AVANT le clic.
 *  • **Révoquer coupe les sessions immédiatement.** Ce n'est pas un réglage différé — la personne
 *    perd l'accès dans la minute. On le dit avant, pas après.
 */
import { useCallback, useEffect, useState } from 'react'
import { KeyRound, ShieldOff, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type PlatformAdmin, type AdminRole } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const ROLES: { code: AdminRole; label: string; aide: string }[] = [
  { code: 'SUPER_ADMIN', label: 'Super administrateur', aide: 'Accès complet, attribue les sous-rôles.' },
  { code: 'ADMIN_VERIFICATION', label: 'Vérification', aide: 'Traite les dossiers des soignants et structures.' },
  { code: 'ADMIN_FINANCE', label: 'Finance', aide: 'Remboursements et réconciliation.' },
  { code: 'ADMIN_MAP', label: 'Carte', aide: 'Données géographiques de l’annuaire.' },
]
const LIBELLE = Object.fromEntries(ROLES.map((r) => [r.code, r.label])) as Record<AdminRole, string>

export function AdministrateursPage() {
  const moi = useSessionStore((s) => s.me)
  const [liste, setListe] = useState<PlatformAdmin[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)

  const charger = useCallback(async () => {
    try {
      setListe(await api.admins())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const attribuer = async (accountId: string, role: AdminRole) => {
    setErreur(null)
    setEnCours(accountId)
    try {
      await api.assignAdminRole(accountId, role)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Attribution impossible — réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  const revoquer = async (accountId: string) => {
    setErreur(null)
    setEnCours(accountId)
    try {
      await api.revokeAdminRole(accountId)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Révocation impossible — réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  if (etat === 'chargement') return <LoadingState label="Chargement des administrateurs…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />

  return (
    <div>
      <PageHeader
        icon={<KeyRound size={20} />}
        title="Administrateurs"
        subtitle="Qui administre quoi. Chaque sous-rôle n’ouvre que son domaine — le Super administrateur les attribue."
      />

      <section className="ul-card" aria-labelledby="admins-titre">
        <div className="ul-card__head">
          <h2 id="admins-titre" className="t-display-sm" style={{ margin: 0 }}>
            Comptes d’administration
          </h2>
          {!creation ? (
            <Button variant="ghost" size="sm" onClick={() => setCreation(true)}>
              <UserPlus size={15} /> Nouveau
            </Button>
          ) : null}
        </div>

        <div className="ul-notice" role="note">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Révoquer un rôle <strong>coupe les sessions de la personne dans la minute</strong>. Ce n’est
            pas un réglage différé.
          </p>
        </div>

        {creation ? <FormulaireCreation onFait={() => { setCreation(false); charger() }} onAnnuler={() => setCreation(false)} /> : null}

        {(liste ?? []).length === 0 ? (
          <EmptyState
            icon={<KeyRound size={22} />}
            title="Aucun compte d’administration"
            description="Seul un Super administrateur peut en créer. Sans lui, personne ne peut vérifier un soignant ni superviser les paiements."
            action={
              <Button variant="ghost" onClick={() => setCreation(true)}>
                <UserPlus size={15} /> Créer le premier
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {(liste ?? []).map((a) => {
              const cestMoi = a.accountId === moi?.accountId
              return (
                <li className="ul-docrow ul-docrow--bloc" key={a.accountId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
                    <span className="ul-docrow__label">
                      {[a.firstName, a.lastName].filter(Boolean).join(' ') || a.username || a.phone}
                      <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                        {a.username ? `@${a.username} · ` : ''}
                        {a.phone}
                      </span>
                    </span>
                    {a.role ? (
                      <StatusPill tone={a.role === 'SUPER_ADMIN' ? 'accent' : 'info'}>{LIBELLE[a.role]}</StatusPill>
                    ) : (
                      /* Un compte ADMIN sans sous-rôle n'accède à RIEN. Le masquer le rendrait
                         introuvable, alors que c'est précisément celui qui attend une décision. */
                      <StatusPill tone="warning">Sans rôle</StatusPill>
                    )}
                  </div>

                  {cestMoi ? (
                    <p className="t-caption" style={{ color: 'var(--alerte-texte)', margin: 0 }}>
                      C’est votre compte. Vous ne pouvez pas vous retirer vos propres droits : si le dernier
                      Super administrateur le faisait, plus personne ne pourrait en attribuer.
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', gap: 'var(--espace-2)', flexWrap: 'wrap' }}>
                    {ROLES.map((r) => (
                      <Button
                        key={r.code}
                        variant="ghost"
                        size="sm"
                        onClick={() => attribuer(a.accountId, r.code)}
                        disabled={enCours !== null || a.role === r.code}
                      >
                        {r.label}
                      </Button>
                    ))}
                    {a.role ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => revoquer(a.accountId)}
                        /* Le serveur refuse l'auto-révocation ; le dire ici évite une erreur rouge
                           qui ressemblerait à une panne. */
                        disabled={cestMoi || enCours !== null}
                      >
                        <ShieldOff size={14} /> Révoquer
                      </Button>
                    ) : null}
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

      <section className="ul-card" aria-labelledby="roles-titre">
        <div className="ul-card__head">
          <h2 id="roles-titre" className="t-display-sm" style={{ margin: 0 }}>
            Ce que chaque rôle ouvre
          </h2>
        </div>
        <ul className="ul-doclist">
          {ROLES.map((r) => (
            <li className="ul-docrow" key={r.code}>
              <span className="ul-docrow__label">
                {r.label}
                <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                  {r.aide}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ── Création d'un compte d'administration ────────────────────────────────────────────────────── */

function FormulaireCreation({ onFait, onAnnuler }: { onFait: () => void; onAnnuler: () => void }) {
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<AdminRole>('ADMIN_VERIFICATION')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const pret = phone.trim() && username.trim() && password.length >= 8 && firstName.trim() && lastName.trim()

  const creer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.createAdmin({ phone: phone.trim(), username: username.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(), role })
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Création impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
      <Field label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242…" />
      <Field label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--espace-3)' }}>
        <div style={{ flex: 1 }}>
          <Field label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <Field
        label="Mot de passe initial"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        /* RM-01-06 : le TOTP est obligatoire pour les comptes d'administration. La personne le
           configurera à sa première connexion — le dire évite qu'on croie le compte incomplet. */
        hint="8 caractères minimum. La double authentification sera exigée à sa première connexion."
      />

      <div className="ul-choix">
        {ROLES.map((r) => (
          <button
            key={r.code}
            type="button"
            onClick={() => setRole(r.code)}
            aria-pressed={role === r.code}
            className={['ul-choix__item', 'saris-focus-ring', role === r.code ? 'is-active' : ''].filter(Boolean).join(' ')}
          >
            <span>
              <span className="t-label-md" style={{ display: 'block' }}>
                {r.label}
              </span>
              <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
                {r.aide}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
        <Button onClick={creer} loading={occupe} disabled={occupe || !pret}>
          Créer le compte
        </Button>
        <Button variant="ghost" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </div>
  )
}

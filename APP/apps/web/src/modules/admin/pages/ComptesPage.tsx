/**
 * Comptes — M16, CU-16-02. Sous-rôle **Super**.
 *
 * Suspendre un compte coupe l'accès de quelqu'un à son outil de travail, ou d'un patient à son
 * dossier médical. Deux garde-fous en conséquence :
 *
 *  • **Aucune liste par défaut.** On cherche un compte précis, on ne parcourt pas l'annuaire des
 *    utilisateurs. Afficher tout le monde ferait de la modération une activité de survol, alors que
 *    chaque geste ici doit être délibéré.
 *  • **Le motif est obligatoire**, y compris pour réactiver : c'est la trace qui explique, six mois
 *    plus tard, pourquoi ce compte a été coupé puis rendu.
 *
 * `RM-01-05` : un compte suspendu ne peut ni se connecter, ni être clôturé par son titulaire — la
 * preuve est préservée. L'écran le rappelle, parce que ce n'est pas intuitif.
 */
import { useState } from 'react'
import { Search, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { api, ApiError, type AdminAccount } from '@/lib/api'

export function ComptesPage() {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState<AdminAccount[] | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const chercher = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      setResultats((await api.searchAccounts(terme.trim())).items)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Recherche impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={<UserCog size={20} />}
        title="Comptes"
        subtitle="Rechercher un compte précis pour le suspendre ou le réactiver."
      />

      <section className="ul-card">
        <Field
          label="Nom d’utilisateur, téléphone ou email"
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              chercher()
            }
          }}
          /* Pas de liste par défaut : chaque geste ici doit être délibéré, pas issu d'un survol. */
          hint="Aucune liste n’est affichée par défaut : la modération se fait sur un compte identifié."
          autoFocus
        />
        <div>
          <Button onClick={chercher} loading={occupe} disabled={occupe || terme.trim().length < 2}>
            <Search size={15} /> Rechercher
          </Button>
        </div>

        {erreur ? (
          <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
            {erreur}
          </p>
        ) : null}
      </section>

      {resultats ? (
        <section className="ul-card">
          {resultats.length === 0 ? (
            <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
              Aucun compte ne correspond à « {terme} ».
            </p>
          ) : (
            <ul className="ul-doclist">
              {resultats.map((c) => (
                <LigneCompte key={c.id} compte={c} onFait={chercher} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}

function LigneCompte({ compte, onFait }: { compte: AdminAccount; onFait: () => void }) {
  const [action, setAction] = useState<'suspend' | 'reactivate' | null>(null)
  const [motif, setMotif] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const suspendu = compte.status !== 'ACTIVE'

  const executer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      if (action === 'suspend') await api.suspendAccount(compte.id, motif.trim())
      else await api.reactivateAccount(compte.id, motif.trim())
      setAction(null)
      setMotif('')
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Action impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <li className="ul-docrow ul-docrow--bloc">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
        <span className="ul-docrow__label">
          {compte.username ?? compte.phone}
          <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
            {compte.type} · {compte.phone}
          </span>
        </span>
        <StatusPill tone={suspendu ? 'error' : 'success'}>{compte.status}</StatusPill>
        {!action ? (
          <Button
            variant={suspendu ? 'ghost' : 'danger'}
            size="sm"
            onClick={() => setAction(suspendu ? 'reactivate' : 'suspend')}
          >
            {suspendu ? 'Réactiver' : 'Suspendre'}
          </Button>
        ) : null}
      </div>

      {action ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-2)', width: '100%' }}>
          {action === 'suspend' ? (
            /* RM-01-05 : contre-intuitif, donc rappelé au moment du geste. */
            <div className="ul-notice ul-notice--warning" role="note">
              <p className="t-text-sm" style={{ margin: 0 }}>
                Un compte suspendu ne peut plus se connecter, et son titulaire ne peut plus le clôturer —
                les preuves sont préservées. L’accès est coupé immédiatement.
              </p>
            </div>
          ) : null}

          <Field
            label="Motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={2000}
            hint="Obligatoire. C’est ce texte qui expliquera la décision dans six mois."
          />

          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button
              variant={action === 'suspend' ? 'danger' : 'primary'}
              onClick={executer}
              loading={occupe}
              disabled={occupe || motif.trim().length === 0}
            >
              {action === 'suspend' ? 'Suspendre le compte' : 'Réactiver le compte'}
            </Button>
            <Button variant="ghost" onClick={() => setAction(null)} disabled={occupe}>
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

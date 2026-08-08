/**
 * Ma pharmacie — M02, CU-02-01 à CU-02-04.
 *
 * Cette page répare un trou structurel : un membre de structure ne pouvait atteindre **aucun** écran
 * de son espace, faute d'endpoint pour découvrir sa propre structure. Le rattachement existait en
 * base, mais restait invisible depuis un client. `GET /v1/facilities/me` a été ajouté pour ça.
 *
 * Deux règles de `EF-02-05` structurent l'écran, et elles ne sont pas décoratives :
 *  • **Membres, contrat et retraits sont réservés au TITULAIRE.** Un membre voit sa structure, mais
 *    ne peut pas inviter ni révoquer.
 *  • **Les droits internes sont explicites** — stock, délivrance, statistiques — et modifiables un
 *    par un. Un « accès complet » unique aurait fait donner le droit de délivrance à quelqu'un
 *    recruté pour ranger les rayons.
 */
import { useCallback, useEffect, useState } from 'react'
import { Building2, Plus, ShieldCheck, UserMinus } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type Facility, type FacilityRight } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const DROITS: { code: FacilityRight; label: string; aide: string }[] = [
  { code: 'stock', label: 'Stock', aide: 'Saisir entrées, sorties et inventaire.' },
  { code: 'dispense', label: 'Délivrance', aide: 'Servir une ordonnance présentée par un patient.' },
  { code: 'stats', label: 'Statistiques', aide: 'Consulter les chiffres de la structure.' },
]

export function PharmaciePage() {
  const me = useSessionStore((s) => s.me)
  const [facility, setFacility] = useState<Facility | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const charger = useCallback(async () => {
    try {
      setFacility(await api.myFacility())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  if (etat === 'chargement') return <LoadingState label="Chargement de votre structure…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />

  // `null` n'est pas un échec : c'est le cas normal d'un titulaire qui n'a pas encore créé sa
  // pharmacie. L'écran le distingue donc explicitement d'une panne.
  if (!facility) return <CreationStructure onCree={charger} />

  const moi = facility.members.find((m) => m.accountId === me?.accountId)
  const suisTitulaire = moi?.role === 'HOLDER' || moi?.role === 'OWNER' || moi?.role === 'TITULAIRE'

  return (
    <div>
      <PageHeader icon={<Building2 size={20} />} title={facility.name} subtitle={`${facility.quarter}, ${facility.district}`} />

      <section className="ul-card" aria-labelledby="struct-titre">
        <div className="ul-card__head">
          <h2 id="struct-titre" className="t-display-sm" style={{ margin: 0 }}>
            La structure
          </h2>
          <StatusPill tone={facility.status === 'ACTIVE' ? 'success' : 'warning'}>{facility.status}</StatusPill>
        </div>
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          {facility.hours ? `Horaires : ${facility.hours}` : 'Horaires non renseignés.'}
        </p>
        {/* RM-02-04 : une structure non vérifiée est invisible des patients et ne publie rien. Le
            dire ici évite qu'un titulaire attende des clients qui ne peuvent pas le voir. */}
        {facility.status !== 'ACTIVE' ? (
          <div className="ul-notice ul-notice--warning" role="note">
            <p className="t-text-sm" style={{ margin: 0 }}>
              Tant que la vérification n’est pas terminée, votre pharmacie reste invisible des patients et son
              stock n’apparaît dans aucune recherche.
            </p>
          </div>
        ) : null}
      </section>

      <SectionMembres facility={facility} suisTitulaire={!!suisTitulaire} monAccountId={me?.accountId} onMaj={charger} />
    </div>
  )
}

/* ── Création (CU-02-01) ──────────────────────────────────────────────────────────────────────── */

function CreationStructure({ onCree }: { onCree: () => void }) {
  const [nom, setNom] = useState('')
  const [district, setDistrict] = useState('')
  const [quartier, setQuartier] = useState('')
  const [horaires, setHoraires] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const creer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.createFacility({
        type: 'PHARMACY',
        name: nom.trim(),
        district: district.trim(),
        quarter: quartier.trim(),
        hours: horaires.trim() || undefined,
      })
      onCree()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Création impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div>
      <PageHeader icon={<Building2 size={20} />} title="Ma pharmacie" subtitle="Créez votre espace pour gérer stock, membres et délivrances." />
      <section className="ul-card">
        {/* CU-02-01 : l'espace naît NON VÉRIFIÉ et enchaîne vers le dossier M03. Le dire d'emblée
            évite la déception d'un titulaire qui croit avoir terminé en cliquant « Créer ». */}
        <div className="ul-notice" role="note">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Après création, votre pharmacie devra être vérifiée avant d’être visible des patients. Vous serez
            guidé vers le dépôt du dossier.
          </p>
        </div>

        <Field label="Nom de l’officine" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} />
        <Field label="Arrondissement" value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={80} />
        <Field label="Quartier" value={quartier} onChange={(e) => setQuartier(e.target.value)} maxLength={80} />
        <Field
          label="Horaires (optionnel)"
          value={horaires}
          onChange={(e) => setHoraires(e.target.value)}
          placeholder="Lun–Sam 8h–20h, garde le dimanche"
        />

        <div>
          <Button onClick={creer} loading={occupe} disabled={occupe || !nom.trim() || !district.trim() || !quartier.trim()}>
            Créer ma pharmacie
          </Button>
        </div>

        {erreur ? (
          <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
            {erreur}
          </p>
        ) : null}
      </section>
    </div>
  )
}

/* ── Membres et droits (CU-02-02/03/04) ───────────────────────────────────────────────────────── */

function SectionMembres({
  facility,
  suisTitulaire,
  monAccountId,
  onMaj,
}: {
  facility: Facility
  suisTitulaire: boolean
  monAccountId?: string
  onMaj: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [telephone, setTelephone] = useState('')
  const [droits, setDroits] = useState<FacilityRight[]>(['stock'])
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoyee, setEnvoyee] = useState(false)

  const inviter = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.inviteMember(facility.id, { phone: telephone.trim(), proposedRights: droits })
      setEnvoyee(true)
      setOuvert(false)
      setTelephone('')
      onMaj()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Invitation impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const basculerDroit = (m: { id: string; rights: FacilityRight[] }, code: FacilityRight) => {
    const suivants = m.rights.includes(code) ? m.rights.filter((r) => r !== code) : [...m.rights, code]
    api
      .updateMemberRights(facility.id, m.id, suivants)
      .then(onMaj)
      .catch((e) => setErreur(e instanceof ApiError ? e.message : 'Modification impossible.'))
  }

  return (
    <section className="ul-card" aria-labelledby="membres-titre">
      <div className="ul-card__head">
        <h2 id="membres-titre" className="t-display-sm" style={{ margin: 0 }}>
          Membres
        </h2>
        {/* EF-02-05 : gérer les membres est réservé au titulaire. Le bouton n'existe donc pas pour
            les autres — plutôt que d'exister et d'échouer au clic. */}
        {suisTitulaire && !ouvert ? (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)}>
            <Plus size={15} /> Inviter
          </Button>
        ) : null}
      </div>

      {!suisTitulaire ? (
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Seul le titulaire de l’officine peut inviter ou retirer un membre.
        </p>
      ) : null}

      {envoyee ? (
        <div className="ul-notice" role="status">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Invitation envoyée. Elle expire au bout de quelques jours si elle n’est pas acceptée.
          </p>
        </div>
      ) : null}

      {ouvert ? (
        <>
          <Field
            label="Téléphone de la personne à inviter"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+242…"
            hint="Si elle n’a pas encore de compte, elle sera guidée vers l’inscription."
          />
          <div className="ul-choix">
            {DROITS.map((d) => (
              <button
                key={d.code}
                type="button"
                aria-pressed={droits.includes(d.code)}
                onClick={() => setDroits((x) => (x.includes(d.code) ? x.filter((y) => y !== d.code) : [...x, d.code]))}
                className={['ul-choix__item', 'saris-focus-ring', droits.includes(d.code) ? 'is-active' : ''].filter(Boolean).join(' ')}
              >
                <ShieldCheck size={16} aria-hidden="true" />
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
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={inviter} loading={occupe} disabled={occupe || telephone.trim().length < 6 || droits.length === 0}>
              Envoyer l’invitation
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>
        </>
      ) : null}

      <ul className="ul-doclist">
        {facility.members.map((m) => (
          <li className="ul-docrow ul-docrow--bloc" key={m.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
              <span className="ul-docrow__label">
                {[m.firstName, m.lastName].filter(Boolean).join(' ') || 'Membre'}
                <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                  {m.role}
                  {m.accountId === monAccountId ? ' · vous' : ''}
                </span>
              </span>
              {!m.active ? <StatusPill tone="neutral">Retiré</StatusPill> : null}
              {suisTitulaire && m.active && m.accountId !== monAccountId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => api.removeMember(facility.id, m.id).then(onMaj).catch(() => undefined)}
                >
                  <UserMinus size={14} /> Retirer
                </Button>
              ) : null}
            </div>

            {m.active ? (
              <div style={{ display: 'flex', gap: 'var(--espace-2)', flexWrap: 'wrap' }}>
                {DROITS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    disabled={!suisTitulaire}
                    aria-pressed={m.rights.includes(d.code)}
                    onClick={() => basculerDroit(m, d.code)}
                    className={['ul-puce-droit', 'saris-focus-ring', m.rights.includes(d.code) ? 'is-active' : ''].filter(Boolean).join(' ')}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}

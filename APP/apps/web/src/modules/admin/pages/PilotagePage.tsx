/**
 * Pilotage — M16 (CU-16-03) et M04 (EF-04-03). Sous-rôle **Super** uniquement.
 *
 * Les 7 indicateurs de `plan_releases §3` sont ceux qui décideront de la suite du projet :
 * « **V1 si vert, pivot si rouge** ». Ce ne sont donc pas des jolis chiffres de tableau de bord —
 * ce sont les critères de survie du produit, et l'écran les présente comme tels : valeur, cible, et
 * l'écart qui reste à combler.
 *
 * Le verdict vert/rouge vient du **serveur** : les seuils sont du métier, pas de la présentation.
 * Les recalculer ici aurait créé une seconde source de vérité qui aurait fini par diverger.
 *
 * L'intégrité du journal d'audit est sur la même page, et c'est délibéré : un tableau de bord dont
 * on ne peut pas prouver que les données n'ont pas été retouchées ne vaut rien.
 */
import { useCallback, useEffect, useState } from 'react'
import { Activity, ShieldCheck, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type AuditIntegrity, type PilotKpi } from '@/lib/api'

const formate = (v: number, unit: PilotKpi['unit']) =>
  unit === '%' ? `${Math.round(v)} %` : v.toLocaleString('fr-FR')

export function PilotagePage() {
  const [kpis, setKpis] = useState<PilotKpi[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  const charger = useCallback(async () => {
    try {
      setKpis(await api.pilotKpis())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  if (etat === 'chargement') return <LoadingState label="Calcul des indicateurs…" onRetry={charger} />
  if (etat === 'erreur' || !kpis) return <ErrorState onRetry={charger} />

  const atteints = kpis.filter((k) => k.status === 'GREEN' || k.status === 'OK').length

  return (
    <div>
      <PageHeader
        icon={<Activity size={20} />}
        title="Pilotage du pilote"
        subtitle="Les 7 critères qui décideront de la suite : V1 si vert, pivot si rouge."
      />

      <section className="ul-card" aria-labelledby="kpi-titre">
        <div className="ul-card__head">
          <h2 id="kpi-titre" className="t-display-sm" style={{ margin: 0 }}>
            Critères de succès
          </h2>
          <StatusPill tone={atteints === kpis.length ? 'success' : 'neutral'}>
            {atteints} / {kpis.length} atteints
          </StatusPill>
        </div>

        <ul className="ul-doclist">
          {kpis.map((k) => {
            const vert = k.status === 'GREEN' || k.status === 'OK'
            // Progression bornée à 100 % : dépasser la cible est une bonne nouvelle, pas une barre
            // qui déborde de son conteneur.
            const part = Math.min(100, k.target > 0 ? (k.value / k.target) * 100 : 0)
            return (
              <li className="ul-docrow ul-docrow--bloc" key={k.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
                  <span className="ul-docrow__label">
                    {k.label}
                    <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                      Cible : {formate(k.target, k.unit)}
                    </span>
                  </span>
                  {/* La valeur est écrite ET le verdict est nommé : « atteint » se lit, un vert se
                      devine (CG-11). */}
                  <span className="t-display-md">{formate(k.value, k.unit)}</span>
                  <StatusPill tone={vert ? 'success' : 'error'}>{vert ? 'Atteint' : 'En retard'}</StatusPill>
                </div>
                <div className="ul-jauge" role="presentation">
                  <div className={['ul-jauge__part', vert ? 'is-ok' : ''].filter(Boolean).join(' ')} style={{ width: `${part}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <SectionIntegrite />
    </div>
  )
}

/* ── Intégrité du journal d'audit (EF-04-03) ──────────────────────────────────────────────────── */

function SectionIntegrite() {
  const [resultat, setResultat] = useState<AuditIntegrity | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const verifier = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      setResultat(await api.auditIntegrity())
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Vérification impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="integrite-titre">
      <div className="ul-card__head">
        <h2 id="integrite-titre" className="t-display-sm" style={{ margin: 0 }}>
          Intégrité du journal d’audit
        </h2>
        {resultat ? (
          <StatusPill tone={resultat.ok ? 'success' : 'error'}>{resultat.ok ? 'Chaîne intacte' : 'Rupture détectée'}</StatusPill>
        ) : null}
      </div>

      <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
        Chaque événement du journal est chaîné au précédent par une empreinte. Recalculer la chaîne prouve
        qu’aucun événement n’a été retouché ni supprimé — un tableau de bord dont on ne peut pas prouver
        l’intégrité des données ne vaut rien.
      </p>

      {resultat && !resultat.ok ? (
        <div className="ul-notice ul-notice--warning" role="alert">
          <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TriangleAlert size={15} aria-hidden="true" /> Chaîne rompue
          </p>
          <p className="t-text-sm" style={{ margin: 0 }}>
            Une altération a été détectée à partir de l’événement n° {resultat.brokenAtSeq ?? '?'}. Conservez la
            base en l’état et remontez l’incident immédiatement.
          </p>
        </div>
      ) : null}

      {resultat?.ok ? (
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          {resultat.checked.toLocaleString('fr-FR')} événements vérifiés, chaîne cohérente.
        </p>
      ) : null}

      <div>
        <Button variant="ghost" onClick={verifier} loading={occupe} disabled={occupe}>
          <ShieldCheck size={15} /> Vérifier la chaîne
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

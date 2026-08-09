/**
 * Paramètres métier — M16, EF-16-04 / CU-16-02. SUPER_ADMIN seul.
 *
 * `PM-01` à `PM-40` pilotent tout le comportement du produit : seuil de blocage après échecs,
 * fenêtre de paiement d'une poignée de main, taux de commission, durée de fraîcheur d'un stock…
 * Le cahier des charges est formel — ces chiffres ne sont **jamais en dur** dans le code, ils
 * passent par `ParamsService`.
 *
 * ⚠️ Tout le mécanisme de modification existait déjà côté serveur, mais **aucune route ne listait
 * les paramètres**. Un administrateur aurait dû connaître les quarante clés de mémoire. Résultat :
 * changer un seuil pendant le pilote imposait une migration de base — donc un développeur, un
 * déploiement, et une interruption. C'est exactement ce que ce module devait éviter.
 *
 * Deux garde-fous d'interface, tous deux issus de règles réelles :
 *  • **Le motif est obligatoire** (RM-16-03). Un seuil qui change sans explication est ingérable
 *    six mois plus tard, quand plus personne ne se souvient pourquoi.
 *  • **Les taux contractuels sont signalés** : les modifier déclenche une ré-édition des contrats
 *    signés (avenant, D-022). Ce n'est pas un réglage anodin, l'écran doit le dire avant le clic.
 */
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, History, Save, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type ParameterChange, type PlatformParameter } from '@/lib/api'

/**
 * Taux contractuels — leur modification ré-édite les contrats signés (D-022, M03).
 * Liste tenue ici ET côté serveur (`isRateParameter`) : le serveur reste seul juge, l'interface ne
 * fait qu'avertir. Si les deux divergent un jour, c'est l'avertissement qui manque, jamais la règle.
 */
const TAUX_CONTRACTUELS = ['PM-01', 'PM-02']

export function ParametresMetierPage() {
  const [params, setParams] = useState<PlatformParameter[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')
  const [ouvert, setOuvert] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      setParams(await api.parameters())
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  if (etat === 'chargement') return <LoadingState label="Chargement des paramètres…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />

  return (
    <div>
      <PageHeader
        icon={<SlidersHorizontal size={20} />}
        title="Paramètres métier"
        subtitle="Les chiffres qui pilotent le produit : seuils, fenêtres, taux. Modifiables sans déploiement."
      />

      <section className="ul-card" aria-labelledby="params-titre">
        <div className="ul-card__head">
          <h2 id="params-titre" className="t-display-sm" style={{ margin: 0 }}>
            {params?.length ?? 0} paramètres
          </h2>
        </div>

        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Chaque changement exige un motif et une date d’effet, et reste consultable dans l’historique.
          Les modules servent la nouvelle valeur à compter de cette date.
        </p>

        <ul className="ul-doclist">
          {(params ?? []).map((p) => (
            <LigneParametre
              key={p.key}
              parametre={p}
              ouvert={ouvert === p.key}
              onBasculer={() => setOuvert((k) => (k === p.key ? null : p.key))}
              onEnregistre={() => {
                setOuvert(null)
                charger()
              }}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ── Une ligne de paramètre ───────────────────────────────────────────────────────────────────── */

function LigneParametre({
  parametre,
  ouvert,
  onBasculer,
  onEnregistre,
}: {
  parametre: PlatformParameter
  ouvert: boolean
  onBasculer: () => void
  onEnregistre: () => void
}) {
  const [valeur, setValeur] = useState(parametre.value)
  const [motif, setMotif] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [historique, setHistorique] = useState<ParameterChange[] | null>(null)

  const estTaux = TAUX_CONTRACTUELS.includes(parametre.key)
  const modifie = valeur.trim() !== parametre.value

  const enregistrer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.updateParameter(parametre.key, {
        value: valeur.trim(),
        // Date d'effet immédiate : le différé est explicitement reporté en V1 (état de réalisation
        // §4.2). Proposer un champ qui ne serait pas honoré serait pire que ne rien proposer.
        effectiveAt: new Date().toISOString(),
        reason: motif.trim(),
      })
      onEnregistre()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Modification impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const voirHistorique = async () => {
    try {
      setHistorique(await api.parameterHistory(parametre.key))
    } catch {
      setHistorique([])
    }
  }

  return (
    <li className="ul-docrow ul-docrow--bloc">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
        <span className="t-code" style={{ color: 'var(--ap-400)', flexShrink: 0 }}>
          {parametre.key}
        </span>
        <span className="ul-docrow__label">
          {parametre.description}
          <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
            Valeur actuelle : <strong>{parametre.value}</strong>
          </span>
        </span>
        {estTaux ? <StatusPill tone="warning">Taux contractuel</StatusPill> : null}
        <Button variant="ghost" size="sm" onClick={onBasculer}>
          {ouvert ? 'Fermer' : 'Modifier'}
        </Button>
      </div>

      {ouvert ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
          {/* D-022 : changer un taux ré-édite les contrats signés. Le dire AVANT, pas découvrir
              après coup que des dizaines d'avenants sont partis. */}
          {estTaux ? (
            <div className="ul-notice ul-notice--warning" role="note">
              <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} aria-hidden="true" /> Ce paramètre est un taux contractuel
              </p>
              <p className="t-text-sm" style={{ margin: 0 }}>
                Le modifier déclenche la ré-édition des contrats déjà signés sous forme d’avenants. Les
                professionnels concernés en seront notifiés.
              </p>
            </div>
          ) : null}

          <Field label="Nouvelle valeur" value={valeur} onChange={(e) => setValeur(e.target.value)} maxLength={500} />
          <Field
            label="Motif du changement"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={2000}
            placeholder="Blocages trop fréquents signalés par le support"
            hint="Obligatoire. Dans six mois, c’est la seule trace de la raison."
          />

          <div style={{ display: 'flex', gap: 'var(--espace-2)', flexWrap: 'wrap' }}>
            <Button onClick={enregistrer} loading={occupe} disabled={occupe || !modifie || motif.trim().length < 3}>
              <Save size={15} /> Enregistrer
            </Button>
            <Button variant="ghost" onClick={voirHistorique}>
              <History size={15} /> Historique
            </Button>
          </div>

          {historique ? (
            historique.length === 0 ? (
              <p className="t-text-sm" style={{ color: 'var(--texte-tertiaire)', margin: 0 }}>
                Jamais modifié depuis la mise en service.
              </p>
            ) : (
              <ul className="ul-doclist">
                {historique.map((h, i) => (
                  <li className="ul-docrow" key={h.id ?? `${h.createdAt}-${i}`}>
                    <span className="ul-docrow__label">
                      <span className="t-code">{h.oldValue}</span> → <span className="t-code">{h.newValue}</span>
                      <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                        {h.reason} · {new Date(h.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {erreur ? (
            <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
              {erreur}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

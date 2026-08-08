/**
 * Rédaction d'ordonnance — M09, CU-09-01. Vit DANS la consultation, jamais ailleurs.
 *
 * `RM-09-01` : on ne prescrit que depuis une session ACTIVE. Une page d'ordonnance autonome serait
 * donc un piège — elle laisserait croire qu'on peut prescrire à froid, et n'aboutirait jamais.
 *
 * ⚠️ **Le garde-fou allergies (EF-09-03) est le cœur de ce composant.** Le serveur compare chaque
 * ligne RÉFÉRENTIELLE aux allergies actives du Carnet et refuse l'ordonnance (409) tant que chaque
 * conflit n'est pas confirmé par un motif écrit. Deux conséquences que l'interface doit rendre
 * évidentes, parce qu'elles décident de la sécurité du patient :
 *
 *  1. **Une ligne en texte libre n'est PAS vérifiée.** C'est explicite dans la spécification
 *     (« SANS garde-fou automatique »). Le formulaire le dit à l'endroit exact où l'on s'apprête à
 *     contourner le référentiel, pas dans une note de bas de page.
 *  2. **Passer outre n'est pas un clic.** Chaque médicament en cause exige un motif écrit, tracé
 *     côté serveur (`AllergyOverride` + audit C5). Un bouton « ignorer » global aurait vidé la règle
 *     de son sens.
 */
import { useEffect, useRef, useState } from 'react'
import { Pill, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { api, ApiError, estAlerteAllergie, type AllergyConflict, type Medicament } from '@/lib/api'

interface Ligne {
  cle: string
  medicament: Medicament | null
  freeText: string
  posology: string
}

const ligneVide = (): Ligne => ({ cle: crypto.randomUUID(), medicament: null, freeText: '', posology: '' })

export function BlocOrdonnance({ sessionId, onDeposee }: { sessionId: string; onDeposee: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()])
  const [conflits, setConflits] = useState<AllergyConflict[]>([])
  const [motifs, setMotifs] = useState<Record<string, string>>({})
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [faite, setFaite] = useState(false)

  const majLigne = (cle: string, maj: Partial<Ligne>) =>
    setLignes((l) => l.map((x) => (x.cle === cle ? { ...x, ...maj } : x)))

  const utilisables = lignes.filter((l) => (l.medicament || l.freeText.trim()) && l.posology.trim())
  const toutMotive = conflits.every((c) => (motifs[c.medicamentId] ?? '').trim().length > 0)

  const deposer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.createPrescription(sessionId, {
        lines: utilisables.map((l) =>
          l.medicament
            ? { medicamentId: l.medicament.id, posology: l.posology.trim() }
            : { freeText: l.freeText.trim(), posology: l.posology.trim() },
        ),
        overrides: conflits
          .filter((c) => (motifs[c.medicamentId] ?? '').trim())
          .map((c) => ({ medicamentId: c.medicamentId, reason: motifs[c.medicamentId].trim() })),
      })
      setFaite(true)
      setOuvert(false)
      onDeposee()
    } catch (e) {
      // Le 409 du garde-fou n'est pas une erreur de saisie : c'est une information clinique. On la
      // transforme en formulaire de confirmation plutôt qu'en bandeau rouge que l'on ferme.
      if (e instanceof ApiError && estAlerteAllergie(e.details)) {
        setConflits(e.details.conflicts)
        setErreur(null)
      } else {
        setErreur(e instanceof ApiError ? e.message : 'Dépôt impossible — réessayez.')
      }
    } finally {
      setOccupe(false)
    }
  }

  if (faite) {
    return (
      <section className="ul-card" aria-labelledby="ord-titre">
        <div className="ul-card__head">
          <h2 id="ord-titre" className="t-display-sm" style={{ margin: 0 }}>
            <Pill size={16} aria-hidden="true" /> Ordonnance
          </h2>
          <StatusPill tone="success">Délivrée</StatusPill>
        </div>
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          L’ordonnance est scellée et disponible pour le patient, avec son QR de délivrance en pharmacie.
        </p>
      </section>
    )
  }

  return (
    <section className="ul-card" aria-labelledby="ord-titre">
      <div className="ul-card__head">
        <h2 id="ord-titre" className="t-display-sm" style={{ margin: 0 }}>
          <Pill size={16} aria-hidden="true" /> Ordonnance
        </h2>
        {!ouvert ? (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)}>
            <Plus size={15} /> Rédiger
          </Button>
        ) : null}
      </div>

      {!ouvert ? (
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Vous pouvez prescrire tant que la consultation est active. L’ordonnance est scellée à sa création et
          ne peut plus être modifiée ensuite.
        </p>
      ) : (
        <>
          {lignes.map((l, i) => (
            <LigneOrdonnance
              key={l.cle}
              ligne={l}
              index={i}
              surMaj={(maj) => majLigne(l.cle, maj)}
              surRetrait={lignes.length > 1 ? () => setLignes((x) => x.filter((y) => y.cle !== l.cle)) : undefined}
            />
          ))}

          <div>
            <Button variant="ghost" size="sm" onClick={() => setLignes((l) => [...l, ligneVide()])}>
              <Plus size={15} /> Ajouter une ligne
            </Button>
          </div>

          {conflits.length > 0 ? (
            <div className="ul-notice ul-notice--warning" role="alert">
              <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TriangleAlert size={15} aria-hidden="true" /> Alerte allergie
              </p>
              <p className="t-text-sm" style={{ margin: 0 }}>
                Le Carnet du patient signale une allergie pour {conflits.length === 1 ? 'un médicament' : 'plusieurs médicaments'} de
                cette ordonnance. Pour maintenir la prescription, motivez chaque cas — votre motif est conservé
                dans le dossier.
              </p>
              {conflits.map((c) => (
                <div key={c.medicamentId} style={{ marginTop: 'var(--espace-3)' }}>
                  <p className="t-label-md" style={{ margin: 0 }}>
                    {c.medicamentLabel} — allergie : {c.allergies.join(', ')}
                  </p>
                  <Field
                    label="Motif de maintien"
                    value={motifs[c.medicamentId] ?? ''}
                    onChange={(e) => setMotifs((m) => ({ ...m, [c.medicamentId]: e.target.value }))}
                    maxLength={500}
                    placeholder="Bénéfice supérieur au risque, allergie ancienne non confirmée…"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button
              onClick={deposer}
              loading={occupe}
              disabled={occupe || utilisables.length === 0 || (conflits.length > 0 && !toutMotive)}
            >
              {conflits.length > 0 ? 'Confirmer et délivrer' : 'Délivrer l’ordonnance'}
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)} disabled={occupe}>
              Annuler
            </Button>
          </div>

          {erreur ? (
            <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
              {erreur}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

/* ── Une ligne : médicament du référentiel OU texte libre ─────────────────────────────────────── */

function LigneOrdonnance({
  ligne,
  index,
  surMaj,
  surRetrait,
}: {
  ligne: Ligne
  index: number
  surMaj: (maj: Partial<Ligne>) => void
  surRetrait?: () => void
}) {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState<Medicament[]>([])
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recherche différée : interroger le référentiel à chaque touche saturerait le serveur pour des
  // requêtes que l'utilisateur n'a pas fini de formuler.
  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current)
    if (terme.trim().length < 2) {
      setResultats([])
      return
    }
    minuteur.current = setTimeout(() => {
      api
        .searchMedicaments(terme.trim())
        .then((r) => setResultats(r.items))
        .catch(() => setResultats([]))
    }, 300)
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current)
    }
  }, [terme])

  return (
    <div className="ul-ligne-ord">
      <div className="ul-card__head" style={{ marginBottom: 0 }}>
        <span className="t-label-md">Ligne {index + 1}</span>
        {surRetrait ? (
          <Button variant="ghost" size="sm" onClick={surRetrait} aria-label={`Retirer la ligne ${index + 1}`}>
            <X size={14} />
          </Button>
        ) : null}
      </div>

      {ligne.medicament ? (
        <div className="ul-docrow" style={{ padding: 'var(--espace-2) var(--espace-3)' }}>
          <span className="ul-docrow__label">
            {ligne.medicament.dci}
            <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
              {[ligne.medicament.form, ligne.medicament.dosage].filter(Boolean).join(' · ')}
            </span>
          </span>
          <StatusPill tone="accent">Référentiel</StatusPill>
          <Button variant="ghost" size="sm" onClick={() => surMaj({ medicament: null })}>
            Changer
          </Button>
        </div>
      ) : (
        <>
          <Field
            label="Médicament"
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            placeholder="Rechercher dans le référentiel…"
            hint="Deux caractères minimum. Un médicament du référentiel est comparé aux allergies du patient."
          />
          {resultats.length > 0 ? (
            <ul className="ul-doclist">
              {resultats.map((m) => (
                <li className="ul-docrow" key={m.id}>
                  <span className="ul-docrow__icon">
                    <Search size={14} />
                  </span>
                  <span className="ul-docrow__label">
                    {m.dci}
                    <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                      {[m.form, m.dosage, m.commercialNames.join(', ')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      surMaj({ medicament: m, freeText: '' })
                      setTerme('')
                      setResultats([])
                    }}
                  >
                    Choisir
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {/* EF-09-02 : la ligne hors référentiel est légitime, mais elle échappe au garde-fou. On le
              dit ICI, au moment exact du contournement — pas dans une note qu'on ne lit jamais. */}
          <Field
            label="…ou saisie libre"
            value={ligne.freeText}
            onChange={(e) => surMaj({ freeText: e.target.value, medicament: null })}
            maxLength={300}
            hint="⚠️ Une ligne hors référentiel n’est PAS comparée aux allergies du patient."
          />
        </>
      )}

      <Field
        label="Posologie"
        value={ligne.posology}
        onChange={(e) => surMaj({ posology: e.target.value })}
        maxLength={300}
        placeholder="1 comprimé matin et soir, 5 jours"
      />
    </div>
  )
}

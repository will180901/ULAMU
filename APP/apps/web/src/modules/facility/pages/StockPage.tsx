/**
 * Stock — M11, CU-11-01. Inventaire lot par lot, entrées, sorties motivées, fraîcheur.
 *
 * Le tri est **FEFO** (`First Expired, First Out`, RM-11-02) et vient du serveur : les lots qui
 * périment en premier remontent en tête, parce que c'est l'ordre dans lequel ils doivent être
 * servis. Un tri alphabétique aurait été plus « propre » et aurait fait périmer des boîtes.
 *
 * ⚠️ Deux règles qui décident de la visibilité de l'officine :
 *  • **La fraîcheur du stock conditionne l'apparition dans les recherches** (PM-33). Une pharmacie
 *    qui ne confirme plus son inventaire disparaît des résultats — elle perd des clients sans jamais
 *    comprendre pourquoi. L'écran affiche donc l'échéance, il ne se contente pas d'un bouton.
 *  • **Une sortie exige un motif** (EF-11-03). Une quantité qui baisse sans raison écrite est un
 *    trou dans l'inventaire, pas une opération.
 */
import { useCallback, useEffect, useState } from 'react'
import { Boxes, PackageMinus, PackagePlus, RefreshCw, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type Facility, type Medicament, type StockItem } from '@/lib/api'

const xaf = (n: number) => `${n.toLocaleString('fr-FR')} XAF`
const jours = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)

export function StockPage() {
  const [facility, setFacility] = useState<Facility | null>(null)
  const [items, setItems] = useState<StockItem[]>([])
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur' | 'sans-structure'>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)
  const [fraicheur, setFraicheur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      const f = await api.myFacility()
      if (!f) {
        setEtat('sans-structure')
        return
      }
      setFacility(f)
      setItems((await api.stockItems(f.id)).items)
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const confirmerFraicheur = async () => {
    if (!facility) return
    setErreur(null)
    try {
      const r = await api.confirmFreshness(facility.id)
      setFraicheur(r.lastFreshAt)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Confirmation impossible — réessayez.')
    }
  }

  if (etat === 'chargement') return <LoadingState label="Chargement de votre stock…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />
  if (etat === 'sans-structure' || !facility)
    return (
      <div>
        <PageHeader icon={<Boxes size={20} />} title="Stock" />
        <section className="ul-card">
          <EmptyState
            icon={<Boxes size={22} />}
            title="Aucune pharmacie rattachée"
            description="Le stock appartient à une officine. Créez ou rejoignez d’abord une structure."
            action={
              <Button variant="ghost" onClick={() => (window.location.pathname = '/pharmacie')}>
                Aller à ma pharmacie
              </Button>
            }
          />
        </section>
      </div>
    )

  const perimes = items.filter((i) => i.expired).length
  const bientot = items.filter((i) => !i.expired && jours(i.expiryDate) <= 30).length

  return (
    <div>
      <PageHeader icon={<Boxes size={20} />} title="Stock" subtitle={`${facility.name} — inventaire lot par lot.`} />

      <section className="ul-card" aria-labelledby="fraicheur-titre">
        <div className="ul-card__head">
          <h2 id="fraicheur-titre" className="t-display-sm" style={{ margin: 0 }}>
            Fraîcheur de l’inventaire
          </h2>
          {fraicheur ? <StatusPill tone="success">Confirmée</StatusPill> : null}
        </div>
        {/* PM-33 : sans confirmation régulière, la pharmacie SORT des recherches. Le dire, plutôt que
            de poser un bouton dont personne ne comprend l'enjeu. */}
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Confirmez régulièrement que votre inventaire est à jour. Sans cette confirmation, votre pharmacie
          cesse d’apparaître dans les recherches des patients — c’est ce qui garantit qu’un patient ne se
          déplace pas pour un médicament déjà vendu.
        </p>
        <div>
          <Button variant="ghost" onClick={confirmerFraicheur}>
            <RefreshCw size={15} /> Mon stock est à jour
          </Button>
        </div>
      </section>

      {perimes > 0 || bientot > 0 ? (
        <div className="ul-notice ul-notice--warning" role="status">
          <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TriangleAlert size={15} aria-hidden="true" /> Péremptions
          </p>
          <p className="t-text-sm" style={{ margin: 0 }}>
            {perimes > 0 ? `${perimes} lot${perimes > 1 ? 's' : ''} périmé${perimes > 1 ? 's' : ''}. ` : ''}
            {bientot > 0 ? `${bientot} lot${bientot > 1 ? 's' : ''} à moins de 30 jours.` : ''}
          </p>
        </div>
      ) : null}

      <SectionEntree facilityId={facility.id} onFait={charger} />

      <section className="ul-card" aria-labelledby="inv-titre">
        <div className="ul-card__head">
          <h2 id="inv-titre" className="t-display-sm" style={{ margin: 0 }}>
            Inventaire
          </h2>
          <StatusPill tone="neutral">{items.length} lot{items.length > 1 ? 's' : ''}</StatusPill>
        </div>

        {items.length === 0 ? (
          <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
            Aucun lot en stock. Tant que l’inventaire est vide, votre pharmacie n’apparaît dans aucune recherche.
          </p>
        ) : (
          <ul className="ul-doclist">
            {items.map((i) => (
              <LigneStock key={i.id} item={i} facilityId={facility.id} onFait={charger} />
            ))}
          </ul>
        )}
      </section>

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)' }}>
          {erreur}
        </p>
      ) : null}
    </div>
  )
}

/* ── Une ligne d'inventaire + sortie motivée ──────────────────────────────────────────────────── */

function LigneStock({ item, facilityId, onFait }: { item: StockItem; facilityId: string; onFait: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const restants = jours(item.expiryDate)

  const sortir = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.stockExit(facilityId, {
        medicamentId: item.medicamentId,
        lotCode: item.lotCode,
        quantity: Number(quantite),
        reason: motif.trim(),
      })
      setOuvert(false)
      setQuantite('')
      setMotif('')
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Sortie impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <li className="ul-docrow ul-docrow--bloc">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
        <span className="ul-docrow__label">
          {item.dci}
          <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
            Lot {item.lotCode} · {[item.form, item.dosage].filter(Boolean).join(' ')} · {xaf(item.priceXaf)}
          </span>
        </span>

        {/* La péremption est portée par le TEXTE autant que par la couleur (CG-11) : « périmé » se
            lit, un liseré rouge se devine. */}
        {item.expired ? (
          <StatusPill tone="error">Périmé</StatusPill>
        ) : restants <= 30 ? (
          <StatusPill tone="warning">Périme dans {restants} j</StatusPill>
        ) : (
          <StatusPill tone="neutral">{new Date(item.expiryDate).toLocaleDateString('fr-FR')}</StatusPill>
        )}

        <StatusPill tone={item.quantity > 0 ? 'success' : 'neutral'}>{item.quantity} u.</StatusPill>

        {!ouvert ? (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)} disabled={item.quantity === 0}>
            <PackageMinus size={14} /> Sortie
          </Button>
        ) : null}
      </div>

      {ouvert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-2)', width: '100%' }}>
          <Field
            label="Quantité à sortir"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            error={Number(quantite) > item.quantity ? `Il n’y a que ${item.quantity} unités dans ce lot` : undefined}
          />
          {/* EF-11-03 : sans motif, une quantité qui baisse est un trou dans l'inventaire. */}
          <Field
            label="Motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={200}
            placeholder="Casse, retrait de lot, péremption…"
          />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button
              onClick={sortir}
              loading={occupe}
              disabled={occupe || !quantite || Number(quantite) < 1 || Number(quantite) > item.quantity || !motif.trim()}
            >
              Enregistrer la sortie
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>
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

/* ── Entrée de lot ────────────────────────────────────────────────────────────────────────────── */

function SectionEntree({ facilityId, onFait }: { facilityId: string; onFait: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState<Medicament[]>([])
  const [choisi, setChoisi] = useState<Medicament | null>(null)
  const [lot, setLot] = useState('')
  const [quantite, setQuantite] = useState('')
  const [peremption, setPeremption] = useState('')
  const [prix, setPrix] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (terme.trim().length < 2) {
      setResultats([])
      return
    }
    const t = setTimeout(() => {
      api
        .searchMedicaments(terme.trim())
        .then((r) => setResultats(r.items))
        .catch(() => setResultats([]))
    }, 300)
    return () => clearTimeout(t)
  }, [terme])

  const enregistrer = async () => {
    if (!choisi) return
    setErreur(null)
    setOccupe(true)
    try {
      await api.stockEntry(facilityId, {
        medicamentId: choisi.id,
        lotCode: lot.trim(),
        quantity: Number(quantite),
        expiryDate: new Date(peremption).toISOString(),
        priceXaf: Number(prix),
      })
      setOuvert(false)
      setChoisi(null)
      setLot('')
      setQuantite('')
      setPeremption('')
      setPrix('')
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Entrée impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="entree-titre">
      <div className="ul-card__head">
        <h2 id="entree-titre" className="t-display-sm" style={{ margin: 0 }}>
          Entrée de lot
        </h2>
        {!ouvert ? (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)}>
            <PackagePlus size={15} /> Ajouter
          </Button>
        ) : null}
      </div>

      {ouvert ? (
        <>
          {choisi ? (
            <div className="ul-docrow" style={{ padding: 'var(--espace-2) var(--espace-3)' }}>
              <span className="ul-docrow__label">{choisi.dci}</span>
              <Button variant="ghost" size="sm" onClick={() => setChoisi(null)}>
                Changer
              </Button>
            </div>
          ) : (
            <>
              <Field label="Médicament" value={terme} onChange={(e) => setTerme(e.target.value)} placeholder="Rechercher…" hint="Deux caractères minimum." />
              {resultats.length > 0 ? (
                <ul className="ul-doclist">
                  {resultats.map((m) => (
                    <li className="ul-docrow" key={m.id}>
                      <span className="ul-docrow__label">
                        {m.dci}
                        <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                          {[m.form, m.dosage].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => { setChoisi(m); setTerme(''); setResultats([]) }}>
                        Choisir
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}

          <Field label="Code de lot" value={lot} onChange={(e) => setLot(e.target.value)} maxLength={64} />
          <Field label="Quantité" value={quantite} onChange={(e) => setQuantite(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          <Field label="Date de péremption" type="date" value={peremption} onChange={(e) => setPeremption(e.target.value)} />
          <Field
            label="Prix de vente (XAF)"
            value={prix}
            onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            /* RM-11-04 : le prix est libre, mais il n'est révélé au patient qu'APRÈS dévoilement. */
            hint="Prix libre. Il n’est visible d’un patient qu’après un dévoilement payé."
          />

          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={enregistrer} loading={occupe} disabled={occupe || !choisi || !lot.trim() || !quantite || !peremption || !prix}>
              Enregistrer l’entrée
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>

          {erreur ? (
            <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
              {erreur}
            </p>
          ) : null}
        </>
      ) : (
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Chaque lot porte sa propre date de péremption et son prix. C’est ce découpage qui permet de servir
          d’abord ce qui périme le plus tôt.
        </p>
      )}
    </section>
  )
}

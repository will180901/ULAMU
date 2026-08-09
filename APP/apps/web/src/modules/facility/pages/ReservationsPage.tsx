/**
 * Réservations reçues — M12, CU-12-03. La file du comptoir.
 *
 * Un patient paie un dévoilement, découvre l'officine qui détient son médicament, et vient le
 * chercher. Côté pharmacie, il ne se passait **rien** : « marquer servi » existait déjà côté serveur,
 * mais aucune route ne permettait de savoir quelles réservations avaient été reçues. Une officine ne
 * pouvait clôturer qu'un identifiant obtenu ailleurs — en pratique, jamais. Les réservations
 * restaient donc ouvertes jusqu'à expiration, ce qui **pénalise la pharmacie sur sa fiabilité**
 * (EF-12-07) pour un service qu'elle a peut-être rendu.
 *
 * ⚠️ Aucune identité de patient n'apparaît ici, et ce n'est pas un oubli : le contrat C1 tient dans
 * les deux sens. L'officine voit CE QUI a été réservé et jusqu'à quand — jamais QUI l'a réservé.
 * Le patient se présente au comptoir, c'est là que l'identité se rencontre, pas dans un écran.
 */
import { useCallback, useEffect, useState } from 'react'
import { PackageCheck, ShoppingBag } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { EmptyState, ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type Disclosure } from '@/lib/api'

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

export function ReservationsPage() {
  const [facilityId, setFacilityId] = useState<string | null>(null)
  const [liste, setListe] = useState<Disclosure[] | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur' | 'sans-structure'>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      const f = facilityId ?? (await api.myFacility())?.id ?? null
      if (!f) {
        setEtat('sans-structure')
        return
      }
      setFacilityId(f)
      const res = await api.facilityDisclosures(f)
      setListe(res.items)
      setEtat('pret')
    } catch {
      // Un réseau qui hoquette ne doit pas vider un écran de comptoir en pleine journée.
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [facilityId])

  useEffect(() => {
    charger()
  }, [charger])

  // Interrogation SUSPENDUE hors premier plan : une officine laisse cet écran ouvert toute la
  // journée, inutile d'interroger le serveur pendant qu'elle travaille ailleurs.
  useEffect(() => {
    if (etat !== 'pret') return
    let id: ReturnType<typeof setInterval> | null = null
    const demarrer = () => {
      if (id === null && document.visibilityState === 'visible') id = setInterval(charger, 15000)
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
  }, [etat, charger])

  const servir = async (id: string) => {
    setErreur(null)
    setEnCours(id)
    try {
      await api.markDisclosureServed(id)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Clôture impossible — réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  if (etat === 'chargement') return <LoadingState label="Chargement des réservations…" onRetry={charger} />
  if (etat === 'erreur') return <ErrorState onRetry={charger} />
  if (etat === 'sans-structure') {
    return (
      <div>
        <PageHeader icon={<ShoppingBag size={20} />} title="Réservations" />
        <EmptyState
          icon={<ShoppingBag size={22} />}
          title="Aucune structure rattachée"
          description="Les réservations arrivent à une officine. Créez ou rejoignez d’abord une pharmacie."
          action={
            <Button variant="ghost" onClick={() => (window.location.href = '/pharmacie')}>
              Ma pharmacie
            </Button>
          }
        />
      </div>
    )
  }

  const aServir = (liste ?? []).filter((d) => d.status === 'ACTIVE')
  const servies = (liste ?? []).filter((d) => d.status === 'SERVED')

  return (
    <div>
      <PageHeader
        icon={<ShoppingBag size={20} />}
        title="Réservations"
        subtitle="Les patients qui ont payé pour découvrir votre officine et viennent chercher leur traitement."
      />

      <section className="ul-card" aria-labelledby="a-servir-titre">
        <div className="ul-card__head">
          <h2 id="a-servir-titre" className="t-display-sm" style={{ margin: 0 }}>
            À servir
          </h2>
          {aServir.length > 0 ? <StatusPill tone="warning">{aServir.length}</StatusPill> : null}
        </div>

        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Marquez « servie » dès la remise. Une réservation laissée ouverte jusqu’à expiration compte
          contre votre fiabilité, même si vous avez rendu le service.
        </p>

        {aServir.length === 0 ? (
          <EmptyState
            icon={<PackageCheck size={22} />}
            title="Aucune réservation en attente"
            description="Elles apparaissent ici dès qu’un patient paie pour découvrir votre officine. Votre stock doit être à jour pour y figurer."
            action={
              <Button variant="ghost" onClick={() => (window.location.href = '/stock')}>
                Vérifier mon stock
              </Button>
            }
          />
        ) : (
          <ul className="ul-doclist">
            {aServir.map((d) => (
              <li className="ul-docrow ul-docrow--bloc" key={d.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
                  <span className="ul-docrow__label">
                    {d.requestedItems.map((i) => i.label ?? i.dci).filter(Boolean).join(' · ') || 'Traitement réservé'}
                    <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                      {/* Référence opaque : elle permet de rapprocher un reçu sans jamais nommer le patient. */}
                      Réf. <span className="t-code">{d.orderRef}</span>
                    </span>
                  </span>
                  <StatusPill tone={d.remainingSeconds <= 3600 ? 'error' : 'neutral'}>
                    {d.remainingSeconds > 0 ? `Expire dans ${mmss(d.remainingSeconds)}` : 'Expirée'}
                  </StatusPill>
                </div>
                <div>
                  <Button onClick={() => servir(d.id)} loading={enCours === d.id} disabled={enCours !== null}>
                    <PackageCheck size={15} /> Marquer servie
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {erreur ? (
          <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
            {erreur}
          </p>
        ) : null}
      </section>

      {servies.length > 0 ? (
        <section className="ul-card" aria-labelledby="servies-titre">
          <div className="ul-card__head">
            <h2 id="servies-titre" className="t-display-sm" style={{ margin: 0 }}>
              Servies récemment
            </h2>
          </div>
          <ul className="ul-doclist">
            {servies.map((d) => (
              <li className="ul-docrow" key={d.id}>
                <span className="ul-docrow__label">
                  {d.requestedItems.map((i) => i.label ?? i.dci).filter(Boolean).join(' · ') || 'Traitement réservé'}
                  <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                    Servie le {d.servedAt ? new Date(d.servedAt).toLocaleDateString('fr-FR') : '—'}
                  </span>
                </span>
                <StatusPill tone="success">Servie</StatusPill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

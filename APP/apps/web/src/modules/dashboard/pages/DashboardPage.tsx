/**
 * B2 — Tableau de bord. D'après `docs/maquettes/B2 - Tableau de bord.dc.html`.
 *
 * **Un seul écran, trois visages** selon le rôle — soignant, officine, administration. C'est le choix
 * acté au plan de refonte : trois écrans séparés auraient triplé le travail de maintenance pour un
 * cadre identique.
 *
 * ⚠️ **Ce qui manque, et pourquoi il manque.** La maquette montre par rôle quatre KPI avec tendances,
 * un graphique sur six mois et une répartition par type. L'API ne calcule RIEN de tout cela :
 * `me/dashboard` renvoie quatre nombres bruts, `me/facility/:id/dashboard` en renvoie deux, et aucune
 * comparaison historique n'existe nulle part.
 *
 * Décision du 20/08/2026 : **construire avec le réel**. Chaque chiffre affiché ici est vrai. Pas de
 * tendance inventée, pas de courbe décorative — un tableau de bord qui ment est pire qu'un tableau de
 * bord incomplet, parce qu'on y prend des décisions. Le manque est inscrit au §9 du plan, à combler
 * quand M16 saura produire ces séries.
 */
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Handshake,
  Hourglass,
  LayoutDashboard,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { CarteKpi, Panneau } from '@/components/ulamu/CarteKpi'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { api, type ProfessionalDashboard } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

/**
 * Six mois d'activité, en barres.
 *
 * ⚠️ Ce bloc a longtemps été ABSENT : la maquette B2 le montrait, et M16 ne calculait aucune série.
 * Plutôt qu'une courbe décorative, l'écran n'affichait que quatre nombres bruts. M16 sait désormais
 * regrouper par mois ce qui existe déjà — chaque consultation payée porte sa date, chaque crédit
 * aussi (correction du 24/08/2026).
 *
 * Écrit en SVG à la main : six barres ne justifient pas une bibliothèque de graphiques, ses 40 Ko
 * et son thème à réaccorder. Les hauteurs sont des pourcentages du maximum — pas une échelle
 * absolue, qui écraserait tout dès qu'un mois se détache.
 */
function SixMois({ mois }: { mois: ProfessionalDashboard['lastSixMonths'] }) {
  const max = Math.max(1, ...mois.map((m) => m.sessions))
  const nom = (cle: string) => {
    const [a, m] = cle.split('-')
    return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' })
  }
  const total = mois.reduce((t, m) => t + m.sessions, 0)

  return (
    <Panneau icone={TrendingUp} titre="Six derniers mois" sousTitre={total === 0 ? undefined : `${total} consultations au total`}>
      {total === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-[var(--texte-tertiaire)]">
          Aucune consultation sur les six derniers mois. Vos premières apparaîtront ici.
        </p>
      ) : (
        <ul className="flex items-end justify-between gap-2 p-4">
          {mois.map((m) => (
            <li key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold text-foreground">{m.sessions || ''}</span>
              <span
                aria-hidden="true"
                style={{ height: `${Math.round((m.sessions / max) * 76) + 4}px` }}
                className={
                  'w-full rounded-t-sm ' + (m.sessions > 0 ? 'bg-[var(--ap-400)]' : 'bg-secondary')
                }
              />
              <span className="font-mono text-[10px] uppercase text-[var(--texte-tertiaire)]">{nom(m.month)}</span>
            </li>
          ))}
        </ul>
      )}
      {/* Une barre sans chiffre ne se lit pas : le tableau dit ce que le dessin suggère (CG-11). */}
      <table className="sr-only">
        <caption>Consultations et gains par mois, sur six mois</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Consultations</th>
            <th scope="col">Gains crédités</th>
          </tr>
        </thead>
        <tbody>
          {mois.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.month}</th>
              <td>{m.sessions}</td>
              <td>{xaf(m.earnedXaf)} XAF</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panneau>
  )
}

/** En-tête de page — le motif commun à tous les écrans de la coquille. */
function EnTete({ titre, sousTitre }: { titre: string; sousTitre: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]">
        <LayoutDashboard size={18} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">{titre}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">{sousTitre}</p>
      </span>
    </div>
  )
}

function Grille({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

function Chargement() {
  return (
    <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="ul-shimmer h-[104px] rounded-[10px]" />
      ))}
    </div>
  )
}

function Echec({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-card px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg border border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] text-[var(--erreur-accent)]">
        <AlertTriangle size={24} strokeWidth={1.4} aria-hidden="true" />
      </span>
      <p className="m-0 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">Chiffres indisponibles</p>
      <p className="m-0 max-w-[46ch] text-[13px] leading-[1.55] text-muted-foreground">
        Le serveur n'a pas répondu. Il se réveille parfois lentement après une période d'inactivité.
      </p>
      <Button onClick={onRetry}>Réessayer</Button>
    </div>
  )
}

/** Ligne de liste — deux colonnes de texte et une pastille, sans identité de patient. */
function Ligne({ principal, secondaire, droite }: { principal: string; secondaire: string; droite: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-foreground">{principal}</span>
        <span className="block text-[11px] text-[var(--texte-tertiaire)]">{secondaire}</span>
      </span>
      <span className="shrink-0">{droite}</span>
    </li>
  )
}

function Vide({ texte, action }: { texte: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="m-0 text-[13px] leading-[1.55] text-muted-foreground">{texte}</p>
      {action}
    </div>
  )
}

// ── Soignant ──────────────────────────────────────────────────────────────────────────────────
function TableauSoignant() {
  const bord = useQuery({ queryKey: ['dashboard', 'pro'], queryFn: () => api.professionalDashboard(), retry: false })
  const demandes = useQuery({ queryKey: ['handshakes', 'mine'], queryFn: () => api.myHandshakes(), retry: false })

  if (bord.isPending) return <Chargement />
  if (bord.isError) return <Echec onRetry={() => void bord.refetch()} />

  const enAttente = (demandes.data?.items ?? []).filter((h) => h.status === 'INITIATED')

  return (
    <>
      <Grille>
        <CarteKpi icone={Hourglass} ton="ambre" label="Demandes en attente" valeur={String(enAttente.length)} aide="Poignées de main à confirmer" />
        <CarteKpi icone={Activity} ton="accent" label="Consultations du mois" valeur={String(bord.data.sessionsThisMonth)} aide="Sessions honorées depuis le 1er" />
        <CarteKpi icone={TrendingUp} ton="emeraude" label="Gains disponibles" valeur={xaf(bord.data.earnings.availableXaf)} aide={`XAF · ${xaf(bord.data.earnings.pendingXaf)} en attente`} />
        <CarteKpi
          icone={CheckCircle2}
          label="Taux de confirmation"
          valeur={`${bord.data.confirmationRatePct} %`}
          aide={bord.data.averageRating === null ? 'Aucune note reçue' : `Note moyenne ${bord.data.averageRating} / 5`}
        />
      </Grille>

      <SixMois mois={bord.data.lastSixMonths} />

      <Panneau
        icone={Handshake}
        titre="Demandes en attente"
        sousTitre={enAttente.length > 0 ? `${enAttente.length} poignée(s) de main ouverte(s)` : undefined}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/demandes">Tout voir</Link>
          </Button>
        }
      >
        {demandes.isPending ? (
          <div className="p-4">
            <Spinner />
          </div>
        ) : enAttente.length === 0 ? (
          <Vide
            texte="Aucune demande en attente. Elles arrivent ici dès qu'un patient vous sollicite."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/vitrine">Compléter ma vitrine</Link>
              </Button>
            }
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {enAttente.slice(0, 5).map((h) => (
              <Ligne
                key={h.id}
                /* Aucune identité de patient : le contrat C1 tient dans les deux sens, et une
                   poignée de main non confirmée n'a encore rien ouvert. */
                principal="Demande de consultation"
                secondaire={`Initiée le ${new Date(h.initiatedAt).toLocaleDateString('fr-FR')}`}
                droite={
                  <span className="rounded-full bg-[var(--alerte-fond)] px-2 py-0.5 text-[11px] font-semibold text-[var(--alerte-texte)]">
                    {h.confirmExpiresAt ? 'À confirmer' : 'Ouverte'}
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </Panneau>
    </>
  )
}

// ── Officine ──────────────────────────────────────────────────────────────────────────────────
function TableauOfficine() {
  const officine = useQuery({ queryKey: ['facility', 'mine'], queryFn: () => api.myFacility(), retry: false })
  const id = officine.data?.id
  const bord = useQuery({ queryKey: ['dashboard', 'facility', id], queryFn: () => api.facilityDashboard(id as string), enabled: !!id, retry: false })
  const alertes = useQuery({ queryKey: ['stock', 'alerts', id], queryFn: () => api.stockAlerts(id as string), enabled: !!id, retry: false })
  const reservations = useQuery({ queryKey: ['disclosures', id], queryFn: () => api.facilityDisclosures(id as string), enabled: !!id, retry: false })

  if (officine.isPending) return <Chargement />
  if (officine.isError) return <Echec onRetry={() => void officine.refetch()} />
  if (!officine.data) {
    return (
      <Panneau icone={ShoppingBag} titre="Aucune structure rattachée">
        <Vide
          texte="Les chiffres d'une officine arrivent ici une fois la pharmacie créée ou rejointe."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/pharmacie">Ma pharmacie</Link>
            </Button>
          }
        />
      </Panneau>
    )
  }

  const aServir = (reservations.data?.items ?? []).filter((d) => d.status === 'ACTIVE')
  const nbAlertes = alertes.data?.alerts?.length ?? 0

  return (
    <>
      <Grille>
        <CarteKpi icone={ShoppingBag} ton="ambre" label="Réservations à servir" valeur={String(aServir.length)} aide="Payées, en attente de retrait" />
        <CarteKpi icone={AlertTriangle} ton="rose" label="Alertes de stock" valeur={String(nbAlertes)} aide="Lots périmés ou proches de l'être" />
        <CarteKpi icone={PackageCheck} ton="emeraude" label="Réservations servies" valeur={String(bord.data?.reservationsServed ?? 0)} aide="Depuis l'ouverture de l'officine" />
        <CarteKpi icone={Banknote} label="Gains disponibles" valeur={xaf(bord.data?.earnings.availableXaf ?? 0)} aide={`XAF · ${xaf(bord.data?.earnings.pendingXaf ?? 0)} en attente`} />
      </Grille>

      <Panneau
        icone={ShoppingBag}
        titre="À servir au comptoir"
        sousTitre="Marquez « servie » dès la remise — une réservation expirée compte contre votre fiabilité."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/reservations">Tout voir</Link>
          </Button>
        }
      >
        {aServir.length === 0 ? (
          <Vide texte="Aucune réservation en attente. Votre stock doit être à jour pour apparaître dans les recherches." />
        ) : (
          <ul className="m-0 list-none p-0">
            {aServir.slice(0, 5).map((d) => (
              <Ligne
                key={d.id}
                principal={d.requestedItems.map((i) => i.label ?? i.dci).filter(Boolean).join(' · ') || 'Traitement réservé'}
                secondaire={`Réf. ${d.orderRef}`}
                droite={
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {Math.max(0, Math.floor(d.remainingSeconds / 3600))} h
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </Panneau>
    </>
  )
}

// ── Administration ────────────────────────────────────────────────────────────────────────────
function TableauAdmin() {
  const kpis = useQuery({ queryKey: ['pilot-kpis'], queryFn: () => api.pilotKpis(), retry: false })

  if (kpis.isPending) return <Chargement />
  if (kpis.isError) return <Echec onRetry={() => void kpis.refetch()} />

  const liste = kpis.data ?? []
  const atteints = liste.filter((k) => k.status === 'OK').length

  return (
    <>
      <Grille>
        {liste.slice(0, 4).map((k) => (
          <CarteKpi
            key={k.key}
            icone={k.status === 'OK' ? CheckCircle2 : AlertTriangle}
            ton={k.status === 'OK' ? 'emeraude' : 'ambre'}
            label={k.label}
            valeur={k.unit === '%' ? `${k.value} %` : String(k.value)}
            aide={`Cible : ${k.unit === '%' ? `${k.target} %` : k.target}`}
          />
        ))}
      </Grille>

      <Panneau
        icone={ClipboardList}
        titre="Critères du pilote"
        sousTitre={`${atteints} sur ${liste.length} atteints`}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/pilotage">Pilotage</Link>
          </Button>
        }
      >
        <ul className="m-0 list-none p-0">
          {liste.map((k) => (
            <Ligne
              key={k.key}
              principal={k.label}
              secondaire={`Cible : ${k.unit === '%' ? `${k.target} %` : k.target}`}
              droite={
                <span
                  className={
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                    (k.status === 'OK'
                      ? 'bg-[var(--succes-fond)] text-[var(--succes-texte)]'
                      : 'bg-[var(--alerte-fond)] text-[var(--alerte-texte)]')
                  }
                >
                  {k.unit === '%' ? `${k.value} %` : k.value}
                </span>
              }
            />
          ))}
        </ul>
      </Panneau>
    </>
  )
}

export function DashboardPage() {
  const me = useSessionStore((s) => s.me)

  const aujourdhui = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const titre =
    me?.accountType === 'FACILITY_MEMBER' ? 'Tableau de bord' : me?.accountType === 'ADMIN' ? 'Pilotage ULAMU' : 'Tableau de bord'

  return (
    <div className="ulamu-step-fade">
      <EnTete titre={titre} sousTitre={aujourdhui.charAt(0).toUpperCase() + aujourdhui.slice(1)} />
      {me?.accountType === 'ADMIN' ? <TableauAdmin /> : me?.accountType === 'FACILITY_MEMBER' ? <TableauOfficine /> : <TableauSoignant />}
    </div>
  )
}

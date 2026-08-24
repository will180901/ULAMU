/**
 * C4 — Consultations. D'après `docs/maquettes/C4 - Consultations.dc.html` et M06.
 *
 * Le registre : toutes les séances du soignant, ce qu'il a prescrit, et surtout **ce qu'il doit
 * encore signer**. C'est cette dernière colonne qui fait l'écran — un compte-rendu manquant gèle des
 * gains (RM-06-04) et alerte l'administration au-delà de 24 h (EF-06-08).
 *
 * ── Trois corrections serveur qu'il a fallu faire d'abord ──────────────────────────────────────
 *
 * 1. `prescriptions/me` filtre sur `patientAccountId` : un médecin y récupérait ses ordonnances EN
 *    TANT QUE PATIENT, c'est-à-dire rien. Aucun moyen n'existait pour un prescripteur de relire ce
 *    qu'il avait ordonné. `GET /prescriptions/prescribed` ajouté.
 * 2. La vue d'une ordonnance omettait `sessionId` : impossible de la rattacher à la consultation qui
 *    l'a produite, alors que cet écran les affiche l'une sous l'autre.
 * 3. `care-sessions/mine` renvoie des `SessionListItem` — un sous-ensemble de `CareSession`. Le
 *    client web promettait la séance complète, avec sa pré-consultation et son indicateur de frappe.
 *
 * ── Trois écarts à la maquette ────────────────────────────────────────────────────────────────
 *
 * • **« sous 48 h » → 24 h.** PM-30 vaut 86 400 s. La même erreur que sur C5, au même endroit : le
 *   délai de signature du compte-rendu. C'est celle qui coûte des gains gelés.
 * • **« Exporter » et « Télécharger le PDF » retirés** — aucun endpoint ne produit de document.
 * • **« Suivi en officine » retiré** — la branche pharmacie est hors périmètre (§0 du plan).
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardList, Clock, FileText, Pill, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { api, type CareSessionStatus, type Prescription } from '@/lib/api'

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const ETATS: Record<CareSessionStatus, { libelle: string; ton: TonPilule }> = {
  PREPARING: { libelle: 'En préparation', ton: 'info' },
  ACTIVE: { libelle: 'En cours', ton: 'succes' },
  ENDED: { libelle: 'Terminée', ton: 'neutre' },
  REFUNDED: { libelle: 'Remboursée', ton: 'erreur' },
}

/**
 * « compte-rendu » → « compteS-renduS » : les DEUX mots s'accordent.
 *
 * Écrire « compte-rendus » est une faute, et sur un écran qu'un médecin regarde tous les jours,
 * elle se voit. Le pluriel est donc calculé ici, une fois, plutôt qu'ajouté à la main à chaque
 * endroit — où l'on finit toujours par n'accorder que le dernier mot.
 */
const comptesRendus = (n: number) => (n > 1 ? 'comptes-rendus' : 'compte-rendu')

/** Le délai de signature, dit en heures restantes — c'est ce qui pousse à agir, pas une date. */
function resteASigner(endedAt: string): { heures: number; depasse: boolean } {
  const ecoule = (Date.now() - new Date(endedAt).getTime()) / 3_600_000
  return { heures: Math.max(0, Math.ceil(24 - ecoule)), depasse: ecoule > 24 }
}

export function ConsultationsPage() {
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<'tout' | 'a-signer' | CareSessionStatus>('tout')

  const seances = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => api.mySessions(), retry: false })
  const ordonnances = useQuery({ queryKey: ['prescriptions', 'prescribed'], queryFn: () => api.myPrescribed(), retry: false })

  /** Les ordonnances rangées par séance — c'est `sessionId` qui rend ce regroupement possible. */
  const parSeance = useMemo(() => {
    const m = new Map<string, Prescription[]>()
    for (const o of ordonnances.data?.items ?? []) m.set(o.sessionId, [...(m.get(o.sessionId) ?? []), o])
    return m
  }, [ordonnances.data])

  const items = seances.data?.items ?? []

  /** À signer : terminée, non remboursée, et sans compte-rendu déposé (D-021). */
  const aSigner = items.filter((s) => s.status === 'ENDED' && !s.reportDepositedAt)

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return items.filter((s) => {
      if (filtre === 'a-signer' && !(s.status === 'ENDED' && !s.reportDepositedAt)) return false
      if (filtre !== 'tout' && filtre !== 'a-signer' && s.status !== filtre) return false
      // La recherche porte sur la date et l'identifiant : aucune identité de patient n'est chargée
      // ici, et il n'est pas question d'en réclamer une pour agrémenter un filtre.
      if (!q) return true
      return dateFr(s.paidAt).toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    })
  }, [items, recherche, filtre])

  if (seances.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Chargement du registre…
      </p>
    )
  }

  if (seances.isError) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={AlertTriangle} titre="Le registre n'a pas pu être chargé" sousTitre="Rien n'est perdu">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos comptes-rendus déposés restent intacts côté serveur, et les brouillons en cours vivent
            sur cet appareil : ni les uns ni les autres ne dépendent de cet affichage.
          </p>
          <div>
            <Button type="button" onClick={() => seances.refetch()}>
              Réessayer
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <ClipboardList size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Consultations
          </h1>
          {/*
            La phrase est construite d'un bloc plutôt qu'assemblée par interpolations : découpée en
            « compte-rendu » + « s » + « à déposer », elle devient trois nœuds de texte que ni un
            lecteur d'écran ni une recherche dans la page ne recomposent.
          */}
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {`${items.length} consultation${items.length > 1 ? 's' : ''} · ${aSigner.length} ${comptesRendus(
              aSigner.length,
            )} à déposer`}
          </p>
        </span>
      </div>

      {/*
        Le rappel le plus utile de l'écran, et il ne s'affiche que s'il a lieu d'être. 24 heures, pas
        48 : PM-30 vaut 86 400 s, et au-delà les gains sont GELÉS et l'administration alertée.
      */}
      {aSigner.length > 0 ? (
        <div className="mb-4">
          <Avis ton="erreur">
            {`${aSigner.length} ${comptesRendus(aSigner.length)} en attente. Vous avez `}
            <strong>24 heures</strong> après la fin de chaque consultation pour le déposer — au-delà,
            vos gains sont gelés et l'administration est alertée.
          </Avis>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor="recherche" className="mb-1.5 block text-[13px] font-medium text-foreground">
            Rechercher
          </label>
          <span className="relative block">
            <Search
              size={14}
              strokeWidth={1.6}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="recherche"
              className="pl-8"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Une date, une référence…"
            />
          </span>
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <label htmlFor="filtre" className="mb-1.5 block text-[13px] font-medium text-foreground">
            Afficher
          </label>
          <NativeSelect id="filtre" value={filtre} onChange={(e) => setFiltre(e.target.value as typeof filtre)}>
            <option value="tout">Toutes les consultations</option>
            <option value="a-signer">À signer ({aSigner.length})</option>
            <option value="ACTIVE">En cours</option>
            <option value="ENDED">Terminées</option>
            <option value="REFUNDED">Remboursées</option>
          </NativeSelect>
        </div>
      </div>

      {items.length === 0 ? (
        <Carte icone={ClipboardList} titre="Aucune consultation enregistrée" sousTitre="Votre registre est vide">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos consultations apparaîtront ici dès qu'un patient aura confirmé et payé une demande.
          </p>
          <div>
            <Button asChild size="sm" variant="outline">
              <Link to="/demandes">Voir mes demandes</Link>
            </Button>
          </div>
        </Carte>
      ) : visibles.length === 0 ? (
        <Carte icone={Search} titre="Aucun résultat" sousTitre="Aucune consultation ne correspond">
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setRecherche('')
                setFiltre('tout')
              }}
            >
              Effacer les filtres
            </Button>
          </div>
        </Carte>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((s) => {
            const etat = ETATS[s.status]
            const ordo = parSeance.get(s.id) ?? []
            const manque = s.status === 'ENDED' && !s.reportDepositedAt
            const delai = manque && s.endedAt ? resteASigner(s.endedAt) : null

            return (
              <li key={s.id}>
                <Carte
                  icone={FileText}
                  titre={`Consultation du ${dateFr(s.paidAt)}`}
                  sousTitre={`${s.durationMin} minutes · référence ${s.id.slice(0, 8).toUpperCase()}`}
                  ton={manque ? 'danger' : 'accent'}
                >
                  <p className="flex flex-wrap items-center gap-2">
                    <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
                    {s.reportDepositedAt ? (
                      <Pilule ton="succes">Compte-rendu déposé</Pilule>
                    ) : s.status === 'ENDED' ? (
                      <Pilule ton="erreur">Compte-rendu manquant</Pilule>
                    ) : null}
                    {ordo.length > 0 ? (
                      <Pilule ton="info">
                        {ordo.length} ordonnance{ordo.length > 1 ? 's' : ''}
                      </Pilule>
                    ) : null}
                  </p>

                  {delai ? (
                    <p
                      className={
                        'flex items-center gap-1.5 text-[12px] ' +
                        (delai.depasse ? 'text-[var(--erreur-texte)]' : 'text-[var(--alerte-texte)]')
                      }
                    >
                      <Clock size={13} strokeWidth={1.8} aria-hidden="true" />
                      {delai.depasse
                        ? 'Délai dépassé — vos gains sont gelés jusqu’au dépôt.'
                        : `Il vous reste ${delai.heures} heure${delai.heures > 1 ? 's' : ''} pour déposer le compte-rendu.`}
                    </p>
                  ) : null}

                  {ordo.length > 0 ? (
                    <div className="rounded-md border border-border bg-secondary p-3">
                      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                        <Pill size={12} strokeWidth={1.8} aria-hidden="true" />
                        Lignes prescrites
                      </p>
                      <ul className="flex flex-col gap-1">
                        {ordo.flatMap((o) =>
                          o.lines.map((l) => (
                            <li key={l.id} className="text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
                              {/* Le nom du référentiel, ou le texte libre — jamais un identifiant nu. */}
                              <strong className="text-foreground">{l.medicationName ?? l.freeText ?? 'Ligne libre'}</strong> ·{' '}
                              {l.posology}
                              {l.durationDays ? ` · ${l.durationDays} jours` : ''}
                            </li>
                          )),
                        )}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <Button asChild size="sm" variant={manque ? 'default' : 'outline'}>
                      <Link to={`/consultations/${s.id}`}>
                        {manque ? 'Déposer le compte-rendu' : 'Ouvrir la consultation'}
                      </Link>
                    </Button>
                  </div>
                </Carte>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

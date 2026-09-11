/**
 * Le rail d'informations de la consultation — chantier 83, 11/09/2026.
 *
 * ── Pourquoi des onglets NOMMÉS, et pas deux flèches ◀ ▶ ───────────────────────────────────────
 *
 * Le porteur demandait une bande avec deux flèches pour passer d'une carte à l'autre. Trois raisons
 * de faire autrement, dites avant de coder et retenues par lui :
 *
 *  1. **Des flèches cachent une échéance qui coûte de l'argent.** Le compte-rendu a 24 h (PM-30) et
 *     les gains sont gelés passé ce délai (CU-06-03). Derrière trois clics de flèche, un soignant
 *     peut fermer une consultation sans jamais voir qu'il lui reste six heures. *Une information qui
 *     porte une échéance ne doit jamais dépendre d'un clic.*
 *  2. **Elles disent « il y a autre chose », jamais quoi.** « Y a-t-il une ordonnance ? » doit se
 *     répondre d'un coup d'œil.
 *  3. **Elles imposent un ordre à des choses qui n'en ont pas.** On veut *aller* à l'ordonnance, pas
 *     faire « suivant, suivant, suivant ».
 *
 * Les flèches du porteur sont gardées **au clavier**, où elles sont exactement à leur place : `←` et
 * `→` passent d'un onglet à l'autre. *Une flèche est un excellent raccourci ; c'est un mauvais menu.*
 *
 * ── Ce que l'onglet porte ─────────────────────────────────────────────────────────────────────
 *
 * Une **marque** courte, qui répond à la question sans ouvrir la carte : le temps qui reste sur le
 * compte-rendu, le nombre de lignes prescrites, un cadenas sur un Carnet refermé. Les cartes sans
 * décision à porter (les honoraires, le contexte) n'en ont pas — une marque partout ne marque rien.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type MarqueOnglet = { texte: string; ton?: 'neutre' | 'urgence' | 'succes' }

export type OngletRail = {
  id: string
  nom: string
  marque?: MarqueOnglet
  contenu: ReactNode
}

/**
 * L'onglet choisi est gardé PAR CONSULTATION et par appareil.
 *
 * Par consultation, parce qu'on n'y revient pas pour la même raison : sur celle de ce matin on
 * revient au compte-rendu, sur celle d'hier à l'ordonnance. Et par appareil, parce que ce n'est pas
 * une donnée de soin — elle n'a rien à faire sur le serveur.
 */
const CLE = (session: string) => `ulamu.consultation.onglet.${session}`

function lireSouvenir(session: string): string | null {
  try {
    return localStorage.getItem(CLE(session))
  } catch {
    // Navigation privée, stockage bloqué : on se passe du souvenir, on ne casse pas le rail.
    return null
  }
}

function noterSouvenir(session: string, onglet: string): void {
  try {
    localStorage.setItem(CLE(session), onglet)
  } catch {
    /* sans conséquence */
  }
}

const TONS: Record<NonNullable<MarqueOnglet['ton']>, { fond: string; encre: string }> = {
  neutre: { fond: 'var(--fond-surface-2)', encre: 'var(--texte-secondaire)' },
  urgence: { fond: 'var(--erreur-fond)', encre: 'var(--erreur-texte)' },
  succes: { fond: 'var(--succes-fond)', encre: 'var(--succes-texte)' },
}

export function RailInfos({
  onglets,
  session,
  defaut,
  alerte,
}: {
  onglets: OngletRail[]
  /** L'identifiant de la consultation — c'est lui qui sépare les souvenirs. */
  session: string
  /**
   * L'onglet à ouvrir quand on n'a AUCUN souvenir : ce qui presse.
   *
   * C'est la leçon que ce projet répète depuis dix chantiers — *une capacité doit avoir un chemin* —
   * appliquée à l'attention. Le meilleur chemin, c'est parfois **être déjà là**.
   *
   * ⚠️ Il ne bouscule jamais un choix : un soignant qui a ouvert l'ordonnance et recharge la page
   * doit retrouver l'ordonnance. On n'a pas à savoir mieux que lui ce qu'il regardait.
   */
  defaut?: string
  /**
   * Une bande TOUJOURS visible sous les onglets, quoi qu'on regarde.
   *
   * Elle reçoit `aller` : une alerte qui signale un travail à faire doit pouvoir y conduire, sinon
   * elle ne fait qu'inquiéter. C'est la même règle que partout ici — *une capacité doit avoir un
   * chemin*, et le chemin le plus court part de l'endroit où on apprend la nouvelle.
   */
  alerte?: (aller: (id: string) => void) => ReactNode
}) {
  const prefixe = useId()
  const ids = onglets.map((o) => o.id)
  /* Les dépendances d'effet portent sur cette CHAÎNE, pas sur le tableau : la page reconstruit ses
     onglets à chaque rendu, et un tableau neuf relancerait l'effet sans que rien ait changé. */
  const cles = ids.join('|')

  const [choisi, setChoisi] = useState<string>(() => {
    const souvenir = lireSouvenir(session)
    if (souvenir && ids.includes(souvenir)) return souvenir
    if (defaut && ids.includes(defaut)) return defaut
    return ids[0] ?? ''
  })

  /*
    Les onglets APPARAISSENT et DISPARAISSENT en cours de séance : « Prolonger » s'en va quand le
    crédit d'extension est épuisé, les cartes tombent sur un remboursement. Sans ce garde-fou, le
    rail resterait sur un onglet qui n'existe plus — c'est-à-dire vide, sans rien pour le dire.
  */
  useEffect(() => {
    const presents = cles ? cles.split('|') : []
    if (presents.length > 0 && !presents.includes(choisi)) setChoisi(presents[0])
  }, [cles, choisi])

  const boutons = useRef<Record<string, HTMLButtonElement | null>>({})

  const aller = (id: string) => {
    setChoisi(id)
    noterSouvenir(session, id)
  }

  /*
    ── Les flèches du porteur, à l'endroit où elles sont bonnes ─────────────────────────────────

    Le motif ARIA des onglets : `←`/`→` déplacent la sélection ET le focus, `Début`/`Fin` sautent aux
    extrémités, et la liste boucle. Un seul onglet est atteignable à la tabulation (`tabIndex` 0 sur
    l'actif) — sinon il faudrait six tabulations pour traverser le rail et atteindre son contenu.
  */
  const auClavier = (e: React.KeyboardEvent) => {
    const i = ids.indexOf(choisi)
    if (i < 0) return
    let cible: number | null = null
    if (e.key === 'ArrowRight') cible = (i + 1) % ids.length
    else if (e.key === 'ArrowLeft') cible = (i - 1 + ids.length) % ids.length
    else if (e.key === 'Home') cible = 0
    else if (e.key === 'End') cible = ids.length - 1
    if (cible === null) return
    e.preventDefault()
    const id = ids[cible]
    aller(id)
    boutons.current[id]?.focus()
  }

  if (onglets.length === 0) return null
  const actif = onglets.find((o) => o.id === choisi) ?? onglets[0]

  return (
    <div className="flex min-h-0 w-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        {/*
          `flex-wrap` et non une grille à trois colonnes : le nombre d'onglets change d'une séance à
          l'autre (trois à six). Une grille laisserait un trou à la dernière ligne ; les onglets se
          répartissent d'eux-mêmes.
        */}
        <div
          role="tablist"
          aria-label="Informations de la consultation"
          aria-orientation="horizontal"
          onKeyDown={auClavier}
          className="flex flex-wrap gap-1"
        >
          {onglets.map((o) => {
            const estActif = o.id === actif.id
            const ton = TONS[o.marque?.ton ?? 'neutre']
            return (
              <button
                key={o.id}
                ref={(el) => {
                  boutons.current[o.id] = el
                }}
                type="button"
                role="tab"
                id={`${prefixe}-onglet-${o.id}`}
                aria-selected={estActif}
                aria-controls={`${prefixe}-panneau-${o.id}`}
                tabIndex={estActif ? 0 : -1}
                onClick={() => aller(o.id)}
                className={
                  'flex min-w-0 flex-1 basis-[6.5rem] items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 ' +
                  'transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
                  (estActif
                    ? 'border-[var(--ap-300)] bg-[var(--ap-50)] text-[var(--ap-600)]'
                    : 'border-border bg-card text-[var(--texte-secondaire)] hover:bg-secondary')
                }
              >
                <span className={'truncate text-[11px] ' + (estActif ? 'font-semibold' : 'font-medium')}>
                  {o.nom}
                </span>
                {/*
                  La marque est `aria-hidden` : elle est reprise dans le nom accessible de l'onglet
                  juste en dessous, et l'annoncer deux fois ferait entendre « Compte-rendu 6 h 6 h ».
                */}
                {o.marque ? (
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded px-1 py-px font-mono text-[9.5px] leading-[1.4] tabular-nums"
                    style={{ background: ton.fond, color: ton.encre }}
                  >
                    {o.marque.texte}
                  </span>
                ) : null}
                <span className="sr-only">{o.marque ? ` — ${o.marque.texte}` : ''}</span>
              </button>
            )
          })}
        </div>

        {/*
          ── Le garde-fou : ce qui porte une échéance ne descend jamais dans un onglet ───────────

          Cette bande est HORS des onglets, et visible quoi qu'on regarde. C'est la seule réponse
          honnête au reproche qu'on peut faire à tout système de navigation : il cache. On
          n'accepte pas qu'il cache une échéance qui gèle des gains.
        */}
        {alerte?.(aller)}
      </div>

      <div
        role="tabpanel"
        id={`${prefixe}-panneau-${actif.id}`}
        aria-labelledby={`${prefixe}-onglet-${actif.id}`}
        /*
          Le panneau défile DANS lui-même : le rail est une colonne fixe, et c'est tout l'intérêt du
          chantier — la page ne bouge plus, chaque zone défile chez elle.
        */
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {actif.contenu}
      </div>
    </div>
  )
}

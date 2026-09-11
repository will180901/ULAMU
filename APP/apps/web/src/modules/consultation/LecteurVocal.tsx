/**
 * Le lecteur de note vocale — chantier 90, 11/09/2026.
 *
 * ── Ce qu'il remplace ─────────────────────────────────────────────────────────────────────────
 *
 * Un bouton, un filet de progression de 1 px, une durée. Le porteur a comparé avec son téléphone —
 * où le lecteur montre une onde, se déplace au doigt et change de vitesse — et a demandé le même.
 *
 * ── ⚠️ L'onde est VRAIE ici, et c'est une différence assumée avec le mobile ───────────────────
 *
 * Le lecteur mobile dessine 36 barres **pseudo-aléatoires**, dérivées de la clé du fichier : React
 * Native n'a pas de quoi décoder un son. C'est une décoration qui ressemble à une onde.
 *
 * Le navigateur, lui, sait décoder. On lit donc les **pics réels** du son : on voit où quelqu'un
 * parle et où il se tait, et on peut sauter au passage qui compte. Sur une note vocale de soin,
 * cette information a une valeur — retrouver « la partie où il décrit la douleur » sans réécouter
 * quatre-vingts secondes.
 *
 * **Et quand le décodage échoue** — un codec que ce navigateur ne connaît pas — on affiche des
 * barres ÉGALES, pas une fausse onde. *Un dessin au hasard prétend dire quelque chose du son. Des
 * barres égales n'affirment rien, et sur un écran de soin on préfère ne rien dire à dire faux.*
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

import { formatDuree } from './media'

/** 36 barres, comme le mobile : la même densité, donc la même lecture d'un coup d'œil. */
const BARRES = 36

/** Les vitesses offertes, dans l'ordre du cycle. Celles du mobile, pour ne pas dérouter. */
const VITESSES = [1, 1.5, 2] as const

const libelleVitesse = (v: number): string => (v === 1 ? '1×' : v === 1.5 ? '1,5×' : '2×')

/**
 * Les pics réels du son, ramenés à `BARRES` valeurs entre 0,12 et 1.
 *
 * Le plancher à 0,12 : une barre de hauteur nulle disparaît, et un silence deviendrait un trou dans
 * l'onde — on ne saurait plus si le son est silencieux ou si le lecteur est cassé.
 *
 * Rend `null` si le navigateur ne sait pas décoder ce format : l'appelant affiche alors des barres
 * égales plutôt qu'une onde inventée.
 */
async function picsDuSon(url: string): Promise<number[] | null> {
  try {
    const Contexte: typeof AudioContext | undefined =
      window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Contexte) return null

    const donnees = await fetch(url).then((r) => r.arrayBuffer())
    const contexte = new Contexte()
    const son = await contexte.decodeAudioData(donnees)
    const echantillons = son.getChannelData(0)
    void contexte.close()

    const parBarre = Math.floor(echantillons.length / BARRES)
    if (parBarre < 1) return null

    const bruts: number[] = []
    for (let i = 0; i < BARRES; i += 1) {
      let sommet = 0
      for (let j = 0; j < parBarre; j += 1) {
        const v = Math.abs(echantillons[i * parBarre + j] ?? 0)
        if (v > sommet) sommet = v
      }
      bruts.push(sommet)
    }

    // Normalisé sur le pic le plus fort : une note enregistrée loin du micro reste lisible.
    const plafond = Math.max(...bruts)
    if (!Number.isFinite(plafond) || plafond <= 0) return null
    return bruts.map((v) => 0.12 + (v / plafond) * 0.88)
  } catch {
    // Codec inconnu, fichier illisible, contexte audio refusé : on dégrade, on ne perd pas.
    return null
  }
}

export function LecteurVocal({
  url,
  aMoi = false,
  dureeAnnoncee,
}: {
  url: string
  /** Bulle « mienne » : l'onde doit porter sur un fond teinté, pas sur le fond de carte. */
  aMoi?: boolean
  /**
   * La durée en secondes, telle que l'expéditeur l'a envoyée (`body` d'un message VOICE).
   *
   * Elle sert AVANT que le son soit chargé : sans elle, le lecteur afficherait « — » le temps du
   * téléchargement, et on ne saurait pas si la note dure cinq secondes ou deux minutes.
   */
  dureeAnnoncee?: number | null
}) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const onde = useRef<HTMLDivElement | null>(null)
  const [joue, setJoue] = useState(false)
  const [position, setPosition] = useState(0)
  const [duree, setDuree] = useState<number | null>(dureeAnnoncee ?? null)
  const [pics, setPics] = useState<number[] | null>(null)
  const [vitesse, setVitesse] = useState<number>(1)

  useEffect(() => {
    let vivant = true
    void picsDuSon(url).then((p) => {
      if (vivant) setPics(p)
    })
    return () => {
      vivant = false
    }
  }, [url])

  const fraction = duree && duree > 0 ? Math.min(1, position / duree) : 0

  /** Se déplacer dans la note en cliquant l'onde — le geste qu'on tente d'instinct. */
  const allerA = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = onde.current
      const son = audio.current
      if (!el || !son || !duree) return
      const r = el.getBoundingClientRect()
      const part = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      son.currentTime = part * duree
      setPosition(part * duree)
    },
    [duree],
  )

  const changerVitesse = () => {
    const suivante = VITESSES[(VITESSES.indexOf(vitesse as (typeof VITESSES)[number]) + 1) % VITESSES.length]
    setVitesse(suivante)
    if (audio.current) audio.current.playbackRate = suivante
  }

  const encre = aMoi ? 'var(--ap-600)' : 'var(--ap-400)'
  const encreEteinte = aMoi ? 'color-mix(in srgb, var(--ap-600) 30%, transparent)' : 'var(--bordure-normale)'

  return (
    <span className="flex w-full max-w-[300px] items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-1.5">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          // La durée annoncée reste si le navigateur ne sait pas mesurer (flux sans en-tête).
          if (Number.isFinite(d) && d > 0) setDuree(d)
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => {
          setJoue(false)
          setPosition(0)
        }}
        className="sr-only"
      />

      <button
        type="button"
        aria-label={joue ? 'Mettre en pause' : 'Écouter la note vocale'}
        onClick={() => {
          const el = audio.current
          if (!el) return
          if (joue) {
            el.pause()
            setJoue(false)
          } else {
            el.playbackRate = vitesse
            void el
              .play()
              .then(() => setJoue(true))
              .catch(() => setJoue(false))
          }
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ap-400)] text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {joue ? <Pause size={13} strokeWidth={2} aria-hidden="true" /> : <Play size={13} strokeWidth={2} aria-hidden="true" />}
      </button>

      {/*
        L'onde. `aria-hidden` : la durée juste à côté dit tout ce qu'un lecteur d'écran doit
        entendre, et le déplacement reste possible par les contrôles natifs de l'élément audio.
      */}
      <div
        ref={onde}
        aria-hidden="true"
        onClick={allerA}
        className="flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-[2px]"
      >
        {Array.from({ length: BARRES }, (_, i) => {
          // Sans pics décodés : des barres ÉGALES. On n'invente pas une onde.
          const hauteur = pics ? pics[i] : 0.34
          const passee = i / BARRES < fraction
          return (
            <span
              key={i}
              className="min-w-0 flex-1 rounded-full"
              style={{
                height: `${Math.round(hauteur * 22)}px`,
                background: passee ? encre : encreEteinte,
              }}
            />
          )
        })}
      </div>

      <span className="shrink-0 t-code-sm tabular-nums text-[var(--texte-tertiaire)]">
        {duree === null ? '—' : formatDuree(joue || position > 0 ? duree - position : duree)}
      </span>

      {/*
        La vitesse — reprise du lecteur mobile, mêmes paliers, même libellé. Une note vocale de deux
        minutes se réécoute souvent pour retrouver une phrase : doubler la vitesse est le geste
        qu'on fait vraiment.
      */}
      <button
        type="button"
        onClick={changerVitesse}
        aria-label={`Vitesse de lecture : ${libelleVitesse(vitesse)}. Changer`}
        className="shrink-0 rounded-full px-1.5 py-0.5 t-code-sm tabular-nums text-[var(--texte-secondaire)] transition-colors hover:bg-[var(--fond-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {libelleVitesse(vitesse)}
      </button>
    </span>
  )
}

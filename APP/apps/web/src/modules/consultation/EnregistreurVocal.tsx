/**
 * L'enregistreur de note vocale — chantier 75, 11/09/2026.
 *
 * ── Pourquoi cet écran existait déjà sans exister ──────────────────────────────────────────────
 *
 * Le serveur ULAMU accepte le type de message **`VOICE`** depuis le premier jour, et son envoi de
 * média accepte six formats audio. Le web n'envoyait que du texte et des photos : **dixième
 * occurrence** du motif « la capacité existe, l'écran ne l'offre pas ».
 *
 * ── La forme, reprise de la messagerie CMS-SARIS ───────────────────────────────────────────────
 *
 * Un seul geste pour envoyer. Pas d'étape de relecture : on appuie, on parle, on appuie sur
 * l'avion — l'enregistrement s'arrête ET part. La corbeille annule. C'est la convention de toutes
 * les messageries, et c'est ce qui rend une note vocale plus rapide qu'un message écrit ; une étape
 * de relecture la rendrait plus LENTE, et personne ne s'en servirait.
 *
 * Pendant l'enregistrement : un chrono, et une **onde d'amplitude** qui bouge avec la voix. L'onde
 * n'est pas une décoration — c'est la seule preuve visible que le micro capte vraiment quelque
 * chose. Sans elle, on découvre le silence à la lecture.
 *
 * ── ⚠️ Le format, vérifié sur un vrai navigateur ───────────────────────────────────────────────
 *
 * `MediaRecorder` produit du `audio/webm` sur Chromium, et **le serveur ne l'accepte pas**. Le
 * format commun est `audio/mp4` (Chromium, Safari) ou `audio/ogg` (Firefox) — voir `mimeVocal()`.
 * Quand aucun ne convient, le micro est **désactivé avec sa raison**, jamais silencieusement.
 */
import { useEffect, useRef, useState } from 'react'
import { Mic, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatDuree, mimeVocal, VOCAL_MAX_S } from './media'

/** Nombre de barres de l'onde. Assez pour voir la voix bouger, assez peu pour tenir dans la barre. */
const BARRES = 32
/** Période d'échantillonnage de l'amplitude. 80 ms : l'œil voit bouger, le processeur ne chauffe pas. */
const ECHANTILLON_MS = 80

export function EnregistreurVocal({
  onAnnuler,
  onEnvoyer,
  enCours,
}: {
  onAnnuler: () => void
  /** Le fichier prêt à partir, avec le mime que le SERVEUR accepte (pas celui du navigateur). */
  onEnvoyer: (f: File) => void
  enCours: boolean
}) {
  const [secondes, setSecondes] = useState(0)
  const [niveaux, setNiveaux] = useState<number[]>(() => new Array(BARRES).fill(0))
  const [erreur, setErreur] = useState<string | null>(null)
  const [pret, setPret] = useState(false)

  const enregistreur = useRef<MediaRecorder | null>(null)
  const morceaux = useRef<Blob[]>([])
  const flux = useRef<MediaStream | null>(null)
  const contexte = useRef<AudioContext | null>(null)
  const minuteur = useRef<number | null>(null)
  const sonde = useRef<number | null>(null)
  /* `true` = l'arrêt doit ENVOYER. `false` = il doit jeter. Posé AVANT `stop()`, lu dans `onstop` :
     c'est le seul moyen de distinguer les deux dans le même événement. */
  const envoyerAuStop = useRef(false)

  const format = mimeVocal()

  /** Tout relâcher : le micro doit s'éteindre, sans quoi la pastille du navigateur reste allumée. */
  const toutArreter = () => {
    if (minuteur.current !== null) window.clearInterval(minuteur.current)
    if (sonde.current !== null) window.clearInterval(sonde.current)
    minuteur.current = null
    sonde.current = null
    flux.current?.getTracks().forEach((t) => t.stop())
    flux.current = null
    void contexte.current?.close().catch(() => undefined)
    contexte.current = null
  }

  useEffect(() => {
    if (!format) {
      setErreur("Ce navigateur ne sait produire aucun format audio accepté. Utilisez le texte ou une photo.")
      return
    }
    let vivant = true

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((f) => {
        if (!vivant) {
          f.getTracks().forEach((t) => t.stop())
          return
        }
        flux.current = f

        // ── L'onde : on lit l'amplitude du micro, pas le fichier encodé ──────────────────────
        const ctx = new AudioContext()
        contexte.current = ctx
        const analyseur = ctx.createAnalyser()
        analyseur.fftSize = 512
        ctx.createMediaStreamSource(f).connect(analyseur)
        const tampon = new Uint8Array(analyseur.frequencyBinCount)
        sonde.current = window.setInterval(() => {
          analyseur.getByteTimeDomainData(tampon)
          // Écart quadratique moyen autour de 128 (le silence) → un niveau entre 0 et 1.
          let somme = 0
          for (const v of tampon) somme += (v - 128) * (v - 128)
          const niveau = Math.min(1, Math.sqrt(somme / tampon.length) / 48)
          setNiveaux((n) => [...n.slice(1), niveau])
        }, ECHANTILLON_MS)

        const rec = new MediaRecorder(f, { mimeType: format.enregistrement })
        enregistreur.current = rec
        morceaux.current = []
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) morceaux.current.push(e.data)
        }
        rec.onstop = () => {
          const doitEnvoyer = envoyerAuStop.current
          const blob = new Blob(morceaux.current, { type: format.envoi })
          toutArreter()
          if (!doitEnvoyer || blob.size === 0) return
          /* Le nom porte l'extension du mime SERVEUR, pas celle du conteneur du navigateur : c'est
             ce nom qui se retrouvera dans le stockage. */
          const ext = format.envoi === 'audio/ogg' ? 'ogg' : 'm4a'
          onEnvoyer(new File([blob], `note-vocale.${ext}`, { type: format.envoi }))
        }
        rec.start()
        setPret(true)

        minuteur.current = window.setInterval(() => {
          setSecondes((s) => {
            // Le plafond ENVOIE au lieu de jeter : deux minutes de parole perdues seraient cruelles.
            if (s + 1 >= VOCAL_MAX_S) {
              envoyerAuStop.current = true
              try {
                rec.stop()
              } catch {
                /* déjà arrêté */
              }
              return VOCAL_MAX_S
            }
            return s + 1
          })
        }, 1000)
      })
      .catch(() => {
        if (vivant) setErreur("Le micro n'est pas accessible. Vérifiez l'autorisation du navigateur.")
      })

    return () => {
      vivant = false
      // Démontage = abandon : on ne part jamais avec un enregistrement que personne n'a validé.
      envoyerAuStop.current = false
      try {
        if (enregistreur.current?.state === 'recording') enregistreur.current.stop()
      } catch {
        /* déjà arrêté */
      }
      toutArreter()
    }
    // Une seule fois : le micro s'ouvre au montage et se ferme au démontage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const arreterEt = (envoyer: boolean) => {
    envoyerAuStop.current = envoyer
    try {
      if (enregistreur.current?.state === 'recording') enregistreur.current.stop()
    } catch {
      /* déjà arrêté */
    }
    if (!envoyer) onAnnuler()
  }

  if (erreur) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] px-3.5 py-2">
        <p className="min-w-0 flex-1 ul-aide" style={{ color: 'var(--erreur-texte)' }}>
          {erreur}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onAnnuler}>
          Fermer
        </Button>
      </div>
    )
  }

  const restant = VOCAL_MAX_S - secondes

  return (
    <div
      role="group"
      aria-label="Enregistrement d'une note vocale"
      className="flex items-center gap-2 rounded-[18px] border border-[var(--alerte-bordure)] bg-[var(--alerte-fond)] px-3 py-1.5"
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Annuler l'enregistrement"
        onClick={() => arreterEt(false)}
        disabled={enCours}
      >
        <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
      </Button>

      {/* Le chrono en chasse fixe : sans elle, le compteur saute de largeur à chaque seconde. */}
      <span className="t-code-sm tabular-nums" style={{ color: 'var(--alerte-texte)' }} aria-live="off">
        {formatDuree(secondes)}
      </span>

      {/* L'onde. `aria-hidden` : le chrono dit déjà où on en est, et une suite de barres n'a aucun
          sens à l'oreille d'un lecteur d'écran. */}
      <span aria-hidden="true" className="flex min-w-0 flex-1 items-center justify-center gap-[2px]">
        {niveaux.map((n, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full transition-[height] duration-100"
            style={{
              height: `${Math.max(3, Math.round(n * 22))}px`,
              background: pret ? 'var(--alerte-accent)' : 'var(--bordure-normale)',
            }}
          />
        ))}
      </span>

      {/* Les dix dernières secondes se disent : on ne se fait pas couper sans prévenir. */}
      {restant <= 10 ? (
        <span className="t-code-sm tabular-nums" style={{ color: 'var(--erreur-texte)' }}>
          −{restant}s
        </span>
      ) : null}

      <Button
        type="button"
        size="icon"
        className="rounded-full"
        aria-label="Arrêter et envoyer la note vocale"
        onClick={() => arreterEt(true)}
        disabled={!pret || enCours || secondes < 1}
      >
        {enCours ? <Spinner className="size-4" /> : <Send size={16} strokeWidth={1.6} aria-hidden="true" />}
      </Button>
    </div>
  )
}

/** Le bouton qui ouvre l'enregistreur — désactivé, avec sa raison, quand le micro ne peut pas servir. */
export function BoutonMicro({ onOuvrir, disabled }: { onOuvrir: () => void; disabled: boolean }) {
  const possible = mimeVocal() !== null
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label="Enregistrer une note vocale"
      title={possible ? 'Enregistrer une note vocale' : "Ce navigateur ne sait produire aucun format audio accepté"}
      onClick={onOuvrir}
      disabled={disabled || !possible}
    >
      <Mic size={16} strokeWidth={1.6} aria-hidden="true" />
    </Button>
  )
}

/**
 * L'aperçu des photos avant envoi — chantier 75, 11/09/2026.
 *
 * ── Les deux défauts qu'il corrige ─────────────────────────────────────────────────────────────
 *
 * **1. On envoyait à l'aveugle.** Choisir un fichier l'expédiait immédiatement. Dans une
 * consultation, la photo est un acte médical : on veut voir ce qu'on transmet avant de le
 * transmettre, et pouvoir renoncer.
 *
 * **2. La limite se découvrait par l'échec.** Le serveur refuse au-delà de 8 Mo, et l'écran n'en
 * disait rien : un fichier de 20 Mo traversait le réseau en entier avant d'être rejeté. Ici, le
 * poids est affiché AVANT, et un fichier trop lourd est signalé avec son poids et la limite.
 *
 * ── L'album, que le serveur acceptait déjà ─────────────────────────────────────────────────────
 *
 * `SendMessageDto` accepte **`fileKeys`, jusqu'à dix clés dans une seule bulle** — et le client web
 * ne déclarait même pas le champ. Le fil, lui, savait déjà les afficher (`mediaKeys`). Une
 * capacité complète, des deux côtés, à laquelle rien ne menait.
 *
 * ── La compression ────────────────────────────────────────────────────────────────────────────
 *
 * Faite au moment de l'ENVOI, pas de la sélection : on affiche le poids réel du fichier choisi
 * (c'est celui que l'utilisateur reconnaît), et on allège juste avant de partir. Compresser
 * d'abord afficherait un poids que personne ne retrouve dans son téléphone.
 */
import { useEffect, useState } from 'react'
import { Plus, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Avis } from '@/components/ulamu/parts'
import { formatOctets, LIMITE_OCTETS, MIMES_IMAGE, PHOTOS_MAX, refusDEnvoi } from './media'

/** Une photo retenue, avec l'URL de son aperçu — libérée au retrait et au démontage. */
interface Choisie {
  fichier: File
  url: string
  refus: string | null
}

export function ApercuMedias({
  fichiers,
  onFermer,
  onEnvoyer,
  enCours,
}: {
  /** La première sélection, venue du sélecteur de fichiers de la barre de saisie. */
  fichiers: File[]
  onFermer: () => void
  onEnvoyer: (f: File[]) => void
  enCours: boolean
}) {
  const [choisies, setChoisies] = useState<Choisie[]>([])

  useEffect(() => {
    const nouvelles = fichiers.slice(0, PHOTOS_MAX).map((f) => ({
      fichier: f,
      url: URL.createObjectURL(f),
      refus: refusDEnvoi(f),
    }))
    setChoisies(nouvelles)
    return () => nouvelles.forEach((c) => URL.revokeObjectURL(c.url))
  }, [fichiers])

  const ajouter = (liste: FileList | null) => {
    if (!liste) return
    setChoisies((actuelles) => {
      const place = PHOTOS_MAX - actuelles.length
      const ajoutees = Array.from(liste)
        .slice(0, Math.max(0, place))
        .map((f) => ({ fichier: f, url: URL.createObjectURL(f), refus: refusDEnvoi(f) }))
      return [...actuelles, ...ajoutees]
    })
  }

  const retirer = (i: number) =>
    setChoisies((actuelles) => {
      const partante = actuelles[i]
      if (partante) URL.revokeObjectURL(partante.url)
      return actuelles.filter((_, j) => j !== i)
    })

  const refusees = choisies.filter((c) => c.refus !== null)
  const bonnes = choisies.filter((c) => c.refus === null)
  const poidsTotal = bonnes.reduce((t, c) => t + c.fichier.size, 0)

  return (
    <div
      role="group"
      aria-label="Photos à envoyer"
      className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 ul-titre-panneau">
          {choisies.length} {choisies.length > 1 ? 'photos' : 'photo'} à envoyer
        </span>
        {/* Le poids total, dit AVANT : c'est tout l'objet de cet écran. */}
        <span className="t-code-sm text-[var(--texte-tertiaire)]">{formatOctets(poidsTotal)}</span>
        <Button type="button" size="icon" variant="ghost" aria-label="Annuler l'envoi" onClick={onFermer} disabled={enCours}>
          <X size={16} strokeWidth={1.6} aria-hidden="true" />
        </Button>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {choisies.map((c, i) => (
          <li key={c.url} className="relative">
            <img
              src={c.url}
              alt={`Aperçu ${i + 1}`}
              className={
                'size-24 rounded-md border object-cover ' +
                (c.refus ? 'border-[var(--erreur-bordure)] opacity-60' : 'border-border')
              }
            />
            <button
              type="button"
              aria-label={`Retirer la photo ${i + 1}`}
              onClick={() => retirer(i)}
              disabled={enCours}
              className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground"
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="mt-0.5 block text-center t-code-sm text-[var(--texte-tertiaire)]">
              {formatOctets(c.fichier.size)}
            </span>
          </li>
        ))}

        {choisies.length < PHOTOS_MAX ? (
          <li>
            <label className="flex size-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-[var(--bordure-normale)] text-[var(--texte-tertiaire)]">
              <Plus size={18} strokeWidth={1.6} aria-hidden="true" />
              <span className="sr-only">Ajouter une photo</span>
              <input
                type="file"
                accept={MIMES_IMAGE.join(',')}
                multiple
                className="sr-only"
                disabled={enCours}
                onChange={(e) => {
                  ajouter(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </li>
        ) : null}
      </ul>

      {/*
        ⚠️ Le refus est dit AVEC le poids et la limite. « Fichier trop volumineux » n'apprend rien ;
        « 12,4 Mo — maximum 8,0 Mo par fichier » dit quoi faire.
      */}
      {refusees.length > 0 ? (
        <Avis ton="erreur">
          {refusees.length === 1
            ? refusees[0]!.refus
            : `${refusees.length} fichiers ne peuvent pas être envoyés — maximum ${formatOctets(LIMITE_OCTETS)} par fichier, images uniquement.`}
        </Avis>
      ) : null}

      {choisies.length >= PHOTOS_MAX ? (
        <p className="ul-aide">Dix photos au maximum dans un même message.</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onFermer} disabled={enCours}>
          Annuler
        </Button>
        <Button
          type="button"
          onClick={() => onEnvoyer(bonnes.map((c) => c.fichier))}
          disabled={enCours || bonnes.length === 0}
        >
          {enCours ? <Spinner className="size-4" /> : <Send size={16} strokeWidth={1.6} aria-hidden="true" />}
          Envoyer {bonnes.length > 1 ? `les ${bonnes.length} photos` : 'la photo'}
        </Button>
      </div>
    </div>
  )
}

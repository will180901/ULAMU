/**
 * Le décompte du code TOTP — chantier 34, 02/09/2026.
 *
 * Demandé par le porteur : *« mettre sur les interfaces un compte en direct pour permettre aux
 * utilisateurs de voir le délai de chaque code »*.
 *
 * ── Ce qu'il dit, et ce qu'il se garde de dire ────────────────────────────────────────────────
 *
 * Il annonce **« Nouveau code dans N s »**, jamais « ce code expire dans N s ».
 *
 * La nuance n'est pas de style, elle est de fait : `verifyTotp` tolère ±1 pas — le serveur accepte
 * donc le code PRÉCÉDENT, l'actuel et le suivant. Un code affiché sur un téléphone reste valable
 * jusqu'à la fin du pas suivant, soit jusqu'à 60 secondes.
 *
 * Annoncer une expiration ferait donc **attendre inutilement** quelqu'un qui a déjà, sous les yeux,
 * un code parfaitement accepté. C'est la faute du chantier 13, à l'envers : une phrase juste sur la
 * règle (« un code a une durée de vie ») et fausse sur le nombre.
 *
 * Ce que le décompte apporte vraiment : savoir s'il faut **attendre deux secondes** plutôt que de
 * commencer à taper un code qui va changer sous les doigts.
 *
 * ── Pourquoi il interroge le serveur ──────────────────────────────────────────────────────────
 *
 * `30 - (Date.now()/1000) % 30` tenait en une ligne, sans appel réseau. Et il aurait été **déphasé**
 * de tout l'écart entre l'horloge du navigateur et l'heure réelle — un poste partagé mal réglé
 * affichant « 25 s » quand le téléphone vient de basculer.
 *
 * L'écran aurait alors donné une seconde vérité sur le même instant, contredite par l'appareil que
 * l'utilisateur a en main. C'est la règle que `useDecompteurServeur` énonce depuis le début : *« Le
 * temps du serveur fait foi ; les horloges clients sont indicatives. »*
 *
 * Un seul appel au montage suffit : la dérive d'une horloge pendant les quelques minutes d'une
 * saisie est négligeable, et on ne va pas interroger le serveur chaque seconde pour un confort.
 *
 * ── Ce qu'il fait quand il ne sait pas ────────────────────────────────────────────────────────
 *
 * **Il ne s'affiche pas.** Ni « — », ni un anneau figé, ni zéro. Un décompte faux est pire que pas
 * de décompte : celui-ci sert à décider s'il faut attendre, et un chiffre inventé ferait attendre
 * pour rien ou taper trop tard.
 *
 * C'est le principe du plan : *on lit un chiffre du serveur, ou on ne l'affiche pas.*
 */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Le rythme, ancré sur la réponse du serveur.
 *
 * On égrène les secondes localement ENTRE deux réponses — comme `useDecompteurServeur` — mais avec
 * une différence : ce décompte **boucle**. Arrivé à zéro, un nouveau pas commence, et il repart de
 * la période entière. D'où le modulo plutôt qu'un plancher.
 */
function useRythmeTotp(): { restant: number; periode: number } | null {
  const rythme = useQuery({
    queryKey: ['totp', 'rythme'],
    queryFn: () => api.rythmeTotp(),
    /* Le rythme ne change jamais : une seule lecture par montage d'écran, et aucune relance
       automatique — ni au retour sur l'onglet, ni au remontage d'un composant frère. */
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const [recuA] = useState(() => Date.now())
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!rythme.data) return null

  const { periodeSecondes, secondesAvantNouveauCode } = rythme.data
  if (periodeSecondes <= 0) return null

  /*
    L'écoulé est planché à zéro pour la même raison qu'en `useDecompteurServeur` : `recuA` est posé
    au premier rendu, la réponse arrive après, et l'écart serait alors négatif — le décompte
    afficherait une seconde de PLUS que ce que le serveur a dit.
  */
  const ecoule = Math.max(0, Math.floor((maintenant - recuA) / 1000))

  /*
    Le modulo fait boucler. `+ periode` avant le modulo évite un reste négatif : en JavaScript,
    (-1 % 30) vaut -1, et non 29. Le décompte afficherait alors une valeur négative à la bascule.
  */
  const restant = ((secondesAvantNouveauCode - ecoule) % periodeSecondes + periodeSecondes) % periodeSecondes

  return { restant: restant === 0 ? periodeSecondes : restant, periode: periodeSecondes }
}

export function DecompteTotp() {
  const rythme = useRythmeTotp()

  // Rien à dire plutôt qu'un chiffre inventé — voir l'en-tête.
  if (!rythme) return null

  const { restant, periode } = rythme
  const proportion = restant / periode
  /* Sous cinq secondes, on prévient : commencer à taper maintenant, c'est taper un code périmé au
     milieu de la saisie. Le seuil est en secondes ABSOLUES et non en proportion — ce qui compte est
     le temps qu'il faut pour taper six chiffres, pas une fraction de la période. */
  const presse = restant <= 5

  return (
    <p
      /* `status` et non `timer` : le rôle ARIA `timer` fait relire la valeur à chaque changement,
         soit une annonce par seconde — insupportable au lecteur d'écran. `aria-live="off"` laisse la
         phrase consultable à la demande, sans l'imposer. */
      role="status"
      aria-live="off"
      className="m-0 flex items-center gap-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]"
    >
      {/* L'anneau est décoratif : la phrase à côté porte toute l'information (CG-11 — jamais la
          couleur ni la forme seules). */}
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
        <circle
          cx="7"
          cy="7"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 6}
          strokeDashoffset={2 * Math.PI * 6 * (1 - proportion)}
          transform="rotate(-90 7 7)"
        />
      </svg>
      <span className={presse ? 'font-medium text-[var(--alerte-texte)]' : undefined}>
        {presse ? `Nouveau code dans ${restant} s — attendez-le` : `Nouveau code dans ${restant} s`}
      </span>
    </p>
  )
}

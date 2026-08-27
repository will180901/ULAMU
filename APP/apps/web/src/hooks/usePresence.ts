/**
 * Présence du professionnel — EF-05-05/06, CU-05-04, PM-26.
 *
 * ── Pourquoi ce hook est le tout premier chantier de la reconstruction ─────────────────────────
 *
 * Sans lui, `isAvailableForInitiation` renvoie `false` côté serveur : le bouton « initier » du
 * patient reste gris, aucune poignée de main ne peut commencer, et **aucune démonstration n'est
 * possible**. Tout le reste de l'application en dépend.
 *
 * ── Ce que fait le battement de cœur ──────────────────────────────────────────────────────────
 *
 * Le serveur ne croit pas un « en ligne » sur parole : il exige un battement plus frais que PM-26
 * (900 s = 15 min). Un ONLINE rassis vaut OFFLINE, évalué à CHAQUE lecture — c'est la règle
 * « on ne paie jamais un absent » (RM-05-04).
 *
 * On bat donc toutes les 5 minutes, soit trois fois par fenêtre PM-26 : deux battements peuvent se
 * perdre (réseau coupé, API endormie sur le plan gratuit) sans que le médecin bascule en absent.
 * Battre à 14 minutes aurait été « juste assez » — donc jamais assez.
 *
 * ── Ce qui ARRÊTE le battement, volontairement ────────────────────────────────────────────────
 *
 * L'onglet fermé, la machine en veille : plus de battement, et le serveur bascule tout seul en
 * absent au bout de PM-26. C'est le comportement voulu, pas une limite. Un médecin qui a fermé son
 * navigateur N'EST PAS joignable, et le laisser afficher « en ligne » ferait payer un patient pour
 * une consultation que personne n'ouvrira.
 *
 * En revanche, on bat immédiatement au RETOUR de l'onglet : quelqu'un qui revient après une réunion
 * doit redevenir joignable tout de suite, sans attendre le prochain tour d'horloge.
 *
 * « Ne pas déranger » est un choix explicite : le battement le rafraîchit mais ne le réveille pas
 * (le serveur s'en charge — EF-05-05). On ne le contourne donc pas ici.
 */
import { useCallback, useEffect, useState } from 'react'
import { api, type OwnPresence, type PresenceState } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

/** 5 min. Trois battements par fenêtre PM-26 (15 min) : deux peuvent se perdre sans conséquence. */
const PERIODE_BATTEMENT_MS = 5 * 60 * 1000

export interface PresenceCourante {
  presence: OwnPresence | null
  /** Le premier chargement est en cours — l'écran affiche une pastille neutre, jamais un faux état. */
  chargement: boolean
  /** `null` tant que tout va bien. Renseigné, l'écran doit le DIRE et non afficher « en ligne ». */
  erreur: string | null
  changerEtat: (state: PresenceState) => Promise<void>
}

export function usePresence(): PresenceCourante {
  const estPro = useSessionStore((s) => s.me?.accountType === 'PROFESSIONAL')
  const [presence, setPresence] = useState<OwnPresence | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  // Le battement renvoie la vue SANS le plafond (contrat serveur : seul `GET /presence/me` le
  // porte). On conserve donc le plafond déjà connu au lieu de le perdre à chaque battement.
  const appliquer = useCallback((v: { state: PresenceState; since: string; lastHeartbeatAt: string; availableForInitiation: boolean }) => {
    setPresence((precedent) => ({
      ...v,
      maxConcurrentSessions: precedent?.maxConcurrentSessions ?? 0,
    }))
  }, [])

  useEffect(() => {
    if (!estPro) {
      setChargement(false)
      return
    }
    let vivant = true

    const battre = async () => {
      try {
        const v = await api.presenceHeartbeat()
        if (vivant) {
          appliquer(v)
          setErreur(null)
        }
      } catch (e) {
        // Un battement perdu n'est pas un incident : il en reste deux avant PM-26. On le dit à
        // l'écran seulement si la lecture initiale a, elle aussi, échoué.
        if (vivant) setErreur(e instanceof Error ? e.message : 'Présence indisponible')
      }
    }

    // Premier appel : `GET /presence/me` d'abord, parce que lui seul porte PM-27 ; puis on bat
    // pour se déclarer joignable dès l'ouverture de l'onglet.
    void (async () => {
      try {
        const v = await api.myPresence()
        if (!vivant) return
        setPresence(v)
        setErreur(null)
      } catch (e) {
        if (vivant) setErreur(e instanceof Error ? e.message : 'Présence indisponible')
      } finally {
        if (vivant) setChargement(false)
      }
      await battre()
    })()

    const horloge = window.setInterval(() => void battre(), PERIODE_BATTEMENT_MS)

    // Retour de l'onglet : on bat tout de suite. `setInterval` est suspendu ou ralenti par les
    // navigateurs sur un onglet caché — sans ceci, revenir après une heure laisserait le médecin
    // « absent » jusqu'au prochain tour.
    const surVisibilite = () => {
      if (document.visibilityState === 'visible') void battre()
    }
    document.addEventListener('visibilitychange', surVisibilite)

    return () => {
      vivant = false
      window.clearInterval(horloge)
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [estPro, appliquer])

  const changerEtat = useCallback(async (state: PresenceState) => {
    try {
      const v = await api.setPresence(state)
      appliquer(v)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le changement d'état a échoué")
      // On NE bascule pas l'affichage : mieux vaut montrer l'état réel du serveur qu'un état
      // souhaité. Un médecin qui se croit « ne pas déranger » alors qu'il est joignable recevrait
      // des demandes sans comprendre pourquoi.
    }
  }, [appliquer])

  return { presence, chargement, erreur, changerEtat }
}

/**
 * Combien de consultations je mène EN CE MOMENT — pour le plafond PM-27 (EF-06-14).
 *
 * ── Pourquoi ce compte est fait ici, et pas côté serveur ──────────────────────────────────────
 *
 * Le plafond lui-même (PM-27) vient du serveur, avec la présence. Le COMPTE, lui, se déduit d'une
 * liste que l'écran charge de toute façon. Le demander au serveur aurait obligé M05 (présence) à
 * lire M06 (sessions) — une frontière de modules que le backend tient volontairement fermée.
 *
 * ── Ce qu'on compte, et pourquoi exactement ces deux statuts ──────────────────────────────────
 *
 * `PREPARING` **et** `ACTIVE` : ce sont les deux que le serveur compte lui-même à l'initiation
 * (EF-06-14). Une session payée mais dont le décompteur n'a pas encore démarré occupe déjà une
 * place — sinon un médecin pourrait en accepter quatre d'un coup, et le serveur le refuserait
 * après que le patient a payé.
 *
 * ── Ce que cet affichage évite ────────────────────────────────────────────────────────────────
 *
 * Sans lui, un médecin au plafond voit simplement les demandes cesser d'arriver. Il conclut à une
 * panne, recharge, se déconnecte, appelle. Le dire est la seule raison d'être de ce compte : il n'y
 * a AUCUNE action associée — le plafond ne se règle que dans E3, par le super-administrateur.
 */
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

/** Le même rythme que le battement de présence : ces deux informations vieillissent ensemble. */
const PERIODE_RAFRAICHISSEMENT_MS = 5 * 60 * 1000

export function useSessionsEnCours(): { enCours: number | null } {
  const estPro = useSessionStore((s) => s.me?.accountType === 'PROFESSIONAL')
  // `null` = on ne sait pas encore. Distinct de 0, qui est une information (« aucune en cours »).
  const [enCours, setEnCours] = useState<number | null>(null)

  useEffect(() => {
    if (!estPro) return
    let vivant = true

    const compter = async () => {
      try {
        const { items } = await api.mySessions()
        if (!vivant) return
        setEnCours(items.filter((s) => s.status === 'PREPARING' || s.status === 'ACTIVE').length)
      } catch {
        // Silence volontaire : le plafond est un confort d'information, pas une garantie. Le vrai
        // refus vient du serveur à l'initiation. Afficher une erreur ici inquiéterait pour rien.
      }
    }

    void compter()
    const horloge = window.setInterval(() => void compter(), PERIODE_RAFRAICHISSEMENT_MS)
    const surVisibilite = () => {
      if (document.visibilityState === 'visible') void compter()
    }
    document.addEventListener('visibilitychange', surVisibilite)

    return () => {
      vivant = false
      window.clearInterval(horloge)
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [estPro])

  return { enCours }
}

/**
 * La pile de navigation — chantier 94, 11/09/2026.
 *
 * ── Pourquoi une pile à nous ──────────────────────────────────────────────────────────────────
 *
 * **React Router ne dit pas si l'on peut avancer ou reculer.** L'historique du navigateur ne se
 * lit pas : on peut y aller, on ne peut pas savoir ce qu'il contient. Sans cette pile, les deux
 * flèches seraient toujours actives — et *une flèche active qui ne fait rien est pire qu'une
 * flèche éteinte* : elle promet un geste et n'en tient aucun.
 *
 * Le motif vient de CMS-SARIS (`navStack.store.ts`), lu le 11/09 à la demande du porteur. Il y est
 * éprouvé ; on le reprend sans le réinventer, adapté à notre gestion d'état.
 *
 * ── Ce que la pile n'est PAS ──────────────────────────────────────────────────────────────────
 *
 * Elle ne navigue pas : elle **observe**. Les flèches appellent `navigate(-1)` / `navigate(+1)`,
 * le navigateur fait son travail, et la pile ne fait que suivre pour savoir où l'on en est. Si
 * elle se désynchronise — retour depuis le bouton du navigateur, lien externe — elle se
 * reconstruit au lieu de résister.
 */
import { create } from 'zustand'

interface EtatPile {
  chemins: string[]
  index: number
  /** Une navigation NEUVE : on tronque ce qui était « en avant », puis on empile. */
  empiler: (chemin: string) => void
  /** Une redirection : elle remplace l'entrée courante au lieu d'en ajouter une. */
  remplacer: (chemin: string) => void
  /** Un retour ou une avance : on glisse l'index vers le voisin qui correspond. */
  glisser: (chemin: string) => void
}

export const usePileNavigation = create<EtatPile>()((set) => ({
  chemins: [],
  index: -1,

  empiler: (chemin) =>
    set((e) => {
      // Même page : on n'empile pas deux fois. Sinon « retour » ramènerait au même écran.
      if (e.index >= 0 && e.chemins[e.index] === chemin) return e
      const chemins = e.chemins.slice(0, e.index + 1)
      chemins.push(chemin)
      return { chemins, index: chemins.length - 1 }
    }),

  remplacer: (chemin) =>
    set((e) => {
      if (e.index < 0) return { chemins: [chemin], index: 0 }
      const chemins = e.chemins.slice()
      chemins[e.index] = chemin
      return { chemins, index: e.index }
    }),

  glisser: (chemin) =>
    set((e) => {
      if (e.index > 0 && e.chemins[e.index - 1] === chemin) return { chemins: e.chemins, index: e.index - 1 }
      if (e.index < e.chemins.length - 1 && e.chemins[e.index + 1] === chemin) {
        return { chemins: e.chemins, index: e.index + 1 }
      }
      if (e.chemins[e.index] === chemin) return e
      /*
        Ni le voisin d'avant, ni celui d'après, ni la page courante : l'historique du navigateur a
        bougé sans nous — un retour de plusieurs crans, un lien collé. On repart de là, plutôt que
        de tenir une pile qui ne décrit plus rien.
      */
      const chemins = e.chemins.slice(0, e.index + 1)
      chemins.push(chemin)
      return { chemins, index: chemins.length - 1 }
    }),
}))

/** Peut-on reculer ? Vrai dès qu'il existe une entrée avant la courante. */
export const peutReculer = (e: EtatPile): boolean => e.index > 0

/** Peut-on avancer ? Vrai seulement après un retour — sinon il n'y a rien « devant ». */
export const peutAvancer = (e: EtatPile): boolean => e.index >= 0 && e.index < e.chemins.length - 1

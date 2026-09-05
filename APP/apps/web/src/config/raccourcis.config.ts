/**
 * Inventaire des raccourcis clavier — chantier 47, 05/09/2026.
 *
 * ── Pourquoi une liste déclarée, et pas seulement des `keydown` éparpillés ─────────────────────
 *
 * **Un raccourci que personne ne peut découvrir n'existe pas.** Ctrl+K a été livré au chantier 46 :
 * il ne se voit que sur l'attribut `aria-keyshortcuts` du bouton loupe, c'est-à-dire nulle part pour
 * qui n'utilise pas de lecteur d'écran.
 *
 * Cette liste est **la seule source du panneau d'aide** (touche `?`). Elle décrit AUSSI les
 * raccourcis implémentés ailleurs — ceux du composeur de consultation, écrits bien avant — pour
 * qu'un utilisateur les trouve au même endroit que les autres. Un raccourci documenté à deux
 * endroits finit par n'être exact nulle part.
 *
 * ⚠️ `porteeGlobale: false` signale ceux que ce module ne déclenche PAS : ils vivent dans leur
 * écran, sous leur champ. Les prétendre globaux les rendrait faux hors de cet écran, et un test
 * garde cette distinction.
 */
import type { Capability } from '@/hooks/useCapabilities'

export interface Raccourci {
  /** Identifiant stable, utilisé par les tests et par le panneau d'aide. */
  cle: string
  /** Les touches, telles qu'on les MONTRE. « Ctrl » et non « Control » : c'est ce qui est gravé. */
  touches: string[]
  /** Ce que fait le raccourci, à la deuxième personne — c'est l'utilisateur qui agit. */
  libelle: string
  /** Où il s'applique. Vide = partout. */
  portee: string
  /**
   * `true` : déclenché par `useRaccourcisGlobaux`. `false` : implémenté dans son écran, listé ici
   * pour être trouvable — jamais déclenché globalement.
   */
  porteeGlobale: boolean
  /** Capacités requises pour que la ligne apparaisse. Vide = tout le monde. */
  capabilities?: Capability[]
}

export const RACCOURCIS: Raccourci[] = [
  {
    cle: 'recherche',
    // Deux touches pour un même geste : Ctrl+K est la convention des palettes, « / » celle du web.
    // Les deux sont attendues par des gens différents, et aucune ne coûte l'autre.
    touches: ['Ctrl + K', '/'],
    libelle: 'Ouvrir la recherche',
    portee: 'Partout',
    porteeGlobale: true,
  },
  {
    cle: 'aide',
    touches: ['?'],
    libelle: 'Afficher cette aide',
    portee: 'Partout',
    porteeGlobale: true,
  },
  {
    cle: 'fermer',
    touches: ['Échap'],
    libelle: 'Fermer la fenêtre ouverte',
    portee: 'Partout',
    // Assuré par les primitives de dialogue (Radix), pas par notre écouteur : le redéclarer ici
    // ferait fermer deux fois, et l'annoncer comme nôtre serait s'attribuer le travail d'autrui.
    porteeGlobale: false,
  },
  {
    cle: 'consultation-envoyer',
    touches: ['Entrée'],
    libelle: 'Envoyer le message',
    portee: 'Dans une consultation',
    porteeGlobale: false,
    capabilities: ['professional'],
  },
  {
    cle: 'consultation-ligne',
    touches: ['Maj + Entrée'],
    libelle: 'Passer à la ligne sans envoyer',
    portee: 'Dans une consultation',
    porteeGlobale: false,
    capabilities: ['professional'],
  },
  {
    cle: 'consultation-annuler',
    touches: ['Échap'],
    libelle: 'Annuler la réponse ou la modification en cours',
    portee: 'Dans une consultation',
    porteeGlobale: false,
    capabilities: ['professional'],
  },
]

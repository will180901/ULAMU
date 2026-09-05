/**
 * L'écouteur unique des raccourcis globaux — chantier 47, 05/09/2026.
 *
 * ── Un seul écouteur, et pourquoi ──────────────────────────────────────────────────────────────
 *
 * Le chantier 46 en avait posé un dans `RechercheGlobale` pour Ctrl+K. En ajouter un second pour
 * `?` aurait donné deux gardes de saisie à tenir d'accord : le jour où l'une oublie les champs
 * `contenteditable`, un raccourci s'invite au milieu d'un message. Tout passe donc par ici.
 *
 * ── La garde de saisie, qui est tout l'enjeu ──────────────────────────────────────────────────
 *
 * `/` et `?` sont des CARACTÈRES. Sans garde, écrire « 20/09 » dans un motif de refus ouvrirait la
 * recherche au milieu du mot, et le texte serait perdu. On ignore donc toute touche simple pendant
 * une saisie — champ, zone de texte, liste déroulante, ou n'importe quel élément `contenteditable`.
 *
 * Ctrl+K, lui, passe même en pleine saisie : une combinaison à modificateur ne produit aucun
 * caractère, et c'est ce que fait toute application qui en propose une.
 *
 * ── ⚠️ AZERTY : pourquoi `e.key` et surtout pas `e.code` ──────────────────────────────────────
 *
 * Les utilisateurs sont au Congo-Brazzaville, donc majoritairement en **AZERTY**. Sur ce clavier,
 * `/` s'obtient par Maj+: et `?` par Maj+, — ni l'un ni l'autre n'est là où un QWERTY les met.
 *
 * `e.code` nomme la TOUCHE PHYSIQUE (`Slash`), et aurait donc désigné une autre touche sur chaque
 * disposition. `e.key` donne le CARACTÈRE RÉELLEMENT PRODUIT : `/` reste `/` en AZERTY, en QWERTY
 * et en BÉPO. C'est la seule des deux qui marche pour tout le monde.
 *
 * On ne teste donc pas non plus `e.shiftKey` pour `?` : sur certaines dispositions il n'y a pas de
 * Maj du tout, et l'exiger interdirait le raccourci à ceux-là.
 */
import { useEffect, useRef } from 'react'

/**
 * Vrai si l'utilisateur est en train d'écrire — auquel cas une touche simple lui appartient.
 *
 * ⚠️ **`isContentEditable` seul ne suffit pas**, et c'est un test qui l'a montré. Deux trous :
 *   • la frappe peut viser un élément IMBRIQUÉ dans la zone éditable (un `<strong>` au milieu d'un
 *     texte riche) — cet élément-là n'est pas `contentEditable`, son ancêtre l'est ;
 *   • la propriété n'est pas implémentée partout de la même façon, alors que l'attribut, lui, est
 *     dans le document.
 *
 * `closest` répond à la vraie question — « suis-je quelque part dans une zone où l'on écrit ? » —
 * et `:not([contenteditable="false"])` respecte les zones explicitement verrouillées.
 */
function saisieEnCours(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false
  const balise = cible.tagName
  if (balise === 'INPUT' || balise === 'TEXTAREA' || balise === 'SELECT') return true
  if (cible.isContentEditable) return true
  return cible.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

export function useRaccourcisGlobaux(actions: { surRecherche: () => void; surAide: () => void }): void {
  /*
    ── Pourquoi une référence, et pas les fonctions en dépendance ────────────────────────────────

    La coquille passe des fonctions fléchées écrites sur place : elles sont NEUVES à chaque rendu.
    Les mettre en dépendance de l'effet détacherait puis rattacherait l'écouteur à chaque frappe,
    chaque bascule de rideau, chaque changement d'écran — un écouteur par rendu, alors que ce
    fichier promet le contraire dans son en-tête.

    La référence garde les fonctions LES PLUS RÉCENTES sans réabonner : l'effet ne dépend plus de
    rien, et l'écouteur vit exactement aussi longtemps que la coquille.
  */
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      // Ctrl+K / ⌘K : passe partout, y compris en pleine saisie.
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        actionsRef.current.surRecherche()
        return
      }

      // À partir d'ici, ce sont des caractères. Ils appartiennent à qui écrit.
      if (saisieEnCours(e.target)) return
      // Alt et Ctrl composent des caractères sur certaines dispositions (AltGr) : on les laisse.
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === '/') {
        e.preventDefault()
        actionsRef.current.surRecherche()
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        actionsRef.current.surAide()
      }
    }

    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])
}

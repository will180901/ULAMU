import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * L'écran est-il plus étroit que `seuil` ?
 *
 * `useIsMobile` est figé sur 768 px, la bascule de la coquille. D'autres décisions ont leur propre
 * largeur : les tableaux d'ULAMU deviennent des cartes à **1024 px** (chantier 21), et la barre de
 * sections de B3 change de forme au même endroit. Écrire un second `matchMedia` à la main dans
 * chaque écran finirait par produire deux seuils qui divergent.
 *
 * Le premier rendu répond `false` — donc « large ». C'est délibéré : en test comme au premier
 * affichage, on montre la forme complète plutôt qu'une version réduite qui sauterait ensuite.
 */
export function useEtroit(seuil: number) {
  const [etroit, setEtroit] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${seuil - 1}px)`)
    const suivre = () => setEtroit(window.innerWidth < seuil)
    mql.addEventListener('change', suivre)
    suivre()
    return () => mql.removeEventListener('change', suivre)
  }, [seuil])

  return etroit
}

/**
 * Cet appareil sait-il SURVOLER ? — chantier 128, 15/09/2026.
 *
 * ⚠️ La barre latérale se déploie au survol de la souris : c'est là, et seulement là, que les
 * libellés des sept liens apparaissent. Sur une tablette de 800 px — plus large que la bascule
 * mobile de 768 px, donc traitée comme un ordinateur —, **il n'y a pas de survol** : le médecin se
 * retrouve devant sept icônes muettes, sans aucun moyen de les nommer.
 *
 * > **Une interface qui ne se lit qu'à la souris est illisible pour qui n'en a pas.**
 *
 * `(hover: none)` interroge l'APPAREIL, pas la largeur de l'écran — c'est la seule question qui
 * compte ici : *ce n'est pas la taille de l'écran qui empêche de survoler, c'est le doigt.*
 *
 * Répond `false` au premier rendu, comme `useIsMobile` : on montre la forme complète plutôt qu'une
 * version réduite qui sauterait ensuite.
 */
export function useSansSurvol() {
  const [sansSurvol, setSansSurvol] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia('(hover: none)')
    const suivre = () => setSansSurvol(mql.matches)
    mql.addEventListener('change', suivre)
    suivre()
    return () => mql.removeEventListener('change', suivre)
  }, [])

  return sansSurvol
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

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

/**
 * Amorçage commun des tests.
 *
 * `matchMedia` n'existe pas dans jsdom, et le store de thème l'interroge dès son import pour suivre
 * la préférence système. Sans ce bouchon, tout test qui touche à l'application plante avant même
 * d'avoir commencé — sur une erreur qui ne dit rien du code testé.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom n'implémente pas scrollIntoView — la palette de commandes l'appelle pour garder la ligne
// sélectionnée visible.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom n'implémente pas ResizeObserver. Beaucoup de composants shadcn l'observent pour se
// redimensionner — `input-otp` en tête, qui mesure ses cases. Sans ce bouchon, le test échoue sur
// une erreur d'environnement qui ne dit rien du code testé.
// `'ResizeObserver' in window` réduirait `window` à `never` : TypeScript sait que la propriété
// existe sur le type `Window`. C'est l'implémentation qui manque à l'exécution, pas la déclaration.
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// Même motif : `input-otp` appelle `elementFromPoint` dans un minuteur pour savoir si le pointeur
// survole une case. Le minuteur se déclenche APRÈS la fin du test, d'où une exception non rattrapée
// qui échappe à `try/catch` et fait échouer la suite entière sans rapport avec ce qui est vérifié.
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

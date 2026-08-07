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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

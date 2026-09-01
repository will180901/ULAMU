/**
 * Amorçage commun des tests.
 *
 * `matchMedia` n'existe pas dans jsdom, et le store de thème l'interroge dès son import pour suivre
 * la préférence système. Sans ce bouchon, tout test qui touche à l'application plante avant même
 * d'avoir commencé — sur une erreur qui ne dit rien du code testé.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

/**
 * Le délai d'attente de `findBy*` passe de 1 s à 2,5 s.
 *
 * Pas par confort : un test des menus de C5 passait seul et échouait dans la suite complète, en
 * 1 555 ms — le portail Radix n'était simplement pas encore monté au bout de la seconde réglementaire.
 * Le symptôme est trompeur (« élément introuvable » sur un élément parfaitement correct) et fait
 * chercher un bug là où il n'y en a pas.
 *
 * Cette machine est déjà connue pour cela : le §10 du plan note que la suite s'arrête parfois sur un
 * « Timeout waiting for worker to respond ». Attendre plus longtemps ne masque aucun défaut — un test
 * qui finit par passer en 1,6 s décrit le même comportement qu'un test qui passe en 0,3 s.
 *
 * 2,5 s et non 5 : le budget d'un test entier est de 5 s (`testTimeout` par défaut). À égalité,
 * c'est le test qui expire le premier, et son message ne dit plus QUEL élément manquait.
 */
configure({ asyncUtilTimeout: 2_500 })

/**
 * **Le réseau est coupé pendant les tests.** Découvert le 28/08/2026, et ce n'était pas théorique.
 *
 * `VITE_API_URL` vaut `https://ulamu-api.onrender.com` : il n'y a pas d'API locale, par choix.
 * Conséquence — toute méthode de `api` qu'un test oublie de doubler partait **pour de vrai vers la
 * production**. Un test de C6 le faisait : l'appel revenait en 401 (le jeton d'essai est fictif),
 * `onUnauthorized` déconnectait la session, et comme la réponse mettait deux secondes à revenir,
 * c'est le test SUIVANT qui se retrouvait déconnecté en plein milieu, bloqué sur un écran de
 * chargement. Le message d'échec accusait alors un bouton parfaitement correct.
 *
 * Deux raisons de fermer la porte, et la seconde est la vraie : des tests qui appellent la
 * production peuvent aussi y ÉCRIRE. Un `POST` oublié suffirait.
 *
 * Un test qui a besoin du réseau doit doubler la méthode d'`api` qui l'utilise — c'est ce que fait
 * chacun d'eux. Le message ci-dessous nomme l'URL manquante, pour qu'on sache quoi doubler.
 */
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  throw new Error(
    `Appel réseau interdit en test : ${url}\n` +
      "Doublez la méthode d'`api` correspondante avec vi.spyOn — les tests ne parlent jamais à la vraie API.",
  )
}) as typeof fetch

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

/*
  jsdom n'implémente pas la capture de pointeur. Radix s'en sert pour savoir si un geste commencé sur
  un élément s'y termine — c'est ce qui distingue un clic d'un glissement. Sans ces trois fonctions,
  toute liste déroulante lève `target.hasPointerCapture is not a function` à l'ouverture, et l'erreur
  ne dit rien de l'écran testé.

  Ajouté le 01/09/2026, quand les listes natives ont été remplacées : `<select>` n'en avait pas besoin.
*/
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
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

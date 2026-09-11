/**
 * Configuration des tests — `apps/web` n'en avait aucun jusqu'ici (constat de l'audit du 26/07,
 * toujours vrai le 05/08). On repart donc de zéro, et l'occasion est bonne pour poser les bonnes
 * habitudes tout de suite plutôt que d'ajouter un harnais par-dessus des tests déjà écrits.
 *
 * `jsdom` et non un navigateur réel : les tests portent sur le comportement (rôles ARIA, clavier,
 * filtrage par capacité), pas sur le rendu pixel. Ce qui relève du visuel se vérifie dans un vrai
 * navigateur — comme cela a été fait pour la coquille.
 */
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      /*
        ── Pourquoi 15 s et non les 5 s par défaut — chantier 74, 11/09/2026 ──────────────────────

        La suite a dépassé les 800 tests, et une exécution COMPLÈTE rendait **13 échecs répartis
        dans quatre fichiers**, tous à ~5 000 ms pile — c'est-à-dire des dépassements de délai, pas
        des assertions fausses. Relancés **seuls**, ces quatre fichiers passent : 140 tests, verts.

        La cause est connue et notée à la passation : `userEvent` rejoue des séquences de pointeur
        (survol, appui, relâchement) et devient très lent quand les workers se partagent la machine.
        Ce n'est pas le code applicatif qui est lent, c'est le harnais.

        ⚠️ **Ce réglage ne masque aucun défaut.** Un test qui échoue pour une vraie raison échoue
        toujours, et aussi vite qu'avant : le délai ne borne que l'ATTENTE d'une condition qui ne
        vient jamais. Ce qu'il supprime, ce sont les faux rouges — et un filet qui crie au loup une
        fois sur deux cesse d'être lu, ce qui est exactement le risque que ce projet ne peut pas
        prendre : toute la méthode repose sur la comparaison avant/après.

        Si un jour un test met vraiment 15 s, c'est un autre problème — et il faudra le traiter,
        pas relever le plafond une seconde fois.
      */
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        reportsDirectory: './coverage',
        // On ne mesure que le code applicatif : couvrir la configuration ne prouve rien.
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      },
    },
  }),
)

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

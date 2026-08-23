/**
 * Config Jest — tests unitaires (sans base) et d'intégration (suffixe .int.spec.ts).
 *
 * Les suites d'intégration VIDENT la base avant de commencer. Le projet n'ayant qu'une seule base
 * Neon, partagée avec le site en ligne, elles ne démarrent plus sans une base qui leur est réservée :
 * voir `test/garde-base-de-test.ts`, écrit après l'effacement du 23/08/2026.
 */
/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 30000,
  // Base de données partagée entre suites d'intégration : exécution SÉRIALISÉE — déterministe.
  maxWorkers: 1,
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      rootDir: ".",
      testMatch: ["<rootDir>/src/**/*.spec.ts"],
      testPathIgnorePatterns: ["\\.int\\.spec\\.ts$"],
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      rootDir: ".",
      testMatch: ["<rootDir>/test/**/*.int.spec.ts"],
      // Sur le projet « integration » SEULEMENT : les tests unitaires n'ouvrent aucune base et
      // doivent rester lançables même sans branche de test configurée.
      globalSetup: "<rootDir>/test/garde-base-de-test.ts",
    },
  ],
};

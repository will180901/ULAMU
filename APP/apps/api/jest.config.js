/** Config Jest — tests unitaires (sans DB) et d'intégration (DB docker, suffixe .int.spec.ts). */
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
    },
  ],
};

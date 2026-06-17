/** Config Jest — @ulamu/shared (logique pure : validation, client API, machine d'auth). */
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  // @ulamu/contracts résolu vers la source (pas besoin de build préalable).
  moduleNameMapper: {
    "^@ulamu/contracts$": "<rootDir>/../contracts/src/index.ts",
  },
};

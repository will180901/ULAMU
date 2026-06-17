/**
 * @ulamu/shared — utilitaires communs aux trois applications.
 * Rempli au Chantier 1. Règles déjà actées :
 *  - Tout horodatage interne en UTC (PM-14) ; conversion à l'affichage seulement.
 *  - Montants en XAF, entiers (pas de centimes au franc CFA).
 *  - Les clés de paramètres PM-xx sont déclarées ici ; leurs VALEURS vivent en base
 *    (ParametrePlateforme, seedées depuis parametres_metier.md) — jamais en dur dans le code.
 */

/** Clés des paramètres métier (PM-01 → PM-40) — référentiel : parametres_metier.md */
export const PM_KEYS = [
  "PM-01", "PM-02", "PM-03", "PM-04", "PM-05", "PM-06", "PM-07", "PM-08",
  "PM-09", "PM-10", "PM-11", "PM-12", "PM-13", "PM-14", "PM-15", "PM-16",
  "PM-17", "PM-18", "PM-19", "PM-20", "PM-21", "PM-22", "PM-23", "PM-24",
  "PM-25", "PM-26", "PM-27", "PM-28", "PM-29", "PM-30", "PM-31", "PM-32",
  "PM-33", "PM-34", "PM-35", "PM-36", "PM-37", "PM-38", "PM-39", "PM-40",
] as const;

export type PmKey = (typeof PM_KEYS)[number];

export * from "./validation";
export * from "./api-client";
export * from "./auth";

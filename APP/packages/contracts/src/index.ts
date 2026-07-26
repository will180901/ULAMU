/**
 * @ulamu/contracts — source unique des types du projet.
 *
 * Dictionnaire central : docs/cahier_des_charges/01_architecture_fonctionnelle/modele_donnees_global.md
 *
 * Contrats inter-modules (plan_modules.md §3) :
 *  C1 — Ordres financiers (M13)        C5 — Événements d'audit (M04)
 *  C2 — Écriture au Carnet (M07)       C6 — Statut de vérification (M03)
 *  C3 — Délivrance → stock (M11)       C7 — Disponibilité agrégée (M11→M12)
 *  C4 — Demandes de notification (M14)
 *
 * Règle : les modules de apps/api ne s'importent JAMAIS entre eux — ils ne connaissent
 * que ces contrats ; les apps (mobile/web) consomment les DTO/réponses d'API d'ici.
 */

export const CONTRACTS_VERSION = "0.1.0";

export * from "./http";
export * from "./auth";

# Matrice de Traçabilité — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Vivant — mis à jour à chaque module/décision |

---

## 1. Parcours de référence → modules

| Parcours ([[00_cadrage/personas_parcours|personas]] §4) | Modules traversés |
|---|---|
| 🅰 Consultation complète | M01 → M05 → **M06** → M13 → M07 → M14 (+M09 si prescription) |
| 🅱 Trouver son médicament | M09 → **M12** → M13 → M11 → M14 |
| 🅲 Suivi du malade chronique | **M06** (suivi) → M07 → M14 (rappels) *(+M08 triage en V1)* |

## 2. Modules → release, statut, décisions

| Module | Release | Statut | Décision |
|---|---|---|---|
| [[02_modules/M01_comptes_authentification\|M01]] Comptes & Auth | MVP-C1 | 🟢 Validé | D-027 |
| [[02_modules/M02_roles_espaces_structures\|M02]] Rôles & Structures | MVP-C1 | 🟢 Validé | D-028 |
| [[02_modules/M03_verification_contrats\|M03]] Vérification & Contrats | MVP-C1 | 🟢 Validé | D-029 |
| [[02_modules/M04_audit_signalements\|M04]] Audit & Signalements | MVP-C1 | 🟢 Validé | D-030 |
| [[02_modules/M05_annuaire_professionnels\|M05]] Annuaire | MVP-C3 | 🟢 Validé | D-031 |
| [[02_modules/M06_poignee_session\|M06]] Poignée & Session ⭐ | MVP-C3 | 🟢 Validé | D-032 |
| [[02_modules/M07_carnet\|M07]] Carnet | MVP-C3 | 🟢 Validé | D-033 |
| [[02_modules/M08_missions_triage\|M08]] Missions de Triage | **V1** | 🟢 Validé | D-042 |
| [[02_modules/M09_ordonnance_delivrance\|M09]] Ordonnance & Délivrance | MVP-C4 | 🟢 Validé | D-034 |
| [[02_modules/M10_examens_resultats\|M10]] Examens & Résultats | **V1** | 🟢 Validé | D-043 |
| [[02_modules/M11_stocks_catalogues\|M11]] Stocks & Catalogues | MVP-C4 | 🟢 Validé | D-035 |
| [[02_modules/M12_recherche_devoilement\|M12]] Recherche & Dévoilement | MVP-C4 | 🟢 Validé | D-036 |
| [[02_modules/M13_paiements_gains\|M13]] Paiements & Gains | MVP-C2 | 🟢 Validé | D-037 |
| [[02_modules/M14_notifications_rappels\|M14]] Notifications & Rappels | MVP-C2 | 🟢 Validé | D-038 |
| [[02_modules/M15_urgence\|M15]] Urgence | **V1** | 🟢 Validé | D-041 |
| [[02_modules/M16_pilotage_administration\|M16]] Pilotage & Administration | MVP-C1/C5 | 🟢 Validé | D-038 |

*(MVP-Cx = chantier de construction, [[01_architecture_fonctionnelle/plan_releases|plan_releases]] §2)*

## 3. Contrats d'interface → modules

| Contrat | Fournisseur | Consommateurs |
|---|---|---|
| C1 Ordres financiers | M13 | M06, M12 (M08 en V1) |
| C2 Écriture au Carnet | M07 | M06, M09 (M08, M10 en V1) |
| C3 Délivrance → stock | M11 | M09 |
| C4 Demandes de notification | M14 | Tous |
| C5 Événements d'audit | M04 | Tous |
| C6 Statut de vérification | M03 | M02, M05, M06, M11, M12 |
| C7 Disponibilité agrégée | M11 | M12 |

## 4. Questions ouvertes restantes

| ID | Question | Échéance |
|---|---|---|
| Q-003 | Validité légale signature/ordonnance — avis avocat | Avant développement sensible (plan réglementaire) |
| ~~Q-006~~ | ✅ Close — D-041 (M15 spécifié) | [[02_modules/M15_urgence\|M15]] |
| Q-008 | Cumul des casquettes sur un compte | Réétude V1 (RM-02-06) |

## 5. Exigences → tests

La règle : chaque CU validé (critères « Étant donné / Quand / Alors ») = cas de test ([[03_conception_transverse/strategie_tests|stratégie de tests]] §1). Les 10 invariants de la liste rouge couvrent les RM critiques transversales.

---

*Index : [[00_HOME|HOME]]*

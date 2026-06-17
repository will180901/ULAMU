# Référentiel des Paramètres Métier — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-024 |
| Règle | **Aucun document ni aucun code ne contient ces chiffres en dur** : on référence PM-xx. Miroir applicatif : entité ParametrePlateforme ([[modele_donnees_global]]). |

---

## Argent

| ID | Paramètre | Valeur | Source |
|---|---|---|---|
| PM-01 | Commission sur consultation / suivi / mission de triage | **10 %** | D-022 ✅ |
| PM-02 | Commission sur retrait des gains | **0 %** (frais opérateur réels seulement) | D-022 ✅ |
| PM-03 | Prix du dévoilement (pharmacie et labo) | **500 XAF** | D-023 ✅ |
| PM-04 | Devise unique | XAF | D-012 ✅ |
| PM-05 | Opérateurs de paiement | MTN MoMo, Airtel Money (via agrégateur agréé) | [[cadre_reglementaire]] §6 ✅ |
| PM-06 | Prix des offres de consultation | Libre, fixé par le professionnel — plancher 500 XAF | D-024 ✅ |

## Délais & durées

| ID | Paramètre | Valeur | Source |
|---|---|---|---|
| PM-07 | Expiration de la confirmation (poignée de main) | **5 minutes** | D-024 ✅ |
| PM-08 | Durée de la session de dévoilement et de la réservation | **24 heures** | D-009 ✅ |
| PM-09 | Durées d'offre autorisées | 10 à 60 minutes | D-024 ✅ |
| PM-10 | Expiration d'une ordonnance non délivrée | **30 jours** | D-024 ✅ |
| PM-11 | Délai cible de vérification d'un professionnel/structure | **72 h ouvrées** | D-024 ✅ |
| PM-12 | Remboursement automatique (D-008) | Déclenché à la clôture d'une session sans aucun message du professionnel ; exécuté immédiatement | ✅ règle, délai technique à confirmer avec l'agrégateur |
| PM-17 | Validité d'un code OTP SMS | **5 minutes** | D-027 ✅ (M01) |
| PM-18 | Blocage de connexion | 5 échecs en 15 min → blocage **15 min** | D-027 ✅ (M01) |
| PM-19 | Limite d'envoi d'OTP | **3 par heure** par numéro | D-027 ✅ (M01) |
| PM-20 | Durée de session de connexion mobile | **30 jours** glissants | D-027 ✅ (M01) |
| PM-21 | Délai de réactivation d'un compte clôturé | **30 jours** | D-027 ✅ (M01) |
| PM-22 | Expiration d'une invitation de membre | **7 jours** | D-028 ✅ (M02) |
| PM-23 | Délai cible de traitement d'un signalement | **48 h** | D-030 ✅ (M04) |
| PM-24 | Rétention du journal d'audit | **5 ans** (à confirmer avocat) | D-030 ✅ (M04) |
| PM-25 | Offres de consultation actives max par professionnel | **5** | D-031 ✅ (M05) |
| PM-26 | Bascule automatique en « absent » (inactivité desktop) | **15 min** | D-031 ✅ (M05) |
| PM-27 | Sessions actives simultanées max par professionnel | **3** | D-032 ✅ (M06) |
| PM-28 | Démarrage automatique de session après paiement | **10 min** | D-032 ✅ (M06) |
| PM-29 | Prolongation gratuite cumulée max | **+30 min** | D-032 ✅ (M06) |
| PM-30 | Délai de dépôt du compte-rendu (gains gelés au-delà) | **24 h** | D-032 ✅ (M06) |
| PM-31 | Conservation du Carnet après clôture de compte | **10 ans** (à confirmer avocat) | D-033 ✅ (M07) |
| PM-32 | Alerte de péremption proche (stock pharmacie) | **60 jours** avant la date | D-035 ✅ (M11) |
| PM-33 | Fraîcheur du stock : exclusion de la recherche après | **7 jours** sans mouvement ni confirmation | D-035 ✅ (M11) |
| PM-34 | Exclusion temporaire après 3 strikes de fiabilité en 30 jours | **7 jours** | D-036 ✅ (M12) |
| PM-35 | Seuil de double validation des remboursements manuels | **50 000 XAF** | D-037 ✅ (M13) |
| PM-36 | Délai maximum d'exécution d'un retrait | **24 h** | D-037 ✅ (M13) |
| PM-37 | Rétention du centre de notifications | **90 jours** | D-038 ✅ (M14) |
| PM-38 | Validité du QR Urgence temporaire | **4 h** (non révocable une fois généré) | D-041 ✅ (M15) |
| PM-39 | Rayon d'intervention par défaut d'un soignant (missions de triage) | **10 km** (ajustable par le soignant) | D-042 ✅ (M08) |
| PM-40 | Expiration d'une demande d'examens non réalisée | **30 jours** | D-043 ✅ (M10) |

## Règles diverses

| ID | Paramètre | Valeur | Source |
|---|---|---|---|
| PM-13 | Échelle de notation | 1 à 5 | D-021 ✅ |
| PM-14 | Fuseau de référence | Africa/Brazzaville (UTC+1) ; calculs internes en UTC | ✅ |
| PM-15 | Langue | Français uniquement | D-005 ✅ |
| PM-16 | Âge minimum d'un compte patient | **18 ans** — mineurs rattachés au compte d'un parent | D-024 ✅ — détail mineurs : Q-007 |

## Questions ouvertes ajoutées

| ID | Question | À traiter dans |
|---|---|---|
| Q-007 | Comment gérer les mineurs ? (compte parent avec sous-profils enfants dans le Carnet familial ?) | Module M01/M07 |

---

*Phase 1 — document 5/7 · Précédent : [[modele_donnees_global]] · Suivant : [[exigences_non_fonctionnelles]] · Index : [[../00_HOME|HOME]]*

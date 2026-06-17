# Registre des Risques — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) |
| Documents liés | [[vision]] · [[cadre_reglementaire]] · [[etude_concurrence]] |

> Document vivant : revu à chaque phase. Échelle : Probabilité et Impact en Faible / Moyen / Élevé / Critique.

---

## Risques majeurs

| ID | Risque | Prob. | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | **Réglementaire** : la télémédecine n'est pas encadrée ; les autorités pourraient bloquer ou sanctionner | Moyen | Critique | Contact précoce Ministère de la Santé + Ordre des médecins ; avocat congolais ; traçabilité exemplaire comme argument ([[cadre_reglementaire]] §7) |
| R-02 | **Adoption patients** : ils restent sur WhatsApp et la débrouille (gratuits) | Élevé | Critique | Le gratuit ULAMU (dossier à vie, recherche anonyme, rappels) comme porte d'entrée ; les 3 parcours de référence doivent être parfaits ([[personas_parcours]] §4) |
| R-03 | **Stocks pharmacie pas à jour** : un dévoilement payé sur une fausse disponibilité détruit la confiance | Élevé | Critique | Décrément automatique à la délivrance ; engagement contractuel de mise à jour ; garantie patient à définir (Q-004 : remboursement ou re-dévoilement gratuit) |
| R-04 | **Médecins peu réactifs** : poignées de main jamais confirmées → patients découragés | Moyen | Élevé | Indicateur « disponible maintenant » ; notifications efficaces côté desktop ; mise en avant des médecins réactifs dans les résultats |
| R-05 | **Contournement** : après un premier contact, patient et médecin s'arrangent hors plateforme | Élevé | Moyen | La valeur est dans l'intégré : ordonnance valable uniquement via session, dossier alimenté automatiquement, commission douce (10 %) qui ne justifie pas la triche |
| R-06 | **Faux professionnels / usurpation d'identité** | Moyen | Critique | Vérification des documents avant badge ; signalement ; l'équipe vérification (sous-rôle admin) avec délais cibles |
| R-07 | **Fuite de données de santé** | Faible | Critique | Chiffrement, cloisonnement par acteur (D-012), modèle de menaces en Phase 3, accès tracés |
| R-08 | **Paiements** : échecs MoMo, litiges de remboursement, agrégateur défaillant | Moyen | Élevé | Agrégateur agréé CEMAC ; remboursements automatiques (D-008) ; support réactif ; journal financier complet |
| R-09 | **Connectivité des utilisateurs** faible ou chère | Élevé | Moyen | App légère, économe en data (P1) ; messagerie asynchrone par nature ; périmètre offline à trancher (Q-005) |
| R-10 | **Capacité de réalisation** : petite équipe, projet ambitieux | Élevé | Élevé | MVP chirurgical (plan_releases, Phase 1) ; phasage strict ; pas de fonctionnalité hors parcours de référence au départ |
| R-11 | **Trésorerie** : volume insuffisant les premiers mois (modèle de volume) | Élevé | Élevé | Lancement ciblé (un ou deux arrondissements pilotes) ; coûts fixes minimaux ; suivi mensuel des scénarios ([[modele_economique]] §5) |
| R-12 | **Waspito ou un acteur financé entre au Congo-B** | Moyen | Élevé | Vitesse + ancrage local : les contrats pharmacies/labos signés sont la barrière à l'entrée ([[etude_concurrence]] §5) |

## Actions immédiates issues des risques

1. **R-01** → engager le plan d'action réglementaire ([[cadre_reglementaire]] §7) dès maintenant, en parallèle de la conception.
2. **R-03** → trancher Q-004 (garantie dévoilement) au module Pharmacie — proposition à venir.
3. **R-10/R-11** → le plan_releases (Phase 1) devra définir un MVP réduit aux 3 parcours de référence et une ville pilote.
4. **Enquête terrain** avant lancement : valider personas et l'absence d'acteur local inconnu (R-02, [[etude_concurrence]] §3).

---

*Précédent : [[modele_economique]] · Phase 0 terminée après validation → Phase 1 : glossaire, carte des domaines, plan des modules · Index : [[../00_HOME|HOME]]*

# Modèle Opérationnel — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — revue D-040 |
| Documents liés | [[../00_cadrage/modele_economique|modele_economique]] · [[../01_architecture_fonctionnelle/plan_releases|plan_releases]] §4 |

> Un système sans organisation pour le faire vivre est incomplet. Ce document décrit **les humains et les processus** du lancement (ville pilote, Brazzaville).

---

## 1. L'équipe minimale du lancement

| Rôle | Charge estimée | Engagements tenus |
|---|---|---|
| **Porteur / direction** (Nathan) | — | Décisions, partenariats, relation autorités |
| **Admin Vérification & Modération** | 1 personne (peut être mi-temps au début) | Vérifications ≤ 72 h (PM-11, ~20 dossiers/jour max) ; signalements ≤ 48 h (PM-23) |
| **Support & onboarding terrain** | 1 personne | Réponse ≤ 24 h (ENF-08) ; formation des pharmacies (30 min chacune) ; accompagnement des premiers professionnels |
| **Admin Finance** | mi-temps (peut être le porteur au début, sous TOTP) | Réconciliation quotidienne vérifiée ; litiges ; double validation > PM-35 |
| **Technique / astreinte** | le développeur | Pannes majeures détectées < 5 min (supervision automatique), intervention selon runbook |

⚠️ Au début, une même personne peut cumuler des rôles — mais **jamais** Vérification + Finance (séparation des pouvoirs), et chaque casquette agit sous son sous-rôle M02 propre (traçabilité).

## 2. Les processus récurrents

| Processus | Cadence | Référence |
|---|---|---|
| Vérification des dossiers professionnels/structures | Quotidien, file M03 | CU-03-02 |
| Modération des signalements | Quotidien, file M04 | CU-04-04 |
| Réconciliation financière | Quotidien (automatique + revue humaine) | EF-13-09 |
| Arbitrage des strikes contestés | Sous 48 h | EF-12-07 |
| Procédures support sensibles (numéro perdu, titulaire injoignable, transfert de Carnet) | À la demande, par procédure guidée | CU-16-04 |
| Suivi des 7 KPIs du pilote | Hebdomadaire (revue), temps réel (tableau M16) | EF-16-05 |
| Enrichissement du référentiel Medicament | Hebdomadaire (file M09) | ADR-13 |
| Revue du registre des risques et des décisions | Mensuelle | [[../00_cadrage/registre_risques|registre_risques]] |

## 3. L'onboarding terrain (le nerf de la guerre)

**Pharmacies (objectif pilote : ≥ 20 au stock vivant)**
1. Démarchage : l'argument est simple — *« des clients qui arrivent avec le produit déjà réservé »* + visibilité gratuite.
2. Vérification (M03) puis **formation 30 min** : espace, membres, délivrance par scan, bouton « stock à jour ».
3. **Import CSV assisté** du stock (EF-11-10) — fait *avec* eux, pas expliqué de loin.
4. Suivi semaine 1 : un appel, vérification de la fraîcheur, réponse aux blocages.

**Professionnels (objectif pilote : ≥ 30 actifs)**
1. Recrutement par cercles (Ordre, hôpitaux, recommandations) — les **15 pré-engagés** avant l'ouverture ([[../01_architecture_fonctionnelle/plan_releases|plan]] §4).
2. Vérification ≤ 72 h, signature du contrat, création des offres.
3. Formation 20 min : poignée de main, session, compte-rendu obligatoire, retraits.
4. Accompagnement à la première session réelle.

**Patients** : acquisition par les professionnels et pharmacies partenaires (« suivez-moi sur ULAMU »), bouche-à-oreille, et la gratuité du Carnet comme produit d'appel — pas de publicité payante au pilote.

## 4. Gestion des incidents

| Gravité | Exemple | Réponse |
|---|---|---|
| **Critique** | Paiements en panne, fuite suspectée, base injoignable | Astreinte immédiate ; runbook dédié ; communication honnête in-app ; post-mortem écrit sous 72 h |
| **Majeure** | Notifications en retard, agrégateur dégradé | Intervention < 4 h ouvrées ; bandeau d'information |
| **Mineure** | Bug d'affichage, demande support | File support ≤ 24 h |

Tout incident critique alimente le [[../00_cadrage/registre_risques|registre des risques]] (nouvelle ligne ou mitigation révisée).

## 5. Coûts opérationnels à chiffrer (alimente [[../00_cadrage/modele_economique|modele_economique]] §5)

| Poste | Nature |
|---|---|
| 2 à 3 salaires/indemnités (vérification, support, finance mi-temps) | Mensuel — le poste principal |
| Hébergement + supervision (ADR-10) | Mensuel, modeste au pilote |
| SMS OTP (~2 par inscription, PM-19) | Variable — coût d'acquisition |
| Frais agrégateur (2-3 % des flux) | Variable — déjà dans la marge nette |
| Déplacements terrain (onboarding pharmacies) | Ponctuel, pilote |
| Avocat (plan réglementaire) + pentest pré-lancement | Ponctuel, avant ouverture |

⚠️ L'hypothèse « 3 à 6 M XAF/mois » du modèle économique sera affinée ici dès les premiers devis réels.

---

*Phase 3 — 5/5 · Précédent : [[strategie_tests]] · **La conception transverse est complète** · Index : [[../00_HOME|HOME]]*

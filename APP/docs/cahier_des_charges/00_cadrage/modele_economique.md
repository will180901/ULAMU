# Modèle Économique — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — chiffres actés en D-022 / D-023 |
| Documents liés | [[vision]] · [[registre_decisions]] (Q-001, Q-002) |

---

> ## 🔴 UNE SOURCE DE REVENUS SUR DEUX DISPARAÎT (02/09/2026)
>
> Décision [[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]] : la chaîne du médicament en pharmacie sort du produit. **Le dévoilement — 500 XAF,
> la deuxième source de revenus — n'existe plus.** ULAMU ne facture désormais que la **commission de
> consultation**.
>
> ⚠️ **Ce document n'est PAS réécrit, et c'est délibéré.** Il décrit un modèle à deux sources, dont
> une n'est plus. Le refaire demanderait de nouvelles hypothèses de volume et de point d'équilibre —
> **c'est un arbitrage du porteur, pas une correction de rédaction.** Ce qui suit reste donc lisible
> comme l'état de la réflexion au 10/06/2026, avec cet avertissement en tête.
>
> **Trois endroits sont directement touchés** : le tableau des prix au §3 (deux lignes
> « Dévoilement » sans objet), l'exemple d'épisode de soin au §4, et surtout la « lecture honnête »
> du §5 — elle pose **trois** conditions de viabilité, dont *« les pharmacies tiennent leur stock à
> jour parce que les dévoilements amènent des ventes »*. Ce pilier tombe entièrement.

## 1. Principes (déjà validés)

1. Le patient paie le prix affiché, **jamais un franc de plus** (D-010).
2. Le gratuit est sacré : inscription, dossier à vie, ordonnance, rappels, recherche anonyme (D-020).
3. ULAMU gagne **sur les flux, pas sur les barrières** — commissions faibles, discrètes, contractuelles (D-011).
4. Jamais de publicité, jamais de vente de données.

## 2. Les sources de revenus

| # | Source | Qui paie | Mécanisme |
|---|---|---|---|
| R1 | Commission sur consultations (et suivis) | Le professionnel | Incluse dans le prix qu'il affiche |
| R2 | Dévoilement + réservation 24 h (pharmacie/labo) | Le patient | Petit montant fixe, perçu comme un service |
| R3 | Commission sur missions de triage terrain | Le soignant de terrain | Incluse dans le prix de la mission |
| R4 | *(plus tard, V2+)* Services premium pros : statistiques avancées, mise en avant éthique | Le professionnel | Abonnement optionnel — jamais nécessaire pour travailler |

## 3. Chiffres proposés — ❓ À VALIDER (réponses à Q-001 et Q-002)

| Poste | Proposition | Justification |
|---|---|---|
| **Commission consultation** | **10 %** (médecin garde 90 %) | Assez bas pour être indolore (5 000 F → 500 F), assez haut pour vivre avec du volume. Uber/plateformes prennent 20-30 % — être à 10 % est un argument de recrutement des médecins. |
| **Commission triage terrain / suivi** | **10 %** (taux unique partout) | Un seul taux = simple à comprendre, à expliquer, à coder. |
| **Dévoilement pharmacie** | **500 XAF** | Moins cher qu'une course de taxi pour chercher au hasard — c'est l'argument marketing. Trivial face au prix des médicaments. |
| **Dévoilement labo** | **500 XAF** | Cohérence : un seul prix de dévoilement partout. |
| **Retrait des gains (professionnels)** | **0 % ULAMU** — seuls les frais réels de l'opérateur MoMo s'appliquent | Différenciateur de confiance majeur : « votre argent est à vous ». L'ancien cahier prévoyait 2 % — on l'abandonne. |
| **Contrats, inscription pro, espace structure** | **Gratuits** | Aucune barrière à l'entrée pour construire l'offre de soins. |

## 4. L'économie d'un épisode de soin complet (exemple Mireille, P1)

| Acte | Patient paie | Le pro reçoit | ULAMU gagne |
|---|---|---|---|
| Consultation 30 min | 5 000 | 4 500 (Dr Armel) | 500 |
| Ordonnance | 0 | — | 0 |
| Dévoilement pharmacie | 500 | 0 (la pharmacie gagne la vente) | 500 |
| **Total épisode** | **5 500** | | **≈ 1 000 XAF** |

⚠️ À déduire : les frais de l'agrégateur Mobile Money (~2-3 % par transaction, à confirmer — voir [[cadre_reglementaire]] §6). Marge nette ULAMU par épisode : **≈ 850-900 XAF**.

## 5. Esquisse de viabilité (hypothèses à affiner)

> Hypothèse de charges mensuelles de départ (petite équipe locale, serveurs, support, vérification) : **à chiffrer précisément** — ordre de grandeur 3 à 6 M XAF/mois.

| Scénario | Épisodes complets / mois | Revenu ULAMU / mois |
|---|---|---|
| Prudent | 2 000 | ≈ 1,8 M XAF |
| Moyen | 5 000 | ≈ 4,5 M XAF |
| Ambitieux | 12 000 | ≈ 10,8 M XAF |

**Lecture honnête :** le modèle est un modèle de **volume**. Il ne tient que si (a) les médecins affluent parce que la commission est douce, (b) les pharmacies tiennent leur stock à jour parce que les dévoilements amènent des ventes, (c) les patients reviennent parce qu'ils ne se sentent jamais arnaqués. Les trois conditions sont les trois piliers de la [[vision]] — le modèle économique et la philosophie se renforcent mutuellement.

## 6. Ce qu'on refuse (garde-fous)

- ❌ Augmenter les taux en douce : tout changement de taux = avenant au contrat numérique signé, notifié à l'avance.
- ❌ Faire payer la visibilité de base (pas de « payer pour apparaître dans les recherches »).
- ❌ Monétiser l'urgence : le bouton urgence ne rapportera jamais rien, par principe.

---

*Précédent : [[cadre_reglementaire]] · Suivant : registre_risques (à rédiger) · Index : [[../00_HOME|HOME]]*

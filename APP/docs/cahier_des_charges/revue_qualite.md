# Revue de Cohérence Globale — 2026-06-10

| Champ | Valeur |
|---|---|
| Périmètre | Les 27 documents du coffre (Phases 0 à 3 + traçabilité) |
| Méthode | Vérifications automatisées (références croisées, liens, identifiants) + relecture ciblée des points de couture |
| Verdict | 🟢 **Cohérent et aligné** — 3 anomalies détectées, 3 corrigées, 0 contradiction de fond |

---

## 1. Vérifications automatisées

| Contrôle | Résultat |
|---|---|
| 37 paramètres PM-01→37 définis ; toutes les références PM-xx des 27 documents pointent vers une définition | ✅ (1 corrigé : « PM-37b » fantôme dans M14 → reformulé en RM-14-03) |
| 39 décisions D-001→039 définies ; toutes les références D-xxx résolues | ✅ |
| Wikiliens internes du coffre | ✅ (2 corrigés : liens vers `prompt/` hors coffre remplacés par des chemins en texte ; les `\|` des tableaux sont des échappements Obsidian valides) |
| Contrats C1-C7 : chaque mention correspond à un contrat défini au [[01_architecture_fonctionnelle/plan_modules|plan des modules]] §3 | ✅ |
| Identifiants EF/RM/CU : aucun doublon de définition | ✅ |
| Statuts d'en-tête vs validations actées | ✅ (15 corrigés : documents validés en discussion qui portaient encore « En revue ») |

## 2. Relecture des points de couture (alignement de fond)

| Couture | Constat |
|---|---|
| Poignée de main : D-007 → glossaire → M05 (EF-05-06) → M06 (EF-06-01/02/03) → M13 (C1) → tests (invariant n° 1) | ✅ chaîne complète et identique partout |
| Argent aveugle : carte des domaines (règle 3) → dictionnaire (règle 3) → M13 (RM-13-01) → ADR-11/12 → invariants 2-3 | ✅ |
| Dévoilement : D-009/D-023 → dictionnaire (règle 5) → M11 (C7, fraîcheur) → M12 (garantie D-036) → menace T-08 → invariants 5 et 10 | ✅ |
| Immutabilité médicale : dictionnaire (règle 2) → M07 (RM-07-02) → offline (« zéro conflit par construction ») → invariant 4 | ✅ |
| Compte-rendu = condition des gains : D-021 → M06 (EF-06-08) → M13 (EF-13-03, capture différée) | ✅ |
| Confidentialité : RM-04-03 → RM-06-06 → RM-14-03 → RM-16-02 → menace T-06 → invariants 7-8 | ✅ |
| Vérification stricte : D-029 → M03 (EF-03-05) → M02 (RM-02-04) → M05 (RM-05-01) → M11 (RM-11-02) | ✅ |

## 3. Points de vigilance assumés (pas des incohérences)

1. **La [[00_cadrage/vision|vision]] décrit le produit cible complet** (triage terrain, examens labo, urgence) tandis que le [[01_architecture_fonctionnelle/plan_releases|plan de releases]] les met en V1 — c'est l'étagement voulu (D-026), pas une contradiction.
2. **3 ADR restent ⚠️** (agrégateur, hébergement/résidence des données, référentiel médicaments) — dépendent de l'avis juridique et de devis (plan réglementaire, actions 1-4).
3. **3 questions ouvertes** (Q-003 légal, Q-006 urgence/V1, Q-008 cumul/V1) — toutes tracées avec leur échéance dans [[tracabilite]].

## 4. Suites données (autonomie déléguée par le porteur, D-040)

- Phase 3 passée en **Validé (revue interne)** — relecture du porteur toujours bienvenue.
- Rédaction de la **[[05_reference_technique/reference_technique|Référence Technique]]** — le dernier document nécessaire avant d'écrire la première ligne de code.

---

*Index : [[00_HOME|HOME]]*

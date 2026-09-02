# Plan de Releases — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-026 |
| Documents liés | [[plan_modules]] · [[registre_risques]] (R-10, R-11) |

> Principe : un **MVP chirurgical** limité aux 3 parcours de référence ([[personas_parcours]] §4), lancé dans **une ville pilote (Brazzaville)**. Tout le reste attend des preuves.

---

## 1. Classement MoSCoW des 16 modules

| Module | MVP | V1 | V2 | Note de périmètre |
|---|---|---|---|---|
| M01 Comptes & Auth | ✅ Must | | | |
| M02 Rôles & Espaces Structures | ✅ Must | | | ⚠️ **Le volet « espaces structures » est retiré du produit** le 02/09/2026 ([[registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]]) — seules les permissions par rôle restent |
| M03 Vérification & Contrats | ✅ Must | | | La confiance ne se reporte pas |
| M04 Audit & Signalements | ✅ Must | | | MVP : journal d'audit + signalement simple ; modération outillée en V1 |
| M05 Annuaire des Professionnels | ✅ Must | | | |
| M06 Poignée de main & Session ⭐ | ✅ Must | | | Le cœur — complet dès le MVP |
| M07 Carnet | ✅ Must | | | |
| M08 Missions de Triage | | 🔜 Should | | ❓ Le parcours 🅲 (suivi) démarre au MVP avec sessions de suivi + rappels, sans triage terrain |
| M09 Ordonnance & Délivrance | ✅ Must | | | Indispensable au parcours 🅱 |
| M10 Examens & Résultats | | 🔜 Should | | Recruter les labos demande un effort dédié |
| ~~M11 Stocks & Catalogues~~ | ❌ | | | **Retiré du produit le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]) |
| ~~M12 Recherche & Dévoilement~~ | ❌ | | | **Retiré le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]). ⚠️ C'était la **2ᵉ source de revenus** : le modèle économique repose désormais sur la seule commission de consultation. À arbitrer avec [[../00_cadrage/modele_economique|le modèle économique]]. |
| M13 Paiements & Gains | ✅ Must | | | |
| M14 Notifications & Rappels | ✅ Must | | | MVP : push + rappels médicaments ; canal SMS en V1 (coût) |
| M15 Urgence | | 🔜 Should | | ❓ Q-006 non tranchée — concevoir en V1 plutôt que bâcler au MVP |
| M16 Pilotage & Administration | ✅ Must *(réduit)* | | | MVP : back-office vérification + finance ; tableaux de bord riches en V1 |
| iOS patient | | | 🔮 Could | Android d'abord (part de marché Congo) |
| ~~Cliniques comme structures~~ | | | ❌ | **Sans objet depuis [[registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]]** : plus aucun compte n'administre une structure |
| Lingala / multilingue | | | 🔮 Could | Réouverture éventuelle de D-005 |
| Épidémiologie anonymisée | | | 🔮 Won't (pour l'instant) | Vision long terme ([[vision]] §7) |
| Services premium pros (R4) | | | 🔮 Could | Jamais nécessaire pour travailler |

**MVP = 12 modules** (dont 2 à périmètre réduit). **V1 = +3** (Triage, Examens/Labos, Urgence). **V2 = extensions.**

## 2. Ordre de construction du MVP (conforme au graphe acyclique)

```
Chantier 1 — Socle : M01 → M02 → M03 (+M04 journal en continu)
Chantier 2 — Flux d'argent : M13 (+ agrégateur MoMo) → M14
Chantier 3 — Cœur : M07 → M05 → M06 ⭐
~~Chantier 4 — Médicament : M11 → M09 → M12~~ *(M11 et M12 retirés le 02/09/2026 ; M09 conserve la prescription et le référentiel)*
Chantier 5 — Pilotage : M16 (back-office minimal, en parallèle dès le chantier 1)
```

Jalon de démonstration à la fin de chaque chantier — on ne commence pas le suivant sans avoir montré le précédent qui marche.

## 3. Critères de succès du pilote (à 3 mois après lancement)

| Indicateur | Cible | Pourquoi |
|---|---|---|
| Professionnels vérifiés actifs | ≥ 30 | Sans offre de soin, rien n'existe |
| Pharmacies au stock vivant (màj < 7 j) | ≥ 20 | Fiabilité du parcours 🅱 (R-03) |
| Sessions réalisées | ≥ 1 000 | Preuve du cœur |
| Dévoilements payés | ≥ 500 | Preuve de la 2ᵉ source de revenus |
| Taux de poignées de main confirmées | ≥ 70 % | Réactivité des professionnels (R-04) |
| Taux de remboursements automatiques | ≤ 5 % | Qualité de service |
| Patients revenus une 2ᵉ fois | ≥ 40 % | La confiance, mesurée |

Ces chiffres décident de la suite : **V1 si vert, pivot si rouge.**

## 4. Conditions préalables au lancement (hors logiciel)

1. Avis de l'avocat congolais reçu ([[cadre_reglementaire]] §7).
2. Contact établi avec le Ministère de la Santé / Ordre des médecins (R-01).
3. Contrat agrégateur Mobile Money signé.
4. Enquête terrain : personas confrontés à ≥ 20 entretiens réels (R-02).
5. ≥ 15 professionnels et ≥ 10 pharmacies pré-engagés avant l'ouverture publique.

---

*Phase 1 — document 7/7 · Précédent : [[exigences_non_fonctionnelles]] · **Phase 1 terminée après validation** → Phase 2 : spécification des modules un par un · Index : [[../00_HOME|HOME]]*

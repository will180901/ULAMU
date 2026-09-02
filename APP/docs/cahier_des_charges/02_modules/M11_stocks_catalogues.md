# MODULE M11 — Stocks & Catalogues

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-035 |
| Release | MVP — Chantier 4 (stock pharmacie ; catalogues labos en V1) |
| Domaine | D6 Disponibilité & Localisation |
| Dépendances | M02 |

---

> ## ⚠️ Le compte « membre de structure » est RETIRÉ du produit (02/09/2026)
>
> Décision [[registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] : ULAMU a **trois acteurs** — le patient (mobile), le soignant et l'administration (web).
> `FACILITY_MEMBER` n'en est plus un : la route publique `POST /v1/accounts/register/facility-member`
> est retirée, **plus aucun compte de ce type ne peut naître**.
>
> **Ce qui reste vrai dans cette spécification** : la pharmacie comme **objet** — `Facility`, ses
> stocks, ses dispensations, ses réservations. La **recherche de médicaments du patient en dépend
> directement** (M12 lit M11), et le patient est dans le périmètre.
>
> **Ce qui n'a plus d'acteur** : tout ce qui suppose qu'un humain administre l'espace — créer une
> structure, inviter un membre, tenir le stock, servir une ordonnance. Ces routes existent encore et
> ne répondent qu'à des adhésions **héritées** ; aucune nouvelle ne peut se créer.
>
> **La conséquence, dite plutôt que tue** : plus personne n'alimente le stock. Les données se figent,
> et la recherche payée du patient répond sur un stock qui vieillit. Coût et issues au §9 du plan
> d'exécution web.

---

## 1. Mission et périmètre

Donner à chaque pharmacie un **stock vivant et fiable** — car toute la promesse du dévoilement (D-009) repose dessus : un produit affiché « disponible » doit l'être vraiment (risque R-03, le plus dangereux pour la confiance).

**Hors-périmètre explicite :**
- Recherche, dévoilement, réservation → M12 (M11 lui fournit la donnée, C7)
- Décision de délivrance → M09 (M11 en reçoit l'événement, C3)
- Catalogues d'examens de laboratoire → V1

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Titulaire / membre (droit « stock », M02) | Tient le stock à jour au quotidien |
| Équipe ULAMU | Gère le référentiel Medicament, surveille la fraîcheur |
| Le Système | Décréments automatiques, alertes, exclusion des stocks périmés |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-11-01 | **Stock par médicament** (référentiel) **et par lot** : quantité, date de péremption, prix de vente (librement fixé par la pharmacie). |
| EF-11-02 | **Entrées** (approvisionnements) : lot, fournisseur, quantité, péremption — saisie simple, pensée pour le quotidien d'une officine. |
| EF-11-03 | **Sorties manuelles** : vente hors ULAMU, perte, péremption, correction — motif obligatoire. |
| EF-11-04 | **Décrément automatique** à chaque délivrance ULAMU (C3) — aucune action du pharmacien. |
| EF-11-05 | **Alertes** : stock faible (seuil configurable par produit), rupture, péremption proche (PM-32 ❓). |
| EF-11-06 | **Journal des mouvements** complet par lot — inaltérable, exportable. |
| EF-11-07 | **Publication temps réel vers M12** (C7) : un produit à quantité 0 disparaît de la recherche instantanément ; les lots périmés sont automatiquement exclus du disponible. |
| EF-11-08 | **Règle de fraîcheur (anti R-03)** : une pharmacie sans aucun mouvement ni confirmation depuis PM-33 (❓ 7 jours) voit son stock **exclu de la recherche** jusqu'à confirmation « stock à jour » (un bouton, un clic hebdomadaire). L'engagement figure au contrat (M03). |
| EF-11-09 | **Inventaire** : comptage physique → corrections en masse avec motif « inventaire ». |
| EF-11-10 | **Import initial guidé** (CSV) : une pharmacie qui arrive avec 500 produits doit pouvoir charger son stock en une heure, pas en une semaine. |

## 4. Cas d'utilisation

### CU-11-01 — Enregistrer un approvisionnement
- *Étant donné* un membre avec droit « stock », *quand* il saisit « Paracétamol 500 — lot L2406 — 200 boîtes — péremption 2027-08 — 1 500 XAF », *alors* le stock augmente, la disponibilité M12 se met à jour en < 1 min (C7).

### CU-11-02 — Décrément automatique (C3)
- *Étant donné* une délivrance M09, *alors* le stock du lot le plus proche de la péremption est décrémenté (premier périmé, premier sorti), mouvement tracé « délivrance ULAMU » avec référence.

### CU-11-03 — Confirmation de fraîcheur
- *Étant donné* 6 jours sans mouvement, *alors* rappel au titulaire (C4) ; *au 7ᵉ jour sans confirmation*, stock exclu de la recherche, bandeau visible dans l'espace structure ; *un clic sur « stock à jour »* le réintègre immédiatement.

### CU-11-04 — Alerte de péremption
- *Étant donné* un lot à PM-32 de la péremption, *alors* alerte au titulaire ; *à la date dépassée*, le lot sort du disponible automatiquement et passe en file « à détruire » (sortie manuelle motivée).

### CU-11-05 — Inventaire
- *Étant donné* un comptage physique, *quand* les écarts sont saisis, *alors* corrections en masse motivées, journal complet, écarts récurrents visibles du titulaire.

### CU-11-06 — Import initial
- *Étant donné* un fichier CSV au modèle fourni, *alors* import guidé avec rapprochement assisté vers le référentiel (suggestions), erreurs listées ligne par ligne, rien n'est publié avant validation finale du titulaire.

## 5. Données du module

**Référencées :** StockItem, Medicament, CatalogueExamen *(V1)* ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D6).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| MouvementStock | item, type (entrée / sortie / correction), quantité, motif, référence (délivrance…), membre, horodatage | Immuable ; tout passe par lui |
| SeuilAlerte | structure, produit, seuil de stock faible | Configurable par produit |
| ConfirmationFraicheur | structure, confirmée le, par | Alimente EF-11-08 |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-11-01 | Le stock ne devient jamais négatif ; toute variation passe par un MouvementStock tracé. |
| RM-11-02 | Seule une pharmacie **vérifiée** publie sa disponibilité (D-029, C6). |
| RM-11-03 | Les lots périmés ne sont jamais comptés dans le disponible, quoi qu'il arrive. |
| RM-11-04 | Le prix est libre et visible **après dévoilement** (D-009) — la recherche anonyme n'expose que l'agrégat. |
| RM-11-05 | Le stock d'une pharmacie n'est **jamais visible d'une autre pharmacie** (secret commercial, P7). |
| RM-11-06 | Stock non confirmé depuis PM-33 = exclu de la recherche (la fiabilité avant l'exhaustivité). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | **C3** — événements de délivrance (M09) ; droits des membres (M02) ; statut C6 (M03) ; référentiel Medicament |
| Expose | **C7** — disponibilité agrégée temps réel → M12 (recherche anonyme puis détail au dévoilement) |
| Émet | Alertes au titulaire (C4) ; audit des corrections et exclusions (C5) |

## 8. Exigences non fonctionnelles spécifiques

- Saisie d'un approvisionnement : < **30 s** par produit (l'outil doit être plus rapide que le cahier papier).
- Propagation stock → recherche M12 : < **1 min** (C7).
- Import CSV 500 lignes : traité en < **5 min**, avec rapport d'erreurs clair.

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ PM-32 | Alerte de péremption proche : proposition **60 jours** avant la date |
| ❓ PM-33 | Fraîcheur du stock : exclusion de la recherche après **7 jours** sans mouvement ni confirmation |
| ⚠️ Discipline des pharmacies | EF-11-08 est la parade au risque R-03, mais elle suppose un onboarding soigné (formation 30 min + import CSV assisté) — au modèle opérationnel, Phase 3 |
| ⚠️ Référentiel Medicament | Source initiale à choisir (liste nationale des médicaments essentiels + compléments) — Phase 3, avec M09 |

---

*Phase 2 — module 9/12 · Précédent : [[M09_ordonnance_delivrance]] · Suivant : M12 Recherche & Dévoilement (et Q-004) · Index : [[../00_HOME|HOME]]*

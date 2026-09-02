# MODULE M12 — Recherche & Dévoilement

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-036 |
| Release | MVP — Chantier 4 (le modèle signature, D-009) |
| Domaine | D6 Disponibilité & Localisation |
| Dépendances | M11, M13, M14 |

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

Le **modèle signature d'ULAMU** : dire gratuitement *« le médicament existe près de chez toi »*, et vendre — 500 XAF — *« voici exactement où, réservé pour toi pendant 24 h »*. Deuxième source de revenus ([[../00_cadrage/modele_economique|modèle économique]] R2).

**Hors-périmètre explicite :**
- La donnée de stock → M11 (C7) ; la délivrance → M09
- Recherche d'examens labo → V1
- Recherche de professionnels → M05 (gratuite, logique différente)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Patient | Cherche, paie le dévoilement, se rend en pharmacie |
| Pharmacie (titulaire/membres) | Voit ses réservations, les honore ou les conteste |
| Le Système | Agrège, choisit la pharmacie révélée, gère expirations et garanties |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-12-01 | **Recherche gratuite et illimitée** : par produit(s) libre(s) ou **par ordonnance** (lignes restantes, M09). |
| EF-12-02 | **Résultat anonyme** (D-009) : par arrondissement — nombre de pharmacies en ayant, quantité globale. Jamais de nom, position ou téléphone. |
| EF-12-03 | **Dévoilement** : le patient choisit un arrondissement → paie PM-03 (500 XAF, C1) → le système révèle **la pharmacie optimale** : couverture maximale des produits demandés, stock le plus frais, plus proche. *(Une pharmacie par dévoilement ; le solde non couvert se recherche à nouveau — cohérent avec la délivrance partielle CU-09-03.)* |
| EF-12-04 | **Session de dévoilement 24 h** : nom de la pharmacie, téléphone, quartier, position GPS, itinéraire (ouverture dans l'app de cartes du téléphone), compte à rebours visible. Expirée → informations masquées (D-009). |
| EF-12-05 | **Réservation** : les quantités dévoilées sont **déduites du disponible publié** pendant 24 h ; la pharmacie voit la réservation dans son espace (référence + lignes) et la marque « servie » à la remise (ou elle s'honore via le scan d'ordonnance M09). |
| EF-12-06 | **Garantie de réservation (réponse à Q-004)** ❓ : si le patient se présente et que le produit manque, il signale « non disponible » depuis sa session de dévoilement → **re-dévoilement gratuit** vers une autre pharmacie ; s'il n'existe **aucune alternative** dans l'arrondissement → **remboursement intégral** des 500 XAF. La pharmacie fautive reçoit un **strike de fiabilité**. |
| EF-12-07 | **Strikes** : 3 strikes en 30 jours → exclusion temporaire de la recherche (PM-34 ❓) + alerte contractuelle (M03). La pharmacie peut contester un strike (arbitrage Équipe ULAMU, M16). |
| EF-12-08 | **Hors ligne** : une session de dévoilement active reste lisible sans réseau (cache chiffré) — le patient en route ne perd jamais l'adresse. |
| EF-12-09 | **Historique** des recherches et dévoilements dans Mon Espace, avec reçus (M13). |

## 4. Cas d'utilisation

### CU-12-01 — Rechercher par ordonnance
- *Étant donné* une ordonnance active à 3 lignes, *quand* le patient lance la recherche, *alors* en < 4 s (ENF-03) : « Arrondissement de Talangaï — 4 pharmacies, vos 3 produits couverts » / « Poto-Poto — 2 pharmacies, 2 produits sur 3 ».
- *Étant donné* aucun résultat nulle part, *alors* message honnête + proposition d'alerte « me prévenir si disponible » (C4).

### CU-12-02 — Payer un dévoilement
- *Étant donné* un arrondissement choisi, *quand* le paiement de 500 XAF réussit (C1), *alors* la session s'ouvre : pharmacie révélée, compte à rebours 24 h, réservation posée (EF-12-05), reçu émis.
- *Étant donné* un échec de paiement, *alors* nouvel essai — rien n'est révélé sans paiement confirmé.

### CU-12-03 — Se rendre en pharmacie
- *Étant donné* une session active, *alors* itinéraire en un geste ; à la remise, la pharmacie marque « réservation servie » (ou scan M09 si ordonnance) — la session se clôt proprement.

### CU-12-04 — Produit manquant (garantie Q-004)
- *Étant donné* un signalement « non disponible » pendant les 24 h, *alors* re-dévoilement gratuit immédiat vers la meilleure alternative ; la pharmacie signalée est notifiée et peut contester sous 48 h.
- *Étant donné* aucune alternative dans l'arrondissement, *alors* remboursement intégral automatique (C1) + excuse + alerte « me prévenir si disponible ».
- *Étant donné* un 3ᵉ strike en 30 jours, *alors* exclusion PM-34 de la recherche, notification contractuelle au titulaire.

### CU-12-05 — Expiration
- *Étant donné* 24 h écoulées sans remise, *alors* session expirée, informations masquées, réservation libérée (stock republié) — racheter un dévoilement est nécessaire (D-009).

## 5. Données du module

**Référencées :** RechercheAnonyme, Devoilement, Reservation ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D6).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| StrikeFiabilite | structure, dévoilement en cause, motif, statut (actif / contesté / annulé), date | 3 actifs en 30 jours → PM-34 |
| AlerteDisponibiliteProduit | patient, produit(s), arrondissement, posée le | Notification unique à réapparition |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-12-01 | **Jamais d'identité de structure sans dévoilement payé actif** (D-009) — la règle d'or du modèle. |
| RM-12-02 | Disponible publié = stock réel **moins** réservations actives (pas de double promesse). |
| RM-12-03 | Réservation servie ou expirée = quantités libérées immédiatement. |
| RM-12-04 | L'algorithme de choix de la pharmacie révélée (couverture, fraîcheur, proximité) est documenté et **ne se vend pas** — cohérent avec RM-05-02. |
| RM-12-05 | Le dévoilement est personnel : lié au compte du patient, non transférable. |
| RM-12-06 | Le patient ne paie jamais deux fois pour le même échec : re-dévoilement gratuit ou remboursement (EF-12-06). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | **C7** — disponibilité agrégée (M11) ; **C1** — encaissement / remboursement 500 XAF (M13) ; ordonnance active (M09) ; statut C6 |
| Expose | Réservations → espace pharmacie ; événement « réservation servie » → clôture |
| Émet | Notifications (C4) ; audit dévoilements / strikes / remboursements (C5) |

## 8. Exigences non fonctionnelles spécifiques

- Recherche anonyme : < **4 s** en 3G (ENF-03) — c'est un écran d'Accueil.
- Révélation après paiement : < **3 s** (le moment de magie ne doit pas ramer).
- Cache hors ligne de la session active : adresse, téléphone, plan statique du quartier (ENF-04).

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ EF-12-06 | **Valider la garantie** (re-dévoilement gratuit → remboursement si aucune alternative) — close Q-004 |
| ❓ PM-34 | Exclusion temporaire après 3 strikes/30 jours : proposition **7 jours** |
| ⚠️ Abus patient | Signalements « non disponible » mensongers : la contestation pharmacie + l'arbitrage M16 équilibrent ; à surveiller au pilote |
| ⚠️ Densité initiale | Le modèle exige assez de pharmacies par arrondissement — c'est le critère « ≥ 20 pharmacies au stock vivant » du [[../01_architecture_fonctionnelle/plan_releases|pilote]] |

---

*Phase 2 — module 10/12 · Précédent : [[M11_stocks_catalogues]] · Suivant : M13 Paiements & Gains · Index : [[../00_HOME|HOME]]*

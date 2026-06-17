# Stratégie de Tests — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — revue D-040 |
| Documents liés | [[../tracabilite|tracabilite]] · [[../01_architecture_fonctionnelle/plan_releases|plan_releases]] |

> Principe : **les critères d'acceptation des CU sont les tests** — chaque « Étant donné / Quand / Alors » validé en Phase 2 devient un cas de test automatisé ou de recette. Rien d'autre à inventer, tout à exécuter.

---

## 1. La pyramide

| Niveau | Couvre | Outil/méthode | Quand |
|---|---|---|---|
| **Unitaires** | Règles métier (RM-xx) et calculs : répartitions 10 %, garde-fou allergies, expirations PM-xx, états des cycles de vie | Tests du backend par module | À chaque commit |
| **Intégration par module** | Les contrats C1-C7 : chaque module testé avec ses voisins simulés (ex. M06 avec un faux M13) | Suites par contrat | À chaque commit |
| **Bout en bout (E2E)** | **Les 3 parcours de référence** ([[../00_cadrage/personas_parcours|personas]] §4) joués entièrement : 🅰 consultation complète, 🅱 trouver son médicament, 🅲 suivi | Scénarios automatisés mobile + desktop + agrégateur en bac à sable | Chaque release |
| **Réseau dégradé** | Les scénarios offline ([[strategie_offline_sync]] §6) + 3G simulée (latence 300 ms, pertes 5 %) sur les écrans critiques (ENF-03) | Conditions réseau simulées | Chaque release |
| **Charge** | ENF-06 : 50 sessions simultanées, 500 sessions/jour ; pics de notifications | Tests de montée en charge | Avant lancement, puis trimestriel |
| **Sécurité** | Modèle de menaces T-01 → T-14 ; **pentest externe** | Revue interne + prestataire | Avant lancement public |
| **Recette humaine** | Parcours réels sur téléphones d'entrée de gamme (le téléphone de Mireille, ENF-01), par des testeurs congolais | Sessions guidées | Avant pilote |

## 2. Les invariants à tester sans relâche (la liste rouge)

Ces 10 propriétés ne doivent **jamais** être fausses, quelle que soit la situation :

1. Aucun paiement possible sans confirmation valide (RM-06-01).
2. Aucun débit double pour un même ordre, même rejoué (RM-13-04).
3. Aucun solde modifié sans mouvement tracé (RM-13-02).
4. Aucune entrée du Carnet modifiée ou supprimée (RM-07-02).
5. Aucune identité de structure révélée sans dévoilement actif (RM-12-01).
6. Aucune double délivrance d'une même ordonnance (RM-09-02/03).
7. Aucun contenu médical dans une notification ou un journal (RM-14-03, RM-04-03).
8. Aucun accès admin au Carnet ou aux sessions (RM-16-02).
9. Session sans message du professionnel → remboursement automatique (D-008).
10. Stock publié = stock réel − réservations actives (RM-12-02).

Chacun est codé en test automatisé **et** vérifié par un contrôle de cohérence périodique en production (le n° 3 et le n° 10 tournent chaque nuit avec la réconciliation EF-13-09).

## 3. Environnements

| Environnement | Rôle | Données |
|---|---|---|
| Développement | Travail quotidien | Données fictives générées |
| Recette | E2E + recette humaine, agrégateur en bac à sable | Fictives réalistes (personas) |
| Production | Le réel | Jamais de copie vers les autres environnements — les données de santé ne quittent pas la production (loi 29-2019) |

## 4. Definition of Done (par fonctionnalité)

- [ ] Critères d'acceptation du CU automatisés et verts
- [ ] Invariants de la liste rouge non régressés
- [ ] Testé en 3G simulée si écran patient (ENF-03)
- [ ] Événements d'audit émis et vérifiés (C5)
- [ ] Aucune valeur en dur — paramètres lus depuis PM-xx
- [ ] Matrice [[../tracabilite|tracabilite]] mise à jour

## 5. Recette du pilote

Avant l'ouverture publique : **une semaine de pilote fermé** — l'équipe + 10 patients amis + 3 professionnels réels + 2 pharmacies, argent réel à petits montants. Critère de sortie : les 3 parcours réussis par des utilisateurs non assistés, zéro invariant violé, remboursements automatiques constatés en conditions réelles.

---

*Phase 3 — 4/5 · Précédent : [[strategie_offline_sync]] · Suivant : [[modele_operationnel]] · Index : [[../00_HOME|HOME]]*

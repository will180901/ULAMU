# MODULE M06 — Poignée de main & Session ⭐

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-032 |
| Release | MVP — Chantier 3 (le cœur du système) |
| Domaine | D3 Soin |
| Dépendances | M05, M07, M13, M14 |

---

## 1. Mission et périmètre

Orchestrer **l'acte médical complet** : initiation → confirmation → paiement → session de messagerie chronométrée → compte-rendu → notation. C'est la fusion assumée des anciens modules RDV + Messagerie + Consultation (D-026) : une seule expérience.

**Hors-périmètre explicite :**
- Exécution des paiements → M13 (M06 donne des ordres référencés, C1)
- Création d'ordonnance → M09, demande d'examens → M10 (déclenchées *depuis* la session)
- Stockage du compte-rendu → M07 (C2)

## 2. Cycles de vie

**Poignée de main :** `initiée → confirmée → payée` (sorties : `expirée` PM-07, `refusée`, `abandonnée`)
**Session :** `en préparation → active → prolongée → terminée` (sortie spéciale : `remboursée` D-008)

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-06-01 | **Initiation** depuis une offre (M05) : le professionnel est notifié sur web en < 5 s (ENF-09), avec fiche anonymisée du patient (prénom, âge — pas plus avant paiement). |
| EF-06-02 | **Confirmation** : « Je suis prêt à recevoir » — valable PM-07 (5 min). Refus possible avec motif court (occupé, hors domaine). Sans confirmation, **le bouton payer n'existe pas** (D-007). |
| EF-06-03 | **Paiement** : actif uniquement après confirmation ; ordre C1 vers M13 ; réussi → la poignée passe « payée » ; échec → nouvel essai dans la fenêtre PM-07 ; expiration → rien n'est débité. |
| EF-06-04 | **Pré-consultation** (D-019) : remplie après paiement (symptômes, durée, photos), transmise au professionnel. Le décompteur **ne démarre qu'à la transmission** — plafond : démarrage automatique PM-28 (10 min) après paiement. |
| EF-06-05 | **Session chronométrée** : messagerie texte / photos / **notes vocales** / documents ; décompteur visible des deux côtés en temps réel ; **l'horloge du serveur fait foi** (D-025). |
| EF-06-06 | **Accès au Carnet en session** : lecture seule du Carnet du patient par le professionnel pendant la session active — ouvert à l'activation, refermé à la clôture, chaque consultation tracée (C5). |
| EF-06-07 | **Prolongation gratuite** à la seule initiative du professionnel (D-016) : par pas de 10 min, plafond PM-29 (+30 min au total). |
| EF-06-08 | **Compte-rendu obligatoire** (D-021) : rédigeable pendant la session et jusqu'à PM-30 (24 h) après la fin. **Les gains de la session ne sont crédités qu'au dépôt du compte-rendu** (C1 : capture différée). Relances automatiques à 12 h et 23 h. |
| EF-06-09 | **Remboursement automatique** (D-008) : session terminée sans **aucun** message du professionnel → remboursement intégral immédiat (C1), notification au patient, incident compté dans les indicateurs M05. |
| EF-06-10 | **Annulation par le patient** : avant paiement — libre ; après paiement et **avant le premier message du professionnel** — remboursement intégral automatique ; après échange — pas d'annulation unilatérale (litige via signalement M04 / support M16). |
| EF-06-11 | **Notation** après clôture : note 1-5 (PM-13) + commentaire, une seule fois, par le patient. |
| EF-06-12 | **Session de suivi** (D-016) : à la clôture, le professionnel peut proposer son offre « suivi » — lien direct pour le patient, mais **même mécanique complète** (poignée de main incluse). |
| EF-06-13 | **Hors ligne** (D-025) : messages rédigés sans réseau mis en file et envoyés à la reconnexion ; bandeau « hors ligne » visible ; le décompteur continue côté serveur. |
| EF-06-14 | **Concurrence** : un professionnel mène au plus PM-27 (3) sessions actives simultanées ; au-delà, il est automatiquement « occupé » dans l'annuaire. Un patient n'a qu'une poignée de main en cours par professionnel. |

## 4. Cas d'utilisation (critères clés)

### CU-06-01 — Poignée de main complète
- *Étant donné* un professionnel en ligne, *quand* le patient initie, *alors* notification < 5 s, statut « initiée » visible au patient (« en attente du Dr… »).
- *Étant donné* la confirmation, *alors* le patient est notifié, le bouton payer s'active avec compte à rebours PM-07 visible.
- *Étant donné* l'expiration sans paiement, *alors* poignée « expirée », professionnel libéré, patient informé — rien n'est débité.
- *Étant donné* un refus du professionnel, *alors* motif court affiché + suggestions de professionnels équivalents (M05).

### CU-06-02 — Ouverture et déroulement de session
- *Étant donné* un paiement réussi, *alors* reçu émis (M13), pré-consultation proposée, le professionnel voit « en préparation ».
- *Étant donné* la transmission de la pré-consultation (ou le délai PM-28), *alors* la session passe « active », décompteur lancé des deux côtés.
- *Étant donné* une session active, *quand* un message est envoyé, *alors* il s'affiche avec statut envoyé / livré / lu ; vocaux ≤ 1 Mo/min, photos compressées (ENF-02).

### CU-06-03 — Fin de session
- *Étant donné* le décompteur épuisé, *alors* la messagerie se ferme (lecture seule), le professionnel a PM-30 pour le compte-rendu.
- *Étant donné* le dépôt du compte-rendu, *alors* Entrée au Carnet (C2), gains crédités (C1), patient notifié et invité à noter.
- *Étant donné* PM-30 dépassé sans compte-rendu, *alors* gains gelés, alerte au professionnel et à l'Équipe ULAMU (récidive = sanction M16).

### CU-06-04 — Protection du patient
- *Étant donné* une session terminée où le professionnel n'a envoyé **aucun message**, *alors* remboursement intégral automatique en < 1 min, patient notifié avec excuse, incident enregistré (M05, M04).
- *Étant donné* une coupure réseau du professionnel en pleine session, *quand* il revient, *alors* il est invité à prolonger gratuitement (EF-06-07) — son taux d'incidents reste visible (M05).

### CU-06-05 — Suivi
- *Étant donné* une clôture avec proposition de suivi, *quand* le patient accepte plus tard, *alors* parcours complet (initiation → confirmation → paiement au tarif réduit de l'offre suivi).

## 5. Données du module

**Référencées :** PoigneeDeMain, Session, Message, PreConsultation, Notation ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D3).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| Prolongation | session, durée, accordée par, horodatage | Cumul ≤ PM-29 |
| AccesCarnetSession | session, ouvert à, fermé à | Trace l'accès lecture du professionnel (C5) |
| PropositionSuivi | session, offre de suivi, expire | Sans engagement pour le patient |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-06-01 | **Jamais de paiement sans confirmation valide** — c'est la loi du module (D-007). |
| RM-06-02 | Le temps du serveur fait foi ; les horloges clients sont indicatives. |
| RM-06-03 | Aucun message n'existe hors d'une session active (D-006) — pas de messagerie libre. |
| RM-06-04 | Gains crédités **uniquement** après dépôt du compte-rendu (qualité avant trésorerie). |
| RM-06-05 | L'accès au Carnet en session est en lecture seule ; toute écriture passe par compte-rendu, ordonnance ou demande d'examens (C2). |
| RM-06-06 | Contenu de session chiffré ; jamais dans les notifications (ENF-07) ni dans l'audit (RM-04-03). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | Offre + fiche professionnel (M05) ; C1 ordres à M13 (encaisser / rembourser / créditer après CR) ; C2 écriture Carnet (M07) ; C4 notifications ; C6 statut professionnel |
| Expose | « Session active de P avec Pr » → M09 (ordonnance) et M10 (examens) ne se déclenchent que depuis ce contexte |
| Expose | Événements (confirmations, délais, incidents, notes) → indicateurs M05, audit C5 |

## 8. Exigences non fonctionnelles spécifiques

- Notification d'initiation au professionnel : < **5 s** (ENF-09) — c'est la promesse de la poignée de main.
- Livraison d'un message en session : < **2 s** en 3G (ENF-03).
- Remboursement automatique déclenché en < **1 min** après la clôture fautive.

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ PM-27 | Sessions actives simultanées max par professionnel : proposition **3** |
| ❓ PM-28 | Démarrage automatique de session après paiement (si pré-consultation non transmise) : proposition **10 min** |
| ❓ PM-29 | Prolongation gratuite cumulée max : proposition **+30 min** |
| ❓ PM-30 | Délai de dépôt du compte-rendu : proposition **24 h** (gains gelés au-delà) |
| ⚠️ Définition du « message » (D-008) | Un simple « Bonjour » du professionnel annule le remboursement automatique — le garde-fou complémentaire est la notation + signalement ; à surveiller au pilote |
| ⚠️ Litiges après échange | La zone grise (professionnel peu utile mais présent) repose sur notation, signalement et remboursement manuel (M16) — politique à préciser au modèle opérationnel (Phase 3) |

---

*Phase 2 — module 6/12 · Précédent : [[M05_annuaire_professionnels]] · Suivant : M07 Carnet · Index : [[../00_HOME|HOME]]*

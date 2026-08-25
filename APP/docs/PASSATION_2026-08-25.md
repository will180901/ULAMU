# Passation — 25/08/2026

> **Fichier de reprise.** À lire en entier au début d'une nouvelle session, avant toute action.
> Il remplace `PASSATION_2026-08-05.md` comme point de reprise.

---

## 0. En une phrase

On **reconstruit de zéro** les interfaces web B, C et E d'ULAMU. Avant de coder, on **aligne
la maquette et le cahier des charges**, écart par écart. On est au milieu de cet alignement.
**Rien n'est à coder tant qu'il n'est pas terminé.**

---

## 1. Le projet

**ULAMU** — plateforme de santé numérique, Congo-Brazzaville. Contexte réel : **soutenance de
licence informatique**. Pas de budget, aucun service payant.

Trois acteurs seulement au périmètre :

| Acteur | Client |
|---|---|
| Patient | app **mobile** (déjà très avancée, 25 écrans) |
| Médecin | app **web** ← c'est ici qu'on travaille |
| Administrateur | app **web** ← ici aussi |

**La pharmacie est écartée** du MVP (écrans D1→D4, variante officine du tableau de bord, sujet
`FACILITY` de vérification, type de compte « Structure / Pharmacie » à l'inscription).

---

## 2. L'environnement — les pièges d'abord

### Dossiers imbriqués
Le dépôt git est dans le dossier **intérieur** :
```
C:\Users\ADMIN\Desktop\ULAMU\          ← les sessions Claude s'ouvrent ICI
C:\Users\ADMIN\Desktop\ULAMU\ULAMU\    ← le dépôt git est ICI
                              └ APP\apps\{api,mobile,web}
                              └ APP\docs\
```

### Chaîne de déploiement
`git push` → GitHub `will180901/ULAMU` (branche `main`) → **Render redéploie tout seul**.
- `ulamu-api.onrender.com` — NestJS, lance `prisma migrate deploy && node dist/src/main.js`
- `ulamu-web.onrender.com` — React + Vite

### ⚠️ UNE SEULE base de données
Neon `ep-jolly-butterfly-asgnfoxu` sert **le local ET le site en ligne**.
**`npm test` côté API a effacé la base de production une fois** (les tests d'intégration font
`deleteMany()`). Un garde-fou existe maintenant : `apps/api/test/garde-base-de-test.ts` refuse de
tourner sans `TEST_DATABASE_URL` distincte. **Ne jamais le contourner.**

### Autres pièges rencontrés
- Les **heredocs de plus de ~150 lignes échouent** dans ce Bash → utiliser l'outil `Write`.
- `tsc` sur le web se lance **depuis la racine `apps/web`**, pas depuis `src/`.
- Le script de seed s'appelle **`prisma:seed`**, pas `seed`. Données de démo :
  `$env:SEED_DEMO="true"` avant de lancer.
- Plan gratuit Render : le serveur **s'endort après ~15 min**. Premier appel = ~50 s d'attente.

---

## 3. Les règles du porteur — non négociables

1. **Une seule chose à la fois.** Expliquer d'abord, en français simple, avec les raisons du choix.
   Puis attendre la validation. Puis avancer.
2. **On ne teste JAMAIS en local.** La vérité est `https://ulamu-web.onrender.com`. Le porteur pousse
   lui-même sur GitHub, teste en ligne, confirme.
3. **Ne jamais bâcler, aucune omission.** En cas de doute ou de difficulté : le dire, puis proposer
   des solutions.
4. **Constater ne suffit pas** : tout écart ou toute omission s'accompagne d'une **proposition de
   correction** — le geste technique, son coût réel, et une recommandation argumentée (y compris
   « ne pas le faire »).
5. **Parler comme deux humains** : français simple, phrases courtes et détaillées.
6. Deux règles intangibles d'interface : les écrans d'authentification gardent le **carrousel à
   gauche 42 % / formulaire à droite 58 %**, et le **logo ULAMU** est conservé.

---

## 4. Pourquoi on repart de zéro

Le 25/08, le porteur a examiné les 14 écrans déjà construits et a tranché :

> « tout est bâclé sauf les interfaces d'authentification que je valide pour l'instant, le reste je
> valide pas, c'est beau mais ça ne suit pas mon objectif »

- **A1 → A4 (authentification) : VALIDÉS**, on n'y touche plus.
- **B, C, E : à refaire entièrement.**

La cause, identifiée honnêtement : j'ai lu les maquettes `.dc.html` **comme du texte** (grep, sed),
sans jamais les **afficher**. J'ai transcrit la structure, pas les proportions. Et j'ai reconstruit
sur shadcn, qui a sa propre allure — sur les 10 classes `ul-` des maquettes, 5 seulement sont
réutilisées.

---

## 5. LA méthode convenue — l'ordre à respecter

| | Étape | État au 25/08 |
|---|---|---|
| 1 | Lire tout le cahier des charges | ✅ **fait** (40 fichiers) |
| 2 | **Aligner maquette ↔ cahier, famille par famille, point par point** | 🔵 **EN COURS — 1 famille sur 4** |
| 3 | Réécrire le plan | ⬜ pas commencé |
| 4 | Implémenter : **une fonctionnalité à la fois, backend d'abord, puis son frontend** | ⬜ pas commencé |

> **⚠️ NE PAS TOUCHER à `PLAN_EXECUTION_WEB.md`.** Il décrit le travail refusé. Il sera réécrit à
> l'étape 3, quand les 4 familles seront tranchées. Le réécrire avant, c'est le réécrire deux fois.

---

## 6. La règle d'arbitrage — tranchée le 25/08

> **La maquette décide de la FORME. Le cahier des charges décide des FAITS.**

- **Forme** : disposition, densité, composants, états, ton, maître-détail, panneaux latéraux.
  La maquette fait autorité.
- **Faits** : les chiffres PM-xx, les règles RM-xx, ce qui existe côté serveur. Le cahier fait
  autorité. « Commission 12 % » n'est pas un choix de design, c'est une erreur de donnée.

Cette règle **remplace** `04_ux_ui/README.md` §3, qui donnait tout au cahier — y compris la forme,
ce que le porteur ne veut pas.

---

## 7. Où on en est exactement — l'alignement

Document vivant : **`APP/docs/ALIGNEMENT_MAQUETTE_CAHIER.md`** (non commité au 25/08).

### Le fait qui a tout changé

**Les 11 manques de la famille 4 existent DÉJÀ côté serveur**, codés et testés. Vérifié route par
route. Aucun backend à écrire pour cette famille — c'est du travail d'interface uniquement.

### Famille 4 — « ce que la maquette oublie » : 10 validés, 1 en attente

| # | Point | État | Décision retenue |
|---|---|---|---|
| 1 | Prolongation gratuite | ✅ validé | Bouton « + 10 min », pas de 10 (conforme au cahier ; le serveur accepte tout entier ≥ 1). Crédit restant affiché, plafond PM-29 = 30 min. `POST /v1/care-sessions/:id/extend` |
| 2 | Carnet en session | ✅ validé | Panneau latéral droit. Allergies / groupe sanguin / chroniques en tête, puis chronologie filtrable. 3 mentions imposées : « lecture seule », « votre consultation est enregistrée », « l'accès s'est refermé ». **Le serveur ferme l'accès dès que le décompteur atteint zéro** → le compte-rendu tardif n'aura plus le Carnet. `GET /v1/care-sessions/:id/record` + `/record/summary` |
| 3 | Garde-fou allergies | ✅ validé | Alerte rouge nommant médicament ET allergie, lien vers le Carnet, deux issues (retirer / prescrire avec motif obligatoire). Scellement bloqué tant qu'un conflit vit. Le serveur répond `409 code:"ALLERGY_GUARD"` avec `conflicts[]`. Mention permanente : le contrôle ne porte **que** sur le référentiel, pas sur le texte libre |
| 4 | **C7 — Ordonnance (écran neuf)** | ✅ validé | **Aucune maquette n'existe pour prescrire.** Panneau ouvert depuis C5. Recherche au référentiel, repli texte libre marqué « non vérifié », posologie / durée / quantité. Avertissement d'immuabilité avant scellement (RM-09-05), puis QR + expiration. `POST /v1/prescriptions/sessions/:id`, `GET /v1/medicaments?q=` |
| 4bis | Référentiel médicaments | ✅ validé | **Option B : passer de 6 à ~60 médicaments courants.** Il n'y en a que 6 aujourd'hui (Amlodipine, Ramipril, Paracétamol, Amoxicilline, Métronidazole, Ibuprofène), issus du seed de démo. Sans ça, la démonstration tombe sur un écran vide devant le jury |
| 5 | **Présence en ligne / absent** | ✅ validé | **À CONSTRUIRE EN PREMIER.** Pastille + mot dans la barre du haut (ONLINE / DO_NOT_DISTURB / OFFLINE), battement de cœur toutes les 5 min tant que l'onglet vit. **Sans lui, `isAvailableForInitiation` renvoie `false`, le bouton « initier » du patient reste gris, et AUCUNE démonstration n'est possible.** `POST /v1/presence/state`, `/presence/heartbeat`, `GET /presence/me` |
| 6 | Plafond 3 sessions (PM-27) | ✅ validé | **Affichage seul, aucune action.** « 1 consultation sur 3 » discret ; à 3, la pastille passe à « Occupé » avec la raison. Aucun réglage côté médecin — PM-27 se change dans E3 |
| 7 | Note du patient | ✅ validé | Bloc « Ce que les patients voient » dans C2 ; note par consultation dans C4. Délai traduit en langage humain. **Aucun moyen de répondre, masquer ou contester** — un avis abusif passe par un signalement M04. `GET /v1/directory/:id` (route publique) |
| 8 | Proposition de suivi | ✅ validé | **Rien à construire.** Le serveur envoie la proposition **tout seul** au dépôt du compte-rendu, si une offre `FOLLOW_UP` active existe. Deux phrases seulement : dans C2 (dire que l'offre déclenche la relance), dans C4 (dire si elle est partie, et sinon pourquoi) |
| 9 | Remboursement automatique | ✅ validé | **Rien de fonctionnel**, trois avertissements : C5 tant que le médecin n'a rien écrit (« vous ne percevrez rien »), C4 sur une consultation remboursée, C6 près du solde en attente. Limite assumée : un seul « Bonjour » annule le remboursement → **ne pas écrire cette limite à l'écran** |
| 10 | Procédures support | ✅ validé | **Dans E7**, pas d'écran neuf (c'est là qu'on cherche le compte). Types `PHONE_CHANGE`, `OWNER_UNREACHABLE`, `RECORD_TRANSFER`, `OTHER`. Phrase imposée : « cette procédure enregistre votre intervention, elle ne change rien par elle-même » (RM-16-01). Le moins spectaculaire des onze, retenu car exigence MVP |
| 11 | Avenant au contrat | ⏸ **EN ATTENTE** | **Présenté, pas encore validé — REPRENDRE ICI.** Proposition : dans E3, remplacer la case morale par le vrai compte (« ce taux figure dans N contrats signés ») ; dans C1, le parcours de re-signature. Changer PM-01/PM-02 dans E3 **ré-édite automatiquement** les contrats signés (lots de 500) — sans écran de re-signature dans C1, on casse les contrats sans offrir de les réparer |

---

## 8. Ce qui reste à aligner — familles 1, 2, 3

Écarts déjà identifiés et vérifiés, **pas encore arbitrés**. Ne pas refaire l'extraction.

### Famille 1 — l'argent (6 écarts)

| Maquette | Cahier |
|---|---|
| Commission **12 %** (C1, C2, C6) | **10 %** — PM-01, D-022. Le 12 % est écrit **dans le texte du contrat signé à l'écran** (C1) |
| « Versement le **5 de chaque mois** » (C1, C6) | Retrait **à la demande**, exécuté < 24 h — EF-13-07, PM-36 |
| Retrait minimum **5 000 XAF** (C6) | Aucun minimum n'existe |
| Double validation > **100 000 XAF** (E2) | **50 000 XAF** — PM-35 |
| « Remboursement sous **15 jours** » (E5) | Immédiat, < 1 min — PM-12, EF-13-04 |
| « Compte de versement Mobile Money vérifié » (C6) | N'existe pas. `startWithdrawal` lit le **téléphone du compte** |

### Famille 2 — les délais (5 écarts)

| Maquette | Cahier |
|---|---|
| Compte-rendu sous **48 h** (C4, C5) | **24 h** — PM-30. Au-delà : gains gelés |
| Demandes : compte à rebours de **12 h** (C3) | **5 minutes** — PM-07. 12 h serait un rendez-vous, ce qu'ULAMU supprime |
| « L'administration répond sous 24 h ouvrées » (C1) | Aucune messagerie support n'existe |
| Écart financier instruit sous **7 jours** (E2) | **24 h** — EF-13-09 |
| Préavis de **30 jours** sur un changement de taux (E3) | « Notifié à l'avance », sans chiffre — EF-03-07 |

### Famille 3 — concepts inexistants (15 écarts)

1. **« 6 rendez-vous »** (B1) — ULAMU ne prend aucun rendez-vous (D-006, D-007). Zéro occurrence
   d'« agenda » dans les 16 modules
2. **« Créneau proposé »** (C3) — aucune planification dans M06
3. **« Clinique de Bacongo »** en rattachement (B1) — les cliniques sont **V2 « Could »**
4. **Lieux de consultation / cabinet / adresse / horaires** (C2) — EF-05-01 ne connaît que
   l'arrondissement
5. **« Téléconsultation » activable** (C2) — toute la plateforme *est* de la messagerie
   (vision §6 : ni vidéo ni audio au démarrage)
6. **« Langues de consultation »** (C2) — D-005 / PM-15 : français uniquement
7. **« Langue de l'interface » FR/EN** (B3) — idem, et aucun système de traduction n'existe
8. **« Message du patient » / « Éléments transmis » / « Pièces jointes »** au stade de la demande
   (C3) — RM-06-03 (aucun message hors session active) + EF-06-04 (pré-consultation **après**
   paiement)
9. **« Retenu pour le compte-rendu »** (C5) — aucun mécanisme d'épinglage
10. **« Suivi en officine »** (C4) — branche pharmacie hors périmètre ; `qtyDispensed` resterait à 0
11. **« Couverture par arrondissement »** avec données de population (E5) — cette donnée n'existe pas
12. **« Créer un administrateur » (nom + téléphone)** (E4) — EF-02-08 : les sous-rôles s'attribuent
    à des comptes **existants**. Et **E7 écrit lui-même** : « Un compte ne peut être créé que par son
    titulaire, jamais par l'administration ». **La maquette se contredit toute seule**
13. **« Durée de la suspension »** (E7) — `SanctionCompte` n'a pas de champ durée
14. **Boutons « Exporter »** un peu partout (B1, C4, E2, E5, E7) — EF-04-04 ne prévoit l'export que
    pour le **journal d'audit**
15. **« Rechercher un patient » / ⌘K** (tous les écrans médecin) — problème de vie privée :
    EF-06-01 impose une **fiche anonymisée** (prénom + âge). Côté admin, la recherche de comptes est
    légitime (EF-16-03)

---

## 9. Ce que j'ai appris du cahier des charges — l'essentiel

### Les chiffres à ne jamais inventer (PM-xx)
PM-01 commission **10 %** · PM-02 retrait **0 %** · PM-03 dévoilement **500 XAF** · PM-06 plancher
**500 XAF** · PM-07 poignée de main **5 min** · PM-09 offres **10 à 60 min** · PM-10 ordonnance
**30 j** · PM-11 vérification **72 h** · PM-13 note **1 à 5** · PM-18 blocage **5 échecs / 15 min**
· PM-25 **5 offres** max · PM-26 absent après **15 min** · PM-27 **3 sessions** simultanées ·
PM-28 démarrage auto **10 min** · PM-29 prolongation **+30 min** · PM-30 compte-rendu **24 h** ·
PM-35 double validation **50 000 XAF** · PM-36 retrait **< 24 h** · PM-37 notifications **90 j**

### Les règles qui structurent tout
- **D-007 / RM-06-01** — jamais de paiement sans confirmation valide. La loi du module M06
- **D-008** — session sans aucun message du pro → remboursement intégral automatique
- **RM-06-02** — l'horloge du serveur fait foi
- **RM-06-03** — aucun message hors session active. Pas de messagerie libre
- **RM-06-04** — gains crédités **seulement** après dépôt du compte-rendu
- **RM-03-01** — badge vérifié **+** contrat signé = condition absolue de toute pratique
- **RM-16-01** — le pilotage **lit**, n'écrit jamais dans les domaines métier
- **RM-16-02** — aucun admin n'accède au Carnet ni aux sessions. Barrière technique
- **RM-04-03** — le contenu médical n'entre **jamais** dans l'audit
- **RM-14-02** — les notifications critiques ne sont pas désactivables

### La « liste rouge » — 10 invariants à ne jamais casser
`03_conception_transverse/strategie_tests.md` §2. Notamment : n°1 pas de paiement sans confirmation,
n°8 aucun accès admin au Carnet, n°9 remboursement automatique D-008.

### Trois dérives documentaires jamais arbitrées
Le code ne fait pas ce que M01 décrit. **À trancher un jour :**

| Le cahier dit | Le code fait |
|---|---|
| OTP par **SMS** (EF-01-01) | par **email** (Brevo) |
| Connexion par **téléphone** (EF-01-03) | nom d'utilisateur **ou** email |
| TOTP **optionnel** pour les pros (RM-01-06) | déclaré **obligatoire** sur le web — et B3 l'affiche comme non désactivable |

---

## 10. État technique au 25/08

- Dernier commit : `8d8c23e` — « C4 — Consultations »
- **Non commité** : `APP/docs/ALIGNEMENT_MAQUETTE_CAHIER.md`
- Suites vertes : **web 164 tests** (17 fichiers), **API 465 tests unitaires**, lint 0, build 3,2 s
- Backend : **13 modules livrés** (M01-M07, M09, M11-M14, M16). M08 / M10 / M15 = V1, non codés
- Les fichiers (pièces justificatives, avatars, médias) sont **en base PostgreSQL**, chiffrés
  AES-256-GCM — le disque de Render n'est pas persistant

### Dettes ouvertes, côté porteur
1. **`SECRETBOX_KEY` n'a aucune sauvegarde.** Perdue = toutes les pièces justificatives illisibles
2. Des comptes de démonstration avec le mot de passe `demo1234` sont dans la base de production
3. `ADMIN_REQUIRE_TOTP=false` sur Render
4. Les tests d'intégration API sont bloqués tant qu'une branche Neon de test n'existe pas

---

## 11. La toute prochaine action

**Reprendre le point 11 de la famille 4** (avenant au contrat) : il a été présenté au porteur, qui
n'a pas encore répondu. Le lui re-présenter brièvement, obtenir sa décision, l'inscrire dans
`ALIGNEMENT_MAQUETTE_CAHIER.md`.

**Ensuite**, ouvrir la **famille 1 — l'argent**, au même rythme : un point, ses raisons, son coût,
une recommandation, puis attendre la validation.

**Ne pas coder. Ne pas toucher au plan.** Pas avant que les 4 familles soient tranchées.

# Alignement maquette ↔ cahier des charges

| Champ | Valeur |
|---|---|
| Ouvert le | 2026-08-25 |
| Raison | Reconstruction de B, C, E à partir de zéro. Avant de coder, aligner les deux sources. |
| Périmètre | Web uniquement (médecin + administrateur). Mobile = patients. Pharmacie écartée du MVP. |

---

## Règle d'arbitrage (tranchée le 25/08/2026)

> **La maquette décide de la FORME. Le cahier des charges décide des FAITS.**

- **Forme** — disposition, densité, composants, états, ton des textes, maître-détail, panneaux
  latéraux. La maquette fait autorité, sans discussion.
- **Faits** — les chiffres (PM-xx), les règles métier (RM-xx), ce qui existe côté serveur.
  Le cahier fait autorité. Une maquette qui écrit « 12 % » quand le contrat signé dit 10 %
  ne fait pas un choix de design : elle porte une erreur de donnée.

Cette règle remplace `04_ux_ui/README.md` §3 pour ce chantier — celle-ci donnait tout au cahier,
y compris la forme, ce qui n'est pas ce que le porteur veut.

---

## Famille 4 — Ce que la maquette OUBLIE

**Constat qui change tout : les 11 manques existent DÉJÀ côté serveur, codés et testés.**
Aucun backend à écrire. C'est du travail d'interface uniquement.

| # | Manque | Exigence | Route serveur (existe) | Décision | Écran |
|---|---|---|---|---|---|
| 1 | Prolongation gratuite de session | EF-06-07, PM-29 (+30 min max) | `POST /v1/care-sessions/:id/extend` | ✅ **VALIDÉ 25/08** — bouton « + 10 min », pas de 10 conformes au cahier (le serveur accepte tout entier ≥ 1 ; on s'en tient au cahier : 3 clics max, pas de saisie en pleine consultation). Crédit restant affiché, ligne dans le fil après usage. | C5 |
| 2 | Carnet du patient en session | EF-06-06, RM-06-05 (lecture seule, tracé) | `GET /v1/care-sessions/:id/record` et `/record/summary` | ✅ **VALIDÉ 25/08** — panneau latéral droit. Allergies / groupe sanguin / chroniques en tête, puis chronologie filtrable. Trois mentions imposées : « lecture seule », « votre consultation est enregistrée », « l'accès s'est refermé avec la consultation ». Le serveur ferme l'accès dès que le décompteur tombe à zéro : le compte-rendu tardif n'aura plus le Carnet. | C5 |
| 3 | Garde-fou allergies | EF-09-03 (alerte bloquante, passage outre motivé) | 409 `code: ALLERGY_GUARD` + `conflicts[]` sur `POST /v1/prescriptions/sessions/:id` | ✅ **VALIDÉ 25/08** — alerte rouge nommant médicament ET allergie, lien vers le Carnet, deux issues (retirer / prescrire avec motif obligatoire). Scellement bloqué tant qu'un conflit vit. Mention permanente : le contrôle ne porte que sur le référentiel, pas sur le texte libre (EF-09-02). Comparaison par inclusion de noms — utile, pas exhaustive : dit à l'écran. **Dépend entièrement de C7.** | C7 |
| 4 | Rédaction de l'ordonnance | EF-09-01, D-014 | `POST /v1/prescriptions/sessions/:sessionId` + `GET /v1/medicaments?q=` | ✅ **VALIDÉ 25/08** — écran neuf **C7**, en panneau depuis C5 (le médecin ne quitte pas le fil). Recherche au référentiel, repli texte libre marqué « non vérifié », posologie/durée/quantité par ligne, avertissement d'immuabilité avant scellement (RM-09-05), QR + expiration après. **Référentiel porté de 6 à ~60 médicaments courants (option B, validée porteur)** — sinon la démonstration tombe sur du vide. | C7 |
| 5 | Statut en ligne / absent | EF-05-05, EF-05-06, PM-26, RM-05-04 | `POST /v1/presence/state`, `/presence/heartbeat`, `GET /presence/me` | ✅ **VALIDÉ 25/08** — pastille + mot dans la barre du haut (3 états), battement de cœur toutes les 5 min tant que l'onglet vit. **À CONSTRUIRE EN PREMIER** : sans lui `isAvailableForInitiation` renvoie false, le bouton « initier » du patient reste gris, et AUCUNE démonstration n'est possible. | B1 |
| 6 | Plafond de 3 sessions simultanées | PM-27, EF-06-14 | compté en transaction sérialisable à l'initiation | ✅ **VALIDÉ 25/08** — affichage seul, aucune action. « 1 consultation sur 3 » discret ; à 3, la pastille passe à « Occupé » avec la raison. Aucun réglage côté médecin : PM-27 se change dans E3 par le super-admin. Sans cet affichage, le médecin croit à une panne quand les demandes cessent. | B1 |
| 7 | Notation laissée par le patient | EF-06-11, EF-05-01, EF-05-07 | `GET /v1/directory/:id` (publique) — moyenne, nombre, taux de confirmation, délai moyen, 10 derniers commentaires | ✅ **VALIDÉ 25/08** — bloc « Ce que les patients voient » dans C2 ; note par consultation dans C4. Délai traduit en langage humain. **Aucun moyen de répondre, masquer ou contester** : le cahier n'en prévoit pas, un avis abusif passe par un signalement M04. Le taux de confirmation est public et baisse si des demandes expirent (R-04) — dit à l'écran. | C2, C4 |
| 8 | Proposition de session de suivi | EF-06-12, D-016 | **automatique** : au dépôt du compte-rendu, le serveur cherche une offre FOLLOW_UP active et notifie le patient. Aucun geste du médecin. | ✅ **VALIDÉ 25/08** — **rien à construire**. Deux phrases seulement : dans C2, dire qu'une offre « suivi » déclenche la relance automatique ; dans C4, dire si la proposition est partie ou non (et pourquoi). Aucun bouton : il ferait doublon avec l'envoi serveur. Trouvé en lisant le code, invisible dans la maquette comme dans le cahier. | C2, C4 |
| 9 | Remboursement automatique | D-008, EF-06-09, invariant n°9 de la liste rouge | `refundRequired` = aucun message du pro ; auto-réparant, rejoué à chaque lecture + balayage | ✅ **VALIDÉ 25/08** — **rien de fonctionnel**, trois avertissements : C5 tant que le médecin n'a rien écrit (« vous ne percevrez rien »), C4 sur une consultation remboursée, C6 près du solde en attente. Limite assumée : un seul « Bonjour » annule le remboursement (risque documenté au cahier, garde-fou = notation + signalement). **On n'écrit pas cette limite à l'écran** — ce serait le mode d'emploi de la triche. | C5, C4, C6 |
| 10 | Procédures support | EF-16-03, CU-16-04 (exigence **MVP**) | 4 routes `/v1/admin/support-procedures` ; types `PHONE_CHANGE`, `OWNER_UNREACHABLE`, `RECORD_TRANSFER`, `OTHER` | ✅ **VALIDÉ 25/08** — dans **E7**, pas d'écran neuf (c'est là qu'on cherche le compte). Type en langage clair, étapes à cocher, justification obligatoire, liste des procédures ouvertes en tête. Phrase imposée : « cette procédure enregistre votre intervention, elle ne change rien par elle-même » (RM-16-01 : M16 guide et journalise, il n'agit pas). **Le moins spectaculaire des onze — retenu quand même : exigence MVP écrite, serveur prêt.** | E7 |
| 11 | Avenant au contrat | EF-03-07, CU-03-04, RM-03-05 | Changement de PM-01/PM-02 dans E3 → **ré-édition automatique** des contrats signés (lots de 500) + `POST /v1/admin/verification/:caseId/agreement/reissue`, idempotent | ⏸ **PRÉSENTÉ 25/08 — EN ATTENTE DE VALIDATION**. Proposition : dans E3, remplacer la case morale par le vrai compte (« ce taux figure dans N contrats signés ») ; dans C1, le parcours de re-signature (ancien → nouveau taux, avertissement lecture seule à l'échéance). Sans C1, E3 casse les contrats sans offrir de les réparer. Le « préavis 30 jours » de la maquette n'existe nulle part → famille 2. | E3 + C1 |

### Le point 4 mérite une explication

**Aucune maquette n'existe pour la rédaction d'ordonnance.** Ni dans les 24 fichiers livrés,
ni ailleurs. C'est le trou le plus grave du lot :

- C'est l'**étape 7** du parcours de soin (vision §2).
- Sans elle, le parcours 🅰 s'arrête au compte-rendu, et le parcours 🅱 — trouver son
  médicament — ne peut **jamais** démarrer, faute d'ordonnance à présenter.
- Le garde-fou allergies (point 3) n'a nulle part où vivre.

Cet écran est donc **créé de zéro**, dans le langage visuel des autres — ce que la règle 2 de
`04_ux_ui/README.md` prévoit explicitement pour les écrans manquants. Il est nommé **C7 —
Ordonnance**.

### Ce qui NE sera pas ajouté, et pourquoi

Rien. Les 11 sont retenus. Ils sont tous exigés par le cahier, tous déjà servis par l'API,
et aucun ne dépend de la branche pharmacie.

---

## Familles 1 à 3 — à trancher

- **Famille 1 — l'argent** : 6 écarts (commission 12 % vs 10 %, versement mensuel vs retrait à
  la demande, seuil 100 000 vs 50 000 XAF…). *Non ouverte.*
- **Famille 2 — les délais** : 5 écarts (48 h vs 24 h, 12 h vs 5 min…). *Non ouverte.*
- **Famille 3 — concepts inexistants** : 14 écarts (rendez-vous, créneaux, cliniques, langues,
  cabinets…). *Non ouverte.*

---

## Journal des arbitrages

| Date | Objet | Décision |
|---|---|---|
| 25/08/2026 | Règle d'arbitrage générale | Maquette = forme, cahier = faits |
| 25/08/2026 | Famille 4 — les 11 manques | Tous retenus ; C7 Ordonnance créé de zéro |
| 25/08/2026 | Point 1 — prolongation | Validé porteur : pas de 10 min, plafond 30 min affiché |
| 25/08/2026 | Point 10 — procédures support | Validé porteur : intégré à E7, pas d'écran neuf |
| 25/08/2026 | Point 9 — remboursement automatique | Validé porteur : avertir AVANT la perte, pas expliquer après |
| 25/08/2026 | Point 8 — proposition de suivi | Validé porteur : rien à construire, deux phrases explicatives |
| 25/08/2026 | Point 7 — notation | Validé porteur : lecture seule, aucune réponse possible aux avis |
| 25/08/2026 | Point 6 — plafond 3 sessions | Validé porteur : affichage seul, pastille « Occupé » |
| 25/08/2026 | Point 5 — présence | Validé porteur : 3 états + battement de cœur. Premier chantier de la reconstruction |
| 25/08/2026 | Point 4 — C7 Ordonnance | Validé porteur : écran neuf + référentiel élargi à ~60 (option B) |
| 25/08/2026 | Point 3 — garde-fou allergies | Validé porteur : bloquant, motif obligatoire, limites annoncées |
| 25/08/2026 | Point 2 — Carnet en session | Validé porteur : panneau latéral, lecture seule, accès tracé et refermé à la clôture |

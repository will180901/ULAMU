# Vision — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) |
| Décisions liées | [[registre_decisions]] |

---

## 1. Le problème

Au Congo-Brazzaville, se soigner est un parcours du combattant. Le patient fait la queue à l'accueil, paie en cash sans toujours recevoir de reçu, attend des heures, repart avec une ordonnance papier qu'il peut perdre, puis marche de pharmacie en pharmacie en espérant trouver ses médicaments. Personne ne conserve son historique : chaque consultation repart de zéro, le carnet papier se paie et s'égare. En zone rurale, le médecin est souvent à des heures de route.

## 2. La solution

**ULAMU numérise le parcours de soin réel** — celui que chaque Congolais connaît déjà — étape par étape :

| Étape réelle | Dans ULAMU | Rémunération ULAMU |
|---|---|---|
| 1. Accueil, carnet | Inscription gratuite, **dossier médical gratuit à vie** | Aucune |
| 2. Caisse | Paiement Mobile Money **après poignée de main** (D-007) | Commission incluse côté professionnel |
| 3. Triage (constantes) | Questionnaire de pré-consultation gratuit + triage terrain optionnel par un infirmier | Commission sur le triage payant |
| 4. Salle d'attente | **Supprimée** — notification quand le professionnel est prêt | — |
| 5. Consultation | **Session de messagerie chronométrée** (texte, photos, vocaux) + compte-rendu obligatoire | Déjà prise à l'étape 2 |
| 6. Examens | Demande d'examens numérique → recherche labo → résultats versés au dossier | Dévoilement (D-009) |
| 7. Ordonnance | Numérique, signée, QR code, vérification des allergies — gratuite | — |
| ~~8. Pharmacie~~ | ~~Recherche par ordonnance → dévoilement + réservation 24 h → scan QR, délivrance, stock décrémenté~~ | ❌ **RETIRÉ du produit le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]). Le patient garde son ordonnance scellée sur son téléphone ; il la présente comme une ordonnance papier, hors chaîne ULAMU. |
| 9. Suivi | Rappels de médicaments gratuits, session de suivi à tarif réduit | Commission sur le suivi |

## 3. Les acteurs

- **Patients** — app mobile, acteur central.
- **Professionnels de santé** : prescripteurs (généralistes, spécialistes, dentistes, sages-femmes) et non-prescripteurs (infirmiers, agents de santé communautaire) — application web.
- ~~**Structures** : pharmacies et laboratoires, avec espace propre, titulaire et membres — application web.~~ **Retiré le 02/09/2026 ([[registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]]).** ULAMU a **trois acteurs** : le patient (mobile), le soignant et l'administration (web). La pharmacie restait alors un **objet** du modèle. **Le 02/09 également, [[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]] l'a retirée entièrement** : les modules M11 (stocks) et M12 (recherche & dévoilement) sortent du produit.
- **Équipe ULAMU** : administration en sous-rôles — application web.
- **Le Système** : rappels, expirations, remboursements automatiques, alertes.

Détail : [[registre_decisions#D-002 — Acteurs : toutes les catégories de soignants dès le début|D-002]], [[registre_decisions#D-003 — Les pharmacies sont des structures, pas des personnes|D-003]], [[registre_decisions#D-004 — Les laboratoires sont des structures (même modèle que les pharmacies)|D-004]].

## 4. La philosophie économique

> *Le patient est un invité de confiance, les professionnels sont des partenaires sous contrat, et ULAMU gagne un peu sur chaque acte parce que tout le monde y gagne.*

1. **Transparence absolue côté patient** : il paie le prix affiché, jamais un franc de plus, reçu systématique, remboursement automatique en cas de défaillance (D-008). Aucune monétisation envahissante ou gênante.
2. **Commissions faibles et discrètes côté professionnels** : incluses dans le prix, acceptées par **contrat numérique signé** (D-011), assez basses pour que chacun s'en sorte.
3. **Le gratuit construit la confiance** : inscription, dossier médical à vie, ordonnance, rappels de médicaments — gratuits pour toujours.
4. **ULAMU gagne sur les flux, pas sur les barrières** : sessions de consultation, dévoilements/réservations, triage terrain, suivis.

## 5. Les mécanismes signatures (ce qui rend ULAMU unique)

- **La poignée de main avant paiement** (D-007) : aucun paiement possible tant que le professionnel n'a pas confirmé être prêt. Le patient n'est jamais seul devant une messagerie morte.
- **La session chronométrée** (D-006) : décompteur visible, règles claires, prolongation gratuite possible.
- **Le dévoilement-réservation** (D-009) : l'information de disponibilité des médicaments est agrégée et anonyme gratuitement, précise et garantie quand on la paie.
- **Le dossier médical à vie** : chaque consultation, examen et délivrance enrichit l'historique du patient — la mémoire médicale que le pays n'a jamais eue.

## 6. Ce que ULAMU n'est PAS (anti-périmètre du démarrage)

- ~~❌ Pas de localisation publique des pharmacies/labos (cœur du modèle de dévoilement).~~ **Sans objet depuis le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]) : il n'y a plus de dévoilement.
- ❌ Pas de paiement des examens de laboratoire via la plateforme (au labo, hors plateforme).
- ❌ Pas de multilinguisme au lancement : **français uniquement** (D-005).
- ❌ Pas d'app mobile pour les professionnels : mobile = patients, web = tous les autres (D-012).
- ❌ Pas de consultation vidéo/audio en direct au démarrage : la messagerie est le seul portail de consultation.

## 7. L'ambition à terme

Construire la première infrastructure de santé numérique de confiance du Congo-Brazzaville : une mémoire médicale nationale portée par les patients eux-mêmes, un réseau de professionnels et de structures partenaires sous contrat, et — à long terme — une source de données de santé anonymisées au service de la santé publique.

---

*Suivant : [[personas_parcours]] (à rédiger) · Index : [[../00_HOME|HOME]]*

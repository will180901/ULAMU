# Glossaire — ULAMU (Langage Ubiquitaire)

| Champ   | Valeur                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| Version | 1.0                                                                            |
| Date    | 2026-06-10                                                                     |
| Statut | 🟢 Validé (2026-06-10) |
| Règle   | Tout document du projet emploie **exactement** ces termes. Un terme = un sens. |

---

## 1. Acteurs

> **ULAMU a TROIS acteurs porteurs d'un compte** — le **patient** (mobile), le **professionnel** et
> l'**administration** (web) — plus **le Système**, acteur automatique.
> Décision [[registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] du 02/09/2026 : le **membre de structure** n'en est plus un.

| Terme             | Définition                                                                                                                                    | Ne pas dire               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Patient**       | Personne qui se soigne via ULAMU. Utilise l'app mobile.                                                                                       | client, utilisateur final |
| **Professionnel** | Toute personne du corps médical avec un compte individuel : prescripteur ou soignant.                                                         | docteur (générique)       |
| **Prescripteur**  | Professionnel habilité à émettre une ordonnance : médecin généraliste, médecin spécialiste, chirurgien-dentiste, sage-femme (domaine limité). | —                         |
| **Soignant**      | Professionnel non prescripteur : infirmier diplômé, agent de santé communautaire.                                                             | aide-soignant             |
| **Structure**     | Entité collective : pharmacie ou laboratoire. **Objet du modèle, plus un titulaire de compte depuis D-051 (02/09/2026)** — la recherche de médicaments du patient en dépend, son espace de gestion non. | établissement |
| ~~**Titulaire**~~ | ~~Responsable légal d'une structure ; crée l'espace et gère ses membres.~~ **Retiré du produit — D-051.**                                      | propriétaire, gérant      |
| ~~**Membre**~~    | ~~Compte rattaché à une structure par son titulaire, avec des droits définis.~~ **Retiré du produit — D-051.**                                 | employé                   |
| **Équipe ULAMU**  | Administration de la plateforme. Sous-rôles : Super Admin, Admin Finance, Admin Vérification, Admin Carte.                                    | back-office, staff        |
| **Le Système**    | Acteur automatique : expirations, rappels, remboursements automatiques, alertes.                                                              | le serveur, le bot        |

## 2. Consultation

| Terme                     | Définition                                                                                                                             | Ne pas dire                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Offre de consultation** | Ce qu'un professionnel propose : durée + prix (ex. 30 min / 5 000 XAF), éventuellement plusieurs offres (standard, suivi).             | tarif, créneau                  |
| **Initiation**            | Geste du patient qui signale vouloir payer une offre. Notifie le professionnel.                                                        | demande, requête                |
| **Confirmation**          | Réponse du professionnel à une initiation : « je suis prêt à recevoir ». Expire après le délai défini ([[parametres_metier]]).         | acceptation, validation         |
| **Poignée de main**       | La séquence complète initiation → confirmation → paiement. Aucun paiement possible sans elle (D-007).                                  | handshake (dans les docs FR)    |
| **Session**               | La consultation elle-même : messagerie activée pour la durée payée, décompteur visible. Seul portail de soin (D-006).                  | conversation, chat, rendez-vous |
| **Décompteur**            | Affichage temps réel du temps de session restant, visible des deux parties.                                                            | timer, compte à rebours         |
| **Pré-consultation**      | Questionnaire gratuit (symptômes, durée, photos) rempli après paiement, lu par le professionnel avant la session (D-019).              | triage (réservé au terrain)     |
| **Prolongation**          | Extension gratuite de la session, à la seule initiative du professionnel (D-016).                                                      | rallonge                        |
| **Session de suivi**      | Session courte à tarif réduit proposée par le professionnel après une consultation (D-016).                                            | contrôle                        |
| **Compte-rendu**          | Synthèse obligatoire (diagnostic, recommandations) rédigée par le professionnel pour clôturer la session ; alimente le Carnet (D-021). | rapport, note                   |
| **Notation**              | Évaluation du professionnel par le patient après chaque session.                                                                       | avis, review                    |

## 3. Dossier médical

| Terme                 | Définition                                                                                                             | Ne pas dire         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Carnet**            | Le dossier médical numérique du patient — gratuit à vie, propriété du patient (D-020). Nom public assumé : « carnet ». | DMP, dossier (seul) |
| **Constantes**        | Mesures physiologiques : tension, température, poids, pouls.                                                           | signes vitaux       |
| **Mission de triage** | Intervention payante d'un soignant qui prend les constantes d'un patient et les enregistre dans le Carnet (D-018).     | visite              |
| **Entrée du Carnet**  | Tout élément ajouté au Carnet : compte-rendu, ordonnance, constantes, résultats d'examens. Horodaté, jamais supprimé.  | enregistrement      |

## 4. Ordonnance & examens

| Terme | Définition | Ne pas dire |
|---|---|---|
| **Ordonnance** | Prescription numérique signée, créée uniquement en session, avec QR unique (D-014). Statuts : active, partielle, délivrée, expirée, annulée. | prescription (générique) |
| **Ligne de prescription** | Un médicament de l'ordonnance : nom, posologie, durée, quantité. | item |
| **Garde-fou allergies** | Vérification automatique de chaque ligne contre les allergies du Carnet ; blocage jusqu'à confirmation explicite du prescripteur. | alerte |
| **Délivrance** | Remise physique des médicaments en pharmacie après scan du QR. Totale ou partielle ; décrémente le stock. | vente |
| **Demande d'examens** | Prescription d'analyses de laboratoire, numérique et signée, créée en session. | bon d'examen |
| **Résultats** | Compte-rendu d'analyses téléversé par le laboratoire directement dans le Carnet (D-015). | bilan |

## 5. Recherche & dévoilement

| Terme | Définition | Ne pas dire |
|---|---|---|
| ~~**Recherche anonyme**~~ | ❌ **Retirée du produit le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]). *Était :* résultat gratuit d'une recherche de produit, par arrondissement, sans l'identité des structures (D-009). | aperçu |
| ~~**Dévoilement**~~ | ❌ **Retiré le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]) — c'était la **2ᵉ source de revenus**. *Était :* achat (500 XAF, D-023) des informations complètes d'une officine. | unlock |
| ~~**Réservation**~~ | ❌ **Retirée le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]) — elle était l'effet du dévoilement. | mise de côté |
| **Session de dévoilement** | Fenêtre de 24 h pendant laquelle les informations dévoilées restent accessibles. Expirée = informations masquées. | accès |

## 6. Paiements & contrats

| Terme | Définition | Ne pas dire |
|---|---|---|
| **Paiement** | Transaction Mobile Money (MTN MoMo / Airtel Money) du patient vers la plateforme. | versement |
| **Commission** | Part ULAMU (10 %, D-022) prélevée côté professionnel, incluse dans le prix affiché. | frais, taxe |
| **Reçu** | Justificatif numérique systématique de tout paiement (D-010). | facture |
| **Remboursement automatique** | Restitution intégrale déclenchée par le Système : professionnel silencieux (D-008) ou annulation. | refund |
| **Gains** | Solde cumulé d'un professionnel ou d'une structure sur la plateforme. | portefeuille, wallet |
| **Retrait** | Transfert des gains vers le Mobile Money du professionnel — 0 % de commission ULAMU (D-022). | payout |
| **Contrat numérique** | Contrat signé électroniquement à l'inscription de tout professionnel/structure : conditions, taux, engagements (D-011). | CGU (distinct) |

## 7. Confiance & vérification

| Terme | Définition | Ne pas dire |
|---|---|---|
| **Vérification** | Examen des documents professionnels (diplôme, autorisation) par l'Admin Vérification. | validation de compte |
| **Badge Vérifié** | Marque visible sur un profil dont les documents ont été vérifiés. Son absence est affichée honnêtement. | certification |
| **Signalement** | Alerte émise par un utilisateur sur un contenu ou comportement inapproprié. | report |
| **Bouton Urgence** | Fonction d'urgence flottante, jamais monétisée, accessible en toutes circonstances (D-013 ; périmètre exact : Q-006). | SOS |

---

*Phase 1 — document 1/7 · Suivant : [[carte_domaines]] (à rédiger) · Index : [[../00_HOME|HOME]]*

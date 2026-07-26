# MODULE M02 — Rôles & Espaces Structures

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-028 |
| Release | MVP — Chantier 1 (pharmacies seulement ; laboratoires en V1, D-026) |
| Domaine | D1 Identité & Accès |
| Dépendances | M01 |

---

## 1. Mission et périmètre

Répondre à la question « **qui a le droit de faire quoi ?** » : rôles globaux et permissions, et gestion des **espaces structures** (une pharmacie n'est pas une personne — D-003) avec titulaire et membres.

**Hors-périmètre explicite :**
- Vérification des structures et contrats → M03
- Stock de la pharmacie → M11
- Laboratoires → V1 (le modèle les supporte, on ne les active pas au MVP)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Titulaire | Crée l'espace structure, gère membres et droits |
| Membre | Travaille dans l'espace selon ses droits |
| Super Admin ULAMU | Attribue les sous-rôles admin |
| Le Système | Applique le contrôle d'accès à chaque requête |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-02-01 | Chaque compte porte un **rôle global** : patient, professionnel (avec catégorie), membre de structure, ou admin (sous-rôle : Super, Finance, Vérification, Carte). |
| EF-02-02 | **Contrôle d'accès systématique** : toute action est vérifiée côté serveur contre la matrice des permissions — jamais seulement masquée à l'interface. |
| EF-02-03 | Création d'un espace structure (pharmacie) par son futur titulaire : nom, arrondissement, quartier, position GPS, horaires. L'espace naît **non vérifié** → enchaîne vers M03. |
| EF-02-04 | Invitation d'un membre par numéro de téléphone : compte créé ou lié (M01), acceptation requise, expiration de l'invitation (PM-22 ❓). |
| EF-02-05 | Droits internes par membre, définis par le titulaire : gérer le stock (M11), traiter les délivrances (M09), consulter les statistiques. **Réservés au titulaire** : membres, contrat, retraits des gains (M13). |
| EF-02-06 | Transfert de titularité avec vérification renforcée (OTP des deux parties + revalidation M03). |
| EF-02-07 | Suspension ou retrait d'un membre par le titulaire — effet en moins d'une minute. |
| EF-02-08 | Sous-rôles admin attribués et révoqués uniquement par le Super Admin, sous TOTP (RM-01-06). |

## 4. Cas d'utilisation

### CU-02-01 — Créer un espace pharmacie
**Acteur :** futur titulaire (web) · **Déclencheur :** après inscription M01.
- *Étant donné* un compte authentifié, *quand* le formulaire structure est complété (dont position GPS posée sur carte), *alors* l'espace est créé en statut « non vérifié », invisible des patients, et le dossier M03 s'ouvre.
- *Étant donné* un espace non vérifié, *alors* aucun stock n'est publiable dans la recherche (C6).

### CU-02-02 — Inviter un membre
- *Étant donné* un titulaire d'espace vérifié, *quand* il invite un numéro avec des droits proposés, *alors* le destinataire reçoit un SMS/notification, et l'invitation expire après PM-22.
- *Étant donné* un numéro sans compte, *quand* l'invitation est acceptée, *alors* le parcours d'inscription M01 s'enchaîne puis le compte est rattaché à l'espace.
- *Étant donné* un membre déjà rattaché à une autre structure, *alors* l'invitation est refusée (RM-02-05, MVP).

### CU-02-03 — Modifier les droits d'un membre
- *Étant donné* un titulaire, *quand* il modifie les droits d'un membre, *alors* effet immédiat, membre notifié, événement d'audit (C5).

### CU-02-04 — Retirer / suspendre un membre
- *Étant donné* un retrait confirmé, *alors* l'accès du membre tombe en < 1 min ; son historique d'actions reste attribué à son nom (traçabilité).

### CU-02-05 — Transférer la titularité
- *Étant donné* un titulaire et un membre cible, *quand* les deux confirment par OTP, *alors* la titularité change, M03 revalide le dossier, audit C5, notification aux deux.
- *Cas sensible :* titulaire décédé ou injoignable → procédure support avec justificatifs (M16).

### CU-02-06 — Contrôle d'accès (transversal)
- *Étant donné* toute requête authentifiée, *quand* l'action demandée n'est pas couverte par les permissions du rôle, *alors* refus explicite, journalisé si l'action est sensible.

## 5. Matrice des permissions (synthèse MVP)

| Action | Patient | Professionnel | Membre | Titulaire | Admin* |
|---|---|---|---|---|---|
| Initier une poignée de main (M06) | ✅ | — | — | — | — |
| Publier une offre de consultation (M05) | — | ✅ (si vérifié) | — | — | — |
| Gérer le stock (M11) | — | — | ✅ (si droit) | ✅ | — |
| Traiter une délivrance (M09) | — | — | ✅ (si droit) | ✅ | — |
| Gérer membres / contrat / retraits | — | — | — | ✅ | — |
| Vérifier un dossier (M03) | — | — | — | — | Vérification |
| Superviser les paiements (M13) | — | — | — | — | Finance |

*\*Chaque sous-rôle admin n'accède qu'à son domaine ; le Super Admin attribue les sous-rôles. Matrice complète tenue à jour dans ce document à chaque nouveau module validé.*

## 6. Données du module

**Référencées :** Utilisateur, Structure, MembreStructure ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D1).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| Invitation | structure, téléphone invité, droits proposés, statut, expiration | Usage unique, expire après PM-22 |
| RoleAdmin | utilisateur, sous-rôle, attribué par, date | Modifiable par Super Admin seul |

## 7. Règles métier

| ID | Règle |
|---|---|
| RM-02-01 | Un seul titulaire actif par structure. |
| RM-02-02 | Toute action dans un espace est tracée au nom du **membre** ET de la **structure** (C5). |
| RM-02-03 | Les permissions se vérifient côté serveur à chaque requête. |
| RM-02-04 | Un espace non vérifié (M03) est invisible des patients et ne peut rien publier. |
| RM-02-05 | **MVP : un compte = une seule structure.** Le multi-rattachement attendra la V1. |
| RM-02-06 | Le rôle global d'un compte ne se cumule pas au MVP (un membre de pharmacie n'est pas en même temps patient sur le même compte) — voir Q-008. |

## 8. Interfaces

| Sens | Contrat |
|---|---|
| Expose | « Ce compte a-t-il le droit X ? » — consommé par tous les modules |
| Expose | Composition d'une structure (titulaire, membres, droits) → M03, M09, M11, M16 |
| Consomme | Statut de vérification (C6 ← M03) ; identité authentifiée (M01) |
| Émet | Événements d'audit (C5) ; invitations via passerelle SMS (RM-01-03) |

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ PM-22 | Expiration des invitations : proposition **7 jours** — à valider |
| ❓ Q-008 (nouvelle) | Cumul des casquettes sur un même numéro (ex. pharmacien aussi patient) : interdit au MVP (RM-02-06), à réétudier en V1 — le téléphone unique rend le sujet sensible |
| ⚠️ Titulaire injoignable | La procédure support (CU-02-05) doit être définie au module M16 |

---

*Phase 2 — module 2/12 · Précédent : [[M01_comptes_authentification]] · Suivant : M03 Vérification & Contrats · Index : [[../00_HOME|HOME]]*

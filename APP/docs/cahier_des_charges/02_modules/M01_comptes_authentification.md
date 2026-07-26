# MODULE M01 — Comptes & Authentification

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-027 |
| Release | MVP — Chantier 1 ([[../01_architecture_fonctionnelle/plan_releases|plan_releases]]) |
| Domaine | D1 Identité & Accès ([[../01_architecture_fonctionnelle/carte_domaines|carte_domaines]]) |
| Dépendances | Aucune (module socle) |

---

## 1. Mission et périmètre

Savoir qui est qui : créer les comptes, authentifier les utilisateurs, protéger l'accès. Le **numéro de téléphone est l'identifiant racine** de tout compte ([[../01_architecture_fonctionnelle/modele_donnees_global|modèle de données]], règle 1).

**Hors-périmètre explicite :**
- Permissions par rôle et espaces structures → M02
- Vérification des professionnels et contrats → M03
- Profil médical du patient (le Carnet) → M07

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Patient | S'inscrit et se connecte sur **mobile** |
| Professionnel | S'inscrit et se connecte sur **web** |
| Équipe ULAMU | Suspend/réactive des comptes (via M16) |
| Le Système | Expire les OTP et les sessions de connexion, bloque les tentatives abusives |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-01-01 | Inscription **patient** : téléphone + vérification OTP SMS + mot de passe + profil minimal (nom, prénom, naissance, sexe, arrondissement). Âge ≥ 18 ans (PM-16). |
| EF-01-02 | Inscription **professionnel** : téléphone + OTP + identité + catégorie professionnelle. Le compte naît **non vérifié** et enchaîne immédiatement vers le dossier de vérification (M03). |
| EF-01-03 | Connexion par téléphone + mot de passe, sur mobile et web. |
| EF-01-04 | Récupération de mot de passe par OTP SMS. |
| EF-01-05 | Gestion des sessions de connexion : liste de ses appareils connectés, déconnexion à distance d'un appareil. |
| EF-01-06 | Blocage temporaire après échecs répétés de connexion (PM-18). |
| EF-01-07 | Changement de numéro de téléphone : OTP sur l'**ancien ET le nouveau** numéro (l'identifiant racine ne change pas à la légère). |
| EF-01-08 | Consentement explicite à l'inscription : CGU + politique de confidentialité acceptées, horodatées, versionnées (loi n° 29-2019, [[../00_cadrage/cadre_reglementaire|cadre réglementaire]]). |
| EF-01-09 | Clôture de compte par l'utilisateur : compte désactivé ; les données médicales du Carnet restent conservées selon les règles de M07 (immutabilité médicale). |
| EF-01-10 | **2FA TOTP** : désactivée par défaut, activation par **bouton bascule** dans les paramètres, association par **QR code** avec une app d'authentification, codes de secours générés. Si activée, le code TOTP est exigé à chaque connexion. |

## 4. Cas d'utilisation (critères d'acceptation inclus)

### CU-01-01 — Inscription d'un patient
**Acteur :** patient · **Déclencheur :** premier lancement de l'app.
**Nominal :** saisie du téléphone → réception OTP SMS → saisie OTP → création mot de passe → profil minimal → consentement → compte créé, Carnet créé (événement vers M07).
- *Étant donné* un numéro jamais utilisé, *quand* l'OTP correct est saisi avant expiration (PM-17), *alors* le compte est créé et l'utilisateur arrive sur l'Accueil connecté.
- *Étant donné* un numéro **déjà enregistré**, *quand* l'inscription est tentée, *alors* le système propose la connexion ou la récupération — jamais de doublon.
- *Étant donné* un OTP expiré ou erroné 3 fois, *alors* un nouvel envoi est nécessaire, limité à 3 envois/heure (PM-19, anti-fraude SMS).
- **Hors ligne :** l'inscription exige une connexion (D-025) ; message clair si réseau absent.

### CU-01-02 — Inscription d'un professionnel
**Nominal :** identique à CU-01-01 (sur web) + choix de la catégorie (généraliste, spécialiste, dentiste, sage-femme, infirmier, agent communautaire) → à la création, redirection obligatoire vers le dépôt du dossier de vérification (M03).
- *Étant donné* un compte professionnel créé, *alors* il est **invisible dans l'annuaire** (M05) tant que M03 n'a pas au minimum enregistré son dossier (contrat C6).

### CU-01-03 — Connexion
- *Étant donné* des identifiants corrects, *alors* session de connexion ouverte (mobile : longue durée PM-20 ; web : expiration après 30 min d'inactivité, ENF-07).
- *Étant donné* 5 échecs en 15 min (PM-18), *alors* blocage temporaire de 15 min + notification au titulaire du compte.

### CU-01-04 — Récupération de mot de passe
- *Étant donné* un numéro enregistré, *quand* l'OTP est validé, *alors* nouveau mot de passe et **toutes les sessions de connexion existantes sont révoquées**.

### CU-01-05 — Changement de numéro
- *Étant donné* la validation OTP sur l'ancien **et** le nouveau numéro, *alors* l'identifiant est mis à jour ; événement d'audit (C5) ; notification sur les deux numéros.
- *Cas sensible :* ancien numéro perdu → procédure manuelle via support (M16), avec vérification d'identité renforcée.

### CU-01-06 — Déconnexion à distance
- *Étant donné* la liste des appareils, *quand* l'utilisateur révoque un appareil, *alors* la session de connexion correspondante est invalidée en < 1 min.

### CU-01-07 — Clôture de compte
- *Étant donné* une demande de clôture confirmée (mot de passe + OTP), *alors* compte désactivé, sessions révoquées, données traitées selon M07 ; réactivation possible via support pendant 30 jours (PM-21), définitif ensuite.

### CU-01-08 — Activation et usage du TOTP
- *Étant donné* le bouton bascule activé dans les paramètres, *quand* l'utilisateur scanne le QR code avec son app d'authentification et confirme avec un premier code valide, *alors* le TOTP est actif et les codes de secours sont affichés une seule fois.
- *Étant donné* un compte avec TOTP actif, *quand* connexion avec mot de passe correct, *alors* le code TOTP (ou un code de secours) est exigé avant l'ouverture de la session de connexion.
- *Étant donné* la perte de l'app d'authentification, *alors* connexion possible par code de secours, ou désactivation via support avec vérification d'identité renforcée (M16).
- Désactivation : bascule dans les paramètres, confirmée par mot de passe + un dernier code valide.

## 5. Données du module

**Référencées au dictionnaire central :** Utilisateur, ProfilPatient, ProfilProfessionnel ([[../01_architecture_fonctionnelle/modele_donnees_global|modele_donnees_global]] §D1).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| SessionConnexion | utilisateur, appareil, jeton, création, dernière activité, statut | Révocable individuellement ; expiration selon client |
| CodeOTP | téléphone, code, finalité (inscription, récupération, changement), expiration, consommé | Usage unique ; jamais journalisé en clair |
| JournalConnexion | utilisateur, horodatage, succès/échec, appareil | Alimente le blocage PM-18 et l'audit C5 |
| Consentement | utilisateur, document (CGU/confidentialité), version, horodatage | Preuve légale, immuable |
| SecretTOTP | utilisateur, secret (chiffré), activé, codes de secours (hachés) | Jamais exposé après l'association ; QR généré à la volée |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-01-01 | Un numéro de téléphone = un seul compte actif. |
| RM-01-02 | Aucun mot de passe stocké en clair, jamais (haché, état de l'art — détail Phase 3). |
| RM-01-03 | L'envoi d'OTP passe par une **passerelle SMS directe**, pas par M14 — M14 notifie des utilisateurs existants, l'OTP précède l'existence du compte. *(Évite tout cycle M01 ↔ M14.)* |
| RM-01-04 | Tout événement sensible (création, blocage, changement de numéro, clôture) émet un événement d'audit (C5). |
| RM-01-05 | Un compte suspendu par l'Équipe ULAMU ne peut ni se connecter ni être clôturé par son titulaire (préservation de preuves). |
| RM-01-06 | TOTP **optionnel** pour patients, professionnels et structures ; **obligatoire** pour les comptes Équipe ULAMU (admins). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Expose | « Qui est cet utilisateur authentifié ? » (identité + type de compte) — consommé par tous les modules |
| Expose | Événement « compte patient créé » → M07 crée le Carnet |
| Expose | Événement « compte professionnel créé » → M03 ouvre le dossier de vérification |
| Émet | Événements d'audit → M04 (C5) |
| Consomme | Passerelle SMS (externe, RM-01-03) |

## 8. Exigences non fonctionnelles spécifiques

- Inscription complète en < **3 minutes** sur le plancher matériel ENF-01.
- OTP reçu en < **30 s** dans 95 % des cas (sinon bouton « renvoyer » après 60 s).
- Coût SMS : ~2 OTP par inscription — à intégrer au [[../00_cadrage/modele_economique|modèle économique]] (coût d'acquisition).

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ⚠️ SIM swap / vol de numéro | Le téléphone est l'identifiant racine — la procédure CU-01-05 et le blocage PM-18 sont les garde-fous ; à approfondir au modèle de menaces (Phase 3) |
| ❓ Q-007 (mineurs) | Tranchée au module M07 (sous-profils du Carnet) — M01 se contente d'exiger 18 ans |
| ✅ Paramètres actés | PM-17 à PM-21 inscrits dans [[../01_architecture_fonctionnelle/parametres_metier|parametres_metier]] (D-027) |

---

*Phase 2 — module 1/12 · Suivant : M02 Rôles & Espaces Structures · Index : [[../00_HOME|HOME]]*

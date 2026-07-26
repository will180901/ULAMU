# Audit fonctionnel ULAMU — Backend / Web / Mobile

**Date de l'audit : 2026-07-26.** Ce document est un instantané daté, pas un état permanent — à re-vérifier contre le code avant toute décision si vous le lisez longtemps après cette date.

**Périmètre réel du projet (confirmé par lecture du code, pas supposé)** : ULAMU = un backend/API (`apps/api`, NestJS 10 + Prisma 5 + PostgreSQL) + une app mobile (`apps/mobile`, React Native 0.76, **patients uniquement**) + une app web (`apps/web`, Vite + React 19, **professionnels/structures/admin uniquement**). **Aucune version desktop n'existe ni n'est prévue.**

**Sur les maquettes** : le dossier `Maquettes_ULAMU/` est aujourd'hui **vide sur le disque** (suppression réelle mais non encore commitée en git au moment de l'audit — `git status` montre ~135 fichiers marqués supprimés). Ce rapport ne s'appuie sur AUCUN souvenir ni supposition de ce à quoi ces maquettes ressemblaient : chaque fiche ci-dessous décrit ce qui existe **réellement dans le code aujourd'hui**, dans l'intention explicite de servir de base à une reconstruction from scratch.

**Méthode** : trois agents indépendants (un par couche, sans visibilité mutuelle) ont audité respectivement `apps/api`, `apps/web`, `apps/mobile` — lecture de code avec preuve chemin:ligne systématique + exécution réelle des commandes build/lint/test de chaque couche. Le croisement entre couches (sections 3, 4, 5) a été fait directement par l'orchestrateur (moi), y compris deux vérifications de première main sur les points les plus sensibles (bootstrap admin par défaut, endpoint de création de structure). La mémoire de sessions précédentes a servi de point de départ mais **chaque affirmation a été revérifiée contre le code actuel** — plusieurs éléments de cette mémoire se sont révélés soit corrigés depuis, soit inexacts (détaillé section 6).

---

## 1. Résumé général

| Couche | Maturité | Build | Lint | Tests |
|---|---|---|---|---|
| **Backend** (`apps/api`) | Très mature — 13 modules sur 16 spécifiés, architecture soignée | ✅ `tsc` propre, 0 erreur | ❌ **cassé** — `eslint` n'est pas installé (`node_modules`/`devDependencies` absents), aucune analyse statique possible actuellement | ✅ 465/465 tests unitaires · ⚠️ 44 tests d'intégration non exécutables cette session (pas de Postgres local disponible — Docker Desktop injoignable) |
| **Mobile** (`apps/mobile`) | Très avancé — 29 écrans navigables, parcours patient quasi complet | ✅ `tsc --noEmit` propre | ❌ **24 erreurs réelles** + 99 avertissements (`eslint .`) | ✅ 3/3 tests (mais un seul fichier de test existe dans tout le mobile — logique pure uniquement, 0% de couverture des écrans) |
| **Web** (`apps/web`) | **Très en amont** — Phase 0 seulement | ✅ `tsc -b && vite build` propre | ✅ 0 erreur, 4 avertissements mineurs | ❌ **aucun test, aucun script de test** |

**En une phrase** : le backend est un socle solide et quasi complet pour le MVP (M01–M07, M09, M11–M14, M16 codés ; M08/M10/M15 confirmés absents à 100 %) ; l'app mobile patient est fonctionnellement riche et couvre la quasi-totalité de son périmètre prévu ; l'app web professionnels/structures/admin, elle, **n'a que l'authentification et une coque vide** — le code lui-même l'affiche littéralement (« Les écrans arrivent bientôt — Phase 1 en construction »). Conséquence directe pour le produit dans son ensemble : **un patient peut aujourd'hui dérouler tout son parcours, mais aucun vrai professionnel ne peut lui répondre depuis une interface réelle** — seul le mode vitrine (soignants factices à confirmation automatique) permet de tester le parcours de bout en bout.

**Trouvaille la plus sérieuse de cet audit** : un bootstrap de compte **SUPER_ADMIN à identifiants par défaut devinables** (mot de passe et secret TOTP inclus) côté backend, non conditionné par le flag de démo — voir section 4.4 et recommandations. À vérifier/corriger en priorité, indépendamment du reste.

---

## 2. Fiches détaillées par écran / fonctionnalité

### 2.1 — Mobile (`apps/mobile`) — app patients, 29 écrans navigables

*Cartographie réelle : `src/screens/` contient 26 fichiers ; `TotpScreens.tsx` en regroupe 5, ce qui donne 29 écrans réellement navigables (confirmé via `RootNavigator.tsx`/`PatientTabs.tsx`/`types.ts`). Un 27ᵉ fichier, `OtpScreen.tsx`, existe mais n'est référencé nulle part — voir note en fin de section. (Le chiffre « 25 écrans » d'une mémoire de session antérieure était imprécis ; les chiffres 26/29 ci-dessus sont ceux vérifiés cette session.)*

#### Authentification (AuthStack)

**WelcomeScreen** — Écran de bienvenue au tout premier lancement. Logo ULAMU, baseline, 3 cartes de valeur statiques (« Dossier médical gratuit à vie », « Payez après la poignée de main », « Médicaments trouvés et réservés »). Actions : « Commencer » → Login, « Créer un compte » → Register (les deux posent le flag `ulamu-onboarded` en AsyncStorage). Aucun appel API. **FAIT.** Preuve : `WelcomeScreen.tsx:17-63`, `services/onboarding.ts:9-23`.

**LoginScreen** — Connexion par nom d'utilisateur + mot de passe. En-tête cobalt avec carrousel d'illustrations tournantes (5 étapes du parcours, texte + SVG). Carte flottante : champ username, champ mot de passe, message d'erreur générique. Liens « Mot de passe oublié ? » et « Créer un compte ». Appel : `POST /v1/auth/login` ; si `totpRequired`, navigue vers TotpChallenge sans créer de session. **FAIT.** Preuve : `LoginScreen.tsx:28-53`. *Point à corriger pour la maquette* : les illustrations viennent d'un CDN externe (`illustrations.popsy.co`) — cassé hors-ligne, à embarquer en assets locaux (voir 6.4).

**RegisterScreen** — Inscription patient en 3 étapes : (1) identité — prénom, nom, username (disponibilité vérifiée en direct, debounce 450 ms), date de naissance, sexe, arrondissement/quartier ; (2) compte — téléphone, mot de passe + confirmation, case CGU **non pré-cochée** (bloque tant que non cochée) ; (3) OTP — code 6 chiffres, bandeau « mode test » si le serveur renvoie un code de debug. Appels : `GET /v1/accounts/username-available`, `POST /v1/accounts/otp/request`, `POST /v1/accounts/register/patient`. **FAIT.** Preuve : `RegisterScreen.tsx:43-265`.

**ForgotScreen** — Réinitialisation mot de passe en 2 étapes (téléphone → code SMS + nouveau mot de passe). Appels : `POST /v1/accounts/otp/request` (purpose PASSWORD_RESET), `POST /v1/auth/password-reset`. **FAIT.** Preuve : `ForgotScreen.tsx:28-119`.

**TotpChallengeScreen** — 2ᵉ facteur à la connexion : code 6 chiffres (validation auto) ou bascule « code de secours » (10 caractères). Réutilise `POST /v1/auth/login` avec le code. **FAIT**, filet de sécurité perte de téléphone inclus. Preuve : `TotpChallengeScreen.tsx:20-126`.

**SuccessScreen** — Confirmation post-inscription/connexion. Icône animée, texte contextuel, bouton « Accéder à mon espace » → `activatePending()` (seul geste qui active réellement la session). **FAIT.** Preuve : `SuccessScreen.tsx:16-62`, `AuthContext.tsx:122-131`.

**OtpScreen (fichier mort, non navigable)** — Stub vide (`<View/>`), non référencé nulle part, documenté « obsolète » par son propre en-tête (« l'OTP SMS est désormais intégré à l'étape 3 de RegisterScreen »). **À ne pas reproduire** dans la maquette ; à supprimer du code.

#### Onglets patient (PatientTabs)

**HomeScreen (Accueil)**, 699 lignes — Écran central : en-tête (logo, bascule thème, cloche notifications avec pastille, avatar), barre de recherche fixe + filtre + chips catégories, salutation + arrondissement, carte héros « rappel médicament » (prochaine prise réelle, bouton « Pris »), 4 actions rapides (Consulter/Médicaments/Mes rappels/Mon dossier), carte « Sécurisez votre compte » si 2FA inactive, liste de soignants (carte avec stats réelles note/taux de confirmation/durée/tarif). Recherche tolérante aux accents. Appels : `GET /v1/directory`, `GET /v1/notifications/me/unread-count`, `GET /v1/reminders/me`, `POST /v1/reminders/:id/taken`. **FAIT**, avec un défaut réel : le bouton « partager » de chaque carte soignant est une `<View>` sans `onPress` — mort au tap. Preuve : `HomeScreen.tsx:121-128,526-528`.

**ConsultationsScreen** — Chronologie unifiée sessions de soin + ordonnances, groupée par mois, filtrable. Appels : `GET /v1/care-sessions/mine`, `GET /v1/prescriptions/me`. **FAIT.** Preuve : `ConsultationsScreen.tsx:55-162`.

**SpaceScreen (Mon espace)** — Hub compte : profil (avatar, prénom, @username, compteurs consultations/ordonnances/dévoilements), 4 tuiles (Dossier médical/Carnet familial/Mes rappels/Mes paiements), déconnexion. Appel : `GET /v1/me/space`. **FAIT.** Preuve : `SpaceScreen.tsx:48-170`.

#### Cœur du parcours consultation

**DoctorScreen** — Profil public d'un soignant : identité, badge vérifié, statut en ligne, stats, **tarifs** (seul endroit où ils apparaissent), pré-consultation gratuite annoncée, bannière « poignée de main avant paiement ». Actions : partager (réellement câblé ici, `Share.share`), « Initier » (si en ligne) ou « M'avertir » (cloche, si hors ligne). Appels : `GET /v1/directory/:id`, `POST /v1/handshakes`, `POST /v1/directory/:id/availability-alert`. **FAIT.** Preuve : `DoctorScreen.tsx:26-221`.

**HandshakeScreen** — Attente de confirmation du soignant (polling 2,5 s, pas de push) : barre d'étapes, compte à rebours serveur, bannière « aucun franc débité », puis carte « prêt à vous recevoir » + fenêtre de paiement, ou écran terminal (expirée/refusée/abandonnée). Appels : `GET /v1/handshakes/:id` (poll), `POST /v1/handshakes/:id/abandon`. **FAIT.** Preuve : `HandshakeScreen.tsx:26-215`.

**PayScreen** — Paiement Mobile Money : reçu détaillé, choix explicite d'opérateur (MTN MoMo / Airtel Money, jamais déduit du préfixe), état d'attente/échec avec retry. Appel : `POST /v1/handshakes/:id/pay` puis polling jusqu'à `PAID`+`sessionId`. **FAIT côté client** — le comportement réel du webhook agrégateur en production n'est pas vérifiable depuis le mobile (voir non-vérifié). Preuve : `PayScreen.tsx:28-156`.

**SessionScreen**, 1150 lignes — L'écran le plus riche de l'app, 4 sous-états serveur :
- *PREPARING* : formulaire pré-consultation (symptômes, depuis quand) → démarre le décompteur.
- *ACTIVE/ENDED* : fil de messages (texte, photo/album jusqu'à 10 clés, note vocale avec onde temps réel et lecture 1×/1,5×/2×), réponses/citations, édition/suppression ≤15 min (pour soi ou pour tous), **réactions emoji** (voir ci-dessous), **indicateur « en train d'écrire »** (voir ci-dessous), **accusés de lecture 3 états** (✓ envoyé / ✓✓ gris délivré / ✓✓ bleu lu), annulation si le soignant n'a jamais répondu après 5 min.
- *ENDED* : compte-rendu + notation 1-5 étoiles.
- *REFUNDED* : écran dédié.

Appels : `GET /v1/care-sessions/:id` (poll 3s), `POST .../pre-consultation`, `POST/GET/PATCH .../messages[...]`, `POST .../messages/:id/reactions`, `POST .../typing`, `POST .../cancel`, `POST .../rating`. **FAIT, très complet et vérifié fraîchement** :
- *Réactions emoji* : `reactToMsg` (`SessionScreen.tsx:245-253`) → `POST .../messages/:id/reactions`, rendu par `ReactionsRow` sous chaque bulle, sélection via `ChatActionSheet` (6 réactions rapides + sélecteur complet `EmojiPicker`).
- *Indicateur de frappe* : `pingTyping` throttlé 2,5 s (`:498-505`) → `POST .../typing`, affiché « en train d'écrire… » dans l'en-tête via `session.otherPartyTyping` (latence perçue ≤3 s, polling, pas de push instantané).
- Ces deux fonctionnalités, évoquées comme « possiblement inachevées suite à une session interrompue » dans la mémoire de départ, sont **confirmées entièrement câblées et fonctionnelles** dans le code actuel — la mémoire était pessimiste par rapport à la réalité.

Preuve globale : `SessionScreen.tsx` (fichier entier), citations précises ci-dessus.

#### Dossier médical

**CarnetScreen** — Dossier à vie (soi ou personne à charge) : bannière allergies actives, 3 tuiles synthèse (groupe sanguin/allergies/chroniques), chronologie (provenance visible, entrées remplacées marquées « corrigée »), déclaration patient (modale), export (partage texte + empreinte SHA-256 — **pas un PDF signé**, le code le documente lui-même comme un lot ultérieur EF-07-08). Appels : `GET /v1/health-record/me/summary`, `GET /v1/health-record/me` (limite fixe 50), `POST .../entries`, `GET .../export`. **FAIT pour l'affichage/déclaration/export, MANQUANT pour la pagination** — au-delà de 50 entrées, l'historique plus ancien devient invisible depuis cet écran, sans bouton « charger plus ». Preuve : `CarnetScreen.tsx:100,192`.

**FamilyScreen (Carnet familial)** — Liste des personnes à charge (avatar initiales, âge calculé), création via modale, ouverture du Carnet de chacune. Appels : `GET/POST /v1/health-record/me/sub-profiles`. **FAIT.** Preuve : `FamilyScreen.tsx:41-164`.

**OrdonnanceScreen** — Ordonnance + QR de délivrance : zone QR à **fond blanc forcé**, référence courte, lignes médicament (posologie/durée/quantité restante), carte authenticité/validité, QR inerte si non-active. Appel : `GET /v1/prescriptions/:id`. **FAIT.** Preuve : `OrdonnanceScreen.tsx:36-135`.

#### Médicaments

**MedsScreen** — Le parcours signature M12, en 4 phases : composition (recherche catalogue) → résultats (pharmacies anonymisées floutées, prix de dévoilement lu en direct) → paiement → révélé (pharmacie + réservation 24h + appel). Appels : `GET /v1/medicaments`, `POST /v1/search`, `POST /v1/search/alerts`, `GET /v1/disclosures/price`, `POST /v1/disclosures`, `GET /v1/disclosures/:id` (poll). **FAIT, très complet.** Preuve : `MedsScreen.tsx:35-313`.

**RemindersScreen (Mes rappels)** — CRUD rappels médicament (nom, dosage, horaires parmi 7 créneaux) + reprogrammation notifications locales Notifee à chaque changement. **FAIT.** Défaut mineur : icône suppression = `log-out` au lieu de `trash`. Preuve : `RemindersScreen.tsx:28-152`, `services/notifications.ts:48-82`.

#### Notifications, paiements, compte

**NotificationsScreen** — Historique (icône par catégorie, pastille non-lu, mode sélection), préférences par catégorie (critique non désactivable). **FAIT pour l'affichage, MANQUANT pour la pagination** — un seul appel (limite 30), le curseur `nextCursor` existe dans le contrat mais n'est jamais consommé. Preuve : `NotificationsScreen.tsx:68`, `contracts.ts:515`.

**PaymentsScreen (Mes paiements)** — Historique des reçus (libellé déduit de l'`orderRef` opaque, montant signé). Appel : `GET /v1/payments/receipts`. **FAIT.** Preuve : `PaymentsScreen.tsx:38-106`.

**EditProfileScreen** — Édition profil (photo, prénom, nom, naissance, sexe, arrondissement), propagation instantanée via `MeContext`. **FAIT.** Preuve : `EditProfileScreen.tsx:41-175`.

**SettingsScreen** — Sécurité (2FA activer/désactiver), Appareils connectés (lister/révoquer sessions), Compte (changer numéro, clôturer). **FAIT.** Preuve : `SettingsScreen.tsx:35-213`.

**PhoneChangeScreen** — Changement de numéro sécurisé (OTP ancien + nouveau numéro). **FAIT.** Preuve : `PhoneChangeScreen.tsx:19-95`.

**CloseAccountScreen** — Clôture de compte (mot de passe + OTP + double confirmation, réactivation possible 30 jours annoncée). **FAIT.** Preuve : `CloseAccountScreen.tsx:20-109`.

**TotpIntro / TotpSetup / TotpConfirm / TotpBackupCodes / TotpDone** (regroupés dans `TotpScreens.tsx`) — Parcours guidé d'activation 2FA en 5 écrans : pédagogie → QR (fond blanc forcé) + secret copiable → confirmation code → codes de secours (case « sauvegardé » obligatoire) → confirmation animée. **FAIT.** Preuve : `TotpScreens.tsx:34-261`.

#### Composant transverse — Bouton Urgence (pas un écran de pile, un FAB+modale sur les onglets)

Fiche vitale (groupe sanguin, allergies, chroniques — réutilise le résumé Carnet M07, **pas un module M15 dédié**, confirmé absent côté backend) + bouton appel service de garde (`tel:112`, numéro générique, pas encore un numéro ULAMU dédié). **PARTIEL / MAL FAIT sur un point précis et sérieux** : le texte affiché annonce que « votre position approximative sera partagée avec le service de garde » — **aucun code réel ne fait ça** : pas de permission de géolocalisation déclarée, pas de librairie GPS installée, aucun appel réseau ne transmet de position. Dans un écran dédié aux urgences vitales, c'est une promesse fonctionnelle non tenue avec un impact potentiellement grave. Preuve : `components/UrgenceButton.tsx:84` (texte) vs absence totale confirmée par grep dans `AndroidManifest.xml` et `package.json`.

---

### 2.2 — Web (`apps/web`) — app professionnels/structures/admin, 5 écrans + coque

*Confirmé par lecture de code ET par navigation réelle dans le navigateur (serveur de dev lancé, formulaires remplis jusqu'à l'avant-dernière étape sans déclencher de soumission réelle — voir méthode). L'app est délibérément très en amont : `DashboardPage.tsx` affiche littéralement le texte « Les écrans arrivent bientôt » / « Tableau de bord — Phase 1 en construction » (`DashboardPage.tsx:14,18`).*

**LoginPage** (`/login`) — Connexion username + mot de passe, puis étape TOTP conditionnelle si le compte l'a activé (libellé « 6 chiffres » alors que le champ accepte 10 caractères, incohérence mineure avec ForgotPasswordPage qui mentionne bien les codes de secours). Appels : `POST /v1/auth/login`, puis `GET /v1/accounts/me`. **FAIT.** Preuve : `LoginPage.tsx` entier, `useLogin.ts:7,16`. *Vérifié en direct dans le navigateur* : champs username/password, lien mot de passe oublié, lien créer un compte — tous fonctionnels.

**RegisterPage** (`/inscription`) — Inscription PROFESSIONAL (5 étapes : Type de compte → Identité → **Profil professionnel** [catégorie parmi 6 : généraliste/spécialiste/dentiste/sage-femme/infirmier/agent de santé communautaire] → Sécurité → Vérification OTP) ou FACILITY_MEMBER (4 étapes, sans l'étape profil). *Vérifié en direct dans le navigateur, les deux parcours, jusqu'à l'étape Sécurité incluse* : les champs correspondent exactement à ce que le code indique. **Aucun appel réseau n'est déclenché avant l'étape finale** (confirmé par inspection réseau en direct) — tout le wizard est client-side jusqu'à la vérification OTP. **FAIT pour le parcours nominal**, mais validation client incomplète : pas de vérification de format téléphone, pas de vérification de disponibilité du username en direct (endpoint pourtant prêt côté backend), le hint « lettres et chiffres » sur le mot de passe n'est vérifié ni côté client ni côté serveur. Preuve : `RegisterPage.tsx` entier.

⚠️ **Trouvaille confirmée par le test en direct** : le parcours d'inscription « Structure / Pharmacie » ne collecte que l'identité personnelle du titulaire (téléphone/username/prénom/nom + mot de passe) — **aucun champ nulle part dans ce wizard pour créer la structure elle-même** (nom de la pharmacie, arrondissement, quartier, position GPS, horaires, requis par le cahier des charges M02 CU-02-01). L'endpoint backend `POST /v1/facilities` existe pourtant bel et bien (confirmé `m02.controller.ts:24`) — **ce n'est donc pas un manque backend, c'est une page web à créer** : après inscription, un titulaire n'a aujourd'hui strictement aucun moyen de créer sa pharmacie (il atterrit sur le tableau de bord placeholder).

**ForgotPasswordPage** (`/mot-de-passe-oublie`) — Réinitialisation **par TOTP uniquement** (jamais par SMS sur le web, choix assumé en commentaire et confirmé backend). Champs : username, code TOTP (app ou code de secours, explicitement mentionné ici contrairement à LoginPage), nouveau mot de passe. **FAIT.** Preuve : `ForgotPasswordPage.tsx` entier ; vérifié en direct dans le navigateur.

**TotpSetupPage** (`/configuration-totp`) — Écran **bloquant obligatoire** après connexion pour tout compte non-patient sans TOTP actif (pas d'échappatoire, pas d'alternative SMS). QR généré **localement dans le navigateur** (le secret n'est jamais transmis à un tiers), 10 codes de secours affichés une seule fois. **FAIT** pour le chemin nominal ; **MAL FAIT** sur l'état d'erreur — aucun bouton de nouvelle tentative, juste un texte demandant de recharger la page. Preuve : `TotpSetupPage.tsx:42,89-92`.

**DashboardPage** (`/dashboard`) — **MANQUANT, confirmé sans ambiguïté.** Contenu réel = un `PageHeader` + un `EmptyState` annonçant que le vrai contenu (KPIs, poignées de main, chat de consultation) arrive en Phase 1. Aucun appel API. Preuve : `DashboardPage.tsx:6-23`.

**Coque applicative** — `AuthLayout` (carte centrée, animation de fumée en 3 couches, respecte `prefers-reduced-motion`), `AppShell` (sidebar fixe 260px + `TopHeader` avec horloge temps réel), `Sidebar` (**un seul item de nav existe : « Tableau de bord »** — le fichier `navigation.config.ts` documente lui-même « à étoffer au fil des Phases 1/2/3 »). Toutes **FAIT** pour ce qu'elles couvrent aujourd'hui (juste la connexion + une page vide).

**Kit design-system interne** (`components/ulamu/*`, 10 composants : Button, Card [compound Header/Body/Footer], EmptyState, Field, Logo, PageHeader, Select, Skeleton, StatusPill, Stepper) — port fidèle du design system CMS-SARIS (accent cobalt `#2756A6` au lieu du teal), variables CSS uniquement, zéro dégradé, mode sombre déjà entièrement câblé côté styles bien que non exposé dans l'UI actuelle. **Constat utile pour la session design** : ce kit est plus riche que ce que les 5 écrans actuels exploitent (`StatusPill`/`Skeleton` ne sont utilisés nulle part encore) — prêt à l'emploi pour les futurs écrans.

**Dérive de vendoring confirmée** (`apps/web/src/lib/api.ts` vs `packages/contracts`+`packages/shared`) : le monorepo documente lui-même (`pnpm-workspace.yaml`) que le socle partagé est *volontairement* vendoré dans `apps/web/src/lib/` plutôt qu'importé. Comparaison ligne à ligne : **`packages/contracts/src/auth.ts` est aujourd'hui obsolète** (modélise encore une connexion par `phone` et une réponse de login sans le flux TOTP en deux temps, alors que le backend réel et la copie vendorée du web utilisent tous les deux `username` + `{totpRequired, sessionToken?, ...}`). `packages/shared/src/api-client.ts` n'expose pas non plus `me()/logout()/setupTotp()/confirmTotp()/resetPasswordByTotp()` que le web utilise pourtant activement. Un bug supplémentaire trouvé au passage dans `packages/shared/src/api-client.ts:53-55` : un `switch` dont les deux branches retournent la même valeur (`"UNKNOWN"`), jamais corrigé côté web qui distingue correctement les deux cas. **Le paquet « source unique de vérité » est en réalité en retard sur le code qui tourne réellement.**

---

### 2.3 — Fiches croisées par module métier (Backend × Web × Mobile)

Chaque fiche ci-dessous couvre un module du cahier des charges et croise son statut sur les 3 couches.

**M01 — Comptes & Authentification.** *Backend* : FAIT, très complet — validation téléphone congolais, verrouillage 5 échecs/15 min, anti-timing sur login, OTP à usage unique 3 tentatives, TOTP RFC 6238 maison complet (setup/confirm/disable/codes de secours), inscription étendue récemment aux comptes PROFESSIONAL et FACILITY_MEMBER (`m01.service.ts:249-306`, nouveauté qui sert directement la nouvelle app web). 22 endpoints. *Mobile* : FAIT — les 8 écrans d'auth patient couvrent l'intégralité du module côté patient. *Web* : FAIT pour login/register/forgot/TOTP-setup, mais validations client incomplètes (voir 2.2). **Pour la maquette** : le module le plus solide des 3 couches, à reproduire tel quel des deux côtés.

**M02 — Rôles & Espaces Structures.** *Backend* : FAIT — un seul titulaire actif par structure garanti par écriture conditionnelle anti-TOCTOU, transfert de titularité à double OTP, matrice de permissions testée, endpoint `POST /v1/facilities` opérationnel. *Mobile* : hors périmètre (patients uniquement), non applicable. *Web* : **MANQUANT à 100 %** — aucune page ne crée ni ne gère un espace structure, malgré l'inscription qui capture déjà l'identité du futur titulaire. **Pour la maquette** : c'est un module entièrement à concevoir côté web (formulaire de création de pharmacie avec position GPS, gestion des membres/invitations, transfert de titularité) — le backend est prêt à le recevoir.

**M03 — Vérification & Contrats.** *Backend* : FAIT pour le cœur (machine d'états stricte, signature électronique scellée par empreinte, avenants sur changement de taux) ; PARTIEL assumé par le code lui-même sur EF-03-09 (alerte avant expiration de documents — noté hors périmètre du premier chantier, pas d'état `SUSPENDED`). *Mobile* : non applicable. *Web* : **MANQUANT à 100 %** — aucune page de dépôt de dossier, aucune file d'examen admin, aucune signature de contrat en ligne. **Pour la maquette** : à concevoir entièrement côté web (dépôt de pièces, suivi de statut pour le titulaire ; file de traitement + décision pour l'admin vérification).

**M04 — Audit & Signalements.** *Backend* : FAIT pour le journal chaîné et l'export CSV ; **PARTIEL** — la vérification d'intégrité automatique quotidienne exigée par la spec (EF-04-02) n'est en réalité **jamais appelée par le cron** (`m16.scheduler.service.ts` n'appelle que M13/M14), seulement disponible en déclenchement manuel admin ; export PDF explicitement hors MVP. *Mobile/Web* : non applicable côté client (module interne/admin). **Pour la maquette** : la future page admin « Journal & signalements » doit exposer le déclenchement manuel de vérification d'intégrité tant que l'automatisation quotidienne n'est pas branchée.

**M05 — Annuaire des Professionnels.** *Backend* : FAIT, qualité élevée — algorithme de pertinence documenté et non payant, présence par battement de cœur avec expiration lue (pas de poller dédié), plafond d'offres anti-TOCTOU. *Mobile* : FAIT côté patient (recherche, profil, cloche de disponibilité). *Web* : **MANQUANT à 100 %** côté professionnel — aucune page pour gérer son propre profil public, ses offres, ou basculer sa présence en ligne/absent/ne pas déranger, alors que ce sont des actions que la spec attribue explicitement au web. **Pour la maquette** : écran « Mon profil public » + « Mes offres » + bascule de présence à concevoir côté web.

**M06 — Poignée de main & Session.** *Backend* : FAIT, le module le plus abouti du backend — remboursement automatique D-008 fidèle à l'invariant documenté dans la spec, décompteur serveur déterministe, 23 endpoints couvrant messagerie enrichie complète (édition/suppression/réactions/frappe/citations/albums). *Mobile* : FAIT, très complet côté patient (voir SessionScreen en 2.1). *Web* : **MANQUANT à 100 %** côté professionnel — c'est très exactement ce que le placeholder du tableau de bord annonce comme « Phase 1 » : recevoir/confirmer une poignée de main et tenir le chat de session depuis le web n'existe pas encore. **Conséquence directe** : aujourd'hui, un vrai professionnel humain n'a physiquement aucune interface pour répondre à un patient — seul le mode vitrine (confirmation + réponse automatiques, sans personne réelle derrière) permet de tester ce parcours. **Pour la maquette** : c'est probablement le chantier web le plus prioritaire (symétrique de l'écran le plus riche du mobile).

**M07 — Carnet.** *Backend* : FAIT pour l'immuabilité et la fiche synthèse calculée, carnet familial avec transfert à la majorité en 2 étapes ; **PARTIEL assumé** — export PDF signé (EF-07-08) explicitement non implémenté, le code renvoie `signedPdf: null` avec un commentaire annonçant que ça viendra « avec l'interface ». *Mobile* : FAIT pour affichage/déclaration/export texte, **MANQUANT** sur la pagination (au-delà de 50 entrées, invisible). *Web* : l'accès au Carnet en session (lecture soignant pendant une consultation) existe côté backend (`m06.record-access.service.ts`) mais est bloqué en pratique par l'absence totale de M06 côté web. **Pour la maquette** : prévoir un mécanisme de pagination/chargement progressif côté mobile, et un export PDF si le cahier des charges l'exige toujours (aujourd'hui : texte + empreinte seulement).

**M09 — Ordonnance & Délivrance.** *Backend* : FAIT pour le cœur (QR scellé, garde-fou allergies par comparaison normalisée, délivrance partielle multi-pharmacies) ; **PARTIEL assumé** — la restriction de domaine de prescription de la sage-femme (EF-09-01) n'est pas implémentée (toute catégorie clinique sauf agent de santé communautaire peut tout prescrire au MVP, décision documentée comme provisoire) ; **MANQUANT** — aucun PDF imprimable. *Mobile* : FAIT côté patient (affichage QR/lignes/statut). *Web* : **MANQUANT à 100 %** — rédiger une ordonnance (prescripteur) ou la délivrer (pharmacie) depuis le web n'existe pas, et dépend de toute façon de M06 professionnel absent. **Pour la maquette** : écran de rédaction d'ordonnance en session + écran de scan/délivrance pharmacie à concevoir côté web.

**M11 — Stocks & Catalogues.** *Backend* : FAIT — FEFO strict, règle de fraîcheur PM-33 testable indépendamment, mouvements signés validés, import CSV exposé. *Mobile* : non applicable (patients). *Web* : **MANQUANT à 100 %** — c'est un module entièrement pensé pour être opéré depuis le web par la pharmacie, aujourd'hui totalement absent côté client. **Pour la maquette** : écrans stock (entrées/sorties/corrections/seuils/alertes péremption-rupture/confirmation de fraîcheur hebdomadaire/import CSV) à concevoir en intégralité.

**M12 — Recherche & Dévoilement.** *Backend* : FAIT, module signature complet — garantie Q-004 intégralement présente (re-dévoilement gratuit ou remboursement, strikes sur 30 jours, arbitrage admin). *Mobile* : FAIT, très complet côté patient (voir MedsScreen en 2.1). *Web* : pas d'action directe attendue côté web au-delà de la gestion de stock (M11) et de la contestation de strike par la pharmacie (endpoint prêt, `POST /v1/strikes/:id/contest`, aucune UI). **Pour la maquette** : prévoir un écran pharmacie « contester un signalement de rupture » côté web.

**M13 — Paiements & Gains.** *Backend* : FAIT pour la répartition/idempotence/double validation des remboursements manuels ; **MAL FAIT** — aucun `@Throttle` dédié sur les routes financières malgré un commentaire de code qui affirme le contraire (`app.module.ts:35`) ; **MANQUANT confirmé** — l'agrégateur MoMo réel n'existe pas (implémentation en mémoire uniquement, auto-confirmation en dev). *Mobile* : PARTIEL côté patient — reçus consultables, mais pas de vue « gains » (normal, les patients n'en ont pas). *Web* : **MANQUANT à 100 %** — aucun écran de solde, de retrait vers MoMo, ou de reçus pour un professionnel/titulaire, alors que les endpoints (`GET /v1/me`, `POST /v1/withdrawals/start|confirm`) existent déjà côté backend. **Pour la maquette** : écran « Mes gains » (disponible/en attente + historique + retrait) à concevoir côté web — bloqué en pratique tant que l'agrégateur réel n'est pas branché, mais l'UI peut être conçue dès maintenant.

**M14 — Notifications & Rappels.** *Backend* : FAIT pour le catalogue de modèles, catégorie critique non désactivable, retry automatique des envois critiques (cron horaire) ; **MANQUANT confirmé** — push réel (FCM) jamais implémenté, un `DevPushGateway` journalise seulement, `package.json` ne contient aucune dépendance Firebase. *Mobile* : FAIT pour l'historique in-app + préférences + rappels locaux (Notifee) ; **MANQUANT** — l'app n'appelle jamais `registerDevice`/`unregisterDevice` bien que ces méthodes existent dans le client API : un patient app fermée ne reçoit aujourd'hui aucune alerte pour une confirmation de poignée de main, un nouveau message, une ordonnance prête. *Web* : aucun centre de notifications construit (pas de page dédiée, alors qu'un professionnel a tout autant besoin d'être notifié qu'un patient). **Pour la maquette** : le push réel est un chantier double (intégration Firebase serveur + câblage client mobile), à traiter comme bloquant produit avant un vrai lancement — voir recommandations.

**M16 — Pilotage & Administration.** *Backend* : FAIT — les 7 KPIs du pilote conformes à la spec, bannissement à double validation avec anti-auto-approbation journalisée, modification de paramètres PM-xx réservée SUPER_ADMIN avec historique, scheduler central résilient (chaque tâche isolée par `try/catch`). *Mobile* : non applicable. *Web* : **MANQUANT à 100 %** — `DashboardPage` est le placeholder exact de ce que ce module devrait afficher (tableau de bord pro/structure + back-office admin), rien n'est branché. **Pour la maquette** : c'est le module le plus riche en écrans à concevoir côté web — tableau de bord professionnel, tableau de bord structure, back-office admin (comptes, files M03/M04, paramètres, KPIs).

**M08 / M10 / M15 — confirmés absents à 100 %, sur les 3 couches, par 3 preuves indépendantes** (aucun dossier `m08-*`/`m10-*`/`m15-*`, aucune logique réelle au-delà de commentaires de compatibilité future, aucun modèle Prisma dédié — seules les valeurs d'enum `LAB_RESULTS`/`VITALS` de M07 réservent une place). Le bouton Urgence mobile (2.1) est une vue cliente construite à partir de M07, pas un vrai module M15. **Pour la maquette** : ne pas chercher à représenter ces 3 modules comme « fonctionnalités existantes » — ce sont des extensions futures (V1) à concevoir de zéro le jour où elles seront spécifiées côté code.

**media & ota.** *Backend* : FAIT — avatars publics à clé non devinable, médias de session réservés aux 2 participants, OTA avec anti-traversal (manifeste à `version:0`, jamais publié). *Mobile* : consomme avatars/médias ; OTA câblé mais jamais testé en conditions réelles de publication. *Web* : ne consomme pour l'instant aucun de ces endpoints (pas de photo de profil pro visible sur le web actuel).

---

## 3. Tableau de synthèse fonctionnalités × plateforme

| Module / fonctionnalité | Backend | Mobile (patients) | Web (pros/structures/admin) |
|---|---|---|---|
| M01 Comptes & Auth | FAIT | FAIT | FAIT (auth seulement) |
| M02 Rôles & Structures | FAIT | N/A | **MANQUANT** |
| M03 Vérification & Contrats | FAIT/PARTIEL | N/A | **MANQUANT** |
| M04 Audit & Signalements | FAIT/PARTIEL | N/A | **MANQUANT** (pas de page admin) |
| M05 Annuaire (côté patient) | FAIT | FAIT | N/A |
| M05 Profil/offres/présence (côté pro) | FAIT | N/A | **MANQUANT** |
| M06 Poignée & Session (côté patient) | FAIT | FAIT | N/A |
| M06 Poignée & Session (côté pro) | FAIT | N/A | **MANQUANT** |
| M07 Carnet | FAIT/PARTIEL | FAIT (pagination manquante) | N/A (bloqué par M06 pro absent) |
| M08 Missions/Triage | **MANQUANT** | N/A | N/A |
| M09 Ordonnance (lecture patient) | FAIT | FAIT | N/A |
| M09 Rédaction/délivrance (pro/pharmacie) | FAIT/PARTIEL | N/A | **MANQUANT** |
| M10 Examens/Résultats | **MANQUANT** | N/A | N/A |
| M11 Stocks & Catalogues | FAIT | N/A | **MANQUANT** |
| M12 Recherche/Dévoilement (patient) | FAIT | FAIT | N/A |
| M12 Contestation strike (pharmacie) | FAIT (endpoint) | N/A | **MANQUANT** (pas d'UI) |
| M13 Paiements (reçus patient) | FAIT | FAIT | N/A |
| M13 Gains/retraits (pro/structure) | FAIT (endpoints) / agrégateur réel MANQUANT | N/A | **MANQUANT** |
| M14 Notifications in-app + rappels | FAIT | FAIT | **MANQUANT** |
| M14 Push réel (FCM) | **MANQUANT** | **MANQUANT** (jamais appelé) | N/A |
| M15 Urgence | **MANQUANT** | PARTIEL (vue locale, texte position mensonger) | N/A |
| M16 Pilotage & Admin | FAIT | N/A | **MANQUANT** |
| Tests automatisés | 465 unit ✓ / intégration non exécutée | 3 tests (logique pure seulement) | **0** |
| Lint fonctionnel | **cassé** (eslint non installé) | 24 erreurs réelles | ✓ propre |

---

## 4. Détail Backend

### 4.1 — Ce qui est fait
13 modules sur 16 spécifiés (M01-M07, M09, M11-M14, M16), 160 endpoints HTTP recensés (liste complète dans le rapport source de l'agent backend — voir résumé par module en 2.3), 465/465 tests unitaires verts, architecture cohérente : outbox transactionnel, écritures conditionnelles anti-TOCTOU systématiques (concurrence sur les offres, les sessions, les transferts de titularité, les remboursements), séparation stricte politiques-pures/services, chaînage cryptographique du journal d'audit réutilisé identiquement par M04/M07/M09.

### 4.2 — Ce qu'il reste à faire (assumé et documenté dans le code lui-même)
- EF-03-09 (alerte expiration documents M03), export PDF partout (M04/M07/M09), restriction de prescription sage-femme (M09), vérification d'intégrité quotidienne automatique (M04, actuellement manuelle seulement).
- M08, M10, M15 : non spécifiés en code, à construire de zéro le jour venu.

### 4.3 — Stubs de développement, clairement isolés derrière une interface
- **SMS** (`common/sms/sms.service.ts`) : journalise seulement, aucune passerelle réelle.
- **Mobile Money** (`common/momo/aggregator.gateway.ts`) : entièrement en mémoire, auto-confirmation dev.
- **Push** (`m14.push.gateway.ts`) : journalise seulement, aucune dépendance FCM.

Ces trois stubs sont des blocages transverses : ils empêchent respectivement l'inscription/connexion réelle par SMS, tout paiement réel, et toute notification app-fermée — sur mobile ET web.

### 4.4 — Constats de sécurité, par sévérité (vérifiés de première main par l'orchestrateur en plus de l'agent backend)

**CRITIQUE — Bootstrap SUPER_ADMIN à identifiants par défaut devinables.** `apps/api/prisma/seed.ts:362-395` : dès qu'aucun compte ADMIN n'existe (`adminCount === 0`), un compte SUPER_ADMIN est créé avec, sauf variables d'environnement explicitement positionnées : téléphone `+242060000001`, username `super.admin`, mot de passe `admin12345`, **secret TOTP `JBSWY3DPEHPK3PXP`** (un exemple extrêmement répandu dans les tutoriels TOTP publics) — et ce secret est marqué `enabled:true` dès la création, donc **aucun passage par le flux QR normal n'est nécessaire pour l'utiliser**. Ce bloc n'est PAS conditionné par `SEED_DEMO` (qui ne protège que les comptes de démonstration plus bas dans le fichier). Le mot de passe et le secret TOTP en clair sont en plus écrits dans les logs de démarrage (`seed.ts:394`). **Scénario concret** : si les 3 variables `SEED_ADMIN_PASSWORD`/`SEED_ADMIN_PHONE`/`SEED_ADMIN_TOTP_SECRET` ne sont pas toutes explicitement positionnées avant le tout premier seed d'un environnement — un geste facile à oublier —, n'importe qui connaissant ces valeurs par défaut (documentées ici même et dans le code source public) obtient un accès SUPER_ADMIN total : création d'autres admins, suspension/bannissement de comptes, modification des taux PM-xx, file de vérification. *Vérifié personnellement par lecture directe du fichier — non délégué à l'agent.* **Non vérifié** : si la base de production (Neon) actuelle a été seedée avec ces 3 variables correctement positionnées — la mémoire de session indique qu'un mot de passe personnalisé a été utilisé, mais ne confirme pas si `SEED_ADMIN_TOTP_SECRET` l'a été aussi. À vérifier/faire tourner immédiatement, indépendamment de ce rapport.

**ÉLEVÉ — Clé de chiffrement au repos repliée sur une valeur fixe codée en dur.** `common/crypto/secretbox.ts:7-15` : si `SECRETBOX_KEY` est absent ou mal formé, la clé de repli est `sha256("ulamu-dev-secretbox")` — une chaîne visible dans ce dépôt. Elle chiffre les secrets TOTP ET tous les médias uploadés. Aucune erreur ni avertissement visible si la variable manque en production — l'app démarre normalement mais le chiffrement ne protège plus rien.

**MOYEN — `OTP_ECHO` sans garde-fou d'exécution.** `m01.service.ts:73-77` : si la variable est `true`, le code OTP est renvoyé directement dans la réponse API, sans aucune vérification de `NODE_ENV` — seul un commentaire dit « ne jamais activer en prod ».

**MOYEN — Aucun rate-limiting dédié sur les routes financières**, malgré un commentaire (`app.module.ts:35`) qui affirme le contraire. `POST /v1/withdrawals/confirm` et le webhook de paiement ne sont protégés que par la limite globale.

**FAIBLE-MOYEN — Validation des fichiers uploadés par liste noire, pas par vérification positive du type** (`storage.service.ts:41-58`) — rejette les signatures d'exécutables connues mais ne vérifie jamais que le contenu correspond réellement au type MIME déclaré.

**FAIBLE — `npm run lint` du backend est cassé** : `eslint` n'est ni en dépendance ni installé, aucune configuration `.eslintrc*` n'existe — aucune analyse statique n'a pu tourner sur ce code depuis un temps indéterminé.

**FAIBLE — `.env.example` racine documente une architecture obsolète** (Redis, S3, FCM, JWT) qui ne correspond à rien dans le code réel (jetons opaques Bearer, disque local, aucun cache) — source de confusion pour quiconque configure un nouvel environnement.

---

## 5. Écart Mobile ↔ Web — reformulation nécessaire avant lecture

**Important : mobile et web ne servent pas le même public** (mobile = patients exclusivement, web = professionnels/structures/admin exclusivement — confirmé dans les deux `package.json`). Il n'y a donc pas de fonctionnalité qui « devrait » exister identiquement des deux côtés comme dans une app généraliste ; comparer feature-à-feature n'a pas de sens ici. Les deux écarts réels et actionnables sont les suivants :

**1. Le web accuse un retard de build-out considérable par rapport au mobile.** Le mobile couvre 29 écrans à travers la quasi-totalité de son périmètre patient prévu (auth, annuaire, consultation complète, carnet, ordonnance, médicaments, notifications, compte). Le web couvre 5 écrans, tous d'authentification, plus une coque vide. Si l'on mesure la maturité par « fraction du cahier des charges qui a une interface fonctionnelle », le mobile est proche de 90 % de son périmètre propre pendant que le web est proche de 5 % du sien (auth uniquement, sur ~10 modules attendus côté professionnel/structure/admin).

**2. Le mobile dépend structurellement d'un web qui n'existe pas encore — c'est l'écart le plus important du point de vue produit.** Plusieurs parcours patient (les plus centraux du produit) exigent une action réelle d'un professionnel ou d'une structure en face : confirmer une poignée de main, répondre dans le chat de session, rédiger une ordonnance, délivrer en pharmacie, confirmer un stock. **Aucune de ces actions n'a de traduction dans une interface professionnelle aujourd'hui** (M02/M03/M05-pro/M06-pro/M09-pro/M11/M13-pro tous à 0 % côté web). Concrètement, cela signifie que le produit ULAMU, dans son état actuel, ne peut fonctionner de bout en bout qu'en mode vitrine (soignants factices à confirmation automatique, seed de démonstration) — jamais avec un vrai professionnel humain répondant depuis sa propre interface. **La priorité produit qui découle directement de cet audit est donc de rattraper le web, pas de continuer à enrichir le mobile.**

---

## 6. Non vérifié / zones d'ombre

Compilé à partir des 3 agents + de l'orchestrateur ; jamais présenté comme un fait ailleurs dans ce document.

- **Suite d'intégration backend (44 tests, 7 fichiers)** : non exécutable cette session — Docker Desktop injoignable localement (`unable to get image 'postgres:16-alpine' ... dockerDesktopLinuxEngine ... introuvable`). Les fichiers échouent uniquement par `PrismaClientInitializationError`, jamais par une assertion métier, mais leur réussite réelle contre une vraie base n'est pas prouvée aujourd'hui.
- **État réel des migrations Prisma** (`prisma migrate status`) : non vérifiable sans base atteignable.
- **Comportement runtime en production** (Render/Neon) : aucune requête n'a été envoyée à un serveur démarré, ni local ni distant, pour aucune des 3 couches. Tout ce document repose sur la lecture de code + l'exécution locale de build/lint/test + une navigation web en direct sur le serveur de *développement* (pas la prod).
- **Sécurité réelle de la base de production actuelle** vis-à-vis du finding critique du seed admin (section 4.4) : non confirmé si les 3 variables d'environnement ont bien été positionnées lors du seed initial de Neon.
- **Comportement exact de la boucle de redirection potentielle** si un compte PATIENT tente de se connecter sur le web (section identifiée par l'agent web via traçage de code : `CapabilityGate` replie par défaut sur la route qu'il garde lui-même) — prouvé au niveau de la logique du code, jamais reproduit dans un navigateur réel.
- **Comportement réel sur device/émulateur mobile** : aucun build Android/APK n'a été lancé (exclu explicitement de cet audit, cf. mémoire — un build prend 25-30 minutes et l'environnement ne permet pas de piloter un appareil physique). Toutes les fiches mobiles viennent de lecture de code + `typecheck`/`lint`/`test`.
- **Réussite effective de chaque appel API mobile contre le serveur en ligne réel** : non testée (l'app n'a pas été lancée).
- **Accessibilité réelle avec un lecteur d'écran** (TalkBack/VoiceOver) : seule une mesure statique de couverture des `accessibilityLabel` a été faite côté mobile (~1/3 des éléments pressables étiquetés) — pas un test réel.
- **Contenu détaillé des migrations SQL** et de `packages/contracts/GLOSSARY.md` : repérés mais non ouverts en détail.
- **Corrections/décalages par rapport à la mémoire de session antérieure** — listés explicitement pour traçabilité : (a) le chiffre « 25 écrans mobile » était imprécis (26 fichiers / 29 écrans navigables réels) ; (b) plusieurs problèmes de sécurité mobile notés comme non résolus dans une mémoire antérieure (jeton en clair AsyncStorage, absence de FLAG_SECURE, CGU pré-cochée, permissions runtime jamais demandées) se sont révélés **corrigés** à la vérification fraîche de cette session ; (c) le doc projet `etat_realisation.md` (daté 13/06, prétendant être « vivant ») affirme encore « Frontend non démarré » et « 505 tests » — les deux sont aujourd'hui inexacts (frontend très avancé côté mobile ; 465 tests unitaires + 44 d'intégration non exécutés cette session = 509 au total, mais le doc ne distinguait pas cette nuance) ; ce doc mériterait une mise à jour indépendamment de cet audit.

---

## 7. Recommandations priorisées

### Bloquant
1. **Vérifier/faire tourner immédiatement le mot de passe et le secret TOTP du compte SUPER_ADMIN de production**, et corriger le seed pour qu'il refuse de démarrer avec des valeurs par défaut en environnement non-dev (ou qu'il exige explicitement les 3 variables sans repli silencieux) — `apps/api/prisma/seed.ts:362-395`.
2. **Traiter le retard du web comme la priorité produit n°1** — sans interface professionnelle réelle (M06-pro en premier lieu, symétrique de l'écran SessionScreen mobile), le produit ne peut fonctionner qu'en mode vitrine.
3. Corriger ou retirer la phrase de partage de position dans le bouton Urgence mobile (`UrgenceButton.tsx:84`) — promesse fonctionnelle non tenue dans un contexte vital.
4. Positionner `SECRETBOX_KEY` en production si ce n'est pas déjà fait (sinon le chiffrement au repos ne protège rien) et vérifier qu'`OTP_ECHO` est bien désactivé hors environnement de test.
5. Implémenter l'enregistrement device + réception push réel (FCM) — l'API existe déjà côté backend et mobile, il ne manque que l'intégration Firebase et l'appel à `registerDevice`.

### Important
6. Créer le parcours web de création de structure (M02, l'endpoint backend est prêt) — aujourd'hui un titulaire inscrit n'a nulle part où créer sa pharmacie.
7. Corriger le repli par défaut de `CapabilityGate` côté web (ne jamais rediriger vers la route qu'il protège lui-même) et décider si le backend doit interdire `client:'web'` pour un compte PATIENT.
8. Resynchroniser `packages/contracts/src/auth.ts` avec la réalité du backend (username, flux TOTP) — aujourd'hui trompeur pour quiconque s'y fierait.
9. Ajouter la pagination déjà prévue côté contrat sur Notifications et Carnet mobile (curseur existant, jamais consommé).
10. Ajouter un rate-limiting dédié sur les routes financières (`m13-payments`).
11. Ajouter une détection de connectivité + comportement dégradé cohérent côté mobile (aucune gestion hors-ligne aujourd'hui).
12. Installer `eslint` côté backend (actuellement totalement non fonctionnel) et corriger les 24 erreurs réelles du lint mobile.
13. Ajouter des tests web (0 aujourd'hui) et des tests de rendu mobile (0 sur 29 écrans aujourd'hui, seule de la logique pure est testée).

### Mineur
14. Supprimer le fichier mort `OtpScreen.tsx` (mobile) et nettoyer les dépendances web installées mais jamais utilisées (`react-hook-form`, `zod`, `@hookform/resolvers`, `class-variance-authority`, `clsx`, `tailwind-merge`).
15. Réparer le bouton « partager » mort sur les cartes soignant de l'Accueil mobile ; harmoniser les icônes d'action destructrice (mobile) ; remplacer les illustrations CDN externes de l'écran de connexion mobile par des assets embarqués.
16. Ajouter un bouton « réessayer » sur l'état d'erreur de TotpSetupPage (web) ; corriger `lang="en"`→`"fr"` dans `apps/web/index.html` ; activer `"strict": true` dans la config TypeScript web.
17. Mettre à jour `docs/cahier_des_charges/00_cadrage/etat_realisation.md`, qui affirme encore « frontend non démarré » et des chiffres de tests désormais inexacts.

---

*Fin du rapport. Document autonome — compréhensible et exploitable sans accès au code ni à la conversation qui l'a produit.*

# Rapport de session — Authentification (2026-07-29)

> ⚠️ **Dépassé sur la navigation mobile** par
> [`rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md`](rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md).
> Reste valable pour : la mise en route de l'environnement (§2) et l'historique des décisions.
> Le risque **SUPER_ADMIN** (§5.1) est **toujours ouvert et aggravé** — voir rapport du 05/08 §6.1.

**Document de reprise autonome.** Écrit pour qu'on puisse continuer sans cette conversation, y compris
depuis un autre compte. Chaque affirmation est adossée à une preuve (`fichier:ligne`, sortie de
commande, ou réponse réelle de l'API). Ce qui n'a **pas** été vérifié est dit explicitement — ne pas
combler ces trous par des suppositions.

**Contexte de départ :** le dépôt venait d'être cloné sur une machine neuve, sans aucun cache ni
mémoire des sessions précédentes. Le document de référence antérieur est
[`audit_fonctionnel_ulamu_2026-07-26.md`](audit_fonctionnel_ulamu_2026-07-26.md) — toujours valable
pour tout ce qui n'est pas l'authentification, mais **dépassé sur l'auth** par le présent rapport.

> ⚠️ **À traiter en premier à la reprise** : le compte SUPER_ADMIN de production (section 5.1).
> C'est le point le plus grave encore ouvert, et il ne dépend que d'une vérification dans Render.

---

## 1. État à la fin de la session

| Élément | État |
|---|---|
| API de production (`ulamu-api.onrender.com`) | 🟢 à jour, commit `ef2ee49` déployé et vérifié |
| Envoi d'emails | 🟢 fonctionne vers n'importe quelle adresse (Brevo) |
| Faille `OTP_ECHO` | 🟢 fermée (config + garde-fou code) |
| Inscription mobile de bout en bout | 🟡 **jamais menée à son terme** (voir 5.2) |
| Connexion / 2FA / mot de passe oublié en réel | 🔴 **non testés** |
| App web (pro/structure/admin) | 🔴 non retestée cette session |
| Tiroir d'authentification mobile | 🟡 amélioré, mais **le porteur n'est pas satisfait** (voir 5.3) |
| Compte SUPER_ADMIN de production | 🔴 **risque non levé** (voir 5.1) |

**Commits poussés sur `origin/main` :**

- `1ce1c84` — Brevo + `OTP_ECHO` fermé + correction 2FA + carrousel navigable au doigt
- `ef2ee49` — vérification instantanée numéro/email + listes de champs manquants
- *(le commit du présent rapport et des améliorations du tiroir — voir section 4)*

---

## 2. Mise en route de l'environnement (machine neuve)

Rien de tout ceci n'existait au départ. À refaire si l'on repart d'un clone vierge.

- **`node_modules` mobile** : `npm install --legacy-peer-deps` — **obligatoire**. Sans le drapeau,
  npm échoue sur un conflit de pairs : `react-native-ota-hot-update` → `react-native-fs` → pair
  optionnel `react-native-windows` qui réclame React 19 alors que le projet est en React 18.
- **SDK Android** présent dans `C:\Users\ADMIN\AppData\Local\Android\Sdk`, mais `ANDROID_HOME`
  **n'est pas définie** dans l'environnement — appeler `adb.exe` par son chemin complet.
- **`android/local.properties`** créé (ignoré par git) avec `sdk.dir=...`.
- **`gradle.properties`** : ajout de `org.gradle.vfs.watch=false`, contournement d'une erreur Windows
  récurrente (« Could not move temporary workspace … to immutable location »), causée par un antivirus
  qui verrouille brièvement les fichiers pendant un renommage atomique de Gradle.
- **Espace disque** : le premier build a échoué faute de place (2,19 Go libres). Libéré ~5,6 Go en
  vidant le cache npm et `~/.gradle/caches` (le cache Gradle a exigé l'astuce `robocopy /MIR`, les
  chemins dépassant la limite `MAX_PATH` de Windows). Le NDK, téléchargé à moitié lors de l'échec,
  était corrompu et a dû être supprimé pour être réinstallé.

**Leçon utile** : l'APK était **déjà installé** sur le téléphone (`com.ulamumobile`). Tout le
rebuild natif était donc inutile — pour travailler au quotidien, Metro seul suffit :

```
adb reverse tcp:8081 tcp:8081
npm start          # dans APP/apps/mobile
```

**Impossible de faire des captures d'écran du téléphone** : l'app pose `FLAG_SECURE` sur toute
l'application ([`MainActivity.kt:28`](../apps/mobile/android/app/src/main/java/com/ulamumobile/MainActivity.kt)),
volontairement (données médicales). `adb screencap` renvoie un fichier vide. C'est donc au porteur de
décrire ce qu'il voit.

**Accès GitHub** : le dépôt appartient à `will180901` ; la machine est authentifiée en `Aelys07`, qui
a dû être ajouté comme collaborateur **et accepter l'invitation** avant que `git push` fonctionne.

---

## 3. Le problème central trouvé, et sa correction

### 3.1 Diagnostic : plus personne ne pouvait s'inscrire

Constaté en interrogeant l'API de production réelle, pas déduit du code :

```
POST /v1/accounts/otp/request  →  503
"Impossible d'envoyer le code de vérification à cette adresse"
```

Deux adresses sur deux domaines différents, même résultat. Cause : l'expéditeur était
`onboarding@resend.dev`, l'adresse par défaut de **Resend sans domaine vérifié**, qui ne délivre
qu'à l'adresse du titulaire du compte Resend. Toute autre adresse échoue, et
[`m01.service.ts`](../apps/api/src/modules/m01-accounts/m01.service.ts) transforme l'échec en 503.

Portée du blocage — **les quatre parcours** reposent sur le même envoi :

| Parcours | Conséquence |
|---|---|
| Inscription patient (mobile) | impossible |
| Inscription pro/structure (web) | impossible |
| Mot de passe oublié (mobile) | impossible |
| Connexion avec 2FA email active | **compte inaccessible** — le 503 remonte, la connexion entière échoue |

### 3.2 Le piège : la correction évidente ouvrait une faille critique

`render.yaml` positionnait **`OTP_ECHO=true` en production**. Effet : le code OTP était renvoyé
**dans la réponse HTTP**. Tant que Resend refusait tout, c'était masqué — l'erreur survenait avant.
Mais dès l'envoi débloqué, la séquence devenait :

1. `POST /v1/accounts/otp/request` (route publique) avec l'email d'une victime
2. lire `debugCode` dans la réponse
3. `POST /v1/auth/password-reset` (route publique) → mot de passe changé, sessions révoquées

**Connaître une adresse email = prendre le compte.** Les deux problèmes devaient donc être corrigés
*ensemble*, jamais l'un sans l'autre.

### 3.3 Ce qui a été fait

**Passerelle Brevo** ([`email.service.ts`](../apps/api/src/common/email/email.service.ts)) — envoi
possible vers n'importe quel destinataire avec un simple **expéditeur vérifié**, sans domaine. Appel
HTTP via le `fetch` global de Node 20 : **aucune dépendance npm ajoutée**, donc aucun risque de casser
le build Render. Resend est **conservé** ; l'ordre de sélection dans
[`common.module.ts`](../apps/api/src/common/common.module.ts) est Brevo → Resend → passerelle de dev.
Le jour où un domaine sera vérifié, il suffira de retirer `BREVO_API_KEY`. Les tests continuent
d'utiliser `DevEmailGateway` (sans quoi les suites d'intégration enverraient de vrais emails).

**`OTP_ECHO` fermé en deux couches** : `render.yaml` passé à `"false"`, **et** garde-fou dans le code
refusant l'écho dès que `NODE_ENV=production`. La seconde couche est le vrai verrou — une variable
mal remise ne peut plus rouvrir le trou.

**Variables à poser dans Render** (`ulamu-api` → *Environment*) : `BREVO_API_KEY`,
`BREVO_FROM_EMAIL=bouwayic20@gmail.com` (adresse vérifiée chez Brevo, compte au nom « ulamu »).

### 3.4 Vérifications réelles effectuées

| Test | Résultat |
|---|---|
| OTP vers l'adresse expéditrice | `200 {"expiresInSeconds":300}` — **sans `debugCode`** ⇒ déploiement pris, Brevo marche, faille fermée |
| OTP vers une adresse quelconque (celle qui renvoyait 503) | `200` ⇒ blocage levé |
| Réception réelle | ✅ email reçu **en boîte de réception**, pas en spam, logo affiché, code à 6 chiffres |

**Deux réserves observées sur l'email reçu :**

1. L'expéditeur affiché est `bouwayic20@11778646.brevosend.com` — Brevo réécrit l'expéditeur sur son
   propre domaine, parce que `gmail.com` ne peut pas passer DKIM (on ne possède pas ce domaine). C'est
   ce qui évite le dossier spam, au prix de l'image de marque.
2. Gmail affiche un lien **« Se désabonner »** (en-têtes `List-Unsubscribe` ajoutés par Brevo). **Sur
   un canal d'authentification, c'est un risque d'enfermement dehors** : un utilisateur qui clique
   pourrait être blacklisté et ne plus jamais recevoir ses codes de connexion. À investiguer.

---

## 4. Les autres modifications de la session

### 4.1 Poussé (`1ce1c84`, `ef2ee49`)

- **Correction du renvoi de code 2FA** ([`LoginOtpScreen.tsx`](../apps/mobile/src/screens/LoginOtpScreen.tsx)) :
  « Renvoyer » demandait bien un nouveau code au serveur mais l'écran continuait d'afficher **l'ancien**,
  systématiquement refusé (le serveur ne valide que le plus récent des codes non consommés). Le lint
  le signalait déjà : `setTestCode` n'était jamais appelé.

- **Carrousel d'authentification navigable au doigt**
  ([`AuthCarouselDrawer.tsx`](../apps/mobile/src/components/AuthCarouselDrawer.tsx)) : balayage
  horizontal + points cliquables, via `PanResponder` **intégré à React Native** — choix délibéré pour
  éviter d'ajouter `react-native-gesture-handler`, qui aurait imposé un rebuild natif complet.

- **Vérification instantanée du numéro et de l'email** — le vrai défaut de conception corrigé :
  l'unicité n'était contrôlée qu'à la **toute fin** de l'inscription. On remplissait trois écrans, on
  attendait un code par email, on le saisissait, et seulement là « ce numéro est déjà enregistré ».
  Le code était gaspillé et décompté du quota horaire (PM-19).
  - **API** : `GET /v1/accounts/email-available` et `/phone-available`, calqués sur
    `username-available`, publics, débit limité à 30/min.
  - **Mobile** : hook partagé [`useAvailability.ts`](../apps/mobile/src/state/useAvailability.ts) pour
    les trois identifiants uniques, avec garde **anti-réponse-tardive** (une réponse lente pour « ma »
    ne peut plus écraser l'état de « marie » déjà saisi) et statut `error` **distinct de `idle`** — un
    échec réseau laissait sinon l'écran totalement muet et le bouton mort, sans cause visible.
  - Les deux étapes **listent ce qui manque** sous le bouton, et cette liste **EST** la condition
    d'activation : elles ne peuvent plus diverger.

> **Compromis de vie privée assumé et documenté dans le code** : ces deux routes forment un oracle
> d'existence de compte. Sur une plateforme de santé, apprendre qu'une adresse ou un numéro a un compte
> ULAMU est en soi sensible, ce qui est en tension avec le soin pris ailleurs contre l'énumération.
> Retenu parce que l'inscription révélait **déjà** la même chose sans rien exiger en retour
> (`ensurePhoneFree` s'exécute avant que le code ne soit consommé). **À réexaminer si le produit
> s'ouvre au public réel.**

### 4.2 Non poussé au moment d'écrire ces lignes — améliorations du tiroir

Ces changements compilent (`tsc` propre, zéro erreur de lint) et tournent sans erreur, **mais le
porteur les a jugés insatisfaisants** et souhaite y revenir. Voir 5.3.

- Flèche de retour **visible** dans le bandeau du tiroir (le recul n'existait que par le bouton
  matériel, invisible sur les téléphones en navigation gestuelle).
- Indicateur d'étapes visuel (segments pleins/creux) sur inscription et mot de passe oublié.
- **Séparation des intentions** : la flèche visible recule d'une étape ; le bouton retour **matériel**
  ferme le tiroir et rend le carrousel.
- Le tiroir réapplique l'état voulu par la route **à chaque retour au premier plan** (`useFocusEffect`) :
  sans ça, revenir sur Connexion depuis Inscription retrouvait le formulaire resté ouvert, l'état
  initial l'emportant pour toujours.
- **Trois gestes, un seul point de passage** (`requestClose`) : retour matériel, appui hors du tiroir,
  glissement vers le bas. C'est ce qui garantit qu'une confirmation d'abandon les protège tous les
  trois, et non un sur trois.
- Appui hors du tiroir actif sur **toutes** les pages (auparavant réservé aux écrans à carrousel).
- Glissement vers le bas, capté **uniquement sur la poignée** en haut : plus bas, il serait entré en
  conflit avec le défilement du formulaire.
- **Confirmation d'abandon** de l'inscription dès qu'un champ est rempli.
- Gestionnaires `BackHandler` propres à chaque écran **supprimés** au profit d'un seul, porté par le
  tiroir : Android appelle les abonnés dans l'ordre inverse d'inscription, deux abonnés concurrents
  rendaient le comportement dépendant de l'ordre de montage.

---

## 5. Ce qui reste à faire

### 5.1 🔴 URGENT — compte SUPER_ADMIN de production

**Fait observé**, en interrogeant l'API de production :

```
GET /v1/accounts/phone-available?phone=060000001  →  {"available": false}
```

`+242060000001` est la **valeur par défaut** du seed admin
([`seed.ts:366`](../apps/api/prisma/seed.ts)). Vérifié qu'**aucun compte de démonstration ne
l'utilise** (les comptes de démo sont en `+2420690001xx` / `+2420600002xx`). Ce numéro n'appartient
donc qu'au bootstrap SUPER_ADMIN.

**Inférence** : `SEED_ADMIN_PHONE` n'était pas positionnée lors du seed de la production. Les quatre
variables se règlent indépendamment — si celle-là a été oubliée, `SEED_ADMIN_PASSWORD` et
`SEED_ADMIN_TOTP_SECRET` l'ont probablement été aussi. Ce qui signifierait un accès SUPER_ADMIN avec
mot de passe `admin12345` et secret TOTP `JBSWY3DPEHPK3PXP`.

**Aggravant : le dépôt GitHub est PUBLIC.** Ces valeurs sont lisibles par quiconque, avec le nom du
serveur.

*Aucune tentative de connexion à ce compte n'a été faite : ce serait attaquer la production.*

**À faire :** vérifier les `SEED_ADMIN_*` dans Render → `ulamu-api` → *Environment* ; **changer le mot
de passe et le secret TOTP quoi qu'il arrive** ; durcir le seed pour qu'il refuse de démarrer avec des
valeurs par défaut hors développement ; envisager de passer le dépôt en privé.

C'était déjà la trouvaille n°1 de l'audit du 26 juillet — elle est restée ouverte depuis.

### 5.2 🟡 Terminer la validation de l'authentification

**Rien de ce qui suit n'a été observé en fonctionnement réel.** L'inscription a été tentée sur le
téléphone et s'est arrêtée à l'étape 3 sur « Ce numéro est déjà enregistré (RM-01-01) » : un compte
existe déjà avec ce numéro (probablement créé lors des sessions précédentes).

Deux informations utiles pour reprendre :

- **`aelyswinny2@gmail.com` est libre** (vérifié via l'endpoint) — seul le numéro bloquait.
- Le code OTP **n'avait pas été consommé** : `ensurePhoneFree` s'exécute avant la transaction qui
  consomme le code.

Reste donc à dérouler, avec un autre numéro : **inscription complète → connexion → 2FA par email →
mot de passe oublié**, sur mobile **et** sur web.

### 5.3 🟡 Reprendre le tiroir d'authentification

Le porteur n'est **pas satisfait** du résultat de 4.2 et veut y revenir. Le motif précis n'a pas été
recueilli (fin de session) — **le demander avant de modifier quoi que ce soit.** Les mécanismes en
place (point de passage unique, séparation flèche/bouton matériel, poignée de glissement) peuvent
servir de socle ou être remis en cause.

### 5.4 Dettes identifiées, non traitées

- **Lien « Se désabonner » sur les emails d'authentification** (voir 3.4) — risque d'enfermement dehors.
- **Domaine pour Brevo** : supprimerait la réécriture de l'expéditeur en `@brevosend.com` et les
  avertissements DKIM/DMARC, améliorant nettement la délivrabilité.
- [`packages/contracts/src/auth.ts`](../packages/contracts/src/auth.ts) **toujours obsolète** : déclare
  `RequestOtpRequest { phone }`, ignore email/username/2FA, alors que son en-tête affirme être « la
  SEULE vérité partagée ». Sans danger immédiat (les deux apps ont leur copie vendorée), mais trompeur.
  Recommandation n°8 de l'audit du 26/07, toujours non appliquée.
- **Récupération de mot de passe web** possible **uniquement** par TOTP : un professionnel qui oublie
  son mot de passe avant d'avoir activé son TOTP n'a aucun recours dans l'interface (le backend a
  pourtant une réinitialisation par email, sans UI web).
- **En-tête de [`AuthContext.tsx`](../apps/mobile/src/state/AuthContext.tsx) périmé** : décrit encore
  « OTP SMS » et « TOTP », alors que la migration email de juillet a tout changé.
- **`SECRETBOX_KEY`** (`sync: false`) : impossible de vérifier d'ici si elle est positionnée en
  production. Si elle manque, le chiffrement au repos ne protège rien (repli sur une clé fixe visible
  dans le dépôt public).
- **Couverture de tests** : mobile = 3 tests de logique pure, 0 sur 29 écrans ; web = **0 test, aucun
  script de test**. L'API tient bon avec 465 tests unitaires, mais ses **44 tests d'intégration n'ont
  pas pu tourner** (pas de PostgreSQL/Docker disponible sur cette machine).
- **Non commités volontairement** : `APP/apps/web/package-lock.json` (modifié par une installation
  locale, dépendances optionnelles propres à Windows) et `APP/apps/api/package-lock.json` (jamais
  suivi jusqu'ici). Les inclure changerait ce que Render construit — à décider séparément.

---

## 6. Résultats des vérifications automatisées (2026-07-29)

| Couche | Commande | Résultat |
|---|---|---|
| API | `npm run build` | ✅ code 0 |
| API | `npm run test:unit` | ✅ **465/465** (15 suites) |
| API | tests d'intégration | ⚠️ non exécutés (pas de PostgreSQL local) |
| Mobile | `npm run typecheck` | ✅ propre |
| Mobile | `npm test` | ✅ 3/3 (un seul fichier de test) |
| Mobile | `npx eslint src/` | ⚠️ 127 signalements au total, **aucun introduit par cette session** |
| Web | `npm run build` | ✅ propre |
| Web | `npm run lint` | ✅ 4 avertissements cosmétiques |
| Web | tests | ❌ aucun script de test |

---

*Fin du rapport. Document autonome — exploitable sans accès à la conversation qui l'a produit.*

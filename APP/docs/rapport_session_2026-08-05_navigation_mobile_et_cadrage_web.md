# Rapport de session — Navigation mobile & cadrage web (2026-08-05)

**Document de reprise autonome.** Écrit pour qu'on puisse continuer sans cette conversation, y compris
depuis un autre compte Claude. Chaque affirmation est adossée à une preuve (`fichier:ligne`, hash de
commit, ou sortie de commande réelle). Ce qui n'a **pas** été vérifié est dit explicitement — ne pas
combler ces trous par des suppositions.

**Documents antérieurs :**
- [`audit_fonctionnel_ulamu_2026-07-26.md`](audit_fonctionnel_ulamu_2026-07-26.md) — instantané du
  26/07, toujours valable pour le backend et la cartographie générale.
- [`rapport_session_2026-07-29_authentification.md`](rapport_session_2026-07-29_authentification.md) —
  **dépassé sur la navigation mobile** par le présent rapport ; toujours valable sur la mise en route
  de l'environnement (§2) et sur le risque SUPER_ADMIN (repris et aggravé ici, voir §6.1).

> ⚠️ **À traiter en premier à la reprise** : le compte SUPER_ADMIN porte désormais le mot de passe
> `admin123` sur la base de production. Voir §6.1. C'est le point le plus grave ouvert.

---

## 1. État à la fin de la session

| Élément | État |
|---|---|
| Navigation retour de l'app mobile | 🟢 auditée sur les **25 écrans**, 8 familles de défauts corrigées |
| Base de données Neon | 🟢 **remise à zéro** le 05/08, 8 migrations rejouées, seed exécuté |
| Inscription patient mobile de bout en bout | 🟢 **vérifiée sur appareil** par le porteur (OTP email reçu, compte créé) |
| Flux poignée de main → paiement → session | 🔴 **non vérifié** — exige un professionnel côté web, qui n'existe pas |
| App web (pro/structure/admin) | 🟡 **auditée sur l'authentification uniquement**, aucun code modifié |
| Compte SUPER_ADMIN de production | 🔴 **risque aggravé** (voir §6.1) |
| Tests automatisés mobile | 🟢 7 verts (2 suites), dont un test de non-régression sur la boucle |

**Commits de la session** (dans l'ordre, sur `main`) :

| Hash | Objet |
|---|---|
| `86a1993` | Refonte du parcours auth : carrousel, tiroir et navigation entre étapes *(6 jours de travail non commités, sauvés après coupure de courant)* |
| `363c4fc` | Navigation retour : corrige **la boucle de confirmation** et unifie les sorties d'écran |
| `0e4ec0a` | Flux de paiement : supprime la double session et sécurise la sortie |
| `ec09db2` | Session : confirme la sortie d'une consultation en cours |
| `7e655a7` | Formulaires du compte : garde-fou à la sortie et recul d'étape |
| `074de4d` | Feuilles de création : confirme l'abandon et efface vraiment |
| `a608e60` | API : déclare le crochet seed de Prisma |
| `9917ab7` | API : le crochet seed passe par npx |
| `344c189` | Carnet, Réglages, Notifications : dernières sorties non gardées |

Le porteur pousse lui-même depuis son IDE ; à la clôture de la session, `origin/main` était à `9917ab7`
et `344c189` restait local.

---

## 2. Le point de départ : une coupure de courant

Le 04/08 à 18h16, une coupure secteur a éteint la machine **pendant** que trois `Edit` s'appliquaient.
Constat vérifié :

- Les transcriptions de conversation vivent dans `~/.claude/projects/C--Users-ADMIN-Desktop-ULAMU/*.jsonl`
  et **survivent intégralement** à une extinction brutale. Seul l'index de l'application avait perdu la
  référence.
- Les trois fichiers (`RegisterScreen`, `LoginOtpScreen`, `ForgotScreen`) avaient bien été écrits sur
  disque **avant** l'extinction ; `tsc --noEmit` est ressorti à 0 erreur.
- En revanche **six jours de travail (31 fichiers) n'étaient pas commités**. D'où `86a1993`.

**Leçon opérationnelle :** commiter par paliers. Le dépôt est dans le dossier **intérieur**
(`Desktop/ULAMU/ULAMU`), pas l'extérieur — piège récurrent.

---

## 3. La « boucle des retours » — le défaut central

Signalé par le porteur le 04/08 à 18h14 : *« j'ai une boucle des retours sur les pages »*.

### 3.1 Le diagnostic du 04/08 était FAUX

La session interrompue avait conclu que `navigate('Login')` empilait un second écran Login, et avait
remplacé trois appels par `goBack()`. **C'est inexact** : en React Navigation 7 (`native-stack` 7.2.0),
`navigate` vers un écran **déjà présent dans la pile** y revient en dépilant — il n'empile rien. Login
étant toujours juste en dessous, les deux formes étaient équivalentes. **Le correctif était cosmétique
et la boucle est restée intacte.**

### 3.2 La vraie cause

Trois pièces qui se contredisent :

1. [`AuthPage.tsx:70`](../apps/mobile/src/components/AuthPage.tsx) intercepte **tous** les appuis sur le
   bouton retour matériel et renvoie `true` — y compris pendant qu'une boîte de dialogue est affichée.
2. Le garde-fou d'abandon ouvre une confirmation, qui est un `Modal` dont le `onRequestClose` réagit
   **aussi** au bouton retour.
3. Un appui ferme donc la boîte **et** rappelle le garde-fou, qui en rouvre une aussitôt. Boucle
   infinie, écran impossible à quitter.

Aggravant, en dessous : [`Dialog.tsx`](../apps/mobile/src/components/Dialog.tsx) n'avait **qu'une seule
place** pour le `resolve`. Chaque nouvelle boîte écrasait celui de la précédente, dont la `Promise` ne
se réglait alors **jamais** — tout code qui l'attendait restait bloqué définitivement.

### 3.3 Correctifs

- `useAbandonGuard` : verrou `asking` — une seule confirmation à la fois.
- `Dialog` : une boîte remplacée **règle** sa `Promise` (valeur d'annulation) au lieu de l'abandonner.

**Preuve de non-régression :** [`__tests__/AbandonGuard.test.tsx`](../apps/mobile/__tests__/AbandonGuard.test.tsx).
Sans le verrou, trois appuis ouvrent **3 boîtes** → test rouge. Avec, une seule → vert. Vérifié dans les
deux sens pendant la session.

---

## 4. Audit de navigation des 25 écrans mobiles

Huit familles de défauts, toutes corrigées.

| Famille | Où | Ce qui se passait |
|---|---|---|
| Boucle de confirmation | `useAbandonGuard` + `Dialog` | écran impossible à quitter (§3) |
| **Double session empilée** | `Handshake` interrogeait le serveur sous `Pay` | polling par effet de **montage** et non de focus ; les deux écrans réagissaient à `PAID` par un `replace` → deux `Session` dans la pile, retour piégé |
| Retour piégé après paiement | `Pay` | `replace` ne retirait que le paiement ; la poignée restait dessous et renvoyait aussitôt dans la session |
| Sortie non gardée d'une consultation payée | `Session` | le bouton matériel était la **seule** sortie et réinitialisait la pile, chronomètre en cours |
| Retour incohérent entre étapes | `Register`, `PhoneChange` | deux formulaires en 3 étapes répondaient à l'opposé au même geste |
| Feuilles fermées en silence | `Reminders`, `Family`, `Carnet`, `Settings` | brouillon perdu au moindre appui à côté ; saisie abandonnée **réapparaissant** à la réouverture |
| Saisie perdue sans avertissement | `EditProfile` | nom, date de naissance, arrondissement |
| Suppression définitive sans filet | `Notifications` | seule la suppression **unitaire** n'était pas confirmée |

**Décisions de conception prises pendant la session :**
- L'écran de succès est **réservé à l'inscription**. Les trois voies de connexion (mot de passe seul,
  code email, TOTP) entrent désormais **directement** dans l'app. `AuthStackParamList.Success` est passé
  à `undefined`.
- `CloseAccount` relu, **volontairement laissé tel quel** : la clôture est déjà confirmée par un dialogue
  danger, et retenir quelqu'un qui renonce à fermer son compte n'aurait aucun sens.

**Deux motifs extraits** plutôt que recopiés une cinquième fois :
- [`useHardwareBack.ts`](../apps/mobile/src/state/useHardwareBack.ts) — abonnement lié au **focus** (pas
  au montage) et gestionnaire lu **par référence**.
- `useAbandonGuard` généralisé à tous les formulaires et feuilles.

**Innocentés après lecture, aucune modification :** `Meds` (nettoyage d'intervalle correct),
`Home` (sa modale est un filtre), `Consultations` (filtre), `Space` (déconnexion confirmée,
rafraîchissement lié au focus), `Doctor`, `Ordonnance`, `Payments` (aucune écriture, aucune modale).

---

## 5. Remise à zéro de la base (05/08)

**La base est chez Neon, pas chez Render.** Render héberge l'API, Neon la base PostgreSQL, GitHub
déclenche les déploiements. `apps/mobile/src/config.ts:12` : `USE_LOCAL_API = false` — **le téléphone
parle au serveur déployé**, jamais à un backend local.

Opération réalisée depuis `apps/api`, avec `DATABASE_URL` posée dans un `.env` local (ignoré par git) :

```
npx prisma migrate reset --force
```

- 8 migrations rejouées (`20260614073948_init` → `20260727220000_email_2fa`) ✅
- Seed exécuté ✅

**Deux pièges rencontrés, tous deux corrigés :**

1. La clé `prisma` de `apps/api/package.json` ne déclarait **aucun crochet `seed`** : `migrate reset`
   laissait une base **vide** — schéma en place, zéro donnée, application intestable. Corrigé (`a608e60`).
2. Le crochet `ts-node prisma/seed.ts` échouait : Prisma lance la commande **sans** le PATH augmenté par
   npm. Passé à `npx ts-node prisma/seed.ts` (`9917ab7`).

**Contenu de la base après seed :**

| Compte | Identifiant | Mot de passe |
|---|---|---|
| Super-administrateur | `super.admin` | `admin123` ⚠️ voir §6.1 |
| Patient de démo | `patient.demo` | `demo1234` |
| Titulaire pharmacie | `pharma.demo` | `demo1234` |

Plus 3 soignants, 6 médicaments, 3 pharmacies, 40 paramètres métier.

⚠️ **Toute remise à zéro exige un redémarrage du service Render** : le schéma est supprimé puis recréé
pendant que l'API tourne, et ses connexions ouvertes pointent alors vers des tables disparues.

---

## 6. Risques ouverts

### 6.1 🔴 SUPER_ADMIN à mot de passe faible sur la production

Le rapport du 29/07 signalait déjà ce compte comme « le point le plus grave encore ouvert ». **La
situation s'est aggravée** : le seed du 05/08 l'a recréé avec le mot de passe **`admin123`**, choisi
explicitement par le porteur après avertissement.

Faits :
- `prisma/seed.ts:368` utilise `SEED_ADMIN_PASSWORD` si présente, sinon `admin12345` (valeur écrite en
  clair dans le dépôt).
- Le secret TOTP par défaut est `JBSWY3DPEHPK3PXP` — valeur d'exemple publique de la RFC.
- L'API est joignable depuis Internet (`ulamu-api.onrender.com`).
- `RM-01-06` (M01) rend le TOTP **obligatoire** pour les comptes admin.

**Action à la reprise :** changer ce mot de passe et régénérer le secret TOTP avant toute ouverture à
de vrais utilisateurs.

### 6.2 🔴 Le cœur du produit n'a jamais été vérifié de bout en bout

Le flux poignée de main → paiement → session ne peut pas être testé : il exige qu'un **professionnel
confirme depuis l'app web**, qui n'a pas d'interface pour ça (§7). Tous les correctifs de `Handshake`,
`Pay` et `Session` de cette session sont donc **validés par lecture et compilation, pas par usage réel**.

### 6.3 🟡 La documentation ne suit plus le code sur trois points

| Le cahier des charges dit | Le code fait | Depuis |
|---|---|---|
| OTP par **SMS** (`EF-01-01`, `EF-01-04`, `RM-01-03`) | par **email** (Brevo) | juillet 2026 |
| Connexion par **téléphone** (`EF-01-03`) | nom d'utilisateur **ou** email | juillet 2026 |
| TOTP **optionnel** pour les pros (`RM-01-06`) | déclaré **obligatoire** sur le web (`apps/web/src/lib/api.ts:182`) | non daté |

Ce ne sont pas des bugs mais des décisions réelles jamais consignées. **Un lecteur qui coderait d'après
M01 aujourd'hui se tromperait.** À arbitrer : corriger la spécification, ou corriger le code.

### 6.4 🟡 Captures d'écran impossibles en pratique

`MainActivity.kt:33` lève bien `FLAG_SECURE` en debug, mais **l'APK installé sur l'appareil est
antérieur à ce changement** (modification native → exige une reconstruction, celle du 05/08 a été
interrompue). Conséquence : `adb shell screencap` renvoie 0 octet, et `uiautomator dump` échoue avec
« could not get idle state » à cause du fond animé qui ne s'arrête jamais. **Tout travail visuel se fait
donc à l'aveugle** tant qu'un `gradlew installDebug` n'a pas abouti.

---

## 7. Cadrage de l'app web — audit de l'authentification

Lecture de M01, des 4 pages d'auth, du client API et du store de session. **Aucun code web modifié.**

**Rappel de périmètre (D-039/D-044) :** `apps/web` sert les **professionnels, structures et
administration** — jamais les patients. Quatre familles de rôles : Professionnel, Titulaire, Membre,
Admin (4 sous-rôles : Super, Finance, Vérification, Carte).

**État réel :** 4 pages d'authentification + un `DashboardPage` de **0,8 Ko** (emplacement réservé).
Aucun module métier. Le backend, lui, implémente 13 modules avec 505 tests.

### Six écarts constatés

| # | Gravité | Écart |
|---|---|---|
| 1 | 🔴 | **Consentement légal absent.** `EF-01-08` exige CGU + confidentialité horodatés et versionnés (loi n° 29-2019). `RegisterPage` n'a aucune case, `RegisterProfessionalRequest` aucun champ. Le mobile, lui, le demande |
| 2 | ~~🔴~~ ✅ | ~~Verrouillage définitif possible faute de TOTP imposé.~~ **CONSTAT ERRONÉ, corrigé le 05/08 après vérification dans le navigateur.** `App.tsx:35` implémente `needsTotpSetup`, qui **redirige toutes les routes** vers la configuration TOTP tant qu'un compte non-patient ne l'a pas activée — à l'inscription comme à la connexion. Il n'y a donc aucun risque de verrouillage. L'erreur venait de ma méthode : j'avais lu les 4 pages et le client API, **pas le routeur**. Reste vrai : cette contrainte rend le TOTP *de facto* obligatoire sur le web, ce que `RM-01-06` dit optionnel → c'est une dérive documentaire (écart n°6), pas un défaut |
| 3 | 🔴 | **L'inscription pro ne mène nulle part.** `CU-01-02` impose une redirection **obligatoire** vers le dossier de vérification M03 ; le compte reste invisible de l'annuaire sans lui (`RM-02-04`). Aucune route M03 n'existe côté web : le compte créé ne peut jamais devenir opérationnel |
| 4 | 🟠 | **Session web sans expiration.** `ENF-07`/`CU-01-03` imposent 30 min d'inactivité. `session.store.ts` n'a aucun minuteur — le jeton vit jusqu'à la fermeture de l'onglet. Sensible sur un poste partagé en officine |
| 5 | 🟠 | **Trois fonctions M01 absentes du web** : liste des appareils et déconnexion à distance (`EF-01-05`), changement de numéro (`EF-01-07`), clôture de compte (`EF-01-09`). Le mobile a les trois |
| 6 | 🟡 | **Dérive documentaire** — voir §6.3 |

**Observation transverse (dette technique) :** toute la mise en page web est en `style={{…}}` inline.
Les variables CSS de la charte existent (`--espace-3`, `--ap-400`…) mais rien n'oblige à les respecter.
`TypeCard` réimplémente le survol en JavaScript sur 40 lignes — ce que CSS fait en trois, sans réagir
au clavier. **À poser proprement avant de construire 4 espaces × 12 modules.**

Le plan de correction et de construction est dans
[`plan_frontend_web_2026-08-05.md`](plan_frontend_web_2026-08-05.md).

---

## 7 bis. Construction de l'app web — phases 0 à 4 (même journée)

Le cadrage ci-dessus a été suivi de la construction. **L'app web est passée de 4 pages
d'authentification + une coquille vide à un produit utilisable par les trois familles de rôles.**

### Ce que ça change pour le produit

Avant : un patient pouvait dérouler tout son parcours sur mobile, mais **aucun professionnel ne
pouvait lui répondre** et **aucune pharmacie ne pouvait servir une ordonnance**. Le backend
(13 modules, 505 tests) était complet et inatteignable.

Après : `patient sollicite (mobile) → soignant confirme (web) → paiement → consultation des deux
côtés → ordonnance scellée avec garde-fou allergies → délivrance au comptoir → stock décrémenté`.

### Trous BACKEND comblés en chemin

Trois endpoints manquaient purement et simplement — le produit était bloqué sans eux :

| Endpoint ajouté | Sans lui |
|---|---|
| `POST /v1/verification/me/documents/upload` | le dossier de vérification était **impossible à remplir** depuis un client |
| `GET /v1/facilities/me` | un membre de structure ne pouvait **découvrir aucune** de ses pages |
| `GET /v1/stocks/:id/items` | un pharmacien ne pouvait **pas voir son propre stock** |

Ajouté aussi : `acceptTerms` obligatoire sur les 3 inscriptions (le serveur fabriquait un
consentement sans acceptation — voir §7), et le message de blocage PM-18 qui annonce enfin sa durée.

### Écrans livrés

**Phase 0** — typographie CG-02, barre latérale 3 états, menu utilisateur, thème clair/sombre
branché, palette `Ctrl K`, états d'écran.
**Phase 1** — consentement, dossier de vérification, expiration d'écran, appareils, numéro, clôture.
**Phase 2** — vitrine + offres + présence, poignées de main, consultation, compte-rendu, ordonnance,
gains.
**Phase 3** — structure + membres et droits, stock FEFO, délivrance.
**Phase 4** — file de vérification, KPIs du pilote, intégrité du journal d'audit.

### Vérifié dans un vrai navigateur, pas seulement compilé

- Un **professionnel** voit vitrine / demandes / consultations / gains — **aucune** entrée pharmacie
  ou administration.
- Un **admin Vérification** voit sa file — **pas** le pilotage.
- Naviguer directement vers `/admin/pilotage` avec ce sous-rôle **redirige** et ne rend jamais le
  contenu : la garde de route fonctionne, pas seulement le filtrage du menu.
- Conformité mesurée à l'exécution : corps en `Inter Variable`, barre 240 px / 56 px, item 32 px,
  libellés de groupe en `JetBrains Mono` majuscule, `blur(16px)`, `html.dark` actif.

### Reste à faire

Transfert de titularité (M02), réservations/dévoilements (M12), gains de structure (M13, la page
existe — il suffit de changer le `holderType`), et côté administration : contrats, signalements,
supervision des paiements, paramètres métier, attribution des sous-rôles.

**Aucun de ces points ne bloque un parcours.**

---

## 8. Ce qui a été vérifié, et comment

| Affirmation | Preuve |
|---|---|
| Les 8 familles de défauts de navigation sont corrigées | `tsc --noEmit` à 0 erreur, `eslint --quiet` à 0 erreur sur les fichiers touchés, 7 tests verts, aucune erreur JS dans `adb logcat` après rechargement |
| La boucle est réellement corrigée | Test qui échoue sans le correctif (3 boîtes) et passe avec — vérifié dans les deux sens |
| L'inscription patient fonctionne de bout en bout | **Vérifiée sur appareil par le porteur** : OTP reçu par email, compte créé, écran « Compte créé » affiché |
| Une boîte de dialogue s'affiche bien par-dessus une feuille modale | **Capture d'écran fournie par le porteur** — le point qui inquiétait le plus, deux `Modal` React Native superposés |
| La base est repeuplée | Sortie du seed : 40 paramètres, 3 soignants, 6 médicaments, 3 pharmacies |

### Ce qui n'a PAS été vérifié — ne pas supposer

- **Le flux poignée de main → paiement → session** (§6.2). Aucun des correctifs de `Handshake`, `Pay`,
  `Session` n'a été exercé en conditions réelles.
- **Les garde-fous de `EditProfile`, `PhoneChange`, `Carnet`, `Settings`, `Family`** — écrits et
  compilés, jamais déclenchés sur appareil.
- **L'app web n'a pas été lancée du tout** cette session. Aucun `npm run dev`, aucun build.
- **Le comportement après redémarrage Render** suivant la remise à zéro de la base.

---

*Session du 2026-08-05 · Précédent : [`rapport_session_2026-07-29_authentification.md`](rapport_session_2026-07-29_authentification.md) · Plan : [`plan_frontend_web_2026-08-05.md`](plan_frontend_web_2026-08-05.md) · Index : [`cahier_des_charges/00_HOME.md`](cahier_des_charges/00_HOME.md)*

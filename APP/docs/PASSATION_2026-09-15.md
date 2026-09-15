# Passation — session du 12 au 15 septembre 2026

> **À lire en entier avant de toucher une ligne.** Elle contient ce qu'une nouvelle session ne peut
> pas deviner : les décisions du porteur, les pièges déjà payés, et l'endroit exact où l'on s'est
> arrêté.
>
> Elle complète `PASSATION_2026-09-09.md` (l'état général du projet) — elle ne la remplace pas.

---

## 1. Les règles du porteur — elles ne se négocient pas

| | |
|---|---|
| **Pousser** | *« Tu ne pousses jamais sur GitHub, c'est moi qui pousse. »* On **commite**, on lui dit, il pousse. |
| **Mots de passe** | *« Tu ne saisis jamais de mot de passe. »* Ni le sien, ni le code PIN du téléphone. |
| **Tests en ligne** | *« Il est interdit de lancer le serveur local, c'est obligatoire de passer directement depuis la plateforme hébergée. »* → on vérifie le web sur **ulamu-web.onrender.com**, jamais sur un `vite dev`. (Metro pour le téléphone est une autre affaire : c'est le seul moyen de charger le JS d'un APK de développement, et il l'accepte.) |
| **Avant de travailler** | *« Avant de travailler tu me dis en bref non technique ce que tu vas faire et pourquoi, pour que je comprenne où nous allons. »* Une ou deux phrases, en français simple. |
| **Prévenir** | *« Il faut prévenir pour que je sache que tu ne loupes rien. »* |
| **Sa façon de tester** | Des listes de **2 à 3 gestes**, pas plus. Il déteste attendre. Il lit mal les messages longs et techniques — le 14/09 il a dit : *« moi je n'ai encore rien compris hein »*. Faire court, concret, sans jargon. |
| **Tester soi-même** | *« S'il faut faire des tests, fais-le toi-même. »* Piloter le téléphone par `adb`, le web par le navigateur intégré. Ne le déranger que pour ce qui coûte de l'argent ou demande son doigt. |

---

## 2. Où l'on s'est arrêté — LA SUITE IMMÉDIATE

> ✅ **Le choix de l'offre par le patient est FAIT** (chantier 120), et quatre chantiers ont suivi
> dans la même séance — 121 à 124. Ce qui suit dit ce qui reste.

### Ce qui a été livré le 15/09 — chantiers 119 à 124

| | |
|---|---|
| **119** | ⚠️ **La plateforme relevée.** L'API n'avait plus démarré pendant trois heures : la migration du 117 insérait PM-41 sans `updatedAt` (`NOT NULL`, sans défaut), et P3009 bloquait toutes les suivantes. Filet posé : `migrations-insert-colonnes.spec.ts`. |
| **120** | **Le patient choisit son offre.** Toutes les consultations actives, à cocher ; la moins chère par défaut ; une seule offre → pas de case ; ce qui se vend séparé de ce qui est inclus ; le suivi annoncé mais pas achetable. |
| **121** | **Ce que le serveur servait et que personne ne voyait** : le prix d'appel (il montrait le tarif de SUIVI), le prix sur la carte, la biographie, le taux de confirmation, les avis. |
| **122** | **Un titre ne nomme jamais ce que quelqu'un d'autre nomme** — trouvé par le porteur. |
| **123** | **La route des avis** : curseur, tri, filtre par note, total. Aucun identifiant de patient. |
| **124** | **L'écran « Tous les avis »** : défilement infini, tri, barres cliquables, fidélité affichée. |

**Tout est vérifié écran en main**, sur le téléphone du porteur, dans les deux thèmes.

---

### ⚠️ CE QUI RESTE SUR LE BUREAU DU PORTEUR — à faire avant tout le reste

**PM-20 déconnecte les patients toutes les ~30 minutes.** Mesuré deux fois le 15/09 : la session de
Mireille meurt après 19 puis 25 minutes d'inactivité. Or la règle du produit est claire —
`session-expiry.ts` : **web 30 min (ENF-07), mobile PM-20**, semé à **30 jours** (D-027).

Le code est juste : le mobile déclare bien `client: 'mobile'` (`config.ts`), la garde lit PM-20.
**La seule explication qui reste est que PM-20 vaut ~1800 en base de production.** C'est le même
motif que PM-29, resté à 1800 alors que le code attend 0.

> *Un patient qui pose son téléphone vingt minutes doit ressaisir son mot de passe. Sur une
> application de santé, c'est rédhibitoire — et rien dans le code ne le trahit.*

**Geste :** écran d'administration → Paramètres → **PM-20 → `2592000`** (30 jours). Et **PM-29 → `0`**
pendant qu'on y est. ⚠️ Une session Claude ne peut pas lire la base de production (bloqué par le
harnais) : **seul le porteur peut constater ces valeurs.**

---

### La suite de travail proposée, par ordre d'utilité

1. **L'offre de suivi n'est toujours pas protégée côté serveur.** `initiate()` accepte n'importe
   quelle offre ACTIVE, y compris `FOLLOW_UP` : les écrans ne la proposent plus (chantiers 65, 120),
   mais un appel direct à l'API la vend encore comme une première consultation. *Une règle que seul
   l'écran applique n'est pas une règle.* Décision déjà prise par le porteur, jamais codée.
2. **Le reçu doit porter le libellé de l'offre choisie.** Le chantier 118 le fige sur la poignée
   (`offerLabel`) ; aucun écran ne l'affiche encore.
3. **Le web n'a pas d'annuaire patient.** EF-05-04 promet une « vitrine consultable sans compte » ;
   côté web, seul le soignant voit sa propre fiche (*Ma vitrine*, 3 avis). Les chantiers 121-124 ne
   concernent que le mobile.
4. **Passe 1 de la refonte**, écrans restants : *Ma vérification* · *Ordonnance (visuel)* ·
   *Mes paramètres* · *la coque*. **Passe 2** : 7 écrans d'administration, non commencée.


## 3. Ce que cette session a fait — chantiers 106 à 118

Tous **commités et poussés** par le porteur. Détail et leçons : `PLAN_EXECUTION_WEB.md`.

| | |
|---|---|
| **106** | La vidéo sur le téléphone, rogneur compris. `react-native-video-trim` retenue. APK **82,6 → 110,0 Mo**. |
| **107** | La vidéo prouvée écran en main. Quatre fautes du 106, dont **l'écran de découpe de la brique qui fait quitter l'application**. L'écran de découpe est devenu **le nôtre**. |
| **108** | La séance payée mais pas commencée : l'écran du médecin se croyait terminé. `vivante` ≠ `active`. |
| **109** | Les pièces se relisent après la séance (le lecteur vivait dans le bloc d'envoi). |
| **110** | Les rappels qui se referment (croix + retour à la moitié du temps restant). |
| **111** | Partage du profil retiré + carte « Pré-consultation » qui survivait. |
| **112** | Export du Carnet retiré (décision du porteur). Le **code familial est conservé**. |
| **113** | Carnet de numéros Mobile Money — **serveur** (table `MomoNumber`, routes, paiement). |
| **114** | Les **écrans** du carnet (web : onglet *Mobile Money* ; mobile : écran sous « Changer de numéro »). |
| **115** | Le numéro débité, **dit avant de payer**. |
| **116** | Partage retiré partout + « Voir le profil » devenu un vrai bouton + **règle du numéro vendorée** + **logos MTN / Airtel**. |
| **117** | Le numéro de retrait **se prouve** (SMS) **et il attend** (PM-41 = 24 h). |
| **118** | **Le prix se fige à la demande.** |

### ⚠️ Trois migrations attendent le déploiement

Elles s'appliquent seules au démarrage (`prisma migrate deploy`), mais si le serveur bronche après un
push, **c'est là qu'il faut regarder** :

1. `20260914100000_carnet_de_numeros_mobile_money` — table `MomoNumber` ;
2. `20260914160000_numero_de_retrait_verifie` — `OtpPurpose.MOMO_VERIFY` + **PM-41** ;
3. `20260914180000_prix_gele_sur_la_poignee` — 3 colonnes sur `Handshake` + rattrapage.

---

## 4. Les décisions du porteur prises pendant cette session

| Décision | Statut |
|---|---|
| **Le patient choisit son offre**, et ne paie qu'une fois | ⏭ **à faire — c'est la suite** |
| Séparer ce qui **se vend** (offres) de ce qui est **inclus** (ordonnance signée) | ⏭ à faire |
| L'offre de **suivi** ne doit pas être achetable par n'importe qui | ⏭ à faire |
| Le **reçu** doit porter le libellé de l'offre choisie | partiellement : le libellé est figé (118), reste à l'afficher |
| **Frais d'opérateur** : le patient paie le prix affiché, les frais sortent de la commission ULAMU | ✅ tranché — l'écran promet déjà *« aucun frais caché »* |
| **Délai de sécurité** après changement du numéro de retrait : **24 h** | ✅ fait (PM-41) |
| **Pré-consultation** retirée partout | ✅ fait (105, 111) |
| **Partage** retiré partout sur le mobile | ✅ fait (111, 116) |
| **Export du Carnet** retiré ; **code familial conservé** | ✅ fait (112) |
| Numéro : **9 chiffres, commençant par 0**, champs chiffres uniquement | ✅ fait (116) |
| **Logos** MTN MoMo et Airtel Money aux bons endroits | ✅ fait (116) |

---

## 5. Les pièges de cette session — chacun a coûté du temps

### Outils et environnement

- ⚠️ **Les heredocs mangent les échappements.** Écrire les scripts d'édition avec l'outil `Write`
  (fichiers Python dans le scratchpad), puis les lancer. Huit incidents avant d'arrêter d'essayer.
- ⚠️ **CRLF / LF** : les fichiers de l'API et les fichiers web *anciens* sont en **CRLF**, ceux créés
  récemment en **LF**. Tout script d'édition doit détecter les fins de ligne et s'y plier — sinon une
  ancre multi-lignes ne se trouve pas, **et le script croit qu'il n'y avait rien à changer.**
- ⚠️ **`PYTHONIOENCODING=utf-8`** devant chaque `python` qui affiche du français, sinon `charmap`
  plante à l'impression.
- **adb** : `/c/Users/ADMIN/AppData/Local/Android/Sdk/platform-tools/adb.exe` (pas dans le PATH).
  `adb exec-out screencap -p > fichier.png` puis redimensionner avec PIL pour lire l'écran.
  ⚠️ La liaison USB **lâche régulièrement** en plein milieu : réessayer, et ne pas conclure d'un
  échec isolé.
- **Metro** : `npx react-native start` en tâche de fond, puis `adb reverse tcp:8081 tcp:8081`.
  Une modification **JS seule ne demande AUCUN rebuild** : `am force-stop` + relance suffit.
  Seul un ajout de brique **native** impose `gradlew assembleDebug` (~14 min la première fois).

### Programmation

- ⚠️ **Un crochet React après un retour anticipé fait tomber l'écran entier.** Déjà payé au chantier
  98 (sur le téléphone du porteur), **refait au chantier 110**. *Une leçon apprise ne protège pas —
  c'est le filet qui protège.*
- ⚠️ **Un `PanResponder` reconstruit à chaque rendu perd le geste en cours.** Les créer **une fois**,
  lire l'état par référence.
- ⚠️ **`react-native-video-trim` fait quitter l'application** dès que son écran s'affiche
  (`emitOnShow` → `AsyncEventEmitter::emit` → SIGSEGV). On n'utilise QUE ses fonctions qui répondent
  (`isValidFile`, `getFrameAt`, `trim`). **Ne jamais réintroduire `showEditor`.**
- ⚠️ **Ce projet est sur la NOUVELLE architecture React Native** (`newArchEnabled=true`). Un
  TurboModule **n'apparaît pas dans `NativeModules`**. Un commentaire affirmait le contraire et a
  coûté une séance payée.
- ⚠️ **Le vendorage** : `packages/shared/src/*` est la source, les copies doivent être **identiques à
  l'octet près** et porter l'en-tête `VENDORÉ`. Le test `apps/web/src/test/vendorage.test.ts` garde
  la table.

---

## 6. Comment vérifier sans dépenser

- **Le web** : navigateur intégré sur `https://ulamu-web.onrender.com`. Le porteur y est connecté en
  **soignant (Armel Konaté)**.
- **Le téléphone** : compte **patient (Mireille)**. ⚠️ Une réinstallation le **déconnecte** — le
  prévenir.
- ⚠️ **Une consultation de test ne coûte rien**, à deux conditions :
  1. l'écran de paiement s'ouvre **avant** tout débit — on peut le regarder et repartir ;
  2. si le paiement a lieu mais que **le soignant ne répond jamais**, ULAMU **rembourse
     automatiquement** (*« Session remboursée · aucune action requise »*). Vérifié deux fois le 12/09.
- **Ne jamais appuyer soi-même** sur ce qui débite (5 000 F) : c'est son doigt, sa décision.

---

## 7. Ce qui reste en attente, et qui n'est pas dans la suite immédiate

- ⚠️ **PM-29 doit passer à 0** dans l'écran d'administration : la prolongation illimitée du médecin
  est codée, mais la valeur en production est encore 1800 (30 min). **Le porteur doit le faire.**
- Le **rogneur du web** n'a jamais été vu tourner sur une vraie vidéo par le porteur.
- Les **documents PDF depuis le téléphone** : non faits (demanderaient une seconde brique native).
- Le **retrait** (chantier 117) n'a **pas de test d'intégration** : il faut une base de test.
- Dette n°28 (le sélecteur d'émojis monte 1867 boutons), n°29 (le filet surveille les refus, jamais
  les permissions).
- **Passe 1** de la refonte, écrans restants : *Ma vérification* · *Ordonnance (visuel)* ·
  *Mes paramètres* · *la coque*. **Passe 2** : 7 écrans d'administration, non commencée.

---

## 8. Les commandes qui servent tous les jours

```bash
# API (dossier apps/api) — les tests d'intégration exigent une base dédiée, pas la production
npm run test:unit        # 687 ✓
npx tsc --noEmit -p tsconfig.json

# Web (dossier apps/web) — vérification en ligne, jamais de serveur local
npx vitest run           # 1 106 ✓
npx tsc -b

# Mobile (dossier apps/mobile)
npm test                 # 121 ✓
npx tsc --noEmit -p tsconfig.json
npx eslint src/...
```

Le dépôt git est le **dossier intérieur** (`ULAMU/ULAMU`), les sessions s'ouvrent sur l'extérieur.

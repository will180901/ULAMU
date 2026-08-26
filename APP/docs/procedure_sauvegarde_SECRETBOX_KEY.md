# `SECRETBOX_KEY` — sauvegarde, et ce qui arrive si elle est perdue

> Répond à la **dette ouverte n°1** de `PASSATION_2026-08-25.md` §10.
> Rédigé le 25/08/2026. Constats de code vérifiés à cette date sur la branche de travail.
>
> **Ce fichier ne contient pas la clé, et ne doit jamais la contenir.** Il explique où la lire,
> comment la mettre à l'abri, et ce qu'on casse en la perdant. Le dépôt est public au sens où il
> part sur GitHub : une clé écrite ici serait une clé publiée.

---

## 1. Ce que cette clé protège, exactement

`SECRETBOX_KEY` est une clé AES-256-GCM de 32 octets, transmise en base64. Trois familles de
données sont scellées avec elle, et une seule clé les sert toutes :

| Donnée | Où | Scellée par |
|---|---|---|
| Pièces justificatives (diplômes, attestations d'Ordre, justificatifs), avatars, médias de consultation | table `StoredFile`, colonne `data` | `sealBuffer` |
| Corps des messages de consultation | table `SessionMessage` | `sealSecret` |
| Secrets TOTP (second facteur) | table `TotpSecret` | `sealSecret` |

Les fichiers sont **dans PostgreSQL**, pas sur disque : le plan gratuit de Render n'a aucun disque
persistant, et des pièces réelles ont été effacées le 24/08/2026 par un simple redéploiement
(`storage.service.ts:1-21`). La base est donc le seul support durable — et tout y est chiffré.

**Conséquence directe :** la sauvegarde de la base par Neon ne suffit pas. Une base restaurée sans
la clé restaure des octets illisibles. La clé est le second morceau, et il n'existe aujourd'hui
qu'à **un seul endroit au monde** : les variables d'environnement du service `ulamu-api` sur Render.

Vérifié : le fichier `APP/apps/api/.env` de la machine de développement existe mais **ne contient
aucune ligne `SECRETBOX_KEY` renseignée**. Il n'y a donc pas de copie locale qui rattraperait le
coup. (Ce qui confirme au passage le point 4 de `PLAN_EXECUTION_WEB.md` : en local, le code retombe
sur la clé de repli.)

---

## 2. Ce qui se passe si la clé change — la vérification demandée

La question posée était : **erreur claire, ou corruption silencieuse ?**

La réponse était : **corruption silencieuse**, et sur le chemin qui comptait le plus — les pièces
justificatives. **Ce point précis a été corrigé le 25/08/2026** (§2.2 et §8). Le reste du constat
tient toujours, et le détail vaut d'être lu, parce que les trois familles de données ne se
comportent pas du tout pareil.

### 2.1 Au démarrage : rien du tout

`main.ts` ne lit jamais `SECRETBOX_KEY`. Aucune validation d'environnement n'existe au bootstrap.
La fonction `key()` (`common/crypto/secretbox.ts:7-15`) n'est appelée qu'au moment de chiffrer ou
de déchiffrer, jamais avant.

L'API démarre donc **normalement**. `/health` répond. Render affiche un déploiement vert. Le
journal ne dit rien. Si la clé a changé, **rien à cet instant ne le signale** — la panne dort
jusqu'à la première lecture, qui peut être des jours plus tard, le jour de la soutenance.

### 2.2 À la lecture d'une pièce : le serveur servait du charabia en répondant 200 — **corrigé**

C'était le point grave. Voici ce que faisait `StorageService.read()` :

```ts
const raw = Buffer.from(row.data);
let buffer: Buffer;
try {
  buffer = openBuffer(raw);
} catch {
  // Rétrocompatibilité : fichier écrit AVANT le chiffrement au repos — encore en clair.
  buffer = raw;
}
```

Ce `catch` a été écrit pour une bonne raison : les fichiers déposés avant l'ajout du chiffrement
sont encore en clair en base, et doivent rester lisibles. Mais il ne sait pas distinguer
**« vieux fichier en clair »** de **« fichier bien chiffré, mauvaise clé »**. Les deux lèvent. Les
deux retombent sur `raw`.

Résultat, mesuré en rejouant les primitives réelles du dépôt :

```
--- CLE REGENEREE ---
   openBuffer LEVE : Unsupported state or unable to authenticate data
   MAIS read() renvoie quand meme un resultat, sans erreur.
   HTTP renvoye : 200, Content-Type: application/pdf
   octets servis : "M...*.../..." (le chiffré lui-même)
   est-ce le vrai PDF ? false
   commence par %PDF ?  false
```

Donc : **HTTP 200**, `Content-Type: application/pdf`, et dans le corps le texte chiffré tel quel.
Pas de log d'erreur, pas d'exception, pas d'alerte. Côté administrateur qui vérifie un dossier, le
navigateur affiche « impossible d'ouvrir ce PDF » — un message qui ressemble à un fichier mal
déposé par le médecin, pas à un incident de clé. On accuserait l'utilisateur avant de soupçonner le
serveur.

Le format ne sauvait pas la mise : l'octet de version et l'IV sont stockés **en clair** en tête du
blob. Un fichier scellé avec une autre clé passait donc le contrôle de format de `openBuffer` sans
broncher ; seul `decipher.final()` échouait, sur le tag d'authentification — et c'est justement lui
que le `catch` avalait.

> **Corrigé le 25/08/2026.** C'est précisément cet en-tête en clair qui fournit la solution : il se
> reconnaît **sans la clé**. `secretbox.ts` expose désormais `looksSealed()`, et `read()` s'en sert
> pour séparer les deux causes qu'il confondait. Un blob sans en-tête reste servi tel quel (les
> anciens fichiers en clair n'ont rien perdu) ; un blob **avec** en-tête qui refuse de s'ouvrir est
> traité pour ce qu'il est — un incident d'exploitation : journalisé en nommant `SECRETBOX_KEY`,
> puis `InternalServerErrorException`. Plus jamais de faux PDF en 200.
>
> Le choix du 500 est délibéré : la pièce **existe** et ses octets sont **intacts**. Un 404
> « introuvable » enverrait le médecin la redéposer pour rien, alors que restaurer la bonne clé
> suffit à tout relire.
>
> Aucun format accepté à l'écriture ne commence par l'octet `1` (PDF `%`, JPEG `0xFF`, PNG `0x89`,
> WebP/WAV `R`, OGG `O`, MP4/M4A par une taille de boîte) : un ancien fichier en clair ne peut donc
> pas être pris à tort pour un chiffré. Sept tests couvrent la frontière dans
> `src/common/storage.service.spec.ts`, dont celui qui interdit le retour du comportement d'origine.

### 2.3 Les messages de consultation : dégradé, mais honnête

`m06.session.service.ts:120-126` fait le choix inverse, et le bon :

```ts
try { return openSecret(stored); }
catch { return "[message illisible]"; }
```

Le fil de discussion ne plante pas, et le lecteur voit clairement qu'il manque quelque chose. Rien
n'est journalisé côté serveur, en revanche : la panne reste invisible à l'exploitant.

### 2.4 Les secrets TOTP : correctement traité

`m01.service.ts:985-993` est le seul endroit qui traite le sujet comme un incident d'exploitation :
il journalise une erreur **qui nomme `SECRETBOX_KEY`**, puis continue jusqu'au code de secours, de
sorte qu'un compte ne se retrouve pas enfermé dehors. Ce code a été écrit après l'incident du
20/08/2026, où exactement ce scénario a bloqué le compte administrateur.

### 2.5 Récapitulatif

| Chemin | Comportement si la clé change | Visible ? |
|---|---|---|
| Démarrage de l'API | démarre normalement | **non** — reste à corriger (§8.1) |
| Pièce / avatar / média (`StorageService.read`) | ~~sert le chiffré en HTTP 200~~ → **erreur 500 + log nommant `SECRETBOX_KEY`** | **oui**, depuis le 25/08 |
| Message de consultation | affiche `[message illisible]` | oui côté écran, non côté journal |
| Secret TOTP | log d'erreur nommant `SECRETBOX_KEY`, repli sur code de secours | **oui** |

### 2.6 Le piège en plus : une clé *mal formée* dégrade la sécurité sans rien dire

`key()` accepte la variable **seulement si** elle fait exactement 32 octets une fois décodée. Sinon
— copier-coller tronqué, espace en trop, caractère manquant — elle est **ignorée en silence** et le
code retombe sur `sha256("ulamu-dev-secretbox")`, une valeur **écrite en clair dans les sources**
(`secretbox.ts:13-14`).

Deux dégâts simultanés, aucun message :

1. tout ce qui a été scellé avec la vraie clé devient illisible ;
2. tout ce qui est déposé **ensuite** est scellé avec une clé que n'importe qui peut lire dans le
   dépôt — le chiffrement ne protège plus rien, alors que la variable *semble* renseignée.

C'est pourquoi la procédure ci-dessous impose une **vérification après toute manipulation**. Un
collage raté ne se voit pas.

---

## 3. Où lire la clé dans Render

1. Se connecter sur **`dashboard.render.com`** avec le compte propriétaire du service.
2. Ouvrir le service **`ulamu-api`** (le service web NestJS, pas `ulamu-web`).
3. Dans le menu latéral du service, ouvrir **`Environment`**.
4. Repérer la ligne **`SECRETBOX_KEY`** dans la liste des variables. Sa valeur est masquée ; un
   contrôle de révélation (œil / « show ») et un bouton de copie se trouvent sur la ligne.

Elle est là — et pas dans le dépôt — parce que `render.yaml:24-25` la déclare `sync: false` :
Render sait qu'elle existe, mais refuse d'en versionner la valeur. C'est le bon réglage, à ne pas
changer.

Deux mises en garde sur cet écran :

- **Render ne conserve aucun historique des valeurs de secrets.** Écrasée ou supprimée, la valeur
  précédente n'est récupérable ni par vous ni par le support. C'est bien pour cela que cette dette
  est la n°1.
- **Modifier une variable déclenche un redéploiement** du service. À ne pas faire juste avant une
  démonstration.

*(Les libellés exacts de l'interface Render peuvent avoir légèrement bougé — je n'ai pas accès à
votre tableau de bord. Le repère fiable est le service `ulamu-api`, section des variables
d'environnement, ligne `SECRETBOX_KEY`.)*

---

## 4. Procédure de sauvegarde

La règle, en une phrase : **deux copies au moins, sur deux supports physiquement distincts, dont
aucun n'est le dépôt git ni un message que vous vous envoyez à vous-même.**

Ce qu'il faut écarter d'emblée, et pourquoi : un fichier dans le projet (part sur GitHub au premier
`git push`) ; un mail ou un message à soi-même (traverse des serveurs tiers, reste indexé, et se
perd avec le compte) ; un `.txt` sur le Bureau seul (part avec le disque) ; une capture d'écran dans
une galerie synchronisée automatiquement.

### Copie 1 — un gestionnaire de mots de passe (copie de travail)

**Bitwarden** (gratuit) ou **KeePassXC** (gratuit, hors ligne). Créer une entrée :

- Nom : `ULAMU — SECRETBOX_KEY (Render / ulamu-api)`
- Mot de passe / champ caché : la valeur, collée depuis Render
- Notes : `Chiffre pieces justificatives, medias et secrets TOTP (AES-256-GCM). Perdue = donnees
  definitivement illisibles. Ne jamais regenerer sans migration. Empreinte : ________`
  *(l'empreinte se calcule au §5 — elle permet de vérifier une copie sans jamais la comparer à
  l'œil)*

C'est la copie qu'on rouvre au quotidien. Elle est chiffrée, et elle survit à la panne du disque.

### Copie 2 — sur papier, manuscrite, ailleurs (copie de survie)

Celle-ci existe pour le jour où vous perdez l'accès au gestionnaire lui-même. La clé fait
**44 caractères** en base64 et se termine par `=`.

- La recopier **à la main**, en groupes de 4 caractères, sur une fiche.
- Écrire dessus : `ULAMU — SECRETBOX_KEY — Render/ulamu-api — 25/08/2026 — empreinte ________`
- **La casse compte** et l'alphabet base64 contient des caractères qui se confondent : `l`/`I`/`1`,
  `O`/`0`, et `+` / `/`. Former ces caractères sans ambiguïté, ou les annoter.
- Ranger la fiche **hors du lieu où vit l'ordinateur** — chez un proche, dans un dossier
  administratif, une pochette scellée. Un incendie ou un vol qui emporte le portable ne doit pas
  emporter la clé avec.

Puis **vérifier la transcription immédiatement** avec le §5, tant que l'original est sous les yeux.
Une fiche fausse et jamais relue est pire que pas de fiche : elle donne l'illusion d'être couvert.

### Copie 3, facultative — une clé USB

Un fichier texte sur une clé USB rangée avec la fiche papier. Utile, mais ne remplace ni l'une ni
l'autre : une USB oubliée dans un tiroir se démagnétise mal et se perd bien.

### Après la sauvegarde

Noter dans `PASSATION_*.md` §10 que la dette n°1 est levée, **avec la date et le nombre de copies**
— sans jamais indiquer où elles sont rangées.

---

## 5. Vérifier une copie sans l'exposer

L'idée : ne jamais comparer deux clés à l'œil, mais comparer leurs **empreintes** — 8 caractères
dérivés de la clé. Connaître l'empreinte n'apprend rien sur la clé (c'est un extrait de son
condensat SHA-256), mais deux copies identiques donnent forcément la même.

À coller dans une fenêtre PowerShell. La valeur est saisie par une invite, **jamais tapée dans la
ligne de commande** : elle n'entre donc pas dans l'historique PowerShell
(`ConsoleHost_history.txt`), qui, lui, conserve tout ce qu'on tape.

```bash
$s = Read-Host "Colle la cle (invisible)" -AsSecureString; $v = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)); $b = [Convert]::FromBase64String($v); "longueur : $($b.Length) octets  (doit valoir 32)"; $h = [Security.Cryptography.SHA256]::Create().ComputeHash($b); "empreinte : $((([BitConverter]::ToString($h[0..3])) -replace '-','').ToLower())"; Remove-Variable s,v,b,h
```

Lecture du résultat :

- **`longueur : 32 octets`** → la valeur est recevable. Toute autre longueur signifie que le code
  l'ignorerait en silence et retomberait sur la clé publique du dépôt (§2.6).
- **`empreinte : ########`** → à noter sur la fiche papier et dans le gestionnaire. Pour contrôler
  une copie plus tard, relancer la commande sur la copie : même empreinte = copie exacte, jusqu'au
  dernier caractère.

Faites-le **une fois maintenant sur la valeur lue dans Render**, avant même de créer les copies :
c'est cette empreinte-là qui fait référence.

---

## 6. Restaurer la clé, le jour où il le faudra

1. Récupérer la valeur depuis une copie, et **vérifier son empreinte** (§5) avant tout.
2. Render → `ulamu-api` → `Environment` → `SECRETBOX_KEY` → coller → enregistrer.
3. Laisser le redéploiement se terminer.
4. **Contrôler par une vraie lecture** : ouvrir une pièce justificative **déposée avant**
   l'incident. Si elle s'affiche, la clé est la bonne.

L'étape 4 n'est pas décorative : le **démarrage** ne dira toujours rien d'une clé fausse (§2.1). Ce
qui a changé depuis le correctif du 25/08, c'est qu'une clé fausse ne se déguise plus : la lecture
renvoie une **erreur 500** et le journal Render affiche une ligne nommant `SECRETBOX_KEY`. La
lecture d'essai reste donc le contrôle, mais son échec est maintenant lisible au lieu de ressembler
à un fichier abîmé.

Le test doit porter sur un fichier **antérieur** — un fichier déposé *après* la restauration se
relira parfaitement même avec une mauvaise clé, puisqu'il aura été scellé avec elle.

---

## 7. À ne jamais faire

- **Ne jamais régénérer la clé** « pour faire propre ». Ce n'est pas un mot de passe : c'est la
  seule chose qui rend les données existantes lisibles. Une rotation n'est possible qu'avec un
  script de migration qui, en une transaction, relit chaque ligne de `StoredFile`, `SessionMessage`
  et `TotpSecret` avec l'ancienne clé et la rescelle avec la nouvelle — **les deux clés en main**.
  Ce script n'existe pas aujourd'hui.
- **Ne jamais écrire la valeur dans un fichier du dépôt**, y compris dans un document `docs/`, un
  commentaire, un test, ou un message de commit.
- **Ne jamais sceller de données depuis une machine dont la clé diffère de celle qui les relira.**
  C'est la règle posée après l'incident du 20/08/2026 (`PLAN_EXECUTION_WEB.md` point 4) : le seed
  local avait scellé un secret TOTP que l'API déployée ne pouvait pas lire.
- **Ne pas supposer que la sauvegarde Neon suffit.** Elle sauvegarde le coffre, pas la clef.

---

## 8. Correctifs de code

### 8.1 Refuser de démarrer en production sans clé valide — **non appliqué, décision du porteur**

Un contrôle dans `main.ts` : si `NODE_ENV=production` et que `SECRETBOX_KEY` est absente ou ne
décode pas en 32 octets, arrêter le démarrage avec un message explicite. Aujourd'hui cette
situation ne produit *aucun* signal, et le code retombe sur une clé publique (§2.6). Le même
garde-fou dur existe déjà pour `OTP_ECHO` (`render.yaml:48`) — le précédent est posé.

⚠️ À peser avant de l'appliquer : ce garde-fou **empêcherait l'API de démarrer** si la variable
venait à manquer sur Render. C'est le comportement souhaitable — mieux vaut ne pas démarrer que
chiffrer avec une clé publique — mais il transforme une dégradation invisible en indisponibilité
totale. À ne pas poser la veille d'une soutenance sans avoir vérifié la variable d'abord.

### 8.2 Ne plus faire passer un échec de déchiffrement pour un vieux fichier en clair — **appliqué le 25/08/2026**

- `common/crypto/secretbox.ts` : ajout de `looksSealed()`, qui reconnaît l'en-tête de `sealBuffer`
  **sans avoir besoin de la clé** (version, iv et tag sont en clair). `openBuffer` s'appuie
  désormais dessus, et la taille d'en-tête devient une constante nommée — les deux ne peuvent plus
  diverger.
- `common/storage.service.ts` : `read()` teste `looksSealed` **avant** de tenter l'ouverture. Blob
  sans en-tête → servi tel quel (rétrocompatibilité intacte). Blob avec en-tête qui n'ouvre pas →
  `logger.error` nommant `SECRETBOX_KEY`, puis `InternalServerErrorException`.
- `common/storage.service.spec.ts` : 7 tests, dont celui qui interdit le retour du comportement
  d'origine (« ne sert JAMAIS le chiffré à la place du fichier »).

Vérifié : **472 tests unitaires au vert** (465 + 7), build `tsc` propre. Les trois appelants
(`media.controller.ts` ×2, `m03.service.ts`) traduisaient déjà `null` en 404 et ne sont pas touchés :
ils voient passer une exception là où ils recevaient un faux fichier.

*(`npm run lint` n'a pas pu être exécuté : `eslint` n'est installé nulle part dans ce dépôt et ne
figure pas dans les `devDependencies` de l'API — condition préexistante, sans rapport avec ce
changement.)*

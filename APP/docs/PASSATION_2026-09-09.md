# Passation — 9 septembre 2026

> **À lire en entier, en premier, avant toute action.**
>
> Ce document existe pour une raison précise : **reprendre le travail dans une autre conversation
> sans rien perdre**. Il ne remplace pas `PASSATION_2026-09-01.md` (qui reste le document
> d'histoire du périmètre : trois acteurs, chaîne du médicament retirée) — il prend la suite à
> partir du **chantier 58**, et il dit **où on en est**, **ce qui vient ensuite**, et **ce qu'il ne
> faut jamais faire**.
>
> Le journal détaillé de chaque chantier reste `PLAN_EXECUTION_WEB.md`. Ce fichier-ci en est la
> porte d'entrée.

---

## 1. Les règles de travail — elles ne se discutent pas

Ce sont les mots du porteur. Elles s'appliquent à chaque réponse, pas seulement au début.

| Règle | Ce qu'elle veut dire concrètement |
|---|---|
| « **Explique-moi tout en français simple, avec la raison. Une chose à la fois.** » | Pas de jargon, pas de listes de dix options. Une explication, sa raison, une recommandation. |
| « **Ne bâcle rien, n'omets rien.** Constater ne suffit pas : **chaque écart doit venir avec une correction proposée, son coût réel et ta recommandation.** » | Signaler un défaut sans proposer le correctif est un travail non fait. |
| « **La vérité, c'est le site en ligne** : https://ulamu-web.onrender.com » | Un écran se vérifie en ligne, pas en local. Du code non poussé n'est pas vérifiable à l'écran. |
| « **C'est moi qui pousse sur GitHub, pas toi.** » | On code, on teste, on documente, on **commit**. On ne pousse jamais. On attend « c'est poussé ». |
| « **Tu ne saisis jamais de mot de passe.** Pour voir les écrans protégés, utilise les outils de `APP/apps/web/outils/` (lis son `LISEZ-MOI.md`). » | Aucune connexion manuelle, jamais. Conséquence à connaître : **aucun écran authentifié n'a jamais été vu**. Pour voir un écran connecté, il faut une capture d'écran du porteur. |
| « **Pas de base test neon, tout doit se faire depuis la vraie base neon de l'app. Je ne veux pas de dettes non résolues.** » | Les mesures se font sur la vraie base — **en lecture seule**. |

### Les interdits hérités, qui ont chacun coûté quelque chose

1. **Ne jamais lancer `prisma migrate dev`.** `DATABASE_URL` pointe sur la base de **production**.
   Ce geste exact a **effacé la base le 23/08/2026**. Les migrations sont écrites à la main, en SQL
   additif, et déployées par `prisma migrate deploy` au démarrage de l'API.
2. **Ne jamais démarrer l'API en local contre la production.** `SchedulerService` porte des `@Cron`
   qui **écrivent** (notifications, balayages). Démarrer en local, c'est écrire dans la vraie base.
3. **`render.yaml` fait foi** sur les variables d'environnement.
4. **Jamais de corps JSON sur un GET.**
5. **Une dette accompagnée de ma propre recommandation motivée est du travail à faire, pas une
   question à poser.** On ne remonte au porteur que ce que **lui seul** peut faire physiquement
   (console Render, console Neon, décision de produit).

---

## 2. L'état de la plateforme — chiffres vérifiés le 09/09/2026

**Tout est vert, tout est poussé.** Dernier commit : `8e354ce` (chantier 68). Branche `main`,
arbre de travail propre.

| Suite | Commande exacte | Résultat mesuré aujourd'hui |
|---|---|---|
| API | `npm run test:unit` **uniquement** | **641 ✓** (37 suites) |
| Web | `npx vitest run` | **772 ✓** (42 fichiers, + 5 todo) |
| Mobile | `npm test` | **84 ✓** (10 suites) |

⚠️ **`npm run test` sur l'API est interdit** : il inclut les sept suites d'intégration qui
**vident vingt-quatre tables**. Elles ne tournent plus jamais (décision du chantier 38). Seul
`test:unit` existe.

**Autres vérifications à relancer à chaque chantier :**

- `npx ts-node scripts/relever-routes.ts` (dans `APP/apps/api`) — monte **tout l'arbre Nest** avec
  un Prisma bouchonné. C'est **la seule chose qui attrape une erreur de câblage d'injection**.
  Compte de référence : **167 routes**.
- Lint : **oxlint** sur api et web, **eslint** sur mobile. Référence : **0**.
- `npm run build` sur les trois.
- `python outils/promesses-sans-filet.py` (dans `APP/apps/web`) — mesure les phrases d'écran
  qu'aucun test ne retient. Référence : **113 retenues sur 155**.

**Structure :** monorepo `APP/apps/{api,web,mobile}`.
⚠️ **Le dépôt git est le dossier INTÉRIEUR** : `C:\Users\ADMIN\Desktop\ULAMU\ULAMU`.

**Technique :** NestJS 11 + Prisma + Neon PostgreSQL **18.6** (version vérifiée en production) ·
React + Vite + shadcn côté web · React Native côté mobile · Render, blueprint, déploiement
automatique à chaque poussée. **Plan gratuit : le service s'endort après ~15 min** — un service
endormi n'exécute aucun `@Cron`.

**Comment savoir qu'un déploiement est passé, sans se connecter :**

- `start:prod` = `prisma migrate deploy && node dist/src/main.js` → **si l'API répond, la migration
  est passée.**
- Une route nouvelle répond **401** (elle existe) ; une route inventée répond **404**. C'est le
  témoin de déploiement.
- `/health` donne `startedAt`, à comparer à l'heure du commit **en UTC**.

---

## 3. Ce qui a été fait — chantiers 58 à 68

Tous poussés. Une ligne chacun ; le détail est dans `PLAN_EXECUTION_WEB.md`.

| # | Commit | Ce qu'il a réglé |
|---|---|---|
| 58 | `dd76c5f` | Changer son mot de passe sur mobile sans être **mis dehors** quand on se trompe. Créé `ProofRefusedException` + `preuveEnSession()` : une preuve fournie **dans une session ouverte** répond 403, plus 401. 12 points d'appel. |
| 59 | `1faff14` | Le patient peut **signaler**. La route existait, aucun bouton n'y menait. Feuille de signalement branchée sur le message et sur le soignant. |
| 60 | `0e0a1f1` | Un signalement qu'on peut enfin **instruire** — sans ouvrir les consultations. `getReportContext` ne sélectionne **jamais** `body` (RM-06-06 : chiffré au repos). |
| 61 | `7ab4af5` | **Écrire à l'administration** depuis l'application (écran `Aide`), et être prévenu quand la réponse arrive. |
| 62 | `4c90500` | ⚠️ On faisait accepter des **documents que l'application ne montrait pas**. Les textes légaux deviennent une source unique serveur (`legal.documents.ts`, `GET /v1/legal/documents`, publique) ; les `ConsentRecord` en sont **fabriqués**. |
| 63 | `3a12aef` | ⚠️ Un **compte suspendu n'avait aucun recours** alors qu'on l'invitait par écrit à en exercer un. `POST /v1/support-requests/public`, code d'usage dédié `SUPPORT_ACCESS`, **aucun jeton délivré**, réponse par email. |
| 64 | `1b4f563` | ⚠️ **5 000 XAF immobilisés depuis le 28/08** que personne ne regardait. La chaîne de l'argent, mesurée de bout en bout, **tient** ; c'est le SUIVI qui manquait. Onglet « Argent immobilisé ». |
| 65 | `06360b8` | ⚠️ Le **seul soignant de l'annuaire était injoignable** et sa fiche disait « Sur devis » — un mécanisme qui n'existe pas. Fiche corrigée, alerte de disponibilité conditionnée à une offre STANDARD active, et le mobile ne vend plus une consultation au tarif de suivi. |
| 66 | `42becd4` | ⚠️ **Trouvé par le porteur sur son propre écran** : une offre désactivée ne pouvait plus jamais être rallumée, ni modifiée. Édition en ligne + « Réactiver ». |
| 67 | `fe8f276` | ⚠️ Trois **seconds temps** inexistants : une demande de bannissement que rien ne permettait de trancher, des procédures support qu'on ne pouvait pas clore, et **le numéro de téléphone absent du web** — alors que **le retrait d'argent part sur le numéro du compte**. |
| 68 | `6e77dc8` + `8e354ce` | **Le filet de la refonte.** 155 phrases d'écran énonçant une limite, un refus ou une garantie ; **59 que rien ne retenait**. Un bloc « FILET DE REFONTE » dans **douze fichiers de test** (web) et son jumeau mobile, + l'outil de mesure `promesses-sans-filet.py`. |

### Le motif qui revient — il faut le connaître avant de continuer

**Six fois de suite**, le même défaut : *une capacité existe côté serveur et aucun écran n'offre de
chemin pour l'atteindre.* File des remboursements · contexte d'un signalement (60) · argent gelé
(64) · recours d'un suspendu (63) · fiche sans offre (65) · **modifier son offre (66, trouvé par le
porteur)**.

**La cause, nommée :** *l'API a été construite d'abord et en entier ; les écrans ont été construits
à partir des maquettes. Tout ce qui n'était pas dans une maquette n'a jamais eu de bouton.*

Un balayage des **123 capacités** du client web contre leur usage réel dans les écrans est passé de
**11 → 6** sans bouton, dont **3 faux positifs vérifiés** (`logout`, `handshake`, `searchDirectory`).
Reste réellement : `deleteNotifications`.

### Les leçons écrites au journal, qui coûtent cher à réapprendre

- **Défaire une modification est une modification.** Deux fois (58, 68) un remplacement non ancré a
  corrompu un fichier en retirant une faute injectée. **Toujours ancrer, toujours vérifier qu'il n'y
  a qu'une seule occurrence.**
- **Une lecture qui échoue n'est ni un zéro ni un « non ».** La cloche écrivait `?? 0` et annonçait
  « aucune non lue » quand la lecture échouait.
- **Une règle recopiée est une règle qui dérive.** Deux listes d'intitulés avaient déjà divergé.
- **Un interrupteur qui ne change rien est pire qu'un interrupteur absent.**
- **Le pouvoir sans trace n'existe pas** (RM-16-03).
- **Un outil de mesure qui n'a pas été éprouvé mesure sa propre erreur.** Le même outil a annoncé
  150, puis 90, puis 59 phrases non tenues selon la largeur de sa fenêtre de comparaison.
- **Un test qui exige une phrase mot pour mot finit par interdire de mieux la dire.** Le filet ancre
  **deux mots-clés séparés par du texte libre**.
- **Ma propre recommandation a été fausse deux fois** (60 : servir le texte d'un message chiffré ;
  63 : une « session restreinte » inutile). Les deux ont été corrigées **en place et signalées**,
  pas réécrites en silence.

---

## 4. Le plan en cours — la refonte visuelle

C'est **l'étape 4**. Les étapes 1 à 3 sont faites : (1) les capacités sans bouton, (2) les seconds
temps, (3) le filet anti-régression.

### La demande du porteur, dans ses mots

> « améliorer 3500000 fois plus beau, meilleure expérience utilisateur, penser comme un pro du
> design des géants de la tech et des pros de UX et UI · je veux améliorer aussi le design de toutes
> les pages de la plate-forme médecin et admin · **attention il ne faut pas qu'on régresse, qu'on
> retire les choses essentielles** · nous avons deux types d'interfaces : celui de l'admin et celui
> que les médecins utilisent · **chaque utilisateur a son espace isolé, ces changements
> n'affecteraient en aucun cas le fonctionnement des comptes des autres** »

Et la règle de méthode qu'il a posée :

> « avant de faire quoi que ce soit il faut **proposer, recommander la meilleure solution robuste et
> créative**, avec une petite explication directe. **Je dois valider avant que tu commences.** »

### Ce qui a été mesuré avant de proposer

| Fait | Chiffre |
|---|---|
| Écrans | **25** — 7 admin, 10 médecin, 5 authentification, 5 sections de réglages |
| Jetons de design | **231** dans `src/styles/globals.css` |
| Composants réellement partagés | **5** (`Carte`, `Avis`, `Pilule`, `Segments`, `Squelette`) + la coque (`AppShell` / `Sidebar` / `TopHeader`) |
| Tailles de police | **14 tailles distinctes, écrites en dur 635 fois** — et **4 d'entre elles (10/11/12/13 px) font 94 %** |
| Espacements arbitraires | **5 seulement** — la discipline est déjà là |
| Mode sombre | existe déjà (`.dark`) |
| Polices | déjà choisies : Plus Jakarta Sans · Inter · JetBrains Mono |

### Le diagnostic — une phrase

> **Ce n'est pas le désordre, c'est la platitude.**

Tout vit entre 10 et 13 px, sur une carte bordée. Rien n'est grand, rien n'est discret. **Ce qui
manque n'est pas de l'ordre, c'est de la hiérarchie.**

### La réponse à la question de l'isolation

- **Les écrans sont déjà isolés** : fichiers séparés, routes séparées, navigation filtrée par
  capacité. **Refondre un écran médecin ne peut pas toucher un écran admin.**
- **Trois choses seulement traversent** : la coque, les 231 jetons, les 5 composants. D'où la règle
  du plan : **on touche cette couche UNE FOIS, au début, et plus jamais pendant les passes.**
- **L'isolation des données entre comptes est tenue côté serveur** par les gardes. **Aucun changement
  de design ne peut l'atteindre.** C'est une propriété de l'API, pas de l'écran.

### La recommandation : « un système, deux densités »

Mêmes jetons, mêmes composants, **plus une dimension de densité** :

- **`confort`** pour le médecin — peu de décisions, calme, l'argent et l'heure lisibles d'un coup
  d'œil ;
- **`compact`** pour l'administration — des files, des tableaux, on balaye.

*Pourquoi pas deux designs séparés :* deux systèmes divergent en trois mois, et **une règle recopiée
est une règle qui dérive** (déjà vu ici). *Pourquoi pas un seul rendu identique :* un tableau de bord
médecin à la densité d'une file de modération est illisible, et l'inverse est épuisant.

### Les trois passes

| Passe | Contenu | Coût | Validation |
|---|---|---|---|
| **0 — la fondation** | Échelle typographique (les 635 tailles en dur deviennent une échelle nommée), hiérarchie, densité. **La seule couche qui traverse.** | ~une demi-journée | **Deux captures avant / après**, validées par le porteur |
| **1 — le médecin** | Les 10 écrans, **un par un** | 1 écran = 1 chantier | Chaque écran validé par le porteur |
| **2 — l'administration** | Les 7 écrans, **un par un** | 1 écran = 1 chantier | Chaque écran validé par le porteur |

**À chaque écran, sans exception :** relancer le **filet** (`npx vitest run`) et
`outils/promesses-sans-filet.py` **avant et après**. C'est ce qui rend la promesse « on ne régresse
pas » vérifiable au lieu d'être une intention.

### La direction esthétique proposée

1. **La hiérarchie par la taille et le blanc, pas par des boîtes.** Aujourd'hui tout est encadré ;
   une carte qui entoure tout n'entoure plus rien.
2. **Les chiffres sont les héros.** Le bloc existant « brut − commission = net » est le modèle : le
   montant est grand, l'étiquette est petite et calme.
3. **Un accent, pour une action suivante.** Si tout est mis en avant, plus rien ne l'est.
4. **Les états vides et les erreurs restent de première classe.** C'est là que la plateforme perd ou
   garde la confiance — et c'est exactement ce que le filet protège.

---

## 5. La prochaine étape — précise

**Rien ne se code tant que le porteur n'a pas validé.** Dans l'ordre :

1. **Obtenir sa validation sur trois points :**
   - (a) « un système, deux densités » — ou bien un rendu identique partout ?
   - (b) commencer par la **passe 0** (la fondation partagée) — ou attaquer directement un écran ?
   - (c) l'interface **médecin en premier** (c'est ce qu'il a dit vouloir valider en premier) ?
2. **Recevoir deux captures d'écran** : le **tableau de bord médecin** et **un écran admin dense**
   (Comptes ou Signalements). ⚠️ **Nécessaire** : je ne saisis jamais de mot de passe, donc je n'ai
   **jamais vu un seul écran authentifié**. Sans capture, la refonte se ferait à l'aveugle.
3. **Exécuter la passe 0, seule**, et la présenter en avant / après.

---

## 6. Ce qui est sur le bureau du porteur — lui seul peut le faire

**Une décision de produit, en attente :**

> **Que devient l'argent gelé ?** 5 000 XAF, payés le 28/08, consultation tenue, aucun compte-rendu.
> Trois issues possibles : rembourser le patient · payer le professionnel quand même · ULAMU garde.
> **Aucune règle n'existe dans le cahier des charges.** L'écran le dit honnêtement, mais un écran ne
> tranche pas.

**Des gestes qui touchent Render, Neon ou la base en ligne :**

| Dette | Geste |
|---|---|
| **1** | Changer le **mot de passe du super-administrateur** en ligne et activer son TOTP |
| **20** | Découle de la 1 |
| **3** | **Suspendre / bannir les comptes de démonstration** depuis l'écran Comptes |
| **5** | Mettre **`SECRETBOX_KEY` à l'abri hors ligne** — sans elle, pièces, messages et secrets 2FA sont **définitivement illisibles** (procédure : `docs/procedure_sauvegarde_SECRETBOX_KEY.md`) |
| **7** | **Héberger les données hors du Congo** — ou corriger la phrase qui l'affirme |
| **16** | **Le modèle économique** — le dévoilement à 500 XAF a disparu avec D-052 ; il ne reste que la commission de consultation |

---

## 7. Les pièges d'outillage — ils font perdre une heure chacun

**Windows / fichiers**

- La plupart des fichiers sont en **CRLF**. Les lire avec `newline=''`, normaliser, réécrire.
- Les **heredocs bash avec du gros contenu échouent** (les échappements s'effondrent et cassent les
  chaînes). Écrire le bloc dans un fichier du bloc-notes, puis l'insérer avec Python.
- Dans les textes français, préférer l'apostrophe typographique **’** à l'apostrophe droite : elle ne
  casse rien.
- **Toujours des remplacements ancrés, avec vérification qu'il n'y a qu'une seule occurrence.**

**Tests d'écran (vitest + testing-library)**

- `getByLabelText` ambigu : deux champs « Prix patient » ou « Mot de passe » coexistent → viser par
  identifiant ou par sélecteur.
- `Intl.NumberFormat('fr-FR')` sépare avec **U+202F** : une égalité de chaîne échoue. Utiliser
  `/18\s?000/`.
- Une phrase n'existe que **dans son état** : ouvrir l'onglet, ouvrir le formulaire, monter 100
  sessions, conduire jusqu'à l'erreur.
- **Un nouvel appel d'API non bouchonné** fait basculer silencieusement des tests existants dans la
  branche d'erreur — ils passent encore, mais ils ne prouvent plus rien.
- `userEvent` rejoue des séquences de pointeur et dépasse le délai de 2,5 s sous charge parallèle :
  utiliser `fireEvent` pour les étapes de mise en place.

**Discipline de vérification, dans cet ordre**

1. **Mesurer la production en lecture seule avant de corriger** (les sondes sont dans
   `APP/apps/api/scripts/` : `parcours-argent.ts`, `vie-du-soignant.ts`, `etat-signalements.ts`,
   `etat-retraits.ts`, `fichiers-orphelins.ts`, `verifier-chaine-audit.ts`, `recalcul-indicateurs.ts`).
2. **Prouver que chaque test mord** en injectant la faute exacte qu'il doit attraper.
3. **Vérifier le câblage** en montant l'arbre Nest (`relever-routes.ts`).

---

## 8. La phrase de relance — à coller dans la nouvelle conversation

> Reprends ULAMU là où on s'est arrêté. Lis d'abord `APP/docs/PASSATION_2026-09-09.md` en entier,
> puis `APP/docs/PLAN_EXECUTION_WEB.md` (chantiers 58 à 68). Le dépôt git est le dossier intérieur
> `C:\Users\ADMIN\Desktop\ULAMU\ULAMU`.
>
> On est à l'**étape 4 : la refonte visuelle** des interfaces médecin et administration. Le filet
> anti-régression est en place et validé. Il me reste à valider « **un système, deux densités** » et
> à t'envoyer deux captures d'écran (tableau de bord médecin + un écran admin dense).
>
> **Ne code rien avant ma validation.** Tu me proposes, tu recommandes, tu expliques simplement en
> français avec la raison — une chose à la fois. Tu ne saisis jamais de mot de passe. Tu ne pousses
> jamais sur GitHub, c'est moi qui pousse.

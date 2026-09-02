# Passation — 1er septembre 2026

**À lire en entier avant toute action.** Ce document remplace `PASSATION_2026-08-25.md`, qui
explique le *pourquoi* de la reconstruction et devient un document d'histoire.

> **Révision du 02/09/2026.** Ce document reste le point de reprise, mais **son §3 portait deux
> erreurs de fait** — corrigées ci-dessous, et signalées plutôt que réécrites en silence :
> l'instruction « supprimer ou bannir » les comptes de démonstration était **inexécutable**, et
> l'ordre des gestes n'était pas dit alors qu'il commande tout.
>
> Ce qui a changé depuis, et qui n'est **pas encore poussé** : le **chantier 24** (§10 du plan) —
> la langue de la page, ce que les écrans d'administration disent d'un refus RM-01-06, et la phrase
> de B3 sur la double authentification. **web 497 ✓**, types et lint propres, rien côté serveur.
> Le dernier commit du dépôt est `421a1da` (et non `59dcb81` : le tableau ci-dessous ne comptait pas
> le commit de cette passation).

---

## 1. Où en est le projet, en une phrase

**Les 19 chantiers du plan sont faits, plus quatre chantiers ajoutés en cours de route. Tout est
poussé sur GitHub et déployé en production.** Ce qui reste ne se corrige plus dans le code : ce sont
des gestes dans les consoles Render et Neon, et trois arbitrages jamais tranchés.

| | |
|---|---|
| Dépôt | `github.com/will180901/ULAMU`, branche `main`, dernier commit `59dcb81` |
| Site | `https://ulamu-web.onrender.com` · API `https://ulamu-api.onrender.com` |
| API | NestJS **11** + Express **5**, `npm audit` à **0** |
| Tests | web **485** · API **554** · mobile **7** — tous au vert |
| Document courant | `APP/docs/PLAN_EXECUTION_WEB.md`, §9 (dettes) et §10 (journal) |

---

## 2. Ce qui a été fait le 01/09/2026 — dix commits

| Commit | Ce qu'il corrige |
|---|---|
| `6011612` | **Chantier 18** — relecture visuelle des 16 écrans. Le tiroir mobile ne quittait jamais l'écran ; aucune limite d'erreur React n'existait |
| `5c24c3c` | **Chantier 19** — les dettes du §9. Le serveur confirmait une consultation **à la place du médecin** |
| `5ec8615` | `support@ulamu.cg` — une adresse morte remplacée par un formulaire dans l'application |
| `833b32d` | **Chantier 20** — NestJS 10 → 11. Les 14 alertes de production tombent |
| `6c7f267` | La 2FA d'administration rétablie, **y compris dans `render.yaml`** |
| `38df334` | **Chantier 21** — le responsive. Le registre cachait 549 px hors écran sur un téléphone |
| `6e44716` | **Chantier 21 bis** — les trous du responsive. Le composeur de messages passait sous la barre du navigateur |
| `ce82b95` | **Chantier 22** — les squelettes de chargement |
| `4b83754` | Une seule forme d'onglet, sauf le rail vertical |
| `59dcb81` | **Chantier 23** — huit fichiers morts supprimés |

Le détail de chacun est au **§10 du plan**, avec ce qu'il a appris. Ce document ne le répète pas.

---

## 3. Ce qui reste à faire — et à qui

### 3.1 Quatre gestes qui n'appartiennent qu'au porteur

Aucun code ne peut les faire à sa place. Ils touchent les consoles.

> **⚠️ Révisé le 02/09/2026.** L'ordre n'était pas indiqué, et il commande tout : **le TOTP passe
> en premier**, sinon les gestes suivants sont refusés (§3.2). Et le geste n°2 était **impossible
> tel qu'écrit** — vérifié dans le code, pas relu.

1. **Activer son TOTP** sur `/configuration-totp`, **avant tout le reste**. Puis **changer le mot
   de passe du super-administrateur en ligne**.
2. **SUSPENDRE les comptes de démonstration** (`demo1234`) depuis l'écran E7.

   *Corrigé le 02/09.* « Supprimer ou bannir » ne marche ni dans un sens ni dans l'autre :
   **aucune route ne supprime un compte** — la seule clôture, `POST /v1/accounts/me/close`, exige
   le mot de passe **et** l'OTP *de son titulaire* — et **bannir demande un second administrateur
   distinct** (`canSecondApproveBan` refuse l'auto-approbation, EF-16-07). Un super-administrateur
   seul peut demander un bannissement que personne ne pourra jamais approuver.

   **La suspension est le seul chemin, et elle suffit** : `m05.directory.service.ts` filtre sur
   `account: { status: "ACTIVE" }` (RM-05-05), donc un compte suspendu **quitte l'annuaire public
   aussitôt**. Ne pas ajouter de route de suppression : le journal d'audit est en insertion seule.

   🔴 **Et c'est urgent, plus qu'écrit ici le 01/09.** Vérifié en ligne le 02/09 : `GET /v1/directory`
   ne renvoie **qu'un seul soignant**, `dr.armel` (« Armel Konaté »), Badge Vérifié, note **4,8/5
   sur 215 avis** — des chiffres semés, jamais gagnés. C'est donc **un compte de démonstration qui
   est la vitrine publique d'ULAMU**. Son mot de passe est en clair dans `prisma/seed.ts` (l. 81),
   et **le dépôt GitHub est public** : `raw.githubusercontent.com` sert le fichier à qui le demande.
3. **Mettre `SECRETBOX_KEY` à l'abri hors ligne** — perdue, pièces justificatives, messages et
   secrets 2FA deviennent définitivement illisibles. Procédure :
   `APP/docs/procedure_sauvegarde_SECRETBOX_KEY.md`.
4. **Créer une branche Neon de test** et coller son URL dans `TEST_DATABASE_URL`. Tout est prêt
   autour : le garde-fou refuse de démarrer sans elle, et refuse aussi qu'on y recopie l'URL de
   production. Deux clics, gratuits. C'est le seul garde-fou automatique du backend, et il est à
   l'arrêt.

### 3.2 ⚠️ Le geste bloquant, à faire en premier

**RM-01-06 est active depuis le 01/09 : un compte d'administration sans TOTP activé reçoit 403 sur
toutes les routes admin.** Les écrans afficheront « n'a pas pu être lu » partout, sans dire pourquoi.

La sortie existe et n'est pas gardée : **`/configuration-totp`**. Scanner le QR avec Google
Authenticator, confirmer, et tout se rouvre.

*✅ **Faite le 02/09 (chantier 24).** Les sept écrans d'administration portent désormais un bandeau
qui nomme la cause et la sortie, et les six branches d'échec remplacent « Réessayer » — un geste qui
ne pouvait pas aboutir — par le lien d'activation. Coût réel : une demi-journée, pas une demi-heure.
⚠️ Le bandeau énonce une condition **nécessaire**, jamais suffisante : un compte d'administration
sans sous-rôle resterait bloqué après activation, et la garde le refuse avant même de regarder le
TOTP.*

### 3.3 Deux décisions ouvertes

- **`components/ulamu/Field.tsx`** — mort dans l'application, mais `src/test/field.test.tsx`
  l'entretient. Du code testé que personne n'utilise. Supprimer les deux, ou l'employer.
  *(Chemin corrigé le 02/09 : le test est dans `src/test/`, pas `test/`.)*
- **Les dérives documentaires du §9 du plan.** Il en reste **deux** : le cahier dit OTP par **SMS**,
  le code fait **email** ; le cahier dit connexion par **téléphone**, le code accepte nom
  d'utilisateur ou email.

  ✅ **La troisième est soldée le 02/09 (chantier 24)**, et ce n'en était pas tout à fait une : le
  cahier et le serveur disaient déjà la même chose — `disableTotp` refuse la désactivation aux
  **seuls** administrateurs. C'est l'**écran** qui divergeait, en montrant à tout le monde une
  phrase vraie pour les seuls administrateurs. 📌 **Une dette naît en échange** (§9, n°11) : la
  désactivation, que le serveur accepte pour un soignant, n'a aucun chemin dans le web. Non urgent,
  et à ne pas ouvrir sans raison — voir la recommandation au §9.

### 3.4 Ce qui a été tranché et ne doit plus être reproposé

- **Les 46 composants shadcn non utilisés restent.** Décision du porteur le 01/09 : on les garde
  intacts. Ne pas reproposer de les supprimer.
- **La forme des onglets** est celle de `Segments` partout, sauf le rail vertical de « Mes
  paramètres » au-dessus de 1024 px.
- **« Clair / Sombre / Automatique » et « Confort / Compact »** gardent la même forme que les
  onglets, bien que ce soient des réglages. Demandé explicitement.

---

## 4. Les règles de travail — elles n'ont pas changé

- **Une chose à la fois.** Expliquer en français simple, avec la raison.
- **Ne jamais bâcler, ne rien omettre.** *Constater ne suffit pas* : tout écart appelle une
  correction proposée, son coût réel, et une recommandation argumentée.
- **La vérité, c'est le site en ligne.** Pas la machine locale.
- **Le porteur pousse lui-même** sur GitHub.
- **Les écrans d'authentification** gardent leur carrousel à 42 % / 58 %, et le logo ULAMU reste.
- **Arbitrage** : la maquette décide de la **forme**, le cahier des charges décide des **faits**.
- **Le principe qui commande la reconstruction :**
  > On n'écrit plus un chiffre dans une page. On le lit du serveur — ou on ne l'affiche pas.
  > Et l'écran ne calcule pas la règle : il rapporte ce que le serveur a décidé.
- **Son corollaire, trouvé le 01/09 :** une lecture qui échoue n'est **ni un zéro ni un « non »**.
  `data ?? []` affichait « 0 dossier ouvert » sur une panne, et C2 annonçait à un médecin en règle
  qu'il était invisible des patients.

---

## 5. Les pièges — chacun a coûté du temps

### 5.1 Interdits absolus

- **Ne jamais saisir de mot de passe ni de code de vérification.** Pour voir les écrans protégés,
  utiliser les outils de `apps/web/outils/` (voir son `LISEZ-MOI.md`).
- **Ne jamais lancer `prisma migrate dev`.** `DATABASE_URL` désigne la base Neon de **production** :
  c'est le chemin exact qui l'a effacée le 23/08/2026. Les migrations s'écrivent **à la main** dans
  `prisma/migrations/`, et Render joue `migrate deploy` au déploiement.
- **Ne jamais démarrer l'API localement contre la production.** `SchedulerService` porte un
  `@Cron(EVERY_MINUTE)` qui écrit. Pour inspecter l'arbre Nest, utiliser
  `apps/api/scripts/relever-routes.ts`, qui bouchonne Prisma.

### 5.2 Le service Render est « Blueprint managed »

**`render.yaml` fait autorité sur les variables d'environnement.** Retirer une variable du tableau
de bord **ne suffit pas** : elle revient au déploiement suivant. C'est ce qui a failli arriver à
`ADMIN_REQUIRE_TOTP`. **Toute variable se change dans `render.yaml`.**

### 5.3 Ce que les tests ne voient pas

- **Les tests unitaires ne démarrent jamais Nest** — sauf `apps/api/src/app.boot.spec.ts`, écrit
  pour ça. Un module mal câblé ou une route réinterprétée ne casse aucun autre test.
- **jsdom n'applique aucune feuille de style.** Une correction en CSS ne casse aucun test — et
  n'est vérifiée par aucun. D'où les tests qui **lisent la source** (`responsive.test.ts`,
  `squelette.test.ts`, `charte.test.tsx`).
- **Le réseau est coupé en test** (`src/test/setup.ts`). Une méthode d'`api` non doublée fait
  échouer le test avec un message qui nomme l'URL manquante.

### 5.4 Outillage

- **Cloudflare rejette les `GET` porteurs d'un corps JSON**, par intermittence, avec une page HTML
  « 400 Bad Request » qui ne vient pas de l'application.
- **Les captures du volet de développement ne sont fiables qu'en dessous de ~1024 px.** Au-delà,
  l'image est réduite au point d'être illisible. **Mesurer par script.**
- **Un push HTTPS échoue parfois** (`curl 52` / `curl 55`). Ce n'est pas la taille : 18 Ko ont
  échoué deux fois. **Réessayer suffit.** Réglages déjà posés en global :
  `http.version HTTP/1.1`, `http.postBuffer 524288000`.

---

## 6. Les composants transverses créés le 01/09

À connaître avant d'écrire un écran.

| Composant | Ce qu'il fait |
|---|---|
| `components/layout/GardeFou.tsx` | Limite d'erreur React, à deux niveaux. Sans elle, une erreur de rendu efface **toute** l'application |
| `components/ulamu/Squelette.tsx` | Six formes d'attente. **Chacune annonce sa phrase en `sr-only`** — un squelette est muet sans ça |
| `components/ulamu/Liste.tsx` | La liste déroulante maison. Les listes natives ignorent le thème |
| `.ul-tableau-cartes` (`globals.css`) | Un tableau devient des **cartes sous 1024 px**. ⚠️ Chaque `<td>` doit porter `data-libelle` |
| `hooks/use-mobile.ts` → `useEtroit(seuil)` | Le seuil commun est **1024 px** |
| `apps/api/src/common/crypto/garde-secretbox.ts` | L'API **refuse de démarrer** sans clé valide en production |

**Règle de l'attente :** des **données** qui vont remplir un espace → un squelette. Une **action**
qu'on vient de déclencher → un rond dans le bouton. Ne pas confondre les deux.

---

## 7. Ce qui n'a pas pu être vérifié

À dire honnêtement plutôt qu'à laisser croire :

- **Aucun test sur un vrai téléphone.** L'émulation ne reproduit ni la barre d'adresse qui se
  rétracte, ni le clavier virtuel, ni Safari mobile. Le défaut `100vh` a été trouvé **en lisant le
  code**, pas en le regardant.
- **Les étapes 4 et 5 de l'inscription** (mot de passe, code) n'ont jamais été mesurées : les
  dérouler demanderait de saisir un mot de passe.
- **Aucun comportement serveur** n'a été éprouvé à l'écran : les revues parlaient à une fausse API.
- **Les tests d'intégration de l'API sont à l'arrêt** faute de branche Neon (§3.1).

---

## 8. Documents à lire, dans cet ordre

1. **Ce fichier.**
2. `APP/docs/PLAN_EXECUTION_WEB.md` — **§9** les dettes, **§10** le journal des 23 chantiers.
3. `APP/apps/web/outils/LISEZ-MOI.md` — comment regarder les écrans sans se connecter.
4. `APP/docs/ALIGNEMENT_MAQUETTE_CAHIER.md` — les 43 écarts maquette ↔ cahier, chacun avec sa
   décision.
5. `APP/docs/procedure_sauvegarde_SECRETBOX_KEY.md`.

**Périmés, à ignorer :** `plan_refonte_web_shadcn.md`, `plan_frontend_web_2026-08-05.md`. Ils
décrivent la construction refusée le 25/08. ⚠️ **Ce n'est pas shadcn qui a été refusé** — on le
garde.

**Les maquettes `.dc.html` sont des prototypes QUI TOURNENT.** Les servir en HTTP, sinon
`support.js` ne se charge pas :

```
python -m http.server 8123 --directory APP/docs/maquettes
```

Chacune porte trois réglages invisibles à la lecture : **VUE** (Bureau/Tablette/Mobile), **THÈME**
(Clair/Sombre), **ÉTAT** (Plein/Chargement/Vide/Erreur). Les afficher avant de coder est la règle
n°1 du plan — ne pas l'avoir fait est la cause réelle du refus du 25/08.

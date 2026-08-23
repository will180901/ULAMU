# PLAN D'EXÉCUTION — refonte web ULAMU

> **Rédigé le 20/08/2026.** Document opérationnel : *comment* on construit, dans quel ordre, et
> comment on vérifie. Le *quoi* (contenu de chaque écran, composants) reste dans
> [`plan_refonte_web_shadcn.md`](plan_refonte_web_shadcn.md). Les deux se lisent ensemble.
>
> **Source visuelle** : `docs/maquettes/` — 24 fichiers `.dc.html`.
>
> **Mis à jour le 20/08/2026.** La règle disait : « la maquette fait foi ; quand le code et la
> maquette divergent, c'est le code qui a tort. » Elle était fausse en six endroits au bout de trois
> écrans — non par négligence, mais parce que les maquettes ont été dessinées avant qu'on découvre
> certaines contraintes. La règle honnête est celle-ci :
>
> **La maquette est la référence visuelle. On ne s'en écarte que pour corriger un défaut réel —
> jamais par confort, jamais par goût. Tout écart est tracé DEUX fois : en commentaire à l'endroit
> exact du code, et dans la liste du §9.**
>
> Un défaut réel, c'est : un contenu qui ne tient pas dans la place disponible, une fonction promise
> par la maquette elle-même mais impossible à atteindre, ou un chemin qui enfermerait un utilisateur
> dehors. Ce n'est pas : « je trouve ça plus joli autrement ».

---

## 0. La règle du jeu

**Une chose à la fois.** J'annonce l'étape en français simple avec la raison du choix → vous
validez → je code → je vous dis quoi tester → vous poussez → Render déploie → vous testez **dans le
navigateur, sur l'application en ligne** → vous confirmez → étape suivante.

**Jamais de test en local.** Le local sert uniquement à ce que le code compile avant d'être poussé.
La vérité, c'est `https://ulamu-web.onrender.com`.

**Si je bute ou si j'ai un doute, je vous le dis et je propose des solutions.** Je ne devine pas, je
ne comble pas un trou par une invention, et je ne déclare jamais « c'est fait » sans preuve.

### Le backend — règle corrigée le 20/08/2026

La règle initiale disait « **sans toucher au backend** ». Elle est tombée trois fois en une journée,
et à chaque fois pour une bonne raison. La formulation honnête :

**On ne touche pas à l'API pour du confort de façade. On y touche quand un défaut atteindrait le
client — et alors on le corrige, on écrit un test de non-régression, et on le note ici.**

Les trois fois où c'est arrivé, chacune validée par le porteur :

| Ce qui a été touché | Pourquoi |
|---|---|
| `checkTotpOrBackup` — le 500 sur code de secours | Un compte devenait définitivement inaccessible. « on ne livre pas ça » |
| `AdminGuard` — drapeau `ADMIN_REQUIRE_TOTP` | Désactiver le TOTP aurait sinon rendu toute l'administration inutilisable (403 partout) |
| `seed.ts` — `SEED_ADMIN_EMAIL`, retrait du TOTP | Le secret scellé en local était illisible par l'API déployée ; et sans adresse, le compte n'avait aucune voie de récupération |
| **M01 — le palier B3 du 23/08** : changer son mot de passe, ajouter/changer son adresse email, régénérer les codes de secours, ré-associer l'appareil 2FA, photo pour les soignants et les officines, code de clôture par email, prérequis de clôture vérifiés | Six blocs de l'écran « Mes paramètres » n'avaient **aucun endpoint**. Sans eux, B3 aurait affiché six boutons morts. Deux étaient bloquants pour le client : un compte sans adresse ne peut pas être récupéré, et la clôture — un droit, pas une option — envoyait son code par une passerelle SMS factice. Une migration additive (3 colonnes, 2 valeurs d'énumération), 6 tests d'intégration, validé par le porteur |

### Le plan se tient à jour EN MÊME TEMPS que le code

Constat du 20/08 : après trois écrans, le plan décrivait des règles que le code enfreignait partout,
sans dire si c'était une faute ou une décision. **Un plan qui ment est pire que pas de plan.**

Désormais, toute étape qui produit un écart ou une décision hors plan le note ici dans le même
commit. Le journal du §10 se remplit au fur et à mesure, pas à la fin.

---

## 1. La chaîne de déploiement — établie par lecture des fichiers, pas de mémoire

```
  votre machine          GitHub                    Render                        Neon
  ─────────────          ──────                    ──────                        ────
  git commit
  git push        →   will180901/ULAMU
                      branche main          →   déclenche LES DEUX services
                                                 (autoDeploy: true sur chacun)

                                            ┌── ulamu-api  (service web Node)
                                            │   build : npm install --include=dev
                                            │           && npx prisma generate
                                            │           && npm run build
                                            │   start : prisma migrate deploy   →  applique les
                                            │           && node dist/src/main.js    migrations
                                            │                                       en attente
                                            │
                                            └── ulamu-web (site statique)
                                                build : npm install && npm run build
                                                publie : dist/
```

### Ce que ça implique concrètement

| Fait | Conséquence pour notre façon de travailler |
|---|---|
| `autoDeploy: true` sur les **deux** services | Un push qui ne touche que le web **redéploie quand même l'API**. Sans danger, mais l'API redémarre : comptez un délai avant la première réponse. |
| `start:prod` = `prisma migrate deploy && node …` | **Neon n'est mis à jour que par un déploiement de l'API**, et uniquement s'il existe une migration non encore appliquée (9 dossiers aujourd'hui dans `apps/api/prisma/migrations/`). Aucune migration = aucun changement de base. |
| `plan: free` sur `ulamu-api` | **L'API s'endort après ~15 min d'inactivité.** La première requête la réveille et peut prendre 30 à 60 secondes. ⚠️ **Pendant vos tests, une connexion qui « rame » n'est pas forcément un bogue** — c'est souvent le réveil. |
| `region: frankfurt` | Même région que Neon : latence minimale entre l'API et la base. Depuis Brazzaville, comptez la distance en plus. |
| `CORS_ORIGINS` = `ulamu-web.onrender.com` + `localhost:5173` | Le navigateur n'acceptera l'API que depuis ces deux origines. Toute autre adresse sera bloquée. |
| SPA rewrite `/* → /index.html` | Taper `…/inscription` directement dans la barre d'adresse fonctionne. Sans cette règle, ce serait une 404. |
| `rootDir: APP/apps/web` + `npm install` | Le dossier web s'installe **seul**, avec son propre `package-lock.json`. C'est pour ça qu'on est resté sur npm et pas pnpm. |

### Ce qui **ne** met **pas** la base à jour

Modifier `schema.prisma` **ne suffit pas**. Il faut une migration générée (`prisma migrate dev` en
local) et commitée. Sans dossier dans `prisma/migrations/`, `migrate deploy` ne fait rien et le code
attendra une colonne qui n'existe pas. **C'est le piège numéro un de cette architecture.**

---

## 2. Ce qui a été fait

*Dates réelles, relevées dans l'historique git : la refonte a eu lieu le **09/08**, les maquettes
ont été produites le **14/08**, ce plan est écrit le **20/08**.*

### Avant la refonte (rappel de contexte)
1. Correction de la boucle de retours de l'app mobile (cause réelle : `AuthPage` avalait les retours + `Dialog` n'avait qu'un seul emplacement de réponse).
2. Base de données remise à zéro, comptes de test recréés.
3. Neuf trous backend bouchés, découverts en construisant les écrans — dont **un grave** : le serveur fabriquait de faux consentements (`acceptTerms` absent de 3 DTO d'inscription).
4. Documents de passation et rapports mis à jour.

### La refonte web proprement dite
5. **Constat** : le design livré ne convenait pas. Décision de repartir de zéro sur shadcn.
6. **Plan de refonte rédigé** — `plan_refonte_web_shadcn.md` : intention de design, 24 écrans, règles intangibles.
7. **Patrimoine sauvegardé** dans `docs/patrimoine-web/` : carrousel, logo, pages d'authentification, blocs CSS extraits au caractère près. 9 fichiers.
8. **Table rase cohérente** : 51 fichiers retirés — 19 écrans, la coquille applicative, 5 composants maison, 19 tests, le routeur réduit — **dans le même mouvement**, pour que l'application reste compilable à chaque instant.
9. **`globals.css` allégé** de 1534 à 893 lignes (78 classes devenues mortes).
10. **shadcn installé** : base radix, préréglage nova, **61 composants**, `components.json`, `lib/utils.ts`, `hooks/use-mobile.ts`.
11. **Défaut intercepté** : le préréglage apportait la police Geist et redéfinissait `--font-heading` *après* nos jetons — toute l'interface serait passée en Geist en silence. CG-02 impose un référentiel fermé de trois polices. Corrigé, vérifié : 0 occurrence de Geist dans le CSS livré.
12. **Erreur commise et réparée** : les accents de `globals.css` avaient été doublement encodés (lecture ANSI, écriture UTF-8). Octets d'origine restaurés.
13. **Régression de sécurité rattrapée** : la déconnexion pour inactivité vivait dans la coquille supprimée ; remontée sur l'écran d'attente.
14. **Ménage final** : `lib/initials.ts` et 4 restes du port CMS-SARIS retirés. Audit complet : 0 fichier orphelin, 0 classe morte, 0 caractère mal encodé, 0 marqueur `TODO`.
15. **Maquettes reçues** : 24 fichiers dans `docs/maquettes/`, bâtis sur nos propres jetons.

### Le chantier sécurité et comptes — non prévu, apparu le 20/08/2026

Il n'était nulle part dans ce plan, et il a occupé une bonne part de la journée. Il n'est pas une
digression : chaque point empêchait purement et simplement de se connecter à l'application.

16. **Un 500 à la connexion.** L'écran du second facteur répondait « Internal server error » au lieu de refuser le code. Cause : `checkTotpOrBackup` déchiffrait le secret TOTP **avant** de chercher le code de secours ; `openSecret` levait, l'exception n'était pas rattrapée, et le code de secours n'était **jamais atteint**. Corrigé, avec un test de non-régression.
17. **La cause de fond du 500.** Le seed scellait le secret TOTP **en local**, avec la clé de repli du code source ; l'API sur Render a la sienne et ne pouvait donc pas le relire. **Règle qui en découle : un secret ne doit jamais être scellé par un autre environnement que celui qui le relira.** Le seed n'active plus le TOTP — le compte le fait lui-même depuis l'application.
18. **TOTP rendu volontaire** (décision du porteur). Retiré de la garde du web ; côté API, l'exigence RM-01-06 passe derrière `ADMIN_REQUIRE_TOTP`, **dont la valeur par défaut reste `true`** : un oubli laisse le système fermé, jamais ouvert.
19. **Conséquence immédiate, rattrapée le jour même.** Le TOTP devenu optionnel, A3 ne récupérait plus rien pour un compte sans authentificateur — l'ancien code l'avait écrit noir sur blanc avant que ça n'arrive. La voie email existait côté serveur sans être appelée : trois lignes dans `lib/api.ts`.
20. **Base remise à zéro**, compte unique `admin` / `Admin123!` / adresse réelle, sans TOTP, `SEED_DEMO=false`.
21. **`apps/api/.env.example` créé** — il n'existait pas alors que l'API lit 21 variables.

### État vérifié le 20/08/2026 au soir
- Web : compilation **0** · **20 tests + 5 en attente** · lint **0 erreur**
- API : typage **0** · **465 tests unitaires** · le test d'intégration ajouté n'a **pas** pu être exécuté (il exige une base)
- Aucun défilement sur A1, A2 (6 étapes) et A3 (3 étapes), mesuré à 1280×620 — l'étape la plus chargée d'A2 testée **avec son message d'erreur affiché**
- Connexion en ligne confirmée avec `admin` / `Admin123!`

---

## 3. Ce qui reste à faire

**24 écrans à construire.** Aucun n'est fait : les 4 écrans d'authentification existent mais dans
leur ancien habillage, à reprendre d'après les maquettes.

| Groupe | Écrans | État |
|---|---|---|
| **A** Authentification | A1 Connexion · A2 Inscription · A3 Mot de passe oublié · A4 Configuration 2FA | Existent, à ré-habiller |
| **B** Coquille et commun | B1 Coquille · B2 Tableau de bord · B3 Mes paramètres | À construire |
| **C** Professionnel | C1 Ma vérification · C2 Ma vitrine · C3 Demandes · C4 Consultations · C5 Consultation · C6 Mes gains | À construire |
| **D** Pharmacie | D1 Ma pharmacie · D2 Stock · D3 Délivrance · D4 Réservations | À construire |
| **E** Administration | E1 File de vérification · E2 Supervision financière · E3 Paramètres métier · E4 Administrateurs · E5 Pilotage · E6 Signalements · E7 Comptes | À construire |

Plus : la passe finale (états, thème sombre, responsive, accessibilité) et la préparation à la
livraison client.

---

## 4. L'ordre de construction

Chaque étape = **un palier testable en ligne**. Je ne passe à la suivante qu'après votre
confirmation.

### Étape 0 — Le pont des jetons *(à faire avant tout écran)*
Brancher les variables de shadcn (`--primary`, `--background`, `--border`, `--radius`, `--card`…)
sur les jetons ULAMU. **Aujourd'hui shadcn impose son propre neutre presque noir**, qui prend le pas
sur le cobalt : son bloc est déclaré après le nôtre dans le fichier.

*Pourquoi en premier* : ce seul fichier donne aux **61 composants d'un coup** l'apparence ULAMU. Le
faire après aurait obligé à reprendre chaque écran déjà construit.

**Vous testerez** : la page de connexion en ligne, inchangée visuellement. C'est le but — si quelque
chose bouge, c'est que le pont est mal branché.

### Étape 1 → 4 — Groupe A, l'authentification
Un écran par étape : A1, puis A2, puis A3, puis A4.
Règle 1 : la mise en page 42 % / 58 % et les 5 illustrations ne bougent pas.

### Étape 5 — B1, la coquille applicative
Barre latérale shadcn avec pied et bouton utilisateur (menu : déconnexion, bascule clair/sombre, mes
paramètres), topbar, palette de commandes.
*Pourquoi juste après l'authentification* : tous les écrans suivants vivent dedans.

### Étape 6 → 7 — B2 Tableau de bord, B3 Mes paramètres

### Étape 8 → 13 — Groupe C, le professionnel (C1 à C6)

### Étape 14 → 17 — Groupe D, la pharmacie (D1 à D4)

### Étape 18 → 24 — Groupe E, l'administration (E1 à E7)

### Étape 25 — Passe finale
Les 4 états de chaque écran (plein, chargement, vide, erreur), le thème sombre, le responsive
(bureau / tablette / mobile), l'accessibilité (focus, contrastes, lecteurs d'écran).

### Étape 26 — Préparation à la livraison *(voir §6)*

---

## 5. Ce que je dois faire à chaque étape, sans exception

1. Ouvrir la maquette concernée et **relever les valeurs réelles** (tailles, espacements, couleurs) — les maquettes stylent en inline, donc tout est lisible.
2. Écrire l'écran avec les composants shadcn.
3. Vérifier que ça **compile** et que les tests passent (local, uniquement pour ne pas vous faire pousser du code cassé).
4. Vous donner **2 ou 3 gestes maximum** à tester en ligne, avec le résultat attendu.
5. Attendre votre confirmation.

---

## 6. Ambiguïtés, risques et difficultés — signalés d'avance

### ⚠️ A. Les maquettes s'écartent volontairement de la charte
Le `CLAUDE.md` des maquettes acte trois arbitrages que **vous avez tranchés le 10/08** :

| Sujet | Maquette | Charte |
|---|---|---|
| Rayons | plafonnés à **10 px** | 14 px (CG-03, CG-07) |
| Lignes de tableau | **alternance douce** | interdite (CG-03, CG-05, CG-07) |
| Densité | **dense, lignes 44 px** | aéré, 64 px (CG-03) |

**Ma position** : je suis la maquette, comme vous l'avez demandé. **Mais il faut le tracer**, sinon
quelqu'un qui relira la charte dans six mois conclura que le code est fautif. Je l'inscris en
commentaire dans le code, à l'endroit exact où l'écart se produit.

### ⚠️ B. Maquettes en styles inline, shadcn en classes
Les maquettes stylent chaque composant **en inline**. shadcn style **par classes Tailwind et
variables CSS**. Recopier les inline dans du shadcn produirait un code illisible et impossible à
maintenir.

**Ma solution** : l'étape 0. Les variables shadcn pointent sur les jetons ULAMU, et les composants
adoptent l'apparence de la maquette **par héritage**. Je ne descends en réglage manuel que pour ce
que les variables ne couvrent pas (densité 44 px, alternance des lignes, grain, verre dépoli).

### ⚠️ C. Un écart de jeton entre maquette et code
`--bordure-legere` vaut `rgba(15,23,42,0.09)` dans la maquette et `0.10` dans le code. Écart
invisible à l'œil, mais c'est un désaccord entre deux sources de vérité.
**Ma proposition** : aligner le code sur la maquette (0.09), puisque la maquette fait foi. À valider.

### ⚠️ D. L'API s'endort — vos tests vont parfois paraître cassés
Plan gratuit : après ~15 min sans trafic, la première requête met 30 à 60 secondes.
**Pendant ce délai, une connexion qui ne répond pas n'est pas un bogue.**
**Ma proposition** : avant chaque séance de test, ouvrez `https://ulamu-api.onrender.com/health`
dans un onglet pour réveiller l'API. Quand elle répond, l'application sera vive.

### ⚠️ E. Chaque cycle coûte un déploiement
Sans test local, chaque validation demande : push → build Render → test. Comptez quelques minutes
par étape.
**Ma proposition** : regrouper les écrans très proches (A3 + A4, par exemple) quand le risque est
faible, pour réduire le nombre d'allers-retours — mais jamais au point de ne plus savoir lequel des
deux a introduit un défaut.

### ⚠️ F. Modifier la base demande une migration commitée
Si un écran réclame un champ absent de la base, changer `schema.prisma` **ne suffit pas**. Il faut
générer la migration et la commiter, sinon l'API démarrera en attendant une colonne inexistante.
Je vous préviendrai explicitement à chaque fois que ce cas se présentera.

### ⚠️ G. Ce que je n'ai pas encore vérifié
Je n'ai **pas** ouvert les 24 maquettes en détail — seulement leur structure et leurs jetons. Il est
possible qu'une maquette demande une donnée que l'API ne fournit pas. **C'est arrivé neuf fois lors
de la construction précédente.** Je le découvrirai écran par écran, et je vous le signalerai avec
les options : ajouter la route côté API, ou adapter l'écran.

---

## 7. À faire impérativement avant la livraison client

Ces points sont **connus, tracés, et non traités à ce jour**. Aucun ne doit atteindre le client.

| # | Sujet | Détail |
|---|---|---|
| 1 | **Identifiants du super-administrateur** | Mot de passe `admin123` et secret 2FA `JBSWY3DPEHPK3PXP` — cette dernière valeur est **l'exemple public de la norme RFC**, connue de tous. Sur une API exposée sur internet. |
| 2 | **MODE VITRINE** | `HANDSHAKE_AUTOCONFIRM_MS=3000` et `MOMO_AUTOCONFIRM_MS=4000` dans `render.yaml` : le soignant accepte tout seul, le paiement se valide tout seul. Utile pour démontrer, inacceptable en production. |
| 3 | **Plan gratuit de l'API** | L'API s'endort. Un client dont la première connexion prend une minute conclura que le produit ne marche pas. |
| 4 | **`SECRETBOX_KEY`** — ⚠️ **incident constaté le 20/08** | En local la variable est **absente** : le seed a scellé le secret 2FA de `super.admin` avec la clé de repli **écrite en clair dans les sources**. Si Render en a une autre, l'API déployée ne peut pas déchiffrer ce secret — c'est ce qui a produit le « Internal server error » à la connexion. **Deux issues, toutes deux à traiter** : si la variable est absente sur Render, le chiffrement des messages, médias et secrets 2FA ne protège rien ; si elle est présente, tout secret créé hors de Render est illisible. La règle à tenir : **aucun secret ne doit être scellé ailleurs que par l'environnement qui le relira.** Le seed ne devrait donc pas activer le 2FA d'un compte destiné à la production. |
| 6 | **`npm run lint` de l'API ne fonctionne pas en local** | `eslint` n'est pas installé dans `apps/api/node_modules`. Le script existe mais échoue. Sans conséquence sur Render (`npm install --include=dev`), mais aucun garde-fou de style ne tourne côté API pendant le développement. |
| 7 | **Les photos de profil disparaissent au redéploiement** — constaté le 23/08 | `StorageService` écrit dans `uploads/` sur le disque local de l'instance, et `render.yaml` ne déclare **aucun disque persistant**. Chaque redéploiement efface donc toutes les photos téléversées — et sur le plan gratuit, aussi les médias de consultation. Deux issues : un disque Render payant, ou un stockage objet externe. À trancher avant la livraison. |
| 8 | **Les tests d'intégration de l'API tombent en local sur la latence** | `chantier3`, `chantier4` et `chantier5` dépassent leurs délais (30 s / 60 s). L'en-tête des fichiers annonce « PostgreSQL réel (docker, port 5433) » ; le `.env` pointe sur Neon, à l'autre bout du réseau. **Vérifié le 23/08 : les mêmes tests échouaient déjà à l'identique avant le palier B3** (comparaison faite en remettant le code d'origine). Ce n'est donc pas une régression, mais un garde-fou hors service. À corriger par un Postgres local, ou par des délais adaptés. |
| 5 | **Alertes `npm audit`** | 3 alertes élevées sur `react-router`. Elles concernent le mode RSC, que nous n'utilisons pas (SPA statique). À re-vérifier avant livraison. |

---

## 9. Écarts assumés avec les maquettes

Chacun corrige un défaut réel, est commenté à l'endroit exact du code, et a été validé. **Cette liste
est la contrepartie de la règle du §0 : un écart qui n'y figure pas est un écart en trop.**

| # | Écran | Écart | Pourquoi | Décidé par |
|---|---|---|---|---|
| 1 | A1 | **Bascule vers un code de secours** ajoutée | La maquette montre six cases ET annonce dessous qu'un code de dix caractères est accepté. Les deux ne tiennent pas ensemble. La maquette A3 contient elle-même cette bascule : A1 l'avait simplement oubliée. | Claude, signalé et validé |
| 2 | A1, A2, A3 | **Pavé numérique retiré** | Sur un poste de travail, le clavier fait le même travail ; les cases restent entièrement saisissables. | Porteur, 20/08 |
| 3 | A2 | **6 étapes au lieu de 5** — « identité » scindée en « contact » + « identité » | Les cinq champs réunis demandaient 634 px pour 494 disponibles. L'étape défilait, ce qui escamotait le logo. | Claude, mesuré |
| 4 | A2 | **Libellés d'un mot** (Type, Contact, Identité, Profil, Sécurité, Code) | À six colonnes dans 435 px, « Profil professionnel » s'enroulait sur deux lignes. La maquette fait le même choix dans son sélecteur compact. | Claude |
| 5 | A2 | **Consentement CGU déplacé sur la dernière étape** | On consent au moment où le compte se crée, pas deux écrans avant. Libère 90 px sur l'étape « sécurité », qui débordait. | Claude |
| 6 | A3 | **3 étapes au lieu d'une seule** | Tout sur un écran dépassait la hauteur disponible. | Porteur, 20/08 : « mets les étapes » |
| 7 | A3 | **Voie de récupération par email ajoutée** | La maquette ne prévoit que le TOTP, devenu optionnel le matin même : un compte sans authentificateur n'avait plus **aucun** recours. Le serveur savait déjà le faire. | Porteur, 20/08 |
| 8 | A2, A3 | **Sous-titre masqué après la première étape** | 70 px répétés à chaque étape, sans rien apprendre à quelqu'un déjà engagé — l'indicateur d'étapes le renseigne mieux. Ce sont ces 70 px qui donnent la marge quand une erreur s'affiche. | Claude, mesuré |
| 9 | A3 | **« Si un compte utilise X… »** au lieu de « Code envoyé à X. » | Le serveur envoie un code à n'importe quelle adresse (anti-énumération) et refuse ensuite avec « Aucun code en attente ». Affirmer l'envoi enfermait l'utilisateur dans une boucle sans issue. | Claude |
| 10 | A4 | **3 étapes au lieu d'une** (Scanner · Vérifier · Codes) | QR, secret, six cases et bouton empilés faisaient 695 px pour 620 de fenêtre. | Claude, mesuré |
| 11 | A4 | **Le QR et le code manuel s'excluent** — « Impossible de scanner ? » remplace l'un par l'autre | Ce sont deux alternatives, pas un empilement : qui ne peut pas scanner n'a pas besoin de voir le QR. Les afficher ensemble débordait de 29 px. | Claude |
| 12 | A4 | **Deux phrases corrigées** : la 2FA n'est plus dite « obligatoire », et l'avertissement ne dit plus que le web « n'envoie ni SMS ni code par email » | Les deux étaient vraies le 14/08 et fausses le 20/08, à cause de nos propres décisions. Les garder aurait fait mentir l'interface. | Claude |
| 13 | A4 | **Sortie « Plus tard » ajoutée**, et sous-titre du bandeau retiré | La maquette ne prévoit aucune sortie, ce qui se tenait quand l'écran était BLOQUANT ; devenu volontaire, il enfermait qui l'ouvrait par curiosité. Le sous-titre paraphrasait le titre sur deux lignes. | Claude |
| 14 | A4 | **Bouton « Télécharger les codes »** | Présent dans la maquette mais sans action. Recopier dix codes à la main est la première cause de perte. | Maquette, rendu fonctionnel |
| 15 | A4 | **Copie des codes de secours au survol** du bloc | Absente de la maquette. Demandée le 20/08. Révélée au survol pour ne pas encombrer une grille qu'on vient lire — mais visible au focus clavier et en permanence sur écran tactile, où le survol n'existe pas. | Porteur, 20/08 |
| 16 | B1 | **Barre latérale écrite à la main**, sans le composant `sidebar` de shadcn | 700 lignes, 23 sous-composants, largeurs 16rem/3rem, et surtout un modèle qui POUSSE le contenu là où la maquette le RECOUVRE. Le plier coûtait plus que l'écrire. `DropdownMenu` et `Tooltip` de shadcn sont bien utilisés — eux apportent le focus et l'échappement. | Claude |
| 17 | B1 | **Barre utilisable au clavier** : déploiement au focus, et `inert` sur le tiroir mobile fermé | La maquette n'ouvre qu'au survol. Sans le déploiement au focus, tabuler dans une barre au repos donne une suite d'icônes sans libellé. Sans `inert`, les neuf liens du tiroir fermé restent tabulables hors écran — le focus disparaîtrait sans explication. | Claude |
| 18 | B1 | **Groupes de navigation étendus** aux parcours officine et administration | La maquette ne montre que le parcours d'un soignant. Les entrées manquantes sont réparties dans les mêmes groupes selon leur nature, pas ajoutées en vrac à la fin. | Claude |
| 28 | B3 | **Le bloc « Adresse email » est AJOUTÉ** — la maquette n'en prévoit aucun | L'adresse est le canal de récupération : c'est par elle qu'arrivent le code de mot de passe oublié et celui de clôture. Les comptes créés par le seed, dont l'administrateur, n'en ont pas — et l'API répondait « ajoutez-en une d'abord » sans offrir nulle part le geste. Un écran de paramètres sans ce bloc laisse ces comptes sans issue. | Porteur, 23/08 |
| 27 | B3 | **« Différent des 3 derniers mots de passe » remplacé par « différent du mot de passe actuel »** | Aucun historique de mots de passe n'existe en base, et en créer un signifie conserver des empreintes de mots de passe abandonnés. La règle affichée est désormais vraie et vérifiée par le serveur. **À rétablir si le client l'exige** : une table `PasswordHistory` et une migration. | Porteur, 23/08 |
| 26 | B3 | **« Ces réglages suivent votre compte » corrigé en « restent sur cet appareil »** pour le thème, la page d'accueil et les sons | Rien ne les stocke côté serveur, et un poste d'officine est partagé : promettre le contraire trompe l'utilisateur sur ce qu'il partage avec son collègue. Les notifications, elles, suivent VRAIMENT le compte (M14) — les deux familles sont donc séparées, chacune disant où elle vit. | Porteur, 23/08 |
| 25 | B3 | **Un seul interrupteur « Notifications par email » remplacé par les 5 catégories réelles de M14** | L'API ne connaît pas de canal « email » : elle connaît `care`, `money`, `reminder`, `system`, `critical`. Un interrupteur unique aurait piloté autre chose que ce qu'il annonçait. `critical` est affiché verrouillé — les alertes vitales ne se coupent pas (RM-14-02). | Porteur, 23/08 |
| 24 | B3 | **Le sélecteur Français / English devient une mention** | Le projet n'a **aucun système de traduction** : pas d'i18next, pas de fichiers de langue, pas une chaîne externalisée. Le bouton « English » aurait changé de couleur sans rien traduire. La place reste prête. | Porteur, 23/08 |
| 23 | B3 | **« Version 1.0 · acceptée le 12 mars 2026 » retiré sous les documents légaux** | Le consentement EST enregistré à l'inscription (table `Consent`, preuve légale, loi n° 29-2019), mais **aucun endpoint ne le relit** : ni version, ni date. Les afficher voudrait dire les inventer — sur une preuve légale, c'est exclu. Les textes restent, la date attend son endpoint. | Porteur, 23/08 |
| 22 | B3 | **Pas de bouton « Enregistrer » en Préférences** | La maquette n'affiche le bouton qu'en cas de modification. Or l'affichage s'applique en direct — l'aperçu EST le résultat — et chaque notification tient en un appel. Un bouton n'aurait rien eu à enregistrer, sinon le doute de ne pas savoir si c'est pris en compte. | Porteur, 23/08 |
| 21 | B2 | **Ni tendances, ni graphique 6 mois, ni répartition par type** | L'API ne les calcule nulle part : `me/dashboard` renvoie 4 nombres bruts, `me/facility/:id/dashboard` en renvoie 2, aucune comparaison historique n'existe. Décision du 20/08 : construire avec le réel — chaque chiffre affiché est vrai. **À combler quand M16 saura produire ces séries.** | Porteur, 20/08 |
| 20 | — | **Palette du thème CLAIR retouchée** : fond de page, texte tertiaire, bordures, surface secondaire | La maquette faisait tenir ses trois surfaces claires dans 15 niveaux sur 255 — tout l'écran entre 94 et 100 % de luminosité, rien qui se détache, fatigue oculaire immédiate. Et son texte tertiaire tombait à **2,9:1**, sous le seuil AA de 4,5 : un échec objectif d'accessibilité, pas une affaire de goût. Mesures après retouche : page↔surface 1,08 → **1,15**, tertiaire/page 2,9 → **4,66**. Le thème sombre, jugé bon, n'est pas touché. | Porteur, 20/08 |
| 19 | B1 | **Recherche, notifications et « rideau de confidentialité » écartés** de cette étape | Périmètre décidé le 20/08. La recherche attend la palette de commandes ; les notifications existent côté serveur (M14) mais ne sont pas exposées au web ; le rideau n'a AUCUNE trace serveur ni au cahier des charges — lui inventer un comportement promettrait une protection qui n'existe pas. | Porteur, 20/08 |

### Ce qui n'est PAS un écart, et ne doit pas le devenir

Les deux règles intangibles tiennent, vérifiées à l'exécution à chaque étape : **carrousel à gauche
42 % / formulaire à droite 58 %** avec les 5 illustrations et leurs textes, et **le logo ULAMU**.

Les polices ne sont pas alignées sur les maquettes, et c'est volontaire : elles chargent `'Inter'`
depuis Google Fonts, nous chargeons `'Inter Variable'` en local. Aucune dépendance à un serveur
externe — notre version est la bonne.

---

## 10. Journal des étapes

| Étape | Objet | Statut | Confirmé en ligne le |
|---|---|---|---|
| 0 | Pont des jetons shadcn ↔ ULAMU (`cdfbc66`) — 3 défauts silencieux corrigés | ✅ | **20/08** |
| — | *Hors plan* : correctif du 500 sur code de secours (`e87a349`) | ✅ | **20/08** |
| — | *Hors plan* : TOTP rendu volontaire, base remise à zéro, admin recréé | ✅ | **20/08** |
| 1 | A1 — Connexion + alignement des 60 jetons sur la maquette (`edd17af`) | ✅ | **20/08** |
| 2 | A2 — Inscription, 6 étapes, indicateur partagé (`2d16058`) | ✅ | **20/08** |
| 3 | A3 — Mot de passe oublié, 3 étapes, 3 voies (`f82970b`, `39e91c9`) | ✅ | **20/08** |
| — | Rangement : plus aucun ascenseur sur A1/A2/A3 (`24e8dc1`) | ✅ | **20/08** |
| 4 | A4 — Configuration 2FA, 3 étapes + correctif `useRef`/StrictMode | **codé** | *en attente de test* |
| 5 | B1 — Coquille applicative (barre, topbar, menu utilisateur, navigation par rôle) | **codé** | *en attente de test* |
| 6 | B2 — Tableau de bord adaptatif (3 rôles, données réelles) | **codé** | *en attente de test* |
| — | *Palier serveur B3* : 6 manques comblés dans M01 + migration additive + 6 tests | **codé** | *en attente de test* |
| 7 | B3 — Mes paramètres (4 sections, 12 blocs) | **codé** | *en attente de test* |
| 8–13 | C1 → C6 — Professionnel — **la suite** | à faire | |
| 14–17 | D1 → D4 — Pharmacie | à faire | |
| 18–24 | E1 → E7 — Administration | à faire | |
| 25 | Passe finale : états, sombre, responsive, accessibilité | à faire | |
| 26 | Préparation à la livraison (§7) | à faire | |

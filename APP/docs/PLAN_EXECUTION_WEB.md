# PLAN D'EXÉCUTION — refonte web ULAMU

> **Rédigé le 20/08/2026.** Document opérationnel : *comment* on construit, dans quel ordre, et
> comment on vérifie. Le *quoi* (contenu de chaque écran, composants) reste dans
> [`plan_refonte_web_shadcn.md`](plan_refonte_web_shadcn.md). Les deux se lisent ensemble.
>
> **Source visuelle obligatoire** : `docs/maquettes/` — 24 fichiers `.dc.html`. La maquette fait
> foi. Quand le code et la maquette divergent, c'est le code qui a tort.

---

## 0. La règle du jeu

**Une chose à la fois.** J'annonce l'étape en français simple avec la raison du choix → vous
validez → je code → je vous dis quoi tester → vous poussez → Render déploie → vous testez **dans le
navigateur, sur l'application en ligne** → vous confirmez → étape suivante.

**Jamais de test en local.** Le local sert uniquement à ce que le code compile avant d'être poussé.
La vérité, c'est `https://ulamu-web.onrender.com`.

**Si je bute ou si j'ai un doute, je vous le dis et je propose des solutions.** Je ne devine pas, je
ne comble pas un trou par une invention, et je ne déclare jamais « c'est fait » sans preuve.

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

### État vérifié à cette heure
- Compilation : **code 0** · Tests : **14 passent + 5 en attente** · Lint : **0 erreur**
- Écran de connexion en ligne : 880 px, **42 % / 58 %**, 6 formes animées, Plus Jakarta Sans, accent `#2756A6`
- **2 commits locaux non poussés** : `f13dcb0` et `2805248`

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
| 5 | **Alertes `npm audit`** | 3 alertes élevées sur `react-router`. Elles concernent le mode RSC, que nous n'utilisons pas (SPA statique). À re-vérifier avant livraison. |

---

## 8. Journal des étapes

| Étape | Objet | Statut | Confirmé en ligne le |
|---|---|---|---|
| 0 | Pont des jetons shadcn ↔ ULAMU | **codé** (`cdfbc66`) — 3 défauts silencieux corrigés | *en attente de push* |
| 1 | A1 — Connexion + alignement des 60 jetons sur la maquette | **codé** | *en attente de test* |
| 2 | A2 — Inscription (6 étapes, indicateur partagé, consentement CGU) | **codé** | *en attente de test* |
| 3 | A3 — Mot de passe oublié (3 étapes, 3 voies dont l'email) | **codé** | *en attente de test* |
| 4 | A4 — Configuration 2FA | à faire | |
| 5 | B1 — Coquille applicative | à faire | |
| 6 | B2 — Tableau de bord | à faire | |
| 7 | B3 — Mes paramètres | à faire | |
| 8–13 | C1 → C6 — Professionnel | à faire | |
| 14–17 | D1 → D4 — Pharmacie | à faire | |
| 18–24 | E1 → E7 — Administration | à faire | |
| 25 | Passe finale : états, sombre, responsive, accessibilité | à faire | |
| 26 | Préparation à la livraison (§7) | à faire | |

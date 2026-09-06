# PLAN D'EXÉCUTION — reconstruction web ULAMU

> **Réécrit le 27/08/2026.** Il remplace intégralement la version du 20/08, qui décrivait le travail
> refusé le 25/08. Document opérationnel : **comment** on construit, **dans quel ordre**, et
> **comment on vérifie**.
>
> **Le *quoi* n'est plus ici.** Chaque décision d'écran — ce qui reste, ce qui disparaît, ce qui
> remplace — vit dans [`ALIGNEMENT_MAQUETTE_CAHIER.md`](ALIGNEMENT_MAQUETTE_CAHIER.md) : 39 écarts,
> 4 familles, chacun avec sa raison, sa route serveur et son coût. **Ce plan ne le recopie pas, il
> s'y réfère.** Les deux se lisent ensemble.
>
> ⚠️ `plan_refonte_web_shadcn.md` et `plan_frontend_web_2026-08-05.md` sont **périmés**. Ils
> décrivent la construction refusée. On ne s'y réfère plus.

---

## 0. Pourquoi ce plan remplace le précédent

Le 25/08, après avoir examiné les 14 écrans construits, le porteur a tranché :

> « tout est bâclé sauf les interfaces d'authentification que je valide pour l'instant, le reste je
> valide pas, c'est beau mais ça ne suit pas mon objectif »

### La cause, redressée le 27/08

Le plan du 20/08 accusait shadcn : « j'ai reconstruit sur shadcn, qui a sa propre allure ». **C'est
faux, et il fallait le vérifier avant de refaire.**

Les écrans **validés** — A1 à A4 — sont eux aussi construits sur shadcn. Leurs imports le disent :
`ui/button`, `ui/input`, `ui/input-otp`, `ui/spinner`, `ui/native-select`, plus `ulamu/Logo` et un
`AuthLayout` maison. Exactement la même bibliothèque que les écrans refusés.

**Ce n'est donc pas l'outil qui a été refusé.** La vraie cause est celle que la passation avoue :

> « j'ai lu les maquettes `.dc.html` **comme du texte** (grep, sed), sans jamais les **afficher**.
> J'ai transcrit la structure, pas les proportions. »

### La correction, et elle est concrète

Les maquettes **peuvent être affichées**, et ce ne sont pas des images : ce sont des **prototypes
qui tournent**. Vérifié le 27/08 en ouvrant C3 dans un navigateur — le compte à rebours décrémente
réellement à la seconde, et l'en-tête offre trois réglages qu'aucune lecture de texte ne pouvait
révéler :

| Réglage | Valeurs |
|---|---|
| **VUE** | Bureau · Tablette · Mobile |
| **THÈME** | Clair · Sombre |
| **ÉTAT** | Plein · Chargement · Vide · Erreur |

Quatre états par écran, trois tailles, deux thèmes. **Rien de tout cela n'apparaît quand on lit le
fichier avec `grep`.** C'est ce qui manquait, et c'est la première règle de ce plan.

**On conserve donc shadcn**, comme sur les écrans validés. On change la méthode, pas la boîte à
outils.

---

> 📗 **Suite de ce plan : `docs/PLAN_ECRANS_SOIGNANT.md`** (04/09/2026). Celui-ci raconte la
> RECONSTRUCTION, chantiers 1 à 40. Le nouveau prépare l'AMÉLIORATION : les sept écarts mesurés
> entre le serveur et les écrans, ce qui ment encore, et l'ordre des chantiers 41 à 46.

## 1. La règle du jeu

**Une chose à la fois.** J'annonce le chantier en français simple, avec la raison du choix → vous
validez → je code → je vous donne **2 ou 3 gestes maximum** à tester → vous poussez → Render déploie
→ vous testez **dans le navigateur, sur l'application en ligne** → vous confirmez → chantier suivant.

**Jamais de test en local.** Le local sert uniquement à ce que le code compile et que les tests
passent avant d'être poussé. La vérité, c'est `https://ulamu-web.onrender.com`.

**Backend d'abord, puis son frontend.** Quand un chantier demande du serveur, le serveur part
d'abord, seul, et il est prouvé par ses tests avant qu'un écran s'appuie dessus.

**Constater ne suffit pas.** Tout écart ou toute omission s'accompagne d'une proposition de
correction : le geste technique, son coût réel, et une recommandation argumentée — y compris « ne
pas le faire ».

**Si je bute ou si j'ai un doute, je le dis et je propose des solutions.** Je ne devine pas, je ne
comble pas un trou par une invention, et je ne déclare jamais « c'est fait » sans preuve.

### ⚠️ La référence a changé le 03/09/2026 — ce n'est plus la maquette, c'est le site

**Règle du porteur, mot pour mot : « on ne doit plus se fier à la maquette dorénavant mais plutôt au
site actuel ».**

Ce que cela remplace : la règle fondatrice de ce plan disait *« la maquette décide de la FORME, le
cahier décide des FAITS »*. Elle a servi trente-six chantiers et elle a fait son travail — remettre
les proportions, les quatre états, les trois tailles. Elle n'est plus la bonne, pour une raison
simple : **le site a dépassé la maquette.** Les trois acteurs (D-051), la chaîne du médicament
retirée (D-052), le 2FA optionnel (D-053), la présence, les squelettes — rien de tout cela n'existe
dans les `.dc.html`, et un écart avec eux n'est donc plus un défaut, c'est souvent un progrès.

**La règle qui la remplace :**

1. **La référence est `https://ulamu-web.onrender.com`**, tel qu'il est en ligne à cet instant.
2. Le **cahier des charges décide toujours des faits** — cette moitié-là n'a pas bougé.
3. La maquette redevient ce qu'elle aurait dû rester : une **archive d'intentions graphiques**, à
   consulter quand on cherche une inspiration de forme, jamais à invoquer comme un arbitre.
4. Le travail ne consiste plus à *rattraper* un modèle, mais à **améliorer, ajouter, retirer** :
   vérifier le CRUD de chaque page, ses raccourcis, ses actions secondaires, et interroger l'utilité
   de chaque élément affiché.

### Les deux règles d'interface intangibles

1. Les écrans d'authentification gardent le **carrousel à gauche 42 % / formulaire à droite 58 %**.
2. Le **logo ULAMU** est conservé.

---

## 2. Afficher la maquette — le geste qui manquait

> ⚠️ **Section historique depuis le 03/09/2026.** Elle décrit le rituel des chantiers 1 à 36, quand
> la maquette était l'arbitre. Elle ne l'est plus (voir la règle au §1). Ce qui reste vrai et ne se
> périme pas : **avant d'écrire une ligne d'un écran, on l'OUVRE** — désormais celui du site en
> ligne, dans le navigateur intégré, connecté au compte concerné. Le mode d'emploi du serveur de
> maquettes est conservé plus bas parce qu'elles gardent une valeur d'archive.

**Avant d'écrire une ligne d'un écran, on l'ouvre.** Sans exception. C'est la mesure corrective
n°1 de ce plan.

Les `.dc.html` ont besoin de leur moteur (`support.js`), qui ne se charge pas depuis un simple
double-clic. Il faut servir le dossier en HTTP :

```bash
python -m http.server 8123 --directory "C:/Users/ADMIN/Desktop/ULAMU/ULAMU/APP/docs/maquettes"
```

Puis ouvrir `http://localhost:8123/C3 - Demandes.dc.html`.

Une entrée **`maquettes`** est commitée dans `.claude/launch.json` (validé porteur, 27/08) : toute
session future peut donc lancer ce serveur d'un mot, sans avoir à redécouvrir la manipulation.
Aucun effet sur le déploiement — ce fichier ne sert qu'aux outils de développement.

### Ce qu'on relève sur chaque maquette, et qu'aucun `grep` ne donne

1. **Les proportions.** Largeurs de colonnes, densité, respiration. C'est ce qui a été perdu.
2. **Les quatre états** : Plein, Chargement, Vide, Erreur. Un écran n'est pas fini tant que les
   quatre n'existent pas.
3. **Les trois tailles** : Bureau, Tablette, Mobile. Les bascules sont dans la maquette, pas à
   deviner.
4. **Les deux thèmes** : Clair et Sombre.
5. **Les comportements** : ce qui décrémente, ce qui s'ouvre, ce qui se désactive.

---

## 3. Le périmètre

> **ULAMU a TROIS acteurs** — le **patient** (application mobile), le **soignant** et
> l'**administration** (application web). Décision du porteur du **02/09/2026**, inscrite au cahier
> des charges sous **D-051**. Le quatrième type de compte du modèle initial, le **membre de
> structure** (`FACILITY_MEMBER`), est **retiré du produit** : sa route d'inscription n'existe plus.
>
> Les écrans D1 → D4 étaient déjà « hors MVP, écartés » ci-dessous. Ils sont désormais **hors
> produit** — ce n'est plus un report, c'est acté (chantier 25).
>
> **Et le 02/09 également, les MODULES qui les servaient sont retirés** (chantier 26, cahier
> **D-052**) : **M11 Stocks** et **M12 Recherche & dévoilement**, plus la **délivrance de M09**.
> ULAMU ne garde que les modules de son périmètre. ⚠️ Le **référentiel médicaments** est passé de
> M12 à M09 **sans changer d'adresse** — c'est ce dans quoi un médecin choisit une ligne
> d'ordonnance, et sans lui le garde-fou allergies ne s'applique plus.

| Groupe | Écrans | État |
|---|---|---|
| **A — Authentification** | A1 Connexion, A2 Inscription, A3 Mot de passe oublié, A4 2FA | ✅ **VALIDÉS — on n'y touche pas** |
| **B — Coquille** | B1 Coquille, B2 Tableau de bord, B3 Mes paramètres | 🔴 à refaire |
| **C — Professionnel** | C1 → C6, **+ C7 Ordonnance (écran neuf)** | 🔴 à refaire |
| ~~**D — Pharmacie**~~ | ~~D1 → D4~~ | ❌ **HORS PRODUIT (02/09, D-051)** — plus aucun compte ne peut les atteindre |
| **E — Administration** | E1 → E7 | 🔴 à refaire |

**15 écrans à construire**, dont un qui n'a aucune maquette : **C7 — Ordonnance**, créé de zéro dans
le langage visuel des autres (famille 4, point 4).

---

## 4. La chaîne de déploiement

```
  votre machine          GitHub                    Render                        Neon
  ─────────────          ──────                    ──────                        ────
  git commit
  git push        →   will180901/ULAMU
                      branche main          →   déclenche LES DEUX services
                                                 (autoDeploy: true sur chacun)

                                            ┌── ulamu-api  (service web Node)
                                            │   start : prisma migrate deploy   →  applique les
                                            │           && node dist/src/main.js    migrations
                                            │
                                            └── ulamu-web (site statique)
                                                publie : dist/
```

| Fait | Conséquence |
|---|---|
| `autoDeploy: true` sur les **deux** services | Un push qui ne touche que le web **redéploie quand même l'API**. Sans danger, mais elle redémarre. |
| `plan: free` sur `ulamu-api` | **L'API s'endort après ~15 min.** Le premier appel prend 30 à 60 s. ⚠️ **Une lenteur pendant vos tests n'est pas forcément un bogue** — c'est souvent le réveil. |
| `start:prod` = `prisma migrate deploy && …` | Neon n'est mis à jour **que** par un déploiement de l'API, et seulement s'il existe une migration non appliquée. |
| Modifier `schema.prisma` ne suffit pas | Il faut une **migration générée et commitée**. Sans dossier dans `prisma/migrations/`, `migrate deploy` ne fait rien et le code attend une colonne qui n'existe pas. **C'est le piège n°1 de cette architecture.** |

**Bonne nouvelle pour cette reconstruction : aucun chantier ne demande de migration.** Les six
ajouts serveur sont tous en lecture seule (§5).

---

## 5. Le travail serveur — ~50 lignes, tout en lecture seule

L'alignement a établi que **presque tout est déjà servi**. Voici l'intégralité de ce qui manque.

| # | Ajout | Pourquoi | Où | Taille |
|---|---|---|---|---|
| S1 | `reportDueAt` sur les consultations | famille 2, pt 1 — l'écran ne peut pas calculer l'échéance, PM-30 ne lui est pas accessible | `m06.session.service.ts` (lit déjà PM-30) | ~5 l. |
| S2 | Brut / commission / net dans le portefeuille | famille 1, pt 1 — la vue ne renvoie que le **net**, le détail vit dans `PaymentSplit` non jointe | `m13.earnings.service.ts` | ~20 l. |
| S3 | Délai PM-36 dans le récapitulatif de retrait | famille 1, pt 2 — pour ne pas écrire « 24 h » dans la page | `m13.earnings.service.ts` (lit déjà les params) | ~3 l. |
| S4 | Dernière version **signée** dans `GET /v1/verification/me` | famille 4, pt 11 — afficher « ancien → nouveau taux » à la re-signature | `m03.service.ts` | ~10 l. |
| S5 | Compte « N contrats signés » avant confirmation | famille 4, pt 11 — l'admin doit savoir combien il casse | `m16.parameters.service.ts` | ~15 l. |
| S6 | Effectifs par arrondissement | famille 3, groupe E — remplacer six lignes écrites en dur | `m16` / agrégat `groupBy district` | ~20 l. |

**Aucune écriture nouvelle, aucune migration, aucune table.** Chaque ajout se prouve par ses tests
unitaires, qui ne touchent aucune base (§8).

---

## 6. L'ordre de construction

> **Comment lire les étiquettes.** Trois numérotations coexistent, et elles ne se ressemblent pas :
> les **paliers** portent une lettre seule (*palier A*), les **chantiers** un numéro de 1 à 19
> (*chantier 3*), les **écrans** une lettre suivie d'un chiffre (*C3*). Un chantier = **un écran**,
> annoncé → validé → codé → testé en ligne → confirmé.
>
> *(Renuméroté le 27/08 : les chantiers s'appelaient A1, B1, B2… et se confondaient avec les écrans
> du même nom — le chantier « D1 » construisait l'écran C1, le « F1 » l'écran E1.)*

**Principe retenu : on construit dans l'ordre de la démonstration, pas dans celui du menu.** Ce qui
doit fonctionner devant le jury passe d'abord ; ce qui l'entoure vient ensuite.

### PALIER A — Le socle *(rien ne marche sans lui)*

| N° | Chantier | Serveur | Alignement appliqué |
|---|---|---|---|
| **1** | **B1 — La coquille + la présence + le plafond de 3 sessions** | aucun | F4 pt 5, pt 6 · F3-A · F3-C · F3-D |

**Pourquoi en premier, et sans discussion possible :** sans présence, `isAvailableForInitiation`
renvoie `false`, le bouton « initier » du patient reste gris, et **aucune démonstration n'est
possible**. Rien d'autre ne peut être montré tant que ce chantier n'est pas fini.

Contenu : pastille + mot dans la barre du haut (ONLINE / DO_NOT_DISTURB / OFFLINE), battement de
cœur toutes les 5 min tant que l'onglet vit, « 1 consultation sur 3 » discret, bascule en « Occupé »
à 3. Les deux lignes fausses de B1 — « Clinique de Bacongo » et « 6 rendez-vous » — **libèrent
exactement la place** de ces deux ajouts. La barre de recherche reste, recentrée sur les dossiers du
médecin lui-même.

Routes : `POST /v1/presence/state` · `POST /v1/presence/heartbeat` · `GET /v1/presence/me`.
Chiffres : PM-26 = 900 s (absent après 15 min) · PM-27 = 3.

**Gestes à tester :** ① ouvrir l'application → pastille verte, mot « En ligne ». ② basculer en « Ne
pas déranger » → le mot change et tient au rechargement. ③ laisser l'onglet fermé 20 min, revenir →
« Absent ».

---

### PALIER B — La chaîne de soin

| N° | Chantier | Serveur | Alignement appliqué |
|---|---|---|---|
| **2** | **C2 — Ma vitrine** (les offres) | aucun | F1 pt 1 · F3-A · F3-B · F4 pt 7, pt 8 |
| **3** | **C3 — Demandes** (la poignée de main) | aucun | F2 pt 2 · F3-A · F3-C · F3-E |
| **4** | **C5 — La consultation** | **S1** | F2 pt 1 · F4 pt 1, pt 2, pt 9 · F3-F |
| **5** | **C7 — Ordonnance** *(écran neuf)* + garde-fou allergies | référentiel 6 → ~60 | F4 pt 3, pt 4, pt 4bis |
| **6** | **C4 — Consultations** (le registre) | ~~aucun~~ → **S9** (2 l.) | F2 pt 1 · F4 pt 7, pt 8, pt 9 · F3-C · F3-D |

**C2 avant C3** : sans offre publiée, aucun patient ne peut initier. C'est la porte d'entrée du
parcours.

**C5 est le plus gros chantier du lot** : décompteur serveur, panneau Carnet à droite en lecture
seule, prolongation « + 10 min » plafonnée à PM-29 (1800 s), avertissement de remboursement tant que
le médecin n'a rien écrit, et le compte-rendu avec son décompte réel.

**C7 mérite son propre chantier** : aucune maquette n'existe, et le garde-fou allergies n'a nulle
part ailleurs où vivre. Le serveur répond `409 code:"ALLERGY_GUARD"` avec `conflicts[]`.

⚠️ **Le référentiel médicaments** passe de 6 à ~60 entrées. C'est la **seule écriture en base** de
toute la reconstruction. Elle passe par le seed, donc par un déploiement de l'API — à traiter avec
la même prudence qu'une migration, et à annoncer avant de pousser.

**Gestes à tester** (C3) : ① une demande arrive → l'anneau décrémente à la seconde. ② à 2 min il
passe à l'ambre, à 1 min au rouge. ③ ne rien faire → elle expire seule, et le taux de confirmation
bouge.

---

### PALIER C — L'argent

| N° | Chantier | Serveur | Alignement appliqué |
|---|---|---|---|
| **7** | **C6 — Mes gains** | **S2 + S3** | F1 pt 1, pt 2, pt 3, pt 6 · F4 pt 9 |

Le versement mensuel disparaît, le bouton de retrait qui existait déjà devient le seul chemin, le
minimum de 5 000 XAF saute, et le compte de versement cède la place au vrai numéro du compte.

**Gestes à tester :** ① une consultation honorée → la ligne montre brut, commission et net. ②
demander un retrait de 450 XAF → accepté, frais et délai annoncés **avant** de confirmer. ③ le
numéro affiché est bien celui du compte.

---

### PALIER D — Les conditions d'exercice

| N° | Chantier | Serveur | Alignement appliqué |
|---|---|---|---|
| **8** | **C1 — Ma vérification, le contrat, l'avenant** | **S4** | F4 pt 11 · F1 pt 1, pt 2 · F2 pt 3 |

Le contrat affiché est le **texte scellé que renvoie le serveur**, jamais un texte écrit dans la
page. La signature passe par **mot de passe + OTP**, comme l'exige le serveur — pas par la case à
cocher de la maquette. Le parcours de re-signature apparaît ici.

⚠️ **Ce chantier ne se teste qu'avec E3** (palier F, **chantier 14**) : c'est le changement de taux dans
E3 qui déclenche la re-signature dans C1. Les deux écrans forment **une seule fonctionnalité**.
Prévoir de les enchaîner.

---

### PALIER E — Le reste du médecin

| N° | Chantier | Serveur | Alignement appliqué |
|---|---|---|---|
| **9** | **B2 — Tableau de bord** | aucun | F3-D (export retiré) |
| **10** | **B3 — Mes paramètres** | aucun | F3-B (langue retirée) |

⚠️ **B3 porte la phrase d'hébergement.** La maquette affirme « données hébergées au
Congo-Brazzaville » : **c'est faux** — Render est à Francfort, Neon en `eu-central-1`. Ce texte est
accepté à l'inscription, il vaut donc **preuve**. Il avait été corrigé une fois dans le code refusé.
**Il reviendra tout seul si B3 est reconstruit depuis la maquette.**

---

### PALIER F — L'administration

| N° | Chantier | Serveur | Alignement appliqué |
|---|---|---|---|
| **11** | **E1 — File de vérification** | aucun | F2 pt 3 (72 h, sans « ouvrées ») |
| **12** | **E7 — Comptes + procédures support** | aucun | F4 pt 10 · F3-D (pas de durée de suspension) |
| **13** | **E2 — Supervision financière** | aucun | F1 pt 4 · F2 pt 4 |
| **14** | **E3 — Paramètres métier** | **S5** | F4 pt 11 · F2 pt 5 |
| **15** | **E4 — Administrateurs** | aucun | F3-D (rôle d'abord, création en second) |
| **16** | **E5 — Pilotage** | **S6** | F3-E · F1 pt 5 |
| **17** | **E6 — Signalements** | aucun | F3-D (export retiré) |

E1 en premier : c'est par elle qu'un soignant devient exerçant. E3 juste après C1 si possible, pour
boucler l'avenant.

---

### PALIER G — Passe finale

| N° | Chantier |
|---|---|
| **18** | Relire les 15 écrans **côte à côte avec leur maquette affichée**, dans les 4 états, les 3 tailles et les 2 thèmes |
| **19** | Solder les dettes du §9 avant toute livraison |

---

## 7. Le rituel de chaque chantier — sans exception

1. **Ouvrir la maquette dans le navigateur** (§2) et relever les proportions, les quatre états, les
   trois tailles, les deux thèmes.
2. **Relire la ligne d'alignement** correspondante dans `ALIGNEMENT_MAQUETTE_CAHIER.md` — elle dit
   ce qui reste, ce qui disparaît et ce qui remplace.
3. **S'il y a du serveur : le faire d'abord, seul**, avec ses tests unitaires, et le pousser avant
   l'écran.
4. Écrire l'écran avec les composants existants — `components/ui/` (shadcn) et `components/ulamu/`,
   comme les écrans validés.
5. Vérifier **en local que ça compile et que les tests passent** — uniquement pour ne pas vous faire
   pousser du code cassé.
6. **Contrôle de conformité, bloc par bloc ET position par position** — rouvrir la maquette et
   dresser la liste de ses blocs dans l'ordre, colonne par colonne, puis la même liste pour l'écran
   construit. Chaque différence doit se rattacher à une **décision d'alignement écrite**. Une
   différence qu'on ne sait pas rattacher est un écart non traçé : on le corrige, ou on l'inscrit.
   *(Étape ajoutée le 27/08 : sur C2, un bloc avait changé de colonne — « Visibilité » est à droite
   dans la maquette, son remplaçant avait été posé à gauche. Ma relecture ne l'avait pas vu ; c'est
   une question du porteur qui l'a trouvé. Le comparatif écrit, lui, ne peut pas le manquer.)*
7. Vous donner **2 ou 3 gestes maximum** à tester en ligne, avec le résultat attendu.
8. Attendre votre confirmation avant le chantier suivant.
9. **Inscrire le chantier au §10** en même temps que le code, jamais après.

---

## 8. Pièges et façons de travailler

### Les tests : lesquels sont sûrs, lesquels ne le sont pas

| Commande | Sûr ? | Pourquoi |
|---|---|---|
| `npm run test:unit` (API) | ✅ **oui** | Le projet Jest `unit` n'a **ni `globalSetup` ni Prisma** — il n'ouvre aucune base. 472 tests, 16 suites. |
| `npm test` (API) | ⛔ **non** | Lance aussi l'intégration, qui **vide 24 tables**. Le garde-fou `test/garde-base-de-test.ts` l'arrête sans `TEST_DATABASE_URL` distincte. **Ne jamais le contourner.** |
| `npm run build` (API/web) | ✅ oui | `tsc` seul. |
| `npm run lint` | ✅ **oui** — *corrigé le 02/09* | La ligne d'origine (« aucun lint ne tourne sur ce dépôt », 27/08) est **fausse depuis le chantier 19** : `oxlint` tourne sur l'API et le web, `eslint` sur mobile, et le script racine les appelle explicitement — web et mobile étant hors du workspace pnpm, il n'atteignait avant que l'API. Base actuelle du web : **20 avertissements préexistants**, aucune erreur. |

**Une seule base Neon sert le local ET le site en ligne.** C'est ce qui a effacé la production le
23/08.

### Autres pièges

- Les **heredocs de plus de ~150 lignes échouent** dans ce shell → utiliser l'outil `Write`.
- `tsc` sur le web se lance **depuis la racine `apps/web`**, pas depuis `src/`.
- Le script de seed s'appelle **`prisma:seed`**, pas `seed`. Données de démo : `SEED_DEMO=true`.
- **Chaque cycle coûte un déploiement.** Grouper ce qui peut l'être, mais jamais au prix de la règle
  des 2-3 gestes.

---

## 9. Dettes à solder avant toute livraison

Aucune ne doit atteindre le client. **Toutes relues une à une le 01/09/2026 (chantier 19)** — chaque
ligne a été vérifiée dans le code, pas reprise de confiance. Trois l'ont été à tort par le passé :
la n°2 était notée à moitié soldée alors que le code n'avait pas bougé, la n°9 accusait un lint
absent partout alors qu'il tournait sur deux applications sur trois, et la n°10 ne comptait que les
alertes du web.

**Relues une seconde fois le 04/09/2026 (chantier 43), et le décompte de ce paragraphe était
faux.** Sur 24 lignes, 12 étaient closes et 12 « ouvertes » — mais **six d'entre elles n'attendaient
que moi** : trois portaient déjà leur propre réponse (n°8 tranchée par le porteur le 03/09, n°13
inventoriée et faite aux deux tiers, n°15 dont la recommandation était « ne rien faire ») et trois
étaient présentées comme des arbitrages alors qu'elles venaient avec une recommandation motivée
(n°23, n°24, n°25). *Présenter à répétition un travail comme une question est une façon de ne pas le
faire.* Les six sont soldées, assumées ou outillées le 04/09.

⚠️ **Trois lignes (n°8, n°13, n°15) n'avaient même pas de colonne « état »** — le tableau était
malformé, et personne, moi compris, ne l'avait vu en huit relectures. Corrigé.

**Ce qui reste au 05/09/2026 — 6 lignes, et AUCUNE n'est du code** : quatre gestes appartiennent au
porteur (changer son mot de passe, suspendre les comptes de démonstration, sauvegarder
`SECRETBOX_KEY`, et la n°20 qui dépend de la première), un seul arbitrage reste — le modèle
économique, qui est une décision d'entreprise — et l'hébergement est hors de portée du projet.

*(La n°24 figurait ici la veille comme « geste porteur, outillé ». Le porteur a demandé le recalcul
le 05/09 : il est appliqué, et vérifié sur le site en ligne.)*

| # | Sujet | État |
|---|---|---|
| 1 | **Identifiants du super-administrateur** — **révisé le 01/09.** Le secret 2FA `JBSWY3DPEHPK3PXP` (l'exemple public de la norme RFC) **n'existe plus** : le seed ne scelle plus aucun secret depuis le 20/08. Reste le mot de passe par défaut du seed, `Admin123!`, surchargeable par `SEED_ADMIN_PASSWORD`. ⚠️ **Render ne joue jamais le seed** — le compte en ligne a été créé à la main, et porte le mot de passe employé ce jour-là. | 🔴 **geste porteur** : le changer depuis « Mes paramètres », puis activer son TOTP |
| 2 | **MODE VITRINE — le « soignant virtuel » est RETIRÉ pour de bon (01/09).** Le journal du 28/08 le donnait pour parti ; en réalité **seule la ligne de `render.yaml` avait été retirée**, le code était intact : la production restait à une variable d'environnement de reprendre. `scheduleDevAutoConfirm` fabriquait un acteur portant l'`accountId` **du vrai médecin** et confirmait à sa place — une usurpation d'identité inscrite au journal d'audit sous son nom, sur une décision de soin qu'il n'avait pas prise. Sa raison d'être avait disparu depuis que C3 « Demandes » existe. **`MOMO_AUTOCONFIRM_MS` reste, et ce n'est pas un oubli** : la passerelle Mobile Money est une implémentation en mémoire, aucun agrégateur réel n'est choisi (ADR-09 ouvert) ; sans elle un paiement reste en attente à jamais. Elle simule le **payeur**, pas un professionnel : elle n'usurpe l'identité de personne. | ✅ **soldée le 01/09** pour le volet dangereux |
| 3 | **Comptes de démonstration** — `dr.nouveau`, `dr.armel`, `dr.solange`, `dr.firmin`, `patient.demo`, `pharma.demo`, tous en `demo1234`, dans `prisma/seed.ts`. `SEED_DEMO=false` empêche de les recréer ; ceux **déjà en base** ne partent pas tout seuls. | 🔴 **geste porteur** : les supprimer ou les bannir depuis E7 |
| 4 | **`ADMIN_REQUIRE_TOTP` — RETIRÉE le 01/09.** RM-01-06 (TOTP obligatoire pour toute action d'administration) est rétablie sur l'API en ligne. Le porteur l'a supprimée du tableau de bord Render ; elle était **aussi déclarée dans `render.yaml`**, d'où elle serait revenue toute seule au déploiement suivant si le service est un Blueprint — retirée là aussi. ⚠️ **Conséquence immédiate** : un compte d'administration **sans TOTP activé** reçoit désormais 403 sur toutes les routes admin. La sortie existe et n'est pas gardée : `/configuration-totp` dans l'application. | ✅ **soldée le 01/09** |
| 5 | **`SECRETBOX_KEY` sans sauvegarde** — perdue = pièces justificatives, messages et secrets 2FA définitivement illisibles. Procédure écrite le 25/08 (`procedure_sauvegarde_SECRETBOX_KEY.md`), et le code ne ment plus. **Les copies hors ligne restent à faire.** | 🟡 **geste porteur**, outillé |
| 6 | **Garde-fou de démarrage sur `SECRETBOX_KEY` — APPLIQUÉ le 01/09.** Sans clé valide, l'API scellait pièces, messages et secrets 2FA avec `sha256("ulamu-dev-secretbox")`, **une valeur écrite en clair dans les sources**, sans un mot : ce qui était scellé avec la vraie clé devenait illisible, et ce qui l'était ensuite ne protégeait plus rien. L'objection — « une panne partielle vaut mieux qu'une panne totale » — ne tenait pas : l'hébergeur **garde l'instance précédente** quand un démarrage échoue, donc un mauvais déploiement ne remplace rien ; et sans la clé, ULAMU n'est de toute façon pas utilisable (la connexion admin exige le TOTP, dont le secret est scellé). Le garde-fou ne s'applique qu'en production et dit quoi faire. **12 tests.** ⚠️ **Vérifiez la variable sur Render AVANT de pousser** : c'est le seul changement de ce chantier qui peut empêcher un déploiement de démarrer. | ✅ **soldée le 01/09** |
| 7 | **Hébergement hors du Congo** — la phrase est corrigée dans B3 (le pays desservi est distingué du pays d'hébergement). Ce qui reste n'est pas du ressort du code : héberger des données de santé congolaises hors du Congo peut exiger une base légale de transfert. | 🟡 hors code |
| 8 | **Tests d'intégration API à l'arrêt** — il manque une **branche Neon de test** et son `TEST_DATABASE_URL`. Tout le reste est prêt : le garde-fou `test/garde-base-de-test.ts` refuse de démarrer sans elle (et refuse aussi qu'on y recopie l'URL de production — le geste exact qui a effacé la base le 23/08), et `.env.example` porte la ligne à remplir. ⚠️ **Le porteur a tranché le 03/09/2026 : « pas de base test neon, tout doit se faire depuis la vraie base neon de l'app ».** La décision est donc prise, et elle est cohérente : une base de test coûte un abonnement, et le garde-fou qui refuse l'URL de production reste en place pour que personne ne contourne la règle. **Ce qui remplace ces tests** : les 24 tables qu'ils balayaient sont désormais couvertes par des tests unitaires sur doublures Prisma (chantiers 38 à 43). | ✅ **assumée le 04/09** — décision du porteur du 03/09, ce n'est plus une dette ouverte mais un choix, avec son remplacement |

🔴 **Le porteur a tranché le 03/09/2026 : il n'y aura pas de base de test.** « Pas de base test neon, tout doit se faire depuis la vraie base neon de l'app. » La conséquence est nette et elle est acceptée : **les sept suites d'intégration (53 tests) ne tourneront plus jamais.** Elles commencent par vider vingt-quatre tables ; les lancer sur la base du site effacerait comptes, consultations, ordonnances et journal d'audit — le geste exact du 23/08/2026.

**Ce qui a été fait à la place** : le garde-fou RESTE (c'est lui qui protège la base), et la couverture qui comptait a été réécrite en tests unitaires sur doublure de Prisma — voir la dette n°22, soldée le même jour. **Ce que ces tests ne prouvent pas** : ils vérifient la requête envoyée à Prisma, pas ce que Postgres en fait. Une contrainte d'intégrité, un index manquant, une transaction mal bornée leur échappent. C'est le prix d'une base unique, et il est assumé. | ✅ **TRANCHÉE le 03/09** — voir ci-dessous |
| 8bis | **La spécialité ne se déclare plus (01/09).** Le Badge Vérifié atteste d'une qualification **contrôlée sur pièces** ; tant que son titulaire pouvait réécrire sa spécialité, il n'attestait de rien — il suffisait d'être vérifié « généraliste » puis de se déclarer cardiologue. C2 l'affichait en lecture seule depuis le 27/08, mais **un écran ne ferme pas une porte** : la route restait ouverte à qui l'appelait directement. Le champ est retiré du DTO — le pipe global répond **400**, l'appel est refusé et non ignoré en silence — et retiré aussi du service, pour qu'aucun appel interne futur ne le réintroduise. Fermer ne prive personne : l'écran ne le proposait déjà plus. | ✅ **soldée le 01/09** · 📌 **dette née en échange** : une correction LÉGITIME n'a plus de chemin. Elle en demande un, administratif et journalisé, dans E7 |
| 8ter | **Le dernier titulaire d'un sous-rôle est protégé (01/09).** Rien ne l'empêchait : retirer le dernier administrateur Vérification ou Finance laissait le domaine sans personne. **Et la révocation n'était pas le seul chemin** — `assignAdminRole` fait un *upsert*, donc « Changer le rôle » vidait le sous-rôle tout aussi sûrement ; pire, un SUPER_ADMIN unique pouvait s'attribuer à lui-même un rôle moindre, et comme seul un SUPER_ADMIN attribue des rôles, **plus personne n'aurait jamais pu en attribuer** — administration irréparable sans écrire en base. La garde couvre les deux routes et les quatre rôles ; E4 le dit maintenant AVANT le clic, comme la maquette le prévoyait. 9 tests API + 3 tests web. | ✅ **soldée le 01/09** |
| 8quater | **L'adresse morte est remplacée par un formulaire (01/09).** `support@ulamu.cg` — domaine ni acheté ni relevé — figurait dans les mentions légales, **acceptées à l'inscription donc valant preuve**, et derrière « Écrire à l'administration » en C1. **Ni acheter un domaine, ni afficher une adresse personnelle** : une table `SupportRequest`, deux routes utilisateur, deux routes d'administration, un onglet « Aide » dans B3 et une file dans E7. **La réponse revient dans l'application** — c'est ce qui distingue un formulaire d'un trou noir, et un trou noir aurait été pire que l'adresse qu'il remplace. `SupportProcedure` trace ce qu'un administrateur a FAIT ; il manquait ce qu'un utilisateur DEMANDE. **8 tests API + 17 tests web.** *(Cette dette portait le même numéro « 8bis » que la précédente ; renumérotée pour lever l'ambiguïté.)* | ✅ **soldée le 01/09** |
| 9 | **Le lint — soldé le 01/09.** Le constat était faux : `eslint` **tournait** sur mobile et `oxlint` sur le web. C'est l'**API** qui déclarait un script `eslint` sans qu'eslint soit ni installé ni déclaré ni configuré — il n'avait jamais tourné. Passée à `oxlint`, comme le web : **5 avertissements, tous soldés**. Mobile : **13 erreurs, toutes soldées**. Et le script racine, qui prétendait tout couvrir, n'atteignait en fait que l'API — web et mobile sont hors du workspace pnpm par choix ; `lint`, `test` et `build` les appellent désormais explicitement. | ✅ **soldée le 01/09** |
| 10 | **Alertes `npm audit` — TOUT est à zéro (01/09).** Web : les 3 alertes `react-router` sont corrigées par une simple montée de patch (7.18.1 → 7.18.3, le correctif est publié en 7.18.2), plus une alerte `nanoid` transitive. **Rien n'est un mode RSC à ignorer : c'était réparable en une commande.** API : les 14 alertes de production (5 hautes) — `path-to-regexp`, `qs`, `body-parser`, `file-type` — **sont toutes tombées avec la montée en NestJS 11** (chantier 20). `npm audit` disait « exige NestJS 12 » ; c'était l'avis du résolveur, pas la vérité : **11 suffit**, et 12 s'avère de toute façon inatteignable (voir chantier 20). Les 2 dernières alertes, de développement seulement, sont tombées avec `npm audit fix`. **17 alertes → 0, dev compris.** | ✅ **soldée le 01/09** |

| ~~11~~ | ✅ **SOLDÉE le 02/09/2026 (chantier 31).** La désactivation est offerte dans B3 — mot de passe **et** code, comme le serveur l'exige. La recommandation d'alors était « ne rien faire pour l'instant, et le jour où quelqu'un le demande la vraie question sera *pourquoi* » : le porteur l'a demandé, et le pourquoi est venu avec — **D-053**, le TOTP n'est obligatoire pour aucun type de compte. *Cette dette a failli faire échouer la décision : sans ce chemin, « optionnel » n'aurait été qu'un mot.* | ✅ soldée |

| 12 | ✅ **TRANCHÉE le 02/09 (chantier 26) — le porteur retient l'issue (a) : la recherche payée de médicaments est RETIRÉE**, avec M11, M12 et la délivrance de M09. Les dettes 14, 15 et 16 ci-dessous en sont les conséquences. *Énoncé d'origine :* **Plus personne n'alimente le stock des pharmacies (née le 02/09, chantier 25).** En retirant `FACILITY_MEMBER` (D-051), on retire l'acteur qui tenait l'inventaire — `POST /v1/stocks/:facilityId/entries` et ses voisines n'ont plus d'opérateur. **Ce n'est pas une dette de code, c'est une dette de produit**, et elle touche le patient : son parcours « je cherche un médicament → je paie un dévoilement (PM-03, 500 XAF) → j'ai une réservation de 24 h » lit ce stock. Les données existantes ne disparaissent pas, elles **vieillissent** — et le patient paie pour une information qui se dégrade sans que rien ne le dise. Trois issues : (a) **retirer aussi la recherche payée de médicaments** du parcours patient — cohérent, mais c'est amputer M12 d'une fonctionnalité facturée ; (b) **la garder en disant son âge** — afficher la date de dernière confirmation de fraîcheur (`FacilityStockState.lastFreshAt` existe déjà, RM-11-05) et refuser le dévoilement au-delà d'un seuil : ~1 j, et l'écran cesse de mentir ; (c) **rendre un acteur au stock** sous une autre forme (l'administration saisit ? un import ?) — c'est un chantier, pas une correction. | ✅ **soldée le 02/09** — l'issue (a) a été retenue et APPLIQUÉE au chantier 26. *(La colonne disait encore « arbitrage porteur » : c'était l'état d'avant la décision, corrigé le 03/09.)* |
| 13 | **La fermeture complète de `FACILITY_MEMBER` demande un ménage en base (née le 02/09, chantier 25).** La valeur reste dans l'énumération Prisma, ses six règles dans la matrice M02, et les quatre `auditActorType` gardent leur cas. **Chacun pour une raison vérifiée** : retirer la valeur exige une migration sur la base de **production** (celle effacée le 23/08) et échouerait si une ligne la porte ; retirer les règles sans retirer `assertFacilityRight` donnerait deux vérités pour une même règle ; retirer le cas d'audit ferait inscrire l'action d'un humain comme `"system"` dans un journal **en insertion seule**, donc à jamais. L'ordre est donc contraint : **d'abord inventorier les comptes et adhésions en base, puis décider.** ✅ **Inventorié le 03/09** (`scripts/inventaire-structures.ts`, lecture seule) : **zéro compte `FACILITY_MEMBER`, zéro adhésion, zéro invitation.** ✅ **Deux des trois parts sont déjà faites** — le chantier 39 a supprimé les six règles de la matrice ET `assertFacilityRight` (plus aucune occurrence dans le code). **Reste la valeur de l'énumération, et je recommande de NE PAS la retirer**, pour deux raisons vérifiées le 04/09 : (a) PostgreSQL ne sait pas retirer une valeur d'un `enum` — il faut recréer le type, donc une migration lourde sur une base de **santé en production**, pour un gain nul, la valeur étant déjà inatteignable ; (b) surtout, **la table `facilityMemberProfile` est PORTANTE** — `m02.service.ts:179` y écrit le nom des comptes d'ADMINISTRATION (bootstrap du seed). La retirer effacerait le nom du super-administrateur. 📌 *Noté au passage, sans être corrigé : ce nom de table est un piège pour qui lira ce code plus tard — mais renommer une table, c'est une migration, et la même arithmétique s'applique.* | ✅ **assumée le 04/09** — inventoriée, deux parts sur trois faites, la troisième déconseillée avec sa raison |

✅ **L'inventaire a été fait le 03/09/2026** — `scripts/inventaire-structures.ts`, en lecture seule, contre la base de production :

| | |
|---|---|
| Comptes `FACILITY_MEMBER` | **0** |
| `FacilityMember` (adhésions) | **0** |
| `FacilityInvitation` | **0** |
| `OwnershipTransferIntent` | **0** |
| `Facility` | **3** |
| `FacilityMemberProfile` | **1** ⚠️ *c'est le nom du super-administrateur* |
| `VerificationCase` avec `facilityId` | **3** |
| `EarningsAccount` FACILITY | **0** |

**Ce que ces chiffres autorisent, et ce qu'ils interdisent.** Ils ont autorisé le retrait du code (chantier 39, dette n°17) : personne ne pouvait plus l'atteindre. Ils **interdisent** de retirer la valeur de l'énumération Prisma : une migration échouerait sur les 3 `Facility` et les 3 dossiers, et surtout `FacilityMemberProfile` **n'est pas une table de structure malgré son nom** — les comptes d'administration y écrivent leur identité (chantier 33). La vider effacerait le nom du seul administrateur de la plateforme.

**Recommandation inchangée, et maintenant chiffrée : ne rien migrer.** Le gain serait de quelques kilo-octets ; le risque, la production. | 🟡 **geste porteur**, non urgent — **inventorié le 03/09**, rien ne fuit, la porte est fermée |

| 14 | **Une ordonnance n'a plus de lecteur (née le 02/09, chantier 26).** Elle est toujours prescrite, scellée, consultable et annulable — mais elle ne peut plus être **servie** dans ULAMU : le scan du QR et la délivrance sont partis avec M11. Conséquences concrètes : les statuts `DISPENSED` et `PARTIALLY_DISPENSED` du modèle deviennent **inatteignables**, le compteur `qtyDispensed` reste à zéro à jamais, et C4 affiche donc un état d'ordonnance qui ne prendra jamais que trois valeurs sur cinq. Le patient montre son ordonnance sur son téléphone comme une ordonnance papier : elle reste **traçable et infalsifiable**, mais hors chaîne. ⚠️ **Ce n'est pas une régression à réparer, c'est le prix de la décision** — il est écrit ici pour qu'on ne le redécouvre pas comme un défaut. | ✅ **close le 03/09 comme CONSÉQUENCE, non comme dette** — rien à corriger : c'est le prix de D-052, écrit ici pour qu'on ne le redécouvre pas comme un défaut. Rouvrir la décision est la seule action possible, et elle appartient au porteur. |
| 15 | **Les tables de la pharmacie restent en base, sans lecteur (née le 02/09, chantier 26).** `Facility`, `StockItem`, `StockMovement`, `StockThreshold`, `FacilityStockState`, `Dispensation`, `DispensationLine`, `Reservation`, `ReservationLine`, `Disclosure`, `ReliabilityStrike`, `FacilityMember`, `FacilityMemberProfile`, `FacilityInvitation` — **aucun code ne les lit plus**. Les retirer demande une migration sur la base de **production**, celle effacée le 23/08, et l'ordre est contraint : d'abord inventorier ce qu'elles contiennent, ensuite décider. **Coût réel : elles ne coûtent que de la place** — aucune fuite, aucun chemin d'accès, aucune route. **Recommandation : ne rien faire pour l'instant.** Une migration destructrice sur une base de santé pour gagner quelques mégaoctets est un risque sans contrepartie ; à grouper le jour où une autre migration devra de toute façon être écrite. ⚠️ **Cette ligne était restée en rouge alors que sa propre recommandation disait « ne rien faire ».** Une dette dont la réponse étudiée est « rien » n'est pas une dette ouverte : c'est un choix. Elle est donc close comme telle, et rouvrable le jour où une migration passera par là. | ✅ **assumée le 04/09** — la recommandation était « ne rien faire », c'est appliqué |

✅ **Inventorié le 03/09/2026** (`scripts/inventaire-structures.ts`, lecture seule) : ces tables contiennent **3 `Facility`, 1 `FacilityMemberProfile`, et rien d'autre** — zéro adhésion, invitation, transfert. ⚠️ **Le `FacilityMemberProfile` porte le nom du super-administrateur** : malgré son nom, cette table n'est pas une table de structure. La recommandation « ne rien faire » est donc désormais chiffrée, et elle se renforce : le seul gain mesurable serait de supprimer 4 lignes. | 🟡 **geste porteur**, non urgent — **inventorié le 03/09** |
| 16 | **Le modèle économique n'a plus qu'une source de revenus (née le 02/09, chantier 26).** Le dévoilement — **500 XAF, PM-03** — était la seconde. Il reste la commission de consultation (10 %, PM-01). Le `modele_economique` du cahier pose **trois** conditions de viabilité au §5, dont *« les pharmacies tiennent leur stock à jour parce que les dévoilements amènent des ventes »* : ce pilier tombe entièrement. Le document porte un avertissement en tête et **n'a pas été réécrit** — refaire un modèle à une source demande de nouvelles hypothèses de volume et de point d'équilibre. ⚠️ **C'est un arbitrage de porteur, pas une correction de rédaction**, et il touche aussi le plan de sortie : sur ses sept critères de succès, **deux ne sont plus mesurables**. | 🔴 **arbitrage porteur** · **recommandation : reprendre le §5 du modèle économique avant toute présentation du projet** — c'est la première question qu'on posera |

| 17 | **La gestion des structures de M02 est inatteignable, mais toujours là (née le 02/09, chantier 26).** Neuf routes subsistent — créer une structure, inviter un membre, changer ses droits, le suspendre, transférer la titularité — et **plus aucun compte ne peut les appeler** : `createFacility` et `acceptInvitation` exigent `type === "FACILITY_MEMBER"`, type fermé depuis D-051. S'y ajoutent `PermissionsService.assertFacilityRight`, qui **n'a plus un seul appelant** depuis le retrait de M11 et de la délivrance, et la branche `FACILITY` du détenteur de gains dans M13. ⚠️ **M02 lui-même RESTE** : il porte aussi les sous-rôles d'administration (E4, `listAdmins`, `assignAdminRole`), qui sont dans le périmètre — c'est sa moitié « structures » qui est morte, pas le module. **Coût du retrait : ~450 lignes de service, 9 routes, leurs DTO et leurs tests, plus la branche M13.** ⚠️ Ce n'est pas un simple `rm` : `EarningsHolderType` et `subjectKind` du dossier de vérification portent encore `FACILITY`, et ces types décrivent ce que le serveur peut **renvoyer** sur des données existantes. ✅ **SOLDÉE le 03/09 (chantier 39).** ⚠️ **Le coût annoncé était sous-estimé de moitié** : ~450 lignes prévues, **1 261 supprimées** — parce que l'estimation ne comptait que le service, en oubliant le contrôleur, les DTO, `PermissionsService`, `m02.policies.ts` et ses 23 tests, et la suite d'intégration `chantier1.int.spec.ts` (8 tests, entièrement bâtie sur ce flux). **Ce qui a autorisé le retrait n'était pas une déduction** : `scripts/inventaire-structures.ts` (lecture seule, aucune écriture) a interrogé la base de PRODUCTION et répondu **zéro compte `FACILITY_MEMBER`** — fermer la porte d'entrée n'expulse pas ceux qui sont déjà dedans, et un compte antérieur au 02/09 se connecterait encore. **L'inventaire a aussi dit ce qui doit RESTER** : 3 structures, 3 dossiers de vérification qui en désignent une, et 1 `FacilityMemberProfile` — **celui-ci porte le nom du super-administrateur**. Les tables et les types restent donc ; c'est le code mort qui part. **Une dixième route a été trouvée par le relevé de routes et non à l'œil** : `GET /v1/me/facility/:id/dashboard`, cachée dans M16, qui comptait des *réservations* (sorties avec D-052) et répondait 403 à tous les coups. **API 515 ✓ · 160 routes, zéro de structure.** | ✅ **soldée le 03/09** |

| 18 | **Les intitulés des catégories de notification sont écrits DEUX fois (née le 02/09, chantier 30).** `NOTIFICATION_CATEGORIES` vit sur le serveur ; ses cinq intitulés en français sont recopiés à la main dans `SectionPreferences.tsx` (web) **et** `NotificationsScreen.tsx` (mobile), sans qu'aucune ligne ne soit partagée. C'est ce qui a fait qu'une même phrase fausse — « réservations qui expirent » — a demandé deux chantiers pour partir : le 29 pour le web, le 30 pour le mobile. **Deux vérités pour une même règle**, la dette que le chantier 11 nomme. Trois issues : (a) **le serveur sert les intitulés** dans `GET /v1/notifications/me/preferences` — le plus juste, mais il faudrait décider où vit le texte d'une interface ; (b) **un fichier partagé** dans `packages/contracts` — sauf que ni le web ni le mobile n'importent ce paquet aujourd'hui, par choix assumé (clients vendorés) ; (c) **un test qui compare les deux listes** et échoue si elles divergent — ne supprime pas la duplication mais la rend bruyante. ~~**Recommandation : (c)**~~ — **elle ne tenait pas.** ✅ **SOLDÉE le 03/09 par l'issue (a) : le serveur sert les intitulés.** En l'ouvrant, un constat qui a tranché la question : **les deux listes avaient DÉJÀ divergé** — « Consultations » (web) contre « Consultations & soins » (mobile), « Service » contre « Système & compte », « Paiements et gains » contre « Paiements & reçus ». Deux utilisateurs de la même plateforme ne lisaient pas le même nom pour le même réglage. Le test recommandé aurait donc échoué à sa première exécution **sans dire laquelle des deux formulations était la bonne**. `CATEGORY_LABELS` vit désormais dans `m14.templates.ts`, à côté du catalogue qu'il décrit — ce n'est pas une entorse à l'architecture mais sa cohérence : les TITRES et les CORPS des notifications y vivent déjà (EF-14-03). **Et un défaut de la même famille tombe avec** : `CATEGORIES_WITH_TEMPLATES` est *comptée* dans le catalogue, si bien qu'une catégorie sans modèle n'est plus jamais offerte. « Rappels » disparaît des DEUX applications à la fois — le web l'avait retirée à la main au chantier 29, le mobile l'affichait encore — et reviendra d'elle-même le jour où un premier rappel sera écrit. **API +10 tests · web +2 tests.** | ✅ **soldée le 03/09** |
| 19 | **`HeaderArt` est mort et appelle un site tiers (née le 02/09, chantier 30).** Le composant n'est monté par aucun écran, et il charge ses illustrations depuis `illustrations.popsy.co` — une dépendance réseau externe. Il ne porte **aucune promesse fausse** : il n'entrait donc pas dans le chantier 30, qui traitait les phrases. Son voisin `StepCarousel` a été retiré parce qu'il en portait une. **Coût : 8 lignes.** ✅ **SOLDÉE le 03/09.** Vérifié d'abord qu'aucun écran ne le monte (balayage de tout `apps/mobile/src`). Retirés avec lui : son style `headerArt` et l'import `SvgUri`, tous deux devenus orphelins — c'est le compilateur qui les a désignés, pas une supposition. **mobile 7 ✓ · types propres · lint à sa base (104 avertissements).** | ✅ **soldée le 03/09** |

| 20 | **L'administration n'est plus protégée que par un mot de passe, pour qui n'active pas le second facteur (née le 02/09, chantier 31).** D-053 rend le TOTP optionnel pour tous, comptes d'administration compris. **Ce n'est pas une dette de code — le code fait exactement ce qui a été décidé** ; c'est un risque à surveiller. ✅ **Deux des trois atténuations sont FAITES le 02/09 (chantier 32)** : (a) E4 montre qui a un second facteur actif et nomme « Mot de passe seul » ceux qui n'en ont pas — le risque est désormais **visible** ; (c) toute connexion d'administration sans second facteur s'inscrit au journal d'audit, dans la transaction de la session — le risque est désormais **traçable**. 🟡 **Reste (b)**, un rappel non bloquant à la connexion : non fait, et **ma recommandation est de ne pas le faire pour l'instant** — la visibilité dans E4 s'adresse à qui peut agir sur l'équipe, un rappel s'adresserait à chacun sur un choix qu'on vient de lui accorder. ⚠️ **Ce qui reste entier, et qui ne dépend pas de moi** : le mot de passe du super-administrateur en ligne n'a jamais été changé (dette n°1). Un mot de passe jamais changé plus aucun second facteur, c'est **une seule chose à deviner**. | 🟢 **surveillance outillée** ; reste la dette n°1 |

| 21 | **Le message d'erreur d'une requête est recopié dans huit fichiers (née le 03/09, chantier 37).** La ligne `const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')` figure **à l'identique** dans sept écrans d'administration et de soignant — et le centre de notifications en a ajouté une huitième, faute de point commun où la mettre. C'est exactement le motif que le chantier 36 a condamné sur les pluriels : **une règle recopiée est une règle qui dérive.** Le jour où la phrase de repli doit changer (une autre langue, un lien vers l'aide, un code d'incident), il faudra la retrouver huit fois. **Coût : ~30 min** — l'exporter depuis `lib/api.ts`, remplacer les huit déclarations, relancer la suite. Aucun risque : le comportement est identique, le compilateur signale toute erreur d'import. ✅ **SOLDÉE le 03/09.** ⚠️ **Elles étaient SEIZE, pas huit** : je n'avais compté que les écrans d'administration où je l'avais vue — *un compte fait de mémoire n'est pas un compte*. `lib/message-erreur.ts` porte la règle ; les seize déclarations sont parties, et avec elles quinze imports d'`ApiError` devenus orphelins, **désignés par le compilateur et non par une supposition**. Une nuance a été PRÉSERVÉE : l'onglet « Aide » disait « Votre demande n'a pas pu être envoyée », mieux choisi que le message général puisque l'utilisateur vient d'écrire un texte — la fonction partagée accepte donc un repli sur mesure. **Une uniformisation qui écrase une formulation mieux choisie n'est pas un progrès.** | ✅ **soldée le 03/09** |
| 22 | **Le centre de notifications du serveur n'a JAMAIS eu de test (née le 03/09, chantier 37).** Constaté en le branchant : ni test unitaire, ni test d'intégration ne touchait `listMine`, `markRead`, `deleteMine`, `deleteManyMine` ni `unreadCount` — cinq routes qui lisent et écrivent des données d'un compte, et dont la seule protection contre une fuite entre comptes est une clause `where`. Le chantier 37 en a couvert **une** (`markAllRead`, celle qu'il a écrite) avec une doublure de Prisma. **Les quatre autres restent nues.** ⚠️ La cause n'est pas la négligence : les suites d'intégration de l'API **vident la base**, et la base du projet est celle du site en ligne — elles sont donc à l'arrêt (dette n°8). **Coût : ~2 h** en tests unitaires sur doublure, sur le modèle de `m14.service.spec.ts` ; **~30 min** en tests d'intégration, mais seulement une fois la branche Neon de test créée. ~~**Recommandation : attendre la branche Neon**~~ — **caduque le jour même** : le porteur a décidé qu'il n'y aurait pas de base de test (dette n°8). Ce qui n'est pas éprouvé ici ne le sera nulle part. ✅ **SOLDÉE le 03/09** : les cinq routes sont couvertes sur doublure de Prisma, **19 tests**, dont le refus d'un curseur de pagination appartenant à un autre compte et le cloisonnement de la suppression groupée. **Vérifié en injectant la faute** : retirer `accountId` du `where` de `deleteManyMine` fait tomber un test. ⚠️ Ces tests vérifient la REQUÊTE envoyée à Prisma, pas ce que Postgres en fait — la limite est écrite en tête du fichier. | ✅ **soldée le 03/09** |

| 23 | **Un refus motivé pénalise le soignant autant qu'une demande ignorée (née le 04/09, chantier 40).** Le taux de confirmation se construit sur deux compteurs de `ProfessionalStats` : `initiationsTotal` monte **à la sollicitation**, avant toute réponse ; `confirmedTotal` ne monte qu'à la confirmation. **Un refus n'émet aucun événement de statistiques** — vérifié dans `m06.handshake.service.ts` (il n'émet qu'une notification et une ligne d'audit) et dans `m05.module.ts`, qui ne s'abonne qu'à quatre événements, dont aucun ne concerne le refus. ⚠️ **L'écran affirmait le contraire** (« un refus motivé, non ») ; la phrase est corrigée le 04/09 — l'écran dit désormais ce que le serveur fait. **Mais la question de fond reste ouverte, et elle est vôtre** : un refus rapide fait GAGNER du temps au patient, là où une expiration le lui fait perdre. Les traiter à l'identique décourage le seul des deux comportements qui rende service. Le cahier ne tranche pas — EF-05-01 parle d'un « taux de confirmation », sans un mot sur les refus. **Deux issues** : (a) **ne rien changer** — le taux mesure alors « ce médecin prend-il des patients ? », ce qui est défendable ; (b) **retirer les refus motivés du dénominateur** — un événement `m06.handshake.refused` de plus, un abonnement M05, un compteur `refusedTotal` pour garder la trace, ~2 h, **et un changement de ce que les patients lisent dans l'annuaire**. **Recommandation : (b)**, parce qu'un indicateur public doit récompenser le comportement qui sert le patient. | ✅ **soldée le 04/09 (chantier 43)** — l'issue (b) est appliquée : événement `m06.handshake.refused`, abonnement M05, compteur `refusedTotal`, migration **purement additive**. Le taux répond désormais à « quand ce médecin RÉPOND, dit-il oui ? ». ⚠️ **Une expiration pèse toujours** — seul le refus MOTIVÉ sort, et un test le garde. ⚠️ **Découvert en route : la formule était recopiée à la main dans TROIS fichiers** (`m05.policies.ts`, `m16.dashboard.service.ts`, `m16.kpi.service.ts`) ; changer la règle sans les unifier aurait fait dire deux chiffres différents à deux écrans pour un même médecin. Elle vit maintenant dans `confirmRate`, seule. La tuile B2 **dit son assiette** (« sur 7 demandes · refus non comptés ») — sans quoi le médecin ignorerait qu'il peut refuser sans se pénaliser. |
| 24 | **Les indicateurs publics des comptes de démonstration sont FABRIQUÉS (née le 04/09, chantier 40).** Lu dans la base de production : `dr.armel` porte **242 sollicitations, 234 confirmations, 215 avis** dans `ProfessionalStats`, alors que ses tables réelles contiennent **2 demandes (1 payée, 1 expirée), 1 consultation, 1 évaluation**. `prisma/seed.ts` écrit ces compteurs **directement**, sans passer par les événements. Conséquences : le tableau de bord **se contredit lui-même** — la tuile annonce 96,7 % quand le panneau juste en dessous, qui compte les vraies demandes, dit 1 menée à bien et 1 expirée (soit 50 %) ; et surtout **ces chiffres sont montrés aux PATIENTS** dans l'annuaire public (EF-05-01), où `dr.armel` affiche 4,8/5 sur 215 avis pour une seule évaluation réelle. Un patient choisit son médecin là-dessus. ⚠️ **Ce n'est pas un défaut de code** : l'écran lit fidèlement ce que le serveur sert. C'est la donnée qui est fausse. **Deux issues** : (a) **suspendre les comptes de démonstration** — c'est la dette n°3, et elle règle tout d'un coup, un compte suspendu quittant l'annuaire (RM-05-05) ; (b) **remettre les compteurs à leur valeur réelle** par un script (~30 min) — mais la vitrine afficherait alors 50 % et 1 avis. **Recommandation : (a)**, et c'est le geste que la dette n°3 réclamait déjà. ✅ **OUTILLÉE le 04/09 (chantier 43)** : l'issue (b) est écrite et éprouvée — `scripts/recalcul-indicateurs.ts` reconstruit les six compteurs depuis les tables réelles, **avec la règle exacte de chaque site d'émission** (jamais recopiée : l'échelle PM-13 est lue en base, le délai reprend le calcul de `m06.handshake.service.ts:286`). C'est le « recalcul quotidien » que la spec §5 de M05 réclamait et qui n'avait jamais été construit — il sert donc aussi à rattraper toute dérive future. **Vérité mesurée en production le 04/09** : 242→2 sollicitations, 234→2 confirmations, 215→1 avis ; **vu du patient, 96,7 % → 100 % et 4,8/5 sur 215 → 3/5 sur 1**. ⚠️ *Le taux réel est MEILLEUR que ce que cette dette annonçait (« 50 % ») : mon calcul d'alors comptait le statut final, alors que le compteur compte les CONFIRMATIONS — une demande confirmée puis expirée faute de paiement reste une réponse du médecin.* L'écriture en production a été **demandée par le porteur le 05/09** et lancée ce jour-là, après une passe en lecture seule et une sauvegarde `.json` des valeurs d'avant. | ✅ **SOLDÉE le 05/09/2026** — le recalcul a été appliqué à la base de production sur demande du porteur. **Vérifié en ligne** : `GET /v1/directory/8e3b1ec6…` sert désormais `rating {avg 3, count 1}` et `confirmRatePct 100`, au lieu de 4,8/5 sur 215 avis et 96,7 %. Le délai moyen de confirmation passe de 178 s à **17 s**, et le score de pertinence a suivi. Une seconde passe du script dit **« aucun écart »**. Valeurs d’avant conservées dans `scripts/.sauvegarde-indicateurs-2026-09-05T12-59-33-057Z.json` (hors dépôt, ignoré par git). ⚠️ **La dette n°3 reste ouverte pour une autre raison** : ces comptes de démonstration sont toujours dans l’annuaire public, avec des chiffres désormais VRAIS mais minces — un patient peut encore tomber sur un médecin qui n’existe pas. |

| 25 | **Un soignant révoqué par erreur ne peut plus jamais être rétabli (née le 04/09, chantier 42).** Constaté en construisant le bouton de révocation : `LEGAL_TRANSITIONS.REVOKED` vaut `[]` — le statut est **terminal** — et `VerificationCase.professionalId` est `@unique`, donc un professionnel n'a **qu'un dossier, à vie**. Une révocation prononcée à tort ferme donc définitivement l'accès de ce soignant à la plateforme : il ne peut ni re-déposer, ni ouvrir un nouveau dossier, ni être vérifié de nouveau. **La seule issue serait une écriture directe en base.** ⚠️ Ce n'est pas un défaut de code — le serveur fait exactement ce qui a été spécifié (EF-03-08). C'est une **absence de voie de recours** sur une décision humaine, et les humains se trompent. L'écran l'annonce désormais en toutes lettres avant le clic, et exige une confirmation tapée : c'est tout ce que l'interface peut faire. **Deux issues** : (a) **ouvrir la transition `REVOKED → IN_REVIEW`** dans `m03.policies.ts`, réservée au super-administrateur, avec motif et journal — ~3 h, et le dossier reprend son cours normal ; (b) **assumer l'irréversibilité** et le documenter comme une garantie (une révocation est définitive, c'est ce qui lui donne son poids). **Recommandation : (a)**, parce qu'une plateforme de santé ne peut pas faire dépendre la carrière d'un soignant de l'absence d'erreur d'un administrateur. | ✅ **soldée le 04/09 (chantier 43)** — l'issue (a) est appliquée : `REVOKED → IN_REVIEW`, `POST /admin/verification/:id/reinstate` **réservée au SUPER_ADMIN** (l'examinateur qui révoque ne se dédit pas lui-même), motif obligatoire, notification et journal. **Elle ne rend pas le badge** — elle remet le dossier en examen, et l'écran le dit. ⚠️ **Deux phrases du chantier 42 sont devenues fausses le jour même** (« aucun moyen de le rétablir ») : corrigées, et c'est un test qui l'a signalé en tombant seul de toute la suite. |

| 26 | **Le code de transfert d'un Carnet ne peut pas se dicter (née le 06/09, chantier 48).** Pour revendiquer son Carnet à sa majorité, le majeur doit recevoir de son tuteur **deux UUID** (`subProfileId` et `intentId`, 73 caractères réunis) puis un OTP à six chiffres. Le mobile les réduit à une seule chaîne partageable, et ça marche — **par SMS ou WhatsApp**. Mais le cas le plus fréquent est que les deux personnes soient **dans la même pièce**, et 73 caractères ne se dictent pas. **Issue** : que `claim/start` émette en plus un **code court** (8 caractères, durée de vie PM-17), stocké sur `SubProfileClaimIntent` et accepté par `claim` à la place de l'`intentId` — migration additive, ~2 h. **Recommandation : le faire**, c'est ce qui rend le geste utilisable sans réseau tiers. | ✅ **soldée le 06/09 (chantier 49)** — `SubProfileClaimIntent.shortCode`, huit signes d'un alphabet **sans aucune paire douteuse** (ni 0/O, ni 1/I/L, ni U — les DEUX membres de chaque paire exclus), migration additive, et une route `POST /sub-profiles/claim-by-code` **où le sous-profil n'est plus dans l'URL** : le code le désigne à lui seul. Le code est **effacé à la consommation** — un code servi cesse d'exister. Le chemin d'origine reste servi. |

| 27 | **Aucun client ne peut lire un paramètre métier (née le 06/09, chantier 48).** Les PM-xx ne sortent que par `GET /v1/admin/parameters`, réservé au super-administrateur. Conséquence constatée sur l'écran du Carnet familial : l'application **ne peut pas savoir à quel âge un transfert devient possible** (PM-16). Elle propose donc le geste à tous et laisse le serveur refuser en nommant l'âge — correct, mais l'utilisateur découvre la règle par un refus. ⚠️ **Recopier la valeur serait pire** : l'écran mentirait le jour où le paramètre change, et c'est exactement la dérive que le projet combat. **Issue** : une route publique en LECTURE SEULE sur une **liste blanche** de paramètres non sensibles (PM-16 l'âge, PM-13 l'échelle de notation, PM-07 le délai de confirmation) — ~1 h. **Recommandation : le faire** ; d'autres écrans buteront sur la même chose. | ✅ **soldée le 06/09 (chantier 49)** — `GET /v1/parameters`, publique, en lecture seule, bornée à une **liste blanche de trois clés ouvertes une par une avec leur raison** (PM-16, PM-13, PM-07). Publique et non authentifiée à dessein : l'âge minimum est opposé au visiteur AVANT toute session. **Employée aussitôt** là où la dette est née — l'écran du Carnet familial lit l'âge requis et grise les personnes trop jeunes ; si la lecture échoue, **il ne bloque rien** et laisse le serveur trancher. |

### Trois dérives documentaires jamais arbitrées

| Le cahier dit | Le code fait |
|---|---|
| OTP par **SMS** (EF-01-01) | par **email** (Brevo) |
| Connexion par **téléphone** (EF-01-03) | nom d'utilisateur **ou** email |
| ~~TOTP **optionnel** pour les pros (RM-01-06)~~ | ✅ **soldée une seconde fois le 02/09 (chantier 31).** Le chantier 24 avait aligné l'ÉCRAN sur la règle d'alors — « obligatoire pour l'administration », « recommandée » pour un soignant. **D-053 change la règle elle-même** : le TOTP n'est obligatoire pour personne, et B3 dit la même phrase à tout le monde. La distinction par rôle a disparu du produit. |

---

## 10. Journal des chantiers

*Rempli au fur et à mesure, en même temps que le code — jamais après.*

| N° | Chantier | Poussé le | Confirmé par le porteur |
|---|---|---|---|
| — | *⚠️ **Les chantiers 1 et 2 n'ont pas été confirmés à l'écran.** Proposé deux fois, le porteur a choisi de poursuivre — c'est sa décision, elle est notée ici et non re-discutée. Conséquence à connaître : si un défaut visuel existe sur la coquille, il se propage à TOUS les écrans suivants, puisqu'ils vivent dedans.* | | |
| **1** | **B1 — la coquille + la présence + le plafond + le rideau** — codé le 27/08. Serveur : **S7**, PM-27 servi au professionnel dans `GET /v1/presence/me` (~15 l. + 4 tests) — ajout **non prévu**, voir ci-dessous. Web : `usePresence` (battement 5 min), `useSessionsEnCours`, `IndicateurPresence`, `RideauConfidentialite`, ligne d'identité corrigée. **API 476 ✓ · web 174 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **2** | **C2 — Ma vitrine** — codé le 27/08. Serveur : **S8**, `GET /v1/offers/limits` sert PM-09/PM-06/PM-25 + mon compte d'offres actives (~25 l. + 4 tests). Web : écran **entièrement réécrit** sur la forme mesurée (2 colonnes, 968 px + rail d'aperçu de 320 px), « Ce que les patients voient » alimenté par la vraie route publique, `CarteAnnuaire.tsx` supprimée (orpheline). **API 480 ✓ · web 179 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **3** | **C3 — Demandes** — codé le 27/08. **Serveur : aucun.** Web : trois **onglets** comptés à la place des trois cartes empilées, **anneau** de décompte avec ses seuils (ambre 2 min, rouge 1 min), bloc « Ce qui se passe ensuite », heure de réception restaurée, antécédents et référence retirés. **API 480 ✓ · web 187 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **4** | **C5 — La consultation** — codé le 28/08. Serveur : **S1**, `reportDueAt` (`endedAt` + PM-30) sur la vue de séance ET sur les lignes du registre (~10 l. + 4 tests). Web : **Carnet du patient** au rail, fil porté au niveau du mobile (répondre, réagir, modifier, supprimer pour moi / pour tous, séparateurs de jour, regroupement, saut au message cité), décompte réel du compte-rendu, avertissement de remboursement **avant** la perte, « Terminer » → « Prolonger », composeur en pilule. **Un bug corrigé au passage : `deleteSessionMessage` partait sans corps** et se faisait refuser en 400 — le bouton « supprimer » n'avait jamais rien supprimé. **API 484 ✓ · web 203 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **5** | **C7 — Ordonnance** *(écran neuf)* + garde-fou allergies — codé le 28/08. Serveur : **aucun code**, mais **la seule écriture en base de toute la reconstruction** — référentiel porté de **6 à 64 médicaments**, par un script dédié (`scripts/referentiel-medicaments.ts`), **appliqué en base le 28/08**. Web : panneau C7 ouvert depuis le rail de C5, recherche au référentiel, repli texte libre marqué « non vérifié », garde-fou allergies avec ses deux issues, avertissement d'immuabilité avant le bouton, QR + échéance après scellement, annulation motivée. **Trois corrections dans `api.ts` :** `PrescriptionLineInput` n'avait ni `qtyPrescribed` (obligatoire au serveur) ni `durationDays`, `createPrescription` était typée `{ id }` au lieu de l'ordonnance complète, et `cancelPrescription` n'existait pas. **API 484 ✓ · web 217 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **6** | **C4 — Consultations** (le registre) — codé le 28/08. Serveur : **S9**, `orderRef` sur les lignes du registre (**2 lignes**) — la clé qui relie une consultation à son mouvement au journal des gains. Web : écran **refait sur la forme mesurée** — trois tuiles, trois onglets comptés, **un tableau** à la place des cartes empilées. Honoraires **lus au journal**, jamais calculés. Plus aucun délai écrit. Colonnes « mode » et « patient » retirées, statut d'ordonnance à la place de « suivi en officine », proposition de suivi annoncée. **API 484 ✓ · web 226 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **7** | **C6 — Mes gains** — codé le 28/08. Serveur : **S2** (brut + commission joints depuis la part de paiement, ~35 l. + 5 tests) et **S3** (délai PM-36 dans le récapitulatif de retrait, 3 l.). Web : détail brut/commission/taux **déduit** sur chaque mouvement, décompte du mois, histogramme des six mois, trois onglets comptés, avertissement D-008 près du solde en attente, délai annoncé avant confirmation. **Et une brèche du harnais de tests fermée : la suite web appelait la vraie API de production.** **API 489 ✓ · web 239 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **8** | **C1 — Ma vérification, le contrat, l'avenant** — codé le 28/08. Serveur : **S4**, `lastSigned` dans `GET /v1/verification/me` (~15 l. + 7 tests) — la dernière version réellement signée, pour montrer l'ancien taux à côté du nouveau. Web : **parcours de re-signature** (bandeau de conséquence, ancien → nouveau taux côte à côte, texte relu, bouton qui dit ce qu'on regagne), taux lu du contrat, versement mensuel retiré, **promesse de réponse « sous 24 h ouvrées » retirée**. **API 496 ✓ · web 249 ✓ · builds propres.** ⚠️ Le parcours d'avenant ne se déclenche qu'avec **E3** (chantier 14). | ⏸ en attente | ⏸ |

| **9** | **B2 — Tableau de bord** — codé le 01/09. **Serveur : aucun.** Web : deux des quatre tendances de la maquette **sont devenues calculables** depuis `lastSixMonths` (consultations et gains, d'un mois sur l'autre) et sont affichées ; les deux autres restent absentes, faute de série. Ajouté : « N expirent dans moins de 2 h », le compte à rebours servi par le serveur, la fiche anonymisée (prénom + âge) dans la file, et le bloc « ce que deviennent vos demandes » à la place d'une répartition par mode qui n'existe pas. **API 496 ✓ · web 262 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **10** | **B3 — Mes paramètres** — codé le 01/09. **Serveur : aucun.** La phrase d'hébergement, que le plan annonçait comme le piège de ce chantier, **était déjà corrigée** — B3 n'a pas été reconstruit depuis la maquette, il a été relu. Ajouté : la **densité d'affichage**, qui manquait et qui fait réellement quelque chose ; le pays d'hébergement distingué du pays desservi ; l'identifiant réel du compte. L'adresse de support est **centralisée en un point**, avec sa dette écrite. **API 496 ✓ · web 268 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **11** | **E1 — File de vérification** — codé le 01/09. **Serveur : aucun.** Web : coquille refaite sur la forme mesurée — quatre tuiles, quatre onglets comptés, **un tableau** à la place d'une colonne de 320 px, et l'examen en panneau. Onglet « Tranchés » ajouté (deux appels, la route ne filtrant que sur un statut). « 72 heures **ouvrées** » corrigé. Le composant d'examen, lui, **n'a pas été touché** : il était juste. **API 496 ✓ · web 271 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **12** | **E7 — Comptes + procédures support** *(écran neuf)* — codé le 01/09. **Serveur : aucun.** Web : recherche de comptes, suspension / réactivation / **demande** de bannissement, chacune motivée ; **procédures support** (exigence MVP jamais construite) avec leurs étapes à cocher. **Deux corrections dans `api.ts` :** `AdminAccount` décrivait `{ id, username }` là où le serveur renvoie `accountId` et `displayName`, et `searchAccounts` promettait `{ items }` pour un tableau nu. **API 496 ✓ · web 287 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **13** | **E2 — Supervision financière** *(écran neuf)* — codé le 01/09. **Serveur : aucun.** Web : file des remboursements à trancher avec la garde d'auto-validation dite sur la ligne, historique, et le **rapprochement** lancé à la demande avec son rapport. Le seuil de double validation est **lu de PM-35**, jamais écrit. Les trois faussetés de « écart non instruit sous 7 jours » corrigées. **API 496 ✓ · web 303 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **14** | **E3 — Paramètres métier** *(écran neuf)* — codé le 01/09. Serveur : **S5**, `GET /admin/parameters/:key/impact` (~12 l. + 6 tests) — le nombre de contrats signés qu'un changement de taux ré-éditerait, **lu avant de le faire**. Web : tableau des paramètres servis, historique par clé, formulaire de changement motivé, et la **case morale remplacée par les conséquences chiffrées**. Le préavis de 30 jours retiré. **API 502 ✓ · web 316 ✓ · builds propres.** ⚠️ **Avec le chantier 8, cette fonctionnalité est complète** : E3 déclenche l'avenant, C1 le re-signe. | ⏸ en attente | ⏸ |

| **15** | **E4 — Administrateurs** *(écran neuf)* — codé le 01/09. **Serveur : aucun.** Web : les quatre sous-rôles réels comptés, un tableau **à une pastille par ligne** (et non une matrice de cases), changement de rôle motivé, révocation avec la protection du compte courant, **journal des habilitations** lu du journal d'audit, et la création reléguée au second plan avec sa phrase honnête sur le mot de passe. Ajouté à `api.ts` : la lecture du journal d'audit, qu'aucun écran n'utilisait. **API 502 ✓ · web 333 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **16** | **E5 — Pilotage** *(écran neuf)* — codé le 01/09. Serveur : **S6**, `GET /admin/coverage` (~40 l. + 9 tests) — les effectifs par arrondissement, **comptés** et non écrits. Web : les sept critères du pilote avec leur cible, l'intégrité du journal, la couverture triée du mieux au moins couvert, et le tableau des délais réduit à ses **deux lignes vraies**. **API 511 ✓ · web 349 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **17** | **E6 — Signalements** *(écran neuf)* — codé le 01/09. **Serveur : aucun.** Web : file triée comme le serveur la trie, détail sans identité du signaleur **et l'écran le dit**, les quatre issues réelles avec ce que chacune fait — dont deux qui **transmettent** au lieu de trancher. La chronologie inventée, les antécédents comptés et les sanctions directes sont retirés. **API 511 ✓ · web 367 ✓ · builds propres.** **Le palier F est terminé : les 17 écrans du plan sont construits.** | ⏸ en attente | ⏸ |

| **17bis** | **Les listes déroulantes** — codé le 01/09. **Serveur : aucun.** Les dix listes natives des huit écrans concernés remplacées par `components/ulamu/Liste.tsx`, bâtie sur Radix : le menu ouvert suivait jusque-là le thème du **système** — fond blanc en thème sombre, surlignage bleu, coins carrés — et une option ne pouvait porter qu'une ligne, si bien que l'explication d'un choix vivait SOUS le champ et ne décrivait que l'option déjà sélectionnée. **web 377 ✓.** | ⏸ en attente | ⏸ |

| **18** | **Relecture visuelle des 16 écrans** — 01/09. **Serveur : aucun.** Seize écrans passés en revue à trois largeurs et deux thèmes, dans les quatre états. **Sept défauts trouvés, sept corrigés**, dont deux qu'aucun test n'aurait vus : le **tiroir mobile ne quittait jamais l'écran** (il recouvrait les deux tiers de la page, `inert`, donc muet, sur les seize écrans à la fois) et **aucune limite d'erreur React** n'existait — deux écrans sur seize ont fait page blanche pendant la revue. Ajouté : `GardeFou`, le suivi réel du thème système, un titre et un repère de page sur les quatre écrans d'entrée, et la fin des **comptes affichés à zéro pendant une panne**. **web 402 ✓ · types et lint propres.** | ⏸ en attente | ⏸ |

| **19** | **Les dettes du §9** — 01/09. Treize dettes relues **dans le code**, pas sur parole : trois étaient mal décrites. **Sept soldées.** Le **soignant virtuel** retiré pour de bon (il usurpait l'identité du médecin ; seul `render.yaml` avait bougé le 28/08, le code était intact) · la **protection du dernier titulaire d'un sous-rôle** sur les deux routes qui pouvaient la vider, dont un cas d'administration **irréparable** que la dette ne décrivait pas · le **lint** qui n'avait jamais tourné sur l'API · les **alertes npm du web à zéro** · le **refus de démarrer sans clé de chiffrement valide** · la **spécialité fermée côté serveur** · et `support@ulamu.cg`, adresse morte, **remplacée par un formulaire** — la première migration de schéma de la reconstruction. Reste : cinq gestes du porteur (Render, Neon) et **14 alertes de production sur l'API qui exigent NestJS 12** — constat nouveau. **API 541 ✓ · web 422 ✓ · mobile 7 ✓ · lint racine vert · builds propres.** | ⏸ en attente | ⏸ |

| **20** | **NestJS 10 → 11** — 01/09. Les 14 alertes de sécurité de production **tombent toutes**, et l'audit passe à **0, dev compris** (on partait de 17). `npm audit` réclamait NestJS 12 : **11 suffisait**, et 12 est de toute façon **inatteignable** — `@nestjs/throttler`, dans sa dernière version publiée, ne déclare la compatibilité que jusqu'à 11, et c'est lui qui limite les tentatives sur la route OTP. Le saut emporte **Express 4 → Express 5** (`path-to-regexp` v0.1 → v8), qui réinterprète tous les chemins : les **192 routes ont été relevées avant et après, elles sont identiques au caractère près**. Ajouté : `app.boot.spec.ts`, qui **démarre réellement l'application** — ce qu'aucun des 541 autres tests ne faisait. **API 554 ✓ · lint propre · build propre.** ⚠️ **NestJS 11 exige Node ≥ 20** : vérifier `NODE_VERSION` sur Render avant de pousser. | ⏸ en attente | ⏸ |

| **21** | **Le responsive de toute la plateforme** — 01/09. **Serveur : aucun.** Le chantier 18 mesurait les DÉFAUTS (débordement, rognage, recouvrement) et ignorait délibérément ce qui vit dans un conteneur à défilement : les **tableaux** passaient donc au travers. Mesuré ici : à 375 px, C4 cachait **549 px** hors écran, E1 529, E3 429, E4 389 — et la barre d'onglets de B3 en cachait **471**, soit trois onglets sur cinq. À 768 px, C4 en cachait encore 214 : le point de bascule n'est pas `md`, c'est **1024 px**. Correction en **CSS seule** : les cinq tableaux deviennent des cartes, chaque cellule affichant le nom de sa colonne. Le balisage ne change pas — **les 422 tests passent sans une modification**. **web 442 ✓ · lint propre · build propre.** | ⏸ en attente | ⏸ |

| **21 bis** | **Les trois trous du responsive** — 01/09, après une question directe du porteur. Le chantier 21 n'avait mesuré que l'état par défaut de 17 écrans, à 375 et 768 px. Ajoutés : les **écrans d'entrée**, tout ce qui **s'ouvre au clic**, et la largeur **320 px**. Trois défauts trouvés, dont deux qu'aucune émulation ne montre : la coquille en `h-screen` (= 100vh) mettait le **composeur de messages sous la barre du navigateur**, sans moyen d'y accéder ; **tous les panneaux latéraux faisaient 384 px au lieu de 672** parce qu'un sélecteur `data-[side=…]` battait la classe demandée par l'écran ; et l'**activation 2FA pouvait tomber en entier** sur une réponse inattendue, sur un écran devenu obligatoire. **web 447 ✓ · lint propre · build propre.** | ⏸ en attente | ⏸ |

| **22** | **Les squelettes de chargement** — 01/09. **Serveur : aucun.** La charte l'exigeait déjà (`.ul-shimmer`, « CG-08 §06 »), **deux écrans sur vingt-quatre** l'appliquaient. Les **22 attentes de DONNÉES** passent du rond qui tourne à une forme qui dit ce qui arrive et **réserve la place** ; les **23 ronds de boutons ne bougent pas** — une action qu'on déclenche n'a aucune forme à annoncer. Six formes dans `components/ulamu/Squelette.tsx`, dont le tableau qui suit la bascule en cartes de 1024 px. Le piège était l'accessibilité : un squelette est muet, chacun garde donc sa phrase en `sr-only` sous `role="status"` — c'est ce qui a permis aux **447 tests de passer sans une modification**. Trouvé en chemin : le squelette du tableau de bord n'annonçait **rien du tout**. **web 482 ✓ · lint propre · build propre.** | ⏸ en attente | ⏸ |

| **23** | **Le code mort** — 01/09. **Serveur : aucun.** *(Ligne écrite le 02/09 : ce chantier avait été poussé sans être inscrit ici — le §7 le demande « en même temps que le code, jamais après », et c'est la règle qui a sauté, pas le chantier.)* « Supprimer le code mort » visait deux fichiers ; un parcours réel des importations depuis `main.tsx` et `App.tsx` en a trouvé **56, pour 6 923 lignes**. Huit sont partis — ceux que le projet avait écrits lui-même — avec la CSS devenue orpheline (`.ul-btn*`, `.ul-state*`, `.ul-steps*`, `@keyframes ul-spin`). **Une chose a été sauvée avant la suppression** : `Stepper.tsx` portait un résumé accessible — « Étape 3 sur 5 » — qu'`EtapesAuth` n'avait pas ; ses pastilles s'annonçaient une à une sans jamais dire combien il en restait. `Field.tsx` n'a **pas** été touché : mort dans l'application, entretenu par son test — décision au porteur. **web 485 ✓ · lint propre · build propre.** | 01/09 (`59dcb81`) | ⏸ |

| **24** | **Ce que les écrans disent de la double authentification** — 02/09. **Serveur : aucun.** Trois faussetés, dont deux **vérifiées sur le site en ligne avant correction**. (1) `index.html` déclarait `lang="en"` sur une application servie **en français seul** — une synthèse vocale lisait donc du français avec une voix anglaise. (2) Les **six branches d'échec** de l'administration offraient « Réessayer », geste qui ne peut pas aboutir sous RM-01-06, et **ne nommaient jamais la sortie** — `/configuration-totp`, qui existe et n'est pas gardée. (3) B3 annonçait à **tout le monde** « Obligatoire sur ULAMU — elle ne peut pas être désactivée » : vrai pour un administrateur (`disableTotp` répond 403 sur `type === "ADMIN"`), **faux sur ses deux moitiés pour un soignant**. Ajouté : `RappelTotpAdmin` (bandeau posé **hors** de la limite d'erreur, pour survivre à un écran qui tombe), le hook `useTotpAdminManquant`, et `ActionApresEchec`. **Une étape a été abandonnée en cours de route** — voir ci-dessous. **web 497 ✓ (485 + 12) · types propres · lint à sa base (20 avertissements préexistants, aucun nouveau).** | ⏸ en attente | ⏸ |

| **25** | **Trois acteurs, deux sur le web** — 02/09. **Décision du porteur, inscrite au cahier sous D-051.** `FACILITY_MEMBER` — le membre de structure — **sort du produit**. Serveur : la route publique `POST /v1/accounts/register/facility-member` retirée, avec son DTO et sa méthode de service (**~100 lignes**) : plus aucun compte de ce type ne peut naître. Web : capacité `facility`, « Espace officine », le tableau de bord officine (**70 lignes**), la branche morte d'inscription gardée par un `true` littéral, et **172 lignes de client API sans appelant** — dont les 16 méthodes de structure, de stock et de scan d'ordonnance, qu'aucun écran n'appelait déjà. Documentation : **D-051 inscrite**, D-003 et D-004 marquées remplacées sur le volet compte, le glossaire, la vision, la carte des domaines, les plans de modules et de releases, quatre spécifications de module et le persona P7. **Ce qui NE part pas, et pourquoi : la pharmacie reste un objet du modèle** — `m12.disclosure.service.ts` importe `StockAvailabilityService` de M11, donc la recherche de médicaments du patient en dépend, et le patient est dans le périmètre. **web 497 ✓ · API 554 ✓ · mobile 7 ✓ · types propres · builds propres · lint web **20 → 19 avertissements** — le `no-constant-condition` de `RegisterPage` est parti avec la branche morte qu'il signalait.** | ⏸ en attente | ⏸ |

| **26** | **La chaîne du médicament sort du produit** — 02/09. **Décision du porteur, inscrite au cahier sous D-052** : ULAMU ne garde que les modules de son périmètre — patient, médecin, administration. Suite directe de la dette n°12 ouverte au chantier 25 ; le porteur retient son issue (a). Retirés : **M11 Stocks** (7 fichiers, 1 330 l.) · **M12 Recherche & dévoilement** (7 fichiers, 1 843 l.) · la **délivrance de M09** (scan + dispense + son service) · l'écran mobile « Médicaments » (376 l.), sa route, sa tuile, 6 méthodes d'API et 11 types · l'arbitrage des strikes et son balayage dans M16 · **2 des 7 KPI du pilote** et le compte des officines dans la couverture · **12 modèles de notification** sans émetteur · les pharmacies de démonstration du seed. **Ce qui NE part pas : le référentiel médicaments.** `GET /v1/medicaments` **change de module (M12 → M09) sans changer d'adresse** — son exigence était EF-09-02 depuis toujours, et sans lui le médecin ne peut plus prescrire qu'en texte libre, donc **sans garde-fou allergies**. **API 484 ✓ · web 498 ✓ · mobile 7 ✓ · types, lint et builds propres.** | ⏸ en attente | ⏸ |

| **27** | **Six promesses que le nettoyage avait manquées** — 02/09, **après vérification en ligne**. Le chantier 26 était poussé, déployé, les routes retirées répondaient 404 et les trois suites étaient vertes. **Six phrases avaient survécu, et elles étaient en production.** Le carrousel des écrans d'entrée annonçait « Réservez vos médicaments tout près » et « Retirez-les en pharmacie en toute confiance » — sur le PREMIER écran, celui qui décide si quelqu'un s'inscrit. Le QR de l'ordonnance disait, côté médecin, « Le patient présente ce code en pharmacie », et côté patient « Le pharmacien scanne ce code : il voit les lignes et quantités restantes ». **Aucun test ne pouvait les attraper : ce n'est pas du code, ce sont des promesses.** Corrigé : deux diapositives retirées (web et mobile — les carrousels sont dérivés de `SLIDES.length`, rien d'autre à toucher), le QR redit pour ce qu'il EST (un sceau d'intégrité) et non pour ce qu'il n'est plus (un ticket de retrait), et `promesses.test.ts` verrouille les faits — jamais le vocabulaire. **web 501 ✓ (498 + 3) · API 485 ✓ · mobile 7 ✓ · types propres · build propre · lint 19.** | ⏸ en attente | ⏸ |

| **28** | **Une phrase visible avait survécu à trois chantiers** — 02/09, trouvée en vérifiant en ligne le chantier 27. L'écran de connexion annonçait encore, **en toutes lettres**, « Connectez-vous à votre compte ULAMU — professionnels, **structures** et administration ». Le chantier 25 avait pourtant ouvert ce fichier : il en avait corrigé le **commentaire d'en-tête** et laissé la phrase **affichée**, trois lignes plus bas. Corrigé aussi : E6 illustrait l'anonymat du signaleur par « un praticien, une officine » — on ne peut plus signaler une officine ; et trois commentaires devenus trompeurs (le « poste d'officine » de A3, la règle « qui ne vise que les pharmacies » de B2). **Et un ajout qui va dans l'autre sens** : E1 garde « Structure » pour nommer un dossier hérité, avec un test qui l'exige — retirer la branche afficherait un vide sur un dossier que la base contient encore. `promesses.test.ts` gagne un second bloc qui lit ce que les écrans **disent** du périmètre, plus seulement ce qu'ils importent. **web 504 ✓ (501 + 3) · types propres · build propre · lint 19.** | ⏸ en attente | ⏸ |

| **29** | **Deux réglages qui ne réglaient rien, et un test qui s'était désarmé** — 02/09, trouvés par un balayage **systématique du bundle déployé** au lieu d'un contrôle de ce qu'on venait de corriger. B3 « Aide » offrait encore le sujet « **Ma structure · Titulaire injoignable** » — une demande qu'aucun administrateur ne saurait traiter, la procédure ayant été retirée d'E7 le même jour. B3 « Préférences » proposait de couper les « Rappels — échéances de vérification, **réservations qui expirent** » : les réservations sont sorties avec D-052, **et la catégorie `reminder` ne porte aucun modèle de notification** — compté dans `m14.templates.ts` : care 19, system 12, critical 10, money 7, reminder **zéro**. Et C7 disait d'une ordonnance annulée que « son code a été rendu inerte », **incohérence introduite par le chantier 27** qui venait de redéfinir ce code comme un sceau ne servant pas à la délivrance. **Le plus instructif est un test** : `ordonnance.test.tsx` cherchait l'absence du texte alternatif « Code à scanner en pharmacie » — que le chantier 27 avait renommé. L'assertion restait verte pour la mauvaise raison. **web 506 ✓ (504 + 2) · types propres · build propre · lint 19.** | ⏸ en attente | ⏸ |

| **30** | **Le mobile n'avait jamais été balayé** — 02/09. Quatre chantiers de vérification s'étaient tous appuyés sur le **bundle web déployé** : l'application mobile n'est pas servie par Render, **aucun de ces contrôles ne la couvrait**. Trois promesses fausses y vivaient encore. `ui.tsx` portait un **SECOND carrousel**, `StepCarousel`, distinct de `AuthCarouselDrawer` et annonçant lui aussi « Réservez vos médicaments tout près » — **du code mort que personne ne montait**, et qui chargeait ses illustrations depuis un site tiers. `NotificationsScreen` décrivait la catégorie « Rappels » par « Médicaments, **réservations**, expirations » — la ligne jumelle de celle retirée de B3 au chantier 29, et pour la même raison : **zéro modèle de notification** ne porte cette catégorie. `PaymentsScreen` promettait « vos reçus de consultation **et de dévoilement** » — un reçu qui n'arrivera jamais. **Vérifié au passage, contre une erreur qu'on allait faire** : les RAPPELS DE MÉDICAMENTS (`/v1/reminders`, 401 en ligne) existent toujours et n'ont rien à voir — le service n'importe que Prisma, il n'émet aucune notification. **mobile 7 ✓ · lint 108 → 104 · web 506 ✓ · API 485 ✓ · types propres.** | ⏸ en attente | ⏸ |

| **31** | **Le TOTP devient optionnel, et le 2FA du web devient opérationnel** — 02/09. Décision du porteur, **D-053** : le TOTP n'est obligatoire pour **aucun** type de compte, désactivé par défaut, chacun l'active et le désactive. Serveur : les **deux** gardes retirées — celle d'`AdminGuard` (403 sur toute route d'administration) et le refus de `disableTotp` pour les comptes ADMIN ; `ADMIN_REQUIRE_TOTP` n'est plus lue. **Mais appliquer la décision a révélé que le 2FA du web n'était pas opérationnel.** Trois défauts, trouvés en cartographiant les 12 routes 2FA du serveur contre le client : (1) `POST /totp/disable` existait depuis toujours, **aucun écran ne l'appelait** — c'était la dette n°11, soldée ici ; (2) les **trois routes de la 2FA par email** n'étaient pas déclarées dans le client ; (3) le plus grave — `LoginResponse` ne déclarait pas `otpRequired`, et sur `{ totpRequired: false, otpRequired: true }` **les deux branches de l'écran tombaient à côté : il ne se passait RIEN**. Un compte ayant activé la 2FA par email depuis le mobile était **enfermé dehors du web, en silence**, sans pouvoir atteindre le réglage qui le bloquait. Ajoutés : la désactivation dans B3, une carte « Code par email à la connexion », l'étape email à la connexion avec son libellé propre, et **`admin.guard.spec.ts` — la garde d'administration n'avait JAMAIS eu de test.** Retirés : le bandeau et le bouton conditionnel du chantier 24, devenus faux. **API 491 ✓ (485 + 6) · web 502 ✓ · types propres.** | ⏸ en attente | ⏸ |

| **32** | **Le second facteur devient VISIBLE et TRAÇABLE, sans redevenir obligatoire** — 02/09. Les deux atténuations recommandées à la dette n°20, choisies par le porteur : **(a)** E4 gagne une colonne « Second facteur » — l'information existait en base (`totpSecret.enabled`, `emailTwoFactorEnabled`) et **personne ne pouvait la lire** : chacun connaissait son propre réglage, nul ne connaissait celui des autres. `listAdmins` la sert désormais, l'écran distingue « Application », « Email » et « **Mot de passe seul** ». **(b)** Une connexion d'administration sans second facteur s'inscrit au journal d'audit — `m01.admin.login_without_second_factor`, dans la **même transaction** que l'ouverture de session : un accès qui réussirait sans laisser sa trace serait exactement ce qu'on cherche à empêcher. La règle est **extraite en fonction pure** (`doitTracerConnexionSansSecondFacteur`) plutôt que laissée en `if` : l'éprouver dans `login` aurait demandé de simuler Prisma, les sessions, le hachage et l'audit — pour une condition à trois termes. **API 496 ✓ (491 + 5) · web 505 ✓ (502 + 3) · types, lint et builds propres.** | ⏸ en attente | ⏸ |

| **33** | **E4 affichait « admin » au lieu de « Super Admin »** — 02/09, trouvé en répondant à une question du porteur : « comment l'admin a-t-il été créé ? ». `listAdmins` lisait le nom dans `patientProfile`, alors que **les deux seuls chemins qui créent un compte d'administration** écrivent dans `facilityMemberProfile` — le bootstrap du seed (celui qui a créé le compte en ligne) et la route `createAdmin`, **vingt lignes sous la lecture fautive**. Le nom revenait donc `null` pour tous les administrateurs, et l'écran se rabattait sur le nom d'utilisateur. Corrigé en reprenant l'ordre exact de `M01Service.me()` — patient, professionnel, structure — plutôt qu'en échangeant un tiroir : **une seule règle pour résoudre un nom, à deux endroits**. `m02.nom-admin.spec.ts` monte le vrai service sur un faux Prisma et verrouille les quatre cas plus l'ordre ; vérifié en remettant le défaut, **2 tests tombent**. **API 501 ✓ (496 + 5) · types et lint propres.** | ⏸ en attente | ⏸ |

| **34** | **Un décompte en direct sur chaque code TOTP** — 02/09, demande du porteur. Ajouté aux **quatre** endroits où un code TOTP se saisit : la connexion, l'activation (A4), le formulaire partagé de B3 (ré-association, codes de secours, désactivation) et la réinitialisation du mot de passe. Serveur : `secondsUntilNextTotpStep` et une route **publique** `GET /v1/auth/totp/rythme` — publique parce que deux de ces écrans sont atteints **sans être connecté**, et sans secret puisque la période figure déjà en clair dans le QR code. **Deux décisions que la consigne ne disait pas, et qui la corrigent** : le décompte annonce « **nouveau code dans N s** » et **jamais** « ce code expire », parce que `verifyTotp` tolère ±1 pas — le serveur accepte encore le code précédent ; et il est **ancré sur l'horloge du serveur**, un calcul local étant déphasé de tout écart d'horloge du navigateur. Retiré au passage : « Il change toutes les **30 secondes** », un chiffre écrit en dur dans A4. **API 505 ✓ (501 + 4) · web 512 ✓ (505 + 7) · types, lint et builds propres.** | ⏸ en attente | ⏸ |

| **35** | **B2 : la courbe de la maquette, à la place des barres** — 03/09, demande du porteur, écran regardé côté à côté avec sa maquette. **Le comparatif du chantier 9 avait inscrit ce bloc « conforme ». Il ne l'était pas** : la maquette montre une courbe avec aire dégradée, l'écran affichait des barres. Géométrie relevée sur `B2 - Tableau de bord.dc.html` — `viewBox="0 0 620 190"`, tracé de x=30 à x=614, base à y=168, ligne de 2 px, points de rayon 2,4, aire de 0,18 à 0. Seule adaptation : la couleur vient de `--ap-400` et non du `#2756A6` écrit en dur de la maquette, qui a un fichier par thème quand l'application n'a qu'un écran pour les deux. **Deux défauts trouvés EN REGARDANT, qu'aucun test n'aurait signalés** : l'axe graduait d'abord « 2,5 · 5 · 7,5 · 10 » — des demi-consultations —, puis, une fois le pas choisi avant le sommet, essayait 25 avant 10 et graduait 28 en « 0 · 25 · 50 ». `echelleMois` vit dans `lib/echelle-graphique.ts` et couvre 400 maxima en test. **web 522 ✓ (512 + 10) · types, build et lint propres.** | ⏸ en attente | ⏸ |

| **36** | **« 1 consultations au total »** — 03/09, lu par le porteur EN LIGNE sur son propre tableau de bord. Balayage de tout le web : **seize chaînes** écrivaient un nombre suivi d'un mot invariablement au pluriel — « 1 ordonnances », « 1 pages », « 0 retirables ». **Quatre étaient déjà justes** et n'ont pas été touchées ; une cinquième (`GainsPage`) ne peut pas descendre sous deux jours, sa garde le prouve. **Huit corrigées**, par une règle unique — `lib/accord.ts` — plutôt que par huit ternaires recopiés. **Le test a trouvé un défaut dans ma propre règle** : le seuil `> 1`, celui du motif déjà présent dans le dépôt, accorde « 1,5 heures » ; le pluriel français commence à **deux**. Sur des entiers les deux seuils sont identiques — c'est pourquoi personne ne l'aurait vu. **web 529 ✓ (522 + 7) · types, build et lint propres.** | ⏸ en attente | ⏸ |

| **37** | **Le centre de notifications** — 03/09, recommandation n°1 de l'analyse du tableau de bord, retenue par le porteur. **Le serveur envoie 49 modèles de notification ; le web n'en affichait aucune.** Il branchait les *préférences* : un soignant choisissait avec soin les catégories qu'il recevait, et n'en voyait jamais une seule — l'interrupteur marchait, la lampe n'était pas branchée. Ce qui se perdait : « un patient vous sollicite », « compte-rendu en retard — **gains gelés** » (D-008), « contrat réédité, à re-signer pour exercer ». **Serveur : une route écrite pour cet écran**, `POST /v1/notifications/me/read-all` — la suppression groupée existait depuis le début, la **lecture** groupée non ; sans elle, trente non-lues auraient coûté trente requêtes. Elle s'arrête à la même fenêtre PM-37 que la liste et le badge. Web : cloche + pastille plafonnée à « 99+ », tiroir paginé au curseur, marquer lu, tout marquer lu, supprimer, lien vers les préférences — et **chaque notification mène à son écran** quand il en existe un (`lib/destination-notification.ts`). **Trois défauts trouvés par les tests, dont deux dans mon propre code** : les capacités des destinations étaient recopiées à la main et réduisaient `/admin/signalements` au seul super-admin — elles sont désormais **lues** dans `NAV_GROUPS` ; une réécriture « à l'identique » a fait retomber `m06.report.overdue.admin` dans le préfixe `m06.report.`, donc vers les consultations d'un soignant ; et `lib/temps.ts` disait « hier » pour une notification de vingt heures — le test a imposé « il y a 20 h », une demande de vingt heures étant perdue quand celle de trois heures ne l'est pas. **Constaté en passant : le centre in-app du serveur n'avait JAMAIS eu de test** (dette n°22). **API 509 ✓ (505 + 4) · web 568 ✓ (529 + 39) · types, lint (19, référence) et builds propres.** | ⏸ en attente | ⏸ |

| **38** | **Solder les dettes — et une décision du porteur qui en change deux** — 03/09. Consigne : *« pas de base test neon, tout doit se faire depuis la vraie base neon de l'app. je ne veux pas de dettes non résolu »*. **Un point ne pouvait pas être obéi à la lettre et il a été dit tout de suite** : les sept suites d'intégration commencent par VIDER vingt-quatre tables — les lancer sur la base du site l'effacerait, comme le 23/08. « Pas de base de test » ne veut donc pas dire « elles tournent sur la production », mais « elles ne tourneront plus jamais » (53 tests). **Dette n°8 close par cette décision** ; le garde-fou reste, la couverture est réécrite ailleurs. **Dette n°22 close** : les cinq routes du centre in-app couvertes sur doublure (19 tests), **vérifiées en injectant la faute** — retirer `accountId` du `where` de la suppression groupée fait tomber un test. **Dette n°21 close** : la ligne `messageDe` était recopiée **seize fois** et non huit — *un compte fait de mémoire n'est pas un compte* ; une nuance a été préservée au passage, l'onglet « Aide » gardant son propre repli. **Dette n°19 close** : `HeaderArt`, mort et chargeant un site tiers, retiré avec son style et son import orphelins. **Dette n°18 close, mais PAS par la recommandation d'origine** : en l'ouvrant, les deux listes d'intitulés avaient **déjà divergé** (« Consultations » / « Consultations & soins », « Service » / « Système & compte ») — le test recommandé aurait échoué sans dire laquelle avait raison. Le serveur sert donc les intitulés, et **une catégorie sans modèle n'est plus jamais offerte** (comptée, pas écrite) : « Rappels » disparaît des deux applications d'un coup. **Corrigé aussi : un défaut du chantier 37 vu EN LIGNE** — la cloche écrivait `?? 0`, donc annonçait « aucune non lue » quand la lecture du compteur échouait ; c'est le mensonge que le principe du projet interdit. **API 538 ✓ (509 + 29) · web 573 ✓ (568 + 5) · mobile 7 ✓ · types, lint (API 0, web 19, mobile 104 — leurs bases) et builds propres.** | ⏸ en attente | ⏸ |

| **39** | **La gestion des structures quitte M02** — 03/09, dette n°17. **1 261 lignes retirées** (l'estimation en annonçait ~450) : `m02.controller.ts` et ses 9 routes, 424 lignes de service, `m02.dto.ts`, `m02.permissions.service.ts`, `m02.policies.ts` et ses 23 tests, la branche FACILITY de M13, et `chantier1.int.spec.ts` (8 tests bâtis sur ce flux). **Le retrait n'a PAS été décidé par déduction** : « plus aucun compte ne peut naître » ne dit rien de ceux qui existent, et un compte antérieur au 02/09 se connecterait encore — la connexion ne regarde pas le type. `scripts/inventaire-structures.ts`, **en lecture seule**, a interrogé la base de production : zéro compte `FACILITY_MEMBER`, zéro adhésion, zéro invitation. **Le même inventaire a dit ce qui doit rester** : 3 structures, 3 dossiers de vérification, et un `FacilityMemberProfile` qui porte le nom du super-administrateur. **Une dixième route, trouvée par le relevé et non à l'œil** : `GET /v1/me/facility/:id/dashboard` vivait dans M16, comptait des réservations sorties du produit, et répondait 403 à tous les coups. **API 515 ✓ · web 573 ✓ · mobile 7 ✓ · 160 routes, zéro de structure · types, lint et builds propres.** | ⏸ en attente | ⏸ |

| **40** | **« Un refus motivé, non » était faux** — 04/09, trouvé en répondant à une question du porteur : « explique-moi le taux de confirmation ». Le tableau de bord affirmait qu'une demande expirée fait baisser le taux **mais pas un refus motivé**. C'est l'inverse de ce que fait le serveur : `initiationsTotal` monte À LA SOLLICITATION, avant toute réponse, et un refus n'émet **aucun** événement de statistiques — vérifié dans `m06.handshake.service.ts` et dans les quatre abonnements de `m05.module.ts`. Un refus motivé coûte donc exactement autant qu'une demande ignorée. **Le test qui manquait** : un test défendait déjà cette phrase, mais sa MOITIÉ seulement — l'expiration ; l'autre moitié mentait sans que personne la vérifie. *Quand un texte affirme deux choses, il faut deux assertions.* Deux dettes ouvertes : **n°23** (faut-il changer la RÈGLE plutôt que la phrase ? décision de produit) et **n°24** (les indicateurs publics des comptes de démonstration sont fabriqués : 242 sollicitations en base pour 2 demandes réelles). **web 575 ✓ (573 + 2).** | ⏸ en attente | ⏸ |

| **41** | **Signaler — la porte d'entrée de la modération** — 04/09, écart A du plan des écrans. `POST /v1/reports` existait depuis le premier jour et **aucun client ne l'appelait**, ni web ni mobile. Tout M04 était construit — file de modération, tri par gravité, décision motivée, avertissement, transmission — et l'écran E6 « Signalements » **serait resté vide à jamais**. Sur une plateforme de santé, ce n'est pas une fonctionnalité manquante : c'est la voie de recours. **Serveur : aucune ligne** — et c'est la découverte du chantier : je m'apprêtais à ajouter `GET /v1/reports/mine` pour que le signalement ne soit pas un trou noir, avant de vérifier que `decideReport` **notifie déjà l'auteur** (`m04.report.resolved`, l'issue sans le détail des sanctions, CU-04-03). Cette notification n'atteignait personne jusqu'au 03/09 : **le chantier 37 a fermé la boucle sans qu'on s'en rende compte.** Web : `DialogueSignalement.tsx`, branché à DEUX endroits de C5 — sur un message (`SESSION_MESSAGE`, l'identifiant DU message) et sur le patient (`PROFILE`, l'identifiant de son COMPTE). **Trois choix tranchés** : la garantie d'anonymat du signaleur est dite **avant** le formulaire et non après (c'est elle qui décide si on ose remplir) ; le motif est une **liste fermée** parce que c'est lui qui donne sa priorité au signalement dans la file (CU-04-04) ; et on ne peut pas signaler ses propres messages. **`FACILITY` n'est pas offerte** — le serveur l'accepte encore, mais les structures sont sorties du produit (D-051). **Vérifié en injectant la faute** : signaler un message avec l'identifiant de la séance fait tomber un test. **web 584 ✓ (575 + 9) · types, lint (19, sa base) et build propres.** | ⏸ en attente | ⏸ |

| **41 bis** | **Le bouton d'envoi était hors de l'écran** — 04/09, trouvé en VÉRIFIANT le chantier 41 en ligne, dix minutes après l'avoir livré. Le formulaire de signalement mesurait **740 px dans une fenêtre de 495** : il débordait en haut ET en bas, **sans défiler**, et le bouton « Envoyer le signalement » se trouvait à 521 px — injoignable. Le geste entier était impossible sur un écran court : un portable à 100 %, une tablette couchée. **Le défaut n'était pas dans mon écran mais dans la primitive** `DialogContent`, qui n'a jamais eu de hauteur maximale — il valait donc pour TOUTES les boîtes de l'application. Corrigé là : `max-h-[calc(100dvh-2rem)]` et `overflow-y-auto`. **Corriger a été vérifié AVANT d'être poussé** : les deux règles appliquées à la boîte ouverte dans le navigateur du porteur ramènent la hauteur de 740 à 463 px et rendent le bouton atteignable. **web 586 ✓ (584 + 2, dans `responsive.test.ts`) · types, lint et build propres.** | ⏸ en attente | ⏸ |

| **41 ter** | **Un fil clos ne se signalait plus** — 04/09, second défaut trouvé en vérifiant le chantier 41 en ligne. La barre d'actions d'un message était **entièrement conditionnée à l'état ACTIF** de la séance : sur une consultation terminée, aucun moyen de signaler un message. Or c'est **après coup** qu'on repense à un propos déplacé, et le message est la preuve. J'avais placé une action sans limite de temps dans un conteneur limité au temps de la séance. **Ma première correction était trop large, et un test existant l'a refusée** : elle rouvrait TOUS les gestes après la clôture, au motif vérifié que le serveur les accepte (seul `sendMessage` exige `status === ACTIVE`). Le test « une séance close n'offre plus aucun geste : le fil est archivé » est tombé — **et il avait raison**. Version retenue : l'archive reste intouchable (ni répondre, ni réagir, ni modifier, ni retirer), **et le seul signalement s'y ajoute** — il n'est pas une modification de l'archive, c'est une alerte à son sujet. Le test existant a été **amendé, pas supprimé** : sa règle est conservée et renforcée de deux assertions, plus deux tests pour l'exception. **web 589 ✓ (586 + 3) · types, lint et build propres.** | ⏸ en attente | ⏸ |

| **42** | **Révoquer un Badge Vérifié** — 04/09, écart B du plan des écrans. `POST /admin/verification/:id/revoke` existait depuis le premier jour et **aucun écran ne l'appelait** : un soignant vérifié par erreur, ou qui perd son autorisation d'exercer, restait vérifié **pour toujours**, Badge compris, visible et crédible dans l'annuaire public. ⚠️ **En lisant le serveur, le geste s'est révélé bien plus grave que l'écart ne le laissait croire** : `LEGAL_TRANSITIONS.REVOKED` vaut `[]` — aucune sortie — et `VerificationCase.professionalId` est `@unique`, donc **un seul dossier par professionnel, à vie**. Révoquer ferme définitivement l'accès d'un soignant à la plateforme, **sans aucun chemin de retour dans le produit**. La carte le dit donc en toutes lettres avant le formulaire, exige un motif (le soignant le lira, c'est sa seule explication) et une **confirmation tapée**, sur le modèle de la clôture de compte — le seul autre geste sans retour. Elle n'apparaît que sur un dossier VÉRIFIÉ, seul état que le serveur accepte. **Deux défauts trouvés par les tests, tous deux dans mon travail** : cinq tests regardaient l'écran avant que le dossier soit chargé (le panneau s'ouvre dès l'URL, pas à la réponse) ; et mon avertissement permanent portait `role="alert"`, donnant **deux alertes indistinctes** dans la même carte — corrigé en `alerte`, rien n'ayant échoué. **Vérifié en injectant la faute** : retirer les deux conditions du bouton fait tomber deux tests. 📌 **Dette n°25 ouverte** : rien ne permet de rétablir un soignant révoqué par erreur. **web 599 ✓ (589 + 10) · types, lint et build propres.** | ⏸ en attente | ⏸ |

| **43** | **Solder les dettes plutôt que les réciter** — 04/09. Le porteur : « chaque fois tu fais que me rappeler des dettes, alors que je t'avais dit de tout résoudre ». **Il avait raison, et le compte le prouve** : sur 12 dettes dites ouvertes, **six n'attendaient que moi**. Trois portaient déjà leur réponse (n°8 tranchée par le porteur le 03/09 — « pas de base test neon » ; n°13 dont l'inventaire était fait et deux parts sur trois livrées ; n°15 dont ma propre recommandation disait « ne rien faire ») et trois étaient présentées comme des arbitrages **alors qu'elles venaient avec une recommandation motivée**. Livré : **n°25** — `REVOKED → IN_REVIEW`, route `reinstate` réservée au SUPER_ADMIN, qui ne rend PAS le badge mais remet en examen ; **n°23** — un refus motivé sort du dénominateur du taux, événement + compteur + migration additive ; **n°24** — `scripts/recalcul-indicateurs.ts`, le « recalcul quotidien » que la spec M05 §5 réclamait depuis le début. **Deux découvertes en route** : la formule du taux était **recopiée dans trois fichiers**, et **deux phrases du chantier 42 sont devenues fausses le jour même** — un test est tombé, seul de toute la suite, pour le dire. **api 521 ✓ (516 + 5) · web 611 ✓ (599 + 12) · mobile 7 ✓ · lint 0 erreur · builds propres.** | ⏸ en attente | ⏸ |

| **44** | **Le levier de l'avenant** — 05/09, écart C du plan des écrans. `POST /admin/verification/:id/agreement/reissue` n'avait aucun bouton, alors que le **chantier 8** avait construit tout le parcours de re-signature côté soignant. ⚠️ **La prémisse du plan était fausse et le chantier l'a montré d'abord** : « rien ne peut le déclencher » — si, changer PM-01 depuis E3 réédite déjà en masse. Ce que le bouton comble, ce sont les **trois trous de ce lot** : il ignore les dossiers sans version SIGNÉE (un soignant vérifié non signataire garde donc un contrat à l'ANCIEN taux, et le signerait tel quel), il s'arrête à 500 (`REISSUE_BATCH`), et il journalise puis oublie ses échecs. ⚠️ **Le geste suspend le soignant** : rééditer crée une version non signée, et « peut exercer » exige la version courante signée (RM-03-01), relu sans cache par M05/M06 — la carte le dit avant, et **distingue le signataire du non-signataire**, à qui l'alarme serait fausse. Le serveur ne disait ni le taux du contrat ni le taux courant : trois champs ajoutés à `getCaseForAdmin`, lus de PM-01, jamais recopiés. **Quand les deux taux sont égaux, aucun bouton.** **api 521 ✓ · web 620 ✓ (611 + 9) · lint 0 erreur · builds propres.** | ⏸ en attente | ⏸ |

| **45** | **Deux nettoyages, et deux surprises** — 05/09, écarts E et F. **E** : `GET /admin/audit/export.csv` n'avait aucun bouton. ⚠️ **Le chantier a trouvé pire que l'absence d'export** — le serveur s'arrêtait à 5 000 lignes **en silence**, rendant un fichier tronqué au même en-tête et au même format qu'un export complet. Un journal d'audit incomplet remis à un tiers est pire qu'un refus d'export. Le serveur pose désormais `X-Export-Truncated` / `X-Export-Rows` (exposés en CORS, sans quoi `fetch` ne les verrait pas), **et l'écran ne recopie aucun plafond**. Ajoutés aussi : la marque d'ordre d'octets (sans elle Excel en français rend « Ã© ») et un nom de fichier daté. **F** : `POST /verification/me/documents` exigeait une `fileKey` qu'aucun point d'entrée ne savait produire. ⚠️ **La prescription du plan était fausse** — « retirer la route, le DTO et la méthode » aurait cassé le dépôt de pièces : `uploadDocument` appelle `addDocument`. Seule la route est partie. **Vérifié par les routes servies** : 160, `reinstate` (+1) et celle-ci (−1) se compensent. **api 521 ✓ · web 625 ✓ (620 + 5) · lint 0 erreur · builds propres.** | ⏸ en attente | ⏸ |

| **46** | **La recherche globale** — 05/09. Écartée du chantier A1 en son temps (« chercher dans des dossiers qui n'existent pas encore n'a pas de sens ») ; les dossiers existent, et l'application a seize écrans. Une palette (bouton + Ctrl+K) qui cherche **deux choses, et le dit** : les écrans, lus de `useNavigation()` donc déjà filtrés par capacité, et les comptes, par la **seule route de toute l'API qui cherche du texte** (`GET /admin/accounts?query=`). ⚠️ **Elle annonce en toutes lettres ce qu'elle NE cherche pas** — consultations, pièces, journal : aucune route ne les cherche par texte, et le taire ferait chercher longtemps ce qui n'y sera jamais. **Le droit de chercher des comptes est LU** sur l'entrée `admin-comptes` de `NAV_GROUPS`, jamais recopié — un administrateur Finance ne l'a pas, et un test le garde. ⚠️ **Le test le plus important du chantier** : une recherche en échec ne dit JAMAIS « aucun compte » — sur une plateforme de santé, cette confusion ferait conclure qu'une personne n'existe pas. Le plafond de 50 lignes du serveur est annoncé, comme celui de l'export au chantier 45. Un résultat mène vraiment quelque part : `ComptesPage` lit désormais `?q=`. **web 638 ✓ (625 + 13) · lint 0 erreur · build propre.** | ⏸ en attente | ⏸ |

| **47** | **Les raccourcis clavier, et la garde qui les rend acceptables** — 05/09. Ctrl+K existait depuis la veille et **personne ne pouvait le deviner** : un raccourci sans endroit où le lire est un secret entre le code et celui qui l'a écrit. Livré : `?` ouvre un **panneau d'aide** qui rend `RACCOURCIS`, la seule liste — y compris les raccourcis du composeur de consultation, implémentés bien avant, parce qu'on cherche « les raccourcis », pas « ceux de tel module ». `/` ouvre aussi la recherche. ⚠️ **Le cœur du chantier est la garde de saisie** : `/` et `?` sont des CARACTÈRES — sans elle, écrire « 20/09 » dans un motif de refus de 2 000 caractères ouvrirait la recherche au milieu du mot et perdrait la saisie. Ctrl+K reste l'exception, à dessein. ⚠️ **`e.key` et jamais `e.code`** : les utilisateurs sont en **AZERTY**, où `/` est Maj+: et `?` Maj+, — `e.code` aurait désigné une autre touche sur chaque disposition. **Deux défauts trouvés par mes propres tests** : la garde ratait les zones `contenteditable` imbriquées (corrigé par `closest`), et l'écouteur se réabonnait **à chaque rendu** faute de référence — le fichier promettait « un seul écouteur » et en posait un par rendu. L'écouteur de Ctrl+K du chantier 46 a été **déplacé** ici : deux écouteurs auraient donné deux gardes à tenir d'accord. **web 651 ✓ (638 + 13) · lint 0 erreur · build propre.** | ⏸ en attente | ⏸ |

| **48** | **Le Carnet qui revient à son majeur** — 06/09, écart D, **premier chantier mobile depuis le 30/08**. `claim/start` et `claim` existaient depuis le premier jour et **aucun client ne les appelait** : un proche devenu adulte ne pouvait jamais récupérer son propre Carnet de santé. ⚠️ **L'écart annonçait un écran ; le serveur imposait une chorégraphie à deux personnes sur deux téléphones** — le majeur doit recevoir deux UUID *et* l'OTP reçu par le tuteur. D'où un code unique (`lib/transfert-carnet`, pur et éprouvé) et le partage natif, déjà l'idiome de l'application. ⚠️ **Un défaut que le chantier aurait CRÉÉ en s'arrêtant au bouton** : un Carnet transféré reste dans la liste du tuteur, qui n'y a plus accès (RM-07-06) — la ligne aurait mené à un refus. **PM-16 n'est servi à aucun client** : l'écran ne filtre donc pas par âge et laisse le serveur nommer la règle. 📌 **Deux suites chiffrées ouvertes** (n°26 le code dictable, n°27 les paramètres lisibles). **mobile 24 ✓ (7 + 17) · types et lint propres.** | ⏸ en attente | ⏸ |

| **49** | **Un code qui se dicte, et des règles qui se lisent** — 06/09, dettes n°26 et n°27, ouvertes la veille. **n°26** : revendiquer son Carnet exigeait 73 caractères d'UUID, alors que le cas le plus fréquent est que les deux personnes soient **dans la même pièce**. ⚠️ **Un code court ne suffisait pas** : tant que `subProfileId` restait dans l'URL, le majeur devait encore le connaître — d'où une route où **le sous-profil n'est plus dans le chemin**, `claim-by-code`, qui retrouve tout depuis huit signes. Ces signes viennent d'un alphabet **sans aucune paire douteuse**, et les DEUX membres de chaque paire sont exclus : garder « O » en écartant « 0 » laisserait celui qui écoute hésiter quand même. Le code est **effacé à la consommation**. `claimByCode` ne re-décide rien — il résout, puis passe la main à `claim` : toutes les gardes restent à un seul endroit. **n°27** : `GET /v1/parameters`, liste blanche de trois clés, **employée aussitôt** sur l'écran où la dette est née. **api 536 ✓ (521 + 15) · web 651 ✓ · mobile 29 ✓ · lint 0 · builds propres · 162 routes.** | ⏸ en attente | ⏸ |

| **50** | **Relecture de M13 — l'argent** — 06/09. Objectif annoncé : chercher des routes que rien n'appelle. **Résultat : il n'y en a aucune** sur 162 — les 17 candidates de mon outil étaient TOUTES des faux positifs (il ne suivait ni les constantes de route du mobile, ni les gabarits mêlant constante et chaîne de requête). ⚠️ **La lecture, elle, a trouvé bien pire qu'une route morte.** `confirmWithdrawal` débite le solde en TX 1, appelle l'agrégateur **hors transaction**, conclut en TX 2. **Si le processus meurt entre les deux — et Render endort le service toutes les 15 min — l'argent est débité et RIEN ne le sait** : l'utilisateur ne peut plus réessayer (`aggregatorRef` posé), la réconciliation ne lit que les `EXECUTED`, aucune route d'administration ne débloque, et le retrait **empêche même la clôture du compte**. Mesuré en production : **0 retrait, 0 compte de gains** — le défaut est **latent**, pas réalisé. Livré : un balayage horaire qui **ne devine rien** — il lit le relevé de l'agrégateur, solde si le virement est parti, re-crédite sinon, et **attend** si le relevé est illisible. ⚠️ **Le câblage Nest manquait et TypeScript ne disait rien** : l'API n'aurait pas démarré en production — trouvé en montant l'arbre. **api 546 ✓ (536 + 10) · lint 0 · build propre · 162 routes.** | ⏸ en attente | ⏸ |

| **51** | **Relecture de M06 — la chaîne de soin** — 06/09. Le chemin de l'argent du patient est **solide** : `pay` re-vérifie « peut exercer » avant de débiter, et le webhook rembourse automatiquement un paiement qui n'ouvre aucune session. ⚠️ **Le trou est ailleurs, et il est double.** `uploadMedia` stocke un fichier et rend sa clé ; c'est un **SECOND appel HTTP** qui l'attache à un message — entre les deux, l'utilisateur renonce, le réseau tombe, et **rien ne vient jamais chercher le fichier** : aucun balayage, aucune purge, aucune durée de vie. Ce sont des photos et des vocaux MÉDICAUX conservés sans propriétaire. 📌 **Et en le mesurant, un second défaut, celui-là RÉALISÉ** : `scripts/menage-comptes-demo.ts` supprimait les pièces justificatives et **laissait leurs fichiers** — trois pièces d'identité et un diplôme chiffrés dorment en base depuis le **24/08/2026**, sans propriétaire et sans règle de rétention. Livré : un balayage quotidien dont **le défaut est de ne rien faire** — un préfixe inconnu n'est JAMAIS effacé, un fichier référencé non plus, un fichier de moins de 24 h non plus. Et le script corrigé. **api 554 ✓ (546 + 8) · lint 0 · build propre · 162 routes.** | ⏸ en attente | ⏸ |

| **52** | **Relecture de M07 — le Carnet de santé** — 06/09. Le module le plus sensible du projet, et **le contrôle d'accès y est étanche** : `resolveScope` est le seul point d'entrée, refuse tout compte non-patient, exige la tutelle pour un sous-profil, et **coupe l'accès du tuteur après transfert**. Le 404 est volontairement indistinct (anti-énumération). L'accès du médecin passe par M06, se referme sur les deux chemins de clôture, et est tracé sans contenu médical. ⚠️ **Le défaut trouvé est le mien, et il date de deux jours.** Une consultation réservée POUR une personne à charge, dont le Carnet est transféré avant le dépôt du compte-rendu, rendait ce dépôt **IMPOSSIBLE** — le chemin refusait « écrivez via son compte patient ». Or le compte-rendu est obligatoire (PM-30, puis gains gelés) et **les gains ne sont crédités qu'à son dépôt** (RM-06-04) : le médecin n'aurait jamais été payé, le patient n'aurait jamais reçu son compte-rendu. Le cas était inatteignable avant le chantier 48 — **je l'ai ouvert moi-même**. Corrigé : l'écriture **suit** le Carnet vers son nouveau titulaire, qui est aussi celui qu'on notifie. **api 559 ✓ (554 + 5) · lint 0 · build propre.** | ⏸ en attente | ⏸ |

| **53** | **Relecture de M01 — la porte d'entrée** — 06/09. Les chemins critiques sont **solides** : la réinitialisation de mot de passe consomme l'OTP dans la transaction, **révoque toutes les sessions**, et ne distingue pas « compte inconnu » de « pas de code » ; le compteur anti-force brute survit au rollback (D-048) ; `OTP_ECHO` porte un garde-fou dur contre la production. ⚠️ **Et je dois corriger ce que j'avais affirmé le 04/09** : j'avais noté « 17 sessions ouvertes, rien ne les expire côté serveur ». **C'était faux** — `AuthGuard` révoque bien à l'inactivité (30 min en web, PM-20 en mobile). Mais **paresseusement, à l'usage** : celles dont personne ne se sert restent « non révoquées », et l'écran « Mes appareils » les montrait comme actives. **Mesuré en production : 28 sessions listées, 26 DÉJÀ MORTES** — dont dix-huit sur un seul compte, pas une utilisable. Un écran de sécurité qui montre dix-huit appareils sans accès noie la seule session suspecte, et fait cliquer dans un tas de cadavres — le bouton de révocation n'ayant aucune confirmation, **c'est exactement l'erreur que j'ai commise le 04/09**. Corrigé : la règle sort de la garde, et la liste **révoque les mortes avant de montrer**. **api 566 ✓ (559 + 7) · lint 0 · build propre.** | ⏸ en attente | ⏸ |

| **54** | **Relecture de M04 — le journal qui prouve tout le reste** — 06/09. Le chaînage est **bien construit** : transaction sérialisée, rejeu sur conflit, entrée de quarantaine pour un payload illisible plutôt qu'une file bloquée. ⚠️ **Mais le journal de production contient 99 entrées numérotées de 356 à 454** : `seq` est un auto-incrément, les **355 premières ont existé puis ont disparu** — l'effacement du 23/08/2026, dont le compteur de séquence a survécu. Et la vérification répondait **« chaîne intacte »**, à juste titre : la première entrée survivante a été écrite table vide, donc depuis le hash d'origine. Tout est cohérent ; tout est aussi incomplet. ⚠️ **Ce n'est pas qu'un accident : c'est une propriété du mécanisme.** Un chaînage ne peut pas distinguer « ce journal commence ici » de « quelqu'un a vidé la table » — seul le NUMÉRO du premier maillon les sépare. Livré : `firstSeq` et `startsAtOrigin` remontés par la vérification, et l'écran qui dit **« Ce qui reste est intact ; ce n'est pas la même chose que complet. »** 📌 **Un test existant est tombé** — celui qui compare l'horloge du navigateur à celle du serveur : le chantier 53 avait déplacé la constante, et **je n'avais pas relancé la suite web**. **api 566 ✓ · web 655 ✓ (651 + 4) · mobile 29 ✓ · lint 0 · build propre.** | ⏸ en attente | ⏸ |

| **55** | **Relecture de M14 — les notifications** — 06/09, **dernier module non relu**. Le renvoi des critiques est **remarquablement soigné** : il rattrape même les lignes restées QUEUED après un crash entre le commit et la transition (D-047) — exactement le défaut trouvé dans M13, déjà corrigé ici. ⚠️ **Mais au bout des cinq essais, la « livraison GARANTIE » s'arrêtait en silence** : `m14.delivery.failed` était émis et **rien ne s'y abonnait**, la seule trace étant une ligne d'audit — que personne ne lit spontanément. Une panne d'identifiants FCM ferait tomber TOUS les push critiques, pour tout le monde, sans réveiller personne. ⚠️ **À nuancer, et c'est important** : la notification existe toujours dans le centre in-app, qui naît `SENT` — ce qui est perdu, c'est **l'interruption**, précisément l'objet d'une critique. Livré : l'abandon prévient chaque super-administrateur, par le centre in-app (alerter par push que le push est en panne ne servirait à rien). 📌 **Et une question posée à qui branchera FCM** : `DevPushGateway` réussit toujours sans consulter les appareils — d'où **19 push « envoyés » pour zéro appareil enregistré** en production. Avec un vrai FCM, réussir ou échouer sur un compte sans appareil sont deux réponses également mauvaises. **api 570 ✓ (566 + 4) · web 655 ✓ · mobile 29 ✓ · lint 0 · 162 routes.** | ⏸ en attente | ⏸ |

| **56** | **Ce que la machine fait la nuit** — 06/09, retour aux écrans. Les deux plans étant soldés, le fil se reprend en MESURANT : les six relectures ont ajouté trois balayages automatiques qui **décident seuls** — recréditer de l'argent, effacer des données médicales — et **aucun écran ne disait ce qu'ils avaient fait**. ⚠️ **Pire, un défaut de mon propre chantier 51** : le balayage des fichiers supprimait des photos, des vocaux et des pièces d'identité chiffrées **en ne laissant qu'une ligne de log** — aucune trace au journal, sur une plateforme dont le principe est « le pouvoir sans trace n'existe pas » (RM-16-03). Il allait effacer trois pièces d'identité cette nuit, en silence. Livré : la trace (**comptes par type, jamais les clés** — RM-04-03), et une carte « Entretien automatique » dans E5 qui lit ces traces. Elle distingue **trois** états, pas deux : « jamais » (bonne nouvelle, rien à réparer) ne se dit pas comme « lecture impossible ». **api 574 ✓ (570 + 4) · web 659 ✓ (655 + 4) · mobile 29 ✓ · lint 0 · build propre.** | ⏸ en attente | ⏸ |

| **57** | **Les balayages ne tournaient qu'une nuit sur onze** — 06/09. En relançant le script des fichiers, le porteur a posé sans le savoir la bonne question. ⚠️ **Les `@Cron` ne s'exécutent que si le processus est VIVANT à l'instant dit — et Render endort le service après 15 min d'inactivité.** Preuve trouvée au journal d'audit : `m13.reconciliation.done` par `m16.scheduler` le **04/09 à 00:00:00 UTC, une seule fois sur 11,4 jours**. Les trois balayages livrés aujourd'hui — recréditer un retrait, effacer des données médicales, constater qu'une notification critique n'arrivera jamais — auraient donc tourné **une nuit sur onze**, au hasard de la présence d'un utilisateur. Livré : le déclencheur cesse d'être l'HEURE et devient l'ANCIENNETÉ. Une table `SchedulerRun` porte le dernier passage ; le tick d'une minute — qui part dès le réveil, donc à la première requête venue — rattrape ce qui est dû, sous **écriture conditionnelle** pour que le `@Cron` et le rattrapage ne fassent jamais le travail deux fois. **api 579 ✓ (574 + 5) · lint 0 · migration additive · 162 routes.** | ⏸ en attente | ⏸ |

### Ce que le chantier 57 (une nuit sur onze) a appris

*06/09/2026 — trouvé parce que le porteur a relancé un script deux fois.*

#### La bonne question est venue d'une relance, pas d'une relecture

Le porteur a relancé le script des fichiers orphelins. Rien n'avait changé — c'était attendu, le
balayage passe à minuit et il était 10 h 40.

Mais cette relance a fait poser la question suivante, qui ne l'avait pas été : **est-ce que ce
balayage tournera seulement ?**

*Six relectures de modules n'avaient pas vu ce que deux exécutions du même script ont montré. Lire
le code dit ce qu'il ferait ; seule l'exécution dit ce qu'il fait.*

#### Un `@Cron` ne s'exécute que si quelqu'un est là pour le voir

`@Cron(EVERY_DAY_AT_MIDNIGHT)` déclenche à minuit **si le processus est vivant à minuit**. Le plan
gratuit de Render endort le service après ~15 minutes d'inactivité ; un service endormi ne déclenche
rien, et se réveille à la première requête — pas à l'heure dite.

La preuve était dans le journal d'audit, à une ligne près :

```
2026-09-04T00:00:00.085Z  m13.reconciliation.done  admin m16.scheduler
```

**Une seule fois, sur 11,4 jours.** Le seul minuit où quelqu'un utilisait la plateforme.

Et les trois balayages livrés le jour même — recréditer un retrait débité, effacer des données
médicales, constater qu'une notification critique n'arrivera jamais — auraient donc tourné environ
**une nuit sur onze**.

*Le code était juste. L'hébergement ne tenait pas la promesse que le code supposait. Rien dans les
579 tests ne pouvait le dire.*

#### Le déclencheur cesse d'être l'heure ; il devient l'ancienneté

C'est déjà l'idiome de ce projet, et il est employé partout ailleurs : `settle()` ne dépend d'aucune
horloge — il fait ses transitions **au moment de la lecture**, en regardant depuis quand elles sont
dues.

Le tick d'une minute part, lui, dès que le service est éveillé — donc à la première requête venue.
Il regarde donc si les balayages plus lents sont **en retard**, et rattrape.

Les `@Cron` restent en place. Le jour où l'hébergement gardera le processus vivant, ils feront le
travail à l'heure et le rattrapage ne trouvera jamais rien à faire. Les deux chemins passent par la
**même écriture conditionnelle**, donc jamais deux fois.

*Une solution qui rend l'autre inutile sans l'empêcher n'a pas à choisir entre les deux.*

#### « Jamais tourné » vaut « dû tout de suite »

La table est vide au premier déploiement. Si un balayage jamais lancé n'était pas dû, il attendrait
un jour entier avant son premier passage — sur une installation neuve comme sur celle-ci, où les
trois pièces d'identité orphelines attendent depuis le 24 août.

*Le cas limite le plus facile à oublier est toujours le premier passage : celui où il n'y a encore
rien à comparer.*

### Ce que le chantier 56 (l'entretien visible) a appris

*06/09/2026 — retour aux écrans, les deux plans étant soldés.*

#### Reprendre un fil vide, c'est mesurer

Le plan des écrans du soignant est entièrement soldé (A à G), les chantiers web aussi. Il n'y avait
donc plus de fil ÉCRIT à reprendre — et inventer un écran parce qu'il faut bien en faire un est
exactement ce que ce projet s'interdit.

La règle n°1 du plan sert justement à ça : *la référence est le site en ligne.* On mesure, et on
regarde ce que la mesure montre.

Ce qu'elle a montré : les six relectures du serveur ont ajouté **trois balayages automatiques**, et
aucun écran ne dit ce qu'ils font.

#### Une machine qui décide seule doit rendre des comptes

Ces balayages ne rangent pas : ils **décident**. Ils recréditent de l'argent sur le solde d'un
soignant, ils effacent des photos et des pièces d'identité, ils constatent qu'une notification
critique n'atteindra jamais son destinataire.

Ils s'exécutent à minuit, seuls, et jusqu'ici **personne ne pouvait dire ce qu'ils avaient fait** —
sinon en me demandant de lancer un script.

*Automatiser un geste conséquent sans l'exposer, c'est déplacer le pouvoir hors de portée de celui
qui en répond.*

#### Le défaut le plus grave était dans mon propre chantier de la veille

`sweepOrphans` supprimait des fichiers médicaux chiffrés en ne laissant **qu'une ligne de log**.
Aucune entrée au journal d'audit.

Sur une plateforme dont le principe est *« le pouvoir sans trace n'existe pas »* (RM-16-03) et dont
le journal est une pièce légale (loi n° 29-2019), c'est précisément le trou que ce journal existe
pour empêcher. Et le balayage allait effacer trois pièces d'identité cette nuit, en silence.

*J'ai écrit au chantier 51 que le remède pouvait détruire ce qu'il protège, et j'ai construit trois
gardes pour qu'il se trompe le moins mal possible. Je n'ai pas pensé à la quatrième : qu'il dise ce
qu'il a fait.*

#### Journaliser des comptes, jamais des clés

La trace porte le nombre de fichiers, les octets libérés, et le décompte **par type** — « deux
pièces justificatives, une photo ». Pas les clés.

Une clé ne contient aucun contenu médical, mais elle **nomme** un fichier : trois cents identifiants
dans une entrée d'audit feraient du journal un index de fichiers, quand RM-04-03 demande l'inverse.
Le décompte répond à la question qu'on se posera — « qu'a effacé la machine cette nuit ? » — et le
reste s'enquête sur la base.

#### Trois états, pas deux — encore

La carte pouvait n'en montrer que deux : une date, ou rien. Elle en montre trois, et c'est le test
le plus important du chantier.

**« Jamais intervenu »** est une bonne nouvelle : le balayage n'a rien eu à réparer.
**« Lecture impossible »** veut dire qu'on n'en sait rien.

Les confondre ferait conclure à un administrateur que la nuit s'est bien passée alors que personne
ne le sait. C'est la même règle que partout — *une lecture qui échoue n'est ni un zéro ni un « non »*
— et c'est au moins la sixième fois qu'elle décide de la forme d'un écran.

### Ce que le chantier 55 (la garantie qui s'arrêtait en silence) a appris

*06/09/2026 — relecture de M14, dernier module du serveur.*

#### Le module avait déjà corrigé le défaut que je venais de trouver ailleurs

`retryFailedCritical` ne rattrape pas seulement les push `FAILED` : il rattrape aussi les `QUEUED`
**rassis** — ceux dont le processus est mort entre le commit de la ligne et sa transition. C'est
mot pour mot le trou trouvé dans M13 au chantier 50, et il est traité ici depuis D-047.

*Lire un module avec le défaut d'un autre en tête est une bonne méthode. Parfois elle apprend qu'on
avait déjà raison, ailleurs, avant.*

#### « Garantie » s'arrêtait à cinq essais, sans réveiller personne

EF-14-08 s'appelle **livraison garantie des critiques**. Passé la cinquième tentative, le serveur
émettait `m14.delivery.failed`… et **rien ne s'y abonnait**. Le seul témoin était une ligne d'audit.

Or personne ne lit un journal d'audit spontanément — c'est exactement à cela que servent les
alertes. M04 le fait pour une rupture de chaîne, M13 pour un virement en échec. M14 ne le faisait pas.

Et le risque n'est pas individuel : des identifiants FCM expirés, un quota dépassé, et **tous** les
push critiques tombent en même temps, pour tout le monde. Le silence serait total.

#### Ce que l'abandon coûte vraiment — et il faut être juste

La notification **existe toujours** dans le centre in-app du destinataire : celui-ci naît `SENT`, la
création EST la livraison (EF-14-07). Rien n'est perdu du message.

Ce qui est perdu, c'est **l'interruption** : le téléphone ne sonne pas. Pour une notification
critique — « un patient vous attend », « votre séance commence » — c'est précisément tout l'objet.

*Un défaut se raconte à sa juste taille. « Le patient ne reçoit rien » aurait été faux, et l'aurait
rendu suspect ; « le patient n'est pas alerté » est vrai, et suffit à le corriger.*

#### Une alerte par le canal qui marche encore

Prévenir par push que le push est en panne ne servirait à rien. L'alerte passe donc par le centre
in-app — le canal que les administrateurs consultent depuis le web, et qui ne dépend d'aucune
passerelle.

#### Dix-neuf push « envoyés », zéro appareil enregistré

Constaté en mesurant : `DevPushGateway` **ne consulte jamais** la table des appareils. Elle réussit
toujours. En développement, c'est sans conséquence — et c'est documenté (ADR-08).

Mais le jour où un vrai FCM sera branché, la question deviendra vive : **que vaut un compte sans
aucun appareil ?**

* **Réussir** — « rien à envoyer, donc rien n'a échoué » : la notification est marquée `SENT`, le
  renvoi ne la reverra jamais, et un patient qui n'a pas installé l'application est « alerté » dans
  les registres sans l'être dans la vie.
* **Échouer** — le renvoi s'enclenche cinq fois pour rien, puis l'abandon alerte l'administration
  pour chaque compte sans appareil. L'alerte devient du bruit, et le bruit tue l'alerte.

La bonne réponse est probablement une troisième — un état distinct, ni succès ni échec. Ce n'est pas
au développeur de la trancher seul : la question est écrite dans l'interface de la passerelle, à
l'endroit exact où elle se posera.

*Une décision qu'on ne peut pas prendre se laisse là où on la rencontrera, pas dans un journal
qu'on ne rouvrira pas.*

#### Six modules relus, six défauts, aucun visible

M13, M06, M07, M01, M04, M14. Six modules, six défauts — **aucun n'apparaissait dans un test, une
route ou un écran**.

Cinq des six ont la même forme : *quelque chose est fait paresseusement, ou abandonné en silence, et
laisse derrière lui un état que plus personne ne regarde.* Un retrait débité sans issue. Un fichier
médical sans propriétaire. Un compte-rendu impossible à déposer. Une session morte affichée vivante.
Un journal amputé présenté comme intact. Une garantie qui renonce sans le dire.

*On ne trouve pas ces défauts en cherchant des erreurs. On les trouve en demandant, à chaque étape :
« et si ça s'arrête ici, qui le saura ? »*

### Ce que le chantier 54 (le journal amputé) a appris

*06/09/2026 — relecture de M04, l'audit.*

#### Le journal de production a perdu ses 355 premières entrées

Il en contient 99, numérotées **de 356 à 454**. `seq` est un auto-incrément PostgreSQL : il ne saute
pas de 1 à 356 tout seul. Ces entrées ont existé.

Elles ont disparu le **23/08/2026**, avec l'effacement de la base — l'incident déjà connu. Ce qu'on
ne savait pas : le compteur de séquence, lui, a survécu, et c'est **la seule trace qu'il en reste**.

#### Et la vérification répondait « chaîne intacte » — à juste titre

Ce n'est pas un défaut du chaînage. La première entrée survivante a été écrite alors que la table
était vide : `findFirst` n'a rien trouvé, le `prevHash` est donc le hash d'origine, et la chaîne
repart proprement de là.

Tout est cohérent. Tout est aussi incomplet. **L'écran disait le premier et taisait le second.**

*« Intact » répond à « a-t-on modifié ce qui est là ? ». « Complet » répond à « est-ce tout ce qui a
eu lieu ? ». Un journal d'audit doit répondre aux deux, et le chaînage ne sait répondre qu'à la
première.*

#### Ce n'est pas un accident, c'est une propriété du mécanisme

Un chaînage par empreinte **ne peut pas distinguer** deux situations :

* « ce journal commence ici, c'est sa première entrée » ;
* « quelqu'un a vidé la table, et la numérotation a continué ».

Les deux produisent une chaîne parfaitement valide, partant du hash d'origine. La seule chose qui
les sépare est le **numéro** du premier maillon — une donnée que le mécanisme cryptographique ne
protège pas, et que personne ne regardait.

C'est pourquoi `firstSeq` et `startsAtOrigin` remontent désormais jusqu'à l'écran. Pas comme une
alerte de rupture — il n'y en a pas — mais comme la phrase qui manquait : *« Ce qui reste est
intact ; ce n'est pas la même chose que complet. »*

#### Un test existant est tombé, et il avait raison

`inactivite.test.tsx` compare l'horloge du navigateur à celle du serveur, en **lisant le fichier du
serveur**. Le chantier 53 a déplacé `WEB_IDLE_SECONDS` vers `session-expiry.ts` ; le test cherchait
encore dans `auth.guard.ts`, ne trouvait plus la valeur, et l'a dit.

Il ne s'est pas contenté d'échouer : il portait un message — « WEB_IDLE_SECONDS introuvable » — au
lieu de comparer dans le vide et de passer.

⚠️ **Et je ne l'ai découvert qu'aujourd'hui, parce que je n'avais lancé que la suite API hier.**
Trois applications, trois suites : les lancer toutes coûte quatre minutes, et en sauter une coûte un
jour de retard sur une régression que j'ai moi-même introduite.

*Un test qui échoue en NOMMANT ce qu'il ne trouve plus vaut dix tests qui passent en silence.*

### Ce que le chantier 53 (l'écran de sécurité qui mentait) a appris

*06/09/2026 — relecture de M01, la porte d'entrée.*

#### Ce que j'avais affirmé le 04/09 était faux

J'avais noté, après un incident : *« 17 sessions ouvertes, 11 de plus de trois jours, rien ne les
expire côté serveur »*. La deuxième moitié est fausse.

`AuthGuard` **révoque bien** à l'inactivité — trente minutes en web (ENF-07), PM-20 en mobile. Un
jeton volé cesse de servir. Il n'y avait pas de trou de sécurité, et je l'ai laissé écrit deux jours
dans un journal que je relis pour décider.

*Une note prise pendant un incident est une hypothèse. Elle vaut ce que vaut sa vérification — et je
ne l'avais pas faite.*

#### Le vrai défaut était à côté, et il était mesurable

La garde révoque **paresseusement** : au moment où quelqu'un se sert du jeton. Les sessions dont
personne ne se sert jamais restent donc « non révoquées » en base — et l'écran « Mes appareils » les
listait comme des appareils connectés.

Mesuré en production : **28 sessions listées, 26 déjà mortes.** Dont **dix-huit sur un seul compte,
et pas une seule utilisable**.

Ce n'est pas cosmétique. Un écran de sécurité sert à répondre à une question : *qui a accès à mon
compte ?* Dix-huit lignes dont aucune n'a accès **noient la seule qui compterait**. Et celui qui
« fait le ménage » clique dans un tas de cadavres — sur un bouton qui n'a **aucune confirmation**.

*C'est très exactement l'erreur que j'ai commise le 04/09, en révoquant par mégarde une session du
porteur. Je l'avais mise sur le compte de mon inattention. Elle venait aussi de l'écran.*

#### La garde et la liste doivent dire la même chose

La règle vivait en ligne dans la garde. La recopier dans la liste aurait créé la divergence
classique : deux bornes pour une même question, et un jour la liste révoque ce que la garde accepte
— l'utilisateur serait déconnecté **pour avoir consulté ses appareils**.

Elle est donc sortie dans un fichier, pure et injectée (PM-20 en paramètre, jamais lu là), et un
test garde la borne **à la seconde près** : à trente minutes pile, la session vit encore, des deux
côtés.

#### Trois relectures de plus, et le motif se répète

M13, M06, M07, M01 : quatre modules, quatre défauts, **aucun visible à l'écran ni dans un test**.

Et trois d'entre eux ont la même forme : *un travail fait paresseusement, au moment de l'usage,
laisse derrière lui un état que plus personne ne regarde* — un retrait débité sans issue, un fichier
sans propriétaire, une session morte affichée comme vivante.

*Le paresseux est presque toujours le bon choix pour la performance. Il demande, en échange, qu'on
se souvienne de ce qu'il laisse traîner.*

### Ce que le chantier 52 (le Carnet transféré) a appris

*06/09/2026 — relecture de M07, le module des données médicales.*

#### Le module le plus sensible était le mieux gardé

On entre dans M07 en cherchant une fuite : un patient qui lirait le Carnet d'un autre, un
professionnel qui lirait hors session. Rien.

`resolveScope` est le **seul** point d'entrée des routes « me », et il tient tout : compte non-patient
refusé, tutelle exigée pour un sous-profil, 404 volontairement indistinct entre « n'existe pas » et
« pas le vôtre », et **accès coupé au tuteur dès le transfert**. Côté médecin, la lecture passe par
M06, exige une session ACTIVE, se referme sur les deux chemins de clôture, et se trace sans jamais
journaliser un contenu médical.

*Un module bien gardé se reconnaît à ceci : la règle est écrite une fois, et toutes les portes y
passent.*

#### Le défaut trouvé est le mien, et il datait de deux jours

Le chantier 48 a rendu possible le transfert d'un Carnet à la majorité. Deux jours plus tard, ce
chemin devient atteignable :

1. un tuteur réserve une consultation **pour** sa personne à charge — la session porte son
   `subProfileId` ;
2. celle-ci atteint sa majorité et revendique son Carnet ;
3. le médecin dépose son compte-rendu → **refusé**.

Et le refus ne s'arrêtait pas à un message d'erreur. Le compte-rendu est **obligatoire** — relances
PM-30, puis « gains gelés » passé le délai — et **les gains ne sont crédités qu'à son dépôt**
(RM-06-04). Le médecin n'aurait jamais été payé pour une consultation qu'il a réellement menée, et
le patient n'aurait jamais reçu le compte-rendu de sa propre consultation.

*Le chantier 48 écrivait déjà, dans ce journal : « un geste nouveau produit des états nouveaux ». Je
l'ai écrit pour l'écran de la liste, et je ne l'ai pas poussé jusqu'aux modules voisins.*

#### Suivre plutôt que refuser, parce que c'est le même Carnet

Le réflexe était de renvoyer le médecin vers « le compte patient du titulaire ». Il n'a aucun moyen
de le connaître, et ce n'était de toute façon pas la bonne réponse.

`claim` ne recopie pas le Carnet : il en **change le propriétaire** — `patientAccountId` posé,
`subProfileId` libéré. Écrire « via le sous-profil » après coup désigne donc le **même Carnet**, qui
a seulement changé de nom. On le suit. On n'en crée jamais un second (RM-07-01), et c'est le
titulaire qu'on notifie, plus le tuteur qui n'y a plus accès.

#### Refuser reste la bonne réponse quand la donnée est incohérente

Un sous-profil marqué transféré **sans** titulaire enregistré ne permet aucune déduction. Deviner un
propriétaire y écrirait un compte-rendu médical dans le Carnet de quelqu'un.

Ce cas-là refuse, et le dit — « contactez le support ». La différence avec le refus qu'on vient de
retirer : celui-ci porte sur une **incohérence**, l'autre portait sur une situation **normale**.

*Tous les refus ne se valent pas. Celui qui protège d'une donnée douteuse doit rester ; celui qui
punit un utilisateur d'avoir eu dix-huit ans doit partir.*

#### Trois relectures, trois défauts, aucun visible à l'écran

M13 : un retrait débité que rien ne rattrapait. M06 : des fichiers médicaux sans propriétaire.
M07 : un compte-rendu devenu impossible à déposer.

Aucun des trois n'apparaît dans un test, dans une route, ou sur un écran. Les trois se voient en
lisant une suite d'opérations et en se demandant **ce qui arrive si l'ordinaire se produit** — un
redémarrage, un utilisateur qui renonce, un anniversaire.

*Les défauts qui coûtent le plus cher ne sont pas ceux qu'on n'a pas codés : ce sont ceux qu'on a
codés en supposant que rien ne bougerait entre deux lignes.*

### Ce que le chantier 51 (les fichiers sans propriétaire) a appris

*06/09/2026 — relecture de M06, la chaîne de soin.*

#### Le module où l'argent circule était le plus solide

On lit M06 en cherchant le défaut du chantier 50 : une transaction, un appel réseau, une seconde
transaction. Le chemin du paiement l'a — et il est traité :

* `pay` re-vérifie « peut exercer » **au paiement**, pas seulement à la confirmation : un
  professionnel suspendu entre les deux n'est jamais payé ;
* le webhook rembourse **automatiquement** un paiement qui n'ouvre aucune session — poignée expirée
  entre-temps, ou paiement excédentaire sur un second ordre ;
* l'annulation patient laisse une trace d'audit si l'ordre de remboursement échoue, et la
  réconciliation reste le filet.

*Chercher un défaut connu dans un module neuf est une bonne méthode, même quand on ne le trouve
pas : on en sort en sachant ce qui est tenu.*

#### Le trou n'était pas dans l'argent, il était dans les fichiers

`uploadMedia` stocke le fichier et rend sa clé. **C'est un second appel HTTP qui l'attache à un
message.** Entre les deux, tout peut s'arrêter — l'utilisateur renonce, le réseau tombe,
l'application se ferme.

Le fichier reste alors référencé par rien. Et rien ne vient le chercher : **aucun balayage, aucune
purge, aucune durée de vie**. Sur une plateforme de santé, ce sont des photos et des messages vocaux
médicaux conservés sans propriétaire et hors de toute règle de rétention.

M03 fait pourtant la chose juste — il efface le fichier si le rattachement échoue. Il le peut :
chez lui, les deux étapes tiennent dans **un seul appel**. M06 ne le peut pas.

*La même faute se corrige dans un module et pas dans l'autre, non par négligence, mais parce que la
forme de l'appel a changé. Un motif de code ne se copie pas ; il se re-décide.*

#### En mesurant, on a trouvé le défaut déjà réalisé — ailleurs

Avant d'écrire le correctif : un script de comptage, en lecture seule, sur la production. Zéro média
de session — le défaut de M06 est **latent**.

Mais la même mesure a montré **trois pièces justificatives sur trois sans propriétaire**. Origine
retrouvée : `scripts/menage-comptes-demo.ts` supprimait les lignes `SupportingDocument` des comptes
de démonstration **sans effacer les fichiers**. Deux pièces d'identité et un diplôme, chiffrés,
dorment en base depuis le 24 août.

*On était venu vérifier une hypothèse ; c'est la mesure qui a trouvé le vrai cas. Compter avant de
corriger ne sert pas seulement à chiffrer l'urgence — cela change parfois ce qu'on corrige.*

#### Le remède pouvait détruire ce qu'il protégeait

Un balayage de fichiers qui se trompe efface des photos, des vocaux et des pièces d'identité
**médicales**, sans retour possible. C'est le geste le plus dangereux écrit depuis le début de ce
journal.

La règle est donc construite pour que **son défaut soit de ne rien faire** :

* un **préfixe inconnu n'est jamais effacé**. Le jour où un module ajoutera un quatrième type de
  fichier, il l'écrira avant que ce balayage n'apprenne où ses clés sont référencées ;
* les cinq sources de références sont relues **à chaque passage**, jamais mises en cache : un
  ensemble incomplet est la seule façon dont ce balayage peut nuire ;
* un délai de grâce de 24 h protège celui qui téléverse une photo puis prend son temps pour écrire
  la légende du message qui la portera.

*Quand le remède peut détruire, on n'écrit pas la règle qui nettoie le mieux : on écrit celle qui se
trompe le moins mal.*

#### Réparer le balayage ne dispense pas de réparer le script

Le balayage quotidien ramassera les trois pièces orphelines. Le script de ménage a quand même été
corrigé pour effacer les fichiers avec les lignes.

Laisser un script sale en s'appuyant sur un balayage, c'est déplacer la responsabilité vers un
mécanisme qui n'était pas là pour ça — et qui, lui, attend vingt-quatre heures.

*Un script qui sait ce qu'il supprime ne doit pas s'en remettre à un ramasseur.*

### Ce que le chantier 50 (la relecture de M13) a appris

*06/09/2026 — relecture d'un module entier, à la recherche de routes mortes.*

#### Il n'y avait aucune route morte — et c'est mon outil qui mentait, deux fois

Le balayage a d'abord annoncé **17 routes sans appelant**. Aucune n'en était une.

Deux causes, et les deux étaient dans l'outil : il ne lisait que le client web — or le mobile sert le
PATIENT, à qui appartient la moitié des routes — et il ne suivait pas les **constantes de route** du
mobile, qui vivent dans `contracts.ts` et non sur le site d'appel. Corrigé, il restait 17 candidates ;
vérifiées une par une, **toutes fausses** : celles qui mêlent une constante et une chaîne de requête
(`${AUTH_ROUTES.emailAvailable}?email=...`) lui échappent encore.

*C'est la deuxième fois en deux jours que cet outil se trompe, et la deuxième fois qu'une
vérification à la main le rattrape. Un outil de balayage propose ; il ne conclut pas.*

#### Ce que la lecture a trouvé, et qu'aucun balayage n'aurait vu

`confirmWithdrawal` fait trois choses, et il a raison de les séparer :

1. **TX 1** — revendication, **débit du solde**, mouvement, audit ;
2. **appel réseau** à l'agrégateur, hors transaction (RM-13-03 : on ne tient pas une transaction
   ouverte pendant un appel réseau) ;
3. **TX 2** — `EXECUTED`, ou `FAILED` avec re-crédit intégral.

**Si le processus meurt entre 1 et 3, l'argent est débité et personne ne le sait.** Et quatre portes
se ferment d'un coup :

* l'utilisateur ne peut pas réessayer — la revendication exige `aggregatorRef: null`, il reçoit
  « déjà en cours de traitement », **pour toujours** ;
* la réconciliation quotidienne ne le voit pas : elle ne lit que les retraits `EXECUTED` ;
* aucune route d'administration ne peut le débloquer ;
* et il **empêche la clôture du compte** — `m01` compte les `PENDING` parmi les prérequis. Le
  soignant ne peut donc même pas partir.

Le plan gratuit de Render endort le service après ~15 minutes et le redémarre à la demande. Un
déploiement pendant cette fenêtre suffit.

*Un défaut de ce genre ne se voit ni dans les tests, ni dans les routes, ni à l'écran. Il se voit en
lisant trois transactions à la suite et en se demandant ce qui arrive si le courant tombe entre deux.*

#### Le remède était plus dangereux que le mal

Le réflexe est de re-créditer tout retrait bloqué. **Ce serait payer deux fois** le soignant dont le
virement est effectivement parti — une fois par l'agrégateur, une fois par le solde. Et personne ne
le verrait avant la réconciliation du lendemain, voire jamais si le montant se noie dans le flux.

Le balayage ne décide donc pas : il **demande à l'agrégateur** (`listConfirmed`, le relevé qui sert
déjà à la réconciliation). Ligne `PAYOUT` présente → on solde sans rien re-créditer. Absente → on
re-crédite. **Relevé illisible → on ne fait rien**, et le prochain passage réessaiera.

*Devant de l'argent, « je ne sais pas » est une décision valide, et souvent la seule qui ne coûte rien.*

#### Mesurer avant de dramatiser

Avant d'écrire une ligne de correctif : `scripts/etat-retraits.ts`, en lecture seule, sur la
production. Réponse : **zéro retrait, zéro compte de gains**.

Le défaut est donc **latent**. Il n'a volé personne, et il ne le pourra pas avant le premier vrai
retrait — c'est-à-dire avant qu'un agrégateur réel soit choisi (ADR-09, ouvert). Cela ne le rend pas
moins réel ; cela dit seulement qu'on le corrige **avant**, et non **après**.

#### TypeScript compilait, et l'API n'aurait pas démarré

Le balayage vit dans M13 et s'appelle depuis M16. TypeScript n'a rien dit — il ne connaît pas
l'injection de dépendances de Nest. C'est en montant l'arbre complet (`relever-routes.ts`, avec un
Prisma bouchonné) que l'erreur est apparue : *« Nest can't resolve dependencies of the
SchedulerService »*. `EarningsService` n'était pas exporté par son module.

**En production, l'API n'aurait pas démarré du tout.**

*Le compilateur vérifie les types, pas le câblage. Monter l'arbre coûte trente secondes et couvre
exactement ce que les 546 tests unitaires ne regardent jamais.*

#### Une constante technique n'est pas un paramètre métier

Le délai au-delà duquel un retrait est déclaré orphelin — quinze minutes — n'est **pas** un PM-xx, et
c'est délibéré : il ne décrit aucune règle opposable à un utilisateur, seulement une marge technique.

Il y avait une seconde raison, plus pratique : **Render ne joue jamais le seed**. Un PM-xx neuf
serait donc ABSENT de la base de production, et `params.getInt` jette sur une clé manquante — le
balayage serait mort à chaque passage, silencieusement.

*Toute règle chiffrée ne mérite pas un paramètre. Et tout paramètre neuf demande une écriture en
base que personne ne pense à faire.*

### Ce que le chantier 49 (le code dicté) a appris

*06/09/2026 — les deux dettes ouvertes la veille, soldées le lendemain.*

#### Un code court ne raccourcit rien si l'identifiant reste dans l'URL

La dette disait : « que `claim/start` émette un code court ». En l'écrivant, l'évidence a sauté aux
yeux — `POST /sub-profiles/:id/claim` porte le sous-profil **dans son chemin**. Un code court à côté
n'aurait rien changé : le majeur aurait toujours dû connaître l'UUID du sous-profil.

Il a donc fallu une route où **le sous-profil n'est pas dans l'URL**. Le code ne raccourcit pas la
transmission : il la remplace.

*Une dette chiffrée la veille reste une hypothèse. Le devis se refait en ouvrant le fichier.*

#### Les deux membres de chaque paire douteuse, pas seulement l'un

L'alphabet du code exclut `0` **et** `O`, `1` **et** `I` **et** `L`, ainsi que `U`.

Le réflexe est d'en garder un des deux — « on enlève le zéro, on garde le O ». C'est une erreur :
celui qui écoute « o » ne sait toujours pas lequel écrire, et s'il se trompe, **sa faute est
silencieuse** — le code semble valide et le serveur répond « aucun transfert ».

En retirant les deux, une erreur d'écoute devient un signe hors alphabet, donc un refus immédiat,
donc un « répétez ».

*Un code fait pour l'oreille ne se conçoit pas comme un code fait pour l'œil.*

#### Résoudre n'est pas re-décider

`claimByCode` retrouve l'intention par son code, puis **appelle `claim`**. Elle ne re-vérifie ni
l'âge, ni le statut, ni l'OTP, ni la course sur la transition.

La tentation était d'écrire une seconde méthode complète — c'était plus direct à lire. C'était aussi
le meilleur moyen d'avoir un jour deux règles de transfert, dont une seule aurait été corrigée.

*Un confort de saisie ne justifie jamais un second exemplaire d'une règle.*

#### Une règle recopiée, assumée et bornée

L'alphabet est écrit **deux fois** : côté serveur pour tirer le code, côté mobile pour le relire.
C'est exactement ce que ce projet traque partout ailleurs.

Elle est assumée, et la raison est écrite dans le fichier : le contrôle côté mobile sert à dire
« répétez » **avant** l'appel. Ne pas recopier voudrait dire ne rien vérifier, et laisser le serveur
répondre « aucun transfert avec ce code » — ce qui ferait chercher le défaut dans le transfert plutôt
que dans la dictée.

Et la divergence possible est bornée **dans le bon sens** : un alphabet élargi côté serveur ferait
refuser localement un code pourtant valide — une gêne, jamais un trou.

*Toutes les copies ne se valent pas. Celle qu'on peut nommer, justifier et borner n'est pas celle
qu'on découvre trois mois plus tard dans un troisième fichier.*

#### Une route publique se justifie clé par clé

`GET /v1/parameters` aurait pu servir tous les PM-xx : une ligne de code de moins.

Elle en sert **trois**, chacune ouverte avec sa raison écrite au-dessus. Le critère retenu : le
paramètre décrit-il une règle que l'utilisateur **rencontre de toute façon** ? L'âge minimum lui est
opposé à l'inscription, l'échelle de notation s'affiche sous chaque étoile, le délai de confirmation
court sous ses yeux. Les publier ne révèle rien.

Les plafonds de retrait, les seuils d'alerte et les seuils de fiabilité restent où ils sont.

#### Une dette qu'on solde doit servir le jour même

La n°27 est née d'un écran précis : le Carnet familial, qui ne pouvait pas savoir à quel âge un
transfert devient possible.

La route a donc été **employée là, aussitôt** — l'écran lit l'âge requis et grise les personnes trop
jeunes en disant pourquoi. Et si la lecture échoue, **il ne bloque rien** : le serveur reste
l'arbitre, exactement comme avant.

*Une route qu'on ouvre sans l'appeler est une route morte le jour de sa naissance.*

### Ce que le chantier 48 (le Carnet rendu) a appris

*06/09/2026 — écart D, et premier retour sur le mobile depuis le chantier 30.*

#### L'écart annonçait un écran ; le serveur imposait une chorégraphie

« Le patient ne peut pas revendiquer son sous-profil. » Lu ainsi, c'est un bouton.

En lisant `claim`, le geste s'est révélé être une **cérémonie à deux personnes** :

* le tuteur lance, et reçoit un OTP sur **son** téléphone ;
* le majeur revendique depuis **son** compte, avec l'OTP du tuteur ;
* et il lui faut aussi `subProfileId` et `intentId` — **deux UUID** qu'il ne peut pas connaître, le
  serveur répondant « introuvable » à qui n'est pas le tuteur, exprès, contre l'énumération.

Trois valeurs, deux comptes, deux téléphones. **Le copier-coller ne traverse pas deux appareils** :
le seul chemin réel est le partage natif, ou la voix.

*Un écart se mesure sur ce que l'écran doit montrer. Ce qu'il coûte se lit dans le serveur.*

#### Le chantier aurait créé le défaut qu'il ne cherchait pas

`listSubProfiles` ne filtre pas par statut : le tuteur **garde dans sa liste** les Carnets transférés.
Et `RM-07-06` est net — il en perd l'accès au commit.

Avant ce chantier, la question ne se posait pas : aucun transfert n'était possible, donc aucune ligne
n'était dans cet état. **Livrer le bouton seul aurait donc fabriqué un cul-de-sac** — une ligne qui
s'ouvre sur un refus, dans l'écran même qui vient de réussir le transfert.

*Un geste nouveau produit des états nouveaux. La question n'est pas seulement « est-ce que ça
marche », c'est « à quoi ressemble l'écran une fois que ça a marché ».*

#### Ne pas recopier un nombre, même quand ça coûte

Le transfert n'est possible qu'à partir de PM-16. L'écran aurait pu n'offrir le geste qu'aux
sous-profils assez âgés — c'était plus élégant.

Mais **PM-16 n'est servi à aucun client** : la route des paramètres est réservée au
super-administrateur. Écrire « 18 » dans l'application aurait donné un écran juste aujourd'hui et
menteur le jour où le paramètre change.

Le geste est donc proposé à tous, et le serveur refuse en nommant l'âge. Ce n'est pas idéal —
l'utilisateur découvre la règle par un refus — et c'est pourquoi la **dette n°27** est ouverte avec
son chiffrage plutôt que laissée en commentaire.

*Entre un écran qui devine et un écran qui demande, on choisit celui qui demande.*

#### Ce qui désigne et ce qui autorise ne voyagent pas ensemble

Le code partagé contient les deux identifiants. Il **ne contient pas** l'OTP, et un test s'en assure.

La raison n'est pas théorique : ce message restera des mois dans une conversation WhatsApp. S'il
portait aussi les six chiffres, il serait à lui seul un sésame pour quiconque relit la conversation —
un frère, un téléphone prêté, un appareil revendu.

*Le code désigne, l'OTP autorise. Deux rôles, deux canaux.*

#### Tolérant sur la forme, strict sur le fond

Un code qui traverse une messagerie revient décoré : espaces, retour à la ligne, majuscule
automatique. Rien de tout cela ne change un identifiant — le refuser ferait accuser le tuteur d'une
faute qu'il n'a pas commise.

Mais un code **coupé** est refusé net, et c'est le cas qui compte : un UUID amputé reste *plausible*.
Envoyé au serveur, il revient « introuvable » — et les deux personnes chercheraient le défaut dans le
transfert alors qu'il est dans le message tronqué.

*La validation la plus utile n'est pas celle qui protège le serveur : c'est celle qui évite de faire
chercher au mauvais endroit.*

### Ce que le chantier 47 (les raccourcis) a appris

*05/09/2026.*

#### Le raccourci n'était pas le travail ; l'endroit où le lire l'était

Ctrl+K avait été livré la veille. Il fonctionnait. Et il n'existait, pour l'utilisateur, nulle part :
son seul témoignage était un attribut `aria-keyshortcuts` sur le bouton loupe — c'est-à-dire rien,
sauf pour qui navigue au lecteur d'écran.

La moitié utile de ce chantier n'est donc pas le second raccourci, c'est le **panneau `?`**. Et il ne
liste pas seulement ce que ce module déclenche : il liste aussi Entrée, Maj+Entrée et Échap du
composeur de consultation, écrits des semaines plus tôt dans un autre fichier.

*On cherche « les raccourcis de l'application », jamais « les raccourcis déclenchés par tel module ».
Une documentation rangée selon le code est rangée pour le mauvais lecteur.*

#### Une touche simple appartient à celui qui écrit

`/` et `?` ne sont pas des commandes : ce sont des **caractères**.

Le motif d'un refus de vérification accepte deux mille caractères, et un administrateur y écrit des
dates. Sans garde, taper « 20/09 » aurait ouvert la palette de recherche au milieu du mot — la
saisie perdue, et surtout **aucun moyen de comprendre ce qui venait de se passer**.

Ctrl+K est l'exception, et elle est raisonnée : une combinaison à modificateur ne produit aucun
caractère. L'interdire en saisie retirerait le raccourci exactement là où il sert le plus — au milieu
d'un long texte, quand on veut vérifier un nom.

#### AZERTY : `e.key` et jamais `e.code`

Les utilisateurs sont au Congo-Brazzaville, donc majoritairement en AZERTY. Sur ce clavier, `/`
s'obtient par Maj+: et `?` par Maj+, — ni l'un ni l'autre là où un QWERTY les met.

`e.code` nomme la **touche physique** ; il aurait donc désigné une autre touche sur chaque
disposition, et le raccourci serait tombé sur un caractère au hasard. `e.key` donne le **caractère
réellement produit**.

Même raison pour ne pas tester `e.shiftKey` sur `?` : l'exiger interdirait le raccourci aux
dispositions qui produisent ce caractère autrement.

*Un raccourci écrit pour le clavier de celui qui code ne marche que chez lui.*

#### Deux défauts de mon propre travail, trouvés par mes propres tests

**La garde ratait les zones de texte riche.** `isContentEditable` ne répond que pour l'élément visé —
or la frappe peut viser un élément imbriqué dans la zone éditable. `closest` pose la vraie question :
« suis-je quelque part dans une zone où l'on écrit ? »

**L'écouteur se réabonnait à chaque rendu.** La coquille passe des fonctions fléchées écrites sur
place, neuves à chaque fois ; les mettre en dépendance détachait puis rattachait l'écouteur à chaque
frappe et chaque changement d'écran. Le fichier promettait « un seul écouteur » dans son en-tête et
en posait un par rendu. Corrigé par une référence.

*Le second ne se voyait dans aucun test et n'aurait cassé personne. Il rendait simplement le
commentaire menteur — ce qui suffit.*

#### Déplacer plutôt qu'ajouter

Le réflexe était d'ajouter un écouteur pour `?` à côté de celui de Ctrl+K. Deux écouteurs, donc
**deux gardes de saisie à tenir d'accord** — et le jour où l'une oublie un cas, un raccourci s'invite
au milieu d'un message.

L'écouteur du chantier 46 a donc déménagé dans la coquille, et la palette de recherche est devenue
pilotée : elle n'a plus d'état propre.

*Deux chemins vers le même geste finissent toujours par diverger. Le bon moment pour les réunir est
celui où l'on s'apprête à en ouvrir un second.*

#### Ce que le panneau dit en dernier

« Tout se fait aussi à la souris. Ces raccourcis ne font que raccourcir. »

Une liste de raccourcis peut donner l'impression qu'il faut les connaître pour se servir de
l'application. Sur une plateforme que des soignants découvrent, cette impression coûte plus qu'elle
ne rapporte.

### Ce que le chantier 46 (la recherche globale) a appris

*05/09/2026.*

#### Chercher suppose qu'il y ait quelque chose à chercher

Le premier travail n'a pas été d'écrire une palette, mais de relever ce que l'API sait chercher.
Réponse : **une seule route**, `GET /v1/admin/accounts?query=`, et elle est réservée à deux
sous-rôles.

Tout le reste se *filtre* et ne se *cherche* pas : le journal d'audit par action et acteur **exacts**,
les pièces par dossier, les consultations par participant, la file de vérification par statut. Aucun
texte libre nulle part ailleurs.

Une palette qui aurait proposé « chercher une consultation » aurait donc été une promesse sans
serveur derrière. Elle dit l'inverse, en bas, en une phrase.

*Le plus utile qu'une recherche puisse faire, quand elle ne trouve pas, c'est dire qu'elle ne
cherchait pas là.*

#### « Aucun résultat » et « je n'ai pas pu chercher » ne se disent pas pareil

C'est la règle du projet — *une lecture qui échoue n'est ni un zéro ni un « non »* — et c'est ici
qu'elle coûte le plus cher.

Un administrateur cherche « Okemba », le réseau tombe, la palette affiche « aucun compte ». Il en
conclut que cette personne n'existe pas. Sur une plateforme de santé, cette conclusion précède des
suspensions et des refus.

L'échec porte donc `role="alert"`, une phrase qui dit ce qui s'est passé, et **surtout** : *« Ce
n'est pas une réponse. »*

#### Les capacités se lisent, elles ne se réécrivent pas

Le droit de chercher des comptes appartient à `ADMIN_VERIFICATION` et `ADMIN_MAP` (plus le
super-administrateur, qui passe partout). Écrire cette liste dans la palette aurait été la troisième
copie d'une même règle.

Elle est donc **lue sur l'entrée `admin-comptes` de `NAV_GROUPS`**, qui la porte déjà — avec le
commentaire qui l'explique. C'est exactement la correction apportée au chantier 37, où une liste
recopiée avait réduit un écran au seul super-administrateur.

*Une règle recopiée est une règle qui dérive. Elle a dérivé une fois ; on ne la recopie plus.*

#### Un résultat doit mener quelque part

Proposer un compte et ouvrir un écran vide serait pire que ne rien proposer : l'administrateur
retaperait le nom qu'il vient de taper.

`ComptesPage` lit donc `?q=` à l'ouverture — **une seule fois**, sinon l'URL écraserait ce qu'il est
en train de saisir.

#### Le plafond, encore

`searchAccounts` s'arrête à 50 lignes. Cinquante résultats muets passent pour la totalité — la même
faute que l'export d'audit tronqué du chantier 45, à un jour d'intervalle et dans un autre module.

*Les bornes silencieuses ne sont pas un accident isolé : c'est un motif. Chaque `take:` du serveur
est une phrase que l'écran doit savoir dire.*

#### L'apostrophe, pour la troisième fois

Trois tests de deux chantiers sont tombés sur la même chose : mes motifs cherchaient l'apostrophe
courbe (`’`), l'écran écrit la droite (`'`).

La convention du dépôt est pourtant nette — 16 150 droites contre 572 courbes, ces dernières
uniquement dans les chaînes entre quotes simples où la droite fermerait la chaîne. Elle n'est écrite
nulle part, seulement pratiquée.

*Une convention qu'on ne peut découvrir qu'en la violant coûte un aller-retour à chaque fois. Elle
est désormais écrite ici.*

### Ce que le chantier 45 (les deux nettoyages) a appris

*05/09/2026 — écarts E et F du plan des écrans du soignant.*

#### Le défaut n'était pas celui qu'annonçait l'écart

L'écart E disait : « le journal ne s'exporte pas ». Vrai, et facile à corriger — un bouton.

En lisant `exportAuditCsv` pour savoir quoi appeler, on a trouvé `take: 5000`. **Sans aucune trace
dans le fichier produit.** Un administrateur exportant un journal de 12 000 entrées recevait 5 000
lignes, avec le même en-tête, le même format, la même apparence qu'un export intégral.

Le vrai défaut n'était donc pas l'absence de bouton : c'était qu'ajouter le bouton, tel quel, aurait
**livré un mensonge** — un fichier incomplet remis à un contrôle, à un conseil, à un avocat.

*Le pire défaut d'un export n'est pas de manquer : c'est d'être partiel sans le dire.*

#### Le plafond appartient au serveur, pas à l'écran

Le réflexe était d'écrire `if (lignes === 5000) avertir` dans le web. C'est une **règle recopiée** —
exactement ce que le chantier 43 venait de payer avec la formule du taux, présente en trois
exemplaires.

Le serveur demande donc **une ligne de plus que le plafond** : si elle revient, il y avait une suite,
et il le dit en en-tête. L'écran ne connaît aucun nombre ; il lit `X-Export-Truncated`.

*Il a fallu un détail de plus, et facile à oublier : `Access-Control-Expose-Headers`. Le web est
servi depuis une autre origine que l'API — sans cette ligne, `fetch` ne voit aucun en-tête
personnalisé, et l'avertissement n'aurait jamais paru. Silencieusement.*

#### La prescription de l'écart F aurait cassé le dépôt de pièces

Elle disait : « retrait de la route, du DTO **et de la méthode de service** ».

`M03Service.addDocument` n'est pas morte : `uploadDocument` l'appelle pour rattacher la pièce une
fois le fichier stocké — et c'est précisément là que naît la `fileKey` qu'aucun client ne savait
produire. La suivre à la lettre aurait supprimé le seul chemin de dépôt qui fonctionne.

*Deux plans de suite se sont trompés sur ce qu'ils prescrivaient — l'écart C sur sa cause, l'écart F
sur son remède. **Un plan est une hypothèse datée. On le relit dans le code avant de l'exécuter.***

#### Ce qu'on ne peut pas garantir, et qu'on écrit plutôt que de le faire croire

Rendre `addDocument` privée aurait été la vraie garantie — plus personne ne peut la ré-exposer par
distraction. Impossible : `tsconfig.json` type-vérifie `test/`, et deux specs d'intégration
l'appellent du dehors. La compilation casserait.

C'est écrit dans le code, à l'endroit où quelqu'un se posera la question, plutôt que laissé à
deviner.

#### Un périmètre se vérifie par les routes servies

`relever-routes.ts` en compte **160**, comme avant : `reinstate` ajoutée au chantier 43 (+1) et
`me/documents` retirée ici (−1) se compensent exactement.

Un total inchangé aurait pu passer pour « rien n'a bougé ». Les deux routes ont donc été vérifiées
nommément — l'une présente, l'autre absente, la variante `/upload` intacte.

*Un compte global qui ne bouge pas ne prouve pas qu'il ne s'est rien passé.*

### Ce que le chantier 44 (le levier de l'avenant) a appris

*05/09/2026 — écart C du plan des écrans du soignant.*

#### La prémisse de l'écart était fausse, et ne pas la vérifier aurait donné le mauvais écran

Le plan disait : *« le parcours de re-signature existe… et rien ne peut le déclencher »*. C'était la
justification entière de l'écart.

En cherchant où poser le bouton, on a trouvé `reissuedCount` dans le client web — et derrière,
`m16.parameters.service.ts` : **changer PM-01 réédite déjà les contrats en masse.** Le parcours du
chantier 8 n'était donc pas mort ; il se déclenchait, mais jamais à l'unité.

Si on avait écrit le bouton sur la foi du plan, on aurait livré « le seul moyen de rééditer un
contrat » — une phrase fausse dans un écran d'administration.

*Un écart mesuré la semaine dernière est une hypothèse, pas un fait. On le relit avant d'y répondre.*

#### Ce que le lot en masse laisse tomber, et personne ne le voit

Trois trous, lus dans le code du lot :

* il ne prend que `status: VERIFIED` **avec une version signée**. Un soignant vérifié qui n'a pas
  encore signé garde donc un contrat à l'ancien taux — **et le signerait tel quel** ;
* il est borné à `REISSUE_BATCH = 500` ;
* la boucle attrape les erreurs, les journalise, et **continue**. Un contrat en échec n'est plus
  jamais repris.

Aucun des trois ne produit d'alerte. Ils se voient en lisant la boucle, pas en regardant l'écran.

*Un traitement par lot qui « continue malgré les erreurs » ne perd pas ses erreurs : il perd la
mémoire de les avoir eues.*

#### Le bouton suspend le soignant, et le nom du geste ne le dit pas

`canPracticeEffective` = Badge Vérifié **et** version courante signée. Rééditer crée une version
**non signée**. Et `VerificationStatusService` relit cette règle **à chaque requête, sans cache** —
M05 refuse alors la publication d'offre, M06 la nouvelle poignée de main.

Donc : cliquer « rééditer le contrat » d'un médecin en exercice **l'empêche d'exercer, à l'instant**,
jusqu'à ce qu'il signe. Rien dans le nom du geste ne l'annonce.

*C'est la même leçon que la révocation au chantier 42, et elle s'est présentée deux fois en deux
jours : **le geste ne se lit pas dans son nom.***

#### La même carte dit deux choses différentes selon l'état du soignant

Le soignant qui a signé **perd** son exercice. Celui qui n'a pas encore signé **ne perd rien** — il
ne pouvait déjà pas exercer, et la réédition le sauve d'un contrat périmé.

Servir le même avertissement aux deux aurait été une fausse alarme dans un cas sur deux. Et une
fausse alarme répétée est exactement ce qui apprend à ne plus lire les vraies.

#### Pas de bouton du tout quand il n'y a rien à faire

Quand le contrat est déjà au taux courant, la carte le dit — et **n'offre aucun bouton**. Le serveur
est idempotent, un clic serait sans effet ; mais un bouton sans effet enseigne que les boutons de
cet écran ne font peut-être rien.

*Un interrupteur qui ne change rien est pire qu'un interrupteur absent.*

#### Une convention typographique qu'aucun document n'écrivait

Deux tests sont tombés sur une apostrophe. Le dépôt emploie **la droite (16 150 occurrences)** dans
le JSX, et **la courbe (572)** uniquement dans les chaînes entre quotes simples, où la droite
fermerait la chaîne.

C'est cohérent, et ce n'était écrit nulle part — seulement pratiqué.

### Ce que le chantier 43 (solder plutôt que réciter) a appris

*04/09/2026 — sur une remarque du porteur, et elle était juste.*

#### Une dette qu'on répète est une dette qu'on ne fait pas

Trois séances de suite s'étaient terminées par la même phrase : « la dette n°23 attend votre
arbitrage, la n°24 attend votre geste, la n°25 attend votre décision ». Le porteur a fini par le
dire : *« je t'avais dit de tout résoudre, non ? »*

Le compte, fait pour de bon plutôt que de mémoire, lui a donné raison. **Sur douze dettes ouvertes,
six n'attendaient que moi** :

* **trois portaient déjà leur propre réponse** — la n°8 avait été tranchée par le porteur la veille,
  la n°13 était inventoriée et livrée aux deux tiers, la n°15 recommandait elle-même de ne rien
  faire. Elles étaient restées en rouge par inertie, pas par indécision ;
* **trois étaient présentées comme des arbitrages** alors qu'elles portaient chacune une
  recommandation motivée, chiffrée, et que rien n'empêchait de l'appliquer.

*Une recommandation qu'on n'applique pas est un avis. Demander l'accord de quelqu'un pour faire ce
qu'on lui a soi-même conseillé, c'est lui rendre son propre travail.*

#### Le tableau des dettes était malformé, et huit relectures ne l'avaient pas vu

Trois lignes — n°8, n°13, n°15 — n'avaient **aucune colonne « état »**. Deux barres verticales au
lieu de trois : en Markdown, la cellule n'existe simplement pas. Elles se lisaient donc comme des
dettes sans statut, ce qui les rendait invisibles au décompte autant qu'à la décision.

Ce n'est pas un détail de mise en forme. C'est ce qui explique que trois dettes déjà résolues aient
continué de figurer parmi les ouvertes : **rien ne pouvait les marquer closes, faute d'endroit où
l'écrire.**

*Un tableau de suivi qui ne peut pas dire « fait » ne suit rien.*

#### Deux phrases livrées la veille sont devenues fausses en une heure

Le chantier 42 avait écrit, dans l'écran ET dans le client d'API : *« Il n'existe aucun moyen de le
rétablir depuis la plateforme. »* C'était exact — `LEGAL_TRANSITIONS.REVOKED` valait `[]`.

Ouvrir la sortie (dette n°25) a rendu ces deux phrases mensongères le jour même. **Un test est tombé
pour le dire, seul de toute la suite de 599.**

Il aurait été facile de le « réparer » en assouplissant son attente. Il a été redressé dans l'autre
sens : il exige maintenant *plus* qu'avant — l'effet immédiat, la sortie, et le fait que cette sortie
ne rend pas le badge.

*Une carte qui promet plus de gravité que le serveur n'en applique ment autant qu'une qui en promet
moins.*

#### La règle du taux vivait dans trois fichiers

La dette n°23 demandait de retirer les refus motivés du dénominateur. En cherchant où changer la
formule, on en a trouvé **trois copies** : `m05.policies.ts` (l'annuaire public),
`m16.dashboard.service.ts` (le tableau de bord du médecin) et `m16.kpi.service.ts` (le pilotage).

Changer la règle à un seul endroit aurait fait afficher **deux pourcentages différents pour le même
médecin**, sur deux écrans de la même application — et personne ne l'aurait su avant qu'un médecin
ne le remarque lui-même.

*Une règle recopiée est une règle qui dérive — et la dérive ne se voit que du dehors.*

#### Ce qu'un indicateur public fabrique comme comportement

Le taux valait « confirmées / sollicitations ». Un refus motivé y pesait donc **exactement autant
qu'une demande laissée expirer sans un mot**.

Or les deux ne rendent pas le même service : un refus rapide fait gagner du temps au patient, qui va
voir ailleurs ; une expiration lui en fait perdre. Les confondre décourageait le seul des deux
comportements qui serve le patient.

Et le corollaire, qui a décidé de la forme de la tuile : **un médecin qui ignore ce qu'on lui compte
ne peut rien en faire.** Retirer les refus du calcul sans le dire à l'écran n'aurait rien changé à
son hésitation devant une demande hors de sa spécialité. La tuile annonce donc son assiette — « sur
7 demandes · refus non comptés ».

*Un indicateur public ne mesure pas seulement un comportement : il en fabrique un.*

#### La vérité des chiffres de démonstration était meilleure que ma propre dette ne l'annonçait

La dette n°24 annonçait que le vrai taux de `dr.armel` serait de **50 %** — j'avais compté ses deux
demandes par leur statut FINAL (une payée, une expirée).

Le recalcul, lui, reconstruit ce que les événements auraient produit : `confirmedTotal` compte les
**confirmations**, et une demande confirmée puis expirée faute de paiement **reste une réponse du
médecin**. Le taux réel est donc de **100 %**, pas 50.

*Un compte fait de mémoire n'est pas un compte — même quand c'est le mien, et même quand il accuse
au lieu d'excuser.*

### Ce que le chantier 42 (la révocation) a appris

*04/09/2026 — écart B du plan des écrans du soignant.*

#### L'écart annonçait un bouton ; le serveur annonçait une porte qui ne se rouvre pas

Le plan disait : « un bouton dans E1, avec motif obligatoire et confirmation — la route existe et
journalise déjà. ~2 h. »

En lisant le serveur avant d'écrire, deux faits ont changé la nature du chantier :

* `LEGAL_TRANSITIONS.REVOKED` vaut `[]` — **un dossier révoqué n'a aucune sortie** ;
* `VerificationCase.professionalId` est `@unique` — **un professionnel n'a qu'un dossier, à vie**.

Révoquer ne retire donc pas un badge : cela **ferme définitivement l'accès d'un soignant à la
plateforme**, sans aucun moyen de le rétablir depuis le produit.

*Un administrateur qui aurait cliqué en pensant « il refera son dossier » aurait détruit une
carrière sur la plateforme. **L'écran doit dire ce que le geste fait, et le geste ne se lit pas dans
son nom.***

#### Ce que le ton d'un message dit à un lecteur d'écran

Mon avertissement « Ce geste est définitif » utilisait le ton `erreur`. Un test l'a signalé sans le
chercher : il trouvait **deux `role="alert"`** dans la même carte — l'avertissement permanent et
l'échec réel de la requête.

Or le projet distingue déjà les deux, et c'est écrit dans `parts.tsx` : *« erreur » dit qu'une
action a ÉCHOUÉ ; « alerte » qu'une action MANQUE*. Ici **rien n'a échoué** — on prévient de ce qui
va arriver.

Deux alertes dans une carte les rendent toutes deux indistinctes : celle qui interrompt pour
prévenir d'un danger, et celle qui interrompt parce qu'une requête vient d'échouer.

*Le rouge n'est pas une intensité : c'est un état. Il appartient à ce qui a échoué.*

#### Cinq tests tombés, et le code était juste

Cinq de mes dix tests sont tombés à la première exécution. Diagnostic : `monter()` n'attend que
l'ouverture du panneau, et ce panneau s'ouvre **dès que l'URL porte un dossier** — donc avant que la
requête ait répondu. Une lecture synchrone juste après ne trouvait qu'un squelette : aucun champ,
aucune étiquette.

Les tests qui passaient étaient ceux qui utilisaient `findByText` — asynchrone, donc patients.

*Le réflexe, devant cinq échecs, est de soupçonner le code. **Ici le harnais regardait trop tôt** —
et il valait mieux le découvrir en écrivant les tests qu'en croyant à un défaut inexistant.*

#### Une dette naît de ce chantier, et elle n'est pas de moi

Rien ne permet de **rétablir** un soignant révoqué par erreur. Ni transition, ni second dossier, ni
route d'administration. La seule issue serait une écriture directe en base.

Le chantier ne pouvait pas le corriger — c'est une décision de produit, pas un bouton manquant.
Elle est inscrite au §9 (dette n°25) avec ses deux issues et leur coût.

*Livrer un geste irréversible impose de dire ce qu'il faudrait pour le défaire — même quand la
réponse est « rien ».*

### Ce que le chantier 41 ter (le fil archivé) a appris

*04/09/2026 — second défaut trouvé en vérifiant le chantier 41 en ligne.*

#### Une action sans limite de temps ne se range pas dans un conteneur limité au temps

La barre de gestes d'un message porte : répondre, réagir, modifier, retirer. Toutes ces actions
n'ont de sens que **pendant** la séance — la barre était donc conditionnée à `actif`, et c'était
juste.

J'y ai ajouté « Signaler » sans me demander si elle partageait cette limite. **Elle ne la partage
pas** : un abus se remarque souvent une heure plus tard, quand la consultation est close et qu'on y
repense. C'est même le cas le plus probable.

*Règle : **avant d'ajouter une entrée dans un menu, se demander si la condition du menu est aussi
la sienne.** Un conteneur transmet ses conditions en silence.*

#### Ma correction était trop large, et un test l'a refusée

Première version : rouvrir **tous** les gestes après la clôture. L'argument était vérifié — dans
`m06.session.service.ts`, seul `sendMessage` exige `status === ACTIVE` ; modifier, réagir et
supprimer ne contrôlent que la participation. Le serveur les accepte donc tous.

**Un test existant est tombé** : « une séance close n'offre plus aucun geste : le fil est archivé ».
Écrit au chantier 4, il défendait une décision de produit, pas une contrainte technique.

*Il avait raison, et j'avais tort. **Ce que le serveur autorise n'est pas ce que le produit veut.**
J'avais lu le code du serveur et j'en avais tiré une conclusion de conception — deux choses
différentes.*

#### Un test qui tombe n'a pas forcément tort

Le réflexe, quand un test bloque une correction qu'on croit bonne, est de le réécrire. Ici il
fallait le **lire** : son intitulé portait la raison (« le fil est archivé »), et cette raison
tenait toujours.

La bonne issue n'était ni « le test a tort » ni « ma correction a tort », mais une **exception
nommée** : l'archive ne se modifie pas, et signaler n'est pas la modifier — c'est alerter à son
sujet.

Le test a donc été **amendé et renforcé** (deux assertions de plus sur ce qui reste interdit),
jamais supprimé, et deux tests couvrent l'exception.

*C'est la même leçon qu'au chantier 39 sur `m06.report.overdue.admin` : **une exception nommée passe
avant toute règle générale**, et elle doit être écrite comme une exception, pas dissoudre la règle.*

#### Trois défauts du même chantier, tous trouvés en REGARDANT

Le chantier 41 est sorti avec 584 tests verts. La vérification en ligne en a trouvé **deux** — le
bouton hors de l'écran, puis le fil archivé — et aucun test ne pouvait les voir : le premier
demandait une mise en page, le second demandait de se placer dans une consultation TERMINÉE, ce
qu'aucun test du signalement ne faisait.

*La vérification en ligne n'est pas une formalité de fin de chantier. C'est une étape qui trouve
des choses, et elle en a trouvé deux sur trois ici.*

### Ce que le chantier 41 bis (le bouton hors de l'écran) a appris

*04/09/2026, dix minutes après la livraison du chantier 41.*

#### 586 tests verts et un bouton injoignable

La suite passait entièrement. Les huit tests du signalement passaient. Les types, le lint et la
compilation étaient propres. **Et la fonctionnalité était inutilisable sur un écran court.**

`jsdom` n'applique aucune feuille de style et ne calcule aucune mise en page. Un test de rendu voit
donc les éléments, leurs rôles et leurs textes — **jamais leurs dimensions**. Le bouton existait,
portait le bon intitulé, déclenchait la bonne requête. Il était simplement à 521 px dans une fenêtre
de 495.

*C'est exactement la leçon du chantier 21 (le responsive) et du chantier 35 (l'axe du graphique),
apprise une troisième fois : **certains défauts ne se voient qu'en REGARDANT.** La suite de tests ne
remplace pas l'œil, elle le complète.*

#### Le défaut n'était pas où je l'avais fait

Mon réflexe a été d'ajouter la hauteur maximale à MON formulaire. En regardant la primitive :
`DialogContent` n'en avait **aucune**, depuis toujours. Le défaut valait pour toutes les boîtes de
l'application — celle de révocation de session dans B3 comprise.

Corriger à l'usage aurait réparé un écran et laissé le piège en place pour le suivant.

*Règle : **quand un défaut apparaît dans le premier usage d'une primitive, il faut regarder la
primitive avant de corriger l'usage.***

#### Une correction se vérifie AVANT d'être poussée, quand c'est possible

La règle du projet interdit de tester en local, et le porteur pousse lui-même. J'aurais donc
normalement livré la correction à l'aveugle, puis vérifié après coup.

Il y avait mieux : appliquer les deux règles CSS à la boîte **déjà ouverte dans le navigateur du
porteur**, et remesurer. 740 px → 463 px, plus de débordement, bouton atteignable après défilement.

*La correction était prouvée dans le vrai navigateur, à la vraie taille, avant d'être écrite au
dépôt. Ça ne remplace pas la vérification après déploiement — ça évite de la faire deux fois.*

### Ce que le chantier 41 (le signalement) a appris

*04/09/2026 — premier chantier du plan des écrans du soignant.*

#### Vérifier ce que le serveur fait DÉJÀ, avant de promettre de l'écrire

En expliquant le chantier au porteur, j'ai annoncé deux heures de serveur en plus : une route
`GET /v1/reports/mine`, pour qu'un signalement ne parte pas dans un trou noir — la règle que le
projet s'était donnée en remplaçant l'adresse de support morte.

**Ces deux heures étaient inutiles.** `decideReport` notifie déjà l'auteur du signalement
(`m04.report.resolved`, avec l'issue mais sans le détail des sanctions, CU-04-03). La ligne était là
depuis le premier jour.

Ce qui manquait n'était pas la notification : c'était **un écran pour la lire**. Elle n'atteignait
personne jusqu'au 03/09, parce que le web n'affichait aucune notification. **Le chantier 37 a fermé
cette boucle sans que personne s'en aperçoive** — y compris moi, qui l'avais construit.

*Deux leçons en une. La première : **une fonctionnalité peut être complète côté serveur et invisible
faute d'un seul écran** — et on ne le voit qu'en suivant le chemin jusqu'au bout. La seconde :
j'avais annoncé un coût au porteur avant de l'avoir vérifié. L'annonce était fausse, et c'est lui
qui l'aurait payée.*

#### La phrase qui décide de l'usage de toute la fonctionnalité

`redactReportForAdmin` (RM-04-04) retire l'identité du signaleur avant que l'administration ne voie
quoi que ce soit. C'est une garantie du serveur, écrite et éprouvée.

**Mais elle ne sert à rien si personne ne la lit.** Un médecin qui reverra ce patient la semaine
prochaine ne signale pas s'il croit être nommé. La phrase est donc placée **avant** le formulaire, et
non dans la confirmation qui suit l'envoi : après, il est trop tard, la décision d'oser est déjà
prise.

*Une garantie technique invisible ne protège personne. Ce qui protège, c'est de la savoir.*

#### Le motif est une liste, et ce n'est pas une commodité d'interface

La file de modération trie par **gravité d'abord, ancienneté ensuite** (CU-04-04) : le harcèlement
passe devant le spam. C'est le code du motif qui porte cette gravité.

Un champ libre seul aurait donc produit des signalements **sans priorité**, traités en dernier —
exactement les plus urgents, si l'utilisateur avait mal choisi ses mots. La liste n'est pas là pour
simplifier la saisie ; elle est là pour que l'urgence arrive en tête.

#### Deux entrées, parce que l'administration a besoin de savoir laquelle

Signaler *un message* et signaler *un patient* ne sont pas le même acte, et le serveur ne les traite
pas de la même façon — la cible d'un message est l'identifiant DU message, celle d'un patient
l'identifiant de son COMPTE.

Les confondre enverrait à l'administration un dossier qu'elle ne peut pas instruire. **Le test
l'éprouve en injectant précisément la faute la plus probable** : signaler un message avec
l'identifiant de la séance. Il tombe.

#### Un chantier peut être « purement frontend » et ne rien avoir de trivial

Aucune ligne de serveur n'a été écrite. Et pourtant : deux entrées à placer, une liste fermée à
respecter, une garantie à énoncer au bon endroit, un type de cible à ne pas confondre, une valeur
(`FACILITY`) à ne surtout pas offrir.

*« Purement frontend » décrit où le code est écrit, pas ce qu'il faut savoir pour l'écrire.*

### Ce que le chantier 39 (le retrait des structures) a appris

*03/09/2026 — dette n°17, ouverte le 02/09 au chantier 26.*

#### « Personne ne peut entrer » ne veut pas dire « personne n'est dedans »

Le raisonnement qui autorisait le retrait était : *le type `FACILITY_MEMBER` est fermé à la
création depuis D-051, donc ces neuf routes sont inatteignables.*

Il est faux. **Fermer la porte d'entrée n'expulse pas ceux qui sont déjà dedans.** La connexion ne
regarde pas le type de compte : un `FACILITY_MEMBER` créé avant le 02/09 se connecterait encore, et
appellerait `GET /v1/facilities/me` ou `PATCH .../members/:id` sans rien enfreindre.

Retirer le code sur cette base, c'était **casser un accès réel en croyant supprimer du code mort**.

La réponse n'existait qu'à un seul endroit : la base de production. `scripts/inventaire-structures.ts`
l'a posée — **en lecture seule, sans un seul `create`, `update` ou `delete`** — et elle est
rassurante : zéro compte, zéro adhésion, zéro invitation, zéro transfert.

*La dette n°13 le disait déjà, et dans le bon ordre : **inventorier d'abord, décider ensuite.***

#### Le même inventaire a dit ce qu'il ne fallait PAS toucher

Il n'a pas seulement autorisé le retrait ; il a dessiné sa limite :

| Ce qu'il a trouvé | Ce que ça impose |
|---|---|
| 3 `Facility` | la table reste — elle porte des données réelles |
| 3 `VerificationCase` avec `facilityId` | `SubjectKind = "PROFESSIONAL" \| "FACILITY"` reste dans M03 |
| **1 `FacilityMemberProfile`** | **c'est le nom du super-administrateur** (chantier 33) |
| 0 `EarningsAccount` FACILITY | la branche M13 pouvait devenir un refus explicite |

La troisième ligne est celle qui aurait fait le plus de dégâts : un nettoyage « logique » de la
table des profils de structure aurait effacé l'identité du seul administrateur de la plateforme.

*Un nom de table ne dit pas à quoi elle sert.*

#### Un périmètre se vérifie par les ROUTES servies, pas par les dossiers du code

J'ai balayé M02, M13, les clients. J'avais fini. `scripts/relever-routes.ts` a alors imprimé
**`GET /v1/me/facility/:facilityId/dashboard`** — une dixième route de structure, vivant dans
**M16** parce que c'est un tableau de bord, et qu'un tableau de bord se range avec les tableaux de
bord.

Elle comptait des *réservations servies* — une notion sortie du produit avec la chaîne du
médicament (D-052) — et lisait des gains de structure. Sa garde exigeait un membre actif : avec zéro
adhésion, elle répondait **403 à tous les coups**.

*Chercher « structure » dans le dossier `m02-roles-structures` était le réflexe naturel, et le
mauvais. Le relevé de routes coûte quinze secondes et ne se laisse pas tromper par un rangement.*

#### Un type dit ce qu'on peut RELIRE ; une liste dit ce qu'on accepte de RECEVOIR

`EarningsHolderTypeCode` valait `"PROFESSIONAL" | "FACILITY"`, et `EARNINGS_HOLDER_TYPES` — la liste
validée à l'entrée — reprenait les deux. Les deux se confondaient, et c'est ce qui laissait une
route ouverte sur un cas mort.

Ils sont séparés désormais : **le type garde `FACILITY`** (c'est une colonne de base, l'en retirer
demanderait une migration sur la production) ; **la liste acceptée se réduit à `PROFESSIONAL`**.
Une requête `holderType=FACILITY` est refusée à la porte, par la validation, au lieu de l'être
après trois requêtes en base.

*C'est la même distinction que pour `subjectKind`, qui garde ses deux valeurs — parce que trois
dossiers de vérification désignent réellement une structure. **Ce qui décrit des données stockées
reste ; ce qui décrit une entrée acceptée se restreint.***

#### Une matrice de permissions que rien n'applique est pire qu'une matrice absente

`m02.policies.ts` portait `GLOBAL_PERMISSIONS_MATRIX` : « transcription fidèle de la spec M02 §5 »,
huit règles, avec ses 23 tests de cohérence.

Après le retrait, **plus un seul de ses seize exports n'avait de lecteur**. Le contrôle d'accès réel
passe par `AdminGuard` et les décorateurs `@AdminOnly`, éprouvés ailleurs. La matrice ne
protégeait rien — elle *ressemblait* à une protection.

C'est la règle du chantier 10, appliquée à un artefact de sécurité plutôt qu'à un interrupteur :
**un garde-fou auquel on fait confiance et qui ne garde rien est plus dangereux que son absence.**
Le modèle de permissions vit dans le cahier des charges ; une transcription que rien ne lit est une
seconde source de vérité, donc une source de dérive.

#### Le coût annoncé était sous-estimé de moitié

La dette annonçait « ~450 lignes de service, 9 routes, leurs DTO et leurs tests ». Le retrait en a
fait partir **1 261**.

L'écart ne vient pas d'une surprise mais d'un **comptage partiel** : j'avais mesuré le service, et
estimé le reste. Le contrôleur, les DTO, `PermissionsService`, les 303 lignes de règles et de tests,
la suite d'intégration — chacun connu, aucun compté.

*Même leçon qu'au chantier 38 sur les seize copies de `messageDe` : **une estimation qui n'a pas été
comptée n'est pas une estimation, c'est une impression.***

### Ce que le chantier 38 (solder les dettes) a appris

*03/09/2026 — sur consigne du porteur : « je ne veux pas de dettes non résolu ».*

#### Une consigne peut être juste et impossible à la lettre — il faut le dire tout de suite

« Tout doit se faire depuis la vraie base Neon de l'app » est la bonne règle pour l'application.
Elle ne peut pas s'appliquer aux suites d'intégration : elles **vident vingt-quatre tables** avant
de commencer. Les lancer sur la base du site effacerait comptes, consultations, ordonnances et
journal d'audit — le geste exact du 23/08/2026.

Le réflexe tentant était de laisser la dette « en attente du porteur ». Le bon geste était de dire
en une phrase ce que la consigne implique réellement — *les tests d'intégration ne tourneront plus
jamais* — puis de **fermer la dette autrement** : garder le garde-fou, et réécrire ailleurs la
couverture qui comptait.

*Règle : une consigne dont on voit la conséquence non voulue se dit à l'instant, pas après.*

#### Une recommandation a une date de péremption

Deux recommandations écrites la veille sont mortes le lendemain, de la même décision :

* dette n°22 : « attendre la branche Neon plutôt que d'écrire deux heures de doublures » ;
* dette n°8 : « deux clics dans la console Neon, gratuits ».

Elles étaient justes quand elles ont été écrites. **Une recommandation repose sur des hypothèses, et
une dette qui attend une hypothèse doit être relue quand elle tombe** — sans quoi elle attend un
événement qui n'arrivera pas.

#### Un compte fait de mémoire n'est pas un compte

La dette n°21 annonçait « huit fichiers ». Le balayage en a trouvé **seize**. Je n'avais compté que
les écrans d'administration où j'avais vu la ligne, et j'avais écrit ce nombre comme un fait.

Même leçon que le chantier 29 : **un balayage ne vaut que si on le fait, et il ne se remplace pas
par un souvenir.** Le coût annoncé (« ~30 min ») était donc faux du simple au double.

#### Une uniformisation qui écrase une bonne formulation n'est pas un progrès

Sur les seize copies, quinze disaient la même chose. La seizième, dans l'onglet « Aide », disait
« **Votre demande n'a pas pu être envoyée** » — et c'était mieux : l'utilisateur vient d'écrire un
texte et veut savoir s'il est parti.

La fonction partagée accepte donc un repli sur mesure, et cet écran garde sa phrase. *Regrouper, ce
n'est pas aplatir.*

#### La dette n°18 s'est révélée en l'ouvrant — et la recommandation était la mauvaise

Elle disait : *les intitulés de catégorie sont écrits deux fois, web et mobile ; recommandation (c),
un test qui compare les deux listes et échoue si elles divergent.*

**Elles avaient déjà divergé.**

| web | mobile |
|---|---|
| « Consultations » | « Consultations & soins » |
| « Paiements et gains » | « Paiements & reçus » |
| « Service » | « Système & compte » |
| « Alertes vitales » | « Sécurité & urgences » |

Le test recommandé aurait donc échoué à sa première exécution — **sans dire laquelle des deux
formulations était la bonne**. Il aurait transformé une dette silencieuse en alarme quotidienne,
sans rien résoudre.

*Règle : un test qui rend une dette bruyante n'est pas une correction. Il ne vaut que si l'échec dit
quoi faire.*

L'issue (a) — le serveur sert les intitulés — avait été écartée comme « la plus juste, mais il
faudrait décider où vit le texte d'une interface ». La question était **déjà tranchée** : les titres
et les corps des notifications vivent sur le serveur depuis le premier jour (EF-14-03). Ce sont les
intitulés de leurs catégories qui étaient l'exception.

#### Et le meilleur effet de bord : un défaut de toute une famille devient impossible

`reminder` est déclarée depuis le début et **aucun modèle ne l'a jamais portée** — son interrupteur
ne coupait rien. Le web l'avait retirée à la main (chantier 29), le mobile l'affichait encore
(chantier 30) : **deux chantiers pour une seule faute, et elle n'était pas entièrement corrigée.**

Les catégories servies sont désormais **comptées dans le catalogue**, jamais écrites. La ligne
disparaît des deux applications d'un coup, et **reviendra d'elle-même le jour où un premier rappel
sera écrit**, sans que personne ait à y penser.

*C'est la règle du chantier 10 — « un interrupteur qui ne change rien est pire qu'un interrupteur
absent » — rendue automatique plutôt que confiée à la vigilance.*

#### Le défaut du chantier 37, trouvé en regardant l'écran en ligne

La cloche écrivait `badge.data?.unread ?? 0`. Quand la lecture du compteur échoue — l'API gratuite
de Render s'endort au bout de quinze minutes — elle annonçait donc « **aucune non lue** ».

C'est le mensonge que le corollaire du chantier 18 nomme : *une lecture qui échoue n'est ni un zéro
ni un « non ».* Un médecin y aurait lu « rien de nouveau » à l'instant où un patient l'attendait.

Trois états et non deux : on sait qu'il y en a N · on sait qu'il n'y en a aucune · **on ne sait
pas**.

*Le défaut a été écrit, testé et livré le jour même où le principe qu'il viole est cité deux fois
dans le fichier voisin. Rien ne remplace le fait de REGARDER l'écran.*

### Ce que le chantier 37 (le centre de notifications) a appris

*Codé le 03/09/2026, sur la recommandation n°1 de l'analyse du tableau de bord.*

#### Quarante-neuf messages partaient, personne ne les recevait

Le serveur porte **49 modèles** de notification et les livre depuis le premier jour. Le web n'en
affichait **aucune**. Il branchait, lui, les **préférences** : un soignant pouvait choisir avec soin
les catégories qu'il souhaitait recevoir, et n'en voir jamais une seule.

C'est la forme la plus achevée du réglage sans effet — celle que le chantier 10 avait dénoncée sur
le sélecteur de langue, et le chantier 29 sur la catégorie « Rappels ». Ici l'interrupteur
fonctionnait parfaitement ; c'est **la lampe qui n'était pas branchée**.

Ce que perdait un médecin, concrètement : « un patient vous sollicite » (avec un délai qui court),
« votre compte-rendu est en retard » — **les gains de la séance sont gelés** (D-008) —, « votre
contrat a été réédité », qu'il faut signer pour continuer d'exercer.

#### Le chantier 1 avait eu raison de l'écarter, et il fallait quand même le faire

`TopHeader.tsx` portait, depuis le 27/08, cette phrase : *« le tiroir de notifications — réel côté
serveur, mais c'est une fonctionnalité à part entière, pas un morceau de coquille »*.

Elle était juste. Construire un centre de notifications au moment de poser la coquille aurait
mélangé deux travaux. **Mais une omission justifiée reste une omission**, et elle a tenu
trente-six chantiers parce qu'elle était écrite là où seuls les développeurs la lisent, et non au
§9 avec les dettes.

*Règle à retenir : **ce qu'on écarte volontairement doit aller dans la liste des dettes, pas dans un
commentaire de code.** Un commentaire explique à qui lit le fichier ; une dette revient réclamer.*

#### Une route manquait, et son absence se voyait à l'écran

Le serveur savait **supprimer en lot** (`deleteManyMine`) depuis le début. Il ne savait pas **lire
en lot**. Un soignant revenant de congés avec trente non-lues aurait donc reçu trente requêtes —
trente occasions d'échec partiel, et un badge descendant par à-coups.

`POST /v1/notifications/me/read-all` a été écrite pour cet écran. Elle s'arrête à la **même fenêtre
de rétention** que la liste et le badge : « tout marquer comme lu » ne doit rien promettre de plus
que le « tout » que l'utilisateur a sous les yeux.

*C'est l'application de la règle « backend d'abord » du §1 : le manque a été comblé au serveur, avec
son test, avant que l'écran s'appuie dessus.*

#### Ouvrir le tiroir ne marque rien comme lu — et c'est le choix qui se défend le moins spontanément

L'usage le plus répandu ailleurs est d'effacer le badge dès l'ouverture. C'est le pire : il supprime
le seul repère de l'utilisateur au premier coup d'œil. Ici, une notification devient lue quand on la
**lit** — quand on clique dessus — ou quand on le demande explicitement.

Le test qui le défend est le premier du fichier, avec sa raison écrite : c'est la décision la plus
facile à défaire par inadvertance, en croyant rendre service.

#### La carte des destinations a fauté deux fois, et le test a rattrapé les deux

Une notification qui prévient sans emmener oblige à refaire le chemin de tête. La clé du modèle
(`m06.handshake.initiated`) dit le sujet ; `lib/destination-notification.ts` la traduit en écran.

**Première faute — les capacités recopiées.** La carte portait, pour chaque destination, sa liste de
capacités écrite à la main. `/admin/signalements` y était réservé au super-administrateur, alors que
la navigation l'ouvre **aussi** à `admin:verification`. Un administrateur de vérification aurait reçu
une notification muette vers un écran qui lui est pourtant ouvert. Corrigé en **lisant** `NAV_GROUPS`
au lieu de le redire — et avec un effet de bord voulu : *un écran absent de la navigation n'est
jamais lié.*

**Seconde faute — une exception perdue dans une réécriture.** `m06.report.overdue.admin` n'a aucune
destination (l'administration n'a pas d'écran de sessions). La première version le disait ; la
réécriture l'a laissé retomber dans le préfixe `m06.report.` — donc vers les consultations d'un
soignant. Le test l'a signalé aussitôt.

*Deux leçons en une : **une règle recopiée dérive** (chantier 36, appliqué à autre chose que des
pluriels), et **une exception nommée doit passer avant toute règle générale**, y compris après une
réécriture qu'on croit à l'identique.*

#### Le temps écoulé : le test a tranché une question de langue, contre ma première version

`lib/temps.ts` dit l'ancienneté d'une notification. À 14 h 30, une notification de la veille à
18 h 30 : « hier », ou « il y a 20 h » ?

J'avais écrit « hier », parce que la date du calendrier a changé. **Le test a imposé l'autre
réponse, pour une raison métier** : une demande de consultation de vingt heures est perdue, celle de
trois heures peut-être pas. « Hier » efface cette différence.

Et le revers, à l'autre bout de la nuit : à 0 h 30, une notification de 23 h la veille n'a
qu'**une heure et demie**. La dire « hier » serait exact et parfaitement inutile.

*Le seuil est donc 24 h, et non minuit. C'est le genre de choix qu'on ne prend consciemment que si
on écrit le test des deux côtés.*

#### Un trou de couverture, trouvé en passant, et qui ne se bouche pas tout de suite

En écrivant le test de la nouvelle route, un constat : **le centre in-app du serveur n'était éprouvé
nulle part**. Ni `listMine`, ni `markRead`, ni les deux suppressions, ni `unreadCount` — cinq routes
dont la seule protection contre une fuite entre comptes est une clause `where`.

La cause n'est pas la négligence : les suites d'intégration **vident la base**, et la base du projet
est celle du site en ligne. Elles sont à l'arrêt depuis le 23/08 (dette n°8).

Le chantier en a couvert **une** — celle qu'il a écrite — avec une doublure de Prisma, en éprouvant
précisément les quatre bornes du cloisonnement. Les quatre autres sont inscrites à la **dette n°22**,
avec leur coût et une recommandation qui n'est pas « le faire tout de suite » : deux heures de
doublures qu'un vrai test d'intégration rendrait redondantes valent moins que deux clics dans la
console Neon.

### Ce que le chantier 36 (l'accord en nombre) a appris

*Trouvé le 03/09/2026 par le porteur, en lisant son tableau de bord en ligne.*

#### Un défaut d'accord ne se voit qu'au singulier

`tableau-de-bord.test.tsx` éprouvait déjà ce sous-titre — sur **douze** consultations, où le pluriel
est juste. Le test passait, et il avait raison de passer.

Le cas fautif est celui d'**un** soignant qui démarre : une consultation, un dossier, une page. C'est
précisément le cas qu'aucun jeu de données de test ne contient spontanément, parce qu'on écrit des
exemples « réalistes » — donc pluriels.

*Règle à retenir : **quand une chaîne compte quelque chose, le cas à éprouver est UN**, pas dix.*

#### Le motif existait, et c'est ce qui l'a rendu inégal

Le dépôt portait déjà `${n} code${n > 1 ? 's' : ''}` à plusieurs endroits. La règle était donc
connue — et **recopiée à la main**, donc appliquée là où on y pensait.

Une règle recopiée n'est pas une règle : c'est une habitude, et une habitude a des trous. Seize
chaînes, dont huit fautives, pour un motif que le dépôt connaissait depuis le début.

#### Le test a trouvé un défaut dans la règle elle-même

`lib/accord.ts` a d'abord repris le seuil du dépôt : `> 1`. Le test des décimales l'a fait tomber.

**« 1,5 heure » reste au singulier** — en français, le pluriel commence à deux. `> 1` accordait
« 1,5 heures ». Sur des entiers, `> 1` et `>= 2` donnent exactement le même résultat : le défaut ne
pouvait apparaître qu'en éprouvant une valeur que le code de production ne produit pas encore.

*Écrire un test « pour la forme » sur un cas qui ne se présente pas a corrigé la règle. C'est
l'inverse du reproche habituel fait aux tests exhaustifs.*

#### Et un piège de langue, qui est la raison d'être du fichier

**En français, zéro prend le singulier** : « 0 consultation ». En anglais, « 0 items ». Un
`n === 1 ? '' : 's'` — l'écriture spontanée d'un anglophone, et le réglage par défaut de plusieurs
bibliothèques d'internationalisation — serait faux ici, et faux d'une façon que personne ne relit.

Le test le verrouille en toutes lettres, et son intitulé dit pourquoi : *« c'est la règle française,
pas l'anglaise »*. Le jour où quelqu'un « corrigera » ce seuil, il lira la raison avant de le faire.

#### Quatre chaînes n'ont pas été touchées, et c'est un résultat

Sur seize candidates, cinq étaient déjà correctes : trois portaient leur ternaire, et
`GainsPage.delaiFr` ne peut pas descendre sous deux jours — sa garde `h < 48` le lui interdit.

*Les « corriger » aurait ajouté du bruit à du code juste. **Un balayage ne vaut que si on lit ce
qu'il trouve** — la même leçon qu'au chantier 29, apprise une seconde fois sur un sujet trivial.*

### Ce que le chantier 35 (la courbe de B2) a appris

*Mené le 03/09/2026, écran ouvert à côté de sa maquette, à la demande du porteur.*

#### « Conforme » avait été écrit sans regarder

Le comparatif bloc à bloc du chantier 9 porte cette ligne :

> | Graphique « Consultations honorées · Mars – août » | idem, six barres… | **conforme** |

La maquette ne montre pas de barres. Elle montre une **courbe avec aire dégradée**, et le mot
« idem » recouvrait un changement de forme complet.

Ce n'est pas une inattention isolée : c'est le risque propre à l'exercice. **Un comparatif écrit
protège de ce qu'une relecture manque, mais rien ne protège d'un comparatif rempli de mémoire.** La
seule parade est celle que le §7 impose déjà — rouvrir la maquette — et elle n'avait pas été suivie
sur cette ligne-là.

*Le porteur l'a vu en dix secondes, en mettant les deux écrans côte à côte.*

#### Une courbe et des barres ne disent pas la même chose

Le remplacement n'est pas décoratif. Des **barres** disent des quantités, qu'on compare une à une ;
une **courbe** dit une évolution, dont la pente se lit d'un regard. Sur six mois d'activité, ce que
regarde un soignant est le sens de la pente.

*Quatrième fois dans ce plan qu'un écart de forme s'avère être un écart de fond — après les onglets
de C3, la colonne de C2 et le tableau de C4.*

#### Ce qu'on copie d'une maquette, et ce qu'on ne peut pas copier

La géométrie se relève au pixel : cadre, coordonnées, épaisseurs, opacités du dégradé. Elle a été
lue dans le fichier, pas estimée à l'œil.

Mais **la couleur ne se copie pas**. La maquette écrit `#2756A6` en dur — elle a un fichier par
thème, elle peut se le permettre. L'application n'a qu'un écran pour les deux : la courbe lit
`--ap-400`, comme les barres qu'elle remplace. *Copier la couleur aurait donné une courbe bleu foncé
sur fond sombre — conforme à la maquette, et illisible.*

**Et l'échelle ne se copie pas non plus.** La maquette gradue 0 · 25 · 50 · 75 · 100 parce que ses
données fabriquées montent à 92. Recopier ces graduations aurait écrasé au ras du sol l'activité
réelle d'un soignant qui démarre.

#### Deux défauts que seul le regard pouvait trouver

Ils sont arrivés l'un après l'autre, et c'est la partie instructive.

**Le premier** : la première échelle choisissait le sommet puis le divisait en quatre. Sur dix
consultations, elle graduait **2,5 · 5 · 7,5 · 10**. Des demi-consultations. Le code portait pourtant
le commentaire « toujours entières » — il décrivait une intention, pas ce que faisait la ligne
d'en dessous.

**Le second**, apparu en corrigeant le premier : en choisissant le pas d'abord, l'ordre de recherche
essayait 25 avant 10 — et graduait un maximum de 28 en « 0 · 25 · 50 » là où « 0 · 10 · 20 · 30 »
serre bien mieux les données. Il a fallu **imprimer la table des cas** pour le voir.

*La leçon n'est pas « il fallait tester ». Un test écrit avec la première version aurait verrouillé
2,5 · 5 · 7,5 · 10 comme un résultat attendu. **Certaines choses se voient d'abord, et se
verrouillent ensuite** — le test n'est pas ce qui trouve, c'est ce qui empêche de reperdre.*

#### Un test dont la cible change de forme se réécrit, il ne se supprime pas

`tableau-de-bord.test.tsx` comptait six `listitem` pour garantir qu'**un mois vide garde sa place** —
sauter les mois creux donnerait un graphique qui ment sur le rythme.

Le fait défendu ne bouge pas d'un iota, et il compte même davantage sur une courbe que sur des
barres : une pente calculée sur des mois manquants est fausse. Seule la façon de l'observer change —
on compte désormais les points du tracé.

*Réflexe à écarter : supprimer un test qui tombe parce que le balisage a changé. C'est la propriété
qu'il garde qui compte, pas le sélecteur qu'il interrogeait.*

### Ce que le chantier 34 (le décompte du code) a appris

*Mené le 02/09/2026, sur demande du porteur : « mettre sur les interfaces un compte en direct pour
permettre aux utilisateurs de voir le délai de chaque code ».*

#### La consigne disait « le délai du code » — et ce délai n'existe pas

C'est la découverte qui a commandé tout le chantier. `verifyTotp` boucle sur `[-1, 0, +1]` pas : le
serveur accepte **le code précédent, l'actuel et le suivant**. Un code affiché sur un téléphone
reste donc valable jusqu'à la fin du pas suivant — jusqu'à soixante secondes, pas trente.

Un décompte annonçant « ce code expire dans 3 s » aurait été **faux**, et faux dans le sens qui
coûte : il aurait fait **attendre** quelqu'un qui a, sous les yeux, un code parfaitement accepté.

L'écran dit donc ce qui est vrai : **« Nouveau code dans N s »**. Ce n'est pas une nuance de style —
c'est la différence entre décrire l'appareil de l'utilisateur (qui va changer son affichage) et
prétendre décrire la décision du serveur (qui, elle, est plus tolérante).

*Même famille que le chantier 13 : une phrase juste sur la règle — « un code a une durée de vie » —
et fausse sur le nombre. Ici c'est le nombre qui rend la phrase nuisible.*

#### `30 - (Date.now()/1000) % 30` tenait en une ligne, et aurait menti

Un code TOTP se calcule sur des **tranches de temps absolues**. Le téléphone et le serveur la
calculent chacun de leur côté ; le navigateur, lui, ne participe pas au calcul du tout.

Un décompte tiré de l'horloge locale aurait donc été **déphasé de tout l'écart de cette horloge** :
« 25 s » à l'écran quand le téléphone vient de basculer. L'écran aurait donné une seconde vérité sur
le même instant, contredite par l'appareil que l'utilisateur tient en main.

D'où la route serveur. *C'est la règle que `useDecompteurServeur` énonce depuis sa création — « le
temps du serveur fait foi » — appliquée pour la première fois à une échéance que le serveur ne
possède pas vraiment, mais dont il est le seul arbitre.*

#### Un décompte qui BOUCLE n'est pas un décompte qui expire

Tous les autres décomptes du projet visent une échéance et s'arrêtent à zéro : une fenêtre de
poignée de main, un compte-rendu à déposer. Celui-ci **repart** : à zéro, un nouveau pas commence.

D'où un modulo là où les autres ont un plancher — et le `+ periode` avant le modulo, sans quoi
JavaScript rend `-1` pour `(-1 % 30)` et l'écran afficherait un nombre négatif à chaque bascule. Un
test verrouille précisément cette seconde-là.

#### Le décompte ne se contente pas d'informer, il conseille

Sous cinq secondes, la phrase devient « **attendez-le** ». Le seuil est en secondes absolues, pas en
proportion de la période : ce qui compte est le temps qu'il faut pour **taper six chiffres**, et il
ne dépend pas de la durée du pas.

Sans ce conseil, le décompte serait un ornement : on lirait « 3 s », on taperait quand même, et on
recevrait « code invalide » sans comprendre — le code ayant changé au milieu de la saisie.

#### Et un chiffre écrit en dur, trouvé en passant

A4 annonçait « Il change toutes les **30 secondes** ». La période vit dans `TOTP_STEP_SECONDS`, côté
serveur. C'est exactement l'interdit du plan — le même défaut que les « 48 heures » de C5 et les
« 12 % » de C6 — et il avait survécu à la relecture visuelle du chantier 18.

Le décompte le remplace, et dit mieux : le temps **restant** plutôt qu'une durée théorique.

*À retenir : un chiffre en dur se cache mieux dans une phrase vraie. « Il change toutes les 30
secondes » ÉTAIT vrai — c'est de l'avoir écrit là qui était fautif.*

### Ce que le chantier 33 (le nom de l'administrateur) a appris

*Trouvé le 02/09/2026 en répondant à une question du porteur — « comment l'admin a-t-il été créé ? » —
et non en cherchant un défaut.*

#### Un repli qui marche cache le défaut qu'il compense

`nomDe()` fait, dans E4 :

```
[firstName, lastName].filter(Boolean).join(' ') || username || '(compte sans profil)'
```

Le nom revenait `null`, le repli affichait `admin`, et l'écran paraissait normal. **Rien ne plantait,
rien n'était vide, aucun test ne tombait.** Personne ne cherche un défaut derrière un mot qui
ressemble à un identifiant plausible.

*C'est l'inverse exact du `data ?? []` du chantier 18, et la même famille : là, un repli affichait
« 0 dossier » sur une panne ; ici, un repli affiche un nom d'utilisateur sur un nom manquant. **Un
repli est fait pour l'exceptionnel ; quand il devient le cas nominal, il ment en silence.***

#### Le lecteur et l'écrivain étaient dans le même fichier, à vingt lignes

`listAdmins` lisait `patientProfile`. `createAdmin` — **vingt lignes plus bas, dans le même
fichier** — écrit `facilityMemberProfile`. Et le seed, ailleurs, fait de même.

La proximité n'a servi à rien parce que **personne ne lit un fichier de haut en bas** : on ouvre la
fonction qu'on vient corriger. C'est pour cela que le défaut a survécu depuis `049ce70`.

*Ce qui l'a fait sortir n'est pas une relecture ni un test : c'est d'avoir dû **expliquer** comment
le compte naissait. Répondre à « comment ça marche » oblige à suivre un chemin de bout en bout, ce
qu'aucune correction ciblée ne demande.*

#### Corriger le symptôme aurait suffi, et aurait laissé la dette

Échanger `patientProfile` contre `facilityMemberProfile` réparait l'affichage en un mot. On a
préféré reprendre **l'ordre exact de `M01Service.me()`** — patient, puis professionnel, puis
structure.

La raison n'est pas la robustesse théorique : c'est qu'**avoir deux règles pour résoudre un même nom
est exactement ce qui a produit ce défaut**. Un échange en aurait laissé deux, simplement mieux
accordées ce jour-là.

*Un test verrouille d'ailleurs l'ORDRE, pas seulement la présence : un compte portant deux profils
doit donner le même nom dans les deux écrans.*

#### Ce que la question du porteur a aussi établi

Il n'existe que **deux** chemins pour créer un administrateur, et le premier ne peut pas servir au
premier compte : `POST /v1/admin/admins` porte `@AdminOnly("SUPER_ADMIN")`. Reste le bootstrap du
seed, qui ne s'exécute **que si aucun administrateur n'existe**.

Et **Render ne joue jamais le seed** — ni au build, ni au démarrage. Le compte en ligne a donc
nécessairement été créé en lançant le seed depuis une machine locale, pointée sur la base de
production. *C'est la démonstration, et non plus l'hypothèse, de ce que la dette n°1 affirmait : il
porte le mot de passe employé ce jour-là.*

### Ce que le chantier 32 (rendre visible plutôt qu'interdire) a appris

*Mené le 02/09/2026, après que le porteur a demandé les mesures (a) et (c) de la dette n°20.*

#### Une information qui existe et que personne ne peut lire n'existe pas

`totpSecret.enabled` et `emailTwoFactorEnabled` étaient en base depuis toujours. Chaque compte
connaissait **son** réglage, dans B3. Aucun écran ne montrait celui des autres.

Un super-administrateur ne pouvait donc pas répondre à la question la plus simple qui soit après
D-053 : *« mon équipe est-elle protégée ? »* — sans ouvrir la base.

*Le coût du remède : quatre champs ajoutés à un `select` Prisma et une colonne. **Quinze lignes pour
transformer une donnée dormante en information.** C'est la sixième fois dans ce plan qu'une capacité
existait sans lecteur — après les procédures support, le rapprochement, l'impact des paramètres, le
journal d'audit et la désactivation du TOTP.*

#### Compter la ligne ou lire le drapeau n'est pas la même chose

`totpSecret` porte un champ `enabled`. Une configuration **entamée mais jamais confirmée** — QR
scanné, code jamais validé — laisse une ligne avec `enabled: false`.

Tester l'existence de la ligne aurait donc annoncé **protégé** un compte qui ne l'est pas. Le
`select` ne demande que le drapeau, et la projection le compare explicitement à `true`.

*Un piège discret : les deux écritures se ressemblent, et seule la seconde dit la vérité. C'est la
même famille que le `data ?? []` du chantier 18 — une valeur par défaut qui répond à la place de la
donnée.*

#### Le ton d'une pastille est une décision, pas une couleur

« Mot de passe seul » s'affiche en **alerte**, jamais en **erreur**. `parts.tsx` pose la
distinction depuis le début : *erreur* dit qu'une action a échoué, *alerte* qu'une action manque.

Ici elle compte plus qu'ailleurs. Un rouge ferait lire une **faute** là où il y a un **choix que le
porteur a explicitement autorisé** (D-053). L'écran informe le super-administrateur ; il ne
réprimande pas ses collègues.

*Et un test verrouille le pendant : une équipe entièrement protégée n'affiche AUCUNE alerte. Un
écran qui signale un risque en permanence cesse d'être lu — la leçon du bandeau du chantier 24,
payée le jour même.*

#### La trace vit dans la transaction de la session, et c'est le point

L'audit est émis **dans la même transaction** que l'ouverture de session. Si l'écriture échoue, la
connexion échoue avec elle.

C'était le choix à faire consciemment : émettre après coup aurait été plus simple et aurait laissé
passer, en cas de panne du journal, exactement l'accès qu'on voulait tracer. *Un accès qui réussit
sans laisser sa trace est pire qu'un accès non tracé du tout, parce qu'on croit avoir la trace.*

Et l'entrée ne porte que l'`accountId` et le canal. Le journal est en insertion seule : ce qui y
entre n'en sort plus (RM-04-03), donc il doit contenir le minimum.

#### Extraire la règle plutôt que la tester à travers tout le service

La condition tient en trois termes : compte d'administration, pas de TOTP, pas de 2FA email.
L'éprouver dans `login` aurait demandé de simuler Prisma, les sessions, le hachage du mot de passe
et l'émetteur d'audit.

Sortie dans `m01.policies.ts` — où ce module range ses règles pures depuis le début — elle porte un
nom, se lit seule et se teste seule. **Cinq tests, aucun montage.**

*Le test verrouille les deux sens, et le second compte autant : un patient sans second facteur
**n'est pas** tracé. Un journal en insertion seule qui se remplirait à chaque connexion cesserait
d'être lu, et la trace utile s'y noierait.*

#### Le test qui a rappelé une règle du projet

Ajouter une colonne a fait **tomber `responsive.test.ts`**, qui compte les cellules de chaque
tableau. Ce n'était pas une gêne : c'est ce compte qui a rappelé que la nouvelle cellule devait
porter son `data-libelle`, sans quoi elle serait apparue **sans intitulé** en mode carte, sous
1024 px — une valeur orpheline dont personne n'aurait su dire ce qu'elle est.

*Un test qui échoue pour la bonne raison au bon moment vaut mieux qu'une relecture.*

### Ce que le chantier 31 (le 2FA optionnel, et opérationnel) a appris

*Mené le 02/09/2026, sur décision du porteur.*

#### Une permission qu'on ne peut pas exercer n'en est pas une

La consigne tenait en une phrase : le TOTP devient optionnel. Deux `if` à retirer côté serveur.

Sauf que **la route de désactivation n'était appelée par aucun écran** — c'était la dette n°11,
écrite au chantier 24 avec la recommandation « ne rien faire pour l'instant ». Retirer les gardes
serveur aurait rendu le TOTP « optionnel » sans donner à personne le moyen de le désactiver : une
permission sur le papier, inexploitable dans l'application.

*La recommandation d'alors n'était pas mauvaise — elle disait « le jour où quelqu'un le demande, la
vraie question sera pourquoi ». Le porteur l'a demandé, et le pourquoi est venu avec.*

#### Cartographier les DEUX côtés, pas seulement celui qu'on modifie

Le réflexe était de chercher « où le TOTP est-il imposé ». La bonne question était : **quelles routes
2FA le serveur expose-t-il, et lesquelles le client atteint-il ?**

Douze routes relevées, **quatre injoignables** : la désactivation du TOTP, et les trois de la 2FA par
email. Aucune n'aurait été trouvée en suivant la consigne à la lettre.

#### Le défaut le plus grave ne se voyait pas du tout

`LoginResponse` déclarait `totpRequired` et pas `otpRequired`. L'écran faisait :

```
if (res.totpRequired) { … return }
if (res.sessionToken) { … }
```

Sur `{ totpRequired: false, otpRequired: true }` — la réponse d'un compte protégé par un code email —
**aucune des deux branches ne s'exécutait**. Pas d'erreur, pas d'étape suivante : le bouton
s'arrêtait simplement de tourner.

Un compte ayant activé ce facteur depuis le mobile était donc **enfermé dehors du web, en silence** —
et ne pouvait pas davantage désactiver le réglage fautif, puisqu'il faut être connecté pour
l'atteindre. Une impasse parfaite, que rien à l'écran ne nommait.

*L'écran a désormais un troisième cas : une réponse 200 sans jeton et sans facteur annoncé affiche un
message. Elle ne devrait pas exister — mais **un message vaut mieux qu'un bouton qui s'arrête de
tourner**, parce qu'au moins on sait qu'il faut appeler.*

#### Une garde d'accès sans test est le pire endroit où avoir confiance

`AdminGuard` protège les sept écrans d'administration. **Aucun test ne l'a jamais couverte.** On s'en
est aperçu en lui retirant l'exigence de TOTP : les 485 tests sont restés verts, ce qui ne prouvait
rien.

Une garde échoue en silence dans le bon sens — tout le monde passe — et son défaut ne se voit qu'au
premier abus. `admin.guard.spec.ts` verrouille les deux moitiés : ce qui doit être refusé l'est, et
**un administrateur sans TOTP passe**. Sans cette seconde assertion, rien n'empêcherait de remettre
l'exigence par mégarde.

*Le faux Prisma du test n'expose volontairement aucun `totpSecret` : si quelqu'un remet la
vérification, la garde lèvera et trois tests tomberont. Vérifié en la remettant.*

#### Le chantier 24 a été défait, et c'est normal

Le bandeau « Activez votre double authentification », le bouton qui remplaçait « Réessayer », le
hook, ses six branchements et ses tests : tout est retiré. Ils étaient justes sous l'ancienne règle,
ils deviennent faux sous la nouvelle.

*Rien de ce travail n'était perdu : c'est lui qui avait établi, écran par écran, où le TOTP se
manifestait — ce qui a rendu son retrait sûr. **Une correction qu'une décision annule n'était pas une
erreur ; c'est le prix normal d'un produit qui se décide en marchant.***

### Ce que le chantier 30 (le mobile jamais balayé) a appris

*Mené le 02/09/2026, après le quatrième balayage du bundle web.*

#### Une méthode de vérification a un angle mort, et il faut le nommer

La règle du 02/09 dit : **on teste sur le site en ligne.** Elle a trouvé, quatre fois de suite, ce
que le code et les tests ne voyaient pas — six promesses au chantier 27, une phrase survivante au
28, trois réglages vides au 29.

Et elle a un angle mort qu'aucun de ces succès ne signalait : **l'application mobile n'est pas
servie par Render.** Aucune de ces quatre vérifications ne pouvait la voir. Pendant que le web était
inspecté quatre fois, le mobile ne l'avait jamais été.

*La leçon n'est pas que la règle est mauvaise — elle est excellente. Elle est : **une méthode de
vérification définit ce qu'elle ne peut pas voir, et ce périmètre-là doit être écrit à côté
d'elle.** Pour ULAMU : le site en ligne prouve le web et l'API ; le mobile se vérifie à la source,
faute d'être déployé.*

#### Une promesse fausse dans du code mort survit à tout

`StepCarousel` annonçait « Réservez vos médicaments tout près » — exactement la phrase retirée de
`AuthCarouselDrawer` au chantier 27. Elle a survécu parce que **personne ne monte ce composant** :
il n'apparaît sur aucun écran, donc aucune relecture visuelle ne pouvait le montrer, et aucun
balayage du rendu ne pouvait l'atteindre.

C'est le pire des deux mondes : invisible à l'usage, présente à la lecture. Le premier à rouvrir ce
fichier pour écrire un écran d'accueil l'aurait reprise en croyant reprendre du bon code.

*Corollaire du chantier 23, qui avait trouvé 56 fichiers morts en remontant les importations depuis
`main.tsx` : **le code mort ne coûte pas que de la place — il conserve les erreurs qu'on croit avoir
corrigées.***

#### Deux lignes jumelles, un seul chantier les avait vues

« Rappels · réservations qui expirent » existait en DEUX exemplaires : `SectionPreferences.tsx` côté
web, `NotificationsScreen.tsx` côté mobile. Le chantier 29 n'en avait retiré qu'un — celui que le
bundle déployé montrait.

Les deux applications décrivent les mêmes catégories de notification, sans partager une ligne de
code : ce sont deux dictionnaires écrits à la main, à deux endroits, qui doivent dire la même chose.

*À signaler comme dette : ces catégories viennent du serveur (`NOTIFICATION_CATEGORIES`), et leurs
intitulés sont dupliqués côté client. Deux vérités pour une même règle — la dette exacte que le
chantier 11 nomme.*

#### Vérifier avant de couper a évité une vraie faute

Le balayage signalait « Mes rappels · médicaments » sur l'écran d'accueil mobile, et
`Reminders: undefined; // rappels de médicaments (M14)` dans la navigation. Le réflexe du moment —
quatre chantiers à retirer du vocabulaire — était de les compter comme des restes.

Vérification faite : `GET /v1/reminders/me` répond **401 en ligne**, donc la route existe ; et
`m14.reminders.service.ts` n'importe que `PrismaService` — aucune notification, aucun outbox. Ce
sont des **alarmes que le patient se pose à lui-même** pour prendre ses médicaments. Rien à voir
avec la chaîne du médicament en pharmacie, et une fonctionnalité vivante du périmètre patient.

*Les retirer aurait amputé le patient d'une fonctionnalité qui marche, au nom d'un mot. **Le
vocabulaire n'est pas le périmètre** — c'est la contrepartie exacte de la leçon du chantier 26,
« un module n'est pas un périmètre ».*

### Ce que le chantier 29 (les réglages vides) a appris

*Trouvé le 02/09/2026 en balayant SYSTÉMATIQUEMENT le bundle déployé, après trois chantiers de
correction où chaque vérification en ligne avait trouvé quelque chose.*

#### Contrôler sa correction ne vaut pas balayer le résultat

Les chantiers 27 et 28 se sont vérifiés de la même façon : on cherche dans le bundle en ligne les
phrases qu'on vient de retirer, on constate qu'elles ont disparu, on conclut. **C'est une
vérification qui ne peut trouver que ce qu'on a déjà trouvé.**

Le balayage de ce chantier a fait l'inverse : chercher **tout le vocabulaire du périmètre retiré**
— officine, pharmacie, structure, médicament, stock, dévoilement, réservation, délivrance — et lire
chaque occurrence en contexte. Vingt-huit occurrences, dont **vingt-cinq justifiées** :

- « Attestation **délivrée** par l'Ordre » — un autre sens du verbe ;
- « Quantité à **délivrer** » — un champ d'ordonnance, ce que le médecin prescrit ;
- « orienter vers une **structure** adaptée » — un hôpital, dans l'avertissement médical ;
- `PARTIALLY_DISPENSED` / `DISPENSED`, « Structure » dans E1, `ADDRESS_PROOF` — des dictionnaires
  qui nomment ce que la base contient encore.

*La leçon n'est pas « il fallait chercher plus large ». Elle est : **un balayage ne vaut que si on
lit ce qu'il trouve.** Vingt-cinq de ces occurrences étaient justes ; les supprimer par réflexe
aurait fait plus de dégâts que les trois qui restaient.*

#### Un réglage qui ne règle rien se cache mieux qu'une promesse fausse

« Rappels — échéances de vérification, réservations qui expirent » avait deux défauts empilés, et
un seul venait de nous.

Le nôtre : « réservations » est faux depuis D-052. Facile à voir une fois qu'on cherche le mot.

L'autre, découvert en vérifiant le premier : **aucun modèle de notification n'a jamais porté la
catégorie `reminder`.** L'interrupteur ne coupait rien, et ne l'a jamais fait. Personne ne s'en
était aperçu parce qu'un réglage silencieux n'a pas de symptôme : on le coupe, et rien ne change —
ce qui est exactement ce qu'on attendait.

*C'est la règle du chantier 10, retrouvée par un autre chemin : un interrupteur qui ne change rien
est pire qu'un interrupteur absent, parce qu'on lui fait confiance. Là, on lui confiait le silence
de rappels qui n'existent pas.*

#### Une case qui mène à une file morte

« Ma structure · Titulaire injoignable » restait proposé à un soignant dans B3 « Aide », alors que
la procédure correspondante avait été retirée des choix d'E7 le matin même.

Les deux moitiés avaient été traitées séparément, et une seule l'avait été. **Un formulaire qui
accepte une demande que personne ne peut traiter est pire qu'un formulaire qui la refuse** : il
promet une réponse, et le silence qui suit ressemble à de l'abandon. *Même raisonnement que pour
`support@ulamu.cg` au chantier 19 : un trou noir aurait été pire que l'adresse morte qu'il
remplaçait.*

#### Le plus grave : une assertion négative peut mourir sans bruit

`ordonnance.test.tsx` vérifiait qu'une ordonnance annulée n'affiche pas
`altText('Code à scanner en pharmacie')`.

Le chantier 27 a renommé ce texte alternatif en « Sceau de l'ordonnance ». L'assertion est restée
**verte** — non plus parce que le QR est absent d'une ordonnance annulée, mais parce que la chaîne
qu'elle cherchait n'existait plus **nulle part**. Elle ne surveillait plus rien.

Elle n'a été découverte que parce que l'autre assertion du même test a échoué, sur la phrase
d'annulation changée le même jour. **Sans cette échec voisin, le test serait encore là, vert et
vide.**

*C'est la deuxième fois en quatre chantiers : au 26, un témoin d'`app.boot.spec.ts` visait une route
supprimée et aurait cessé de surveiller la forme qu'il gardait. La règle : **quand on renomme une
cible, il faut relire les assertions NÉGATIVES qui la nommaient** — une assertion positive tombe
d'elle-même, une négative devient vraie pour rien.*

### Ce que le chantier 28 (la phrase survivante) a appris

*Trouvée le 02/09/2026 en regardant l'écran de connexion EN LIGNE, après le chantier 27.*

#### Chercher un identifiant ne trouve pas une phrase

Le chantier 25 avait balayé `FACILITY_MEMBER` dans tout le dépôt — 84 occurrences triées une par
une, dont celles de `LoginPage.tsx`. Il en avait corrigé le commentaire d'en-tête : *« Réservée aux
comptes PROFESSIONAL / ADMIN »*.

Trois lignes plus bas, la `prop` que l'utilisateur LIT disait toujours « professionnels,
**structures** et administration ». Elle a traversé les chantiers 25, 26 et 27 sans être vue.

La raison est mécanique : `grep FACILITY_MEMBER` ne trouve pas le mot « structures » écrit en
français dans une chaîne de caractères. **Le nettoyage cherchait le nom technique ; la promesse
était en langue naturelle.**

*Corollaire du chantier 27, et plus précis que lui : le compilateur ne trouve pas les promesses
mortes, et la recherche d'identifiants non plus. Après un retrait de périmètre, il faut relire ce
que les écrans DISENT — dans la langue où ils le disent.*

#### Le commentaire corrigé donnait l'illusion du travail fait

C'est ce qui rend ce défaut instructif plutôt qu'anecdotique. Le fichier avait été ouvert, lu,
modifié. Un `git log` l'aurait montré touché par le bon chantier, avec le bon message. Et la seule
ligne qui comptait pour l'utilisateur n'avait pas bougé.

**Un commentaire dit ce que le code fait ; une `prop` dit ce que la personne lit. Corriger le
premier ne corrige rien pour elle.**

#### Le test qui manquait ne ressemble pas aux autres

`promesses.test.ts` cherchait des tournures de SERVICE — réserver, retirer, scanner. Il ne pouvait
pas attraper une énumération de publics.

Le second bloc lit donc autre chose : ce que les écrans **annoncent du périmètre**. Il verrouille la
`prop` affichée, pas le commentaire au-dessus — et c'est exactement la distinction qui a manqué.

#### Un test qui EXIGE une présence, pour une fois

Le même chantier ajoute une assertion inverse : E1 **doit** continuer d'afficher « Structure » pour
un dossier de vérification hérité. La file sert ce que la base contient ; retirer la branche
laisserait un administrateur devant un dossier sans type.

*Trois chantiers de suite ont retiré des choses. Celui-ci écrit noir sur blanc ce qui ne doit PAS
être retiré — parce que le prochain nettoyage, mécanique, chercherait « Structure » et le
trouverait.*

### Ce que le chantier 27 (les promesses manquées) a appris

*Mené le 02/09/2026, immédiatement après la vérification EN LIGNE du chantier 26.*

#### Le nettoyage était complet, et le produit mentait quand même

Le chantier 26 avait tout ce qu'on demande à un chantier : les modules retirés, les trois suites au
vert, les types propres, et une vérification en ligne route par route — 404 sur les huit routes
supprimées, 401 sur celles qui restent. **Tout était vrai, et il manquait l'essentiel.**

Six phrases annonçaient encore la chaîne du médicament. Elles ont survécu parce qu'un nettoyage
suit les **importations** : on part d'un module, on remonte ses appelants, on coupe. Une promesse
n'importe rien. Elle est dans une chaîne de caractères, à côté d'une image, dans un composant que
rien ne relie au module supprimé.

*La règle qu'on retient : **le compilateur trouve le code mort, il ne trouve pas les promesses
mortes.** Après tout retrait de fonctionnalité, il faut chercher ce que le produit en DIT — et le
chercher ailleurs que là où on vient de couper.*

#### Les deux endroits où une phrase fausse coûte le plus cher

Ce n'est pas leur contenu qui rendait ces six phrases graves, c'est leur **place**.

Le carrousel est le **premier écran**. Il ne décrit pas une fonctionnalité, il décide si quelqu'un
crée un compte. « Réservez vos médicaments tout près » n'était pas une coquille : c'était ce sur
quoi la personne s'était engagée en s'inscrivant. *Même famille que `support@ulamu.cg` dans les
mentions légales — une phrase fausse à l'endroit où l'on donne son consentement.*

Le QR de l'ordonnance arrive **au moment du soin**. Un patient qui croit son téléphone suffisant se
présente au comptoir sans ordonnance lisible, s'entend dire qu'on ne scanne pas ça, et en conclut
que son ordonnance ne vaut rien. Et le médecin, de son côté, croyait avoir transmis quelque chose.
*C'est la question du chantier 4, reposée : un avertissement arrive-t-il avant ou après la perte ?
Ici il n'arrivait pas du tout.*

#### Retirer sans remplacer est une décision, pas une paresse

Le carrousel passe de cinq diapositives à trois. Rien n'est venu remplacer les deux qui partent, et
c'est délibéré : **écrire de nouvelles promesses est un arbitrage du porteur, pas une correction.**
Trois phrases vraies valent mieux que cinq dont deux mentent, et un écran qui promet moins n'a
jamais fait fuir personne — un écran qui promet faux, si.

*Les deux illustrations restent dans les ressources : le jour où la chaîne du médicament revient,
elles reviennent avec.*

#### Dire ce que la chose EST, pas seulement ce qu'elle n'est plus

Le QR n'a pas été supprimé. Il aurait été plus simple de le retirer — mais il **scelle** encore
l'ordonnance : il prouve qu'elle n'a pas été modifiée depuis la signature, ce qui reste vrai et
utile. Ce qui était faux, c'était son usage annoncé.

Les deux écrans disent donc maintenant les deux moitiés : ce que le code prouve, et ce qu'il ne
permet pas. *Quatrième fois dans ce plan qu'expliquer une absence vaut mieux que la laisser
deviner — après le rapport de rapprochement d'E2, la liste de comptes d'E7 et l'identité du
signaleur d'E6.*

#### Un test qui interdit des mots interdirait aussi les explications

`promesses.test.ts` lit la source et refuse « Réservez vos médicaments », « présente ce code en
pharmacie », « à scanner en pharmacie ». Il **n'interdit pas le mot « pharmacie »** : l'ordonnance
dit désormais « montrez-la à votre pharmacien », et c'est exactement ce qu'il faut dire.

La distinction n'est pas théorique — elle a déjà coûté au chantier 16, où une assertion refusant le
mot « médian » avait échoué sur la phrase qui expliquait pourquoi la médiane n'était pas mesurée.
Le test dépouille donc les commentaires avant de chercher, puisque ce sont eux qui CITENT les
phrases retirées pour expliquer pourquoi elles le sont.

Et il vérifie une chose que le rendu ne dirait pas : **le carrousel compte exactement trois
diapositives**. Sans ce compte, une quatrième ajoutée demain passerait inaperçue.

### Ce que le chantier 26 (la chaîne du médicament) a appris

*Mené le 02/09/2026, sur décision du porteur : « retire tout ce qui concerne pharmacie, recherche
médicament — on garde uniquement les modules qui couvrent notre périmètre : médecin,
administrateur, patient ».*

#### Ce chantier est la dette du précédent, tranchée

Le chantier 25 avait retiré l'ACTEUR (le compte de structure) et inscrit le jour même ce qu'il
coûtait — dette n°12 : *« plus personne n'alimente le stock ; la recherche PAYÉE du patient répond
sur des données qui vieillissent »*, avec trois issues et une recommandation. Le porteur a choisi la
première : **retirer la fonctionnalité plutôt que la maintenir sur une donnée morte.**

*C'est la première fois dans ce plan qu'une dette écrite est reprise et tranchée par le porteur au
chantier suivant. Elle a servi à ça — pas à décorer un §9.*

#### La découverte qui a commandé tout le découpage

`GET /v1/medicaments` — le référentiel de médicaments — vivait dans **M12**, le module à supprimer.
Et c'est **l'écran C7 du médecin** qui l'appelle (`PanneauOrdonnance.tsx:124`) pour composer une
ligne d'ordonnance.

Supprimer M12 en bloc aurait donc **retiré au médecin la possibilité de prescrire correctement** —
un acteur du périmètre, atteint par le retrait d'un autre. Et pas seulement le confort : le
**garde-fou allergies (EF-09-03) ne s'applique qu'aux lignes référentielles**. Sans référentiel, le
prescripteur ne peut plus écrire qu'en texte libre, c'est-à-dire sans le contrôle qui l'empêche de
prescrire de l'Amoxicilline à un patient allergique à la pénicilline.

Le référentiel a donc **changé de module sans changer d'adresse**. Sa place était M09 depuis
toujours : son exigence est **EF-09-02**, et son propre commentaire disait déjà *« AUCUNE donnée de
stock ici (catalogue pur) »*. Un second contrôleur monté sur `v1` garde la route identique — et un
témoin a été ajouté à `app.boot.spec.ts` pour le prouver.

> **La règle qu'on retient : un module n'est pas un périmètre.** Ce qui est rangé quelque part n'y
> appartient pas forcément, et c'est en supprimant qu'on s'en aperçoit. Il faut regarder ce que
> chaque route SERT, pas le dossier où elle dort.

#### Ce qu'une suppression apprend sur les tests

Trois tests ont attrapé le chantier, et chacun disait quelque chose de différent :

- **`app.boot.spec.ts`** a réclamé `POST /prescriptions/scan/:qrToken/dispense`. Ce témoin n'était
  pas là pour la route mais pour sa **forme** — un jeton en clair dans l'URL. Le supprimer aurait
  discrètement cessé de surveiller cette forme-là. Il a donc été **remplacé** par un chemin de même
  risque, pas retiré. *Un test témoin ne se supprime pas avec ce qu'il témoignait.*
- **`m16.coverage.spec.ts`** comptait encore les officines **après** que le service eut cessé de le
  faire. Il se déclarait « copie de la règle » : c'est le test qui mentait. Deux vérités pour une
  même règle — la dette de C1 du 23/08, une fois de plus, et cette fois du côté du test.
- **`m16.policies.spec.ts`** exigeait « EXACTEMENT sept critères — pas un de plus ». Il en dit
  maintenant cinq, **et il dit pourquoi** : sans cette phrase, quelqu'un remettrait sept en croyant
  réparer une régression.

#### Un test lent n'est pas un test instable

`file-verification.test.tsx > un refus peut NOMMER la pièce en cause` échouait en
« Test timed out in 5000ms » sur **quatre exécutions complètes sur cinq**, et passait à chaque fois
qu'on le lançait seul. Facile à classer « suite instable sur cette machine » — c'est ce que le §10
disait depuis le chantier 1.

Mesuré isolément, **sans aucune concurrence : 2 841 ms**, soit 57 % du budget. Ce n'est pas de la
malchance : c'est le test le plus lourd du dépôt — deux listes Radix, chacune montant un portail,
plus une frappe caractère par caractère et une mutation. Sous la charge d'une suite entière, il
dépasse.

Le budget est relevé **pour lui seul**, à 15 s. Relever le budget global aurait masqué la lenteur
des autres. *Une intermittence qui se reproduit n'est pas un aléa : c'est une mesure qu'on n'a pas
prise.*

#### Ce que le retrait coûte, et qui doit le savoir

Trois conséquences, toutes inscrites au §9 plutôt que tues :

1. **Le patient perd la recherche de médicaments** — une fonctionnalité **facturée** (PM-03,
   500 XAF) et **la deuxième des deux sources de revenus** du modèle économique. Le §5 du
   `modele_economique` posait trois conditions de viabilité, dont *« les pharmacies tiennent leur
   stock à jour parce que les dévoilements amènent des ventes »*. Ce pilier tombe entièrement.
2. **Une ordonnance n'a plus de lecteur.** Elle est toujours prescrite, scellée, consultable et
   annulable — mais plus **servie** dans ULAMU. `DISPENSED` et `PARTIALLY_DISPENSED` deviennent
   inatteignables, et le QR n'est plus scanné par personne : le patient le montre comme une
   ordonnance papier, traçable et infalsifiable, mais hors chaîne.
3. **Le plan de sortie compte sept critères de succès ; deux ne sont plus mesurables.**

*Le document économique n'a pas été réécrit, et c'est délibéré : refaire un modèle à une source
demande de nouvelles hypothèses de volume et de point d'équilibre. C'est un arbitrage du porteur,
pas une correction de rédaction. Il porte donc un avertissement en tête, et reste lisible comme
l'état de la réflexion au 10/06.*

#### Où le nettoyage s'est arrêté, encore une fois

Les **tables** restent : `Facility`, `StockItem`, `Dispensation`, `Reservation`, `Disclosure`,
`ReliabilityStrike` et leurs voisines. Les retirer demande une migration sur la base de
**production** — celle effacée le 23/08. Aucun code ne les lit plus ; elles ne coûtent que de la
place.

Même frontière qu'au chantier 25, et elle tient toujours : **un nettoyage s'arrête là où la donnée
existante commence.**

#### Ce que la mesure a donné

| Zone | Retiré |
|---|---|
| `apps/api` | M11 (7 fichiers) · M12 (7 fichiers) · `m09.dispensation.service.ts` · 2 routes de délivrance · l'arbitrage des strikes et sa route · 2 KPI et leurs cibles · les officines de la couverture · 12 modèles de notification · les pharmacies du seed · `chantier4.int.spec.ts` |
| `apps/mobile` | `MedsScreen.tsx` (376 l.) · sa route · sa tuile d'accueil · 6 méthodes d'API · 11 types et 6 routes de contrat |
| `apps/web` | le compte des officines dans E5 · la mention des officines dans les **mentions légales** (elles valent preuve) · « Titulaire de structure injoignable » retirée des choix d'E7 |
| `docs/cahier_des_charges` | **D-052 inscrite** · bandeaux sur M09, M11, M12 · domaine **D6 retiré** · plans de modules et de releases · vision · glossaire · 4 paramètres métier · **avertissement en tête du modèle économique** |

### Ce que le chantier 25 (les trois acteurs) a appris

*Mené le 02/09/2026, sur décision du porteur : « on ne garde que deux types d'utilisateur, le
soignant et l'admin ».*

#### La consigne disait deux, et aussi trois — les deux étaient vraies

« Deux types d'utilisateur : le soignant et l'admin », puis « on reste sur le périmètre : patient,
médecin, administrateur ». Ce n'est pas une contradiction, c'est **deux échelles** : deux acteurs sur
l'application **web**, trois sur la **plateforme** — le patient vivant sur mobile.

Le lever avant de couper a évité de retirer le patient du produit. *Une consigne qui se compte
différemment selon l'échelle demande qu'on nomme l'échelle, pas qu'on choisisse un chiffre.*

#### Le quatrième type était déjà à moitié parti, et personne ne l'avait écrit

`FACILITY_MEMBER` existait partout **sauf là où il aurait servi** : sa capacité était déclarée
(`useCapabilities.ts`), son tableau de bord construit (70 lignes), ses 16 méthodes d'API écrites —
et **aucune entrée de navigation** ne les atteignait. J'ai compté les capacités de
`navigation.config.ts` : cinq `professional`, six `admin`, **zéro `facility`**.

Un membre de structure qui se connectait avait donc une barre latérale **vide** — pas même « Mes
paramètres », réservé à `['professional', 'admin']`.

Et `RegisterPage.tsx` portait, depuis le 24/08, un ternaire `true ? registerProfessional : registerFacilityMember`.
La branche était morte, neutralisée plutôt que retirée — d'où l'avertissement `no-constant-condition`
que le lint signalait sans que personne ne l'attribue à cette décision. *Une branche qu'on neutralise
sans la retirer laisse croire qu'on hésite encore ; six jours plus tard, personne ne sait plus si
c'est un report ou un oubli.*

#### Retirer un ACTEUR n'est pas retirer une FONCTIONNALITÉ

C'est la distinction qui a commandé tout le chantier, et elle n'était pas évidente au départ.

`m12.disclosure.service.ts` importe `StockAvailabilityService` de M11. Le parcours du patient — « je
cherche un médicament → je paie un dévoilement (PM-03) → j'ai une réservation de 24 h » — **lit le
stock des pharmacies**. Supprimer le sous-système aurait retiré une fonctionnalité **du patient**,
qui est dans le périmètre.

Ce qui part, c'est donc le **compte** qui administrait l'objet. L'objet reste : `Facility`,
`StockItem`, `Dispensation`, `Reservation` et huit autres tables.

**Et la conséquence se dit** : sans membre de structure, plus personne n'alimente le stock. Les
données se figent, et la recherche **payée** du patient répond sur un stock qui vieillit. C'est
inscrit au §9 avec ses issues — parce qu'un renoncement tu vieillit plus mal qu'un renoncement écrit
(leçon du chantier 9).

#### Trois choses qu'il ne fallait PAS nettoyer, et c'est le plus important

Un nettoyage qui va au bout de sa logique casse quelque chose. Trois arrêts, chacun pour une raison
vérifiée dans le code :

1. **Les quatre `auditActorType`** (M03, M04, M07, M14) traduisent un type de compte **stocké** vers
   le journal d'audit. Retirer le cas `FACILITY_MEMBER` ferait retomber sur le `default` — et
   l'action d'un humain serait inscrite `"system"` dans un journal **chaîné par hachage et en
   insertion seule**, donc **définitivement**. Une falsification, produite par un nettoyage.

2. **Les six règles de la matrice M02.** Le contrôle d'accès des structures ne passe pas par elle :
   il passe par `PermissionsService.assertFacilityRight`, qui lit la table `FacilityMember`. Retirer
   les lignes sans retirer le chemin donnerait **deux vérités pour une même règle**, et la matrice
   serait celle qui ment — la dette exacte corrigée en C1 le 23/08, rappelée au chantier 11.

3. **La valeur dans l'énumération Prisma.** L'en retirer demande une migration sur la base de
   **production** — celle qui a été effacée le 23/08. Et elle échouerait si une seule ligne la porte
   encore.

*La règle qu'on retient : **un nettoyage s'arrête là où la donnée existante commence.** Ce qui décrit
ce qu'on peut créer demain se retire ; ce qui décrit ce qui a été écrit hier se garde, et s'annote.*

#### Un type de client ne se rétrécit pas comme une déclaration de produit

`packages/contracts/src/auth.ts` et `apps/mobile/src/lib/contracts.ts` déclaraient `AccountType` en
se disant « alignés sur le schéma Prisma ». Or Prisma garde quatre valeurs et le produit n'en a plus
que trois : l'alignement annoncé devenait faux dans un sens ou dans l'autre.

Les trois unions clientes disent désormais le **produit** (trois types), avec le commentaire qui
explique la quatrième valeur en base. C'était tenable parce que **chaque branche a son repli** : un
compte hérité qui se connecterait retombe sur le parcours soignant, aucun client ne plante sur une
valeur inattendue. *Sans ce repli, il aurait fallu garder l'union large — un type qui ment sur ce que
le serveur envoie est la dette qu'`api.ts` a déjà payée trois fois (chantiers 5, 7 et 12).*

#### Ce que la mesure a donné

| Zone | Retiré |
|---|---|
| `apps/web` | la capacité `facility`, « Espace officine », `TableauOfficine` (70 l.), la branche morte d'inscription, **172 lignes** de client API sans appelant |
| `apps/api` | la route publique d'inscription, son DTO, sa méthode de service — **~100 lignes** |
| `packages/contracts`, `apps/mobile` | la quatrième valeur de `AccountType`, avec sa note |
| `docs/cahier_des_charges` | **D-051 inscrite** ; D-003 et D-004 marquées remplacées ; glossaire, vision, carte des domaines, plans de modules et de releases, M02/M03/M09/M10/M11/M12, persona P7 |

### Ce que le chantier 24 (la double authentification) a appris

*Mené le 02/09/2026, après la relecture de la passation et la vérification du site en ligne.*

#### Une phrase peut être vraie, et fausse selon qui la lit

B3 annonçait : « Double authentification — **Obligatoire sur ULAMU, elle ne peut pas être
désactivée** ». J'ai d'abord noté ça comme une fausseté simple, le cahier donnant le TOTP pour
optionnel aux professionnels. En ouvrant `m01.service.ts`, c'était plus fin :

```
disableTotp() : if (account.type === "ADMIN") throw new ForbiddenException(…RM-01-06)
```

Le serveur refuse la désactivation **aux seuls administrateurs**. Pour eux, la phrase est
exacte au mot près. Pour un soignant, ses deux moitiés sont fausses : la désactivation est
acceptée (mot de passe + code), et **rien dans le web n'impose quoi que ce soit** — ni garde de
route, ni redirection, seulement un bouton « Configurer » qu'on peut ignorer indéfiniment.

Le défaut n'était donc pas une rédaction : c'était **une phrase juste montrée à la mauvaise
moitié des gens**. Un écran qui n'a qu'un texte pour deux publics finit toujours par mentir à
l'un des deux. *C'est la même famille que le « 12 % » du chantier 7 — un taux vrai pour un
contrat, faux pour le voisin — sauf qu'ici la variable n'était pas un nombre, c'était le lecteur.*

Et l'énoncé était **inapplicable** au surplus : annoncer une obligation que personne ne fait
respecter est pire qu'une recommandation. Le jour où un soignant découvre qu'il exerçait sans,
il apprend surtout que les phrases de cet écran ne valent rien.

#### Un bouton qui ne peut pas aboutir occupe la place de celui qui le pourrait

Les six branches d'échec de l'administration offraient « Réessayer ». Sous RM-01-06, le dixième
essai est refusé comme le premier — et la sortie, `/configuration-totp`, n'était nommée nulle
part. **L'écran décrivait un symptôme et proposait un geste sans effet.**

C'est la faute du « Bannir » d'E7 (chantier 12), aggravée : là-bas le bouton nommait un autre
effet que le sien ; ici il n'en a aucun, et il tient la place.

#### Ne jamais reconnaître un refus à son texte

La tentation était forte : le serveur répond 403 avec « TOTP obligatoire pour les actions admin
(RM-01-06) », et `ApiError` porte ce texte jusqu'à l'écran. Une expression régulière suffisait.

C'est un piège. **Un message d'erreur est de la prose** : il se reformule un jour sans que
personne n'y voie un contrat, et le jour où « TOTP » devient « double authentification » côté
serveur, l'écran cesse silencieusement de proposer la sortie — le défaut exact qu'on vient de
réparer reviendrait, sans qu'aucun test ne tombe.

Or la condition est connue **avant tout appel** : `me.totpEnabled`. C'est elle qu'on lit. Le
corollaire vaut au-delà de ce chantier : *on peut lire un statut, un code HTTP, un drapeau — on
ne construit jamais une décision sur une phrase destinée à un humain.*

#### Le bandeau vit hors de la limite d'erreur, et c'est le test qui le dit

`GardeFou` remplace le contenu de l'écran quand celui-ci lève. Un rappel posé **dedans**
disparaîtrait au moment précis où il sert le plus — une page d'administration en panne est ce
qu'un compte sans TOTP voit d'abord. Il est donc posé au-dessus, dans `AppShell`, et un test
monte un composant qui explose pour vérifier que le rappel survit.

#### Une étape du chantier a été abandonnée, après vérification

J'avais proposé de retirer `http://localhost:5173` de `CORS_ORIGINS` dans `render.yaml`, en le
présentant comme « sans usage en production, coût nul ». **Les deux moitiés étaient fausses.**

- Il a un usage, et c'est le vôtre : `apps/web/.env` pointe sur l'API **de production** — « jamais
  de serveur local, jamais de Docker ». Cette ligne est ce qui rend `npm run dev` possible. La
  retirer aurait cassé le développement local pour rien.
- Et le risque n'existe pas. `main.ts` pose `credentials: false`, il n'y a aucun cookie, et le
  jeton est un Bearer rangé dans `sessionStorage` — **illisible depuis une autre origine**.
  Autoriser cette origine ne donne à personne davantage qu'un `curl`.

*La leçon est celle du chantier 19, retournée : une dette se vérifie avant d'être inscrite autant
qu'avant d'être soldée. J'avais signalé celle-ci sans ouvrir `main.ts` — exactement le geste que
le §9 s'interdit depuis.*

#### Deux constats faits en passant, non traités

- **`messageDe` est dupliqué à l'identique dans huit fichiers** (une ligne chacun). Réel, mais
  hors sujet : toucher huit écrans pour une déduplication cosmétique ajoute du risque sans rien
  rendre. À grouper avec un chantier qui les rouvre pour une autre raison.
- **Le chantier 23 n'avait pas de ligne au §10** alors qu'il était poussé et déployé. Inscrit le
  02/09 d'après son commit. *Le §7 demande le journal « en même temps que le code » ; ce n'est pas
  le chantier qui a manqué, c'est la règle.*

### Ce que le chantier 22 (les squelettes) a appris

*Mené le 01/09/2026, à la demande du porteur : « je veux les skeleton partout ».*

#### La charte le demandait déjà

`globals.css` porte une classe `.ul-shimmer` depuis la reconstruction, avec ce commentaire :
*« CG-08 §06 impose de reproduire fidèlement la structure du contenu final : un squelette dit CE QUI
arrive, là où un rond qui tourne dit seulement qu'on attend. »*

**Deux écrans l'appliquaient. Vingt-deux ne l'appliquaient pas.** La demande du porteur n'était donc
pas un changement de goût : c'était une règle du projet restée lettre morte sur 92 % des cas.

⚠️ Une réserve d'honnêteté : **le texte de CG-08 §06 n'est pas dans le dépôt.** Le README de la
charte ne liste que les intitulés de sections. On s'appuie sur la décision déjà inscrite dans le
code, pas sur une source qu'on pourrait relire.

#### La distinction qui commande tout

Sur 45 ronds qui tournent, **23 étaient au bon endroit** :

| Ce qu'on attend | Le bon signal | Pourquoi |
|---|---|---|
| Des **données qui vont remplir un espace** | un squelette | il dit CE QUI arrive, et il **réserve la place** : rien ne saute quand le contenu se pose |
| Une **action qu'on vient de déclencher** | un rond, dans le bouton | il n'y a aucune forme à annoncer, et le bouton ne doit pas changer de taille sous le doigt |

Les 23 ronds de boutons — « Envoi… », « Enregistrement… » — n'ont pas bougé, et c'est délibéré.
Un squelette dans un bouton n'annoncerait rien et déplacerait la cible au moment précis où on la
vise.

#### Le piège, qui est d'accessibilité

**Un squelette est muet.** Remplacer « Lecture des habilitations… » par des rectangles gris
retirerait l'information à qui ne les voit pas — un recul déguisé en progrès.

Chaque squelette est donc enveloppé dans une zone `role="status" aria-busy="true"` qui **garde la
phrase en `sr-only`**. Un lecteur d'écran entend exactement ce qu'il entendait avant ; l'œil gagne
la forme. Les rectangles, eux, sont `aria-hidden` : trois « groupe, groupe, groupe » seraient du
bruit.

Effet secondaire mesurable : **les 447 tests existants sont passés sans une seule modification**.
Ceux qui cherchaient « Lecture des habilitations… » le trouvent toujours — parce que la phrase n'a
pas été supprimée, seulement rendue invisible.

#### Et un défaut trouvé en chemin

Le squelette du **tableau de bord**, antérieur aux autres, portait un `aria-busy` **sans un mot**.
Un lecteur d'écran n'annonçait donc rien du tout pendant son attente — moins bien que les écrans à
rond qui tourne, qui disaient au moins « Lecture… ». Passé au composant commun.

#### Six formes, parce qu'une seule ne dirait rien

`components/ulamu/Squelette.tsx` : tableau (qui **suit la bascule en cartes de 1024 px**, sans quoi
il annoncerait sur téléphone une forme que le contenu ne prendra pas), cartes, tuiles, lignes de
texte, fil de discussion (bulles **alternées et de largeurs inégales** — des bulles identiques du
même côté ne ressembleraient à aucune conversation), et réglages.

Une seule forme générique aurait ramené le problème du rond : quelque chose qui dit qu'on attend,
sans dire quoi.

L'ondulation s'arrête sous `prefers-reduced-motion` — c'était déjà dans `.ul-shimmer`, et un test
interdit désormais aux squelettes d'introduire une animation à eux, qui échapperait à la règle.

### Ce que le chantier 21 bis (les trous du responsive) a appris

*Mené le 01/09/2026, après que le porteur a demandé si le responsive était VRAIMENT traité partout.*

#### La question qui a tout déclenché

« Tu es honnête, tu as géré tout le responsive correctement de toutes les pages ? »

La réponse était **non**, et il fallait le dire. Le chantier 21 avait corrigé ce qu'il avait mesuré,
et sa mesure portait sur **l'état par défaut de 17 écrans, à 375 et 768 px**. Restaient hors champ :
les quatre écrans d'entrée, tout ce qui s'ouvre en cliquant, la largeur 320 px — courante sur les
téléphones vendus à Brazzaville —, et l'idée même qu'une émulation n'est pas un téléphone.

Trois défauts s'y cachaient, dont deux qu'aucune émulation ne pouvait montrer.

#### 1. `100vh` n'est pas la hauteur visible — et la coquille ne défile pas

`AppShell` était en `h-screen`, c'est-à-dire `height: 100vh`. Sur un navigateur mobile, `100vh` vaut
la hauteur de l'écran **barre d'adresse escamotée**, pas la hauteur réellement disponible. Comme la
coquille est aussi en `overflow-hidden` — par conception, elle ne défile jamais — ce qui dépassait
passait **sous la barre du navigateur, sans aucun moyen d'y accéder**.

En consultation, c'est le **composeur de messages** qui se retrouvait là.

Ce défaut ne se voit dans aucune émulation : le volet de développement n'a pas de barre d'adresse.
Il ne se trouve qu'en lisant l'unité employée. Sept endroits corrigés en `dvh`, avec repli `vh` pour
les navigateurs qui ne connaissent pas l'unité.

#### 2. Tous les panneaux latéraux faisaient la moitié de leur largeur

`sheet.tsx` portait sa largeur dans `data-[side=right]:w-3/4` et `data-[side=right]:sm:max-w-sm`. Un
sélecteur d'attribut a une **spécificité plus forte** qu'une classe simple : le `w-full` et le
`sm:max-w-2xl` que les écrans passaient en `className` étaient donc **systématiquement perdants**.
Et `tailwind-merge` n'y pouvait rien — il ne fusionne que des classes de même famille, or
`data-[side=right]:w-3/4` et `w-full` n'en sont pas.

Mesuré : **384 px au lieu de 672 sur grand écran, 75 % de l'écran au lieu de 100 % sur téléphone**,
pour les quatre panneaux de l'application. Celui d'examen d'un dossier de vérification — là où un
administrateur lit des pièces et décide de l'exercice d'un soignant — travaillait sur la moitié de
la place que l'écran lui demandait, depuis toujours, sans que personne ne l'ait choisi.

La largeur est désormais calculée depuis la propriété `side`, en classes simples : ce que l'écran
demande gagne.

#### 3. L'écran d'activation 2FA pouvait tomber en entier

`QRCode.toDataURL(setup.data.provisioningUri, …)` n'avait **ni garde ni `.catch`**. Une réponse 200
dont la forme n'est pas celle attendue faisait lever `qrcode` — « Cannot read properties of undefined
(reading 'getContext') » — et l'écran entier tombait.

Grave n'importe où ; ici, **bloquant** : depuis que RM-01-06 est rétablie (01/09), aucune action
d'administration n'est possible sans TOTP. Un compte dont l'activation plante n'a plus **aucun**
chemin vers l'administration.

Or l'écran propose déjà la saisie manuelle du secret, juste à côté. En cas d'échec on y bascule
donc : le QR est un confort, le secret est la vraie donnée. Et le bouton « Revenir au QR code »
disparaît quand il n'y a pas de QR — sinon il mènerait à un cadre vide, sur un écran dont on ne peut
pas sortir autrement.

*(Trouvé parce que ma fausse API ne couvrait pas la route. Le garde-fou du chantier 18 a fait son
travail : un message au lieu d'une page blanche.)*

#### Et deux défauts que la largeur 320 px a révélés

- Les dates portaient `whitespace-nowrap` — utile dans une colonne de tableau alignée, **nuisible**
  dans une carte, où il ne fait plus que rogner la valeur. Neutralisé en mode carte.
- Le titre de l'écran de consultation tombait à 74 px pour 108 nécessaires : `flex-1` sans largeur
  de base cède tout à la pastille d'état et au chronomètre. Même correction que pour le bandeau des
  cartes — un plancher, et c'est la pastille qui passe à la ligne.

#### Ce qui reste hors de portée, et le restera

**Un vrai téléphone.** L'émulation ne reproduit ni la barre d'adresse qui se rétracte, ni le clavier
virtuel qui recouvre un champ, ni le rendu de Safari mobile. Le défaut n°1 ci-dessus en est la
preuve : il a été trouvé en LISANT le code, pas en le regardant.

Et **les étapes 4 et 5 de l'inscription** (mot de passe, code de vérification) n'ont pas été
mesurées : les dérouler demanderait de saisir un mot de passe et un code, ce que je ne fais pas.
Les étapes 1 à 3 sont propres à 320 px, et le composant d'étapes est entièrement en `flex-1` — il ne
peut pas déborder, seulement se comprimer.

### Ce que le chantier 21 (le responsive) a appris

*Mené le 01/09/2026, à la demande du porteur, après la mise en ligne des chantiers 18 à 20.*

#### Un audit ne trouve que ce qu'il cherche

Le chantier 18 avait conclu que les seize écrans étaient propres à 375, 768 et 1440 px. C'était
vrai — pour les critères qu'il mesurait : débordement horizontal de la page, texte rogné par sa
boîte, recouvrement, texte de la couleur de son fond.

Et son auditeur **ignorait explicitement** tout ce qui vit dans un conteneur à défilement, pour ne
pas signaler des faux positifs. Or c'est exactement là qu'étaient les tableaux. Un tableau de sept
colonnes tenu par un `min-width: 880px` dans un conteneur `overflow-x-auto` ne déborde de rien : il
est simplement **invisible aux deux tiers**, et rien à l'écran ne dit qu'il faut le tirer.

La leçon n'est pas « l'audit était mauvais ». Elle est : **un audit mesure ce qu'on lui a dit de
mesurer, et son silence ne prouve rien au-delà.** Un second auditeur a donc été écrit, qui ne
cherche plus les défauts mais juge l'adaptation — conteneurs à défilement et leur ampleur, tableaux
et leur largeur réelle, colonnes restées côte à côte, grilles restées à plusieurs colonnes.

#### Ce qu'il a trouvé

| Écran | Ce qui défilait | Caché à 375 px | Caché à 768 px |
|---|---|---|---|
| **C4 · Consultations** | tableau, 7 colonnes, 880 px | **549 px** | 214 px |
| **E1 · File de vérification** | tableau, 7 colonnes, 860 px | **529 px** | — |
| **B3 · Mes paramètres** | **la barre d'onglets**, 812 px | **471 px** | 136 px |
| **E3 · Paramètres métier** | tableau, 5 colonnes, 760 px | **429 px** | — |
| **E4 · Administrateurs** | tableau, 4 colonnes, 720 px | **389 px** | — |
| **E7 · Comptes** | tableau, 4 colonnes (après recherche) | 389 px | — |
| **C5 · Consultation** | la barre d'actions d'un message | 34 px | — |

Le cas de **B3** est le plus grave, et ce n'est pas un tableau : **trois onglets sur cinq étaient
hors écran**. Un onglet qu'on ne voit pas n'existe pas — c'est de la navigation perdue, pas une
donnée qu'on peut aller chercher. Le commentaire du code disait « barre défilante en dessous de
1024 px » : c'était un choix assumé, que la mesure a contredit.

**Le point de bascule est 1024 px, pas 768.** À 768 — une tablette — C4 cachait encore 214 px et
B3 136. Traiter le sujet à `md` aurait laissé les tablettes derrière.

#### Pourquoi la correction est en CSS, et ce que ça a évité

Un composant « tableau adaptatif » aurait imposé de réécrire cinq écrans et le rendu de chaque
cellule. Deux autres approches — deux balisages en parallèle, ou un choix par `useIsMobile` —
auraient l'une dupliqué le contenu (et cassé tous les tests, qui trouveraient deux fois le même
texte), l'autre déplacé une décision de mise en page dans le JavaScript.

La règle CSS ne touche pas au balisage : on ajoute une classe au tableau, et à chaque cellule le nom
de sa colonne (`data-libelle`). Sous 1024 px, chaque ligne devient une carte et chaque valeur porte
son intitulé. **Conséquence directe : les 422 tests existants passent sans une seule modification**,
puisque jsdom n'applique aucune feuille de style et continue de voir le tableau qu'il a toujours vu.

#### Le point d'accessibilité, qui n'était pas gratuit

Passer `tr` et `td` en `display: block` fait **perdre au navigateur la sémantique de tableau** : un
lecteur d'écran cesserait d'annoncer « colonne Statut, ligne 3 ». C'est un effet de bord réel de
cette technique, souvent passé sous silence.

Les cinq tableaux portent donc des `role` explicites — `table`, `row`, `columnheader`, `cell` —
redondants sur grand écran, indispensables en dessous. Et l'en-tête n'est pas masqué en
`display: none` mais retiré du seul flux **visuel** (`clip-path`), comme `sr-only` : il reste lu par
les technologies d'assistance.

#### Deux détails qui se voyaient à l'œil, pas à la mesure

- Une cellule à **deux enfants** — un nom puis un numéro de téléphone — voyait le second repartir à
  la ligne *dans la colonne des intitulés* : le téléphone s'alignait sous « ADMINISTRATEUR ». Une
  règle force tout ce qui suit l'intitulé dans la colonne de droite.
- Les **pastilles s'étiraient en bandeaux** sur toute la largeur : un élément de grille est étiré
  par défaut. `width: fit-content` avec `max-width: 100%` leur rend leur taille sans leur retirer
  le repli à la ligne.

C'est pour cela qu'une relecture ne peut pas être entièrement automatique : la mesure trouve ce qui
est caché, l'œil trouve ce qui est laid.

### Ce que le chantier 20 (NestJS 10 → 11) a appris

*Mené le 01/09/2026, après la mise en ligne des chantiers 18 et 19.*

#### L'avis de l'outil n'était pas la vérité

`npm audit` annonçait, pour chacune des 14 alertes de production : *« Will install @nestjs/core@12.0.1,
which is a breaking change »*. On en a conclu — moi le premier — qu'il fallait sauter **deux majeures**
sur une API de 500 fichiers.

C'était l'avis du résolveur, pas un fait. **NestJS 11 suffit** : les 14 alertes tombent toutes, parce
qu'elles viennent d'`express`, `qs`, `body-parser`, `path-to-regexp` et `file-type` — des dépendances
transitives que la 11 avait déjà renouvelées. `npm audit` proposait simplement la dernière version
disponible, pas la plus petite qui règle le problème.

**Et NestJS 12 est de toute façon hors d'atteinte aujourd'hui.** `@nestjs/throttler`, dans sa
**dernière version publiée** (6.5.0), déclare `@nestjs/common: ^7 || ^8 || ^9 || ^10 || ^11`. Il n'y
a pas de throttler pour la 12. Ce n'est pas un détail de compatibilité : c'est lui qui plafonne
**la route OTP à 5 tentatives par minute**, et il est étendu par une garde maison
(`UserThrottlerGuard`) qui limite par compte plutôt que par adresse IP. Le forcer avec
`--legacy-peer-deps` aurait pu casser cette limite **en silence**, sur une API ouverte sur internet.
On s'arrête donc à la 11 — qui atteint l'objectif entier.

#### Le vrai risque n'était pas Nest, c'était Express

La 11 fait passer `platform-express` d'**Express 4 à Express 5**, donc `path-to-regexp` de la v0.1 à
la **v8** : la bibliothèque qui interprète `/v1/care-sessions/:sessionId`. Ses jokers ont changé de
syntaxe (`*` → `*splat`), les paramètres optionnels (`:id?`) ont disparu, et une route mal
réinterprétée ne casse **aucun test unitaire** — elle rend 404 en production.

Vérification faite avant de toucher quoi que ce soit : **aucun joker, aucun paramètre optionnel,
aucun middleware personnalisé** dans tout le code. Le seul point sensible était
`ServeStaticModule` (qui pose un joker interne), monté avec `@nestjs/serve-static` en version
correspondante.

#### Le filet qu'il a fallu construire d'abord

Les 541 tests existants **ne démarrent jamais Nest** : ils éprouvent des services avec un faux
Prisma. Aucun n'aurait vu un module mal câblé ou un chemin réinterprété. Il fallait donc autre chose.

`scripts/relever-routes.ts` monte l'arbre Nest avec un **Prisma bouchonné** et imprime la table des
routes. Pas de vraie base : `DATABASE_URL` désigne la production, et `SchedulerService` porte un
`@Cron(EVERY_MINUTE)` qui écrit — démarrer l'API pour de vrai ici, c'est la famille d'accident du
23/08. **192 routes relevées avant, 192 après, identiques au caractère près.**

Le script a d'ailleurs détecté la migration tout seul : Express 4 rangeait la pile de routage dans
`_router`, Express 5 dans `router`.

Ce relevé est devenu un test permanent — `src/app.boot.spec.ts`. Il **démarre l'application** et
vérifie que dix routes témoins gardent leur forme exacte, choisies pour ce qu'elles ont de risqué :
un paramètre simple, un paramètre suivi d'un segment fixe, deux paramètres, un jeton dans l'URL, et
`/v1/care-sessions/mine` — un segment fixe **en concurrence** avec `:sessionId` au même niveau, qui
serait avalé si l'ordre d'enregistrement s'inversait.

Il n'exige pas « exactement 192 routes » : un test qu'il faut modifier à chaque route ajoutée finit
par être modifié sans être lu.

#### Ce qu'il faut savoir avant de pousser

**NestJS 11 exige Node ≥ 20** (`@nestjs/core` le déclare). C'est désormais écrit dans le
`package.json` de l'API (`engines`), mais npm n'en fait qu'un avertissement : **il faut vérifier
`NODE_VERSION` dans la console Render**. Si le service est épinglé sur Node 18, le déploiement
échouera — et, comme pour la clé de chiffrement, l'instance précédente restera en ligne.

### Ce que le chantier 19 (les dettes) a appris

*Relecture du §9 menée le 01/09/2026, après la relecture visuelle.*

#### La leçon du chantier : une dette se vérifie, elle ne se relit pas

Treize lignes, treize vérifications dans le code. **Trois étaient fausses**, et toutes les trois
dans le même sens — la dette était décrite comme moins grave qu'elle ne l'était :

- **La n°2** disait « `HANDSHAKE_AUTOCONFIRM_MS` **est parti** », 🟡 moitié soldée. `git log -S` sur
  la fonction ne montre qu'un seul commit : celui de l'import initial. **Elle n'était jamais
  partie.** Ce qui avait été retiré le 28/08, c'est la ligne de `render.yaml` — la configuration,
  pas le mécanisme. Le journal avait enregistré une intention comme un fait.
- **La n°9** disait « eslint absent partout ». En réalité mobile lintait (eslint, 13 erreurs) et le
  web aussi (oxlint). Seule l'API déclarait un script pointant sur un binaire absent.
- **La n°10** ne comptait que le web, et concluait « à re-vérifier » sur un argument — « concerne
  le mode RSC, non utilisé » — qui dispensait de regarder. En regardant : le correctif était publié
  depuis la version suivante, et l'API traînait **14 alertes de production** que personne n'avait
  comptées.

D'où la règle qu'on retient : **une ligne de dette est une hypothèse jusqu'à ce qu'on ait rouvert le
fichier.** Le §9 porte désormais la date de sa dernière vérification.

#### Ce qui a été soldé

| # | Ce qui a été fait | Le détail qui comptait |
|---|---|---|
| **2** | Le « soignant virtuel » **retiré du code**, pas seulement de la configuration. | `scheduleDevAutoConfirm` fabriquait un acteur portant l'`accountId` **du vrai médecin** et appelait `confirm()` à sa place. Ce n'était pas un figurant de démonstration : c'était une **usurpation d'identité côté serveur**, inscrite au journal d'audit sous le nom du médecin, sur une décision de soin qu'il n'avait pas prise. Sa raison d'être — permettre à un patient seul de dérouler le parcours — a disparu le jour où C3 « Demandes » a existé. **`MOMO_AUTOCONFIRM_MS` reste** : elle simule le *payeur*, pas un soignant, et sans elle aucune séance ne démarre tant qu'aucun agrégateur n'est choisi. |
| **8ter** | Le dernier titulaire d'un sous-rôle est protégé, **sur les deux routes**. | La dette ne parlait que de la révocation. Mais `assignAdminRole` fait un **upsert** : « Changer le rôle » vide le sous-rôle tout aussi sûrement, et c'est le bouton que E4 propose. **Et un cas que personne n'avait vu** : un SUPER_ADMIN unique pouvait s'attribuer à lui-même un rôle moindre. La garde d'auto-révocation ne voyait rien passer — et comme seul un SUPER_ADMIN attribue des rôles, **plus personne n'aurait jamais pu en attribuer**. L'administration devenait irréparable sans écrire directement en base. E4 le dit maintenant avant le clic, comme la maquette l'annonçait. **9 tests API, 3 tests web.** |
| **9** | Le lint tourne, partout, et il est vert. | L'API est passée à **oxlint**, comme le web : un binaire, aucune configuration, et il connaît TypeScript. Installer `eslint` + `typescript-eslint` aurait coûté une centaine de paquets et une configuration à écrire, pour le même service. **5 avertissements sur l'API, tous soldés** — dont un piège : `const session = await this.loadForParticipant(...)` était signalé « variable jamais lue » dans `deleteMessage`. Supprimer la ligne aurait **ouvert la suppression de messages à n'importe quel compte authentifié** : l'appel est le contrôle d'accès, seule la liaison était inutile. **13 erreurs sur mobile, toutes soldées**, dont une dépendance manquante dans un `useCallback` qui ne marchait que parce qu'un autre fichier pensait à mémoriser son API. Enfin, le script racine prétendait tout couvrir : web et mobile étant hors du workspace pnpm, il n'atteignait que l'API. `lint`, `test` et `build` les appellent maintenant explicitement. |
| **10** | Le web passe à **zéro alerte**. | Les 3 alertes `react-router` n'étaient pas « un mode RSC non utilisé qu'on peut ignorer » : le correctif était publié en **7.18.2**, et le projet était en **7.18.1**. Une montée de patch, dans la plage `^` déjà déclarée. Plus une alerte `nanoid` transitive, réglée par `npm audit fix`. |

#### Ce qui reste, et à qui

**Quatre gestes qui n'appartiennent qu'au porteur** *(le cinquième — retirer `ADMIN_REQUIRE_TOTP` — a été fait le 01/09)* — ils touchent la console Render, la console Neon
ou la base en ligne, et aucun code ne peut les faire à sa place. ⚠️ **Le premier déploiement après
ce chantier refusera de démarrer si `SECRETBOX_KEY` n'est pas valide sur Render** : c'est le
garde-fou demandé, mais vérifiez la variable avant de pousser.

1. **Changer le mot de passe du super-administrateur en ligne** et activer son TOTP (dette 1).
3. **Supprimer ou bannir les six comptes de démonstration** depuis E7 (dette 3).
4. **Mettre `SECRETBOX_KEY` à l'abri hors ligne** (dette 5) — sans elle, pièces, messages et secrets
   2FA sont définitivement illisibles.
5. **Créer une branche Neon de test** et coller son URL dans `TEST_DATABASE_URL` (dette 8). Tout est
   prêt autour : le garde-fou refuse de démarrer sans elle, et refuse aussi qu'on y recopie l'URL de
   production — le geste exact qui a effacé la base le 23/08.

#### Les trois arbitrages, tranchés le jour même

| Dette | Décision du porteur | Ce que ça a coûté |
|---|---|---|
| **6** — garde-fou `SECRETBOX_KEY` | **Refuser de démarrer** sans clé valide | `common/crypto/garde-secretbox.ts` + un appel en tête de `bootstrap()`, 12 tests. ⚠️ **Vérifier la variable sur Render avant de pousser** : c'est le seul changement de ce chantier capable d'empêcher un déploiement de démarrer. C'est précisément ce qu'on lui demande — mais autant le savoir avant. |
| **8bis** — spécialité | **Fermer la porte côté serveur** | 3 lignes de moins dans le DTO et le service. Le pipe global (`forbidNonWhitelisted`) répond 400 : l'appel est refusé, pas ignoré. Une correction légitime n'a plus de chemin — dette assumée et inscrite. |
| **8quater** — `support@ulamu.cg` | **Un formulaire dans l'application** | La plus grosse pièce du chantier, et de loin. Voir ci-dessous. |

#### La dette qui s'est révélée être un chantier

L'option retenue pour `support@ulamu.cg` était décrite comme « ~1 écran + 1 route ». En ouvrant le
code, elle en valait davantage — et l'énoncé que j'avais proposé était inexact sur un point qui
comptait : **« un formulaire qui crée un signalement traité en E6 » ne tient pas.** Un signalement
vise QUELQU'UN (`targetType`, `targetId`) et se solde par une décision de modération : rejeter,
avertir, transmettre. « J'ai perdu mon numéro » n'est aucune de ces choses, et la file d'E6 est
triée par **gravité d'un manquement**. Y verser des demandes d'aide aurait abîmé les deux.

Ce qui manquait était ailleurs, et plus simple à voir une fois nommé : `SupportProcedure` existait
déjà, mais c'est la trace de ce qu'un **administrateur a fait** — `executedBy` y est obligatoire.
Rien ne portait ce qu'un **utilisateur demande**. Les deux moitiés d'un même geste, et la première
n'existait pas. D'où :

- **Une table `SupportRequest`** et sa migration — **la première migration de schéma depuis le début
  de la reconstruction**. Purement additive, écrite à la main : `prisma migrate dev` aurait visé la
  base Neon de production, exactement le chemin qui l'a effacée le 23/08. Render joue
  `migrate deploy` au déploiement.
- **Son sujet réutilise `SupportProcedureType`** : une demande « j'ai perdu mon numéro »
  (`PHONE_CHANGE`) désigne directement la procédure guidée qui la traitera. Les deux moitiés parlent
  la même langue.
- **Quatre routes** : deux pour l'utilisateur (déposer, relire ses demandes ET les réponses), deux
  pour l'administration (la file, répondre). Aucun sous-rôle pour écrire : c'est précisément quand
  plus rien d'autre ne marche qu'on a besoin d'écrire.
- **Un onglet « Aide » dans B3**, où les mentions légales et C1 mènent désormais. **La réponse s'y
  affiche** — sans ce chemin de retour, le formulaire vaudrait moins que l'adresse morte qu'il
  remplace : avec une adresse, on sait au moins qu'on n'a pas eu de réponse.
- **Une file dans E7**, à côté des procédures support, avec le nom ET le numéro du demandeur — sans
  eux on ne peut pas rappeler quelqu'un dont c'est justement le numéro qui pose problème.

Ni le corps de la demande ni le texte de la réponse ne partent au journal d'audit, seulement le
sujet — même règle que pour les signalements (RM-04-03). Une demande de support raconte souvent ce
qui va mal chez quelqu'un, et le journal est en insertion seule : ce qui y entre n'en sort plus.

Et une chose que répondre ne fait **pas** : agir. Ni sur un numéro, ni sur un dossier, ni sur un
compte. L'effet réel passe par la procédure du module propriétaire (RM-16-01) — celle d'à côté.

**Un constat nouveau, hors chantier** : les **14 alertes de production de l'API** exigent NestJS 12
alors que le projet est en NestJS 10. Deux majeures sur une API de 500 fichiers — c'est une
migration à planifier, pas un nettoyage. Une montée dans le majeur courant (10.4.15 → 10.4.22) a été
essayée et **n'en résout aucune** ; elle a donc été annulée plutôt que laissée en place pour rien.

### Ce que le chantier 18 (la relecture visuelle) a appris

*Relecture menée le 01/09/2026, après les 17 écrans et le remplacement des listes natives.*

#### Comment elle a été menée — et ce que cela ne prouve pas

Le chantier demandait de relire les écrans « côte à côte avec leur maquette, dans les 4 états, les
3 tailles et les 2 thèmes ». Deux obstacles, et ce qu'on en a fait :

1. **Il est interdit de saisir un mot de passe.** Impossible donc de se connecter pour atteindre les
   écrans protégés. Contournement : une **fausse API locale** jetable (hors du dépôt, port 5174),
   une session fabriquée écrite dans `sessionStorage`, et `VITE_API_URL` détourné le temps de la
   revue par un `.env.local` que `.gitignore` couvre déjà (`*.local`). **Rien de tout cela n'est
   dans le dépôt, et rien n'a touché la production.**
2. **Les captures d'écran ne sont pas fiables au-delà de 1024 px** : le volet du navigateur mesure
   689 px et réduit tout ce qui est plus large — une capture d'un 1440 px arrive en 383 px utiles,
   illisible. Elles ont donc servi à juger la **composition**, jamais à mesurer.

La mesure, elle, a été faite **par le programme** : un auditeur injecté dans la page relève, sur
chaque écran, le débordement horizontal, ce qui dépasse le bord droit, le texte rogné par sa propre
boîte, le recouvrement barre/contenu, le texte de la couleur de son fond, les tailles sous 11 px et
les cibles tactiles sous 32 px. C'est plus sûr qu'un œil : `18 px` de large pour un titre qui en
demande 78 ne se voit pas, il se mesure.

**Ce que cette revue prouve — et ce qu'elle ne prouve pas.** Elle prouve la mise en page, les
thèmes, la composition et les textes des quatre états. Elle ne prouve **aucun comportement
serveur** : les données venaient d'une fausse API. Et **le site déployé reste en arrière** des
commits locaux.

#### Les sept défauts trouvés, et ce qui a été fait

| # | Écran(s) | Le défaut | La correction |
|---|---|---|---|
| **1** | **les 16, à 375 px** | **Le tiroir de navigation ne quittait jamais l'écran.** `-translate-x-full` déplace de −100 % de la largeur de l'élément ; l'enveloppe n'en déclarait aucune (son unique enfant est en `absolute`, donc hors flux). La translation valait **0 px**. Le tiroir restait collé à gauche, recouvrant 264 des 375 px — et comme il est `inert` quand il est fermé, ni ses liens ni sa croix ne répondaient. **Un panneau mort par-dessus tous les écrans mobiles.** | `w-[var(--sidebar-width)]` sur l'enveloppe (`AppShell.tsx`). Ouverture, voile et fermeture vérifiés au clic. Test : `coquille.test.tsx` verrouille la **cause** — jsdom ne calcule aucune mise en page, on ne peut pas mesurer la translation, mais on peut exiger la largeur. |
| **2** | **toute l'application** | **Aucune limite d'erreur React nulle part.** Une erreur de rendu démonte l'arbre entier : page blanche, aucun message, aucun retour sans recharger. **Deux écrans sur seize** l'ont fait pendant la revue, sur une cause banale — une réponse 200 dont la forme n'était pas celle attendue, lue sans précaution (`data.preferences.find(…)`). | `components/layout/GardeFou.tsx`, à deux niveaux : autour de l'écran de la route (la coquille survit, donc le moyen de partir ailleurs) et autour de l'application (dernier recours, hors coquille). `key={pathname}` pour que changer d'écran efface l'erreur. 7 tests. |
| **3** | **toute l'application** | **`watchSystemTheme` n'était appelée par personne.** La fonction existait depuis la création du magasin, sa documentation annonçait « appelé une fois au démarrage » — aucun fichier ne l'appelait. Le thème n'était donc lu qu'au chargement : sur un poste qui bascule en sombre le soir, ULAMU restait clair jusqu'au rechargement. Or `system` est le **défaut**. | `useEffect(() => watchSystemTheme(), [])` dans `App.tsx`. Vérifié à l'écran : la bascule suit désormais sans recharger. 4 tests, dont un qui lit la racine — le défaut était une **absence**, invisible à tout test de composant. |
| **4** | **A1, A2, A3, A4** | **Les quatre écrans d'entrée n'avaient ni titre ni repère de page** : zéro `h1`, zéro `main`. Un lecteur d'écran liste les titres pour se déplacer et annonce le repère à l'arrivée ; sur `/login` il n'annonçait rien — sur la première page de l'application. | `<main>` et un `h1` en `sr-only` dans `AuthLayout`, et en propre dans `TotpSetupPage` (qui n'utilise pas la coquille d'entrée). **Rien ne change à l'écran** : la maquette ne montre que le logo, et ce qui manquait n'était pas visible. 5 tests. |
| **5** | **E7, à 375 px** | Le titre « Procédures support » s'affichait dans **18 px** — une lettre. Son voisin, le groupe de segments (239 px), était `shrink-0` ; le titre, `flex-1 min-w-0`, cédait donc tout. | `flex-wrap` sur le bandeau et `basis-40` sur le bloc de titre, dans `Carte` (`parts.tsx`). Sur grand écran, rien ne change. 4 tests. |
| **6** | **E1, E2, E3, E4, E6** | **Un compte affiché à zéro pendant une panne.** « 0 demande à trancher », « 0 dossier ouvert », « À trancher 0 » : tous dérivés de `data ?? []`, donc affichés **identiques** que la liste soit vide ou illisible. C'est la pire des deux erreurs, puisqu'elle n'invite à rien faire. Et c'est exactement ce que le projet s'interdit : *on lit un chiffre du serveur, ou on ne l'affiche pas*. | Le sous-titre (et les onglets d'E2) ne portent un compte que si `isSuccess`. E2 recevait en plus la seule phrase brute du serveur, sans dire ce qu'on risque ni offrir de réessayer : elle est remplacée. 2 tests. |
| **7** | **C2** | Dossier illisible → `canPractice` valait `false` par défaut → l'écran annonçait **« Votre fiche n'est pas encore visible des patients »**, avec la carte « Êtes-vous visible ? » passée au **rouge** et ses trois conditions marquées non remplies. À un médecin parfaitement en règle, sur une panne réseau. | Trois états au lieu de deux : « visibilité inconnue » tant que la lecture n'a pas abouti, carte neutre, verdict retenu. 2 tests. |

#### Deux constats vérifiés qui n'étaient PAS des défauts

Les nommer compte autant : une revue qui ne trouve que des fautes finit par en inventer.

- **Les intitulés en 10 px** (`font-mono`, majuscules) reviennent sur presque tous les écrans, et
  l'auditeur les signale à chaque passage. Or la maquette elle-même les pose en **10 px** — et
  descend même à **9 px** en trois endroits d'E5. C'est donc **conforme**, pas fautif. Reste une
  question de confort à trancher par le porteur : 10 px en capitales monospace, sur un téléphone à
  bout de bras, est à la limite. Le corriger coûte trois lignes ; s'en écarter coûte un écart
  assumé de plus avec la maquette. **Recommandation : ne rien changer** — ces intitulés sont des
  étiquettes, pas du texte à lire, et la valeur qu'ils coiffent est en 22 px juste dessous.
- **Des clés React en double** dans le journal d'E4. Vérification faite : le journal fusionne
  **trois lectures filtrées sur trois actions distinctes**, et une entrée ne porte qu'une action —
  un doublon est donc impossible côté serveur. Il venait de la fausse API, qui servait la même
  réponse aux trois appels. **Rien à corriger.**

#### Ce qui n'a pas pu être relu

- **Les états où l'on n'entre qu'en agissant** : formulaires en cours de saisie, panneaux ouverts
  après un clic (l'examen d'un dossier en E1, l'ordonnance de C7), messages d'erreur de mutation.
  Ils sont couverts par les tests, pas par cette relecture.
- **Le comportement réel du serveur** : la revue parlait à une fausse API.
- **Le site déployé.** `https://ulamu-web.onrender.com` ne porte encore **aucun** de ces chantiers :
  les commits sont locaux, la poussée appartient au porteur.

### Étape 6 — le comparatif bloc à bloc de E6

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « 4 ouverts, dont 1 hors délai · **délai réglementaire de 48 h** » | « N ouverts, dont N hors délai · les plus graves d'abord » | **écart de fait** — le seuil vit dans PM-23, que cette route ne sert pas, et auquel un modérateur n'a **pas accès** (les paramètres sont réservés au super-administrateur). Le serveur envoie un drapeau ; c'est lui qu'on affiche |
| Bandeau « ces signalements **passent avant tout autre dossier de la file** » | « La file reste triée par gravité puis par ancienneté : un signalement en retard ne passe pas devant un plus grave » | **la promesse était fausse** — voir ci-dessous |
| Liste : `SIG-2026-00218`, motif, **« Dr Firmin Loubaki »**, « reste 40 min » | Motif en français, extrait du texte, date de dépôt, pastille « hors délai » | **trois écarts de fait** — ce format de référence n'existe pas ; le **nom** du mis en cause n'est pas servi (seul son identifiant l'est) ; et le temps restant demanderait le seuil, qui n'est pas servi non plus |
| Étiquette « **3ᵉ SIGNALEMENT** » sur une ligne | retirée | **écart de fait** — aucune route ne compte les signalements visant une même personne. Le calculer sur la file affichée donnerait un chiffre **partiel présenté comme un antécédent**, sur un écran qui décide de sanctions |
| Détail « **CE QUI EST REPROCHÉ** » | idem — `reasonText`, tel quel | conforme |
| Détail « **PARTIES** » : plaignant (initiales, référence, « 1er signalement déposé ») **et** mis en cause | Le mis en cause seul, et **une phrase qui explique l'absence de l'autre** | **l'écart le plus lourd** — le serveur RETIRE l'identité du signaleur avant de servir (RM-04-04). Ce n'est pas une donnée manquante : c'est la condition pour qu'on ose signaler |
| Détail « **CHRONOLOGIE** » : dépôt · demande d'explication envoyée · relance automatique | La date de dépôt seule | **entièrement inventée** — aucun échange avec le mis en cause n'existe, aucune relance non plus |
| Issue « Classer sans suite » | idem | conforme |
| Issue « Avertir le praticien » | « Avertir » — avec ce que cela ne fait pas : aucune restriction d'accès | conforme, et précisé |
| Issue « **Suspendre 15 jours** » | remplacée par « Transmettre à l'administration des comptes » | **deux écarts** — ce n'est pas une décision d'ici (c'est une **transmission**), et **aucune durée n'existe** au modèle (même absence qu'en E7) |
| Issue « **Bannir définitivement** » | même transmission, et l'écran rappelle qu'un bannissement demande un second administrateur | **écart de fait** — un modérateur qui croit avoir banni ne rouvrira rien ailleurs |
| *(absente de la maquette)* | Issue « Transmettre à la vérification » | **ajout** — c'est la quatrième issue du serveur, et le bon chemin quand ce sont les pièces ou le droit d'exercer qui sont en cause |
| Motif « **20 caractères minimum** » | Motif obligatoire, sans minimum de longueur | **écart assumé** — le serveur exige un motif non vide, pas vingt caractères. Imposer un seuil que le serveur ignore, c'est l'écran qui légifère |
| *(absente de la maquette)* | « Cette décision est définitive : ce signalement ne pourra plus être rejugé » | **ajout** — le serveur refuse de rejuger un signalement tranché, et il vaut mieux le savoir avant |
| Bouton d'export | absent | famille 3, groupe D |

### Ce que le chantier 17 (E6 — Signalements) a appris

**Une donnée absente peut être la fonctionnalité.** La maquette montre le plaignant à côté du mis en
cause, comme dans n'importe quel dossier contradictoire. Le serveur, lui, **retire l'identité du
signaleur avant de servir** — et ce n'est pas une lacune : c'est ce qui permet de signaler un
praticien dont on dépend, dans une ville où l'on retournera le voir. Un modérateur qui verrait qui
accuse pourrait, sciemment ou non, en tenir compte.

L'écran ne laisse donc pas un vide — un vide se remplit un jour. **Il écrit pourquoi la donnée
n'est pas là**, deux fois : en tête d'écran, et dans le dossier ouvert. *C'est le troisième cas de
ce plan où le bon geste est d'expliquer une absence : le rapport de rapprochement non conservé en E2,
la liste de comptes qui n'existe pas en E7, l'identité du signaleur ici.*

**Un tri annoncé faux fait chercher au mauvais endroit.** « Ces signalements passent avant tout autre
dossier de la file » : le serveur trie par **gravité d'abord, ancienneté ensuite** (CU-04-04). Un
spam en retard reste derrière un harcèlement déposé le matin même — et c'est le bon ordre. Un
modérateur qui croit la maquette chercherait en tête une ligne qui n'y est pas, puis conclurait à un
défaut d'affichage.

**Deux des quatre issues ne tranchent pas : elles transmettent.** « Suspendre 15 jours » et « Bannir
définitivement » n'existent pas ici. Le serveur propose de **transmettre** — à l'administration des
comptes, où la sanction se décide avec son propre motif et, pour un bannissement, un second
administrateur. Nommer un bouton par l'effet espéré plutôt que par ce qu'il fait est la même erreur
qu'en E7 avec « Bannir » ; ici elle serait pire, parce que le modérateur croirait le dossier clos.

**Le minimum de vingt caractères n'a pas été repris.** Le serveur exige un motif non vide, rien de
plus. Imposer un seuil de longueur que le serveur ignore, c'est l'écran qui légifère — et cela
bloquerait un motif court mais juste. *Symétrique exact de la leçon du chantier 10 : un réglage
n'entre que s'il fait quelque chose ; une contrainte n'entre que si elle vient d'ailleurs que de
l'écran.*

### Étape 6 — le comparatif bloc à bloc de E5

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Pilotage · Août 2026 · **arrêté au 13 août, 07:00** » | « N critères sur M atteints · calculé à l'instant, HH:MM » | **écart de fait** — rien n'est arrêté à une heure : tout est calculé au moment de la lecture. Annoncer un instantané ferait attendre une actualisation qui n'existe pas |
| Huit tuiles : comptes actifs · soignants vérifiés · officines actives · consultations honorées · ordonnances servies · **volume encaissé** · délai médian de vérification · **taux de réclamation** | Les **sept critères du pilote**, servis avec leur cible et leur état | **écart de fait** — `getPilotKpis` sert exactement les sept critères de succès du plan de sortie. Volume encaissé, taux de réclamation et délai médian ne sont mesurés **nulle part** |
| Tendances « **+37 vs juillet** », « +14 % », « −6 h » sur chaque tuile | absentes | **écart de fait** — aucune série historique n'existe pour ces agrégats : ils sont calculés à la lecture. Même renoncement qu'en B2, pour la même raison |
| Graphique « Consultations honorées · semaines 27 à 32 » | absent | **écart de fait** — rien ne découpe ces agrégats par semaine |
| Bloc « **Intégrité du journal** · Chaîne intacte · dernière vérification » | idem, avec ce que le chaînage signifie | conforme |
| « Entrées scellées 48 912 · Ruptures 0 » | idem — `checked` et `ok` | conforme |
| « **Actions sans motif** 0 · **Suppressions tentées** 0 » | absents | **écart de fait** — ni l'un ni l'autre n'est compté. Et « suppressions tentées » supposerait qu'on enregistre des tentatives qui n'ont **aucun chemin** pour se produire : le journal est en insertion seule |
| Tableau « Respect des délais réglementaires » : 3 processus × 4 colonnes (limite · médian · hors délai · tenue) | **Deux lignes vraies** : les dossiers en retard *en ce moment*, et le taux de remboursement automatique | famille 3, groupe E — sur douze cases, deux seulement étaient mesurables |
| Ligne « Décision de remboursement · limite **15 j** · médiane 6 j · tenue 100 % » | retirée, et remplacée par la phrase vraie | famille 1, point 5 — **trois défauts en une ligne** : le remboursement automatique est immédiat, la ligne parlait en fait du manuel dont aucune échéance n'existe au cahier, et médiane comme tenue ne sont mesurées nulle part. Un chiffre **inventé**, pas erroné |
| Bloc « **Couverture par arrondissement** » — six lignes écrites en dur | idem, **compté** par `GET /admin/coverage` (S6), trié du mieux au moins couvert | **le seul coût serveur de la famille 3**, et il est justifié : c'est la seule dimension territoriale du produit |
| « Makélékélé et Talangaï restent sous-couverts : moins d'un soignant vérifié pour **8 000 habitants** » | La définition de ce que « soignant » recouvre, et le classement | **écart de fait** — aucune donnée de recensement n'existe, et ULAMU n'a **aucune raison** d'en détenir. Le classement dit déjà où la couverture manque |
| *(absent de la maquette)* | « Aucune donnée individuelle ne sort de cet écran : que des compteurs et des taux » | **ajout** — RM-16-05 |

### Ce que le chantier 16 (E5 — Pilotage) a appris

**Un tableau de douze cases dont deux sont mesurables n'est pas un tableau à compléter.** « Respect
des délais réglementaires » croisait trois processus et quatre colonnes. Ni la médiane, ni le
hors-délai historique, ni le taux de tenue ne sont calculés par quoi que ce soit — le serveur expose
sept indicateurs, aucun ne mesure un délai de traitement. Garder la forme en la remplissant de tirets
aurait suggéré un chantier en cours ; la remplacer par **deux lignes vraies** dit ce qu'on sait.
*Et il fallait résister deux fois : la seconde ligne (les dossiers en retard en ce moment) existait
déjà dans la file de vérification, il suffisait de la lire au bon endroit.*

**« Sous-couvert » demande une population, pas seulement des effectifs.** La phrase de la maquette —
« moins d'un soignant pour 8 000 habitants » — mélangeait deux choses : un compte qu'on peut faire,
et un recensement qu'on n'a pas. C'est le seul endroit du plan où **l'absence de donnée est une bonne
nouvelle** : ULAMU n'a aucune raison de détenir des données de population. Le classement du mieux au
moins couvert dit déjà où la couverture manque, et il ne prétend rien sur les gens qui y vivent.

**Compter « soignant » est un choix, pas une évidence.** Un dossier vérifié dont le contrat n'est pas
signé ne peut pas exercer (D-029). L'inclure dans la couverture aurait gonflé le territoire de
praticiens qu'aucun patient ne peut joindre — sur un indicateur d'accès aux soins, l'erreur est du
mauvais côté. Le filtre est donc **exactement celui du KPI « professionnels vérifiés et actifs »**, et
un test le verrouille. Même règle pour les officines : une pharmacie suspendue ne couvre personne.

**Un test peut interdire un mot qu'il fallait écrire.** Mon assertion refusait « médian » et « taux
de tenue » n'importe où dans l'écran — alors que ces mots figurent dans la phrase qui explique
pourquoi ils ne sont PAS mesurés. Le test a échoué sur ma propre honnêteté. Corrigé pour verrouiller
le fait — *aucun tableau, aucune valeur de délai* — plutôt que le vocabulaire. *Un test qui interdit
des mots finit par interdire les explications.*

### Étape 6 — le comparatif bloc à bloc de E4

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Administrateurs · 5 administrateurs · 2 super-admin · *connecté comme Sylvie Ngouabi* » | « N comptes d'administration · un sous-rôle chacun » | conforme, sans la mention du connecté — déjà dans la barre du haut |
| Quatre tuiles : SUPER-ADMINISTRATEUR · VÉRIFICATION · FINANCE · **MODÉRATION** | Super-administrateur · Vérification · Finance · **Couverture territoriale** | **écart de fait** — « modération » n'existe pas ; le quatrième rôle est `ADMIN_MAP`. La modération des signalements relève du super-administrateur |
| Sous-titre « Un sous-rôle **s'attribue et se révoque séparément** » | « Un compte porte **exactement un** sous-rôle : lui en attribuer un autre remplace le précédent » | **l'écart qui commande l'écran** — voir ci-dessous |
| Tableau : **quatre colonnes cochables** (SUPER / VÉRIFICATION / FINANCE / MODÉRATION) | **Une colonne**, une pastille | même cause. Une matrice aurait menti au geste près |
| Colonne **ADMINISTRATEUR** : initiales, nom, « Vous », téléphone, *« depuis mars 2024 »* | Nom, « Vous », téléphone | **écart** — la date d'entrée n'est pas servie ; `assignedAt` dit quand le RÔLE a été attribué, ce n'est pas la même chose, et c'est dans sa propre colonne |
| Colonne **DERNIER ACCÈS** « il y a 2 h · dernière connexion » | retirée | **écart de fait** — `listAdmins` ne sert pas la dernière connexion, et aucune route ne l'expose par compte |
| Actions « **Suspendre** » / « Révoquer » | « Changer le rôle » / « Révoquer » | **écart assumé** — suspendre un compte passe par E7, avec motif obligatoire, notification au titulaire et trace. Le doubler ici donnerait deux chemins pour une même décision, dont un **sans motif** |
| « Compte protégé » sur sa propre ligne | idem, **et le bouton disparaît** | conforme, et au-delà : le serveur refuse l'auto-révocation, l'écran ne propose donc pas le geste |
| Phrase « Une case grisée signale soit votre propre compte, soit le dernier porteur d'un sous-rôle » | La protection du compte courant seule | **écart de fait** — la protection « dernier porteur d'un sous-rôle » **n'existe pas** au serveur : seule l'auto-révocation est refusée. L'annoncer laisserait croire à un garde-fou absent |
| **Journal des habilitations** avec ses motifs | idem, lu du **journal d'audit** sur trois actions | conforme — il n'a pas de table propre, et le filtre serveur étant un égal exact, l'écran fait trois lectures |
| *(absent de la maquette)* | « Ouvrir cet écran laisse elle-même une trace » | **ajout** — RM-04-02 : consulter le journal s'inscrit au journal |
| « Créer un administrateur » — **nom + téléphone** | Reléguée au second plan, avec ses **vrais champs** (identifiant, mot de passe provisoire) et ce que cela implique | famille 3, groupe D |

### Ce que le chantier 15 (E4 — Administrateurs) a appris

**Une matrice de cases aurait menti au geste près.** La maquette montre quatre colonnes cochables et
annonce « un sous-rôle s'attribue et se révoque séparément ». `AdminRoleAssignment` porte **une seule
ligne par compte, avec un seul rôle** : l'attribution est un `upsert`. Cocher « Finance » sur un
vérificateur ne l'aurait donc pas renforcé — cela lui aurait **retiré l'instruction des dossiers**,
sans qu'aucun texte ne le dise. *L'écart n'était pas décoratif : c'était un geste dont l'effet est
l'inverse de ce qu'il paraît.* Le verbe le dit maintenant : on **change** un rôle, on ne l'ajoute pas.

**Une protection annoncée qui n'existe pas est pire qu'une protection absente.** La maquette écrit :
« une case grisée signale soit votre propre compte, soit **le dernier porteur d'un sous-rôle** ». Le
serveur ne refuse que l'auto-révocation. Rien n'empêche de retirer le dernier vérificateur de la
plateforme — et l'écran qui promettrait ce garde-fou ferait cliquer en confiance. La phrase est donc
réduite à ce qui est vrai. *À signaler comme dette : un dernier porteur révoqué laisse un domaine
entier sans administrateur, et rien ne l'empêche.*

**Le geste courant n'est pas celui que la maquette met en avant.** Créer un compte d'administration
est rare ; en habiliter un est le quotidien. Et la création a une conséquence que la maquette taisait
en ne demandant que nom et téléphone : le serveur exige un **mot de passe**, donc le
super-administrateur choisit celui de quelqu'un d'autre — exactement ce que la plateforme interdit
ailleurs (« un compte ne peut être créé que par son titulaire »). On ne peut pas retirer le champ ;
on peut refuser de taire ce qu'il implique, et c'est ce que l'écran fait.

**Le journal d'audit n'avait aucun lecteur.** `GET /v1/admin/audit` existe depuis toujours, avec sa
pagination, ses filtres et son propre audit de consultation — et **aucun écran ne l'appelait**. Le
« journal des habilitations » de la maquette n'a pas de table propre : il vit là. Trois actions,
trois lectures (le filtre serveur est un égal exact), fusionnées par ordre décroissant. *C'est la
quatrième route trouvée sans client depuis le début de ce palier — après les procédures support, le
rapprochement et l'impact des paramètres.*

### Étape 6 — le comparatif bloc à bloc de E3

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Paramètres métier · **40 paramètres en 6 familles** · 5 engagent les contrats signés » | « N paramètres · toute modification part au journal d'audit », N compté sur ce que le serveur renvoie | **écart de fait** — il n'y a ni familles ni total figé : les paramètres sont ce que la base contient. Et **un seul** engage les contrats (PM-01), pas cinq |
| Regroupement en six familles (Commissions · Consultations · Vérification · Pharmacie · Sécurité · Plateforme) | Un tableau à plat, trié par clé | **écart de fait** — aucun champ « famille » n'existe. En inventer un côté écran créerait une seconde vérité, à diverger au premier paramètre ajouté |
| Colonne **PARAMÈTRE** : intitulé + `COMMISSION_SOIGNANT_PCT` | La clé réelle (`PM-01`) | **écart de fait** — ces noms n'existent pas |
| Colonne **EFFET** : une phrase d'explication | La **description portée en base** | conforme, et corrigé : elle vient du serveur, pas d'une copie |
| Colonne **VALEUR** | idem | conforme |
| Colonne **DERNIÈRE MODIFICATION** : date + *nom de l'administrateur* | Date seule | **écart** — `PlatformParameter` porte `updatedAt`, pas l'auteur. L'auteur est dans l'**historique**, où l'écran le montre |
| Action **Modifier** | idem, avec valeur, motif obligatoire et impact | conforme |
| *(absent de la maquette)* | **Historique par paramètre** : ancienne → nouvelle valeur, date, motif | **ajout** — la route existait, aucun écran ne la lisait |
| Case « **je comprends les conséquences** » (implicite dans « confirmation supplémentaire ») | **Le nombre réel de contrats signés**, ce qui arrive à leurs titulaires, puis une case qui confirme ce fait chiffré | **S5** — famille 4, point 11 |
| « Un **préavis de 30 jours** leur est légalement dû avant toute application » | « Le changement prend effet **immédiatement** : les effets différés ne sont pas gérés, et le serveur refuse une date future » | famille 2, point 5 — le différé n'est pas absent, il est **activement rejeté** |
| Phrase de bas de page sur le motif et le journal d'audit | **Remontée en tête**, parce qu'elle conditionne tout ce qui suit | conforme sur le fond |

### Ce que le chantier 14 (E3 — Paramètres métier) a appris

**Une case à cocher n'est pas une information.** « Je comprends les conséquences » demande d'assumer
sans jamais dire quoi. Le serveur, lui, savait : `updateParameter` renvoie `reissuedCount` — mais
**après** l'avoir fait. Douze lignes de lecture suffisaient à le savoir avant. L'écran annonce
maintenant : *« Ce taux figure dans 12 contrats signés. Chacun de ces soignants ne pourra plus
exercer tant qu'il n'aura pas re-signé. »* La case reste — mais elle confirme un **fait chiffré**, et
son libellé le reprend : *« Je confirme suspendre l'exercice de 12 soignants. »* *La différence ne
tient pas à la case, elle tient au texte qui la précède.*

**Le défaut symétrique existe aussi, et il est testé.** Faire hésiter devant un geste sans
conséquence coûte autant que laisser valider à l'aveugle. Un seul paramètre est porté par le contrat
(M03 ne lit que PM-01) : changer un délai, un plafond ou un seuil de double validation ne ré-édite
rien. L'écran le dit — *« ce paramètre n'apparaît pas dans les contrats : le changer ne ré-édite rien
et ne suspend personne »* — et un test vérifie que la case de confirmation **n'apparaît pas**.

**Le compte doit sélectionner exactement ce que l'action ré-édite.** `impactOf` et
`reissueSignedAgreements` filtrent tous deux sur `status: VERIFIED` **et** au moins une version
signée. Un compte plus large annoncerait un dégât supérieur au dégât réel et ferait renoncer à un
changement légitime ; plus étroit, il ferait valider à l'aveugle. Les deux requêtes sont voisines
dans le même fichier, et le test copie la règle pour que l'écart se voie.

**Un différé n'est pas absent — il est activement rejeté, et le code dit pourquoi.** Le serveur
refuse une date d'effet future : *« différé non géré au MVP… pour ne pas mentir sur le contrat »*.
La maquette promettait « un préavis de 30 jours légalement dû » ; offrir un sélecteur de date aurait
donc produit une erreur à chaque usage. **Ce n'est pas une limite qu'on contourne, c'est une décision
qu'on affiche.**

**Deux chantiers, une fonctionnalité.** E3 déclenche l'avenant, C1 le re-signe (chantier 8). Le plan
l'avait prévu et demandait de les enchaîner — c'est fait. Aucun des deux ne se teste seul : il faut
changer PM-01 ici, puis constater dans C1 qu'un soignant vérifié ne peut plus exercer et voit
l'ancien taux à côté du nouveau.

### Étape 6 — le comparatif bloc à bloc de E2

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Supervision financière · 5 demandes à trancher · 685 000 XAF en jeu · *connecté comme Sylvie Ngouabi* » | idem, sans la mention de l'administrateur connecté | conforme. Le nom est déjà dans la barre du haut — le répéter ici prend la place du chiffre qui compte |
| Tuile « **À TRANCHER** 5 · 5 patients attendent une réponse » | portée par l'en-tête | conforme |
| Tuile « **MONTANT EN JEU** 685 k » | idem, additionné sur les demandes **ouvertes** | conforme — c'est ce que l'écran a réellement sous les yeux |
| Tuile « **REMBOURSÉ EN AOÛT** 1,82 M · 24 décisions favorables » | **absente**, et l'absence est expliquée | **écart de fait** — la file sert les 200 dernières demandes, sans découpage mensuel : additionner ce qu'elle renvoie donnerait un total plafonné à 200 sans le dire. **Un montant financier faux est pire qu'un montant absent** |
| Tuile « **ÉCARTS NON INSTRUITS** 3 · −92 250 XAF au total » | **absente** | **écart de fait** — la notion d'écart « instruit » n'existe pas : ni table, ni statut, ni cycle de vie. Il n'y a donc rien à compter |
| Onglets « À trancher · Historique · Réconciliation » | idem, comptés | conforme (« réconciliation » → « rapprochement », le mot français) |
| Bandeau « Un remboursement de plus de **100 000 XAF** exige l'accord de deux administrateurs différents » | idem, le seuil **lu de PM-35** | **la règle était juste, le nombre faux** (PM-35 vaut 50 000). Et l'écran ne décide pas : le serveur pose `PENDING_SECOND_APPROVAL` au dépôt |
| Ligne de demande : référence `RMB-2026-00218`, motif, date, **initiée par Patrick Okemba**, montant, `CSL-2026-04061` | Motif, date, « initiée par vous » / « par un autre administrateur », montant, état | **écarts de fait** — ces deux formats de référence n'existent pas ; et la file ne sert que des **identifiants** d'administrateurs, pas leurs noms. Ce qui change une décision, c'est « est-ce la mienne » — et cela, l'écran le sait |
| Encart « ACCORDS · P. Okemba · il manque 1 accord » | L'état (« Attend un second accord ») | même cause : les noms ne sont pas servis |
| Boutons « Refuser » / « Contresigner » / « Valider » / « Verser » | « Refuser » / « Contresigner » | **simplifié** — le serveur n'a que `approve` et `reject` ; « valider », « contresigner » et « verser » désignaient trois étapes d'un même appel |
| Phrase « Vous avez initié cette demande : un autre administrateur doit la trancher » | **reprise, et les boutons disparaissent** | conforme, et au-delà : la maquette laissait les boutons visibles sous la phrase |
| Onglet **Réconciliation** — « un écart non instruit sous 7 jours est signalé au porteur » | Bouton « Lancer un rapprochement » + son rapport (manquant en base / chez l'agrégateur / montants divergents) | famille 2, point 4 — **trois faussetés en une phrase**, voir ci-dessous |

### Ce que le chantier 13 (E2 — Supervision financière) a appris

**Une phrase peut être juste sur la règle et fausse sur le nombre — et c'est le nombre qu'il ne
fallait pas écrire.** « Plus de 100 000 XAF exige l'accord de deux administrateurs différents » : la
règle est exactement RM-13-06, et la maquette la formule mieux que le cahier. Seul le seuil était
faux. **Mais l'écran n'a aucune raison de le connaître** — c'est le serveur qui pose
`PENDING_SECOND_APPROVAL` au dépôt de la demande, et l'écran ne fait que lire ce statut. Le seuil
n'apparaît donc que dans la phrase d'explication, lue de `GET /admin/parameters`. *Corollaire testé :
sans le paramètre, la phrase perd le nombre et garde la règle. C'est le nombre qui est accessoire.*

**Trois faussetés dans une phrase de treize mots.** « Un écart non instruit sous 7 jours est signalé
au porteur. » (a) Le rapprochement est **quotidien** et l'alerte part **immédiatement**, dans la même
transaction que l'audit : sept jours est ~40 fois plus lent que la réalité, et donne une image molle
d'un mécanisme strict. (b) **La notion d'écart « instruit » n'existe pas** — ni table, ni statut, ni
cycle de vie : rien ne reste à cocher. (c) « Le porteur » n'est destinataire de rien : l'alerte va aux
**administrateurs Finance**, c'est-à-dire à la personne qui lit l'écran. *Une phrase rassurante sur un
mécanisme de contrôle est la plus dangereuse : elle fait croire qu'on a le temps.*

**Une limite technique dite à l'écran plutôt que masquée.** `POST /finance/reconcile` **déclenche** un
rapprochement, il ne relit pas le dernier rapport — aucune table ne le conserve. Le résultat
n'apparaît donc qu'après le clic, et l'écran l'écrit noir sur blanc : *« un écran vide ne veut pas
dire aucun écart »*. Sans cette phrase, un administrateur ouvrant l'onglet un lundi matin conclurait
que tout va bien. *C'est la troisième fois dans ce plan qu'un vide doit être qualifié — « au dépôt du
compte-rendu » en C4, « pas encore gagné » en C6, « aucun rapport conservé » ici.*

**Deux boutons au lieu de quatre.** La maquette propose « Valider », « Contresigner » et « Verser »
selon l'état d'avancement. Le serveur n'a que `approve` et `reject` : les trois verbes décrivaient
des étapes d'un même appel, et donner trois boutons pour une action laisse croire à trois pouvoirs
distincts. **L'écran nomme le geste par ce qu'il fait — contresigner — et écrit ce qu'il déclenche
juste en dessous.**

### Étape 6 — le comparatif bloc à bloc de E7

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Comptes · **1 284 comptes · 2 suspendus, 1 banni** » | « Recherchez le compte concerné · suspension, réactivation, bannissement » | **écart de fait, et il commande tout l'écran** — voir ci-dessous |
| Quatre tuiles : **COMPTES ACTIFS 6 sur 1 284** · SUSPENDUS 2 · BANNIS 1 · CLÔTURÉS 1 | absentes | **écart de fait** — elles supposent un décompte par statut sur toute la table, c'est-à-dire la route que la règle refuse |
| Onglets « Tous · Actifs · Suspendus · Fermés » | absents | même cause : il n'y a pas de liste à filtrer, il y a une recherche |
| *(absent de la maquette)* | Un **champ de recherche**, et la phrase qui dit pourquoi c'est la seule entrée | **ajout** — sans elle, on chercherait indéfiniment l'écran qui liste |
| Tableau, colonne **TITULAIRE** (initiales, nom, `USR-2026-00312`) | Nom + **téléphone** | **écart de fait** — ce format d'identifiant n'existe pas ; le téléphone, lui, identifie sans ambiguïté et le serveur le sert |
| Tableau, colonne **TYPE** | idem, en français | conforme |
| Tableau, colonne **ARRONDISSEMENT** | retirée | **écart de fait** — la recherche ne le sert pas (RM-16-02, données minimales) ; le réclamer ferait une requête par ligne |
| Tableau, colonne **STATUT** + *le motif de la sanction en dessous* | Le statut seul | **écart de fait** — le motif vit dans `AccountSanction`, qu'aucune route ne lit pour un compte donné |
| Tableau, colonne **DERNIÈRE ACTIVITÉ** | retirée | même cause |
| Actions « Suspendre » / « Bannir » / « Réactiver » | idem, **chacune avec son motif obligatoire** et ce qu'elle fait réellement | conforme, et au-delà |
| *(implicite dans la maquette)* « 15 jours · jusqu'au 20/08 » | « La suspension dure **jusqu'à réactivation** » | famille 3, groupe D — `AccountSanction` n'a **aucun champ de durée** |
| « Bannir » présenté comme une action immédiate | « Ceci n'applique pas le bannissement : cela le **demande** » | EF-16-07 — un second administrateur, distinct, doit approuver |
| Pied « 10 comptes affichés · **1 284 au total** » + pagination | absent | il n'y a pas de total à afficher |
| Phrase de bas de page sur ce qu'une sanction laisse intact | **reprise mot pour mot** | conforme — c'est la seule phrase de la maquette qui apprend quelque chose qu'aucun autre écran ne dit |
| *(absentes de la maquette)* | Les **procédures support** : quatre situations en langage clair, étapes à cocher, justification obligatoire, ouvertes en tête | **ajout** — famille 4, point 10 |

### Ce que le chantier 12 (E7 — Comptes) a appris

**Une route qui refuse de répondre est une décision, pas un manque.** `GET /admin/accounts` exige un
terme de recherche : sans lui, il ne renvoie rien. J'ai d'abord lu ça comme une lacune à contourner —
c'est l'inverse. **RM-16-02, « données minimales » :** un administrateur cherche un compte parce
qu'on l'a appelé à son sujet ; il ne feuillette pas l'annuaire des 1 284 inscrits d'une plateforme de
santé. Construire les quatre tuiles aurait demandé un décompte sur toute la table — c'est-à-dire
écrire côté serveur exactement ce que la règle interdit.

L'écran dit donc la règle à voix haute : *« Les comptes ne se parcourent pas : on en cherche un,
parce qu'on a une raison de le chercher. C'est une règle de la plateforme, pas une limite de cet
écran. »* Sans cette phrase, quelqu'un passerait un jour à la « compléter ».

**Un bouton peut nommer autre chose que ce qu'il fait.** « Bannir » ne bannit pas : il **demande** un
bannissement, qu'un second administrateur distinct doit approuver (EF-16-07). Le libellé de la
maquette est celui du geste attendu, pas de l'effet obtenu — et l'écart se paie cher, parce qu'un
administrateur qui croit avoir banni ne relance personne. L'avertissement est donc **avant** le
champ de motif, pas après la validation.

**Troisième type incomplet trouvé dans `api.ts`, même signature.** `AdminAccount` décrivait
`{ id, username }` quand le serveur renvoie `accountId` et `displayName` — et `searchAccounts`
promettait `{ items }` pour un tableau nu. Comme `PrescriptionLineInput` en C7 et `Earnings.entries`
en C6 : **aucun écran ne les appelait, donc le mensonge dormait.** *Il en reste sûrement d'autres du
côté des routes qu'aucun écran n'a encore ouvertes — E2, E4, E5 et E6 en ouvriront.*

**Le moins spectaculaire des onze points de la famille 4 était le seul jamais construit.** Les
procédures support sont une exigence MVP écrite (EF-16-03, CU-16-04), avec quatre routes prêtes
depuis toujours et **aucun écran pour les appeler**. Elles portent une contrainte qu'il fallait dire
en toutes lettres : **M16 guide et journalise, il n'agit pas** (RM-16-01). Ouvrir une procédure
« changement de numéro » ne change aucun numéro — un administrateur qui croirait le contraire
laisserait la personne sans accès, persuadé de l'avoir aidée. La phrase est affichée en permanence,
pas une fois au premier usage.

### Étape 6 — le comparatif bloc à bloc de E1

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « File de vérification · **5 dossiers ouverts · 1 hors délai · tri par urgence** » | idem, les comptes venant de la file réelle · « les plus anciens en tête » | conforme. **« Tri par urgence » précisé** : le serveur trie par ancienneté dans le statut courant, et les dépassements remontent parce qu'ils sont les plus vieux — pas par une règle d'urgence séparée |
| Tuile « **EN ATTENTE** 4 · *Aucun administrateur assigné* » | idem, compté sur `SUBMITTED` | conforme |
| Tuile « **HORS DÉLAI** 1 · *> 72 h · Remontés en tête de file* » | idem, le seuil venant de `targetHours` (PM-11) | conforme — **aucun nombre d'heures n'est écrit dans le fichier** |
| Tuile « **PRIS EN CHARGE** 1 · *Verrouillés par leur examinateur* » | idem, compté sur `IN_REVIEW` | conforme |
| Tuile « **TRANCHÉS** 2 cette semaine · *Décisions inscrites au journal* » | idem, sur sept jours | conforme, **avec une approximation dite** : la date utilisée est celle de dernière mise à jour du dossier, qui pour un dossier décidé est la décision. Indicatif, jamais décisionnel |
| Bandeau « 1 dossier a dépassé le délai de **72 heures ouvrées** » | idem, **sans « ouvrées »** | famille 2, point 3 — `m03.policies` compte des heures pleines et le dit : « les heures ouvrées seront affinées ». Un dossier déposé vendredi soir est en retard **le lundi**, pas le mercredi |
| Onglets « À traiter · Hors délai · Tranchés · Tous » | idem, comptés | conforme. « Tranchés » demande **deux appels** — la route ne filtre que sur un statut |
| Tableau, colonne **DOSSIER** « DOS-2026-00341 · Déposé le 06/08 » | Les huit premiers caractères de l'identifiant + l'ancienneté | **écart de fait** — `DOS-2026-…` n'existe pas : les identifiants sont des UUID |
| Tableau, colonne **DEMANDEUR** (initiales, nom, *métier · quartier*) | Nom + référence du sujet | **écart** — la file ne sert ni le métier ni le quartier ; les réclamer pour décorer un tableau ferait une requête par ligne |
| Tableau, colonne **TYPE** (Soignant / Structure) | idem, depuis `subjectKind` | conforme |
| Tableau, colonne **PIÈCES** « 4 / 4 » | « 4 pièces » | **écart de fait** — le total exigé dépend du type de sujet et **n'est pas servi par la file**. Le recopier ici dupliquerait une règle que le serveur seul applique — exactement la dette corrigée en C1 le 23/08 |
| Tableau, colonne **STATUT** | idem, avec les **deux seuils** distincts (EF-03-03) : cible dépassée, puis escalade | conforme, et au-delà |
| Tableau, colonne **DÉLAI** « − 26 h *hors délai* » / « 4 h *sur 72 h* » | idem, calculé sur `waitingSince` et `targetHours` | conforme |
| Action « Examiner » / « Poursuivre » | idem, plus « Revoir » sur un dossier déjà tranché | conforme |
| Pied « 5 dossiers sur 7 · tri par délai restant » + pagination | « N dossiers affichés · triés du plus ancien au plus récent » | **écart** — la file n'est pas paginée côté serveur, et annoncer « sur 7 » supposerait un total qu'elle ne donne pas |
| *(la maquette ouvre l'examen ailleurs)* | Le dossier s'ouvre **en panneau**, la file restant derrière | conforme à l'usage : l'examen demande de la place, la file doit rester visible |

### Ce que le chantier 11 (E1 — File de vérification) a appris

**Deuxième fois qu'une colonne étroite tenait la place d'un tableau.** Comme C4, cet écran empilait
des fiches dans un rail de 320 px là où la maquette montre un tableau pleine largeur. Et comme en C4,
la différence n'est pas esthétique : une file de vérification se travaille en **comparant des
délais**. « − 26 h » à côté de « 2 j 21 h » se lit d'un coup d'œil dans un tableau ; empilé dans une
colonne, chaque dossier redevient un cas isolé et la hiérarchie d'urgence disparaît — celle-là même
que les quatre tuiles annoncent en haut.

**Ce qui était juste n'a pas été touché.** Le composant d'examen — pièces ouvrables, checklist
locale, décision motivée, journal — était conforme et bien argumenté. Seule la coquille a été
refaite. *Troisième chantier de suite où la question n'est pas « que réécrire » mais « que
comparer » : B3 n'a rien eu à changer sur son texte le plus dangereux, E1 n'a rien à changer sur son
cœur.*

**Un total qu'on ne sert pas ne s'invente pas.** La maquette écrit « 4 / 4 » pièces. Le
dénominateur dépend du type de sujet, et la file ne le renvoie pas — le recopier côté client aurait
recréé exactement la dette corrigée en C1 le 23/08, où la liste des pièces obligatoires était
dupliquée dans l'écran. **Deux vérités pour une même règle finissent toujours par diverger, et c'est
l'écran qui ment.** L'écran dit donc « 4 pièces », qui est vrai sans dénominateur.

**Une approximation dite vaut mieux qu'un chiffre absent.** « Tranchés cette semaine » repose sur la
date de dernière mise à jour du dossier, qui pour un dossier décidé est celle de la décision — sauf
si autre chose l'a touché depuis. Le compte est donc indicatif, et le commentaire le dit. Il sert à
un administrateur qui veut voir son travail de la semaine, jamais à une décision. *Le renoncement
n'était pas la seule option : entre inventer et se taire, il y a mesurer et prévenir.*

**Un panneau ouvert masque la page aux tests.** Radix pose `aria-hidden` sur tout ce qui n'est pas le
panneau : neuf tests ont cessé de trouver le tableau alors qu'il était bien là. Le monteur attend
désormais le panneau quand l'URL en désigne un, et le tableau sinon. *Même famille de piège que le
`pointer-events: none` du chantier 4 — un symptôme qui accuse le code, alors qu'il décrit le harnais.*

### Étape 6 — le comparatif bloc à bloc de B3

*Maquette servie sur `http://localhost:8123`, quatre onglets relus contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| Quatre onglets : Préférences · Sécurité du compte · Sessions & appareils · Langue & mentions légales | idem, même ordre, mêmes intitulés | conforme |
| « Ces réglages **suivent votre compte, quel que soit le poste utilisé** » | Deux cartes séparées : « restent sur cet appareil » pour l'affichage, « suivent votre compte » pour les notifications | **écart de fait** — le thème, la page d'accueil, les sons et la densité n'ont aucune table serveur. Sur un poste d'officine partagé, promettre le contraire trompe |
| Réglage **Thème** (Clair / Sombre / Système) | idem | conforme |
| Réglage **Densité** (Confort / Compact) — *« Compact rapproche les lignes des tableaux et des listes »* | idem, **et il le fait vraiment** : `html[data-densite="compact"]` resserre les cellules de tableau et les lignes de liste | **manquait, ajouté** |
| Réglage **Page d'accueil** (Automatique / …) | idem, limité aux pages réellement accessibles au rôle | conforme, et corrigé : proposer « Mes gains » à une officine mènerait à une redirection |
| Réglage **Sons de l'interface** | idem | conforme |
| Réglage **Notifications par email** — *« Résumé quotidien des demandes reçues et des versements »* | Les **cinq catégories** de M14, dont « Alertes vitales » qui ne se coupe pas (RM-14-02) | **écart de fait** — aucun résumé quotidien n'existe ; ce que le serveur sait faire, c'est couper par catégorie |
| Bouton « **Enregistrer** » | absent : tout s'applique immédiatement | conforme au fonctionnement réel — l'aperçu EST le résultat |
| **Langue de l'interface** : Français / **English** | Français seul, et la raison écrite | famille 3, groupe B — aucune chaîne n'est externalisée : le bouton « English » n'aurait rien traduit |
| **Mentions légales** : CGU et confidentialité, *« Version 1.0 · acceptée le 12 mars 2026 »* | idem, la version et la date **lues en base** (`ConsentRecord`) | conforme — un texte figé dirait la version d'aujourd'hui, pas celle acceptée |
| Texte de confidentialité : *« hébergées au **Congo-Brazzaville** »* | « hébergées sur des serveurs situés en **Allemagne** (Francfort, Union européenne) » | **corrigé le 24/08, vérifié aujourd'hui** — voir ci-dessous |
| **À propos** : Application · Dernière synchronisation · Identifiant `USR-2026-00312` | Application · **Pays de service** · **Hébergement des données** · Support · Identifiant réel (8 caractères) | **écarts** — « dernière synchronisation » n'a aucun référent (rien ne se synchronise, tout est interrogé à la demande) ; `USR-2026-…` n'existe pas, les identifiants sont des UUID |

### Ce que le chantier 10 (B3 — Mes paramètres) a appris

**Le piège annoncé n'a pas eu lieu, et c'est la méthode qui l'a évité.** Le plan avertissait en gras :
*« B3 porte la phrase d'hébergement. Elle reviendra toute seule si B3 est reconstruit depuis la
maquette. »* Elle n'est pas revenue — parce que B3 n'a pas été reconstruit, il a été **relu**. La
différence est tout le chantier : sur C4 et C6, la forme était si loin de la maquette qu'il fallait
réécrire ; ici elle était juste, et réécrire aurait ramené le mensonge avec le reste. *Un chantier ne
consiste pas à retaper un écran — il consiste à le comparer.*

**Un réglage n'entre que s'il fait quelque chose.** La densité manquait depuis toujours. Elle a été
ajoutée avec sa règle CSS réelle — l'attribut sur `<html>`, comme le thème, et deux règles qui
resserrent les cellules de tableau et les lignes de liste. Rien de plus : ni taille de texte, ni
marges. **C'est la règle inverse de celle qui a fait retirer le sélecteur de langue**, et c'est la
même règle : un interrupteur qui ne change rien est pire qu'un interrupteur absent, parce qu'on lui
fait confiance. Le test ne vérifie pas l'apparence, il vérifie que l'attribut est posé — c'est-à-dire
que la promesse a un effet.

**Deux lignes voisines valent mieux qu'une longue phrase.** « Pays de service : Congo-Brazzaville »
seul laissait croire que l'hébergement suivait. La ligne « Hébergement des données : Francfort,
Allemagne » est posée **juste en dessous**, exprès : c'est le raccourci mental de la maquette, pas
une négligence de rédaction, et il se corrige par la mise en page autant que par les mots.

**⚠️ Dette écrite, décision au porteur : `support@ulamu.cg` n'existe pas.** Le domaine n'appartient
pas au projet — l'application vit sur `onrender.com`, et les courriels partent d'une adresse
d'expéditeur vérifiée chez Brevo. Une adresse morte sur des mentions légales acceptées à
l'inscription expose autant qu'un fait faux : **c'est la même famille d'erreur que le
« hébergées au Congo-Brazzaville »**. Elle est désormais à UN seul endroit
(`src/config/contact.config.ts`), lue par C1 et B3, avec les deux issues écrites : acquérir un
domaine et y relever une boîte, ou afficher l'adresse réellement relevée. **Une ligne à changer le
jour où c'est tranché.**

### Étape 6 — le comparatif bloc à bloc de B2

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Tableau de bord · Lundi 10 août 2026 · **4 demandes attendent une réponse** » | idem, le compte venant des poignées réelles — et **rien** quand il n'y en a pas | conforme. La maquette a raison de le mettre là : c'est la seule chose de l'écran qui appelle un geste dans l'heure |
| Tuile « **DEMANDES EN ATTENTE** 4 · *2 expirent dans moins de 2 h* · **+1 depuis hier** » | idem pour les deux premières lignes | **la tendance part** — aucune série quotidienne n'existe, et `myHandshakes` ne sert que les cent dernières : une comparaison à hier serait fausse dès la 101ᵉ |
| Tuile « **CONSULTATIONS DU JOUR** 6 · *2 en téléconsultation* · **+2 vs hier** » | « Consultations du **mois** » + *« +4 par rapport au mois dernier »* | **deux écarts** — le serveur compte au mois ; « en téléconsultation » suppose un autre mode, il n'y en a pas. **Mais la tendance, elle, est devenue vraie** : `lastSixMonths` la porte |
| Tuile « **GAINS DU MOIS** 486 500 · *XAF · **versés le 5 septembre*** · **+12 % vs juillet** » | « Gains du mois » + *« XAF · N retirables · +N XAF vs le mois dernier »* | **la date de versement part** (famille 1, point 2 : aucun versement mensuel n'existe) ; **la tendance devient vraie**, en valeur absolue plutôt qu'en pourcentage — un pourcentage sur un mois à zéro ne veut rien dire |
| Tuile « **TAUX DE RÉPONSE** 92 % · *Sur les 30 derniers jours* · **−3 pts** » | « Taux de confirmation » + *« Note N/5 · visible des patients »* | **deux écarts de fait** — ce taux est un cumul depuis l'ouverture du compte, pas une fenêtre de 30 jours ; et aucune série n'existe pour la variation. Ce qui est ajouté à la place est ce qui compte : **les patients le voient** |
| Graphique « Consultations honorées · Mars – août » | idem, six barres, plus un tableau lisible aux lecteurs d'écran | conforme |
| Bloc « **Répartition du mois** : Téléconsultations 38 · En cabinet 41 · Refusées 6 · Expirées 7 » | « **Ce que deviennent vos demandes** » : menées jusqu'à la consultation · refusées avec motif · expirées sans réponse | **écart de fait** — les deux premières lignes n'ont aucun référent ; les deux dernières sont vraies et gardées |
| Phrase « Une demande refusée avec motif n'entre pas dans le calcul des gains » | « Une demande laissée expirer compte comme une non-réponse dans le taux affiché aux patients. Un refus motivé, non. » | conforme sur le fond, **plus utile** : la maquette dit ce qui ne se passe pas, l'écran dit ce que ça coûte (famille 3, groupe E) |
| Tableau « Demandes en attente · **compte à rebours de 12 h** » | idem, **sans aucun délai écrit** : le reste vient de `windowRemainingSeconds` | famille 2 — même règle que C3 |
| Colonne **PATIENT** « PB · Patient · PAT-8821-BZV » | Prénom et âge — la fiche anonymisée | **écart de fait** — `PAT-8821-BZV` n'existe pas ; EF-06-01 autorise prénom et âge, « pas plus avant paiement » |
| Colonne **MOTIF** « Palpitations nocturnes » | L'**offre demandée** (libellé + durée) | **donnée interdite, pas donnée manquante** — le motif vit dans la pré-consultation, qui se remplit APRÈS le paiement (EF-06-04) |
| Colonnes **STATUT** et **EXPIRE DANS** | idem, le temps restant passant en rouge sous deux heures | conforme |
| Bouton d'export | absent | famille 3, groupe D |

### Ce que le chantier 9 (B2 — Tableau de bord) a appris

**Une donnée qui manquait hier peut exister aujourd'hui.** L'en-tête de cet écran portait, depuis le
20/08, un avertissement : « l'API ne calcule RIEN de tout cela, aucune comparaison historique
n'existe nulle part ». C'était vrai le 20 — et faux depuis le 24, date à laquelle `lastSixMonths` a
été ajouté pour le graphique. **Deux des quatre tendances étaient calculables depuis une semaine, et
l'écran continuait de dire qu'aucune ne l'était.** Personne ne relit un commentaire qui explique une
absence : on le croit sur parole. *À faire pour chaque écran restant : relire ses renoncements, pas
seulement son code — un renoncement documenté vieillit aussi mal qu'un chiffre en dur.*

**Une tendance se dit en valeur, pas en pourcentage.** La maquette écrit « +12 % vs juillet ». Sur un
mois à zéro — le cas de tout soignant qui démarre — un pourcentage n'existe pas, et « +100 % » depuis
une consultation serait grotesque. L'écran affiche donc « +4 » et « +12 500 XAF », qui restent
justes dans tous les cas, y compris le premier mois où ils ne s'affichent simplement pas.

**Le contraire d'une donnée interdite, c'est une donnée utile — pas rien.** La colonne « MOTIF »
affichait « Palpitations nocturnes » avant tout paiement : le motif n'existe pas encore, la
pré-consultation se remplit après (EF-06-04). Mais la remplacer par du vide aurait appauvri la
décision. Elle porte désormais **l'offre demandée** — durée et intitulé — qui est exactement ce sur
quoi le professionnel décide. *Même mouvement qu'en C3 : « donnée interdite, pas donnée manquante ».*

**Un commentaire de test peut mentir aussi.** Le fabricant de poignées de main disait « le tableau de
bord ne l'affiche PAS, il ne fait que compter » à propos de la fiche anonymisée — vrai à l'écriture,
faux depuis que le serveur sert prénom et âge. Le test qui verrouillait « aucune identité » a été
réécrit pour verrouiller la vraie règle : **prénom et âge, et rien de plus.** Ce n'est pas la même
chose, et la différence est exactement ce qu'EF-06-01 autorise.

### Étape 6 — le comparatif bloc à bloc de C1

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Ma vérification · Complétez votre dossier pour accéder aux consultations » | idem, l'aide variant selon les sept états réels du dossier | conforme |
| Frise « Étape 1 sur 4 » : Dossier constitué · Vérification · Contrat signé · Vitrine active | Frise à quatre étapes, position calculée depuis l'état du dossier | conforme |
| Bloc « Pièces justificatives · 2 / 4 » avec état PAR PIÈCE (« Validée », « À corriger ») | Un état par pièce limité à ce qui est vrai — **déposée** ou **attendue** — et le motif de l'administration dans son propre bloc | **écart de fait, déjà tranché** — `VerificationDecision` n'a aucun lien vers une pièce : le serveur ne connaît que la décision au niveau du dossier |
| Pièce « **Assurance responsabilité civile** », facultative | absente | **écart de fait** — aucun type de pièce correspondant n'existe au modèle |
| *(absente de la maquette)* | La **photo d'identité**, que le serveur exige pour déposer | **ajout** — sans elle le dépôt serait refusé sans que l'écran sache dire pourquoi |
| Bloc « Contrat de partenariat · **Commission de 12 %** · **versement le 5 de chaque mois** » | « Commission de {taux du contrat} % · vos gains sont retirables à tout moment, sans montant minimum » | **deux écarts de fait** — le taux vient du contrat signé de ce soignant-là (RM-13-07), pas d'un paramètre global ; et aucun versement mensuel n'existe (famille 1, points 1 et 2) |
| « Lire le contrat » | idem, et le texte servi est celui que le serveur **régénère puis recompare à son sceau** : s'ils divergent, il n'est pas affiché | conforme, et au-delà |
| Signature : le nom saisi suffit | Nom **+ mot de passe + code reçu** (EF-03-06) | **écart de fait** — ce contrat engage juridiquement ; un nom que n'importe qui saurait taper ne prouve rien |
| *(absent de la maquette)* | Le **parcours d'avenant** : bandeau de conséquence, ancien taux barré face au nouveau, bouton « Re-signer et reprendre mon activité » | **ajout** — famille 4, point 11. C'est la situation où un soignant perd son droit d'exercer sans avoir rien fait |
| Bloc « Délai de traitement — dossier non déposé » | idem, la valeur venant de PM-11 | conforme |
| Chronologie « Pièce déposée · Diplôme déposé · Compte créé » | Les décisions réelles du dossier, les trois plus récentes | **écart** — le serveur n'horodate pas « compte créé » dans cette vue ; ce qu'il porte, ce sont les décisions |
| Bloc « Ce que la vérification autorise » (4 lignes) | idem, reformulé sur ce que le serveur autorise vraiment | conforme |
| Bloc « **Une question sur votre dossier ? · Réponse sous 24 heures ouvrées, du lundi au vendredi** » | « **Ce qui se passe maintenant · Rien n'est attendu de vous** » : la file est traitée du plus ancien au plus récent, notification à la décision, et l'aveu qu'ULAMU n'a pas de messagerie interne | **trois faussetés en une phrase** — voir ci-dessous |
| Bouton « Écrire à l'administration » | conservé (courriel) | conforme |

### Ce que le chantier 8 (C1 — Ma vérification) a appris

**Une phrase de quinze mots portait trois faussetés.** « L'administration ULAMU répond sous 24 heures
ouvrées, du lundi au vendredi. » (a) Aucune messagerie support n'existe — ni module, ni route, ni
écran : elle promettait un délai de réponse **sans qu'aucun bouton ne permette de poser la
question**. (b) « Ouvrées » n'existe nulle part : le serveur compte des heures pleines, et un dossier
déposé vendredi soir est en retard **le lundi**, pas le mercredi. (c) Le délai lui-même n'est pas
24 h mais PM-11 — affiché juste au-dessus, lu du serveur, et qui vaut 72. *Une phrase rassurante est
la plus difficile à retirer, parce que la retirer donne l'impression d'enlever quelque chose. Ce
qu'elle enlevait, c'était la confiance à la première question sans réponse.*

**Mon propre test a trouvé un trou dans mon implémentation.** J'avais écrit que `lastSigned` doit
valoir `null` quand la version courante est signée — puis codé une règle qui ne l'excluait pas. Le
test l'a attrapé au premier passage : un contrat parfaitement en règle aurait affiché « ce que vous
aviez signé : 10 % » face à « ce qu'on vous propose : 12 % », c'est-à-dire une signature attendue
alors que tout allait bien. **J'ai corrigé le serveur, pas le test.** *Écrire le contrat en toutes
lettres AVANT de coder la règle est ce qui a rendu l'écart visible.*

**Un écran peut annoncer une perte de droit que personne n'a provoquée.** Quand l'administration
change le taux, le soignant ne peut plus exercer — il n'apparaît plus dans l'annuaire et ne reçoit
plus aucune demande — sans avoir rien fait ni rien reçu d'autre qu'une notification. Le bandeau dit
donc la **conséquence** avant la cause : « votre contrat a été modifié » ne signifie rien à qui ne
connaît pas la règle. *Troisième fois dans ce plan qu'un message doit être retourné pour dire d'abord
ce que ça coûte : l'avertissement de remboursement en C5, l'argent gelé en C4, la perte d'exercice ici.*

**Une dette repérée en passant, non traitée :** `support@ulamu.cg` est affiché comme adresse de
contact (ici et dans B3), sur un domaine que le projet ne possède pas — l'application vit sur
`onrender.com`. Ce n'est pas du ressort de ce chantier : **à trancher avec B3 (chantier 10)**, soit
en acquérant le domaine, soit en affichant une adresse qui existe.

### Étape 6 — le comparatif bloc à bloc de C6

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| Sous-titre « **Prochain versement le 5 septembre 2026** · commission ULAMU de **12 %** » | « Retirables à tout moment · la commission est déjà déduite de chaque montant » | **deux écarts de fait** — aucune tâche planifiée n'existe côté serveur (ni cron, ni lot) : le versement mensuel n'était qu'un décor. Et le taux dépend du contrat signé de chacun (RM-13-07) : il ne peut pas être écrit |
| Tuile « **DISPONIBLE AU RETRAIT** · Retirable à tout moment · **500 XAF de frais opérateur** » | idem, sous-titre « À tout moment, sans minimum » | **écart de fait** — les frais ULAMU valent PM-02 (0 %) et sont annoncés dans le récapitulatif ; les frais de l'opérateur seront ceux de l'agrégateur retenu, qui n'est pas choisi (ADR-09). Écrire 500 XAF serait inventer un barème |
| Tuile « **ENCAISSÉ CE MOIS** · 38 consultations honorées · **+12 % vs juillet** » | « Ce mois-ci » + le nombre de consultations créditées | **écart** — la comparaison au mois précédent suppose un historique complet ; le journal en sert cinquante lignes |
| Tuile « **EN ATTENTE DE CLÔTURE** · 1 compte-rendu à signer · Débloqué à la signature » | idem, le compte venant des séances réelles, **plus l'avertissement D-008** | conforme, et au-delà (famille 4, point 9) |
| Graphique « Honoraires nets encaissés · Mars – août » avec bascule Semaine / Mois | Histogramme des six derniers mois, barres en CSS | conforme — **la bascule « Semaine » est retirée** : le journal ne sert que cinquante mouvements, un découpage hebdomadaire sur six mois serait faux la plupart du temps. La limite est dite quand elle est atteinte |
| Bloc « **Décompte du mois** » : bruts, commission **12 %**, frais opérateur, net | idem, **sans aucun taux écrit** : le brut et la commission sont additionnés depuis ce que le serveur a réellement prélevé | conforme sur la forme, corrigé sur le fond. La ligne « frais opérateur » disparaît — voir la tuile 1 |
| Onglets « Tous · Honoraires · Versements » | « Tous · Honoraires · Retraits », comptés | conforme (« versement » → « retrait », le mot du cahier) |
| Tableau, colonne **DATE** | idem | conforme |
| Tableau, colonne **MOUVEMENT** (type + référence `CSL-2026-04120`) | Type en français ; **pas de référence** | **écart** — ce format n'existe pas au modèle, et une référence opaque n'apprendrait rien |
| Tableau, colonne **CANAL** : « Téléconsultation » / « Cabinet · Bacongo » | retirée | **écart de fait** — la messagerie est le seul portail, et un médecin n'est rattachable à aucun cabinet. Elle ne disait quelque chose que pour un retrait : l'opérateur, affiché dans le bloc des retraits |
| Tableau, colonne **STATUT** | Pastille par type de mouvement, et l'état réel pour les retraits | conforme |
| Tableau, colonne **MONTANT NET** + « brut 12 500 » | idem, **plus la commission et son pourcentage déduit** | conforme, et au-delà — c'est S2 |
| Ligne « **Versement mensuel** VER-2026-0884 » | n'existe pas | voir le sous-titre |
| Bloc « **Compte de versement** · Vérifié · Changer de compte » | « Où part l'argent » : le numéro du compte ULAMU, et le renvoi vers Mes paramètres | **écart de fait** — aucun modèle de compte de versement n'existe ; le retrait part sur le téléphone du compte. Le plus trompeur des six écarts de la famille 1 : croire à un compte séparé, c'est ignorer que son numéro personnel est engagé |
| Bouton « Confirmer le retrait » (un temps) | Récapitulatif — montant, frais, **délai** — puis mot de passe **et** code reçu | EF-13-07 : deux temps, pas un |
| Bouton « Relevé » (export) | retiré | famille 3, groupe D |

### Ce que le chantier 7 (C6 — Mes gains) a appris

**La suite de tests appelait la vraie API de production.** `VITE_API_URL` pointe sur
`https://ulamu-api.onrender.com` — il n'y a pas d'API locale, par choix assumé. Conséquence jamais
vue jusqu'ici : **toute méthode d'`api` qu'un test oubliait de doubler partait pour de bon**. Un test
de C6 le faisait ; l'appel revenait en 401, `onUnauthorized` déconnectait la session, et comme la
réponse mettait deux secondes à revenir, c'est le test SUIVANT qui se retrouvait déconnecté en plein
milieu, bloqué sur un écran de chargement. Le message d'échec accusait un bouton parfaitement
correct — j'ai cherché trois fois au mauvais endroit avant de journaliser l'état du magasin de session.

**La seconde raison de fermer cette porte est plus grave que la première :** des tests qui appellent
la production peuvent aussi y **écrire**. Un `POST` oublié aurait suffi. `fetch` est désormais coupé
dans `src/test/setup.ts`, avec un message qui nomme l'URL manquante. Les 239 tests passent sans
réseau — preuve qu'aucun n'en dépendait, et que le risque était pur.

*C'est probablement l'explication de la dette du §10 : « la suite web est instable sur cette
machine, deux exécutions sur cinq s'arrêtent ». Le réseau y était pour quelque chose.*

**Un pourcentage ne s'écrit pas, il se déduit.** Le « 12 % » des maquettes n'était pas seulement
faux (PM-01 vaut 10) : le principe l'était. Le taux appliqué à un paiement est celui du contrat
signé de CE bénéficiaire-là (RM-13-07) — deux médecins peuvent avoir deux taux le même jour, et un
même médecin deux taux à deux mois d'écart si son contrat a été ré-édité. L'écran affiche donc un
pourcentage **calculé sur les deux montants servis**, ligne par ligne. Il est juste par construction,
quelle que soit la valeur du paramètre.

**`null` et `0` ne disent pas la même chose.** Un mouvement sans part de paiement retrouvée n'a pas
une commission nulle : on ne sait rien de lui. `0` aurait affiché « commission 0 (0 %) », ce qui est
une affirmation. Et quand une ligne du mois manque de son détail, le décompte l'avoue au lieu de
sous-estimer le brut en silence.

**Deux écrans de suite, la même leçon sur les totaux.** C4 refuse d'afficher « 0 XAF » pour une
consultation pas encore capturée ; C6 refuse d'afficher « 0 » pour un détail introuvable. *Un zéro
est une mesure, pas un remplissage.*

### Étape 6 — le comparatif bloc à bloc de C4

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête « Consultations · 6 consultations · 3 comptes-rendus signés » | idem, compté sur les vraies données | conforme |
| Tuile « **CE MOIS-CI** 24 · *18 en téléconsultation* » | « Ce mois-ci » + *N terminées* | **écart de fait** — « en téléconsultation » suppose un autre mode. Il n'y en a pas : la messagerie est le seul portail (groupe B), et un médecin n'est rattachable à aucun cabinet (groupe A) |
| Tuile « **À SIGNER** 2 · *Délai réglementaire de 48 h* » | « À signer » + *« Le plus urgent : 4 h 29 min »*, calculé sur l'échéance la plus proche | **écart de fait** — PM-30 vaut 24 h, et surtout aucun délai n'est écrit : la tuile lit `reportDueAt` |
| Tuile « **HONORAIRES DU MOIS** 486 500 · *XAF net après commission* » | idem, **somme des mouvements `CREDIT` du journal des gains** pour les séances du mois | conforme, et exact — c'est le montant réellement crédité, pas un produit prix × séances |
| Onglets comptés « Toutes 6 · À rédiger 2 · Signées 3 » | « Toutes · À signer · Signées », comptés | conforme (« à rédiger » → « à signer », le mot du cahier) |
| Tableau, colonne **DATE** (jour + heure) | idem | conforme |
| Tableau, colonne **PATIENT** : initiales, motif, référence `CSL-2026-04120` | Colonne « **Consultation** » : référence réelle (8 caractères), « pour un proche » si `subProfileId`, pastille d'état | **écart de fait** — le registre ne charge aucune identité et n'a pas à en réclamer une ; le motif vit dans la pré-consultation, que seule la séance ouverte porte ; `CSL-2026-…` n'existe pas au modèle |
| Tableau, colonne **MODE** : « Téléconsultation » / « En cabinet · Bacongo » | Colonne « **Durée** » : `durationMin` | **remplacement** — voir la tuile 1. La durée existe, le mode non |
| Tableau, colonne **COMPTE-RENDU** : « signé » / « à rédiger » / « annulée » | idem, plus le **décompte** quand il manque, et « Sans objet » sur une séance remboursée | conforme, et au-delà |
| Tableau, colonne **ORDONNANCE** : `ORD-2026-00412` ou `—` | **État** de l'ordonnance (active / expirée / annulée) + nombre de lignes | **écart de fait** — ce format de référence n'existe pas ; l'état, lui, est ce que le médecin peut savoir (groupe C) |
| Tableau, colonne **HONORAIRES** : `12 500 XAF` | Le montant **crédité**, ou « Au dépôt du compte-rendu », ou « Remboursé au patient » | conforme, et plus honnête : sans compte-rendu il n'y a pas d'argent, et l'écran ne montre pas zéro |
| Action de fin de ligne « Ouvrir » / « Rédiger » | « Ouvrir » / « Déposer » | conforme |
| Pied « 1–6 sur 6 consultations » | « N consultations », ou « N sur M » quand un filtre est actif — plus, **à cent lignes**, l'aveu que le serveur n'en renvoie pas davantage | conforme, et une limite dite |
| *(absent de la maquette)* | Une phrase sur la **proposition de suivi** automatique | **ajout** — famille 4, point 8 |
| Boutons « Exporter » / « Télécharger le PDF » | retirés | famille 3, groupe D |

### Ce que le chantier 6 (C4 — le registre) a appris

**La forme d'un registre n'est pas décorative.** L'écran empilait des cartes ; la maquette montre un
tableau. La différence n'est pas esthétique : dans un tableau on compare des lignes du regard — la
consultation qui n'a pas rapporté à côté de celle qui a rapporté, celle dont le délai court à côté
de celle qui est signée. En cartes empilées, chaque consultation est un objet isolé et la
comparaison n'existe plus. *C'est la troisième fois qu'un écart de forme s'avère être un écart de
fond : les onglets de C3, la colonne de C2, le tableau de C4.*

**Un neuvième ajout serveur, et le plan l'avait prédit.** `orderRef` manquait aux lignes du registre.
Sans lui, la colonne « honoraires » n'avait que deux issues, toutes deux mauvaises : écrire un prix
dans la page, ou n'afficher aucun montant. **Deux lignes.** C'est le même motif que S7 (PM-27
servi au seul patient) et S8 (les bornes d'offre vérifiées mais jamais renvoyées) : *le serveur sait,
l'écran ne peut pas demander.* Il en reste sûrement.

**Pas de test pour S9, et c'est délibéré.** S1, S7 et S8 en ont reçu parce qu'ils portaient une
RÈGLE — une addition de dates, un plafond, des bornes. `orderRef` est une recopie de champ : un test
qui vérifie qu'un champ est copié ne teste que lui-même. Ce qui est testé, en revanche, c'est ce que
l'écran en fait — la jointure au journal, le remboursement qui annule son crédit, le retrait qui ne
compte pas comme une consultation.

**« Zéro » et « pas encore » ne sont pas la même chose.** Une consultation sans compte-rendu n'a
aucun mouvement au journal. Afficher `0 XAF` aurait été faux : l'argent n'est pas perdu, il n'est pas
encore gagné — la capture attend le dépôt (RM-06-04). L'écran écrit donc « Au dépôt du compte-rendu »,
ce qui est à la fois le montant manquant et sa raison.

### Étape 6 — C7 n'a pas de maquette : le comparatif se fait contre le cahier

*Aucun `.dc.html` n'existe pour cet écran. Le comparatif porte donc sur les exigences M09, une par
une, et sur l'écran mobile `OrdonnanceScreen.tsx`, qui montre le même objet côté patient.*

| Exigence | Ce qui est construit | Verdict |
|---|---|---|
| **EF-09-01 / RM-09-01 / D-014** — on ne prescrit que depuis une séance ACTIVE | Le panneau s'ouvre depuis le rail de C5. Séance close : la rédaction disparaît, l'ordonnance déjà scellée reste consultable | conforme |
| **EF-09-02** — ligne référentielle **ou** texte libre, exclusives | Recherche au référentiel (2 caractères minimum, dit à l'écran) ; « Prescrire hors référentiel » bascule la ligne | conforme |
| **EF-09-02** — le texte libre n'a **aucun** garde-fou | Mention rouge **sur la ligne elle-même**, pas seulement en tête de panneau : c'est là que le médecin décide | conforme |
| **EF-09-03** — alerte **bloquante**, passage outre **motivé** | Le 409 devient une étape : le médicament et l'allergie sont nommés, deux issues offertes (retirer / motiver). Le scellement reste hors service tant qu'un conflit n'est pas tranché | conforme |
| **EF-09-03** — chaque passage outre est **tracé** | L'écran le dit sous le champ de motif : « enregistré au journal, avec le nom du médicament et celui de l'allergie » | conforme |
| **EF-09-04 / RM-09-05** — le scellement est **définitif** | Avertissement placé **avant** le bouton, vérifié par un test qui compare leur position dans le document | conforme |
| **CU-09-04** — annulation par le seul prescripteur, motif obligatoire | Bouton d'annulation, motif exigé, QR rendu inerte — et l'écran dit que c'est la seule issue après une erreur | conforme |
| **PM-10** — durée de validité | `expiresAt` affiché tel que le serveur l'envoie. **Aucune durée écrite dans le fichier** | conforme |
| **RM-09-02** — le QR n'est présenté qu'au patient | Le QR est affiché au médecin *pour vérification*, et l'écran précise qu'il n'a rien à transmettre : le patient l'a dans son application | **écart mineur, assumé** — sans lui, le médecin ne peut pas constater que l'ordonnance est bien scellée. Le jeton n'est pas transmissible depuis cet écran |
| **EF-09-05** — hachage du contenu | Calculé et scellé côté serveur, invisible ici | hors écran, à dessein |
| Parité mobile (`OrdonnanceScreen.tsx`) | Le mobile montre l'ordonnance **reçue** ; C7 la **rédige**. Les deux affichent le même QR, la même échéance, les mêmes lignes | cohérent |

### Ce que le chantier 5 (C7 — Ordonnance) a appris

**« Poussé » ne veut pas dire « en base ».** Render exécute `prisma migrate deploy && node …` — jamais
le seed. Les 58 médicaments manquants auraient été poussés sur GitHub, déployés, et le référentiel
serait resté à six entrées : l'écran aurait cherché dans le vide et paru cassé. Et le seed ne pouvait
pas être relancé non plus : **il recrée les comptes de démonstration que le porteur a supprimés le
28/08**. D'où un script dédié, qui ne touche que la table des médicaments. *À retenir pour tout
chantier qui a besoin de données : vérifier par quel chemin elles arrivent réellement en base.*

**Le garde-fou allergies était aveugle à son propre cas d'école.** La comparaison se fait par
ressemblance de noms entre l'allergie déclarée et les libellés du médicament. Or l'allergie la plus
courante se déclare « pénicilline » — un nom de **classe** que ne porte aucune DCI : ni Amoxicilline,
ni Cloxacilline, ni Augmentin ne contiennent ce mot. Une allergie à la pénicilline ne déclenchait
donc **rien** sur l'Amoxicilline. Le modèle n'a pas de champ « classe thérapeutique » et en ajouter un
serait une migration ; l'étiquette est donc logée dans `commercialNames`, seul champ que la
comparaison regarde, et le script l'ajoute aux entrées déjà en base sans jamais rien retirer.
*Trouvé en construisant l'écran, pas en lisant le cahier — le cahier décrivait la règle, pas ce
qu'elle attrape.*

**Un type incomplet ment sans conséquence tant que personne ne l'appelle.**
`PrescriptionLineInput` n'avait pas `qtyPrescribed`, que le serveur exige avec un minimum de 1. Aucun
écran ne créait d'ordonnance : le mensonge dormait. Le premier appel aurait échoué en 400, avant même
d'atteindre le garde-fou. *C'est exactement la façon dont ces dettes survivent — et il en reste
sûrement d'autres dans `api.ts`, du côté des routes qu'aucun écran n'appelle encore.*

**Un test qui échoue peut accuser le mauvais coupable.** Deux tests du fil de C5 se sont mis à
échouer sur « menu introuvable » — alors que le menu allait très bien. La vraie cause : le rail de C5
monte désormais le panneau d'ordonnance, qui lit les ordonnances prescrites ; l'appel n'était pas
doublé, il partait pour de vrai sur le réseau, et le test épuisait son propre budget de cinq
secondes. *Quand un écran gagne un composant, les tests des écrans qui l'hébergent gagnent une
dépendance.*

**Le délai d'attente de `findBy*` passe à 2,5 s** (`src/test/setup.ts`). Une seconde ne suffit pas à
cette machine pour monter un portail Radix, et le message d'échec accusait alors un élément
parfaitement correct. Pas 5 s : c'est le budget d'un test entier, et à égalité c'est le test qui
expire le premier — en perdant l'information de QUEL élément manquait.

### Étape 6 — le comparatif bloc à bloc de C5

*Maquette servie sur `http://localhost:8123`, relue bloc par bloc contre l'écran construit.*

| Bloc de la maquette | Ce qui est construit | Verdict |
|---|---|---|
| En-tête : avatar patient, motif « Palpitations nocturnes », pilule d'état, référence `CSL-2026-04120 · PAT-8821-BZV`, minuteur | Tuile stéthoscope, « Consultation », « Échange chiffré · N minutes », pilule d'état, minuteur serveur | **écart assumé** — le motif est le champ `symptoms`, déjà au rail : le répéter en titre n'ajoute rien. La référence `CSL-…` **n'existe pas au modèle** : les identifiants sont des UUID opaques, et afficher `PAT-8821-BZV` serait inventer un format |
| Bandeau « 2 messages retenus pour le compte-rendu » | retiré | famille 3, groupe F — validé le 25/08 |
| Fil : séparateur de jour, ligne d'ouverture, bulles, citation, pièce jointe, heures | idem, plus le **regroupement** des messages consécutifs et les **accusés de lecture** | conforme, et au-delà |
| Étiquette « RETENU POUR LE COMPTE-RENDU » sur certaines bulles | retiré | même arbitrage |
| « en train d'écrire… » avec trois points animés | idem, trois points animés | conforme |
| Composeur : champ en pilule (rayon 18, hauteur 36), bouton d'envoi rond, bandeau de citation annulable | idem | conforme — la note de style de la maquette est suivie à la lettre |
| Rail de **300 px** | rail de **320 px** | **écart de 20 px, assumé** — les maquettes ne s'accordent pas entre elles (C2 dit 320, C1/C5/D3 disent 300). 320 est la mesure des cinq écrans déjà reconstruits ; faire de C5 le seul écran à 300 coûterait plus qu'il ne rapporte |
| Rail 1 « Contexte patient » : Âge, Sexe, **Antécédents**, **Allergies**, **Traitement en cours**, Honoraires — sous-titré « transmis avec la demande » | Contexte patient : Symptômes, Depuis, pièces jointes | **écart de fait** — la pré-consultation ne porte que `symptoms`, `sinceWhen`, `attachments` (EF-06-04). Antécédents, allergies et traitement sont des données du **Carnet** : elles ont leur propre règle d'accès, leur propre traçabilité, et elles sont dans le bloc suivant. Les honoraires ne sont pas dans la vue de séance — C6 les porte |
| *(absent de la maquette)* | Rail 2 « **Carnet du patient** » — groupe sanguin, allergies actives en rouge, chroniques, chronologie filtrable | **ajout** — famille 4, point 2. Un médecin qui décide sans dossier décide à l'aveugle |
| Rail 2 « Livrables » : Ordonnance + Compte-rendu | Rail 3 « Compte-rendu ». **L'ordonnance ouvrira C7 depuis ici — chantier 5** | moitié tenue, moitié annoncée |
| Rail 3 « Terminer la consultation » + modale de clôture + récapitulatif | Rail 4 « **Prolonger** » | famille 4, point 1 — le professionnel ne peut pas clore (EF-06-10) |
| « **48 heures** pour signer le compte-rendu » — écrit **trois fois** (bloc, modale, notification) | **aucun délai écrit** : décompte de `reportDueAt`, plus la date absolue | famille 2, point 1 |

### Ce que le chantier 4 (C5 — La consultation) a appris

**Corriger un chiffre faux par un chiffre juste, c'est ne payer que la moitié de la dette.** Le
« 48 heures » de la maquette avait été remplacé par « 24 heures » en dur, avec un commentaire qui
expliquait pourquoi 24 était le bon chiffre. Il l'était — jusqu'au jour où un super-administrateur
change PM-30 dans E3, et alors l'écran ment de nouveau, avec un commentaire qui jure du contraire.
**Un chiffre juste écrit en dur est un chiffre faux en sursis.**

**Le fil web était en retard de tout ce que le serveur savait déjà faire.** Réponses citées,
réactions, édition, suppression pour tous ou pour moi : `MessageView` les servait, le mobile les
utilisait toutes, le web n'en montrait aucune. Ce n'était pas un choix — c'était un oubli, jamais
relevé parce que personne n'avait comparé les deux applications côte à côte. **À vérifier sur
chaque écran restant : ce que le serveur sert et que l'écran ignore.**

**Un bouton peut ne jamais avoir fonctionné sans que personne ne s'en aperçoive.**
`deleteSessionMessage` partait sans corps alors que `forEveryone` est obligatoire côté serveur :
400 à chaque clic, depuis le premier jour. Le bouton existait, le test n'existait pas. C'est
exactement ce que le porteur a signalé — « modifier le message ne passe pas bien » — et la moitié de
la réponse était là, dans une méthode de quatre lignes.

**Un avertissement au passé ne sert à rien.** « Cette consultation a été remboursée » informe d'une
perte déjà subie. Le même fait, dit pendant la séance — « vous n'avez encore écrit aucun message » —
coûte un message à annuler. **Chaque avertissement de l'application doit être relu à cette
question : arrive-t-il avant ou après la perte ?**

**Une doublure de test peut en écraser une autre.** `monter()` posait un Carnet vide par défaut ; les
tests qui définissaient leur propre Carnet avant de l'appeler se le faisaient effacer, et échouaient
sur un contenu absent qu'ils avaient pourtant fourni. Corrigé par une garde `vi.isMockFunction`. À
connaître : c'est silencieux, et ça ressemble à un bug de l'écran.

### Ce que le chantier 3 (C3 — Demandes) a appris

**L'étape 6 a servi dès son premier usage.** Le comparatif bloc à bloc a trouvé **deux défauts que
je n'aurais pas vus** : le compteur était posé en troisième position alors que la maquette le met
juste après l'en-tête, et j'avais **omis l'heure de réception** des lignes — alors qu'`initiatedAt`
existe et que la maquette l'affiche. *Ce qui existe et que la maquette montre n'a aucune raison de
disparaître : ce n'est pas un écart, c'est un oubli.*

**Le pire écart de tous les écrans ouverts jusqu'ici est ici** : « ANTÉCÉDENTS · Hypertension
traitée », affiché **avant paiement**. Ce n'est pas une donnée transmise par le patient, c'est une
donnée du **Carnet** — exposée à quelqu'un qui n'a encore aucun lien de soin avec lui.

**Un anneau peut se calculer sans connaître le délai.** La proportion se déduit de
`windowExpiresAt − initiatedAt` : PM-07 n'apparaît nulle part dans la page, et l'anneau suivra si
E3 le change. Même méthode pour « Ce qui se passe ensuite », qui dit « le même compte à rebours »
plutôt que « cinq minutes ». **Un écran peut être exact sans citer un seul chiffre.**

### Ce que le chantier 2 (C2 — Ma vitrine) a appris

**Un écart de forme a échappé à ma relecture, et le porteur l'a trouvé en posant une question.**
« Visibilité » est dans le rail de DROITE dans la maquette ; son remplaçant avait été posé à
gauche, au motif que la liste des commentaires tenait mal dans 320 px. **Une raison n'est pas un
fait** — la règle n'autorise à s'écarter que sur une contrainte réelle, et à condition de la tracer.
Corrigé le 27/08 : le bloc est revenu à droite, compacté. **C'est de là que vient l'étape 6 du
§7** : un comparatif écrit ne peut pas manquer ce qu'une relecture manque.

**La version précédente avait raison sur les faits et tort sur la forme.** Elle avait déjà retiré les
langues, les lieux et les vues inventées — avec de bonnes raisons, écrites. Mais son en-tête disait
aussi : *« largement repensé… ce n'est pas un formulaire, c'est un miroir de concurrence… aucun
bouton Publier… l'aperçu montre la LISTE, pas une fiche isolée »*. **C'est ça qui a été refusé** :
un auteur qui réécrit la forme à sa façon. Le diagnostic vaut pour les écrans restants.

**Un test peut protéger une invention.** L'ancien `vitrine.test.tsx` verrouillait explicitement
« l'aperçu montre la LISTE » comme une propriété à ne jamais régresser. Réécrit : les tests
protègent désormais des **faits** (le taux vient du contrat, les bornes viennent du serveur, les
inventions ne reviennent pas), jamais un parti pris.

**S8 confirme la prédiction de A1** : PM-09, PM-06 et PM-25 étaient vérifiés côté serveur et jamais
renvoyés. Le médecin découvrait les bornes par un **refus après coup**. **Chaque chantier restant
doit vérifier ce point** avant de coder son écran.

### Ce que le chantier 1 (B1 — la coquille) a appris

**Un 7ᵉ ajout serveur est apparu — S7, non prévu au §5.** « 1 consultation sur 3 » supposait
d'écrire le **3** dans la page : PM-27 n'était servi qu'au **patient**, dans le texte d'un message
d'erreur. C'est la même dette que les « 12 % » et les « 48 h ». Corrigé côté serveur, ~15 lignes
en lecture seule. **À prévoir : d'autres chiffres manqueront de la même façon**, chantier par
chantier — l'alignement ne pouvait pas le voir, il regardait les maquettes, pas les réponses HTTP.

**Un 40ᵉ écart est apparu au premier écran ouvert** — le « rideau de confidentialité » (famille 3,
groupe G). La règle n°1 a payé dès son premier usage.

**Écartés de A1, volontairement** : la **recherche globale** (elle ira avec C4 : chercher dans des
dossiers qui n'existent pas encore n'a pas de sens) et le **tiroir de notifications** (M14 est une
fonctionnalité à part entière, pas un morceau de coquille).

**⚠️ Dette repérée : la suite web est instable sur cette machine.** *(28/08 : une cause trouvée — les tests appelaient la vraie API de production dès qu'une méthode n'était pas doublée. `fetch` est désormais coupé dans le harnais. À revérifier sur plusieurs exécutions.)* Deux exécutions sur cinq se
sont arrêtées sur un « Timeout waiting for worker to respond » — y compris **avant** tout
changement de ce chantier. Les reprises passent intégralement. La suite dure ~105 s ; le délai
d'attente des workers est probablement trop court pour cette machine. À corriger avant de s'y
fier en intégration continue.

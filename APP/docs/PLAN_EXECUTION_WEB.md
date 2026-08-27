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

### Les deux règles d'interface intangibles

1. Les écrans d'authentification gardent le **carrousel à gauche 42 % / formulaire à droite 58 %**.
2. Le **logo ULAMU** est conservé.

---

## 2. Afficher la maquette — le geste qui manquait

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

| Groupe | Écrans | État |
|---|---|---|
| **A — Authentification** | A1 Connexion, A2 Inscription, A3 Mot de passe oublié, A4 2FA | ✅ **VALIDÉS — on n'y touche pas** |
| **B — Coquille** | B1 Coquille, B2 Tableau de bord, B3 Mes paramètres | 🔴 à refaire |
| **C — Professionnel** | C1 → C6, **+ C7 Ordonnance (écran neuf)** | 🔴 à refaire |
| **D — Pharmacie** | D1 → D4 | ⬜ **hors MVP, écartés** |
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
| **6** | **C4 — Consultations** (le registre) | aucun | F2 pt 1 · F4 pt 7, pt 8, pt 9 · F3-C · F3-D |

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
| `npm run lint` | ⛔ **inopérant** | **`eslint` n'est installé nulle part** — ni API, ni web, ni racine, aucun binaire. Vérifié le 27/08. **Aucun lint ne tourne sur ce dépôt.** |

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

Aucune ne doit atteindre le client. Reprises du plan précédent, mises à jour le 27/08.

| # | Sujet | État |
|---|---|---|
| 1 | **Identifiants du super-administrateur** — mot de passe `admin123`, secret 2FA `JBSWY3DPEHPK3PXP`, qui est **l'exemple public de la norme RFC**, connu de tous. Sur une API exposée à internet. | 🔴 ouvert |
| 2 | **MODE VITRINE** — `HANDSHAKE_AUTOCONFIRM_MS=3000` et `MOMO_AUTOCONFIRM_MS=4000` : le soignant accepte tout seul, le paiement se valide tout seul. Utile pour démontrer, inacceptable en production. | 🔴 ouvert |
| 3 | **Comptes de démonstration en production** — `dr.nouveau`, `dr.armel`, `dr.solange`, `dr.firmin`, `patient.demo`, `pharma.demo`, tous en `demo1234`. | 🔴 ouvert |
| 4 | **`ADMIN_REQUIRE_TOTP=false` sur Render** — RM-01-06 est levée sur une API exposée. Le code vaut `true` par défaut : retirer la ligne suffit. | 🔴 ouvert |
| 5 | **`SECRETBOX_KEY` sans sauvegarde** — perdue = pièces justificatives, messages et secrets 2FA définitivement illisibles. **Procédure écrite le 25/08** : `procedure_sauvegarde_SECRETBOX_KEY.md`. Le code ne ment plus (il journalise et lève au lieu de servir du chiffré en HTTP 200). **Les copies hors ligne restent à faire — geste du porteur.** | 🟡 outillé, non soldé |
| 6 | **Garde-fou de démarrage sur `SECRETBOX_KEY`** — §8.1 de la procédure, volontairement non appliqué : il changerait une dégradation invisible en indisponibilité totale. **Décision à prendre.** | ⏸ à trancher |
| 7 | **Hébergement hors du Congo** — la phrase sera corrigée dans B3 (§ palier E). Ce qui reste ouvert n'est pas du ressort du code : héberger des données de santé congolaises hors du Congo peut exiger une base légale de transfert. | 🟡 partiel |
| 8 | **Tests d'intégration API hors service** — il manque une branche Neon de test et son `TEST_DATABASE_URL`. Le seul garde-fou automatique du backend est donc à l'arrêt. | 🔴 ouvert |
| 8bis | **La spécialité reste modifiable côté serveur** — C2 l'affiche en lecture seule (arbitrage du 27/08 : le Badge Vérifié atteste d'une qualification contrôlée par pièces), mais `PATCH /v1/me/professional-profile` accepte toujours le champ `specialty`. **Un écran ne ferme pas une porte.** Le fermer demanderait un chemin administratif pour les corrections légitimes. | ⏸ à trancher |
| 9 | **Aucun lint sur le dépôt** — `eslint` absent partout. À installer, ou à retirer des scripts pour ne pas laisser croire qu'il tourne. | 🔴 ouvert |
| 10 | **3 alertes `npm audit` élevées** sur `react-router` — concernent le mode RSC, non utilisé (SPA statique). À re-vérifier avant livraison. | 🟡 à revérifier |

### Trois dérives documentaires jamais arbitrées

| Le cahier dit | Le code fait |
|---|---|
| OTP par **SMS** (EF-01-01) | par **email** (Brevo) |
| Connexion par **téléphone** (EF-01-03) | nom d'utilisateur **ou** email |
| TOTP **optionnel** pour les pros (RM-01-06) | déclaré **obligatoire** sur le web |

---

## 10. Journal des chantiers

*Rempli au fur et à mesure, en même temps que le code — jamais après.*

| N° | Chantier | Poussé le | Confirmé par le porteur |
|---|---|---|---|
| **1** | **B1 — la coquille + la présence + le plafond + le rideau** — codé le 27/08. Serveur : **S7**, PM-27 servi au professionnel dans `GET /v1/presence/me` (~15 l. + 4 tests) — ajout **non prévu**, voir ci-dessous. Web : `usePresence` (battement 5 min), `useSessionsEnCours`, `IndicateurPresence`, `RideauConfidentialite`, ligne d'identité corrigée. **API 476 ✓ · web 174 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **2** | **C2 — Ma vitrine** — codé le 27/08. Serveur : **S8**, `GET /v1/offers/limits` sert PM-09/PM-06/PM-25 + mon compte d'offres actives (~25 l. + 4 tests). Web : écran **entièrement réécrit** sur la forme mesurée (2 colonnes, 968 px + rail d'aperçu de 320 px), « Ce que les patients voient » alimenté par la vraie route publique, `CarteAnnuaire.tsx` supprimée (orpheline). **API 480 ✓ · web 179 ✓ · builds propres.** | ⏸ en attente | ⏸ |

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

**⚠️ Dette repérée : la suite web est instable sur cette machine.** Deux exécutions sur cinq se
sont arrêtées sur un « Timeout waiting for worker to respond » — y compris **avant** tout
changement de ce chantier. Les reprises passent intégralement. La suite dure ~105 s ; le délai
d'attente des workers est probablement trop court pour cette machine. À corriger avant de s'y
fier en intégration continue.

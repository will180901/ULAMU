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
| 2 | **MODE VITRINE — moitié retirée le 28/08.** `HANDSHAKE_AUTOCONFIRM_MS` **est parti** : il datait de l'époque sans interface web, et `scheduleDevAutoConfirm` n'était pas un « soignant virtuel » — il **usurpait l'identité du vrai médecin** et confirmait à sa place en 3 s. Une demande traversait donc « en attente », « confirmée » et « payée » en sept secondes : intestable. **`MOMO_AUTOCONFIRM_MS` reste, et ce n'est pas un oubli** — la passerelle Mobile Money est une implémentation en mémoire, aucun agrégateur réel n'est choisi (ADR-09 ouvert). Sans elle, un paiement reste en attente à jamais et aucune session ne démarre. À retirer le jour où un vrai agrégateur répondra. | 🟡 moitié soldée |
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
| — | *⚠️ **Les chantiers 1 et 2 n'ont pas été confirmés à l'écran.** Proposé deux fois, le porteur a choisi de poursuivre — c'est sa décision, elle est notée ici et non re-discutée. Conséquence à connaître : si un défaut visuel existe sur la coquille, il se propage à TOUS les écrans suivants, puisqu'ils vivent dedans.* | | |
| **1** | **B1 — la coquille + la présence + le plafond + le rideau** — codé le 27/08. Serveur : **S7**, PM-27 servi au professionnel dans `GET /v1/presence/me` (~15 l. + 4 tests) — ajout **non prévu**, voir ci-dessous. Web : `usePresence` (battement 5 min), `useSessionsEnCours`, `IndicateurPresence`, `RideauConfidentialite`, ligne d'identité corrigée. **API 476 ✓ · web 174 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **2** | **C2 — Ma vitrine** — codé le 27/08. Serveur : **S8**, `GET /v1/offers/limits` sert PM-09/PM-06/PM-25 + mon compte d'offres actives (~25 l. + 4 tests). Web : écran **entièrement réécrit** sur la forme mesurée (2 colonnes, 968 px + rail d'aperçu de 320 px), « Ce que les patients voient » alimenté par la vraie route publique, `CarteAnnuaire.tsx` supprimée (orpheline). **API 480 ✓ · web 179 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **3** | **C3 — Demandes** — codé le 27/08. **Serveur : aucun.** Web : trois **onglets** comptés à la place des trois cartes empilées, **anneau** de décompte avec ses seuils (ambre 2 min, rouge 1 min), bloc « Ce qui se passe ensuite », heure de réception restaurée, antécédents et référence retirés. **API 480 ✓ · web 187 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **4** | **C5 — La consultation** — codé le 28/08. Serveur : **S1**, `reportDueAt` (`endedAt` + PM-30) sur la vue de séance ET sur les lignes du registre (~10 l. + 4 tests). Web : **Carnet du patient** au rail, fil porté au niveau du mobile (répondre, réagir, modifier, supprimer pour moi / pour tous, séparateurs de jour, regroupement, saut au message cité), décompte réel du compte-rendu, avertissement de remboursement **avant** la perte, « Terminer » → « Prolonger », composeur en pilule. **Un bug corrigé au passage : `deleteSessionMessage` partait sans corps** et se faisait refuser en 400 — le bouton « supprimer » n'avait jamais rien supprimé. **API 484 ✓ · web 203 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **5** | **C7 — Ordonnance** *(écran neuf)* + garde-fou allergies — codé le 28/08. Serveur : **aucun code**, mais **la seule écriture en base de toute la reconstruction** — référentiel porté de **6 à 64 médicaments**, par un script dédié (`scripts/referentiel-medicaments.ts`), **appliqué en base le 28/08**. Web : panneau C7 ouvert depuis le rail de C5, recherche au référentiel, repli texte libre marqué « non vérifié », garde-fou allergies avec ses deux issues, avertissement d'immuabilité avant le bouton, QR + échéance après scellement, annulation motivée. **Trois corrections dans `api.ts` :** `PrescriptionLineInput` n'avait ni `qtyPrescribed` (obligatoire au serveur) ni `durationDays`, `createPrescription` était typée `{ id }` au lieu de l'ordonnance complète, et `cancelPrescription` n'existait pas. **API 484 ✓ · web 217 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **6** | **C4 — Consultations** (le registre) — codé le 28/08. Serveur : **S9**, `orderRef` sur les lignes du registre (**2 lignes**) — la clé qui relie une consultation à son mouvement au journal des gains. Web : écran **refait sur la forme mesurée** — trois tuiles, trois onglets comptés, **un tableau** à la place des cartes empilées. Honoraires **lus au journal**, jamais calculés. Plus aucun délai écrit. Colonnes « mode » et « patient » retirées, statut d'ordonnance à la place de « suivi en officine », proposition de suivi annoncée. **API 484 ✓ · web 226 ✓ · builds propres.** | ⏸ en attente | ⏸ |

| **7** | **C6 — Mes gains** — codé le 28/08. Serveur : **S2** (brut + commission joints depuis la part de paiement, ~35 l. + 5 tests) et **S3** (délai PM-36 dans le récapitulatif de retrait, 3 l.). Web : détail brut/commission/taux **déduit** sur chaque mouvement, décompte du mois, histogramme des six mois, trois onglets comptés, avertissement D-008 près du solde en attente, délai annoncé avant confirmation. **Et une brèche du harnais de tests fermée : la suite web appelait la vraie API de production.** **API 489 ✓ · web 239 ✓ · builds propres.** | ⏸ en attente | ⏸ |

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

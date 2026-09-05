# Plan des écrans du soignant — ce qu'on ajoute, ce qu'on retire, ce qu'on corrige

*Écrit le 04/09/2026, sur consigne du porteur. Il prend la suite de `PLAN_EXECUTION_WEB.md`, qui
racontait la reconstruction ; celui-ci prépare l'amélioration.*

> **La règle qui commande ce plan** (porteur, 03/09/2026) : *« on ne doit plus se fier à la maquette
> dorénavant mais plutôt au site actuel »*. La référence est `ulamu-web.onrender.com` tel qu'il est
> en ligne. Le cahier des charges décide toujours des **faits**. La maquette est une archive.

---

## 0. Comment ce plan a été écrit

Pas d'intuition. Trois mesures, faites contre le code déployé et la base de production.

**Mesure 1 — l'écart entre ce que le serveur offre et ce que le web utilise.**
Le relevé des routes (`scripts/relever-routes.ts`, qui monte NestJS avec un Prisma bouchonné) donne
**160 routes servies**. Un balayage de tout `apps/web/src` donne **115 appels distincts**.

**Mesure 2 — l'écart inverse : le web appelle-t-il une route qui n'existe pas ?**
✅ **Aucune.** Pas un seul bouton ne mène à un 404. C'est un résultat, et il vaut d'être dit : sur
115 appels, zéro dérive entre le client et le serveur.

**Mesure 3 — la lecture de la base de production**, en lecture seule, pour distinguer ce qui est
*affiché* de ce qui est *vrai*.

### Ce que la première mesure a trouvé, et ce qu'il faut en retenir

**43 routes ne sont jamais appelées par le web.** Le chiffre brut ne veut rien dire — il fallait les
lire une par une, comme le chantier 29 l'avait appris.

| | |
|---|---|
| **30** appartiennent au **patient**, donc au mobile | carnet de santé, ordonnances, rappels de médicaments, initiation et paiement d'une poignée de main, notation, reçus, inscription. **Normal.** |
| **4** sont techniques | `/health`, les deux routes de mise à jour Android (OTA), le webhook de l'agrégateur de paiement. **Normal.** |
| **2** étaient de **fausses alertes** | le web les appelle, mais autrement — par `fetch` avec un en-tête d'autorisation, pour lire un fichier de pièce justificative. *Mon extracteur les avait accusées à tort ; je les ai vérifiées avant d'écrire.* |
| **7** sont de **vrais écarts** | détaillés au §2. |

---

## 1. Les cinq écrans du soignant — état mesuré

| Écran | Lectures | Actions | Verdict |
|---|---|---|---|
| **Tableau de bord** `/dashboard` | 5 | **0** | complet en lecture, **muet en action** |
| **Demandes** `/demandes` | 3 | 3 | ✅ **CRUD complet** — confirmer et refuser sont les deux seules actions que le serveur offre au soignant |
| **Consultations** (registre) `/consultations` | 4 | **0** | registre en lecture seule, par conception |
| **La consultation** `/consultations/:id` | 6 | 8 | l'écran le plus riche de la plateforme |
| **Ma vitrine** `/vitrine` | 6 | 5 | ✅ complet |
| **Ma vérification** `/verification` | 3 | 6 | ✅ complet côté soignant |
| **Mes gains** `/gains` | 4 | 3 | ✅ complet |

**Le constat qui compte : aucun écran du soignant ne manque d'une action que le serveur lui
offrirait.** Les écarts sont ailleurs — dans l'administration, et dans ce que les écrans *disent*.

---

## 2. Les sept écarts entre le serveur et les écrans

Classés par gravité. Chacun avec son coût réel et ma recommandation.

### ✅ A. Personne ne peut signaler quoi que ce soit — **SOLDÉ le 04/09 (chantier 41)**

*Énoncé d'origine :* `POST /v1/reports` **n'était appelée par aucun client**, ni web ni mobile.

Conséquence : M04 existe, l'écran d'administration **E6 « Signalements »** existe, il sait examiner,
avertir, suspendre — et **il serait resté vide à jamais**, parce qu'aucun signalement ne pouvait
naître. Un patient ne pouvait pas signaler un soignant ; un soignant ne pouvait pas signaler un
patient.

Sur une plateforme de santé, c'est la voie de recours qui manquait.

> ✅ **Fait le 04/09 pour le WEB** (chantier 41) : `DialogueSignalement.tsx`, branché sur un message
> et sur le patient, dans la consultation. **Aucune ligne de serveur** — et c'est la découverte du
> chantier : `decideReport` notifiait déjà l'auteur du signalement, mais cette notification
> n'atteignait personne avant que le chantier 37 ne construise la cloche.
> ⏳ **Reste le MOBILE** : le patient ne peut toujours pas signaler un médecin. ~½ j.

### ✅ B. Une vérification ne peut jamais être défaite — **SOLDÉ le 04/09 (chantier 42)**

`POST /v1/admin/verification/:id/revoke` n'a **aucun bouton**.

Un soignant vérifié par erreur, ou qui perd son autorisation d'exercer, **reste vérifié pour
toujours** — Badge Vérifié compris, donc visible et crédible dans l'annuaire public.

> ✅ **Fait le 04/09** (chantier 42) : une carte dans E1, visible sur les seuls dossiers vérifiés,
> avec motif obligatoire et confirmation tapée.
> ⚠️ **Le geste s'est révélé bien plus grave que cet écart ne le laissait croire** : `REVOKED` est un
> état **terminal** et un professionnel n'a **qu'un dossier à vie**. Révoquer ferme définitivement
> l'accès d'un soignant, sans chemin de retour dans le produit. L'écran le dit maintenant avant le
> clic — et la **dette n°25** pose la question qui reste : faut-il une voie de recours ?

### ✅ C. Le parcours de re-signature du contrat — **SOLDÉ le 05/09 (chantier 44)**

`POST /v1/admin/verification/:id/agreement/reissue` n'a **aucun bouton**.

Or le **chantier 8** a construit tout le parcours côté soignant : bandeau de conséquence, ancien
taux à côté du nouveau, texte relu, bouton qui dit ce qu'on regagne. Il est déjà noté au journal que
*« le parcours d'avenant ne se déclenche qu'avec E3 »*. **E3 existe depuis le chantier 14, et le
levier manque toujours.**

> ⚠️ **Le titre de cet écart était FAUX, et c'est la première chose qu'a montrée le chantier.**
> « Rien ne peut le déclencher » : si, changer PM-01 depuis E3 réédite **déjà** les contrats en
> masse (`m16.parameters.service.ts` → `reissueSignedAgreements`). Le parcours du chantier 8 n'était
> donc pas mort — il était seulement inatteignable à l'unité.
>
> ✅ **Fait le 05/09** (chantier 44) : une carte dans E1 sur les dossiers vérifiés. Ce qu'elle
> comble sont les **trois trous du lot** :
> * il ne prend que les dossiers ayant une version **SIGNÉE** — un soignant vérifié qui n'a pas
>   encore signé garde donc un contrat à l'ANCIEN taux, et le signerait tel quel ;
> * il est borné à **500** dossiers (`REISSUE_BATCH`) ;
> * un échec isolé est journalisé puis **oublié**, sans rien pour le reprendre.
>
> ⚠️ **Et le geste coûte cher au soignant** : rééditer crée une version NON SIGNÉE, or « peut
> exercer » = badge + version courante signée (RM-03-01), relu par M05/M06 **à chaque requête, sans
> cache**. Un soignant en exercice cesse de pouvoir l'être à l'instant du clic. La carte le dit
> avant, et distingue les deux cas — celui qui a signé perd quelque chose, celui qui n'a pas signé
> ne perd rien.
>
> Le serveur ne disait ni le taux du contrat ni le taux courant : trois champs ont été ajoutés à
> `getCaseForAdmin`, sans quoi le bouton aurait agi à l'aveugle. Quand les deux taux sont égaux,
> **il n'y a pas de bouton du tout**.

### 🟡 D. Le patient ne peut pas revendiquer son sous-profil

`POST /v1/health-record/sub-profiles/:id/claim` et `/claim/start` ne sont appelées **ni par le web
ni par le mobile**. Un proche pour qui on a consulté ne peut donc pas récupérer son propre dossier.

> **Coût : ~½ j**, sur mobile.
> **Recommandation : à planifier**, hors du périmètre « écrans du soignant ». Inscrit ici pour ne
> pas le perdre.

### 🟢 E. Le journal d'audit ne s'exporte pas

`GET /v1/admin/audit/export.csv` n'a aucun bouton. E5 affiche l'intégrité du journal et sait le
lire, mais pas l'exporter.

> **Coût : ~30 min.** **Recommandation : le faire**, en même temps qu'un autre passage sur E5.

### 🟢 F. Une route de dépôt de pièce est morte

`POST /v1/verification/me/documents` exige une `fileKey` **qu'aucun point d'entrée ne sait
produire** — le commentaire du contrôleur le dit lui-même. Elle a été remplacée par
`POST /v1/verification/me/documents/upload`, que le web utilise.

> **Coût : ~20 min** (retrait de la route, du DTO et de la méthode de service).
> **Recommandation : la retirer.** Une route qui ne peut pas aboutir est un piège pour qui la lira
> dans six mois.

### 🟢 G. Deux fausses alertes, et pourquoi elles comptent

Mon premier balayage accusait le web de ne pas lire les fichiers de pièces justificatives. **C'était
faux** : il les lit par `fetch` avec un en-tête d'autorisation, une forme que mon extracteur ne
reconnaissait pas.

*Ce n'est pas une anecdote : c'est la raison pour laquelle ce plan a lu les treize routes suspectes
une par une. Un outil de balayage propose ; il ne conclut pas.*

---

## 3. Ce qui ment encore à l'écran

### 🔴 Vos indicateurs publics sont fabriqués (dette n°24)

Lu dans la base de production, le 04/09 :

| `ProfessionalStats` de `dr.armel` | La réalité |
|---|---|
| **242** sollicitations | **2** demandes (1 payée, 1 expirée) |
| **234** confirmations | **1** consultation |
| **215** avis, note 4,8 / 5 | **1** évaluation |

`prisma/seed.ts` écrit ces compteurs **directement**, sans passer par les événements.

Conséquences :
1. **Le tableau de bord se contredit** — la tuile annonce 96,7 %, le panneau juste en dessous, qui
   compte les vraies demandes, dit 1 menée à bien et 1 expirée, soit **50 %** ;
2. **ces chiffres sont montrés aux PATIENTS** dans l'annuaire (EF-05-01). Un patient choisit son
   médecin sur une note de 4,8/5 fondée sur un seul avis réel.

> **Recommandation : suspendre les comptes de démonstration** — c'est la dette n°3, et elle règle
> tout d'un coup (un compte suspendu quitte l'annuaire, RM-05-05). **Geste du porteur.**

### 🔴 Un refus motivé pénalise autant qu'une demande ignorée (dette n°23)

Corrigé à l'écran le 04/09 : la phrase dit désormais la vérité. **Mais la règle, elle, n'a pas été
tranchée.** Un refus rapide fait *gagner* du temps au patient là où une expiration lui en fait
*perdre* ; les traiter à l'identique décourage le seul des deux comportements qui rende service.

> **Recommandation : retirer les refus motivés du dénominateur** (~2 h). **Mais c'est une décision
> de produit, pas de code** — c'est le taux que les patients lisent pour choisir.

---

## 4. Le tableau de bord — ce qui reste à faire

C'est l'écran par lequel le porteur a voulu commencer, et le seul qui n'a **aucune action**.

| | Quoi | Pourquoi | Coût |
|---|---|---|---|
| **1** | **Dire pourquoi il n'y a aucune demande** | `GET /v1/verification/me` sert `canPractice`, et le tableau de bord ne le lit pas. Un soignant non vérifié, ou dont le contrat attend une signature, voit « 0 demande en attente » **sans savoir que c'est lui qui est bloqué**. C'est le pire des silences : il ressemble à une journée calme. | ~2 h |
| **2** | **Rafraîchir les demandes en attente** | L'écran ne se rafraîchit **jamais** — ni par intervalle, ni au retour sur l'onglet. Une demande a un compte à rebours ; un médecin qui laisse son tableau de bord ouvert ne verra rien arriver. | ~1 h |
| **3** | **Toujours dire la portée du taux** | La tuile écrit « Note 4,8/5 · visible des patients » **dès qu'une note existe**, et perd alors « Depuis l'ouverture ». Le lecteur croit lire un taux du mois. | ~30 min |
| **4** | **Des raccourcis clavier** | Aucun aujourd'hui. Un médecin entre deux patients navigue à la souris. | ~½ j |
| **5** | **La recherche globale** | Écartée au chantier 1 « en attendant C4 ». **C4 existe depuis le chantier 6** : la condition est levée. | ~1 j |

---

## 5. L'ordre que je recommande, et pourquoi

L'ordre n'est pas celui des écrans : c'est celui de ce qui **coûte** au médecin ou au patient.

| | Chantier | Pourquoi ici | Coût |
|---|---|---|---|
| **41** | **Le signalement** (écart A) | Personne ne peut signaler. C'est une voie de recours absente sur une plateforme de santé, et tout un module d'administration attend derrière. | ~1 j |
| **42** | **Révoquer une vérification + rééditer un contrat** (écarts B et C) | Deux boutons dans le même écran (E1). Le premier ferme un risque, le second réveille du travail déjà fait. | ~4 h |
| **43** | **Le tableau de bord : dire pourquoi, et se rafraîchir** (points 1, 2, 3) | Le silence qui ressemble à une journée calme est le défaut le plus coûteux de cet écran. | ~4 h |
| **44** | **La recherche globale** (point 5) | Sa condition d'attente est levée depuis six chantiers. | ~1 j |
| **45** | **Les raccourcis clavier** (point 4) | Confort réel, mais confort. | ~½ j |
| **46** | **Le ménage** (écarts E, F) | L'export CSV du journal, la route morte de dépôt. À grouper. | ~1 h |

### Ce que je ne mets PAS dans ce plan, et pourquoi

- **Les dettes n°23 et n°24** : elles attendent votre décision, pas mon code.
- **Le sous-profil du patient** (écart D) : c'est du mobile, hors du périmètre de ce plan.
- **Refaire un écran du soignant** : aucun n'en a besoin. Ils sont complets vis-à-vis de ce que le
  serveur leur offre — c'est la mesure du §1, et c'est une bonne nouvelle.

---

## 6. La règle de travail, inchangée

Une chose à la fois. J'annonce, vous validez, je code, je vous donne **2 ou 3 gestes** à tester,
vous poussez, Render déploie, **vous testez en ligne**, vous confirmez, chantier suivant.

Et la règle apprise le 04/09, qui vaut pour tout ce plan :

> **Un outil de balayage propose ; il ne conclut pas.** Sur treize routes suspectes, deux étaient
> des accusations fausses. Les treize ont été lues.

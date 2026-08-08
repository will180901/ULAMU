# 🔑 Passation — session du 2026-08-05

> **Lisez ce fichier en premier.** Il est écrit pour qu'une nouvelle fenêtre, ou un autre compte
> Claude, reprenne le travail sans avoir la conversation. Tout ce qui est affirmé ici a été vérifié ;
> ce qui ne l'a pas été est signalé comme tel.

**État du dépôt à la clôture :** `origin/main` = `53329cf`, local et distant alignés, arbre propre.
**34 commits** poussés dans la journée.

---

## 1. Ce qui a changé, en une phrase

Le matin, un patient pouvait dérouler tout son parcours depuis le mobile, mais **aucun professionnel
ne pouvait lui répondre** et **aucune pharmacie ne pouvait servir une ordonnance**. Le backend
— 13 modules, 505 tests — était complet et **inutilisable**. Ce n'est plus le cas.

### Les trois parcours désormais fermés

| Parcours | Chaîne |
|---|---|
| **Soin** | patient sollicite *(mobile)* → soignant confirme *(web)* → paiement → consultation des deux côtés → compte-rendu versé au Carnet à vie |
| **Médicament** | ordonnance scellée avec garde-fou allergies → présentée au comptoir → délivrance totale ou partielle → stock décrémenté |
| **Confiance** | dossier de vérification déposé → file triée par urgence → décision motivée → le soignant devient visible de l'annuaire |

---

## 2. La journée en deux moitiés

### Matin — l'app mobile (commits `86a1993` → `344c189`)

Reprise après une **coupure de courant** qui avait interrompu la session de la veille. Les
transcriptions vivent dans `~/.claude/projects/` et survivent ; en revanche **six jours de travail
n'étaient pas commités** (31 fichiers) — d'où `86a1993`.

Audit de navigation des **25 écrans**, 8 familles de défauts corrigées. Les trois plus instructives :

- **La « boucle des retours »** signalée par le porteur. Le diagnostic de la veille était FAUX
  (`navigate` vers un écran déjà empilé n'empile pas, il dépile). La vraie cause : `AuthPage`
  intercepte tous les appuis retour *y compris pendant qu'une boîte est affichée*, et `Dialog`
  n'avait **qu'une seule place** pour son `resolve` — la Promise écrasée ne se réglait jamais.
  Verrou `asking` + résolution de la boîte remplacée. **Test de non-régression** : sans le verrou,
  3 appuis ouvrent 3 boîtes.
- **Double session empilée** : `Handshake` interrogeait le serveur depuis un effet de **montage** et
  continuait sous l'écran de paiement ; les deux réagissaient à `PAID` par un `replace`.
- **Sortie non gardée d'une consultation payée** dont le chronomètre tourne.

### Après-midi — l'app web, phases 0 à 4 (commits `d332ef2` → `53329cf`)

L'app web est passée de **4 pages d'authentification + une coquille vide** à un produit utilisable
par les trois familles de rôles.

---

## 3. ⚠️ Cinq trous BACKEND comblés

Découverts **en construisant les écrans**, jamais en lisant la spécification. C'est le point le plus
important de cette passation : le backend paraissait complet, il ne l'était pas.

| Ajouté | Sans lui |
|---|---|
| `POST /v1/verification/me/documents/upload` | le dossier de vérification était **impossible à remplir** depuis un client |
| `GET /v1/facilities/me` | un membre de structure ne pouvait découvrir **aucune** de ses pages |
| `GET /v1/stocks/:facilityId/items` | un pharmacien ne pouvait **pas voir son propre stock** |
| `acceptTerms` obligatoire (3 inscriptions) | le serveur fabriquait un **faux consentement** |
| Message PM-18 avec durée | fuitait le code interne et taisait le délai d'attente |

### Le plus grave : le faux consentement

`m01.service.ts` créait les enregistrements de `Consentement` (CGU + PRIVACY) **inconditionnellement**
à chaque inscription, sans qu'aucun champ n'indique une acceptation — et l'app web ne demandait
**jamais** rien à l'utilisateur. Or le modèle de données qualifie cette entité de « **preuve légale,
immuable** » (EF-01-08, loi n° 29-2019). Une preuve identique que la case ait été cochée ou non ne
prouve rien : c'était **pire** qu'un consentement absent.

Corrigé de bout en bout : DTO (`@Equals(true)`), garde-fou service pour les appels directs, case
bloquante sur le web, transmission depuis le mobile (la case existait et n'était pas envoyée),
15 littéraux de tests d'intégration mis à jour.

---

## 4. Deux de mes constats d'audit étaient FAUX

À consigner, parce que la leçon vaut pour la suite.

| Constat initial | Réalité |
|---|---|
| 🔴 « Verrouillage possible faute de TOTP imposé » | `App.tsx:35` (`needsTotpSetup`) redirige déjà **toutes** les routes |
| 🟠 « Session web sans expiration » | `auth.guard.ts` applique déjà `WEB_IDLE_SECONDS = 30*60` |

**Cause commune :** j'avais lu les 4 pages et le client API, mais **ni le routeur, ni la garde
d'authentification**. *Auditer une app web sans lire `App.tsx`, c'est juger un bâtiment sans regarder
ses portes.* Toute revue future commence par le routage et les gardes de route.

Le second cas cachait tout de même un vrai défaut, d'une autre nature : la session mourait côté
serveur, mais **l'écran continuait d'afficher un dossier patient** sur un poste d'officine laissé
sans surveillance. D'où `useIdleLogout`, qui vide l'interface au même instant — avec un test qui
**lit `auth.guard.ts`** pour vérifier que les deux horloges affichent la même durée.

---

## 5. Un défaut de design trouvé par la vérification

Trouvé en inspectant la barre latérale **élément par élément dans le navigateur**, pas au build : le
menu utilisateur ressortait avec `box-shadow: none` en thème sombre.

Le système de design du web est un **port de CMS-SARIS** (le fichier le dit en en-tête), qui
désactive toutes les ombres en sombre — raisonnement juste pour une **carte** posée sur la page. Mais
un **menu flotte** : il devenait indiscernable de ce qu'il recouvre, ce que `CG-06 §07` range parmi
les **interdictions absolues** (« jamais plat »).

Correction : token `--ombre-flottante` défini par thème — vraie ombre en clair, halo très noir en
sombre. Verrouillé par [`charte.test.tsx`](../apps/web/src/test/charte.test.tsx), qui vérifie la
**cascade** et non la déclaration, puisque c'est la cascade qui produisait le défaut.

> **Le même port SARIS avait déjà faussé la typographie** : titres en Sora (hors référentiel ULAMU),
> corps en Plus Jakarta Sans (que CG-02 réserve aux titres), Inter absente alors qu'elle porte ~80 %
> du texte. Corrigé en `d332ef2`. **Se méfier de tout ce qui vient de ce port.**

---

## 6. État par application

| | État | Vérification |
|---|---|---|
| **API** (`apps/api`) | 13 modules + 5 endpoints ajoutés | `tsc` 0 · **465 tests unitaires** verts |
| **Mobile** (`apps/mobile`) | 25 écrans, navigation auditée | `tsc` 0 · 7 tests verts |
| **Web** (`apps/web`) | 4 espaces par rôle | **86 tests** verts · build ~2,5 s · lint 0 erreur |

### Écrans web livrés

- **Phase 0** — typographie CG-02, barre latérale 3 états, menu utilisateur, thème clair/sombre
  branché *(le bloc `.dark` existait et n'était jamais posé)*, palette `Ctrl K`, états d'écran.
- **Phase 1** — consentement, dossier de vérification, expiration d'écran, appareils connectés,
  changement de numéro, clôture de compte, message de blocage.
- **Phase 2** — vitrine + offres + présence, poignées de main, consultation, compte-rendu,
  ordonnance, gains.
- **Phase 3** — structure + membres et droits, stock FEFO, délivrance.
- **Phase 4** — file de vérification, signalements, comptes, KPIs du pilote, intégrité de l'audit.

---

## 7. Vérifié dans un vrai navigateur

Pas seulement « ça compile » :

- Un **professionnel** voit vitrine / demandes / consultations / gains — **aucune** entrée pharmacie
  ni administration.
- Un **admin Vérification** voit sa file — **pas** le pilotage.
- Naviguer directement vers `/admin/pilotage` avec ce sous-rôle **redirige** sans jamais rendre le
  contenu : la garde de route fonctionne, pas seulement le filtrage du menu.
- Un **Super Admin** voit ses 4 espaces.
- Conformité mesurée à l'exécution : corps en `Inter Variable`, barre 240 px / 56 px, item 32 px,
  libellés de groupe en `JetBrains Mono` majuscule, `blur(16px)`, `html.dark` actif.
- Menu utilisateur : avatar + nom + rôle, `aria-haspopup="menu"`, 3 entrées de 36 px, séparateur
  **avant** la déconnexion, déconnexion **en dernier** et en danger.

### ❌ Ce qui n'a PAS été vérifié — ne pas supposer

- **Le flux réel poignée de main → paiement → session** avec deux vrais comptes simultanés.
- **Les écrans web n'ont jamais été exercés contre l'API déployée** (les tests utilisent des doublures).
- **Aucun écran mobile modifié n'a été testé sur appareil** hors l'inscription et la feuille modale,
  validées par le porteur.

---

## 8. Ce qui reste

**Aucun de ces points ne bloque un parcours** — ce sont des outils d'exploitation, chacun avec un
contournement possible pour le pilote.

| Reste | Contournement d'ici là |
|---|---|
| Contrats et avenants (M03) | signature à la main |
| Supervision des paiements (M13, sous-rôle Finance) | lecture en base |
| Paramètres métier PM-01→PM-40 (M16) | migration |
| Sous-rôles admin (M02) | attribués au seed |
| Transfert de titularité (M02) | procédure rare, OTP des deux parties |
| Dévoilements / réservations (M12) | appartient d'abord au parcours patient mobile |

---

## 9. Pièges de l'environnement — à savoir avant de commencer

- **Deux dossiers imbriqués.** Le dépôt git est dans `Desktop/ULAMU/**ULAMU**` (l'intérieur). Les
  sessions Claude sont indexées sur le dossier **extérieur** : un `claude --resume` lancé depuis
  l'intérieur ne trouve rien.
- **`claude` n'est pas dans le PATH** — chemin complet :
  `C:\Users\ADMIN\AppData\Roaming\Claude\claude-code\<version>\claude.exe`.
- **La base est chez Neon**, pas chez Render. Render héberge l'API, GitHub déclenche les déploiements.
  `apps/mobile/src/config.ts` : `USE_LOCAL_API = false` — **le téléphone parle au serveur déployé**.
- **Remise à zéro** : `npx prisma migrate reset --force` depuis `apps/api` avec `DATABASE_URL` dans
  un `.env` local (gitignoré). Le crochet `seed` est déclaré et passe par `npx` — sans quoi la base
  restait vide et l'app intestable. **Redémarrer le service Render ensuite.**
- **Le serveur Render s'endort** après ~15 min : la première requête prend jusqu'à une minute. Les
  deux apps l'annoncent à l'utilisateur.
- **Captures d'écran impossibles sur l'appareil** : `screencap` renvoie 0 octet et `uiautomator`
  échoue (« could not get idle state ») à cause du fond animé. `MainActivity.kt:33` lève bien
  `FLAG_SECURE` en debug, mais **l'APK installé est antérieur** — un `gradlew installDebug` le
  débloquerait.
- **PowerShell 5.1** : `Set-Content -Encoding UTF8` ajoute un **BOM**. Utiliser
  `[System.IO.File]::WriteAllText` avec `UTF8Encoding($false)`.

---

## 10. 🔴 Le point le plus grave encore ouvert

Le compte **`super.admin` porte le mot de passe `admin123`** sur une API joignable depuis Internet,
avec le secret TOTP d'exemple public de la RFC (`JBSWY3DPEHPK3PXP`). Choisi explicitement par le
porteur après avertissement, et consigné dans le rapport de session.

**À changer avant toute ouverture à de vrais utilisateurs.**

---

## 11. Comment reprendre

1. Ce fichier.
2. [`rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md`](rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md)
   — le détail, avec ce qui est prouvé et ce qui ne l'est pas.
3. [`plan_frontend_web_2026-08-05.md`](plan_frontend_web_2026-08-05.md) — l'ordre de construction et
   l'état de chaque tâche.
4. La méthode qui a produit le meilleur résultat, et qui vient du porteur lui-même :

> « Lis la charte **avant** de dessiner. Décris en français simple **avant** de coder — chaque
> séquence, chaque conséquence de clic. Ce qui ne survit pas à l'explication est de la décoration. »

*Session du 2026-08-05 · 34 commits · `origin/main` = `53329cf`*

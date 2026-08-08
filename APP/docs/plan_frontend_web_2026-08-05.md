# Plan d'implémentation — Application web ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-08-05 |
| Statut | 🟡 **Proposé — non validé par le porteur** |
| Périmètre | `apps/web` uniquement (professionnels, structures, administration) |
| Documents liés | [`rapport_session_2026-08-05`](rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md) · [`cahier_des_charges/00_HOME`](cahier_des_charges/00_HOME.md) · [`plan_releases`](cahier_des_charges/01_architecture_fonctionnelle/plan_releases.md) |

> **Règle de ce plan** : rien n'est inventé. Chaque écran découle d'un cas d'utilisation déjà spécifié
> et déjà codé côté backend. Si une idée n'est rattachable à aucun `CU-xx-xx`, elle est **hors sujet**
> et doit être rejetée — le projet a un périmètre, ce plan le sert, il ne l'étend pas.

---

## 1. Le point de départ, sans complaisance

**Le backend est fait.** 13 modules, 505 tests verts, déployé. Ce n'est pas un projet à construire :
c'est un moteur complet qui attend son tableau de bord.

**Le web n'existe pas.** 4 pages d'authentification et un `DashboardPage` de 0,8 Ko. Rien d'autre.

**La conséquence produit est brutale et doit être dite** : un patient peut aujourd'hui dérouler tout
son parcours depuis le mobile, mais **aucun professionnel réel ne peut lui répondre**. Le cœur du
produit (M06, la poignée de main) est codé, testé, et **inutilisable** faute d'interface côté soignant.

C'est ce qui fixe l'ordre de tout ce qui suit.

## 2. Les quatre espaces à construire

Périmètre figé par D-039/D-044 : le web ne sert **jamais** les patients.

| Espace | Rôle(s) | Modules | Ce qu'il débloque |
|---|---|---|---|
| **Professionnel** | `PROFESSIONAL` | M03, M05, M06 ⭐, M07, M09, M13 | La boucle avec le mobile |
| **Pharmacie** | `FACILITY_MEMBER` (titulaire / membre) | M02, M03, M11, M09, M12, M13 | Le parcours médicament |
| **Administration** | `ADMIN` × 4 sous-rôles | M03, M04, M13, M16 | La vérification, donc la confiance |
| *(commun)* | tous | M01, M14 | Compte, sécurité, notifications |

Rappel non négociable — `EF-02-02` : **les permissions se vérifient au serveur à chaque requête.**
Une interface par rôle est du confort, jamais une sécurité.

## 3. Ordre de construction

```
Phase 0 — Fondations              (bloquant pour tout le reste)
Phase 1 — Authentification         (corriger l'existant)
Phase 2 — Espace Professionnel ⭐  (ferme la boucle avec le mobile)
Phase 3 — Espace Pharmacie
Phase 4 — Espace Administration
```

**Pourquoi Professionnel avant Pharmacie** : rien du parcours médicament n'est testable tant qu'aucun
soignant ne peut prescrire. Et la Phase 2 rend enfin vérifiable tout ce qui a été corrigé sur mobile
le 05/08 sans pouvoir l'être (voir rapport §6.2).

**Pourquoi Administration en dernier, malgré M03** : la vérification peut être faite à la main en base
pendant le pilote. Une interface d'admin ne débloque aucun autre travail.

**Jalon obligatoire** : à la fin de chaque phase, une démonstration de bout en bout. On ne commence pas
la suivante sans avoir montré la précédente qui marche — même règle que les 5 chantiers backend.

---

## Phase 0 — Fondations

*Rien de visible pour l'utilisateur. Tout le reste en dépend.*

| # | Tâche | État | Pourquoi |
|---|---|---|---|
| 0.1 | **Typographie conforme `CG-02`** | ✅ `d332ef2` | Le web portait la typo de **CMS-SARIS**, dont il est un port : titres en Sora (hors référentiel), corps en Plus Jakarta Sans (réservée aux titres), Inter absente. Corrigé : 3 familles conformes, 16 paliers avec taille + poids + interlignage, 16 classes `.t-*` |
| 0.2 | **Sortir la mise en page des `style={{}}` inline** | ✅ `5f36d7f` `e1375a4` `db9ec70` | Coquille, barre, topbar, menus, états d'écran, `Button`, `Field`, `Card`, `Select`, `Stepper`, `Skeleton`, `PageHeader`, `StatusPill`, `AuthLayout` et les **4 pages d'authentification**. Ne reste en inline que du **dynamique** qui n'a pas sa place en CSS : taille d'avatar, teinte d'un ton, position d'un menu, transformations du carrousel |
| 0.3 | **Coquille applicative par rôle** | ✅ `5f36d7f` | 3 états de barre (240 / 56 / surimpression), menu utilisateur, topbar sticky + grain, palette `Ctrl K` filtrée par capacité, thème clair/sombre/système |
| 0.4 | **États d'écran normalisés** | ✅ `5f36d7f` | Chargement (qui avoue sa lenteur à 4 s), erreur, hors-ligne, vide à action requise — `CG-08 §05/§06` |
| 0.5 | **Mettre en place les tests** | ✅ `e1375a4` | Vitest + jsdom + Testing Library, absents jusqu'ici. **18 tests** : filtrage de la navigation par rôle, structure du menu utilisateur (`CG-06 §07`), accessibilité des champs. Vérifiés par régression provoquée |

> **✅ Phase 0 terminée.** Les cinq tâches sont faites, vérifiées par build, tests et inspection dans
> un vrai navigateur. Les phases 1 à 4 peuvent commencer sur des fondations conformes.

### Écarts `CG-05` corrigés au passage (constatés le 05/08)

| Composant | Ce qu'il faisait | Règle enfreinte |
|---|---|---|
| `Button` | survol et pression en **JavaScript** (4 gestionnaires/bouton), inopérants au clavier | — (motif hérité de SARIS) |
| `Button` | grain **absent** du variant `ghost` | §01 « obligatoire sur tous les boutons » |
| `Button` | 3 tailles au lieu de 5 ; rayon constant ; opacité désactivée 0.55 | §01 (5 tailles, rayon indexé, 0.4) |
| `Field` | erreur en **texte rouge seul**, sans icône | §07 interdiction absolue |
| `StatusPill` | pas de bordure ; taille figée à **10px** hors échelle | §07 · `CG-02` |
| anneau de focus | 2px plein, décalage **−2px** | §01 (3px à 30 %, décalage +2px) |
| `--grain-btn` | **token inexistant** | §01 |
| tokens `--dur-*` | **inexistants**, chaque composant inventait sa durée | `CG-09 §01` |

> Le bloc `.dark` de `globals.css` était **du code mort** : couleurs recalculées, ombres désactivées,
> verre réaccordé — et rien ne posait jamais la classe. Le thème sombre n'a donc pas été « créé », il
> a été **branché**. Vérifié dans le navigateur : `html.dark`, fond `#0D1117`.

## Phase 1 — Authentification

*Les 4 pages existent. Il s'agit de les corriger, pas de les refaire.*

> **Phase 1 terminée le 2026-08-05.** Deux constats de l'audit se sont révélés FAUX à la vérification
> (1.2 et 1.4 : les règles étaient déjà appliquées côté serveur, je n'avais pas lu le routeur ni la
> garde). En revanche, trois défauts plus graves que prévu ont été trouvés en chemin : un **faux
> consentement** enregistré sans acceptation, un **endpoint de téléversement manquant** qui rendait le
> dossier de vérification impossible à remplir, et un **écran qui restait allumé** sur des données
> médicales après la fermeture de session.

| # | Gravité | Tâche | Réf. |
|---|---|---|---|
| 1.1 | ✅ `b82b500` | ~~Consentement absent~~ → en réalité **faux consentement enregistré** : le serveur créait les preuves inconditionnellement. Champ `acceptTerms` obligatoire, validé, transmis par les deux clients | `EF-01-08`, loi n° 29-2019 |
| ~~1.2~~ | ✅ | ~~Imposer le TOTP à l'inscription.~~ **Déjà fait** — `App.tsx:35` (`needsTotpSetup`) redirige toutes les routes vers la configuration TOTP tant qu'un compte non-patient ne l'a pas activée. Constaté par erreur comme manquant le 05/08, corrigé après vérification dans le navigateur | `EF-01-10` |
| 1.3 | ✅ `1bd069c` | Page « Ma vérification » + redirection après inscription. **Trou backend comblé** : aucun endpoint ne produisait la `fileKey` d'une pièce, le dossier était donc impossible à remplir | `CU-01-02`, `RM-02-04` |
| 1.4 | ✅ `54e9895` | ~~Expiration absente~~ → **déjà appliquée** par `auth.guard.ts`. Le vrai défaut était l'**écran** qui restait affiché sur des données médicales après la fermeture de session | `ENF-07`, `CU-01-03` |
| 1.5 | ✅ `dd20dcb` | Appareils connectés + déconnexion à distance. La session courante n'a volontairement pas de bouton | `EF-01-05`, `CU-01-06` |
| 1.6 | ✅ `dd20dcb` | Changement de numéro, deux codes, avec recul d'étape | `EF-01-07`, `CU-01-05` |
| 1.7 | ✅ `dd20dcb` | Clôture de compte : conséquence annoncée avant tout bouton, puis mot de passe + code | `EF-01-09`, `CU-01-07` |
| 1.8 | ✅ | Message de blocage : il existait mais **fuitait le code interne `(PM-18)`** et taisait la durée. Il annonce désormais les minutes restantes | `EF-01-06`, `PM-18` |

> ⚠️ 1.1 et 1.3 redéfinissent tous deux ce qui se passe **juste après** la création du compte. À
> traiter ensemble, dans l'ordre `consentement → TOTP (déjà en place) → dossier M03 → tableau de bord`.

> **Leçon de méthode, coûteuse et à retenir** : l'écart 1.2 avait été signalé 🔴 après lecture des
> 4 pages et du client API — mais **pas du routeur**, où vivait la protection. Auditer une application
> web sans lire `App.tsx` revient à juger un bâtiment sans regarder ses portes. Toute revue future
> commence par le routage et les gardes de route.

## Phase 2 — Espace Professionnel ⭐

*La phase qui ferme la boucle avec l'app mobile.*

> **Phase 2 terminée le 2026-08-05.** La boucle patient ↔ soignant existe désormais de bout en bout :
> un patient sollicite depuis le mobile, le soignant voit la demande arriver sans rafraîchir, confirme,
> le patient paie, la consultation s'ouvre des deux côtés, l'ordonnance est scellée avec garde-fou
> allergies, et le compte-rendu part au Carnet à vie. Ce parcours était codé et testé côté backend
> depuis des mois — il était **inatteignable** faute d'interface soignant.

| # | Écran | Module | État |
|---|---|---|---|
| 2.1 | **Dossier de vérification** — dépôt des pièces, suivi du statut | M03 | ✅ `1bd069c` |
| 2.2 | **Ma vitrine** — profil public, biographie | M05 | ✅ `7d98ff5` |
| 2.3 | **Mes offres de soin** — création, tarifs, retrait/republication | M05 | ✅ `7d98ff5` |
| 2.4 | **Ma présence** — 3 états + battement de cœur PM-26 | M05 | ✅ `7d98ff5` |
| 2.5 | **Poignées de main entrantes** ⭐ — confirmer ou refuser, fenêtre PM-07 | M06 | ✅ `e05d711` |
| 2.6 | **Session de soin** ⭐ — messagerie, minuteur serveur | M06 | ✅ `73adb05` |
| 2.7 | **Compte-rendu de fin** — obligatoire, versé au Carnet | M06 → M07 | ✅ `73adb05` |
| 2.8 | **Rédaction d'ordonnance** — garde-fou allergies bloquant | M09 | ✅ `e23fd12` |
| 2.9 | **Mes gains** — solde, mouvements, retrait en deux temps | M13 | ✅ |

**Trous backend comblés en chemin :** l'endpoint de téléversement des pièces de vérification
(`POST /v1/verification/me/documents/upload`) n'existait pas — le dossier était impossible à remplir
depuis un client.

**Ce que la phase a appris :** les trois pièges de navigation corrigés sur mobile le matin même
(interrogation liée au montage plutôt qu'au focus, décompte dépendant de l'objet entier, échec réseau
qui vide l'écran) se seraient reproduits à l'identique côté web. Ils ont été évités d'emblée.

**Jalon de la phase :** un vrai patient sur mobile et un vrai soignant sur web mènent une consultation
complète, de la poignée de main au compte-rendu. **C'est la première validation réelle du cœur du
produit** — et la vérification de tous les correctifs du 05/08 restés en suspens.

## Phase 3 — Espace Pharmacie

> **Phase 3 terminée le 2026-08-05.** Le parcours médicament est refermé : un soignant prescrit,
> l'ordonnance est scellée, la pharmacie la sert au comptoir et le stock se décrémente.
>
> **Deux trous backend comblés :** `GET /v1/facilities/me` (un membre ne pouvait pas découvrir sa
> propre structure — son espace était inatteignable) et `GET /v1/stocks/:id/items` (aucun listing du
> stock courant : seulement des mouvements et des alertes).

| # | Écran | Module | État |
|---|---|---|---|
| 3.1 | **Créer l'espace structure** — nom, arrondissement, horaires | M02 | ✅ `649d7ec` |
| 3.2 | **Membres et droits** — inviter, modifier, retirer | M02 | ✅ `649d7ec` |
| 3.3 | **Transfert de titularité** — OTP des deux parties | M02 | ⬜ reporté |
| 3.4 | **Stock par lots** — FEFO, fraîcheur PM-33, sorties motivées | M11 | ✅ `4826fd2` |
| 3.5 | **Délivrance d'ordonnance** — code QR, délivrance partielle | M09 | ✅ `4826fd2` |
| 3.6 | **Réservations reçues** — dévoilements, fenêtre 24 h | M12 | ⬜ reporté |
| 3.7 | **Gains et retraits** — *titulaire uniquement* | M13 | ⬜ reporté |

*Les trois points reportés ne bloquent aucun parcours : le transfert de titularité est une procédure
rare, les dévoilements arrivent avec la recherche patient (M12 côté mobile), et les gains de structure
réutiliseront la page déjà écrite pour le soignant en changeant le `holderType`.*

**Sensibilité aux droits :** `EF-02-05` — membres, contrat et retraits sont **réservés au titulaire**.
Stock et délivrances dépendent des droits accordés. Chaque écran doit refléter cette matrice.

## Phase 4 — Espace Administration

| # | Écran | Module | Sous-rôle | État |
|---|---|---|---|---|
| 4.1 | **File de vérification** — tri par urgence, décision motivée | M03 | Vérification | ✅ `8555ffd` |
| 4.7 | **KPIs du pilote** — les 7 critères de `plan_releases` §3 | M16 | Super | ✅ |
| 4.3 | **Intégrité du journal d'audit** — chaîne sha256 | M04 | Super | ✅ |
| 4.2 | **Contrats et avenants** | M03 | Vérification | ⬜ |
| 4.4 | **Signalements** | M04 | Super | ⬜ |
| 4.5 | **Supervision des paiements** | M13 | Finance | ⬜ |
| 4.6 | **Paramètres métier** — PM-01 → PM-40 | M16 | Super | ⬜ |
| 4.8 | **Sous-rôles admin** — attribution sous TOTP | M02 | Super | ⬜ |

*L'ordre de réalisation a suivi l'urgence produit, pas la numérotation : `4.1` conditionne la
visibilité de tout soignant, et `4.7` porte les critères qui décideront « V1 ou pivot ».*

---

## 4. Décisions à prendre avant de coder

Aucune ligne ne devrait être écrite avant que ces points soient tranchés.

| # | Question | Source | Impact si non tranché |
|---|---|---|---|
| D1 | **OTP : SMS ou email ?** La spécification dit SMS, le code fait email depuis juillet | `EF-01-01`, `RM-01-03` | On code d'après une spécification fausse |
| D2 | **TOTP obligatoire pour les pros, ou optionnel ?** `RM-01-06` dit optionnel, le web le déclare obligatoire | `RM-01-06` | Détermine 1.2, et le risque de verrouillage |
| D3 | **Connexion par téléphone ou par identifiant ?** | `EF-01-03` | Cohérence web/mobile |
| D4 | **Q-008 — cumul des casquettes** : un pharmacien peut-il être patient sur le même numéro ? Interdit au MVP | M02 §9 | Structure des comptes |
| D5 | **PM-22 — expiration des invitations** : 7 jours proposés, jamais validés | M02 §9 | Bloque 3.2 |
| D6 | **Polices du web** | `CG-02` | Bloque 0.1, donc tout |
| D7 | **3 ADR non confirmés** : agrégateur MoMo, hébergement, référentiel médicaments | `decisions_architecture` | Bloque la mise en production, pas le développement |

## 5. Ce qui est explicitement hors périmètre

À refuser si la demande se présente, sauf décision formelle inscrite au registre :

- **Les patients sur le web** — D-039/D-044, ils restent sur mobile.
- **M08 (triage), M10 (examens), M15 (urgence)** — V1, non codés côté backend.
- **Laboratoires comme structures** — V1 (`plan_releases`).
- **iOS, multilingue, épidémiologie** — V2 ou plus loin.
- **Tableaux de bord riches** — M16 au MVP est **réduit** : vérification + finance seulement.

## 6. Méthode de travail retenue

Reprise de la méthode qui a produit le résultat du 04/08 sur le mobile :

1. **Lire la charte avant de dessiner.** `CG-01` à `CG-11` ne sont pas une inspiration, ce sont des
   contraintes. L'écart le plus coûteux du mobile venait de leur non-application, pas d'un manque
   d'idées.
2. **Décrire en français simple avant de coder.** Chaque écran, chaque séquence, chaque conséquence de
   clic. Ce qui ne survit pas à l'explication est de la décoration.
3. **Valider avant d'écrire.** Le porteur valide une direction, pas des pixels.
4. **Un jalon démontrable par phase.** Pas de phase suivante sans démonstration de la précédente.

---

*Plan proposé le 2026-08-05 · Statut : en attente de validation · Index : [`cahier_des_charges/00_HOME`](cahier_des_charges/00_HOME.md)*

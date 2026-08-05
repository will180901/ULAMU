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

| # | Tâche | Pourquoi |
|---|---|---|
| 0.1 | **Décider des polices.** Le web embarque Plus Jakarta Sans, JetBrains Mono et **Sora** ; le mobile impose **Inter** pour le corps de texte. Trancher contre `CG-02` | Deux produits de la même marque ne peuvent pas diverger sur la typographie |
| 0.2 | **Sortir la mise en page des `style={{}}` inline.** Classes CSS adossées aux variables de la charte | Aujourd'hui rien n'empêche de s'écarter de `CG-01`/`CG-03`. C'est la dette qui coûtera le plus cher × 12 modules |
| 0.3 | **Coquille applicative par rôle** : `AppShell` + `Sidebar` pilotés par `navigation.config.ts` et `useCapabilities` *(la structure existe déjà, elle est à étendre)* | Chaque rôle voit son espace, et lui seul |
| 0.4 | **États d'écran normalisés** : chargement, vide, erreur, hors-ligne — conformes `CG-08`/`CG-11` | Le mobile les a (`ScreenState`), le web non |
| 0.5 | **Mettre en place les tests.** `apps/web` n'a **aucun test ni script de test** | Audit du 26/07, toujours vrai |

## Phase 1 — Authentification

*Les 4 pages existent. Il s'agit de les corriger, pas de les refaire.*

| # | Gravité | Tâche | Réf. |
|---|---|---|---|
| 1.1 | 🔴 | **Consentement CGU + confidentialité** à l'inscription : case non pré-cochée, bloquante, horodatée et versionnée. Ajouter le champ au contrat d'inscription | `EF-01-08`, loi n° 29-2019 |
| 1.2 | 🔴 | **Imposer le TOTP à l'inscription** — étape obligatoire avant l'accès au tableau de bord. Sans lui, un compte sans TOTP n'a aucune voie de récupération | `EF-01-10`, cohérence avec `ForgotPasswordPage` |
| 1.3 | 🔴 | **Rediriger vers le dossier de vérification M03** après création d'un compte professionnel, au lieu de `/dashboard` | `CU-01-02`, `RM-02-04` |
| 1.4 | 🟠 | **Expiration de session après 30 min d'inactivité** | `ENF-07`, `CU-01-03` |
| 1.5 | 🟠 | **Liste des appareils + déconnexion à distance** | `EF-01-05`, `CU-01-06` |
| 1.6 | 🟠 | **Changement de numéro** (OTP ancien **et** nouveau) | `EF-01-07`, `CU-01-05` |
| 1.7 | 🟠 | **Clôture de compte** | `EF-01-09`, `CU-01-07` |
| 1.8 | 🟡 | **Message explicite de blocage temporaire** après 5 échecs en 15 min | `EF-01-06`, `PM-18` |

> ⚠️ 1.2 et 1.3 se tiennent : ils redéfinissent tous deux ce qui se passe **juste après** la création
> du compte. À traiter ensemble, dans l'ordre `consentement → TOTP → dossier M03 → tableau de bord`.

## Phase 2 — Espace Professionnel ⭐

*La phase qui ferme la boucle avec l'app mobile.*

| # | Écran | Module | Cas d'utilisation |
|---|---|---|---|
| 2.1 | **Dossier de vérification** — dépôt des pièces, suivi du statut | M03 | `CU-03-01` |
| 2.2 | **Ma vitrine** — profil public, biographie, photo | M05 | `CU-05-01` |
| 2.3 | **Mes offres de soin** — création, tarifs, activation | M05 | `CU-05-02` |
| 2.4 | **Ma présence** — en ligne / hors ligne, battement de cœur | M05 | `CU-05-04` |
| 2.5 | **Poignées de main entrantes** ⭐ — confirmer ou refuser, fenêtre PM-07 | M06 | `CU-06-01`, `CU-06-02` |
| 2.6 | **Session de soin** ⭐ — messagerie temps réel côté soignant, minuteur serveur | M06 | `CU-06-03` |
| 2.7 | **Compte-rendu de fin** — versé au Carnet du patient | M06 → M07 | `CU-06-05` |
| 2.8 | **Rédaction d'ordonnance** — garde-fou allergies, QR scellé | M09 | `CU-09-01` |
| 2.9 | **Mes gains** — solde, historique, demande de retrait | M13 | `CU-13-04` |

**Jalon de la phase :** un vrai patient sur mobile et un vrai soignant sur web mènent une consultation
complète, de la poignée de main au compte-rendu. **C'est la première validation réelle du cœur du
produit** — et la vérification de tous les correctifs du 05/08 restés en suspens.

## Phase 3 — Espace Pharmacie

| # | Écran | Module | Cas d'utilisation |
|---|---|---|---|
| 3.1 | **Créer l'espace structure** — nom, arrondissement, GPS, horaires | M02 | `CU-02-01` |
| 3.2 | **Membres et droits** — inviter, modifier, suspendre, retirer | M02 | `CU-02-02` → `CU-02-04` |
| 3.3 | **Transfert de titularité** — OTP des deux parties | M02 | `CU-02-05` |
| 3.4 | **Stock par lots** — FEFO, fraîcheur PM-33 | M11 | `CU-11-01` |
| 3.5 | **Délivrance d'ordonnance** — scan du QR, délivrance partielle | M09 | `CU-09-03` |
| 3.6 | **Réservations reçues** — dévoilements, fenêtre 24 h | M12 | `CU-12-03` |
| 3.7 | **Gains et retraits** — *titulaire uniquement* | M13 | `CU-13-04` |

**Sensibilité aux droits :** `EF-02-05` — membres, contrat et retraits sont **réservés au titulaire**.
Stock et délivrances dépendent des droits accordés. Chaque écran doit refléter cette matrice.

## Phase 4 — Espace Administration

| # | Écran | Module | Sous-rôle |
|---|---|---|---|
| 4.1 | **File de vérification** — dossiers pros et structures | M03 | Vérification |
| 4.2 | **Contrats et avenants** | M03 | Vérification |
| 4.3 | **Journal d'audit** — chaîne sha256 inaltérable | M04 | Super |
| 4.4 | **Signalements** | M04 | Super |
| 4.5 | **Supervision des paiements** — répartitions, remboursements | M13 | Finance |
| 4.6 | **Paramètres métier** — PM-01 → PM-40, jamais en dur | M16 | Super |
| 4.7 | **KPIs du pilote** — les 7 indicateurs de `plan_releases` §3 | M16 | Super |
| 4.8 | **Sous-rôles admin** — attribution sous TOTP | M02 | Super |

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

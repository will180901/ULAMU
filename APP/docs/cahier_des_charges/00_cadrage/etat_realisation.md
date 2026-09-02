# État de Réalisation — ULAMU (le « où en est-on »)

| Champ | Valeur |
|---|---|
| Version | 1.1 |
| Date | **2026-08-05** (mise à jour frontend ; backend inchangé depuis 2026-06-13) |
| Statut | 🟢 Vivant — mis à jour à chaque chantier |
| Documents liés | [[registre_decisions]] · [[plan_releases]] · [[reference_technique]] · [`rapport_session_2026-08-05`](../../rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md) · [`plan_frontend_web`](../../plan_frontend_web_2026-08-05.md) |

> **Page de reprise du « deuxième cerveau ».** Pour savoir ce qui est construit, testé, et ce qui
> reste — sans relire tout le code. Le détail de chaque décision est dans [[registre_decisions]]
> (D-045 → D-050, un par chantier).

---

## 1. État global

**Le backend MVP est COMPLET et poussé** (`origin/main`, dépôt GitHub `will180901/ULAMU`).

- **13 modules livrés** : M01-M07, M09, M11, M12, M13, M14, M16.
- **505 tests verts** (21 suites : 15 unitaires sans base + 6 d'intégration contre PostgreSQL réel).
- **Stack** ([[decisions_architecture]]) : NestJS 10 (monolithe modulaire, 1 dossier/module), Prisma 5 + PostgreSQL,
  TypeScript strict. Crypto maison (scrypt, TOTP RFC 6238, AES-GCM, chaîne sha256 d'audit), zéro dépendance native.
- **Frontend** : `apps/mobile` (React Native, patients), `apps/web` (React + Vite, pros/structures/admin) — maquettes par le porteur (D-039/D-044).

## 2. Les 5 chantiers (ordre du [[plan_releases]] §2)

| Chantier | Périmètre | Commit | Décision |
|---|---|---|---|
| 1 | Socle (NestJS+Prisma, params, outbox, audit chaîné, AuthGuard/AdminGuard, crypto) + M01-M04 | `ab487e7`, `7b16cc3` | D-045, D-046 |
| 2 | Flux d'argent : M13 Paiements & Gains + M14 Notifications (faux agrégateur MoMo) | `50b1392` | D-047 |
| 3 | Le cœur ⭐ : M07 Carnet, M05 Annuaire, M06 Poignée de main & Session | `5330e0b` | D-048 |
| 4 | Le médicament : M11 Stocks, M09 Ordonnance, M12 Recherche/Dévoilement (C3/C7) | `53f0dde` | D-049 |
| 5 | Pilotage : M16 (KPIs pilote, back-office, paramètres, **cadence des balayages**) | `001ba52` | D-050 |

Chaque chantier : schéma posé → workflow multi-agents (implémentation) → **vérification adversariale** → correctifs → test d'intégration → commit. Les revues ont trouvé et corrigé des bugs réels à chaque fois (course capture/refund, sur-réservation, délivrance sur ordonnance morte, arbitrage hors frontière, etc.).

## 3. Réalisation par module

| Module | MVP | Réalisé | Note |
|---|---|---|---|
| M01 Comptes & Auth | ✅ | ✅ | OTP SMS + TOTP, sessions opaques révocables |
| M02 Rôles & Structures | ✅ | ✅ | Pharmacies (labos V1), permissions, transfert titularité |
| M03 Vérification & Contrats | ✅ | ✅ | Badge + contrat signé (C6), avenant sur changement de taux |
| M04 Audit & Signalements | ✅ | ✅ | Journal chaîné sha256 inaltérable, outbox poller |
| M05 Annuaire | ✅ | ✅ | Vitrines vérifiées, offres, présence, alertes dispo |
| M06 Poignée & Session ⭐ | ✅ | ✅ | Invariant n°1 + n°9 (D-008), capture différée, temps serveur |
| M07 Carnet | ✅ | ✅ | À vie immuable, Carnet familial, revendication majorité |
| M09 Ordonnance | ✅ | ✅ | QR scellé, garde-fou allergies, délivrance multi-pharmacies |
| M11 Stocks | ✅ | ✅ | FEFO, fraîcheur PM-33, disponibilité C7 |
| M12 Recherche/Dévoilement | ✅ | ✅ | Modèle signature D-009, réservation 24 h, garantie Q-004 |
| M13 Paiements & Gains | ✅ | ✅ | Argent aveugle (C1), faux agrégateur MoMo, remboursements |
| M14 Notifications | ✅ | ✅ | Catalogue de templates, in-app + push, préférences |
| M16 Pilotage | ✅ *(réduit)* | ✅ | KPIs pilote, back-office, paramètres, cadence @Cron |
| **M08 Missions de Triage** | 🔜 V1 | ⬜ | Constantes à domicile, code de visite, poignée de main terrain (D-042) |
| **M10 Examens & Résultats** | 🔜 V1 | ⬜ | Demandes d'examens, labos, résultats versés au Carnet (D-043) |
| **M15 Urgence** | 🔜 V1 | ⬜ | Fiche vitale, QR 4 h + carte imprimée, jamais monétisé (D-041) |

## 4. Reste à faire

### 4.1 Modules V1 (spécifiés, non codés) — « on y touchera plus tard »
- **M08 Missions de Triage** : un soignant produit des constantes à domicile → entrées Carnet (D-018) ; rayon d'intervention PM-39 ; paiement via C1 ; poignée de main terrain. Dépend de M06/M07/M13.
- **M10 Examens & Résultats** : le prescripteur demande des examens en session ; les laboratoires (structures M02, comme les pharmacies) déposent les résultats → Carnet (C2, D-015) ; expiration PM-40. Dépend de M06/M07/M02 + recrutement labos.
- **M15 Urgence** : fiche vitale extraite du Carnet (allergies, groupe sanguin, contact) ; QR temporaire 4 h (PM-38) + carte imprimée ; jamais monétisé. Dépend de M07.

### 4.2 Dé-scopes techniques reportés (à traiter avant/pendant la prod)
- **Agrégateur Mobile Money réel** (⚠️ ADR-09) : remplacer le faux `aggregator.gateway.ts` (interface charge/refund/payout/webhook déjà prête) par le prestataire CEMAC retenu + barème de frais réels.
- **Hébergement** (⚠️ ADR-08) + statut DELIVERED des push (FCM).
- **Référentiel Médicaments** : source initiale (liste nationale + compléments) — conditionne le garde-fou M09 et la recherche M12.
- **Canal SMS** des notifications (V1, coût) ; **PDF imprimable** de l'ordonnance (passerelle papier, Phase 4 UX).
- **Différé des paramètres** (`effectiveAt` futur) : refusé au MVP, à implémenter en V1 (M16).
- **Décrément stock conscient des réservations** (M09/M11) : limite assumée, rattrapée par la garantie Q-004 (D-049).
- **Export Carnet par période** (M07), recalcul quotidien des stats M05, photo de profil publique.

### 4.3 Hors logiciel — préalables au lancement ([[plan_releases]] §4)
1. Avis de l'avocat congolais ([[cadre_reglementaire]] §7) — questions ouvertes Q-003 (validité ordonnance) restantes.
2. Contact Ministère de la Santé / Ordre des médecins (R-01).
3. Contrat agrégateur Mobile Money signé.
4. Enquête terrain (≥ 20 entretiens, R-02).
5. ≥ 15 professionnels et ≥ 10 pharmacies pré-engagés.

### 4.4 Frontend — mis à jour le 2026-08-05

**⚠️ La mention « non démarré » de la version 1.0 est périmée.** État réel :

| Couche | État | Détail |
|---|---|---|
| `apps/mobile` (patients) | 🟢 **très avancé** | 25 écrans navigables, parcours patient quasi complet. Navigation retour auditée et corrigée le 05/08 (8 familles de défauts). Inscription vérifiée de bout en bout sur appareil. 7 tests |
| `apps/web` (pros/structures/admin) | 🔴 **quasi inexistant** | 4 pages d'authentification + un `DashboardPage` de 0,8 Ko. **Aucun module métier.** Aucun test |

**Conséquence produit à ne pas perdre de vue** : le backend implémente 13 modules avec 505 tests, et
un patient peut dérouler tout son parcours depuis le mobile — mais **aucun professionnel réel ne peut
lui répondre**, faute d'interface côté soignant. Le cœur du produit (M06) est codé, testé, et
inutilisable.

**Six écarts constatés sur l'authentification web** (3 graves : consentement légal absent, verrouillage
définitif possible faute de TOTP imposé, inscription professionnelle sans redirection vers M03) —
détail dans [`rapport_session_2026-08-05`](../../rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md) §7.

**Plan de construction du web** : [`plan_frontend_web_2026-08-05`](../../plan_frontend_web_2026-08-05.md)
— 5 phases, 7 décisions à trancher avant de coder.

- Charte graphique existante (`docs/Charte Graphique/`, CG-01→CG-11) + maquettes `Maquettes_ULAMU/` (référence visuelle, **jamais transformées en app** — la stack décidée fait foi).

### 4.5 Dérives documentaires à arbitrer (constatées le 2026-08-05)

Trois décisions réelles n'ont jamais été consignées. **Un lecteur qui coderait d'après M01 aujourd'hui
se tromperait.**

| Le cahier des charges dit | Le code fait | Depuis |
|---|---|---|
| OTP par **SMS** (`EF-01-01`, `EF-01-04`, `RM-01-03`) | par **email** (Brevo) | juillet 2026 |
| Connexion par **téléphone** (`EF-01-03`) | nom d'utilisateur **ou** email | juillet 2026 |
| ~~TOTP **optionnel** pour les pros (`RM-01-06`)~~ | ~~déclaré **obligatoire** sur le web~~ | ✅ **soldée le 02/09/2026** — [[registre_decisions#D-053 — Le TOTP est optionnel pour tous les types de compte|D-053]] : optionnel pour TOUS, et le web l'annonce ainsi |

À trancher : corriger la spécification, ou corriger le code.

## 5. Comment reprendre efficacement
0. ⭐ **COMMENCER ICI** : [`PASSATION_2026-08-05.md`](../../PASSATION_2026-08-05.md) — passation
   complète de la session du 05/08 (les 3 parcours fermés, 5 trous backend comblés, 2 constats
   d'audit faux rectifiés, pièges de l'environnement, ce qui reste).
0 bis. **Frontend, détail** : lire [`rapport_session_2026-08-05`](../../rapport_session_2026-08-05_navigation_mobile_et_cadrage_web.md)
   (état réel des deux apps, ce qui est vérifié et ce qui ne l'est pas) puis
   [`plan_frontend_web_2026-08-05`](../../plan_frontend_web_2026-08-05.md) (ordre de construction).
   ⚠️ **Point le plus grave ouvert** : le compte SUPER_ADMIN de production porte le mot de passe
   `admin123` depuis le seed du 05/08 — rapport §6.1.
1. Lire CETTE page + [[registre_decisions]] (D-045→D-050) pour l'état du code.
2. Le contrat de chaque frontière inter-module : [[plan_modules]] (C1-C7) et l'en-tête des services exportés.
3. Les chiffres du métier : [[parametres_metier]] (PM-01→PM-40, jamais en dur — `ParamsService`).
4. Les invariants à ne jamais casser : [[strategie_tests]] (liste rouge) + les tests d'intégration `apps/api/test/chantierX.int.spec.ts`.

---

*Phase de réalisation — document vivant · Précédent : [[plan_releases]] · Index : [[../00_HOME|HOME]]*

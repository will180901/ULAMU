# Référence Technique — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟡 En revue (porteur) |
| Documents liés | [[../03_conception_transverse/decisions_architecture|ADR]] · [[../03_conception_transverse/modele_menaces|menaces §4]] · [[../01_architecture_fonctionnelle/plan_releases|plan_releases]] |

> Le document d'entrée des développeurs : structure du code, conventions, environnements. Il applique les ADR — il ne décide rien de nouveau.

---

## 1. Structure du dépôt (monorepo)

```
ULAMU/APP/                          ← racine du dépôt git (= coffre Obsidian du projet)
├── docs/                           # TOUTE la documentation, regroupée
│   ├── cahier_des_charges/         # Le deuxième cerveau : décisions, modules, conception
│   ├── Charte Graphique/           # CG-01 → CG-11 (référence des thèmes mobile/desktop)
│   └── prompt/                     # Prompt générique V2 + méthodologie réutilisable
├── Maquettes_ULAMU/                # Export Claude Design (D-044) — référence visuelle, jamais du code de production
│
├── apps/
│   ├── api/                        # Backend NestJS (ADR-03)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/             # garde d'auth, intercepteur d'audit (C5), idempotence (ADR-12), erreurs
│   │   │   └── modules/            # UN DOSSIER PAR MODULE — la règle d'or
│   │   │       ├── m01-accounts/
│   │   │       │   ├── m01.module.ts
│   │   │       │   ├── m01.controller.ts      # endpoints /v1/accounts…
│   │   │       │   ├── m01.service.ts         # règles RM-01-xx
│   │   │       │   ├── m01.events.ts          # outbox (ADR-11) : « compte créé » → M03/M07
│   │   │       │   └── m01.spec.ts            # tests des CU-01-xx
│   │   │       ├── m02-roles-structures/
│   │   │       ├── m03-verification-contracts/
│   │   │       ├── m04-audit-reports/
│   │   │       ├── m05-directory/
│   │   │       ├── m06-handshake-session/     # ⭐ le cœur
│   │   │       ├── m07-health-record/
│   │   │       ├── m09-prescription/
│   │   │       ├── m11-stock/
│   │   │       ├── m12-search-reveal/
│   │   │       ├── m13-payments/
│   │   │       ├── m14-notifications/
│   │   │       └── m16-admin/
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # entités du dictionnaire central
│   │   │   └── seed.ts             # PM-01 → PM-37 + données dev (personas)
│   │   └── test/                   # intégration contrats C1-C7 + invariants « liste rouge »
│   │
│   ├── mobile/                     # React Native — PATIENTS (ADR-04)
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   │   ├── accueil/        # onglet ① : annuaire, recherche médicaments (D-013)
│   │   │   │   ├── consultations/  # onglet ② : sessions + décompteur, ordonnances
│   │   │   │   ├── mon-espace/     # onglet ③ : profil, Carnet, reçus
│   │   │   │   └── urgence/        # bouton flottant (V1)
│   │   │   ├── offline/            # SQLite chiffrée, file d'actions, sync delta
│   │   │   ├── services/           # client API, websocket, notifications
│   │   │   └── theme/              # tokens issus de la Charte Graphique CG-01/02/03
│   │   └── android/
│   │
│   └── desktop/                    # Next.js + Electron — PROS / STRUCTURES / ADMIN (ADR-05)
│       ├── src/app/
│       │   ├── (professionnel)/    # offres, poignées de main, sessions, gains
│       │   ├── (structure)/        # stock, délivrances, réservations, membres
│       │   └── (admin)/            # vérification, modération, finance, paramètres
│       ├── src/realtime/           # socket : initiations sonores < 5 s (ENF-09)
│       └── electron/               # main process, auto-update, badge présence (PM-26)
│
├── packages/
│   ├── contracts/                  # LA source unique : entités du dictionnaire + contrats C1-C7 + DTOs (ADR-02)
│   └── shared/                     # validation, format XAF, dates UTC, clés des paramètres PM
│
├── infra/
│   ├── docker-compose.dev.yml      # PostgreSQL + Redis + MinIO + faux agrégateur MoMo
│   └── ci/                         # pipeline lint + tests + build
│
├── tools/                          # scripts (vérif cohérence, génération contracts)
├── package.json                    # racine pnpm workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore                      # .env, node_modules, builds…
└── README.md                       # porte d'entrée → docs/cahier_des_charges/00_HOME.md
```

**Règles de structure (héritées des principes du projet) :**
- Chaque module backend = son dossier, ses tests, **aucun import direct des entités d'un autre module** — uniquement via `packages/contracts` (frontières C1-C7, ADR-01).
- Toute la documentation reste regroupée sous `docs/` — jamais de doc éparpillée.
- Les écrans mobile/desktop sont organisés par parcours (🅰🅱🅲), pas par type de composant.

## 2. Outillage

| Sujet | Choix | Note |
|---|---|---|
| Langage | TypeScript strict partout | ADR-02 ; `strict: true`, pas de `any` non justifié |
| Gestionnaire | pnpm + workspaces | Monorepo léger |
| ORM | Prisma (PostgreSQL) | Migrations versionnées ; tables immuables (Carnet, audit, mouvements) = **insertion seule**, vérifiée par revue de migration |
| Files/temps réel | Redis + Socket.io | ADR-06/11 ; motif outbox obligatoire pour C3/C4/C5/C7 |
| Tests | Vitest/Jest (unitaires + intégration), Maestro ou Detox (E2E mobile), Playwright (desktop) | La pyramide de [[../03_conception_transverse/strategie_tests|strategie_tests]] |
| Qualité | ESLint + Prettier, hooks de pre-commit | Aucun commit sans lint + tests verts |
| Secrets | `.env` jamais commis ; gestionnaire de secrets en production | Menaces §4.1 |
| CI | Lint + tests à chaque commit ; build + E2E sur branche principale ; déploiement recette automatique | |

## 3. Conventions

- **Nommage** : code et identifiants en anglais ; vocabulaire métier du [[../01_architecture_fonctionnelle/glossaire|glossaire]] traduit de façon stable (Carnet → `healthRecord`, Poignée de main → `handshake`, Dévoilement → `reveal`, Session → `careSession`) — table de correspondance tenue dans `packages/contracts/GLOSSARY.md`.
- **Commits** : convention `type(module): message` — ex. `feat(m06): handshake confirmation expiry (PM-07)`. Toujours référencer l'exigence (EF/RM/PM) quand pertinent.
- **Branches** : `main` (stable) ← `dev` ← branches par fonctionnalité `m06/handshake`.
- **Terminal** : une commande par ligne, pas d'enchaînements `&&` (règle du porteur, Référence d'environnement).
- **Paramètres** : tout PM-xx vit en base (`ParametrePlateforme`) avec valeurs par défaut seedées — **jamais de chiffre métier en dur** (Definition of Done).
- **Erreurs API** : enveloppe uniforme `{ code, message, reference }`, codes stables documentés dans `contracts`.
- **Horodatage** : UTC partout en interne (PM-14), conversion à l'affichage uniquement.

## 4. Environnements

| Env | Usage | Données | Paiements |
|---|---|---|---|
| `dev` (local) | docker-compose : PostgreSQL + Redis + MinIO (S3 local) + faux agrégateur | Générées (seed personas) | Simulés |
| `recette` | E2E, recette humaine, démos de fin de chantier | Fictives réalistes | Agrégateur en bac à sable |
| `production` | Le réel | Jamais copiées ailleurs (loi 29-2019) | Réels |

## 5. Ordre de développement (rappel des chantiers, D-026)

```
Chantier 1 — Socle :        M01 → M02 → M03 (+ M04 en continu)
Chantier 2 — Argent :       M13 (agrégateur bac à sable) → M14
Chantier 3 — Cœur ⭐ :      M07 → M05 → M06
Chantier 4 — Médicament :   M11 → M09 → M12
Chantier 5 — Pilotage :     M16 (back-office minimal, en parallèle dès le Chantier 1)
```

Chaque chantier se termine par une **démonstration fonctionnelle** (jalon) + les invariants de la liste rouge au vert.

## 6. Préalables au premier commit

1. Initialiser le dépôt **git** (le projet n'en a pas encore) + monorepo pnpm + squelette NestJS/React Native/Electron.
2. Seed des `ParametrePlateforme` depuis [[../01_architecture_fonctionnelle/parametres_metier|parametres_metier]] (PM-01 → PM-37).
3. Générer `packages/contracts` : types des entités du [[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] + contrats C1-C7.
4. docker-compose `dev` opérationnel + CI minimale.
5. En parallèle (non bloquant pour le code, bloquant pour le lancement) : plan réglementaire actions 1-4 ([[../00_cadrage/cadre_reglementaire|cadre]] §7).

---

*Index : [[../00_HOME|HOME]]*

# ULAMU — Plateforme de santé numérique (Congo-Brazzaville)

> Consultation par session chronométrée, ordonnance numérique à QR, recherche de médicaments par dévoilement-réservation, Carnet de santé à vie.

## 📖 Commencer ici

**Toute la connaissance du projet vit dans le coffre Obsidian : [`docs/cahier_des_charges/00_HOME.md`](docs/cahier_des_charges/00_HOME.md)**
(40+ décisions numérotées, 40 paramètres métier, 16 modules spécifiés, ADR, menaces, tests — tout est lié.)

| Document clé | Rôle |
|---|---|
| [`docs/cahier_des_charges/00_HOME.md`](docs/cahier_des_charges/00_HOME.md) | Index navigable de tout le projet |
| [`docs/cahier_des_charges/00_cadrage/registre_decisions.md`](docs/cahier_des_charges/00_cadrage/registre_decisions.md) | Chaque décision validée (D-001 → …) |
| [`docs/cahier_des_charges/05_reference_technique/reference_technique.md`](docs/cahier_des_charges/05_reference_technique/reference_technique.md) | Structure du code, conventions, environnements |
| [`docs/cahier_des_charges/04_ux_ui/README.md`](docs/cahier_des_charges/04_ux_ui/README.md) | Maquettes officielles (Claude Design) + règles d'usage |

## 🏗️ Monorepo

```
apps/api      → Backend NestJS + Prisma/PostgreSQL (un dossier par module M01-M16)
apps/mobile   → React Native — application PATIENTS (Android d'abord)
apps/desktop  → Next.js + Electron — PROFESSIONNELS / STRUCTURES / ADMIN
packages/contracts → Types partagés : entités + contrats C1-C7 (source unique)
packages/shared    → Utilitaires communs (validation, XAF, dates UTC)
infra         → docker-compose dev, CI
```

## 🚀 Démarrage (développement)

```
corepack enable
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d
pnpm dev:api
```

*(Une commande par ligne — règle du projet. Les applications seront échafaudées au Chantier 1 : voir [`reference_technique.md`](docs/cahier_des_charges/05_reference_technique/reference_technique.md) §5.)*

## 📐 Règles d'or du code

1. Un module = un dossier ; **aucun import direct entre modules** — tout passe par `packages/contracts` (C1-C7).
2. **Aucun chiffre métier en dur** : tout paramètre vient de la base (PM-01 → PM-40).
3. Les 10 invariants de la « liste rouge » ne se négocient pas ([`strategie_tests.md`](docs/cahier_des_charges/03_conception_transverse/strategie_tests.md) §2).
4. Aucun secret dans le dépôt. Jamais.

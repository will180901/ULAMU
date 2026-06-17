# @ulamu/api — Backend NestJS

> Échafaudé au **Chantier 1** (`nest new` + Prisma). Ne pas créer à la main : voir `docs/cahier_des_charges/05_reference_technique/reference_technique.md`.

## Structure cible

```
src/
├── main.ts
├── app.module.ts
├── common/          # garde d'auth, intercepteur d'audit (C5), idempotence (ADR-12), erreurs
└── modules/         # UN DOSSIER PAR MODULE — aucun import entre modules (contrats C1-C7 uniquement)
    ├── m01-accounts/            (MVP — Chantier 1)
    ├── m02-roles-structures/    (MVP — Chantier 1)
    ├── m03-verification-contracts/ (MVP — Chantier 1)
    ├── m04-audit-reports/       (MVP — Chantier 1, en continu)
    ├── m05-directory/           (MVP — Chantier 3)
    ├── m06-handshake-session/   (MVP — Chantier 3 ⭐)
    ├── m07-health-record/       (MVP — Chantier 3)
    ├── m08-triage-missions/     (V1)
    ├── m09-prescription/        (MVP — Chantier 4)
    ├── m10-lab-orders/          (V1)
    ├── m11-stock/               (MVP — Chantier 4)
    ├── m12-search-reveal/       (MVP — Chantier 4)
    ├── m13-payments/            (MVP — Chantier 2)
    ├── m14-notifications/       (MVP — Chantier 2)
    ├── m15-emergency/           (V1)
    └── m16-admin/               (MVP — Chantier 1/5, réduit)

prisma/
├── schema.prisma    # entités du dictionnaire central (modele_donnees_global.md)
└── seed.ts          # PM-01 → PM-40 + données dev (personas)
```

Spécifications : `docs/cahier_des_charges/02_modules/` — chaque EF/RM/CU y est défini avec ses critères d'acceptation.

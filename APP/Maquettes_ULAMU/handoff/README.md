# ULAMU — Paquet de handoff développeur

> **But** : permettre à un agent de développement (Claude Code) ou à une équipe d'implémenter ULAMU de A à Z à partir (1) des maquettes interactives de `ui_kits/`, (2) du design system de ce dépôt, (3) du `cahier_des_charges/` du porteur. Ce paquet transforme chaque maquette en spécification : écrans → routes → états → événements → données, et liste explicitement **ce qui reste à trancher**.

## Comment utiliser ce paquet avec Claude Code

1. Lire `SKILL.md` et `readme.md` (racine) — règles de marque, tokens, composants.
2. Lire le document de la surface à implémenter (ci-dessous) **en gardant la maquette ouverte** : la maquette est la source de vérité visuelle et d'interaction ; le document décrit le contrat fonctionnel et les cas limites.
3. Les composants React de `components/` sont des **références cosmétiques** : en production, les réimplémenter dans la stack cible (ou les durcir), mais conserver les tokens CSS de `tokens/` tels quels.
4. Toute question marquée **[À TRANCHER]** doit être posée au porteur avant d'implémenter — ne pas inventer.

## Contenu

| Document | Surface | Maquette de référence |
|---|---|---|
| `01-app-patient.md` | App mobile patient | `ui_kits/patient_mobile/` |
| `02-cockpit-pro.md` | Desktop soignant | `ui_kits/professionnel_desktop/` |
| `03-structures.md` | Pharmacie + Laboratoire | `ui_kits/structure_pharmacie/`, `ui_kits/structure_labo/` |
| `04-backoffice.md` | Back-office ULAMU | `ui_kits/backoffice/` |
| `05-fondations-techniques.md` | Transverse : auth, paiement, QR, offline, messagerie, sécurité | toutes |

## Principes non négociables (rappel du cahier des charges)

- **D-007 — Poignée de main avant paiement** : aucun débit tant que le soignant n'a pas confirmé. Remboursement automatique en cas de défaillance.
- **D-006 — Session chronométrée** : décompteur toujours visible, prolongation gratuite possible.
- **D-009 — Dévoilement-réservation** : la disponibilité anonyme est gratuite ; le dévoilement payant (500 F) garantit la réservation 24 h.
- **Dossier médical à vie** : chaque acte (consultation, ordonnance, délivrance, triage, résultat) écrit dans le dossier du patient.
- **Badge vérifié (M03)** : accordé uniquement par le back-office, décision tracée.
- **Journal inaltérable (M04)** : append-only, chaîné par empreinte, lecture seule pour tous.
- **Confidentialité** : contenu médical chiffré ; jamais de contenu médical dans les notifications/écran verrouillé.
- **Français uniquement** au lancement ; argent au format `5 000 F` ; vouvoiement ; **jamais d'emoji** dans l'UI.
- **Contraintes terrain** : Android 8+/2 Go RAM, réseau intermittent, vocal en première classe, QR lisibles en plein soleil (zone blanche forcée).

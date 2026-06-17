# État de Réalisation — ULAMU (le « où en est-on »)

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-13 |
| Statut | 🟢 Vivant — mis à jour à chaque chantier |
| Documents liés | [[registre_decisions]] · [[plan_releases]] · [[reference_technique]] |

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
- **Frontend** : pas encore démarré (`apps/mobile` React Native patients, `apps/desktop` Next.js + Electron pros/structures/admin) — maquettes par le porteur (D-039/D-044).

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

### 4.4 Frontend (non démarré)
- `apps/mobile` (React Native, patients) ; `apps/desktop` (Next.js + Electron, pros/structures/admin).
- Charte graphique existante (`docs/Charte Graphique/`, CG-01→CG-11) + maquettes `Maquettes_ULAMU/` (référence visuelle, **jamais transformées en app** — la stack décidée fait foi).

## 5. Comment reprendre efficacement
1. Lire CETTE page + [[registre_decisions]] (D-045→D-050) pour l'état du code.
2. Le contrat de chaque frontière inter-module : [[plan_modules]] (C1-C7) et l'en-tête des services exportés.
3. Les chiffres du métier : [[parametres_metier]] (PM-01→PM-40, jamais en dur — `ParamsService`).
4. Les invariants à ne jamais casser : [[strategie_tests]] (liste rouge) + les tests d'intégration `apps/api/test/chantierX.int.spec.ts`.

---

*Phase de réalisation — document vivant · Précédent : [[plan_releases]] · Index : [[../00_HOME|HOME]]*

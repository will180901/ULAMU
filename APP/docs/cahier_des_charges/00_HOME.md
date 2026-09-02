# 🧠 ULAMU — Cahier des Charges (Deuxième Cerveau)

> Coffre Obsidian du projet ULAMU — Plateforme de santé numérique, Congo-Brazzaville.
> Chaque document est lié aux autres. Ouvrir ce dossier comme coffre dans Obsidian pour naviguer.

## 📍 Navigation

> 🚧 **Où en est le code ?** → [[etat_realisation]] (backend MVP COMPLET : 13 modules, 505 tests ;
> reste M08/M10/M15 en V1). C'est la page de reprise.

### Phase 0 — Cadrage & Faisabilité
- [[vision]] — Le problème, la solution, le modèle économique ⬅️ *commencer ici*
- [[registre_decisions]] — Toutes les décisions validées (document vivant)
- [[etat_realisation]] — état de la réalisation (code) : chantiers, modules construits, reste à faire
- [[personas_parcours]] — 8 personas + les 3 parcours de référence
- [[etude_concurrence]] — panorama régional, différenciateurs, menaces
- [[cadre_reglementaire]] — lois identifiées, vides juridiques, plan d'action légal
- [[modele_economique]] — sources de revenus, taux validés (10 % / 500 XAF), viabilité
- [[registre_risques]] — 12 risques majeurs + actions immédiates

### Phase 1 — Architecture fonctionnelle
- [[glossaire]] — le langage ubiquitaire du projet (7 familles de termes)
- [[carte_domaines]] — 10 domaines, règles anti-cycles, frontières contractuelles
- [[plan_modules]] — 16 modules, graphe acyclique vérifié, 7 contrats d'interface
- [[modele_donnees_global]] — ~30 entités, dictionnaire central, 5 règles d'intégrité
- [[parametres_metier]] — tous les chiffres du métier (PM-01 à PM-16)
- [[exigences_non_fonctionnelles]] — 9 exigences mesurables (matériel, data, offline, sécurité)
- [[plan_releases]] — MVP 12 modules, ordre de construction, critères de succès du pilote

### Phase 2 — Modules (12 au MVP)
- [[M01_comptes_authentification]] — le socle : comptes, OTP, TOTP, sessions de connexion
- [[M02_roles_espaces_structures]] — permissions par rôle. ⚠️ Les **espaces pharmacies (titulaire/membres) sont retirés du produit** le 02/09/2026 ([[registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]]) : la pharmacie reste un objet du modèle, plus un titulaire de compte.
- [[M03_verification_contrats]] — badges, dossiers de vérification, contrats signés
- [[M04_audit_signalements]] — journal inaltérable + modération simple
- [[M05_annuaire_professionnels]] — vitrine, offres, filtres, présence en ligne
- [[M06_poignee_session]] ⭐ — le cœur : poignée de main, session chronométrée, compte-rendu
- [[M07_carnet]] — la mémoire médicale à vie + carnet familial
- [[M09_ordonnance_delivrance]] — ordonnance signée QR, garde-fou allergies, délivrance
- ~~[[M11_stocks_catalogues]]~~ — ❌ **retiré du produit le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]])
- ~~[[M12_recherche_devoilement]]~~ — ❌ **retiré le 02/09/2026** ([[registre_decisions#D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)|D-052]]). ⚠️ Le référentiel médicaments passe à M09, sans changer d'adresse
- [[M13_paiements_gains]] — l'argent aveugle : MoMo, répartitions, gains, retraits
- [[M14_notifications_rappels]] — service aveugle : push, centre in-app, rappels de médicaments
- [[M16_pilotage_administration]] — back-office, paramètres, KPIs du pilote
- [[M15_urgence]] *(V1)* — fiche vitale, QR 4 h + carte imprimée, jamais monétisé
- [[M08_missions_triage]] *(V1)* — constantes à domicile, code de visite, poignée de main
- [[M10_examens_resultats]] *(V1)* — demandes d'examens, labos, résultats au Carnet

### Phase 3 — Conception transverse
- [[decisions_architecture]] — 13 ADR : stack (NestJS+PostgreSQL, React Native, Next.js+Electron), agrégateur MoMo
- [[modele_menaces]] — 5 actifs, 14 scénarios d'attaque et leurs parades
- [[strategie_offline_sync]] — le serveur fait foi, le mobile est un miroir chiffré
- [[strategie_tests]] — pyramide + les 10 invariants de la « liste rouge »
- [[modele_operationnel]] — l'équipe humaine, l'onboarding terrain, les incidents

### Transverse
- [[tracabilite]] — parcours ↔ modules ↔ releases ↔ contrats ↔ questions ouvertes
- [[revue_qualite]] — revue de cohérence globale du 2026-06-10 (verdict : 🟢 aligné)
- [[reference_technique]] — structure du code, conventions, environnements, préalables au 1er commit

### Phase 4 — UX/UI : hors périmètre (D-039)
- [[04_ux_ui/README|README]] — charte graphique existante (`docs/Charte Graphique/`), maquettes par le porteur ; contraintes à respecter listées

---

## 📊 État d'avancement

| Document | Statut |
|---|---|
| [[vision]] | 🟢 Validé (2026-06-10) |
| [[registre_decisions]] | 🟢 Vivant — à jour |
| [[personas_parcours]] | 🟢 Validé (2026-06-10) |
| [[etude_concurrence]] | 🟢 Validé (2026-06-10) |
| [[cadre_reglementaire]] | 🟢 Validé (2026-06-10) |
| [[modele_economique]] | 🟢 Validé (2026-06-10) — D-022/D-023 actées |
| [[registre_risques]] | 🟢 Validé (2026-06-10) — Phase 0 terminée ✅ |
| [[glossaire]] | 🟢 Validé (2026-06-10) |
| [[carte_domaines]] | 🟢 Validé (2026-06-10) |
| [[plan_modules]] | 🟢 Validé (2026-06-10) |
| [[modele_donnees_global]] | 🟢 Validé (2026-06-10) |
| [[parametres_metier]] | 🟢 Validé (2026-06-10) — D-024 |
| [[exigences_non_fonctionnelles]] | 🟢 Validé (2026-06-10) — D-025 |
| [[plan_releases]] | 🟢 Validé (2026-06-10) — D-026, Phase 1 terminée ✅ |
| [[M01_comptes_authentification]] | 🟢 Validé (2026-06-10) — D-027, TOTP au MVP |
| [[M02_roles_espaces_structures]] | 🟢 Validé (2026-06-10) — D-028 |
| [[M03_verification_contrats]] | 🟢 Validé (2026-06-10) — D-029, posture stricte |
| [[M04_audit_signalements]] | 🟢 Validé (2026-06-10) — D-030 |
| [[M05_annuaire_professionnels]] | 🟢 Validé (2026-06-10) — D-031 |
| [[M06_poignee_session]] ⭐ | 🟢 Validé (2026-06-10) — D-032 |
| [[M07_carnet]] | 🟢 Validé (2026-06-10) — D-033, Carnet familial |
| [[M09_ordonnance_delivrance]] | 🟢 Validé (2026-06-10) — D-034 |
| ~~[[M11_stocks_catalogues]]~~ | ❌ **Retiré du produit (02/09/2026 — D-052)** |
| ~~[[M12_recherche_devoilement]]~~ | ❌ **Retiré du produit (02/09/2026 — D-052)** |
| [[M13_paiements_gains]] | 🟢 Validé (2026-06-10) — D-037 |
| [[M14_notifications_rappels]] | 🟢 Validé (2026-06-10) — D-038 |
| [[M16_pilotage_administration]] | 🟢 Validé (2026-06-10) — D-038, **Phase 2 (MVP) terminée ✅** |
| [[M15_urgence]] | 🟢 Validé — D-041 (Q-006 close) |
| [[M08_missions_triage]] | 🟢 Validé — D-042 |
| [[M10_examens_resultats]] | 🟢 Validé — D-043, **les 16 modules sont spécifiés ✅** |
| [[decisions_architecture]] | 🟢 Validé — revue D-040 (3 ADR ⚠️ à confirmer : agrégateur, hébergement, référentiel) |
| [[modele_menaces]] | 🟢 Validé — revue D-040 |
| [[strategie_offline_sync]] | 🟢 Validé — revue D-040 |
| [[strategie_tests]] | 🟢 Validé — revue D-040 |
| [[modele_operationnel]] | 🟢 Validé — revue D-040 |
| [[tracabilite]] | 🟢 Vivant |
| [[revue_qualite]] | 🟢 Rapport du 2026-06-10 |
| [[reference_technique]] | 🟡 En revue (porteur) |
| Phase 4 | ⛔ Hors périmètre (D-039) — maquettes par le porteur |

> Le tableau ci-dessus suit la **spécification** (tout 🟢 validé). La **réalisation (code)** est suivie
> à part dans [[etat_realisation]] : backend MVP **complet** (M01-M07, M09, M11-M14, M16 — 505 tests),
> modules **M08/M10/M15 en V1** (spécifiés, non codés), frontend non démarré.

*Méthode : Prompt générique V2 (`docs/prompt/generic_prompt_v2.md`, hors coffre) — une chose à la fois, validation avant d'avancer.*

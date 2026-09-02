# Registre des Décisions — ULAMU

> Document vivant. Chaque arbitrage validé par le porteur du projet y est consigné.
> Règle : aucune décision ne vit uniquement dans une conversation.

| Version | Date | Modification |
|---|---|---|
| 1.0 | 2026-06-10 | Création — reprise de toutes les décisions de la session de cadrage |

---

## Décisions validées

### D-001 — Refonte complète du cahier des charges
Les 25 modules existants (`docs/Cahier des Charges (supprimé depuis — historique)/`) servent de matière première, mais le projet est re-spécifié selon le prompt générique V2 (`docs/prompt/generic_prompt_v2.md`, hors coffre) : 5 phases, validation par étape, sans obligation de reproduire les 25 modules.

### D-002 — Acteurs : toutes les catégories de soignants dès le début
- **Patients**
- **Prescripteurs** : médecin généraliste, médecin spécialiste (spécialité = attribut), chirurgien-dentiste, sage-femme (prescription limitée à son domaine)
- **Non-prescripteurs** : infirmier diplômé, agent de santé communautaire (extensible : kiné, psychologue, nutritionniste)
- **Équipe d'administration ULAMU** (sous-rôles : super admin, finance, vérification/modération, carte)
- **Le Système** (acteur automatique)

> ⚠️ **Précisé par [[#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] (02/09/2026) :** ULAMU compte **trois acteurs porteurs d'un compte** — le patient (mobile), le soignant et l'administration (web). Le membre de structure n'en est plus un.

### D-003 — Les pharmacies sont des structures, pas des personnes
> ⚠️ **Partiellement remplacée par [[#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] (02/09/2026).** Ce qui reste vrai : une pharmacie **n'est pas une personne**, et le modèle de données le reflète toujours. Ce qui est retiré : le **compte** `FACILITY_MEMBER` qui l'administrait.

Une pharmacie a son **espace propre** : un pharmacien titulaire (responsable) + des membres (assistants, vendeurs) avec des droits différenciés.

### D-004 — Les laboratoires sont des structures (même modèle que les pharmacies)
> ⚠️ **Partiellement remplacée par [[#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] (02/09/2026)** — même raison qu'en D-003.

Espace propre, membres, catalogue d'examens avec prix. Modèle extensible plus tard aux cliniques.

### D-005 — Langue : français uniquement au démarrage
Le lingala et l'anglais (prévus dans l'ancien cahier) sont écartés du périmètre initial.

### D-006 — La consultation est une session de messagerie chronométrée
Le professionnel affiche durée + prix (ex. 30 min / 5 000 XAF). Après paiement, la messagerie s'active avec un **décompteur visible en temps réel**. Fin du temps = session fermée et désactivée. La messagerie est **le seul portail** de consultation.

### D-007 — Poignée de main obligatoire avant paiement
1. Le patient clique « initier le paiement » → le professionnel est notifié.
2. Le professionnel **confirme qu'il est prêt** (bouton/lien). Sans confirmation, le paiement est **impossible**.
3. La confirmation expire après ~5 minutes si le patient ne paie pas.
4. Paiement effectué → la session s'ouvre immédiatement.

**Justification :** empêche le scénario du médecin qui se déconnecte après le paiement, laissant le patient seul face à une messagerie morte.

### D-008 — Remboursement automatique si le professionnel reste silencieux
Si le professionnel confirme puis n'envoie **aucun message** pendant toute la session payée → remboursement automatique intégral. Garantie anti-arnaque.

### D-009 — Recherche pharmacie/labo : modèle « dévoilement + réservation 24 h »
- **Gratuit** : résultat anonyme — arrondissement, nombre de structures ayant le produit/examen, quantité globale (jamais de nom, localisation ou téléphone individuels).
- **Payant** : session de dévoilement valable **24 h** — téléphone, quartier, position, guidage GPS en partage de position direct. Le paiement vaut **réservation du produit** (perçu comme un service, pas un péage).
- Expirée → il faut payer une nouvelle recherche.

### D-010 — Le patient ne paie jamais de supplément
La commission ULAMU est prélevée **côté professionnel**, incluse dans le prix affiché. Exemple : consultation 5 000 XAF → médecin 4 500, ULAMU 500 (taux exact défini au contrat). Le patient paie le prix annoncé, point final. Reçu numérique systématique.

### D-011 — Contrat numérique signé pour chaque professionnel et structure
À l'inscription : conditions, taux de commission, engagements — signé électroniquement, conservé comme preuve juridique de la relation.

### D-012 — Clients applicatifs
> ⚠️ **Précisée par [[#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] (02/09/2026)** : le web sert **deux** acteurs, pas trois.

- **App mobile** = les patients.
- **Application web** (React + Vite, client-serveur) = ~~professionnels, structures, administration~~ → **professionnels et administration**. *(Détails de stack en Référence Technique, plus tard.)*

### D-013 — Interface mobile patient : 3 onglets + bouton urgence
Barre du bas : **① Accueil** (portail public : catégories de soignants, recherche médicaments, filtres) · **② Consultations** (sessions actives + décompteur, historique, ordonnances) · **③ Mon Espace** (profil, dossier médical, reçus, paramètres). **Bouton Urgence flottant** accessible partout.

### D-014 — Ordonnance numérique
Créée **uniquement depuis une consultation**. Vérification automatique des allergies du dossier avant validation. Document signé + QR code unique. Gratuite (incluse dans la consultation). Statuts : active / partielle / délivrée / expirée. Délivrance par scan du QR en pharmacie → stock décrémenté automatiquement.

### D-015 — Examens de laboratoire payés hors plateforme au démarrage
La plateforme gère : demande d'examens numérique du médecin, recherche de labo (modèle D-009), téléversement des résultats dans le dossier médical, notifications. Le paiement de l'examen se fait au labo.

### D-016 — Session de suivi à tarif réduit
Le professionnel peut proposer une session de suivi courte (ex. 15 min) à tarif réduit qu'il définit. Il peut aussi **prolonger gratuitement** une session en cours.

### D-017 — Le cahier des charges est un coffre Obsidian
Documents Markdown liés par wikiliens `[[...]]`, utilisé comme **deuxième cerveau** du projet pendant toute sa durée.

### D-018 — Triage de terrain optionnel et payant
Un infirmier/agent de santé proche peut prendre les constantes du patient (tension, température, poids) et les enregistrer dans le dossier. Service payant → revenu pour le soignant, commission ULAMU (modèle D-010/D-011).

### D-019 — Pré-consultation gratuite
Mini-questionnaire (symptômes, durée, photos) rempli après paiement, lu par le professionnel **avant** l'ouverture de session — les minutes payées ne servent pas aux questions de base.

### D-020 — L'accueil est 100 % gratuit
Inscription sans moyen de paiement. Le dossier médical numérique (le « carnet ») est **gratuit à vie**. Aucune monétisation à la porte d'entrée.

### D-021 — Compte-rendu obligatoire
Le professionnel doit rédiger un compte-rendu court (diagnostic, recommandations) pour clôturer chaque consultation → alimente le dossier médical. Le patient note le professionnel après chaque session.

### D-022 — Taux de commission : 10 % unique (close Q-001)
Commission ULAMU de **10 %** sur consultations, suivis et missions de triage terrain (le professionnel garde 90 %). **0 %** sur les retraits de gains (seuls les frais réels de l'opérateur MoMo s'appliquent). Inscription, contrats et espaces structures **gratuits**. Tout changement de taux = avenant au contrat signé, notifié à l'avance. Détail : [[modele_economique]].

### D-053 — Le TOTP est optionnel pour tous les types de compte
**Décision du porteur, 02/09/2026.** Sur la plateforme web, la double authentification par
application (TOTP) **n'est obligatoire pour aucun type d'utilisateur**. Elle est **désactivée par
défaut**, et chacun l'active ou la désactive comme il l'entend.

**Ce que cela remplace.** Trois exigences écrites : **RM-01-06** (« obligatoire pour les comptes
Équipe ULAMU »), **EF-02-08** (attribution des sous-rôles « sous TOTP ») et **EF-16-06** (« toute
action d'admin : TOTP obligatoire »). Leur moitié « administrateur » tombe ; **tout le reste de ces
exigences demeure** — motif obligatoire, audit, matrice des sous-rôles.

**Ce que la décision aligne.** Pour les patients et les professionnels, RM-01-06 disait déjà
« optionnel » et le web déclarait « obligatoire ». C'était l'une des **trois dérives documentaires
jamais arbitrées** du §9 du plan d'exécution web : elle est soldée.

**Ce que la décision retire côté serveur.** Deux gardes, pas une : la vérification du TOTP dans
`AdminGuard` (qui répondait 403 sur toute route d'administration) et le refus de `disableTotp` pour
les comptes ADMIN. La variable `ADMIN_REQUIRE_TOTP` n'est plus lue nulle part.

**Ce qui ne change pas, et qui protège encore.** L'accès à l'administration reste tenu par
l'authentification, le type de compte, l'existence d'un sous-rôle et la matrice M02. La
désactivation du TOTP, elle, exige toujours **le mot de passe ET un code valide** — c'est
précisément le geste qu'un voleur de session voudrait faire.

**Ce que cela coûte, écrit plutôt que tu.** La console d'administration d'une plateforme de santé,
ouverte sur internet, n'est plus protégée que par un mot de passe pour qui n'active pas le second
facteur. Le risque et sa recommandation sont inscrits au §9 du plan d'exécution web.

**Un chantier plus large que la décision.** L'appliquer a révélé que le 2FA du web n'était pas
opérationnel : la route de désactivation n'était **appelée par aucun écran**, les trois routes de la
2FA par email n'étaient **pas déclarées dans le client**, et la connexion web **ne reconnaissait pas**
le second facteur par email — un compte l'ayant activé depuis le mobile était enfermé dehors, sans
message. Voir le chantier 31 au §10 du plan.

### D-052 — La chaîne du médicament en pharmacie sort du produit (M11, M12, délivrance M09)
**Décision du porteur, 02/09/2026.** ULAMU garde **uniquement les modules qui couvrent son périmètre : patient, médecin, administration.** La recherche de médicaments en pharmacie et sa délivrance n'en font pas partie.

**C'est la suite logique de [[#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]].** En retirant le compte de structure, on avait laissé un sous-système sans opérateur — et une dette écrite le jour même (§9 n°12) : *« plus personne n'alimente le stock ; la recherche PAYÉE du patient répond sur des données qui vieillissent »*. Trois issues y étaient proposées. Le porteur retient la première : **retirer la fonctionnalité plutôt que la maintenir sur une donnée morte.**

**Ce qui part.**
- **M11 — Stocks & catalogues** (7 fichiers, ~1 330 lignes) : approvisionnement, sorties, corrections, seuils, fraîcheur, disponibilité.
- **M12 — Recherche & dévoilement** (7 fichiers, ~1 843 lignes) : recherche anonyme par arrondissement, dévoilement payé (PM-03), réservation de 24 h, garantie Q-004, strikes de fiabilité.
- **La délivrance de M09** : `POST /prescriptions/scan/:qrToken` et `.../dispense`, plus `m09.dispensation.service.ts`.
- **Côté mobile** : l'écran « Médicaments » (376 lignes), sa route, sa tuile d'accueil, six méthodes d'API et onze types.
- **Côté administration** : l'arbitrage des strikes (EF-12-07), le balayage des dévoilements expirés, **deux des sept KPI du pilote** (« pharmacies au stock vivant », « dévoilements payés »), et le compte des officines dans la couverture territoriale.
- **Douze modèles de notification** devenus sans émetteur, et les pharmacies de démonstration du seed.

**Ce qui reste, et ce n'est pas une inconséquence.**
- **Le référentiel de médicaments** — `GET /v1/medicaments` — **change de module sans changer d'adresse** : il passe de M12 à M09. Son exigence a toujours été **EF-09-02**, et son propre commentaire disait *« AUCUNE donnée de stock ici (catalogue pur) »*. C'est ce dans quoi un médecin choisit une ligne d'ordonnance. Sans lui, l'écran C7 chercherait dans le vide et le prescripteur ne pourrait plus écrire qu'en texte libre — **c'est-à-dire sans le garde-fou allergies**, qui ne s'applique qu'aux lignes référentielles.
- **L'ordonnance** est toujours prescrite, scellée, consultable et annulable. Ce qu'elle ne peut plus être, c'est **servie dans ULAMU**.

**Ce que la décision coûte, dit plutôt que tu.**
1. **Le patient perd la recherche de médicaments.** C'était une fonctionnalité facturée (PM-03, 500 XAF) et l'une des deux sources de revenus du modèle économique. À arbitrer avec [[modele_economique]].
2. **Une ordonnance n'a plus de lecteur.** Les statuts `DISPENSED` et `PARTIALLY_DISPENSED` deviennent inatteignables, et le QR scellé n'est plus scanné par personne dans ULAMU. Le patient le montre sur son téléphone comme une ordonnance papier — traçable et infalsifiable, mais hors chaîne.
3. **Le plan de sortie compte sept critères de succès ; deux ne sont plus mesurables.**

**Ce qui reste en base, et pourquoi.** Les tables — `Facility`, `StockItem`, `Dispensation`, `Reservation`, `Disclosure`, `ReliabilityStrike` et leurs voisines — **ne sont pas supprimées**. Les retirer demande une migration sur la base de **production**, celle qui a été effacée le 23/08. Aucun code ne les lit plus ; elles ne coûtent que de la place. Inscrit au §9 avec son geste.

*Le principe qui a guidé le découpage : **on retire un ACTEUR et ce qu'il opérait ; on ne retire pas une donnée que quelqu'un d'autre du périmètre utilise.** C'est pour cela que le référentiel est déplacé et non supprimé.*

### D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)
**Décision du porteur, 02/09/2026.** ULAMU a **trois acteurs** : le **patient** (application mobile), le **soignant** et l'**administration** (application web). Le quatrième type de compte du modèle initial, `FACILITY_MEMBER` — le membre de structure, pharmacie ou laboratoire —, **sort du produit**.

**Ce que la décision retire.** La route publique `POST /v1/accounts/register/facility-member` (plus aucun compte de ce type ne peut naître), le parcours d'inscription correspondant, et toute trace du type dans l'application web : capacité `facility`, « Espace officine », le tableau de bord officine (70 lignes) et 172 lignes de client API sans appelant — dont les **16 méthodes** de gestion de structure, de stock et de scan d'ordonnance, qu'**aucun écran n'appelait déjà**.

**Ce que la décision NE retire PAS, et pourquoi.** La **pharmacie comme objet** reste : `Facility`, `StockItem`, `Dispensation`, `Reservation` et les huit autres tables. Ce n'est pas une timidité — **la recherche de médicaments du patient en dépend directement** : `m12.disclosure.service.ts` importe `StockAvailabilityService` de M11, et le parcours « je cherche un médicament → je paie un dévoilement (PM-03) → j'ai une réservation de 24 h » lit ce stock. Le patient est dans le périmètre ; sa fonctionnalité reste.

**La conséquence, dite plutôt que tue.** Sans membre de structure, **plus personne n'alimente le stock**. Les données existantes se figent, et la recherche payée du patient répond sur un stock qui vieillit. C'est le coût réel de la décision — inscrit au §9 du plan d'exécution avec ses issues.

**Ce qui reste en base, et pourquoi ce n'est pas un oubli.** La valeur `FACILITY_MEMBER` demeure dans l'énumération Prisma `AccountType`, et ses six règles dans la matrice M02. Deux raisons : (1) l'en retirer demande une **migration sur la base de production** — celle qui a été effacée le 23/08 ; (2) surtout, le contrôle d'accès des structures ne passe pas par la matrice mais par `PermissionsService.assertFacilityRight`, qui lit la table `FacilityMember`. Retirer les lignes sans retirer le chemin donnerait **deux vérités pour une même règle**, et la matrice serait celle qui ment. La fermeture complète suppose d'abord un ménage des données en production.

**Ce que D-003 et D-004 gardent de valable.** Une pharmacie ou un laboratoire **n'est pas une personne** — c'est toujours vrai, et le modèle de données le reflète. Ce que D-051 retire, c'est le **compte** qui les administrait.

*Les quatre maquettes D1 à D4 (Ma pharmacie, Stock, Délivrance, Réservations) sortent du périmètre. Elles ne sont pas supprimées : ce sont des artefacts de conception, et elles documentent ce qui a été envisagé.*

### D-050 — Chantier 5 (M16 Pilotage & Administration) : le back-office + la cadence — MVP COMPLET
Workflow : 1 agent d'implémentation (M16 intégral) → 3 vérificateurs adversariaux. Schéma D10 (AccountSanction, ParameterChange, SupportProcedure) posé par le porteur-IA ; exports de service ouverts pour la cadence/avenant (M03Service, M06 Handshake/Report, M09 Prescription, M13 Reconciliation). M16 livré (12 fichiers) en **lecture seule sur les domaines** (RM-16-01) : ses seules écritures propres sont les sanctions, l'historique des paramètres et les procédures support — tout autre effet passe par un service propriétaire (remboursement → M13, avenant → M03, **arbitrage de strike → M12.arbitrateStrike**). Services : PilotKpiService (les 7 KPIs du pilote EF-16-05, agrégats seuls RM-16-05), DashboardService (pro/structure/patient, jamais de Carnet RM-16-02), AdminService (recherche, suspension+révocation des sessions+remboursement des sessions vives CU-16-01, réactivation, bannissement à double validation EF-16-07, arbitrage), ParametersService (PM-xx + historique + invalidation cache + avenant D-022), SupportProcedureService (trace auditée CU-16-04), **SchedulerService** (@Cron qui cadence enfin les balayages dé-scopés : D-008/PM-07/PM-08/PM-10 chaque minute, rappels PM-30 + reprise critique M14 chaque heure, réconciliation EF-13-09 + purge PM-37 chaque jour ; chaque balayage isolé en try/catch). `ScheduleModule.forRoot()` + M16 câblés dans app.module. **Revue adversariale — 17 constats (3 BLOCKER, 6 MAJOR, 8 MINOR), tous traités** : (BLOCKER) resolveStrike écrivait dans ReliabilityStrike (domaine M12) → délégué à `DisclosureService.arbitrateStrike` (M16 décide, M12 applique+notifie) ; M16 non monté + ScheduleModule absent → câblés ; (MAJOR) approveBan ne remboursait pas les sessions vives du pro → ajouté ; bans PENDING multiples possibles → rejet si demande déjà en attente ; approveBan n'éprouvait pas le count de clôture → effets seulement si transition réelle ; `effectiveAt` futur appliqué immédiatement → refusé (différé = V1) ; PM-02 déclenchait un avenant + reissue non idempotent → PM-02 retiré des taux contractuels + reissue seulement si la valeur change ; (MINOR) KPIs affinés (pharmacies filtrées PHARMACY/ACTIVE, patients revenus sur sessions ENDED, dévoilements payés hors REFUNDED), SUSPENSION→REVERSED posée à la réactivation, audit de la tentative d'auto-approbation d'un ban, oldValue relu dans la transaction. Validation : typecheck propre, **505 tests verts** (21 suites, 6 d'intégration) — back-office prouvé : suspension+remboursement C1, bannissement à double validation, paramètre historisé + avenant, KPIs agrégés, arbitrage délégué, cadence. **Le périmètre MVP est COMPLET : 13 modules livrés (M01-M07, M09, M11-M14, M16)** ; restent M08/M10/M15 (V1).

### D-049 — Chantier 4 (M11 Stocks, M09 Ordonnance, M12 Recherche/Dévoilement) : la chaîne du médicament
Workflow multi-agents (M11 socle → M09 + M12 en parallèle → 4 vérificateurs adversariaux). Schéma D5 (Medicament, Prescription, PrescriptionLine, Dispensation, AllergyOverride, ReferentialEnrichmentItem) + D6 (StockItem, StockMovement, StockThreshold, FreshnessConfirmation, FacilityStockState, Disclosure, Reservation, ReliabilityStrike, ProductAvailabilityAlert) posé par le porteur-IA ; téléphone de contact ajouté à Facility (révélé au dévoilement). **Contrats** : C3 = `StockAvailabilityService.consume(tx,…)` (décrément FEFO DANS la transaction de M09, jamais négatif RM-11-01) ; C7 = `availableQuantity / isPublishable / searchAnonymous / pickOptimalFacility` (recherche anonyme par arrondissement, ni identité ni prix). M09 prescrit uniquement en session ACTIVE (RM-09-01), garde-fou allergies bloquant + motivé (EF-09-03), scellement QR + sha256 + Carnet C2, délivrance totale/partielle multi-pharmacies. M12 = modèle signature D-009 : recherche gratuite, dévoilement payé 500 XAF (PM-03, 100 % ULAMU, C1), réservation 24 h, garantie Q-004 (re-dévoilement gratuit ou remboursement). **Revue adversariale — 14 constats (5 BLOCKER, 4 MAJOR, 5 MINOR), tous traités** : (A) **sur-réservation** — `availableQuantity` lisait hors transaction, neutralisant la sérialisation : surcharge `tx` ajoutée, la lecture entre dans le snapshot SERIALIZABLE → SSI tranche les courses (RM-12-02) ; (B) **remboursement perdu** — le re-dévoilement fabrique un `orderRef` suffixé sans `Payment` : remboursement ciblé sur l'`orderRef` RACINE (chaîne `supersedes`), `safeRefund` n'avale plus un NotFound (audit + alerte finance) (RM-12-06) ; (C) **délivrance sur ordonnance morte** — garde de statut conditionnelle DANS la transaction de délivrance (champ `Prescription.updatedAt`, RM-09-05) ; (D) **exclusion strikes** durait ~30 j au lieu de PM-34 — durée PM-34 lue depuis le strike déclencheur (fenêtre 30 j = comptage, PM-34 = durée) ; (E) re-dévoilement renvoyait l'ancien dévoilement EXPIRED → renvoie le nouveau ACTIF ; (F) réponse de délivrance reconstruite depuis l'état transactionnel (plus de re-scan QR post-commit) ; (H) constante de fenêtre dédupliquée ; (I) **13 modèles de notification** M09/M12 ajoutés au catalogue M14 + test EMITTED_TEMPLATES. **Limite assumée (MINOR G)** : le décrément C3 d'une délivrance peut entamer du stock physiquement réservé par le dévoilement d'un AUTRE patient — le stock ne devient jamais négatif (RM-11-01) et le disponible publié reste borné à 0 ; la réservation lésée est rattrapée par la garantie Q-004 (strike + remboursement). **Dé-scopes assumés** : PDF imprimable de l'ordonnance (Phase 4 UX), domaine encadré de la sage-femme (V1, référentiel à stabiliser), notification de cloche `ProductAvailabilityAlert` à réapparition du stock + cron de fraîcheur/expiration (M16). Validation : typecheck propre, **471 tests verts** dont 5 suites d'intégration PostgreSQL — parcours complet prescription → recherche → dévoilement payé → délivrance (décrément FEFO + Carnet) prouvé de bout en bout, plus RM-12-01 / RM-09-05 / RM-11-01 / Q-004. **13 modules sur 16 livrés** (M01-M07, M09, M11-M14) ; restent M16 (MVP, Chantier 5) et M08/M10/M15 (V1).

### D-048 — Chantier 3 (M07 Carnet, M05 Annuaire, M06 Poignée/Session ⭐) : le cœur livré
Workflow multi-agents (M07+M05 parallèle → vérif → M06 → vérif) ; les agents M06 ont atteint la limite de session APRÈS avoir écrit le code (typecheck + 317 tests verts) mais sans vérification : **relecture et finition faites par le porteur-IA en direct**. M06 (HandshakeService, SessionService, ReportService, RecordAccessService) trouvé de très haute qualité : invariant n°1 (jamais de paiement sans confirmation valide), invariant n°9 (D-008 remboursement auto auto-réparant), capture différée au compte-rendu (RM-06-04), idempotence webhooks + clientMsgId offline, temps serveur, transitions paresseuses sans poller. **Corrections appliquées (constats M05/M07 + revue M06)** : (1) **fix transversal D-048** — l'incrément anti-brute-force OTP (`consumeOtpOrThrow`) écrit désormais via le client racine, survit au rollback de la transaction appelante (corrige M07.claim, M03.sign, M13.withdrawal) ; (2) M06 `pay()` re-vérifie `canPractice` (pro révoqué entre confirmation et paiement) ; (3) vitrine M05 alignée sur le critère M03 (`none signedAt null` = dernière version signée, D-029) ; (4) 19 modèles de notification manquants (M05/M06/M07) ajoutés au catalogue M14 + test EMITTED_TEMPLATES ; (5) transfert du Carnet familial lié à une **intention persistée** par sous-profil (SubProfileClaimIntent, pattern M02). **Dé-scopes assumés** : export Carnet par période, recalcul quotidien des stats M05, photo de profil publique (schéma figé), signalement d'un commentaire (cible M04). Validation : build vert, **366 tests verts** dont 36 d'intégration — parcours 🅰 complet de bout en bout (poignée → paiement MoMo → session → compte-rendu → Carnet + gains → notation) et D-008 prouvés contre PostgreSQL réel. **10 modules sur 16 livrés** ; il reste M08/M10/M15 (V1) et M11/M12/M16 (MVP, Chantier 4-5).

### D-047 — Chantier 2 (M13 Paiements, M14 Notifications) : revue adversariale appliquée
Workflow multi-agents (2 impl + 2 vérif). **Bloquant corrigé** : course capture/refund de M13 (split lu hors transaction → perte d'argent silencieuse) → re-lecture du split dans la transaction + deux updateMany conditionnels mutuellement exclusifs. **Majeurs corrigés** : brute-force OTP au retrait (OTP consommé dans sa propre transaction avant le débit — l'incrément d'attempts n'est plus effacé par le rollback) ; reçu de remboursement (clé composite `(paymentId, kind)`, reçu REFUND systématique, consultable via `GET /v1/payments/receipts`) ; solde « en attente » exposé (EF-13-06) ; taux de commission lu sur le **contrat signé** du bénéficiaire, repli PM-01 (RM-13-07) ; net/frais figés à l'exécution du retrait (réconciliation stable) ; M14 : in-app respecte la préférence de catégorie (CU-14-03), push non bloquant après commit (pas de doublon au rejeu), balayage des push critiques bloqués en QUEUED. **Faux agrégateur MoMo** (interface charge/refund/payout + webhook) = contrat pour le prestataire ADR-09. **Dé-scopes assumés** : barème de frais opérateur réels (agrégateur réel), balayeur de retraits PENDING orphelins + cron retry/purge M14 (M16), statut DELIVERED FCM (ADR-08), EF-14-05 rappels de médicaments (Chantier 4 avec M09). Validation : build vert, **230 tests verts** dont 32 d'intégration PostgreSQL réels (cycle financier complet + notifications).

### D-046 — Chantier 1 : revue adversariale appliquée ; dé-scopes assumés
Le workflow multi-agents (implémentation M02/M03/M04 + vérification adversariale) a produit 25 constats ; tous les bloquants/majeurs corrigés : parcours d'inscription FACILITY_MEMBER (D-045), transfert à intention persistée + OTP des deux parties, structure vérifiée exigée pour inviter, écritures conditionnelles anti-concurrence partout (invitations, transitions M03, modération M04), notifications C4 de M03, relais outbox démarré + retry sur conflit de sérialisation + quarantaine des événements illisibles, cloisonnement du journal par sous-rôle, export CSV audité, alerte critique de rupture de chaîne. **Dé-scopes assumés (Chantier 1)** : EF-03-09 (expiration des pièces — exige l'état SUSPENDED, planifié avec M16), export PDF du journal, catalogue formel des événements (EF-04-03), purge de rétention PM-24 ; Q-008 reste tranchée MVP (RM-02-06). Validation : build vert, **128 tests verts** dont 16 d'intégration contre PostgreSQL réel (flux M01→M02→M03→M04 complet, altération de chaîne détectée).

### D-045 — Comptes « membre de structure » : parcours d'inscription dédié (M01)
> ⚠️ **Remplacée par [[#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]] (02/09/2026) sur son volet « inscription structure ».** La route décrite ci-dessous **n'existe plus** : ULAMU a trois acteurs. Le reste de la décision — bootstrap du SUPER_ADMIN par le seed, gestion des sous-rôles — **reste valable**.

Pour résoudre le bloquant RM-02-06 : route publique `/accounts/register/facility-member` (type FACILITY_MEMBER + profil minimal) — c'est le parcours du futur titulaire ET de l'invité sans compte (CU-02-02). La création d'une structure exige ce type de compte. Bootstrap du premier SUPER_ADMIN par le seed (TOTP obligatoire avant toute action admin, RM-01-06) ; gestion des sous-rôles (EF-02-08) par le SUPER_ADMIN via M02.

### D-044 — Maquettes officielles livrées par le porteur (Claude Design)
Les maquettes UI/UX ont été réalisées par le porteur avec **Claude Design**. Lien et directive d'implémentation consignés dans [[../04_ux_ui/README|04_ux_ui/README]]. Règles : respecter fidèlement (améliorer oui, trahir non) ; compléter les écrans/états manquants dans le même langage visuel ; les contraintes du cahier prévalent en cas de conflit, avec signalement au porteur. Le design sera chargé (fetch) au démarrage de l'implémentation — pas avant le feu vert.

### D-041 — Bouton Urgence défini (close Q-006) ; module M15 spécifié
Deux usages : auto-déclenchement (2 taps, fiche vitale plein écran, appel contact d'urgence + numéros locaux) et lecture par un tiers (QR sans compte, sans connexion). QR temporaire 4 h (PM-38) + carte imprimée permanente révocable. Fonctionne hors ligne, jamais monétisé, jamais désactivé. Référentiel public des services d'urgence géré par l'Équipe ULAMU, hors modèle de dévoilement. Détail : [[../02_modules/M15_urgence|M15]].

### D-042 — Module M08 Missions de Triage spécifié (V1)
Le triage terrain réutilise la mécanique éprouvée : poignée de main (D-007) + paiement C1 + commission 10 %. Preuve de visite par **code à 4 chiffres** remis par le patient ; gains crédités à la saisie des constantes + code (même principe que le compte-rendu M06). PM-39 : rayon d'intervention par défaut 10 km. Détail : [[../02_modules/M08_missions_triage|M08]].

### D-043 — Module M10 Examens & Résultats spécifié (V1)
Les laboratoires activent le modèle Structure existant (M02/M03) ; demande d'examens signée à QR créée en session ; recherche de labo par dévoilement (M12) ; résultats téléversés au Carnet (C2), prescripteur et patient notifiés ; paiement de l'examen au labo, hors plateforme (D-015). PM-40 : demande d'examens expire en 30 jours. Détail : [[../02_modules/M10_examens_resultats|M10]].

### D-040 — Revue de cohérence globale ; Phase 3 validée ; autonomie déléguée
Revue complète des 27 documents ([[../revue_qualite|rapport]]) : références PM/D/C/EF/RM/CU toutes résolues, 7 coutures de fond vérifiées, 3 anomalies corrigées (PM-37b fantôme, 2 liens hors coffre), 15 statuts d'en-tête alignés. **Verdict : cohérent et aligné.** Le porteur ayant délégué la suite (« sois autonome »), la Phase 3 passe en Validé (revue interne) et la **Référence Technique** est rédigée ([[../05_reference_technique/reference_technique|document]]).

### D-039 — Phase 3 produite ; Phase 4 hors périmètre
Phase 3 rédigée en intégralité : [[../03_conception_transverse/decisions_architecture|ADR/stack]] (13 ADR — NestJS+PostgreSQL, React Native, Next.js+Electron, agrégateur MoMo), [[../03_conception_transverse/modele_menaces|modèle de menaces]] (14 scénarios), [[../03_conception_transverse/strategie_offline_sync|offline/sync]], [[../03_conception_transverse/strategie_tests|tests]] (10 invariants « liste rouge »), [[../03_conception_transverse/modele_operationnel|modèle opérationnel]]. **Phase 4 annulée par le porteur** : la charte graphique existe (`docs/Charte Graphique/`, CG-01 à CG-11), les maquettes seront réalisées par le porteur — contraintes à respecter listées dans `04_ux_ui/README`.

### D-038 — Modules M14 et M16 validés — Phase 2 (MVP) terminée
M14 : notifications aveugles au métier, rappels de médicaments hors ligne, jamais de contenu médical ni de publicité. M16 : back-office « pouvoir sans trace n'existe pas », aucun accès admin au contenu médical, KPIs du pilote. **PM-37 acté : centre de notifications conservé 90 jours.** **M10 confirmé en V1** (décision déléguée puis entérinée — le recrutement des labos est un effort dédié post-MVP). Les **12 modules du MVP sont entièrement spécifiés**.

### D-037 — Module M13 validé
Argent aveugle (ordres référencés idempotents), capture différée au compte-rendu, réconciliation quotidienne, retraits 0 %. **PM-35 : double validation des remboursements manuels > 50 000 XAF. PM-36 : retrait exécuté sous 24 h max.** Détail : [[../02_modules/M13_paiements_gains|M13]].

### D-036 — Module M12 validé : garantie de réservation (close Q-004)
Recherche anonyme gratuite, dévoilement 500 XAF révélant la pharmacie optimale, réservation 24 h déduite du stock publié, session lisible hors ligne. **Garantie actée : produit manquant → re-dévoilement gratuit ; aucune alternative → remboursement intégral ; strike pour la pharmacie fautive, 3 strikes/30 jours → exclusion PM-34 (7 jours).** Détail : [[../02_modules/M12_recherche_devoilement|M12]].

### D-035 — Module M11 validé
Stock vivant par lots (péremption, prix libres), décrément automatique, import CSV guidé, secret commercial entre pharmacies. **Règle de fraîcheur actée : exclusion de la recherche après PM-33 (7 jours) sans mouvement ni confirmation. PM-32 : alerte péremption à 60 jours.** Détail : [[../02_modules/M11_stocks_catalogues|M11]].

### D-034 — Module M09 validé
Ordonnance scellée à QR (l'état vit côté serveur), garde-fou allergies tracé, délivrance partielle multi-pharmacies, délivrance exigeant la connexion (anti double délivrance), le scan ne révèle jamais le Carnet. Détail : [[../02_modules/M09_ordonnance_delivrance|M09]].

### D-033 — Module M07 validé : le Carnet familial (close Q-007)
Carnet à vie, entrées immuables à provenance visible, le patient voit tout, export PDF signé. **Carnet familial acté** : sous-profils pour personnes à charge avec Carnet propre, transfert à la majorité (OTP du tuteur). **PM-31 : conservation 10 ans après clôture** (à confirmer avocat). Détail : [[../02_modules/M07_carnet|M07]].

### D-032 — Module M06 validé (le cœur)
Poignée de main intégrale, décompteur démarrant à la pré-consultation, gains crédités au dépôt du compte-rendu, remboursements automatiques. **PM-27 : 3 sessions simultanées max. PM-28 : démarrage auto 10 min après paiement. PM-29 : prolongation cumulée +30 min max. PM-30 : compte-rendu sous 24 h (gains gelés au-delà).** Détail : [[../02_modules/M06_poignee_session|M06]].

### D-031 — Module M05 validé
Annuaire vitrine consultable sans compte ; bouton « initier » actif uniquement si le professionnel est en ligne ; classement jamais vendu ; indicateurs de réactivité publics. **PM-25 acté : 5 offres actives max. PM-26 acté : absent après 15 min d'inactivité web.** Détail : [[../02_modules/M05_annuaire_professionnels|M05]].

### D-030 — Module M04 validé
Journal d'audit en écriture seule chaîné par empreintes ; le contenu médical n'entre jamais dans l'audit ; signaleur anonyme. **PM-23 acté : signalement traité sous 48 h. PM-24 acté : rétention du journal 5 ans** (à confirmer avec l'avocat). Détail : [[../02_modules/M04_audit_signalements|M04]].

### D-029 — Module M03 validé : posture stricte de vérification
**Aucune pratique sans Badge Vérifié + contrat signé** : pas d'offre publiée, pas de poignée de main, pas de stock visible avant vérification (rupture assumée avec l'ancien modèle « auto-déclaration + badge non vérifié »). Le délai de 72 h ouvrées (PM-11) devient un engagement de service critique. Détail : [[../02_modules/M03_verification_contrats|M03]].

### D-028 — Module M02 validé
Rôles, matrice de permissions côté serveur, espaces structures (titulaire/membres). **PM-22 acté : invitations expirent en 7 jours.** **Q-008 tranchée pour le MVP : pas de cumul de casquettes sur un même compte** (RM-02-06), réétude en V1. Détail : [[../02_modules/M02_roles_espaces_structures|M02]].

### D-027 — Module M01 validé, TOTP intégré au MVP
M01 Comptes & Authentification validé. **TOTP dès le MVP** : désactivé par défaut, bascule dans les paramètres, QR code, codes de secours ; obligatoire pour les admins ULAMU. SMS OTP réservé à la preuve de possession du numéro. Paramètres PM-17 à PM-21 actés. Détail : [[../02_modules/M01_comptes_authentification|M01]].

### D-026 — Plan de releases validé : MVP de 12 modules
MVP = M01-M07, M09, M11-M14, M16 (réduit), ville pilote Brazzaville, 5 chantiers avec jalons de démonstration. **M08 Triage et M15 Urgence reportés en V1** ; M10 Examens/Labos en V1 ; iOS, cliniques, lingala, premium en V2 ; épidémiologie long terme. Critères de succès du pilote à 3 mois chiffrés. Détail : [[../01_architecture_fonctionnelle/plan_releases|plan_releases]].

### D-025 — Périmètre hors ligne du MVP (close Q-005)
Hors ligne : lecture du Carnet, QR des ordonnances actives, fiche urgence, reçus, rédaction de messages en file d'attente. Connexion exigée : recherche, dévoilement, paiement, poignée de main. Le décompteur de session court côté serveur. Détail : [[../01_architecture_fonctionnelle/exigences_non_fonctionnelles|ENF-04]].

### D-024 — Paramètres métier initiaux validés
PM-06 (prix de consultation libre, plancher 500 XAF), PM-07 (confirmation expire en 5 min), PM-09 (offres de 10 à 60 min), PM-10 (ordonnance expire en 30 jours), PM-11 (vérification en 72 h ouvrées), PM-16 (18 ans minimum, mineurs via compte parent — détail en Q-007). Référentiel : [[../01_architecture_fonctionnelle/parametres_metier|parametres_metier]].

### D-023 — Prix du dévoilement : 500 XAF (close Q-002)
Dévoilement + réservation 24 h (pharmacie comme labo) : **500 XAF**, prix unique. Argument : « moins cher qu'une course de taxi pour chercher au hasard ». Garde-fous : pas de publicité, pas de vente de données, pas de « payer pour apparaître », l'urgence n'est jamais monétisée.

---

## Questions ouvertes (à trancher)

| ID    | Question                                                                                                              | À traiter dans               |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| ~~Q-001~~ | ✅ Close — voir D-022 (10 % unique, 0 % retraits)                                                                  | [[modele_economique]]        |
| ~~Q-002~~ | ✅ Close — voir D-023 (500 XAF)                                                                                     | [[modele_economique]]        |
| Q-003 | Validité légale de la signature électronique et de l'ordonnance numérique au Congo-Brazzaville                        | cadre_reglementaire          |
| ~~Q-004~~ | ✅ Close — voir D-036 (re-dévoilement gratuit → remboursement → strikes)                                            | [[../02_modules/M12_recherche_devoilement|M12]] |
| ~~Q-005~~ | ✅ Close — voir D-025 (périmètre offline défini)                                                                   | [[../01_architecture_fonctionnelle/exigences_non_fonctionnelles|ENF-04]] |
| ~~Q-006~~ | ✅ Close — voir D-041 (deux usages, QR 4 h + carte imprimée, jamais monétisé)                                       | [[../02_modules/M15_urgence|M15]] |
| ~~Q-007~~ | ✅ Close — voir D-033 (Carnet familial : sous-profils + transfert à 18 ans)                                        | [[../02_modules/M07_carnet|M07]] |

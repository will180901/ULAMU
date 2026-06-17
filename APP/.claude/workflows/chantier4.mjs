export const meta = {
  name: 'chantier4-ulamu',
  description: 'Chantier 4 ULAMU : M11 Stocks, M09 Ordonnance, M12 Dévoilement + vérification adversariale',
  phases: [
    { title: 'Stocks (C7/C3)', detail: 'M11 — socle stock vivant + disponibilité' },
    { title: 'Ordonnance + Dévoilement', detail: 'M09 et M12 en parallèle' },
    { title: 'Vérification adversariale', detail: 'chasse aux violations d\'invariants' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexte commun injecté dans chaque agent (patterns établis du dépôt).
// ─────────────────────────────────────────────────────────────────────────────
const COMMON = `
PROJET ULAMU — backend apps/api (NestJS 10 modulaire + Prisma 5 + PostgreSQL). Travaille dans
D:/aide externe/nathan/aide_extérieure/ULAMU/APP/apps/api. Le client Prisma est DÉJÀ généré avec
tous les modèles D5/D6 (Medicament, Prescription, PrescriptionLine, Dispensation, DispensationLine,
AllergyOverride, ReferentialEnrichmentItem, StockItem, StockMovement, StockThreshold,
FreshnessConfirmation, FacilityStockState, Disclosure, Reservation, ReservationLine,
ReliabilityStrike, ProductAvailabilityAlert + enums PrescriptionStatus, StockMovementType,
DisclosureStatus, ReservationStatus, StrikeStatus). NE MODIFIE PAS schema.prisma.

PATTERNS IMPOSÉS (lis 1 ou 2 modules existants comme référence : m07-health-record, m13-payments,
m06-handshake-session) :
- Un dossier par module. Fichiers : mXX.module.ts, mXX.controller.ts, mXX.dto.ts, mXX.policies.ts
  (+ mXX.policies.spec.ts pour les fonctions PURES), un ou plusieurs *.service.ts.
- AuthGuard est GLOBAL (toute route authentifiée). Récupère l'acteur via le décorateur
  @Actor() (../../common/auth/actor.decorator) typé AuthenticatedActor (../../common/auth/auth.guard) :
  { accountId, accountType, sessionId, client }. La portée/les droits se vérifient TOUJOURS serveur.
- Contrôleurs préfixés "v1/...". DTO validés par class-validator (whitelist active globalement).
- AUCUN chiffre métier en dur : tout via ParamsService (../../common/params.service) get/getInt/getIntList.
- Événements inter-modules + notifications + audit dans la MÊME transaction via OutboxService
  (../../common/outbox.service) : await this.outbox.emit(tx, { type, payload }). Le drain est
  assuré par M04 — N'AJOUTE PAS de poller. Abonnement : this.outbox.on(prefix, handler) en onModuleInit.
- Audit C5 via AuditEmitter (../../common/audit.emitter) : await this.audit.emit(tx, { actorId?, actorType,
  action, resource, context }). JAMAIS de contenu médical/texte de message/commentaire dans le contexte
  d'audit ni dans un payload de notification (RM-04-03 / RM-14-03).
- Anti-TOCTOU (D-046) : transitions d'état par updateMany CONDITIONNEL { where: {... état attendu}} +
  test du count===0/1, jamais un read-puis-write. Idempotence par clés uniques.
- Notifications : payload { accountId, template: "<clé>", ...données minimales }. Les clés de templates
  que tu émets DOIVENT être listées dans ton résultat de sortie (je les enregistrerai dans M14 — n'édite
  PAS les fichiers m14-*). Convention de clé : "mXX.evenement".
- PrismaService (../../common/prisma.service) : injection standard. Transactions $transaction(async tx => ...).

CONTRAINTES DE COORDINATION (agents parallèles) :
- N'écris QUE dans le dossier de TON module. N'édite PAS : app.module.ts, schema.prisma, prisma/seed.ts,
  ni les fichiers d'un autre module (m01..m08, m10..m16, common/). Je câblerai app.module.ts moi-même.
- Auto-contrôle AVANT de rendre : exécute "npx tsc --noEmit -p tsconfig.json" depuis apps/api et
  corrige TES erreurs de type (ignore les erreurs venant d'un module non encore écrit si elles ne
  concernent pas ton code). Écris des specs unitaires pour tes fonctions pures et lance
  "npx jest --selectProjects unit <ton dossier>" si pertinent.
- Code en français pour les commentaires/messages (le projet est francophone), concis et fidèle au style existant.
`

// ─────────────────────────────────────────────────────────────────────────────
// Schémas de sortie structurée
// ─────────────────────────────────────────────────────────────────────────────
const IMPL_SCHEMA = {
  type: 'object',
  required: ['module', 'filesCreated', 'notifyTemplates', 'typecheck', 'summary'],
  properties: {
    module: { type: 'string' },
    filesCreated: { type: 'array', items: { type: 'string' } },
    exportedServices: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'methods'],
        properties: { name: { type: 'string' }, methods: { type: 'array', items: { type: 'string' } } },
      },
    },
    notifyTemplates: { type: 'array', items: { type: 'string' } },
    auditActions: { type: 'array', items: { type: 'string' } },
    typecheck: { type: 'string', enum: ['pass', 'fail'] },
    openIssues: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'invariant', 'file', 'description', 'suggestedFix'],
        properties: {
          severity: { type: 'string', enum: ['BLOCKER', 'MAJOR', 'MINOR'] },
          invariant: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'string' },
          description: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — M11 Stocks (socle : doit exister avant M09 et M12)
// ─────────────────────────────────────────────────────────────────────────────
phase('Stocks (C7/C3)')

const m11 = await agent(
  `${COMMON}

Implémente le MODULE M11 — Stocks & Catalogues. Spec :
docs/cahier_des_charges/02_modules/M11_stocks_catalogues.md (lis-la entièrement).

Dossier : src/modules/m11-stocks/

RÔLE : donner à chaque pharmacie un stock vivant et fiable, et exposer la disponibilité (C7) à M12
et le décrément automatique (C3) à M09.

Frontières consommées :
- M02 PermissionsService (../m02-roles-structures/m02.permissions.service) :
  assertFacilityRight(accountId, facilityId, "stock") — garde des routes de gestion de stock.
- M03 VerificationStatusService (../m03-verification-contracts/m03.status.service) :
  getForFacility(facilityId) -> { status, canPractice }. Une pharmacie ne publie sa dispo que si canPractice (RM-11-02, C6).

CRÉE EXACTEMENT CES SERVICES ET SIGNATURES (M09/M12 en dépendent — ne change pas les noms) :

1) StockAvailabilityService (m11.availability.service.ts) — exporté par le module :
   - async consume(tx, args: { facilityId, medicamentId, quantity, reference, memberId? }): Promise<{ lots: Array<{ stockItemId, lotCode, taken }> }>
     // C3 (EF-11-04, CU-09-02). Décrément FEFO (premier périmé, premier sorti) sur les lots NON périmés.
     // RM-11-01 : jamais négatif — si le disponible (lots non périmés) < quantity -> throw ConflictException("Stock insuffisant ...").
     // Pour CHAQUE lot entamé : crée un StockMovement(type DISPENSE, quantity NÉGATIVE, reference, memberId)
     // et décrémente StockItem.quantity. Met à jour FacilityStockState.lastFreshAt = now (un mouvement = stock frais).
     // S'exécute DANS la transaction de l'appelant (tx) — comme HealthRecordWriterService.appendEntry.
   - async availableQuantity(facilityId, medicamentId, now?): Promise<number>
     // = somme des quantités des lots NON périmés (expiryDate > now, RM-11-03) MOINS la somme des
     // ReservationLine de réservations ACTIVE de cette pharmacie pour ce médicament (RM-12-02). Jamais < 0.
   - async isPublishable(facilityId, now?): Promise<boolean>
     // true si : structure canPractice (C6) ET fraîche (FacilityStockState.lastFreshAt > now - PM-33, EF-11-08/RM-11-06)
     // ET pas sous exclusion de strikes (>=3 ReliabilityStrike ACTIVE dans les 30 derniers jours -> exclue PM-34, EF-12-07).
   - async searchAnonymous(args: { district?, items: Array<{ medicamentId, quantity }> }): Promise<Array<{ district, pharmacyCount, products: Array<{ medicamentId, totalAvailable, pharmaciesWithIt }> }>>
     // EF-12-02 : résultat ANONYME par arrondissement. N'expose JAMAIS d'identité (ni nom, ni position, ni téléphone,
     // ni facilityId). Ne compte que les pharmacies publiables (isPublishable). pharmacyCount = nb de pharmacies
     // publiables couvrant AU MOINS un produit demandé avec availableQuantity>=quantity.
   - async pickOptimalFacility(args: { district, items, excludeFacilityIds? }): Promise<{ facilityId, coverage, freshnessAt } | null>
     // EF-12-03 : meilleure pharmacie de l'arrondissement (publiable, hors excludeFacilityIds). Score documenté
     // (RM-12-04) : 1) couverture max = nb de produits demandés dont availableQuantity>=quantity ; 2) stock le plus
     // frais (lastFreshAt récent) ; 3) à égalité, facilityId stable. Retourne null si aucune ne couvre au moins 1 produit.

2) StockService (m11.stock.service.ts) — routes internes de la pharmacie (droit "stock" via M02) :
   - approvisionnement/entrée (EF-11-02 : lot, fournisseur opt, quantité, péremption, prix) : upsert StockItem par
     (facilityId, medicamentId, lotCode), StockMovement(ENTRY, +quantité), MAJ FacilityStockState.lastFreshAt.
   - sortie manuelle motivée (EF-11-03 : vente hors ULAMU/perte/péremption/correction — motif OBLIGATOIRE) :
     StockMovement(EXIT, -quantité, reason), jamais négatif.
   - correction d'inventaire (EF-11-09) : ajuste à une quantité cible -> StockMovement(CORRECTION, delta signé, reason="inventaire").
   - setThreshold (EF-11-05) : upsert StockThreshold(facility, medicament, lowStock).
   - confirmFreshness (EF-11-08, CU-11-03) : insère FreshnessConfirmation + MAJ FacilityStockState.lastFreshAt=now
     -> réintègre la pharmacie à la recherche immédiatement.
   - listMovements (EF-11-06) : journal par lot/pharmacie, paginé.
   - alerts (EF-11-05) : stock faible (quantité<=lowStock), rupture (0), péremption proche (<= PM-32 jours).
   - importCsv (EF-11-10) : version simple — accepte un tableau de lignes déjà parsées (medicamentId, lotCode,
     quantity, expiryDate, priceXaf), rapproche, renvoie erreurs ligne par ligne, n'applique qu'après validation.
   Toutes ces routes : await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock") d'abord.
   Audit C5 sur entrées/sorties/corrections/exclusions. RM-11-05 : un membre ne voit jamais le stock d'une autre pharmacie.

3) m11.policies.ts (+ .spec.ts) — fonctions PURES testées : sélection FEFO (lots triés par péremption),
   isFresh(lastFreshAt, pm33Seconds, now), classement pickOptimal (score couverture/fraîcheur), calcul des
   alertes (faible/rupture/péremption proche), invariant somme des mouvements signés == quantité du lot.

4) m11.controller.ts (v1/stocks/...) + m11.dto.ts : routes membres de pharmacie.

5) m11.module.ts (M11StocksModule) : imports [M02RolesStructuresModule, M03VerificationContractsModule] ;
   providers StockService, StockAvailabilityService ; exports [StockAvailabilityService] ; controllers [M11Controller].
   N'édite PAS app.module.ts (je le câblerai).

RM-11-04 : le prix n'est exposé qu'après dévoilement — la recherche anonyme n'expose JAMAIS le prix.
Vérifie au tsc. Rends le résultat structuré (signatures réellement exportées, templates de notif, actions d'audit).`,
  { label: 'impl:m11', phase: 'Stocks (C7/C3)', schema: IMPL_SCHEMA },
)

log(`M11 livré (typecheck=${m11 && m11.typecheck}). Services: ${(m11 && m11.exportedServices ? m11.exportedServices.map((s) => s.name).join(', ') : 'n/a')}`)

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — M09 Ordonnance & M12 Dévoilement (parallèle, dépendent de M11)
// ─────────────────────────────────────────────────────────────────────────────
phase('Ordonnance + Dévoilement')

const m11Sig = JSON.stringify(m11 && m11.exportedServices ? m11.exportedServices : [], null, 2)

const m09Prompt = `${COMMON}

Implémente le MODULE M09 — Ordonnance & Délivrance. Spec :
docs/cahier_des_charges/02_modules/M09_ordonnance_delivrance.md (lis-la entièrement).

Dossier : src/modules/m09-prescriptions/

RÔLE : remplacer l'ordonnance papier par un document signé, infalsifiable, traçable — de la
prescription (en session) à la délivrance en pharmacie.

Frontières consommées (signatures EXACTES) :
- M06 SessionService (../m06-handshake-session/m06.session.service) :
  loadForParticipant(actor, sessionId) -> CareSession (404 si l'acteur n'est pas participant) ;
  une CareSession a { id, status (PREPARING|ACTIVE|ENDED|REFUNDED), patientAccountId, professionalId, subProfileId }.
  EF-09-01/RM-09-01 : on ne prescrit QUE depuis une session ACTIVE et SEUL le professionnel de la session (prescripteur).
- M07 HealthRecordReaderService (../m07-health-record/m07.reader.service) :
  getActiveAllergies({ patientId? | subProfileId? }) -> string[]  // garde-fou EF-09-03.
- M07 HealthRecordWriterService (../m07-health-record/m07.writer.service) :
  appendEntry(tx, { ownerPatientId? | ownerSubProfileId?, type, provenance, authorId?, sourceRef?, payload, supersedesId? })
  // C2. type RecordEntryType: utilise "PRESCRIPTION" au scellement et à chaque délivrance. provenance "RECORDED_BY_PROFESSIONAL".
  // sourceRef "prescription:<id>" / "dispensation:<id>". payload SANS PII inutile. S'exécute dans TA transaction.
- M11 StockAvailabilityService (../m11-stocks/m11.availability.service) — signatures réellement exportées :
${m11Sig}
  // À la délivrance : pour chaque ligne AVEC medicamentId, appelle consume(tx, { facilityId, medicamentId, quantity,
  // reference: "dispensation:<id>", memberId }). Les lignes hors référentiel (freeText) : délivrées SANS décrément stock.
- M02 PermissionsService.assertFacilityRight(accountId, facilityId, "dispense") (RM-09-03, EF-09-06).
- M03 VerificationStatusService.getForFacility(facilityId) -> canPractice (RM-09-03 : pharmacie vérifiée).
- ParamsService : PM-10 (expiration ordonnance, en JOURS).

SERVICES À CRÉER :
1) PrescriptionService (m09.prescription.service.ts) :
   - createInSession(actor, sessionId, dto) : EF-09-01/02/03/04.
     * Charge la session via SessionService.loadForParticipant ; exige status ACTIVE et actor.accountId === professionalId
       et que la catégorie du professionnel soit prescriptrice (généraliste/spécialiste/dentiste/infirmier ; sage-femme
       = domaine encadré — pour le MVP autorise toutes les catégories pro SAUF si tu lis une restriction claire ;
       documente le choix). Patient = session.patientAccountId, sous-profil = session.subProfileId.
     * Lignes : medicamentId (référentiel) OU freeText (hors référentiel, marqué, sans garde-fou). posology, durationDays, qtyPrescribed>0.
     * GARDE-FOU ALLERGIES (EF-09-03) : pour chaque ligne référentielle, compare le médicament aux allergies actives
       (getActiveAllergies). Si correspondance -> exige une confirmation explicite motivée dans le DTO
       (overrides: [{ medicamentId, reason }]) ; sans motif -> 409 bloquant listant l'allergie en cause. Chaque
       passage outre crée AllergyOverride + audit (garde-fou, pas verrou).
     * SCELLEMENT : qrToken aléatoire fort (crypto randomUUID + random bytes), bodyHash = sha256 du contenu canonique
       (réutilise ../../common/crypto/hash-chain si une fonction sha256 existe, sinon node:crypto createHash).
       status ACTIVE, expiresAt = now + PM-10 jours. Écrit une entrée PRESCRIPTION au Carnet (C2, appendEntry dans la tx).
       Lignes hors référentiel -> ReferentialEnrichmentItem. Notifie le patient (C4). Audit. < 5 s.
   - cancel(actor, id, reason) : SEUL le prescripteur, ordonnance non entièrement délivrée -> CANCELLED (motif obligatoire),
     qrToken invalidé (RM-09-05 : pas de réactivation), patient notifié (EF-09-08).
   - listForPatient(actor) : historique du patient (EF-09-09).
   - expire (lazy + sweep) : ACTIVE dont expiresAt<=now -> EXPIRED (PM-10, EF-09-08).
2) DispensationService (m09.dispensation.service.ts) :
   - scanVerify(actor, qrToken) : EF-09-06. Exige droit "dispense" + pharmacie vérifiée + (connexion = requête authentifiée).
     Renvoie l'état RÉEL côté serveur (RM-09-02) : lignes + quantités RESTANTES (qtyPrescribed - qtyDispensed) + validité.
     RM-09-04 : ne révèle QUE l'ordonnance, JAMAIS le Carnet du patient.
   - dispense(actor, qrToken, dto) : EF-09-07. dto = { facilityId, lines: [{ prescriptionLineId, quantity }] }.
     * Vérifs : droit "dispense" sur facilityId, pharmacie vérifiée, ordonnance ACTIVE/PARTIALLY_DISPENSED non expirée.
     * Transaction : pour chaque ligne, quantity>0 et qtyDispensed+quantity<=qtyPrescribed (sinon 409). Crée Dispensation
       + DispensationLine. Pour les lignes référentielles : StockAvailabilityService.consume(tx, ...) (C3, FEFO). Incrémente
       qtyDispensed (updateMany conditionnel anti-course). Recalcule le statut : DISPENSED si toutes lignes soldées, sinon
       PARTIALLY_DISPENSED. Écrit une entrée PRESCRIPTION (délivrance) au Carnet (C2). Notifie le patient. Audit C5.
     * Multi-pharmacies (CU-09-03) : le solde reste délivrable ailleurs. Double délivrance impossible (état serveur + conditionnel).
3) m09.policies.ts (+spec) PURES : transitions de statut, validation des quantités (delta<=restant), calcul du statut
   global (active/partielle/délivrée), expiration (now vs expiresAt), génération qrToken, canonicalisation + sha256 bodyHash,
   catégories prescriptrices.
4) m09.controller.ts : v1/prescriptions (routes prescripteur en session) + v1/prescriptions/scan & /dispense (routes pharmacie). m09.dto.ts.
5) m09.module.ts (M09PrescriptionsModule) : imports [M06HandshakeSessionModule, M07HealthRecordModule, M11StocksModule,
   M02RolesStructuresModule, M03VerificationContractsModule]. providers PrescriptionService, DispensationService.
   N'édite PAS app.module.ts.

Vérifie au tsc. Rends le résultat structuré.`

const m12Prompt = `${COMMON}

Implémente le MODULE M12 — Recherche & Dévoilement. Spec :
docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md (lis-la entièrement).

Dossier : src/modules/m12-search-disclosure/

RÔLE (modèle signature D-009) : dire GRATUITEMENT « le médicament existe près de chez toi » (recherche
anonyme par arrondissement), et VENDRE 500 XAF (PM-03) « voici exactement où, réservé 24 h pour toi ».

Frontières consommées (signatures EXACTES) :
- M11 StockAvailabilityService (../m11-stocks/m11.availability.service) — réellement exportées :
${m11Sig}
  // searchAnonymous (recherche gratuite), pickOptimalFacility (choix de la pharmacie révélée),
  // availableQuantity (disponible publié = stock - réservations actives), isPublishable.
- M13 PaymentsService (../m13-payments/m13.payments.service) :
  requestCharge({ orderRef, payerAccountId, amountXaf, operator, capture: "IMMEDIATE" }) // PAS de beneficiary => 100% ULAMU (PM-03).
  refund(orderRef, reason) // remboursement intégral idempotent (garantie Q-004).
  L'issue arrive par OUTBOX : abonne-toi à "m13.payment.succeeded" et "m13.payment.failed" en onModuleInit
  (this.outbox.on(...)). orderRef de dévoilement = "disclosure:<id>". IGNORE (no-op) tout orderRef qui ne
  commence pas par "disclosure:" (le canal C1 est partagé avec M06 "handshake:" — comme M06 ignore les nôtres).
- M03 VerificationStatusService.getForFacility (déjà appliqué par M11.isPublishable, n'en rajoute pas).
- ParamsService : PM-03 (prix dévoilement XAF), PM-08 (durée dévoilement/réservation, en SECONDES, 24h), PM-34 (exclusion strikes, en JOURS).
- Lecture directe Prisma de Prescription/PrescriptionLine pour « recherche par ordonnance » (lignes restantes
  qtyPrescribed-qtyDispensed>0 d'une ordonnance ACTIVE du patient) — lecture seule, documentée (comme M13 lit M03).

SERVICES À CRÉER :
1) SearchService (m12.search.service.ts) :
   - search(actor, { district?, items }) : EF-12-01/02 — délègue à StockAvailabilityService.searchAnonymous.
     Si zéro résultat -> propose de poser une alerte (EF-12-06/CU-12-01). N'enregistre AUCUNE identité côté patient (D-009).
   - searchByPrescription(actor, prescriptionId) : EF-12-01 — résout les lignes RESTANTES de l'ordonnance ACTIVE du
     patient (404/403 si pas la sienne) -> items -> searchAnonymous.
   - createAlert(actor, { district, medicamentIds }) : ProductAvailabilityAlert (cloche).
2) DisclosureService (m12.disclosure.service.ts) :
   - requestDisclosure(actor, { district, items, operator }) : EF-12-03/CU-12-02.
     * pickOptimalFacility d'abord ; si null -> 409 « aucune pharmacie ne couvre ces produits dans cet arrondissement »
       (+ proposer une alerte). Sinon crée Disclosure(PENDING_PAYMENT, orderRef="disclosure:<id>", requestedItems=items).
     * payments.requestCharge({ orderRef, payerAccountId: actor.accountId, amountXaf: PM-03, operator, capture: "IMMEDIATE" }).
       RIEN n'est révélé tant que le paiement n'est pas confirmé (CU-12-02). Retourne l'état (sans identité de pharmacie).
   - onPaymentSucceeded(payload) : transition conditionnelle PENDING_PAYMENT->ACTIVE. RE-CHOISIS la pharmacie optimale
     AU MOMENT de la confirmation (le stock a pu bouger). Crée la Reservation(ACTIVE, expiresAt=now+PM-08) + ReservationLine
     (déduit du disponible publié, RM-12-02) en transaction SERIALIZABLE en re-vérifiant availableQuantity (anti sur-réservation).
     Pose facilityId révélé, paidAt, expiresAt. Notifie le patient (révélation). Audit. Si AUCUNE pharmacie disponible à la
     confirmation -> refund automatique (RM-12-06) + Disclosure REFUNDED + alerte « me prévenir ».
   - onPaymentFailed(payload) : notifie l'échec (le patient peut relancer) ; rien n'est révélé.
   - getDisclosure(actor, id) : settle l'expiration PARESSEUSEMENT (ACTIVE & expiresAt<=now -> EXPIRED + Reservation EXPIRED,
     stock republié, RM-12-03). RM-12-01 (RÈGLE D'OR) : n'expose nom/téléphone/quartier/GPS/itinéraire/compte à rebours
     QUE si status ACTIVE ; sinon informations MASQUÉES. RM-12-05 : lié au compte du patient (404 sinon).
   - markServed(actor, disclosureId) côté pharmacie (membre de la pharmacie révélée) OU à la délivrance : Reservation SERVED
     + Disclosure SERVED, quantités libérées (RM-12-03).
   - reportUnavailable(actor, disclosureId) : GARANTIE Q-004 (EF-12-06/CU-12-04). Seulement sur dévoilement ACTIVE.
     * Crée ReliabilityStrike(ACTIVE) sur la pharmacie révélée. Libère la réservation.
     * pickOptimalFacility en EXCLUANT la pharmacie fautive (et celles déjà essayées via la chaîne supersedes) :
       - alternative trouvée -> RE-DÉVOILEMENT GRATUIT : nouvelle Disclosure(ACTIVE, supersedesId=ancienne, sans paiement),
         nouvelle Reservation ; l'ancienne passe à un état terminal (EXPIRED). Notifie. (RM-12-06 : jamais payer 2x un échec.)
       - aucune alternative -> refund intégral (payments.refund) + Disclosure REFUNDED + excuse + alerte « me prévenir ».
     * Si la pharmacie atteint 3 strikes ACTIVE en 30 jours -> elle devient non publiable (déjà géré par M11.isPublishable
       qui compte les strikes ; ne duplique pas la logique) + notifie le titulaire (alerte contractuelle).
   - contestStrike(actor, strikeId) côté pharmacie : ACTIVE -> CONTESTED (arbitrage M16 plus tard).
   - sweepExpired() : public, cadencé par M16 plus tard — expire les Disclosure ACTIVE échues (pas de poller ici).
3) m12.policies.ts (+spec) PURES : disclosureIdFromOrderRef(orderRef) (null si pas "disclosure:"), orderRefForDisclosure(id),
   scoring de pickOptimal si tu dupliques (sinon délègue à M11), comptage strikes (>=3 ACTIVE sur 30 jours), calcul du
   compte à rebours (secondes restantes), masquage de la révélation selon le statut.
4) m12.controller.ts : v1/search (recherche + alerte), v1/disclosures (request, get, report-unavailable, mark-served, contest). m12.dto.ts.
5) m12.module.ts (M12SearchDisclosureModule) implements OnModuleInit : imports [M11StocksModule, M13PaymentsModule,
   M03VerificationContractsModule] ; providers SearchService, DisclosureService ; onModuleInit -> abonnements outbox.
   N'édite PAS app.module.ts.

Vérifie au tsc. Rends le résultat structuré (notamment les clés de templates de notif émises).`

const [m09, m12] = await parallel([
  () => agent(m09Prompt, { label: 'impl:m09', phase: 'Ordonnance + Dévoilement', schema: IMPL_SCHEMA }),
  () => agent(m12Prompt, { label: 'impl:m12', phase: 'Ordonnance + Dévoilement', schema: IMPL_SCHEMA }),
])

log(`M09 typecheck=${m09 && m09.typecheck} ; M12 typecheck=${m12 && m12.typecheck}`)

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Vérification adversariale (chasse aux violations d'invariants)
// ─────────────────────────────────────────────────────────────────────────────
phase('Vérification adversariale')

const VERIFY_BASE = `
Tu es un VÉRIFICATEUR ADVERSARIAL hostile. Le code du Chantier 4 vient d'être écrit dans apps/api
(D:/aide externe/nathan/aide_extérieure/ULAMU/APP/apps/api). Ton but : TROUVER des bugs réels, pas
féliciter. Lis le code concerné, raisonne sur les courses, les rejeux, les transitions d'état, les
fuites de données. Pour CHAQUE défaut, donne fichier + ligne approximative + l'invariant violé + un
correctif concret. Sois précis ; pas de remarque cosmétique en BLOCKER. Si tu ne trouves rien sur un
axe, ne fabrique pas de faux positif. Lance "npx tsc --noEmit -p tsconfig.json" pour confirmer la compilation.
`

const verifyPrompts = [
  {
    label: 'verify:invariants-rouge',
    text: `${VERIFY_BASE}
CIBLE : les INVARIANTS DE LA LISTE ROUGE de ce chantier, à travers M09/M11/M12 :
- RM-11-01 : le stock ne devient JAMAIS négatif ; toute variation passe par un StockMovement (somme signée == quantité du lot).
  Cherche un décrément qui ne re-vérifie pas la disponibilité DANS la transaction, ou un consume() non atomique (TOCTOU),
  ou un chemin qui modifie StockItem.quantity sans StockMovement.
- RM-11-03 : un lot périmé n'est JAMAIS compté dans le disponible ni servi en FEFO.
- RM-12-01 (RÈGLE D'OR) : aucune identité de pharmacie (nom/téléphone/GPS/quartier/facilityId) n'est exposée sans dévoilement
  ACTIVE rattaché au compte du patient. Cherche une fuite dans searchAnonymous, getDisclosure (statut non-ACTIVE), les vues/DTO.
- RM-12-02 : disponible publié = stock réel - réservations ACTIVE (pas de double promesse). Cherche une réservation créée hors
  transaction sérialisable / sans re-vérif -> sur-réservation possible.
- RM-09-02 : l'état de l'ordonnance vit côté serveur ; double délivrance impossible (qtyDispensed conditionnel anti-course).
- RM-09-04 : le scan en pharmacie ne révèle JAMAIS le Carnet.
Rends les findings structurés.`,
  },
  {
    label: 'verify:argent-rejeu',
    text: `${VERIFY_BASE}
CIBLE : ARGENT (C1) et IDEMPOTENCE/REJEU dans M12 (dévoilement) :
- Le canal outbox "m13.payment.succeeded/failed" est PARTAGÉ avec M06. Vérifie que M12 IGNORE bien les orderRef non
  "disclosure:" et que M06 ignore les "disclosure:" (déjà censé via handshakeIdFromOrderRef). Un mauvais filtrage =
  exception dans le drain commun (bloque TOUTES les notifications) ou double traitement.
- onPaymentSucceeded rejoué (l'outbox peut rejouer) : la transition PENDING_PAYMENT->ACTIVE doit être conditionnelle et créer
  AU PLUS UNE réservation/un dévoilement révélé. Cherche un second appel qui re-réserverait ou re-révélerait.
- Garantie Q-004 (reportUnavailable) : re-dévoilement gratuit OU remboursement — jamais les deux, jamais aucun. refund() doit
  être idempotent. Le patient ne doit jamais payer 2x le même échec (RM-12-06).
- Capture: dévoilement = capture IMMEDIATE, 100% ULAMU (pas de beneficiary). Vérifie qu'aucun crédit de gains pharmacie n'est
  émis par erreur pour un dévoilement.
- L'appel réseau (requestCharge/refund) doit être HORS transaction DB ; la révélation ne doit jamais précéder la confirmation.
Rends les findings structurés.`,
  },
  {
    label: 'verify:m09-m11-coherence',
    text: `${VERIFY_BASE}
CIBLE : COHÉRENCE M09<->M11 (C3) et garde-fous M09 :
- consume() est appelé DANS la transaction de la délivrance M09 : si le décrément stock échoue (stock insuffisant), la
  délivrance entière doit être annulée (rollback) — vérifie qu'aucune entrée Carnet/qtyDispensed n'est committée si consume jette.
- FEFO : le lot le plus proche de la péremption (non périmé) est servi en premier ; multi-lots si nécessaire.
- Lignes hors référentiel (freeText, medicamentId null) : délivrées sans consume — vérifie qu'aucun appel consume(medicamentId=null) ne casse.
- Garde-fou allergies (EF-09-03) : bloquant sans motif ; AllergyOverride + audit à chaque passage outre ; comparaison sur les
  allergies ACTIVES du Carnet du bon propriétaire (patient OU sous-profil de la session).
- Droits/vérification : prescription seulement par le professionnel d'une session ACTIVE ; délivrance seulement par un membre
  porteur du droit "dispense" d'une pharmacie vérifiée (RM-09-01/03). Cherche un contrôle manquant ou côté client seulement.
- expiresAt = now + PM-10 JOURS (pas secondes). Vérifie l'unité.
Rends les findings structurés.`,
  },
  {
    label: 'verify:fraicheur-strikes-params',
    text: `${VERIFY_BASE}
CIBLE : FRAÎCHEUR (EF-11-08), STRIKES (EF-12-07) et PARAMÈTRES :
- isPublishable : exclut bien (a) non vérifiée C6, (b) non fraîche (lastFreshAt <= now - PM-33 SECONDES), (c) >=3 strikes ACTIVE
  sur 30 jours. Vérifie l'unité de PM-33 (secondes) et PM-34 (jours), et que FacilityStockState.lastFreshAt est mis à jour à
  CHAQUE mouvement ET à chaque confirmation.
- Aucun chiffre métier en dur (cherche 500, 24, 60, 7, 30, 86400 littéraux qui devraient être des PM-xx).
- searchAnonymous/pickOptimalFacility filtrent bien par isPublishable (une pharmacie non fraîche/non vérifiée/strikée ne doit
  jamais apparaître ni être révélée).
- RM-11-05 : un membre ne voit jamais le stock d'une autre pharmacie (contrôle d'accès sur facilityId dans les routes M11).
- Templates de notification : repère toute clé "template" émise par M09/M11/M12 (je dois les enregistrer dans M14). Liste-les
  dans tes findings en MINOR avec invariant "template-a-enregistrer".
Rends les findings structurés.`,
  },
]

const reviews = await parallel(
  verifyPrompts.map((v) => () => agent(v.text, { label: v.label, phase: 'Vérification adversariale', schema: FINDINGS_SCHEMA })),
)

const allFindings = reviews
  .filter(Boolean)
  .flatMap((r) => (r && r.findings ? r.findings : []))

const blockers = allFindings.filter((f) => f.severity === 'BLOCKER')
const majors = allFindings.filter((f) => f.severity === 'MAJOR')
log(`Vérification : ${allFindings.length} findings (${blockers.length} BLOCKER, ${majors.length} MAJOR).`)

return {
  impl: { m11, m09, m12 },
  findings: allFindings,
  counts: { total: allFindings.length, blocker: blockers.length, major: majors.length, minor: allFindings.length - blockers.length - majors.length },
}

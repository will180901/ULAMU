export const meta = {
  name: 'chantier5-ulamu',
  description: 'Chantier 5 ULAMU : M16 Pilotage (KPIs, dashboards, admin, paramètres, cadence) + vérification adversariale',
  phases: [
    { title: 'Pilotage (M16)', detail: 'implémentation du back-office + cadence opérationnelle' },
    { title: 'Vérification adversariale', detail: 'chasse aux violations RM-16 + invariants admin' },
  ],
}

const COMMON = `
PROJET ULAMU — backend apps/api (NestJS 10 modulaire + Prisma 5 + PostgreSQL). Travaille dans
D:/aide externe/nathan/aide_extérieure/ULAMU/APP/apps/api. Le client Prisma est DÉJÀ généré avec
les modèles D10 (AccountSanction + enums SanctionType{SUSPENSION,REACTIVATION,BAN}/SanctionStatus{EXECUTED,
PENDING_SECOND_APPROVAL,REVERSED,REJECTED}; ParameterChange; SupportProcedure + enums SupportProcedureType{
PHONE_CHANGE,OWNER_UNREACHABLE,RECORD_TRANSFER,OTHER}/SupportProcedureStatus{OPEN,COMPLETED,CANCELLED}).
NE MODIFIE PAS schema.prisma.

PATTERNS IMPOSÉS (lis m13-payments comme référence principale, et m13.admin.controller + m13.manual-refunds.service
pour l'admin/double-validation) :
- Un dossier par module : src/modules/m16-pilotage/. Fichiers mXX.module.ts, mXX.*.controller.ts, mXX.dto.ts,
  mXX.policies.ts (+ .spec.ts pour les fonctions PURES), un service par responsabilité.
- AuthGuard global. Acteur via @Actor() (../../common/auth/actor.decorator), type AuthenticatedActor
  (../../common/auth/auth.guard) : { accountId, accountType: "PATIENT"|"PROFESSIONAL"|"ADMIN", sessionId, client }.
  (D-051, 02/09/2026 : "FACILITY_MEMBER" reste dans l'enum Prisma pour les comptes hérités, mais il
  est retiré du produit — ULAMU a trois acteurs. Ne pas en écrire de nouveau code.)
- Routes ADMIN : @UseGuards(AdminGuard) au niveau contrôleur + @AdminOnly(AdminRole.X) par méthode
  (../../common/auth/admin.guard) — TOTP déjà imposé par le guard (RM-01-06). SUPER_ADMIN passe partout.
  Sous-rôles AdminRole : SUPER_ADMIN, ADMIN_FINANCE, ADMIN_VERIFICATION, ADMIN_MAP.
- AUCUN chiffre métier en dur : ParamsService (../../common/params.service) get/getInt/getIntList. Cibles des KPIs
  (30, 20, 1000, 500, 70, 5, 40) = chiffres DE SPEC (plan_releases §3) → constantes documentées dans m16.policies.ts.
- Événements/notifications/audit dans la transaction via OutboxService.emit(tx,{type:"notify.request",payload:{accountId,template,...}})
  et AuditEmitter.emit(tx,{actorId,actorType:"admin",action,resource,context}) (../../common/audit.emitter).
  JAMAIS de contenu médical/texte dans audit ni notif (RM-16-02/05, RM-04-03). Le drain est assuré par M04 — pas de poller.
- Anti-TOCTOU (D-046) : transitions par updateMany CONDITIONNEL + test du count. Idempotence par clés.
- Les clés "template" que tu émets DOIVENT être listées dans ton résultat (je les enregistre dans M14 — n'édite PAS m14-*).

INVARIANTS M16 (la barrière, pas la politesse) :
- RM-16-01 : le Pilotage LIT les domaines métier ; ses SEULES écritures propres sont les SANCTIONS (AccountSanction +
  application sur Account.status/LoginSession), l'HISTORIQUE des paramètres (ParameterChange + PlatformParameter) et les
  PROCÉDURES support (SupportProcedure). Tout autre effet passe par un service exporté d'un module propriétaire.
- RM-16-02 / RM-16-05 : AUCUN accès au contenu d'une session ni au Carnet ; les KPIs/dashboards n'exposent que des AGRÉGATS.
- RM-16-03 : toute action admin = TOTP (guard) + motif obligatoire + audit C5.
- RM-16-04 / EF-16-07 : bannissement définitif = DOUBLE VALIDATION par deux admins DISTINCTS.

CONTRAINTES DE COORDINATION : n'écris QUE dans src/modules/m16-pilotage/. N'édite PAS app.module.ts, schema.prisma,
prisma/seed.ts, ni un autre module. Auto-contrôle : "npx tsc --noEmit -p tsconfig.json" depuis apps/api (corrige TES
erreurs) + specs unitaires des fonctions pures ("npx jest --selectProjects unit src/modules/m16-pilotage"). Commentaires en français, concis.
`

const IMPL_SCHEMA = {
  type: 'object',
  required: ['filesCreated', 'services', 'notifyTemplates', 'typecheck', 'summary'],
  properties: {
    filesCreated: { type: 'array', items: { type: 'string' } },
    services: { type: 'array', items: { type: 'object', required: ['name', 'methods'], properties: { name: { type: 'string' }, methods: { type: 'array', items: { type: 'string' } } } } },
    notifyTemplates: { type: 'array', items: { type: 'string' } },
    auditActions: { type: 'array', items: { type: 'string' } },
    crons: { type: 'array', items: { type: 'string' } },
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

phase('Pilotage (M16)')

const impl = await agent(
  `${COMMON}

Implémente le MODULE M16 — Pilotage & Administration. Spec :
docs/cahier_des_charges/02_modules/M16_pilotage_administration.md (lis-la). Périmètre RÉDUIT MVP
(D-026) : back-office essentiel + KPIs du pilote + cadence opérationnelle. Pas de tableaux de bord riches (V1).

Dossier : src/modules/m16-pilotage/. Crée :

1) m16.policies.ts (+ m16.policies.spec.ts) — fonctions PURES testées :
   - Cibles & évaluation des 7 KPIs (plan_releases §3) : seuil + sens (gte/lte) → statut "green"|"red".
     Constantes documentées : PROS_VERIFIES>=30, PHARMACIES_STOCK_VIVANT>=20, SESSIONS>=1000, DEVOILEMENTS_PAYES>=500,
     TAUX_CONFIRMATION>=70%, TAUX_REMBOURSEMENT_AUTO<=5%, PATIENTS_REVENUS>=40%.
   - rate(numerator, denominator) en % (0 si dénominateur 0), evaluateKpi(value, target, direction).
   - isRateParameter(key) : true pour "PM-01"/"PM-02" (taux de commission → avenant M03).
   - canSecondApproveBan(requestedBy, approverId) : approverId !== requestedBy (EF-16-07).
   - Machine d'états des sanctions (SUSPENSION/REACTIVATION immédiates ; BAN PENDING→EXECUTED/REJECTED).

2) m16.kpi.service.ts — PilotKpiService.getPilotKpis() (EF-16-05, CU-16-03) : les 7 indicateurs en LECTURE SEULE,
   agrégats uniquement (RM-16-05). Calculs (Prisma direct) :
   - prosVerifiesActifs : verificationCase {professionalId not null, status VERIFIED, agreement.versions.some(signedAt not null)}.
   - pharmaciesStockVivant : facilityStockState dont lastFreshAt >= now - PM-33 (secondes).
   - sessionsRealisees : careSession status ENDED.
   - devoilementsPayes : disclosure dont paidAt not null.
   - tauxConfirmation : somme(confirmedTotal)/somme(initiationsTotal) des professionalStats (0 si aucune).
   - tauxRemboursementAuto : somme(incidentsTotal des professionalStats) / (careSession status in [ENDED,REFUNDED]).
   - patientsRevenus : part des patients ayant >=2 careSession parmi ceux en ayant >=1 (groupBy patientAccountId).
   Chaque KPI : { key, label, value, target, unit, status }.

3) m16.dashboard.service.ts — DashboardService (EF-16-01/02), LECTURE SEULE, chacun ne voit QUE le sien :
   - professionalDashboard(actor) [actor PROFESSIONAL] : sessionsThisMonth (careSession professionalId=actor, paidAt>=début du mois),
     gains via PaymentsService.getEarnings("PROFESSIONAL", actor.accountId) → {availableXaf, pendingXaf}, note moyenne
     (professionalStats ratingSum/ratingCount), tauxConfirmation (professionalStats).
   - facilityDashboard(actor, facilityId) [membre ACTIF de la pharmacie — vérifie via prisma.facilityMember] :
     réservations servies (reservation status SERVED, facilityId), gains via getEarnings("FACILITY", facilityId).
   - patientSpace(actor) [actor PATIENT] : nb sessions, nb dévoilements, nb ordonnances, reçus via
     PaymentsService.listReceiptsForPayer(actor.accountId). JAMAIS le contenu du Carnet (RM-16-02).
   Injecte PaymentsService (../m13-payments/m13.payments.service, exporté).

4) m16.admin.service.ts — AdminService (EF-16-03/06/07). Injecte PrismaService, AuditEmitter, ParamsService,
   PaymentsService (refund), VerificationStatusService (lecture). Toutes les méthodes prennent l'adminId (acteur) + motif :
   - searchAccounts(query) : par téléphone (contains) OU nom (patient/pro/membre, contains). Retour minimal
     {accountId, phone, type, status, displayName}. AUCUNE donnée médicale.
   - suspendAccount(adminId, accountId, reason) : transaction — Account.status ACTIVE→SUSPENDED (updateMany conditionnel,
     count), révoque toutes les LoginSession actives (revokedAt=now), AccountSanction(SUSPENSION, EXECUTED, requestedBy=adminId,
     reason), audit "m16.account.suspended", notif au compte (template "m16.account.suspended"). CU-16-01 : si le compte est
     un PROFESSIONAL avec des careSession PREPARING/ACTIVE, rembourse chacune (PaymentsService.refund(orderRef, motif) HORS
     transaction, idempotent) et passe la session à REFUNDED (updateMany conditionnel).
   - reactivateAccount(adminId, accountId, reason) : SUSPENDED→ACTIVE conditionnel, AccountSanction(REACTIVATION, EXECUTED),
     audit, notif "m16.account.reactivated".
   - requestBan(adminId, accountId, reason) : AccountSanction(BAN, PENDING_SECOND_APPROVAL, requestedBy=adminId, reason),
     audit "m16.account.ban_requested" ; notifie les SUPER_ADMIN (qu'une approbation est attendue).
   - approveBan(adminId, sanctionId) : EF-16-07 — exige canSecondApproveBan (adminId != requestedBy) sinon 403 ; transition
     conditionnelle PENDING_SECOND_APPROVAL→EXECUTED (count, un seul gagnant) ; Account.status→CLOSED + closedAt + révoque
     LoginSession ; audit "m16.account.banned" ; notif "m16.account.banned" au compte.
   - rejectBan(adminId, sanctionId) : PENDING→REJECTED (n'importe quel admin, y compris le demandeur), audit.
   - resolveStrike(adminId, strikeId, uphold, reason) : arbitrage M12 (EF-12-07). reliabilityStrike ACTIVE/CONTESTED →
     uphold=false ⇒ CANCELLED (le strike tombe) ; uphold=true ⇒ ACTIVE (maintenu). updateMany conditionnel + audit "m16.strike.resolved".

5) m16.parameters.service.ts — ParametersService (EF-16-04, CU-16-02), SUPER_ADMIN seul (garde au contrôleur) :
   - updateParameter(adminId, key, value, effectiveAtIso, reason) : 404 si le PM n'existe pas (platformParameter.findUnique) ;
     transaction — ParameterChange(key, oldValue, newValue=value, effectiveAt, changedBy=adminId, reason), platformParameter.update
     {value, effectiveAt}, audit "m16.parameter.changed". APRÈS commit : ParamsService.clearCache(). Si isRateParameter(key) :
     pour chaque verificationCase ayant une version d'accord SIGNÉE, appelle M03Service.reissueAgreement(adminId, caseId)
     (../m03-verification-contracts/m03.service, exporté) — déclenche l'avenant (D-022). Borne le lot (take raisonnable).
   - listHistory(key) : parameterChange where key, récents d'abord.

6) m16.support.service.ts — SupportProcedureService (EF-16-03, CU-16-04) : la TRACE auditée des interventions sensibles
   (l'effet réel reste dans les modules propriétaires, RM-16-01). openProcedure(adminId, {type, accountId?, justification, steps}),
   completeProcedure(adminId, id, steps), cancelProcedure(adminId, id, reason), listProcedures(query). Chaque étape auditée.

7) m16.scheduler.service.ts — SchedulerService : la CADENCE opérationnelle (les balayages dé-scopés des chantiers
   précédents). Utilise @nestjs/schedule (@Cron, déjà en dépendances). Injecte (services EXPORTÉS) : SessionService +
   HandshakeService + ReportService (../m06-handshake-session/...), PrescriptionService (../m09-prescriptions/m09.prescription.service),
   DisclosureService (../m12-search-disclosure/m12.disclosure.service), ReconciliationService (../m13-payments/m13.reconciliation.service),
   NotificationsService (../m14-notifications/m14.service). Expose des méthodes PUBLIQUES testables, appelées par les @Cron :
   - tickFrequent() [@Cron toutes les minutes] : m06 SessionService.sweepOverduePreparing + sweepElapsedActive ;
     HandshakeService.sweepExpired ; PrescriptionService.sweepExpired ; DisclosureService.sweepExpired. (D-008, PM-07, PM-10, PM-08.)
   - tickHourly() [@Cron toutes les heures] : ReportService.remindMissingReports ; NotificationsService.retryFailedCritical.
   - tickDaily() [@Cron 1x/jour] : ReconciliationService.runDaily("m16.scheduler") ; NotificationsService.purgeExpired.
   CHAQUE appel de balayage est entouré d'un try/catch qui LOG l'erreur sans interrompre les autres (un balayage en échec ne
   bloque pas la cadence). Retourne un récapitulatif {étape: résultat}.

8) Contrôleurs : m16.read.controller.ts (v1/me/dashboard pro, v1/me/facility/:facilityId/dashboard, v1/me/space patient ;
   v1/admin/pilot-kpis en @AdminOnly()) ; m16.admin.controller.ts (@UseGuards(AdminGuard), v1/admin/...) :
   GET accounts?query= ; POST accounts/:id/suspend|reactivate ; POST accounts/:id/ban (request) + sanctions/:id/approve|reject ;
   POST strikes/:id/resolve ; PUT parameters/:key + GET parameters/:key/history (@AdminOnly(SUPER_ADMIN)) ;
   POST support-procedures + :id/complete + :id/cancel. Sous-rôles cohérents (paramètres = SUPER_ADMIN ; finance = ADMIN_FINANCE ;
   sanctions/strikes = SUPER_ADMIN/ADMIN_VERIFICATION/ADMIN_MAP au plus juste). m16.dto.ts : DTO class-validator (motif obligatoire partout).

9) m16.module.ts (M16PilotageModule) : imports [M13PaymentsModule, M03VerificationContractsModule, M06HandshakeSessionModule,
   M09PrescriptionsModule, M12SearchDisclosureModule, M14NotificationsModule] + ScheduleModule.forRoot() si nécessaire pour @Cron
   (sinon documente que l'orchestrateur l'ajoute) ; providers = tous les services ci-dessus ; controllers = les deux.
   N'édite PAS app.module.ts (l'orchestrateur câble + ajoute ScheduleModule au niveau racine si besoin).

Vérifie au tsc. Rends le résultat structuré (services+méthodes réels, templates de notif émis, actions d'audit, crons).`,
  { label: 'impl:m16', phase: 'Pilotage (M16)', schema: IMPL_SCHEMA },
)

log(`M16 livré (typecheck=${impl && impl.typecheck}). Services: ${(impl && impl.services ? impl.services.map((s) => s.name).join(', ') : 'n/a')}`)

phase('Vérification adversariale')

const VERIFY_BASE = `
Tu es un VÉRIFICATEUR ADVERSARIAL hostile. Le module M16 vient d'être écrit dans
apps/api/src/modules/m16-pilotage/ (D:/aide externe/nathan/aide_extérieure/ULAMU/APP/apps/api). Trouve des bugs RÉELS.
Lis le code concerné, raisonne sur les courses, rejeux, transitions, fuites. Pour CHAQUE défaut : fichier + ligne approx +
invariant violé + correctif concret. Pas de cosmétique en BLOCKER. Lance "npx tsc --noEmit -p tsconfig.json" pour confirmer la compilation.
`

const verifyPrompts = [
  {
    label: 'verify:rm16-lecture-confidentialite',
    text: `${VERIFY_BASE}
CIBLE : RM-16-01 (lecture seule sauf sanctions/paramètres/procédures), RM-16-02/05 (zéro contenu médical, agrégats seulement).
- Cherche toute ÉCRITURE de M16 dans un domaine métier hors de ses 3 écritures propres (sanction sur Account/LoginSession/CareSession,
  ParameterChange/PlatformParameter, SupportProcedure) — p.ex. modifier une entrée Carnet, un message, une ordonnance : INTERDIT.
- Cherche toute LECTURE/EXPOSITION de contenu médical (payload de HealthRecordEntry, body de SessionMessage, diagnostic, symptômes,
  commentaire de notation) dans un dashboard, un KPI, une recherche de compte, un audit ou une notif. Les KPIs/dashboards ne doivent
  exposer que des AGRÉGATS et des champs non médicaux. searchAccounts ne doit jamais fuiter de données sensibles.
- Le dashboard pro/patient/pharmacie : un acteur ne voit QUE le sien (un patient ne lit pas le dashboard d'un autre ; un membre
  ne lit que SA pharmacie — vérifie le contrôle facilityMember actif).
Rends les findings structurés.`,
  },
  {
    label: 'verify:sanctions-ban-double-validation',
    text: `${VERIFY_BASE}
CIBLE : sanctions (CU-16-01) et bannissement double validation (EF-16-07, RM-16-04).
- suspendAccount : la transition ACTIVE→SUSPENDED doit être CONDITIONNELLE (updateMany + count) ; les LoginSession actives
  révoquées ; un compte déjà suspendu/clos ne doit pas re-déclencher d'effets ; idempotence. Le remboursement des sessions en
  cours d'un pro suspendu (CU-16-01) doit être idempotent (refund) et HORS de la transaction DB.
- approveBan : DOIT exiger un admin DISTINCT du demandeur (canSecondApproveBan) — sinon un seul admin pourrait bannir
  (viole EF-16-07). La transition PENDING_SECOND_APPROVAL→EXECUTED doit être conditionnelle (deux approbations concurrentes →
  un seul gagnant). Vérifie qu'on ne peut pas approuver deux fois, ni approuver un BAN déjà REJECTED.
- Le motif est-il OBLIGATOIRE partout (RM-16-03) ? Chaque action est-elle auditée (actorType "admin", action mXX, motif au contexte) ?
- resolveStrike : transition conditionnelle, pas de double résolution.
Rends les findings structurés.`,
  },
  {
    label: 'verify:parametres-cadence',
    text: `${VERIFY_BASE}
CIBLE : paramètres (EF-16-04) et cadence (scheduler).
- updateParameter : SUPER_ADMIN seul (garde au contrôleur @AdminOnly(SUPER_ADMIN)) ; ParameterChange écrit AVEC l'ancienne valeur
  réelle ; PlatformParameter mis à jour ; ParamsService.clearCache() appelé APRÈS (sinon les modules lisent l'ancienne valeur
  jusqu'à 60 s) ; un PM inexistant → 404 (pas de création silencieuse). Si taux (PM-01/PM-02) → reissueAgreement pour les cas
  signés (avenant D-022) — vérifie que ça n'explose pas s'il y a 0 cas, et que ça ne reissue pas pour un PM non-taux.
- scheduler : chaque balayage est dans un try/catch INDIVIDUEL (un échec n'empêche pas les autres) ; les @Cron délèguent à des
  méthodes publiques testables ; aucune dépendance non exportée (sinon l'injection échoue au boot — vérifie que SessionService,
  HandshakeService, ReportService, PrescriptionService, DisclosureService, ReconciliationService, NotificationsService sont bien
  injectables). Pas de second poller outbox. ScheduleModule présent (forRoot) pour que @Cron fonctionne.
- KPIs : les 7 calculs sont-ils corrects et bornés (division par zéro → 0) ? Le taux de confirmation/remboursement/retour est-il
  un vrai ratio cohérent avec les cibles (>=70%, <=5%, >=40%) ? Aucune donnée médicale exposée.
Rends les findings structurés.`,
  },
]

const reviews = await parallel(
  verifyPrompts.map((v) => () => agent(v.text, { label: v.label, phase: 'Vérification adversariale', schema: FINDINGS_SCHEMA })),
)

const allFindings = reviews.filter(Boolean).flatMap((r) => (r && r.findings ? r.findings : []))
const blockers = allFindings.filter((f) => f.severity === 'BLOCKER')
const majors = allFindings.filter((f) => f.severity === 'MAJOR')
log(`Vérification : ${allFindings.length} findings (${blockers.length} BLOCKER, ${majors.length} MAJOR).`)

return {
  impl,
  findings: allFindings,
  counts: { total: allFindings.length, blocker: blockers.length, major: majors.length, minor: allFindings.length - blockers.length - majors.length },
}

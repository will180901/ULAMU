/**
 * Fausse API pour la RELECTURE VISUELLE (chantier 18) — jetable, hors du dépôt.
 *
 * Elle ne prouve aucun comportement : elle sert des données représentatives pour qu'on puisse
 * REGARDER les écrans dans les deux thèmes et les trois tailles. Textes longs, montants à quatre
 * chiffres, listes non vides : c'est là que la mise en page casse.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

const ilYa = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const dans = (h) => new Date(Date.now() + h * 3600e3).toISOString()

/** Le rôle se change à chaud : http://localhost:5174/__role/PROFESSIONAL — sinon on ne verrait
 *  jamais les écrans soignants avec un compte administrateur. */
let ROLE = 'ADMIN'
/** Pour vérifier le garde-fou : http://localhost:5174/__casser/1 sert une forme inattendue. */
let CASSER = false
/**
 * L'état servi, pour la relecture des quatre états du chantier 18 :
 *   plein  — les données ci-dessous
 *   vide   — les mêmes réponses, toutes listes vidées
 *   erreur — 500 sur toute route `/v1/`
 *   lent   — les données, mais après 4 s : c'est l'état de chargement qu'on regarde
 * Bascule : http://localhost:5174/__etat/vide
 */
let ETAT = 'plein'

/** Vide toutes les listes d'une réponse, en profondeur. C'est cela, « aucune donnée ». */
const vider = (v) => {
  if (Array.isArray(v)) return []
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, vider(x)]))
  return v
}

const MOI = {
  accountId: 'a1b2c3d4-0000-0000-0000-000000000001',
  get accountType() { return ROLE },
  username: 'dr.armel',
  phone: '+242069000110',
  firstName: 'Armel',
  lastName: 'Konaté',
  district: 'Moungali',
  category: 'GENERAL_PRACTITIONER',
  specialty: 'Médecin généraliste',
  biography:
    "Médecin généraliste installé à Moungali depuis 2014. Consultations de médecine générale, suivi de l'hypertension et du diabète.",
  get adminRole() { return ROLE === 'ADMIN' ? 'SUPER_ADMIN' : null },
  totpEnabled: true,
  totpEnabledAt: ilYa(4000),
  email: 'armel@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 8,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: ilYa(4000),
}

const seance = (o = {}) => ({
  id: 's1', status: 'ENDED', patientAccountId: 'p1', professionalId: MOI.accountId, subProfileId: null,
  durationMin: 30, paidAt: ilYa(30), endsAt: ilYa(29), endedAt: ilYa(29), remainingSeconds: 0,
  reportDepositedAt: null, reportDueAt: dans(4.5), orderRef: 'cmd-1', ...o,
})

const poignee = (o = {}) => ({
  id: 'h1', status: 'INITIATED', patientAccountId: 'p1', professionalId: MOI.accountId, offerId: 'o1',
  subProfileId: null, initiatedAt: ilYa(1), confirmedAt: null, confirmExpiresAt: dans(1), refusalReason: null,
  windowExpiresAt: dans(1), windowRemainingSeconds: 3600, patientFirstName: 'Mireille', patientAge: 32,
  offerLabel: 'Consultation générale', offerDurationMin: 30, offerPriceXaf: 12500, sessionId: null, ...o,
})

const ROUTES = [
  [/\/v1\/accounts\/me\/totp\/setup/, () => (CASSER
    // Avec `__casser/1` : le secret sans l'adresse de provisionnement — le cas qui faisait tomber
    // l'écran entier avant le 01/09.
    ? { secret: 'JBSWY3DPEHPK3PXPJBSWY3DP' }
    : {
        secret: 'JBSWY3DPEHPK3PXPJBSWY3DP',
        provisioningUri: 'otpauth://totp/ULAMU:dr.armel?secret=JBSWY3DPEHPK3PXPJBSWY3DP&issuer=ULAMU',
      })],
  [/\/v1\/accounts\/me\/consents/, () => [
    { documentType: 'CGU', documentVersion: '1.0', acceptedAt: ilYa(4000) },
    { documentType: 'PRIVACY', documentVersion: '1.0', acceptedAt: ilYa(4000) },
  ]],
  [/\/v1\/accounts\/me\/sessions/, () => [
    { id: 'ls1', client: 'web', deviceLabel: 'Chrome · Windows 11', lastActiveAt: new Date().toISOString(), current: true },
    { id: 'ls2', client: 'mobile', deviceLabel: 'Tecno Camon · Android 14', lastActiveAt: ilYa(6), current: false },
  ]],
  [/\/v1\/accounts\/me\/close-prerequisites/, () => ({ canClose: false, hasActiveSessions: true, hasPendingEarnings: true, hasOpenDisclosures: false })],
  [/\/v1\/accounts\/me$/, () => MOI],

  [/\/v1\/me\/dashboard/, () => ({
    sessionsThisMonth: 6,
    earnings: { availableXaf: 486500, pendingXaf: 32000 },
    lastSixMonths: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].map((m, i) => ({
      month: m, sessions: [3, 5, 2, 8, 4, 6][i], earnedXaf: [30000, 50000, 20000, 80000, 40000, 60000][i],
    })),
    averageRating: 4.8, confirmationRatePct: 92,
  })],
  [/\/v1\/me\/space/, () => ({ space: 'professional' })],

  [/\/v1\/handshakes\/mine/, () => ({ items: [
    poignee({ id: 'h1' }),
    poignee({ id: 'h2', status: 'CONFIRMED', patientFirstName: 'Bertrand', patientAge: 58, offerLabel: 'Suivi', offerDurationMin: 15, offerPriceXaf: 6000, initiatedAt: ilYa(5), confirmedAt: ilYa(4), confirmExpiresAt: null, windowExpiresAt: dans(7), windowRemainingSeconds: 25200 }),
    poignee({ id: 'h3', status: 'PAID', patientFirstName: 'Alice', patientAge: 41, initiatedAt: ilYa(30), confirmedAt: ilYa(29), confirmExpiresAt: null, windowExpiresAt: null, windowRemainingSeconds: 0, sessionId: 's1' }),
    poignee({ id: 'h4', status: 'EXPIRED', patientFirstName: 'Gisèle', patientAge: 27, offerLabel: 'Suivi', initiatedAt: ilYa(80), confirmExpiresAt: null, windowExpiresAt: null, windowRemainingSeconds: 0 }),
    poignee({ id: 'h5', status: 'REFUSED', patientFirstName: 'Nadia', patientAge: 63, initiatedAt: ilYa(120), confirmExpiresAt: null, windowExpiresAt: null, windowRemainingSeconds: 0, refusalReason: 'Hors de ma compétence' }),
  ] })],

  [/\/v1\/care-sessions\/mine/, () => ({ items: [
    seance({ id: 's1' }),
    seance({ id: 's2', orderRef: 'cmd-2', reportDepositedAt: ilYa(2), reportDueAt: null }),
    seance({ id: 's3', orderRef: 'cmd-3', status: 'REFUNDED', reportDueAt: null }),
    seance({ id: 's4', orderRef: 'cmd-4', status: 'ACTIVE', endedAt: null, endsAt: dans(0.3), remainingSeconds: 900, reportDueAt: null }),
    seance({ id: 's5', orderRef: 'cmd-5', subProfileId: 'sub-1', reportDueAt: ilYa(2) }),
  ] })],

  [/\/v1\/care-sessions\/[^/]+\/record\/summary/, () => ({ bloodType: 'O+', activeAllergies: ['Pénicilline', 'Arachide'], chronicDiseases: ['Hypertension', 'Diabète de type 2'] })],
  [/\/v1\/care-sessions\/[^/]+\/record/, () => ({ recordId: 'r1', items: [
    { id: 'e1', type: 'ALLERGY', provenance: 'DECLARED_BY_PATIENT', authorId: null, sourceRef: null, payload: { label: 'Pénicilline' }, supersedesId: null, createdAt: ilYa(3000), superseded: false },
    { id: 'e2', type: 'MEDICAL_HISTORY', provenance: 'RECORDED_BY_PROFESSIONAL', authorId: 'pro', sourceRef: null, payload: { kind: 'chronic_disease', label: 'Hypertension' }, supersedesId: null, createdAt: ilYa(2000), superseded: false },
    { id: 'e3', type: 'CONSULTATION_REPORT', provenance: 'RECORDED_BY_PROFESSIONAL', authorId: 'pro', sourceRef: null, payload: { diagnosis: 'Tachycardie bénigne liée à la caféine' }, supersedesId: null, createdAt: ilYa(500), superseded: true },
  ], nextCursor: null })],
  [/\/v1\/care-sessions\/[^/]+\/messages/, () => ({ items: [
    { id: 'm1', sessionId: 's4', senderId: 'p1', kind: 'TEXT', body: 'Bonjour Docteur. Depuis une semaine je me réveille la nuit avec le cœur qui bat très vite, parfois pendant dix minutes.', fileKey: null, mediaKeys: [], clientMsgId: 'c1', createdAt: ilYa(0.4), editedAt: null, deletedAt: null, replyTo: null, status: null, reactions: [] },
    { id: 'm2', sessionId: 's4', senderId: MOI.accountId, kind: 'TEXT', body: 'Bonjour. Ressentez-vous une douleur dans la poitrine ou des vertiges pendant ces épisodes ?', fileKey: null, mediaKeys: [], clientMsgId: 'c2', createdAt: ilYa(0.3), editedAt: null, deletedAt: null, replyTo: null, status: 'read', reactions: [{ emoji: '🙏', count: 1, mine: false }] },
    { id: 'm3', sessionId: 's4', senderId: 'p1', kind: 'TEXT', body: 'Pas de douleur. Un peu d’essoufflement au début mais ça passe.', fileKey: null, mediaKeys: [], clientMsgId: 'c3', createdAt: ilYa(0.2), editedAt: ilYa(0.19), deletedAt: null, replyTo: { id: 'm2', senderId: MOI.accountId, kind: 'TEXT', preview: 'Bonjour. Ressentez-vous une douleur…' }, status: null, reactions: [] },
  ], nextCursor: null })],
  [/\/v1\/care-sessions\/[^/]+$/, () => seance({ id: 's4', status: 'ACTIVE', endedAt: null, endsAt: dans(0.3), remainingSeconds: 900, reportDueAt: null, otherPartyTyping: true, extensionTotalSec: 600, professionalDelaySec: 0, autoStartAt: null, handshakeId: 'h3', startedAt: ilYa(0.5), rated: false, preConsultation: { symptoms: 'Palpitations nocturnes depuis trois nuits, surtout après une journée chargée.', sinceWhen: '3 jours', attachments: [], submittedAt: ilYa(0.5) } })],

  [/\/v1\/offers\/limits/, () => ({ durationMinMinutes: 10, durationMaxMinutes: 60, priceFloorXaf: 500, maxActiveOffers: 5, activeOffers: 2 })],
  [/\/v1\/offers$/, () => [
    { id: 'of1', professionalId: MOI.accountId, label: 'Consultation générale', durationMin: 30, priceXaf: 12500, kind: 'STANDARD', active: true, createdAt: ilYa(500), updatedAt: ilYa(500) },
    { id: 'of2', professionalId: MOI.accountId, label: 'Suivi', durationMin: 15, priceXaf: 6000, kind: 'FOLLOW_UP', active: true, createdAt: ilYa(400), updatedAt: ilYa(400) },
  ]],
  [/\/v1\/directory\//, () => ({
    professionalId: MOI.accountId, displayName: 'Dr Armel Konaté', category: 'GENERAL_PRACTITIONER',
    specialty: 'Médecin généraliste', district: 'Moungali', badgeVerified: true,
    rating: { avg: 4.8, count: 214 },
    reactivity: { confirmRatePct: 92, avgConfirmDelayS: 240 },
    presence: 'ONLINE', availableNow: true,
    cheapestOffer: { id: 'of2', label: 'Suivi', durationMin: 15, priceXaf: 6000, kind: 'FOLLOW_UP' },
    relevanceScore: 0.87,
    biography: MOI.biography,
    offers: [
      { id: 'of1', label: 'Consultation générale', durationMin: 30, priceXaf: 12500, kind: 'STANDARD' },
      { id: 'of2', label: 'Suivi', durationMin: 15, priceXaf: 6000, kind: 'FOLLOW_UP' },
    ],
    ratingDistribution: { '5': 160, '4': 38, '3': 10, '2': 4, '1': 2 },
    latestComments: [
      { score: 5, comment: 'Très à l’écoute, explications claires.', createdAt: ilYa(50) },
      { score: 4, comment: 'Rapide et efficace.', createdAt: ilYa(120) },
    ],
  })],

  [/\/v1\/prescriptions\/prescribed/, () => ({ items: [{ id: 'o1', sessionId: 's2', status: 'ACTIVE', qrToken: 'tok-123', subProfileId: null, expiresAt: dans(600), createdAt: ilYa(40), cancelReason: null, lines: [
    { id: 'l1', medicamentId: 'm1', medicationName: 'Amoxicilline 500 mg', freeText: null, posology: '1 gélule matin et soir, pendant les repas', durationDays: 7, qtyPrescribed: 14, qtyDispensed: 0 },
    { id: 'l2', medicamentId: null, medicationName: null, freeText: 'Sirop antitussif local', posology: '1 cuillère le soir', durationDays: 5, qtyPrescribed: 1, qtyDispensed: 0 },
  ] }] })],
  [/\/v1\/medicaments/, () => ({ items: [
    { id: 'm1', dci: 'Amoxicilline', commercialNames: ['Clamoxyl', 'pénicilline'], form: 'gélule', dosage: '500 mg' },
    { id: 'm2', dci: 'Paracétamol', commercialNames: ['Doliprane'], form: 'comprimé', dosage: '500 mg' },
  ] })],

  [/\/v1\/me\?holderType/, () => ({ holderType: 'PROFESSIONAL', holderId: MOI.accountId, availableXaf: 486500, pendingXaf: 32000, entries: [
    { id: 'e1', type: 'CREDIT', amountXaf: 11250, reference: 'cmd-2', createdAt: ilYa(2), grossXaf: 12500, commissionXaf: 1250 },
    { id: 'e2', type: 'CREDIT', amountXaf: 17000, reference: 'cmd-9', createdAt: ilYa(72), grossXaf: 20000, commissionXaf: 3000 },
    { id: 'e3', type: 'WITHDRAWAL', amountXaf: -50000, reference: 'withdrawal:w1', createdAt: ilYa(100), grossXaf: null, commissionXaf: null },
    { id: 'e4', type: 'REVERSAL', amountXaf: -11250, reference: 'cmd-3', createdAt: ilYa(120), grossXaf: 12500, commissionXaf: 1250 },
  ], withdrawals: [
    { id: 'w1', amountXaf: 50000, operator: 'MTN_MOMO', status: 'EXECUTED', failReason: null, requestedAt: ilYa(100), executedAt: ilYa(96) },
    { id: 'w2', amountXaf: 20000, operator: 'AIRTEL_MONEY', status: 'FAILED', failReason: 'Numéro non enregistré chez l’opérateur', requestedAt: ilYa(300), executedAt: null },
  ] })],

  [/\/v1\/presence\/heartbeat/, () => ({ ok: true })],
  [/\/v1\/presence\/me/, () => ({ state: 'ONLINE', since: ilYa(1), lastHeartbeatAt: new Date().toISOString(), availableForInitiation: true, maxConcurrentSessions: 3 })],
  [/\/v1\/notifications\/me\/preferences/, () => (CASSER ? {} : { preferences: [
    { category: 'care', enabled: true, adjustable: true }, { category: 'money', enabled: true, adjustable: true },
    { category: 'reminder', enabled: false, adjustable: true }, { category: 'system', enabled: true, adjustable: true },
    { category: 'critical', enabled: true, adjustable: false },
  ] })],

  [/\/v1\/verification\/me/, () => ({
    caseId: 'ab12cd34-0000-0000-0000-000000000000', subjectKind: 'PROFESSIONAL', status: 'VERIFIED', canPractice: false,
    requiredDocuments: ['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'], missingDocuments: [], canSubmit: false, documentsEditable: false,
    announcedDelayHours: 72,
    documents: [
      { id: 'd1', kind: 'ID', expiresAt: null, createdAt: ilYa(400) },
      { id: 'd2', kind: 'DIPLOMA', expiresAt: null, createdAt: ilYa(399) },
      { id: 'd3', kind: 'LICENSE', expiresAt: dans(2000), createdAt: ilYa(398) },
      { id: 'd4', kind: 'PHOTO', expiresAt: null, createdAt: ilYa(397) },
    ],
    decisions: [{ id: 'x1', decision: 'VERIFIED', reasons: 'Pièces conformes, inscription à l’Ordre vérifiée.', documentId: null, documentKind: null, decidedAt: ilYa(300) }],
    agreement: { version: 3, commissionPct: 12, bodyHash: 'a3f9beefcafebabedeadbeef0000c210', body: 'CONTRAT SOIGNANT ULAMU — version 3\n\nArticle 1 — Objet\nLe présent contrat régit les conditions dans lesquelles le professionnel de santé exerce sur la plateforme ULAMU.\n\nArticle 2 — Commission\nULAMU retient 12 % sur chaque consultation honorée.', integrity: true, signedAt: null, effectiveAt: null },
    lastSigned: { version: 2, commissionPct: 10, signedAt: ilYa(1500) },
  })],

  [/\/v1\/admin\/verification\/queue/, () => ({ targetHours: 72, overdueAfterHours: 144, items: [
    { caseId: 'c1', subjectKind: 'PROFESSIONAL', subject: 'professional:p1', subjectName: 'Jean-Didier Mabiala', status: 'SUBMITTED', waitingSince: ilYa(200), documentCount: 4, overdueTarget: true, overdue: true },
    { caseId: 'c2', subjectKind: 'FACILITY', subject: 'facility:f1', subjectName: 'Pharmacie du Marché', status: 'SUBMITTED', waitingSince: ilYa(68), documentCount: 3, overdueTarget: false, overdue: false },
    { caseId: 'c3', subjectKind: 'PROFESSIONAL', subject: 'professional:p3', subjectName: 'Gisèle Ndinga', status: 'IN_REVIEW', waitingSince: ilYa(49), documentCount: 3, overdueTarget: false, overdue: false },
  ] })],
  [/\/v1\/admin\/verification\/[^/]+$/, () => ({ caseId: 'c1', subjectKind: 'PROFESSIONAL', subjectName: 'Jean-Didier Mabiala', status: 'SUBMITTED', submittedAt: ilYa(200), agreementSignedAt: null,
    documents: [{ id: 'd1', kind: 'ID', expiresAt: null, createdAt: ilYa(200) }, { id: 'd2', kind: 'DIPLOMA', expiresAt: null, createdAt: ilYa(200) }],
    missingDocuments: ['LICENSE'], decisions: [] })],

  [/\/v1\/admin\/accounts/, () => [
    { accountId: 'acc-1', phone: '+242069000110', type: 'PROFESSIONAL', status: 'ACTIVE', displayName: 'Armel Konaté' },
    { accountId: 'acc-2', phone: '+242055512470', type: 'PATIENT', status: 'SUSPENDED', displayName: 'Mireille Bantsimba' },
    { accountId: 'acc-3', phone: '+242066774214', type: 'PROFESSIONAL', status: 'BANNED', displayName: 'Grégoire Nkouka' },
  ]],
  [/\/v1\/admin\/support-procedures/, () => [{ id: 'p1', type: 'PHONE_CHANGE', accountId: 'acc-1',
    steps: [{ label: 'Identité vérifiée par pièce justificative', at: ilYa(3), by: 'adm-1' }, { label: 'Ancien numéro confirmé injoignable', at: ilYa(2), by: 'adm-1' }],
    justification: 'Numéro perdu lors d’un vol de téléphone, identité vérifiée au guichet sur présentation de la CNI.', executedBy: 'adm-1', status: 'OPEN', createdAt: ilYa(3), completedAt: null }]],

  [/\/v1\/admin\/finance\/refunds/, () => [
    { requestId: 'r1', paymentId: 'pay1', reason: 'Consultation non honorée · le soignant ne s’est pas présenté à la séance confirmée', status: 'PENDING_SECOND_APPROVAL', requestedBy: 'adm-2', approvedBy: null, createdAt: ilYa(70), decidedAt: null, amountXaf: 145000, payerId: 'p1' },
    { requestId: 'r2', paymentId: 'pay2', reason: 'Double paiement Mobile Money sur la même consultation', status: 'PENDING_SECOND_APPROVAL', requestedBy: MOI.accountId, approvedBy: null, createdAt: ilYa(50), decidedAt: null, amountXaf: 25000, payerId: 'p2' },
    { requestId: 'r3', paymentId: 'pay3', reason: 'Erreur de tarif', status: 'EXECUTED', requestedBy: 'adm-2', approvedBy: MOI.accountId, createdAt: ilYa(200), decidedAt: ilYa(190), amountXaf: 320000, payerId: 'p3' },
  ]],
  [/\/v1\/admin\/finance\/reconcile/, () => ({ checkedAtIso: new Date().toISOString(), aggregatorLines: 128, dbLines: 127, missingInDb: [{ aggregatorRef: 'AGG-77', kind: 'PAYMENT', amountXaf: 12500 }], missingAtAggregator: [], amountMismatch: [{ aggregatorRef: 'AGG-91', kind: 'PAYMENT', dbAmountXaf: 12500, aggregatorAmountXaf: 12000 }], hasGaps: true })],

  [/\/v1\/admin\/parameters\/[^/]+\/impact/, () => ({ key: 'PM-01', isRateParameter: true, signedAgreements: 12 })],
  [/\/v1\/admin\/parameters\/[^/]+\/history/, () => [{ id: 'h1', key: 'PM-01', oldValue: '12', newValue: '10', reason: 'Alignement sur la décision du conseil d’administration du 12 mai.', effectiveAt: ilYa(1500), createdAt: ilYa(1500), changedBy: 'adm-1' }]],
  [/\/v1\/admin\/parameters/, () => [
    { key: 'PM-01', value: '10', description: 'Taux de commission ULAMU sur chaque consultation honorée', effectiveAt: ilYa(2000), updatedAt: ilYa(1500) },
    { key: 'PM-11', value: '72', description: 'Délai cible de traitement d’un dossier de vérification, en heures', effectiveAt: ilYa(2000), updatedAt: ilYa(2000) },
    { key: 'PM-30', value: '86400', description: 'Délai de dépôt du compte-rendu après la fin de la consultation, en secondes', effectiveAt: ilYa(2000), updatedAt: ilYa(2000) },
    { key: 'PM-35', value: '50000', description: 'Seuil de double validation des remboursements manuels, en XAF', effectiveAt: ilYa(2000), updatedAt: ilYa(2000) },
  ]],
  [/\/v1\/admin\/admins/, () => [
    { accountId: MOI.accountId, username: 'super', firstName: 'Armel', lastName: 'Konaté', phone: '+242069000110', role: 'SUPER_ADMIN', assignedBy: null, assignedAt: ilYa(2000) },
    { accountId: 'adm-2', username: 'p.okemba', firstName: 'Patrick', lastName: 'Okemba', phone: '+242053310988', role: 'ADMIN_VERIFICATION', assignedBy: MOI.accountId, assignedAt: ilYa(900) },
    { accountId: 'adm-3', username: 'f.mbou', firstName: 'Firmine', lastName: 'Mbou', phone: '+242067742140', role: 'ADMIN_FINANCE', assignedBy: MOI.accountId, assignedAt: ilYa(600) },
    { accountId: 'adm-4', username: 'c.koumba', firstName: 'Chancelle', lastName: 'Koumba', phone: '+242061185502', role: null, assignedBy: null, assignedAt: null },
  ]],
  [/\/v1\/support-requests\/mine/, () => [
    { id: 'r1', subject: 'PHONE_CHANGE', body: 'J’ai perdu mon téléphone et je ne reçois plus le code de connexion. Mon numéro était le +242 06 900 01 10.', status: 'ANSWERED', createdAt: ilYa(50), answer: 'Présentez-vous au guichet avec votre pièce d’identité. Nous changerons le numéro après vérification.', answeredAt: ilYa(20) },
    { id: 'r2', subject: 'OTHER', body: 'Mon dossier de vérification est en attente depuis trois semaines.', status: 'OPEN', createdAt: ilYa(6), answer: null, answeredAt: null },
  ]],
  [/\/v1\/admin\/support-requests/, () => [
    { id: 'r2', subject: 'OTHER', body: 'Mon dossier de vérification est en attente depuis trois semaines.', status: 'OPEN', createdAt: ilYa(6), answer: null, answeredAt: null, requesterId: 'p1', requesterName: 'Mireille Bantsimba', requesterPhone: '+242055512470' },
    { id: 'r3', subject: 'RECORD_TRANSFER', body: 'Je voudrais transférer le carnet de ma fille sur son propre compte, elle vient d’avoir 18 ans.', status: 'OPEN', createdAt: ilYa(30), answer: null, answeredAt: null, requesterId: 'p2', requesterName: 'Bertrand Nkouka', requesterPhone: '+242066774214' },
  ]],
  [/\/v1\/admin\/audit\/integrity/, () => ({ ok: true, checked: 48912 })],
  [/\/v1\/admin\/audit/, () => ({ items: [
    { seq: '42', actorId: 'adm-1', actorType: 'admin', action: 'm02.admin.role_assigned', resource: 'account:adm-2', context: { reason: 'Prise de fonction · formation à l’instruction des dossiers achevée.' }, hash: 'abc', createdAt: ilYa(900) },
    { seq: '41', actorId: 'adm-1', actorType: 'admin', action: 'm02.admin.role_revoked', resource: 'account:adm-9', context: { reason: 'Départ de la structure au 31 décembre.' }, hash: 'abd', createdAt: ilYa(1800) },
  ], nextCursor: null })],
  [/\/v1\/admin\/pilot-kpis/, () => [
    { key: 'PROS_VERIFIES', label: 'Professionnels vérifiés et actifs', value: 12, target: 30, unit: 'count', status: 'KO' },
    { key: 'PHARMACIES_STOCK_VIVANT', label: 'Pharmacies au stock vivant', value: 8, target: 10, unit: 'count', status: 'KO' },
    { key: 'SESSIONS', label: 'Sessions réalisées', value: 214, target: 200, unit: 'count', status: 'OK' },
    { key: 'DEVOILEMENTS_PAYES', label: 'Dévoilements payés', value: 48, target: 60, unit: 'count', status: 'KO' },
    { key: 'TAUX_CONFIRMATION', label: 'Taux de confirmation des poignées de main', value: 92, target: 80, unit: '%', status: 'OK' },
    { key: 'TAUX_REMBOURSEMENT_AUTO', label: 'Taux de remboursement automatique', value: 98, target: 95, unit: '%', status: 'OK' },
    { key: 'PATIENTS_REVENUS', label: 'Patients revenus (≥ 2 sessions)', value: 34, target: 40, unit: '%', status: 'KO' },
  ]],
  [/\/v1\/admin\/coverage/, () => [
    { district: 'Bacongo', professionals: 8, facilities: 3 },
    { district: 'Poto-Poto', professionals: 5, facilities: 2 },
    { district: 'Moungali', professionals: 4, facilities: 2 },
    { district: 'Makélékélé', professionals: 1, facilities: 0 },
  ]],
  [/\/v1\/admin\/reports/, () => ({ items: [
    { id: 'sig-1', targetType: 'PROFESSIONAL', targetId: 'ab12cd34-0000-0000-0000-000000000000', reasonCode: 'HARASSMENT', reasonText: 'Propos jugés méprisants pendant une téléconsultation. Le praticien a mis fin à l’échange au bout de deux minutes en qualifiant la demande de « perte de temps ».', status: 'OPEN', createdAt: ilYa(80), isOverdue: true },
    { id: 'sig-2', targetType: 'PROFESSIONAL', targetId: 'cd34ef56', reasonCode: 'SPAM', reasonText: 'Messages répétés hors consultation.', status: 'IN_REVIEW', createdAt: ilYa(10), isOverdue: false },
    { id: 'sig-3', targetType: 'PROFESSIONAL', targetId: 'ef56ab78', reasonCode: 'MISLEADING_INFORMATION', reasonText: 'Spécialité annoncée non conforme au diplôme.', status: 'ACTION_TAKEN', createdAt: ilYa(400), isOverdue: false },
  ] })],
]

const manquants = new Set()

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  const url = req.url ?? ''


  if (url.startsWith('/__auditeur2.js')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
    return res.end(readFileSync(new URL('./auditeur2.js', import.meta.url), 'utf-8'))
  }

  if (url.startsWith('/__auditeur.js')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
    return res.end(readFileSync(new URL('./auditeur.js', import.meta.url), 'utf-8'))
  }

  const etat = /^\/__etat\/(\w+)/.exec(url)
  if (etat) {
    ETAT = etat[1]
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ etat: ETAT }))
  }

  const casse = /^\/__casser\/(\d)/.exec(url)
  if (casse) {
    CASSER = casse[1] === '1'
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ casser: CASSER }))
  }

  const bascule = /^\/__role\/(\w+)/.exec(url)
  if (bascule) {
    ROLE = bascule[1]
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ role: ROLE }))
  }

  if (ETAT === 'erreur' && url.startsWith('/v1/')) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ statusCode: 500, message: 'Erreur interne du serveur' }))
  }

  for (const [motif, faire] of ROUTES) {
    if (motif.test(url)) {
      const corps = JSON.stringify(ETAT === 'vide' ? vider(faire()) : faire())
      const envoyer = () => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(corps)
      }
      return ETAT === 'lent' ? setTimeout(envoyer, 4000) : envoyer()
    }
  }
  if (!manquants.has(url)) {
    manquants.add(url)
    console.log('NON COUVERT →', req.method, url)
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end('{}')
}).listen(5174, () => console.log('Fausse API de revue sur http://localhost:5174'))

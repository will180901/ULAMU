/**
 * Client API ULAMU (app web soignant/administration) — même contrat REST que le backend NestJS déjà
 * consommé par l'app mobile patiente (apps/mobile/src/lib/api-client.ts) ; ce fichier est un client
 * minimal indépendant (pas de package partagé, cohérent avec l'app mobile qui a elle aussi son propre
 * client vendoré plutôt qu'un package @ulamu/shared).
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'NETWORK'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details?: unknown

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function codeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'RATE_LIMITED'
    default:
      return status >= 500 ? 'SERVER' : 'BAD_REQUEST'
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

let getToken: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

/** Branché une fois par le store de session (évite une dépendance circulaire lib -> state -> lib). */
export function configureApi(opts: { getToken: () => string | null; onUnauthorized: () => void }): void {
  getToken = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

async function request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken?.()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    throw new ApiError(0, 'NETWORK', 'Connexion impossible — vérifiez votre réseau et réessayez.', err)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const parsed = text.length > 0 ? safeJson(text) : undefined

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.()
    const message =
      parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : `Erreur ${res.status}`
    throw new ApiError(res.status, codeFromStatus(res.status), message, parsed)
  }

  return parsed as T
}

// ── Contrats minimaux (Phase 0 : auth) ─────────────────────────────────────

export interface LoginRequest {
  /** Nom d'utilisateur OU adresse email (2026-07 — l'API accepte les deux, cf. m01.service). */
  username: string
  password: string
  client: 'web'
  deviceLabel?: string
  totpCode?: string
  /** Code reçu par email quand la 2FA email est active — cf. `otpRequired` dans la réponse. */
  otpCode?: string
}
/**
 * Ce que la connexion renvoie — et le second facteur qui manquait ici (chantier 31, 02/09/2026).
 *
 * Le serveur signale un second facteur par un **200 sans jeton**, jamais par une exception. Il en a
 * DEUX : `totpRequired` (application d'authentification) et `otpRequired` (code envoyé par email).
 *
 * ⚠️ `otpRequired` n'était pas déclaré ici, et `LoginPage` ne le lisait pas. Conséquence pour un
 * compte ayant activé la 2FA par email : le serveur répondait `{ totpRequired: false,
 * otpRequired: true }` sans jeton, les deux branches de l'écran tombaient à côté, **et il ne se
 * passait RIEN** — pas de message, pas d'étape suivante, le bouton s'arrêtait de tourner. Le compte
 * était enfermé dehors du web, en silence.
 *
 * Les deux facteurs sont exclusifs dans le temps : le serveur vérifie le TOTP d'abord, puis l'email.
 */
export interface LoginResponse {
  totpRequired: boolean
  /** Un code a été envoyé à l'adresse du compte : le rejouer dans `login` avec `otpCode`. */
  otpRequired?: boolean
  sessionToken?: string
  accountId?: string
  accountType?: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN'
}
/**
 * Les TROIS acteurs d'ULAMU : le patient (mobile), le professionnel et l'administration (web).
 * Cette application n'en sert que deux — les patients restent sur mobile (D-039/D-044).
 *
 * ⚠️ L'énumération Prisma en compte un quatrième, `FACILITY_MEMBER`, **fermé le 02/09/2026**
 * (chantier 25) : sa route d'inscription est retirée, aucun compte ne peut plus naître. La valeur
 * reste en base — l'en retirer demanderait une migration sur la production, et le journal d'audit,
 * en insertion seule, porte encore des lignes qui la nomment. Un compte hérité qui se connecterait
 * ici retombe sur le parcours soignant : chaque branche a son repli, rien ne plante.
 */
export interface MeResponse {
  accountId: string
  accountType: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN'
  username: string | null
  phone: string
  firstName: string | null
  lastName: string | null
  district: string | null
  category: string | null
  specialty: string | null
  biography: string | null
  adminRole: 'SUPER_ADMIN' | 'ADMIN_FINANCE' | 'ADMIN_VERIFICATION' | 'ADMIN_MAP' | null
  totpEnabled: boolean
  totpEnabledAt: string | null
  /** Adresse du compte — `null` tant qu'aucune n'a été ajoutée. C'est le canal de récupération. */
  email: string | null
  emailTwoFactorEnabled: boolean
  /** Clé de la photo de profil (patients, soignants, membres de structure). `null` = initiales. */
  avatarKey: string | null
  /** Codes de secours encore utilisables. À 0, un incident enferme le compte dehors. */
  backupCodesRemaining: number
  backupCodesTotal: number
  backupCodesGeneratedAt: string | null
}

// ── Inscription (Étape 2) ───────────────────────────────────────────────────

/**
 * Vérification à l'inscription : par EMAIL (2026-07 — remplace le SMS, cf. common/email/email.service).
 * Le TOTP ne peut pas servir ici : à l'inscription, aucun secret n'est encore associé au compte. Il prend
 * le relais ensuite, et lui seul, pour la connexion (2e facteur) et la réinitialisation de mot de passe —
 * règle « jamais de SMS ni de code par email pour récupérer un compte web ».
 */
export interface RequestOtpRequest {
  email: string
  purpose: 'REGISTRATION' | 'PASSWORD_RESET'
}
export interface RequestOtpResponse {
  expiresInSeconds: number
  /** Présent uniquement en mode démo (OTP_ECHO=true côté API). */
  debugCode?: string
}
export type ProfessionalCategory = 'GENERAL_PRACTITIONER' | 'SPECIALIST' | 'DENTIST' | 'MIDWIFE' | 'NURSE' | 'COMMUNITY_HEALTH_WORKER'
export interface RegisterProfessionalRequest {
  phone: string
  email: string
  username: string
  otpCode: string
  password: string
  firstName: string
  lastName: string
  category: ProfessionalCategory
  specialty?: string
  /**
   * Acceptation explicite des CGU et de la politique de confidentialité (EF-01-08, loi n° 29-2019).
   * L'API refuse l'inscription si ce champ n'est pas `true` : le serveur écrit un enregistrement de
   * consentement qualifié de « preuve légale, immuable », il ne peut pas le fabriquer tout seul.
   */
  acceptTerms: boolean
  client: 'web'
  deviceLabel?: string
}
export interface RegisterResponse {
  accountId: string
  sessionToken: string
}

// ── Sécurité TOTP (Étape 3 — obligatoire sur le web, jamais de SMS pour la récupération) ──

export interface SetupTotpResponse {
  secret: string
  provisioningUri: string
}
export interface ConfirmTotpResponse {
  backupCodes: string[]
}
/**
 * Tableaux de bord — module M16, EF-16-01. Ces routes existaient côté serveur sans être appelées
 * par le web. Elles renvoient PEU de chiffres, et c'est une contrainte réelle du produit : ni
 * tendance, ni série temporelle, ni répartition par type ne sont calculées nulle part. Ce que la
 * maquette B2 en demande n'existe donc pas encore — voir §9 du plan.
 */
export interface ProfessionalDashboard {
  sessionsThisMonth: number
  earnings: { availableXaf: number; pendingXaf: number }
  /**
   * Les six derniers mois, du plus ancien au plus récent — ajoutés le 24/08/2026.
   *
   * Un mois sans activité vaut ZÉRO et garde sa place : ne renvoyer que les mois vécus donnerait
   * une courbe qui saute des mois entiers. `earnedXaf` ne compte que les CRÉDITS — un retrait n'est
   * pas un gain, et l'inclure ferait descendre la courbe quand le médecin touche son argent.
   */
  lastSixMonths: Array<{ month: string; sessions: number; earnedXaf: number }>
  averageRating: number | null
  confirmationRatePct: number
}

export interface ResetPasswordTotpRequest {
  username: string
  code: string
  newPassword: string
}
/**
 * Réinitialisation par code reçu par EMAIL — seconde voie de récupération.
 *
 * Elle existait côté serveur (`POST /v1/auth/password-reset`, publique) sans être exposée ici, parce
 * que le web imposait le TOTP à tous. Depuis que le second facteur est volontaire (20/08/2026), un
 * compte sans authentificateur qui oublie son mot de passe n'aurait plus AUCUN recours.
 */
export interface ResetPasswordRequest {
  email: string
  otpCode: string
  newPassword: string
}

// ── M01 — Sécurité du compte (CU-01-05/06/07) ──────────────────────────────

/** Une session de connexion ouverte. `current` = celle de cet onglet — on ne se révoque pas soi-même. */
export type NotificationCategory = 'care' | 'money' | 'reminder' | 'system' | 'critical'

/**
 * Une notification reçue — telle que le serveur la RESTITUE (chantier 37, 03/09/2026).
 *
 * ⚠️ `title` et `body` sont rendus **au moment de la lecture**, depuis le catalogue de modèles
 * (EF-14-03) et la charge utile stockée. Le texte n'est donc pas figé en base : corriger une
 * formulation dans `m14.templates.ts` corrige aussi les notifications déjà reçues.
 *
 * `template` est l'identifiant du modèle (`m06.handshake.initiated`, …). Il est servi et il est
 * précieux : c'est lui qui permettrait un jour de faire d'une notification un LIEN vers l'écran
 * concerné. Aujourd'hui l'écran ne s'en sert pas — voir la dette au §9.
 */
export interface NotificationRecue {
  id: string
  template: string
  category: string
  priority: string
  title: string
  body: string
  /** `null` = jamais lue. C'est cette valeur, et non un booléen, qui dit AUSSI quand elle l'a été. */
  readAt: string | null
  createdAt: string
}

export interface NotificationsPage {
  items: NotificationRecue[]
  /** `null` = dernière page. À repasser en `cursor` pour la suivante. */
  nextCursor: string | null
}

export interface SessionInfo {
  id: string
  client: string
  deviceLabel: string | null
  lastActiveAt: string
  current: boolean
}

// ── M05 — Vitrine, offres et présence du professionnel (CU-05-01/03/04) ────

export type OfferKind = 'STANDARD' | 'FOLLOW_UP'
export type PresenceState = 'ONLINE' | 'DO_NOT_DISTURB' | 'OFFLINE'

/**
 * Bornes de composition d'une offre, servies par `GET /v1/offers/limits` (ajout du 27/08).
 *
 * PM-09, PM-06 et PM-25 étaient vérifiées côté serveur et **jamais renvoyées** : l'écran ne
 * pouvait qu'écrire « entre 10 et 60 minutes » en dur, et le médecin découvrait les bornes par un
 * refus APRÈS avoir composé son offre.
 */
export interface OfferLimits {
  durationMinMinutes: number
  durationMaxMinutes: number
  /** Prix plancher en XAF, commission INCLUSE (D-010). */
  priceFloorXaf: number
  maxActiveOffers: number
  activeOffers: number
}

export interface Offer {
  id: string
  professionalId: string
  label: string
  durationMin: number
  /** Prix FINAL payé par le patient, commission incluse (D-010 / RM-05-03). */
  priceXaf: number
  kind: OfferKind
  active: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Un article de l'annuaire — la forme EXACTE relevée sur l'API déployée le 24/08/2026.
 *
 * C'est ce que voit un patient qui cherche un soignant, et c'est ce qui permet à « Ma vitrine » de
 * montrer au médecin sa fiche AU MILIEU des autres plutôt que seule. La route est `@Public()` :
 * l'annuaire se parcourt sans compte (EF-05-04).
 */
export interface DirectoryItem {
  professionalId: string
  displayName: string
  category: ProfessionalCategory
  specialty: string | null
  district: string | null
  badgeVerified: boolean
  rating: { avg: number | null; count: number }
  reactivity: { confirmRatePct: number | null; avgConfirmDelayS: number | null }
  presence: PresenceState
  /** `true` = joignable À L'INSTANT. Un « en ligne » rassis ne compte pas (PM-26). */
  availableNow: boolean
  cheapestOffer: { id: string; label: string; durationMin: number; priceXaf: number; kind: OfferKind } | null
  relevanceScore: number
}

/**
 * La fiche publique complète — littéralement ce qu'un patient voit (`GET /v1/directory/:id`).
 *
 * C2 l'appelle avec SON PROPRE identifiant : « ce que les patients voient » n'est pas une
 * reconstitution, c'est la vraie réponse de la vraie route publique. Et comme cette route filtre
 * sur RM-05-01 (vérifié **et** contrat signé), une absence de réponse est elle-même l'information :
 * le médecin n'est pas dans l'annuaire.
 */
export interface DirectoryProfile extends DirectoryItem {
  biography: string | null
  offers: Array<{ id: string; label: string; durationMin: number; priceXaf: number; kind: OfferKind }>
  /** EF-05-07 — répartition des notes, clé = note. */
  ratingDistribution: Record<string, number>
  /** Anonymes, les plus récents d'abord. */
  latestComments: Array<{ score: number; comment: string; createdAt: string }>
}

/** Fiche synthèse du Carnet, lue en session (EF-06-06). Les trois faits qui changent une conduite. */
export interface HealthSummary {
  bloodType: string | null
  activeAllergies: string[]
  chronicDiseases: string[]
}

export type RecordEntryType =
  | 'CONSULTATION_REPORT'
  | 'PRESCRIPTION'
  | 'LAB_RESULTS'
  | 'VITALS'
  | 'ALLERGY'
  | 'MEDICAL_HISTORY'
  | 'VACCINATION'
  | 'PERSONAL_NOTE'

export interface RecordEntry {
  id: string
  type: RecordEntryType
  /** RM-07-03 : une déclaration du patient n'est JAMAIS présentée comme un diagnostic. */
  provenance: string
  authorId: string | null
  sourceRef: string | null
  payload: Record<string, unknown>
  supersedesId: string | null
  createdAt: string
  superseded?: boolean
}

export interface RecordPage {
  recordId: string | null
  items: RecordEntry[]
  nextCursor: string | null
}

export interface Presence {
  state: PresenceState
  since: string
  lastHeartbeatAt: string
  /** Calculé par le serveur à l'instant de la réponse : un « en ligne » rassis vaut hors ligne (PM-26). */
  availableForInitiation: boolean
}

/**
 * Ma propre présence — la précédente, plus le plafond qui me rend injoignable.
 *
 * `maxConcurrentSessions` (PM-27) n'était servi qu'au PATIENT, dans le texte d'un message d'erreur.
 * L'écran du médecin ne pouvait donc qu'écrire « 3 » en dur — et mentir le jour où le super-admin
 * le change dans E3. Ajouté côté serveur le 27/08 pour cette raison : **aucun chiffre métier n'est
 * écrit dans une page**, on le lit ou on ne l'affiche pas.
 */
export interface OwnPresence extends Presence {
  /** PM-27 — sessions simultanées maximum (EF-06-14). */
  maxConcurrentSessions: number
}

// ── M02 — Sous-rôles d'administration (EF-02-08) ───────────────────────────

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN_FINANCE' | 'ADMIN_VERIFICATION' | 'ADMIN_MAP'

/**
 * Un membre de l'équipe ULAMU et son sous-rôle.
 *
 * ⚠️ Nommé `PlatformAdmin` et NON `AdminAccount` : ce dernier existe déjà plus bas et désigne tout
 * autre chose — un compte utilisateur *vu depuis* la console d'administration (`ComptesPage`).
 * Réutiliser le nom aurait silencieusement changé le sens d'un type déjà employé ailleurs.
 */
export interface PlatformAdmin {
  accountId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  phone: string
  /** `null` = compte d'administration SANS sous-rôle : il n'accède à rien tant qu'on ne lui en donne pas. */
  role: AdminRole | null
  assignedBy: string | null
  assignedAt: string | null
  /**
   * Le second facteur de ce compte — application d'authentification, ou code par email.
   *
   * Servi depuis le 02/09/2026 (chantier 32), en contrepartie de D-053 : le TOTP étant devenu
   * optionnel pour tous, un super-administrateur doit pouvoir voir qui, dans son équipe, est
   * protégé. L'information existait en base et **personne ne pouvait la lire**.
   */
  secondFacteur: { totp: boolean; email: boolean }
}

// ── M16 — Paramètres métier (EF-16-04, CU-16-02) ───────────────────────────

export interface PlatformParameter {
  /** « PM-17 », « PM-35 »… */
  key: string
  /** Sérialisée en texte : un entier, une liste, une durée ISO — selon le paramètre. */
  value: string
  description: string
  effectiveAt: string
  updatedAt: string
}

/**
 * Une modification de paramètre, telle que le serveur la renvoie (`ParameterChange`, insertion seule).
 *
 * ⚠️ Le client déclarait auparavant `{ items: Array<{ value, effectiveAt, changedBy }> }` — une forme
 * inventée qui ne correspondait à rien : la route renvoie les lignes du modèle, sans enveloppe. Toute
 * lecture de l'historique aurait échoué silencieusement.
 */
export interface ParameterChange {
  id: string
  key: string
  oldValue: string
  newValue: string
  reason: string
  effectiveAt: string
  /** Horodatage de la décision. Le champ s'appelle `createdAt` côté serveur, pas `changedAt`. */
  createdAt: string
  changedBy: string
}

// ── M13 — Finance (EF-13-09/10) ────────────────────────────────────────────

export type RefundStatus = 'PENDING_SECOND_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED'

export interface RefundRequest {
  requestId: string
  paymentId: string
  reason: string
  status: RefundStatus
  /** Admin 1. RM-13-06 : l'approbateur doit être quelqu'un d'AUTRE. */
  requestedBy: string
  approvedBy: string | null
  createdAt: string
  decidedAt: string | null
  amountXaf: number | null
  payerId: string | null
}

export interface ReconciliationReport {
  checkedAtIso: string
  aggregatorLines: number
  dbLines: number
  missingInDb: Array<{ aggregatorRef: string; kind: string; amountXaf: number }>
  missingAtAggregator: Array<{ aggregatorRef: string; kind: string; amountXaf: number }>
  amountMismatch: Array<{ aggregatorRef: string; kind: string; dbAmountXaf: number; aggregatorAmountXaf: number }>
  hasGaps: boolean
}

// ── M06 — Poignée de main (CU-06-01) ───────────────────────────────────────

export type HandshakeStatus = 'INITIATED' | 'CONFIRMED' | 'PAID' | 'REFUSED' | 'EXPIRED' | 'ABANDONED'

export interface Handshake {
  id: string
  status: HandshakeStatus
  patientAccountId: string
  professionalId: string
  offerId: string
  subProfileId: string | null
  initiatedAt: string
  confirmedAt: string | null
  confirmExpiresAt: string | null
  refusalReason: string | null
  windowExpiresAt: string | null
  /**
   * Calculé par le SERVEUR (RM-06-02). L'horloge du navigateur n'est qu'indicative : c'est cette
   * valeur qui fait foi, et elle est resynchronisée à chaque interrogation.
   */
  windowRemainingSeconds: number
  /**
   * Fiche ANONYMISÉE du patient — prénom et âge, rien de plus (EF-06-01 : « pas plus avant
   * paiement »). Ajoutée le 24/08/2026 : la vue ne portait qu'un identifiant technique, et le
   * professionnel devait décider en cinq minutes sans savoir s'il s'agissait d'un enfant.
   *
   * Pour une demande faite au nom d'une personne à charge (Carnet familial), ce sont SES prénom et
   * âge — pas ceux du parent qui tient le compte.
   */
  patientFirstName: string | null
  patientAge: number | null
  /** L'offre demandée : ce sur quoi le professionnel décide réellement. */
  offerLabel: string | null
  offerDurationMin: number | null
  offerPriceXaf: number | null
  /** Posé quand la poignée est PAID — porte d'entrée de la session de soin. */
  sessionId: string | null
}

// ── M06 — Session de soin (CU-06-02 à CU-06-05) ────────────────────────────

/**
 * Les QUATRE états d'une séance — vérifiés contre `enum CareSessionStatus` du schéma le 24/08/2026.
 *
 * `CANCELLED` était déclaré ici et n'existe nulle part côté serveur : ni dans l'énumération, ni dans
 * une ligne de M06. Un écran qui en tenait compte codait une branche que rien ne peut atteindre —
 * et un développeur qui la lisait croyait à une annulation possible. Retiré.
 */
export type CareSessionStatus = 'PREPARING' | 'ACTIVE' | 'ENDED' | 'REFUNDED'

export interface CareSession {
  id: string
  handshakeId: string
  status: CareSessionStatus
  patientAccountId: string
  professionalId: string
  subProfileId: string | null
  durationMin: number
  paidAt: string
  startedAt: string | null
  endsAt: string | null
  endedAt: string | null
  /** Seule vérité du décompteur (RM-06-02) — l'horloge locale n'anime qu'entre deux réponses. */
  remainingSeconds: number
  /** PREPARING : démarrage automatique à cette échéance (PM-28), même sans pré-consultation. */
  autoStartAt: string | null
  extensionTotalSec: number
  /** Retard cumulé du soignant au-delà de la tolérance de 30 s entre messages (D-032). */
  professionalDelaySec: number
  /** D-021 : le compte-rendu est OBLIGATOIRE. Tant que c'est `null`, la consultation reste inachevée. */
  reportDepositedAt: string | null
  /**
   * Échéance de dépôt du compte-rendu — servie par le serveur (`endedAt` + PM-30), `null` tant
   * que la session n'est pas close.
   *
   * Au-delà, le dépôt est **REFUSÉ** et les gains gelés : l'écran doit décompter, pas écrire
   * « 24 heures » en dur — ce qu'il faisait, et qui aurait menti au premier changement de PM-30.
   */
  reportDueAt: string | null
  preConsultation: { symptoms: string; sinceWhen: string | null; attachments: string[]; submittedAt: string } | null
  rated: boolean
  otherPartyTyping: boolean
}

/**
 * Un élément de la LISTE des séances — volontairement plus pauvre que `CareSession`.
 *
 * Le serveur ne charge ni la pré-consultation, ni l'indicateur de frappe, ni les extensions pour
 * dresser un registre : ce sont des détails de séance, pas d'historique.
 */
export interface SessionListItem {
  id: string
  status: CareSessionStatus
  patientAccountId: string
  professionalId: string
  subProfileId: string | null
  durationMin: number
  paidAt: string
  endsAt: string | null
  endedAt: string | null
  remainingSeconds: number
  reportDepositedAt: string | null
  /**
   * Échéance de dépôt du compte-rendu — servie par le serveur (`endedAt` + PM-30), `null` tant
   * que la session n'est pas close.
   *
   * Au-delà, le dépôt est **REFUSÉ** et les gains gelés : l'écran doit décompter, pas écrire
   * « 24 heures » en dur — ce qu'il faisait, et qui aurait menti au premier changement de PM-30.
   */
  reportDueAt: string | null
  /**
   * La référence de commande — la clé qui relie une consultation à l'argent qu'elle a rapporté.
   *
   * Le journal des gains porte un mouvement `CREDIT` par consultation capturée, référencé par cette
   * même chaîne. La capture a lieu au DÉPÔT DU COMPTE-RENDU (RM-06-04) : tant qu'il manque, aucun
   * mouvement n'existe — et c'est précisément ce que le registre doit montrer.
   */
  orderRef: string
}

export interface SessionMessage {
  id: string
  sessionId: string
  senderId: string
  kind: string
  body: string | null
  fileKey: string | null
  mediaKeys: string[]
  clientMsgId: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  /**
   * Message cité — le serveur l'envoie et ce type l'omettait (constaté le 24/08/2026 en comparant à
   * `MessageView`). Une omission ne casse rien à l'exécution, mais elle rend le champ invisible à
   * quiconque lit ce fichier pour savoir ce qui arrive vraiment.
   */
  replyTo: { id: string; senderId: string; kind: string; preview: string } | null
  status: 'sent' | 'delivered' | 'read' | null
  reactions: Array<{ emoji: string; count: number; mine: boolean }>
}

// ── M09 — Ordonnance (CU-09-01) ────────────────────────────────────────────

export interface Medicament {
  id: string
  dci: string
  commercialNames: string[]
  form: string | null
  dosage: string | null
}

/**
 * Une ordonnance, telle que la voient le patient ET le prescripteur.
 *
 * `qrToken` vaut `null` dès qu'elle n'est plus délivrable (annulée, expirée, servie) : le QR ne doit
 * pas rester scannable après coup (RM-09-02). `sessionId` a été ajouté le 24/08/2026 — sans lui, on
 * ne pouvait pas rattacher une ordonnance à la consultation qui l'a produite.
 */
export interface Prescription {
  id: string
  sessionId: string
  status: 'ACTIVE' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'CANCELLED' | 'EXPIRED'
  qrToken: string | null
  subProfileId: string | null
  expiresAt: string
  createdAt: string
  cancelReason: string | null
  lines: Array<{
    id: string
    medicamentId: string | null
    /** Nom du référentiel — `null` pour une ligne en texte libre (EF-09-02). */
    medicationName: string | null
    freeText: string | null
    posology: string
    durationDays: number | null
    qtyPrescribed: number
    qtyDispensed: number
  }>
}

/**
 * Une ligne à prescrire.
 *
 * ⚠️ `qtyPrescribed` et `durationDays` manquaient à ce type (constaté le 28/08/2026 en comparant à
 * `PrescriptionLineDto`). `qtyPrescribed` est **obligatoire** côté serveur, avec un minimum de 1 :
 * un appel construit sur l'ancien type se serait fait refuser en 400 avant même d'atteindre le
 * garde-fou allergies. Aucun écran ne l'appelait encore — le type mentait sans conséquence, ce qui
 * est exactement la façon dont ces dettes survivent.
 */
export interface PrescriptionLineInput {
  /** Exclusif avec `freeText`. Seule une ligne RÉFÉRENTIELLE déclenche le garde-fou allergies. */
  medicamentId?: string
  /** Ligne hors référentiel — acceptée, mais **sans garde-fou automatique** (EF-09-02). */
  freeText?: string
  posology: string
  /** Durée en jours. Facultative : une ligne peut être « jusqu'à épuisement ». */
  durationDays?: number
  /** Quantité prescrite — entier strictement positif, exigé par le serveur. */
  qtyPrescribed: number
}

/** Un médicament prescrit qui heurte une allergie active du Carnet (EF-09-03). */
export interface AllergyConflict {
  medicamentId: string
  medicamentLabel: string
  allergies: string[]
}

/** Charge utile du 409 renvoyé par le garde-fou allergies. */
export interface AllergyGuardError {
  code: 'ALLERGY_GUARD'
  message: string
  conflicts: AllergyConflict[]
}

export function estAlerteAllergie(details: unknown): details is AllergyGuardError {
  return (
    typeof details === 'object' &&
    details !== null &&
    (details as { code?: unknown }).code === 'ALLERGY_GUARD' &&
    Array.isArray((details as { conflicts?: unknown }).conflicts)
  )
}

// ── M13 — Gains et retraits (CU-13-04) ─────────────────────────────────────

export type EarningsHolderType = 'PROFESSIONAL' | 'FACILITY'
export type MomoOperator = 'MTN_MOMO' | 'AIRTEL_MONEY'

export interface Earnings {
  holderType: EarningsHolderType
  holderId: string
  /** Retirable maintenant. */
  availableXaf: number
  /**
   * Confirmé mais pas encore capturé (EF-13-06).
   *
   * Concrètement : des consultations honorées dont le COMPTE-RENDU n'est pas déposé. RM-06-04 —
   * « gains crédités uniquement après dépôt du compte-rendu (qualité avant trésorerie) ». C'est la
   * chose la plus utile que cet écran puisse dire à un médecin.
   */
  pendingXaf: number
  /**
   * `CREDIT` (part d'une consultation), `WITHDRAWAL` (retrait), `REVERSAL` (remboursement).
   *
   * `amountXaf` est le **net**. `grossXaf` et `commissionXaf` viennent de la part de paiement, jointe
   * par le serveur depuis le 28/08 (S2) : sans eux, un médecin voyait « + 11 000 XAF » sans savoir
   * ce que le patient avait payé ni ce qui avait été prélevé — et la maquette comblait ce silence en
   * écrivant « 12 % » dans la page. **Le taux n'est pas un paramètre global** : c'est celui du
   * contrat signé de ce bénéficiaire-là (RM-13-07). Un écran ne peut donc que le LIRE.
   *
   * `null` sur un mouvement sans part de paiement — un retrait, typiquement. `null` et non `0` :
   * l'absence de détail n'est pas une commission nulle.
   */
  entries: Array<{
    id: string
    type: string
    amountXaf: number
    reference: string
    createdAt: string
    grossXaf: number | null
    commissionXaf: number | null
  }>
  /**
   * Les cinquante derniers retraits — le serveur les renvoie et ce type les OMETTAIT (constaté le
   * 24/08/2026 en comparant à `getMine`). Sans eux, un médecin ne pouvait pas savoir où en était
   * l'argent qu'il avait demandé.
   */
  withdrawals: Array<{
    id: string
    amountXaf: number
    operator: string
    status: 'PENDING' | 'EXECUTED' | 'FAILED'
    failReason: string | null
    requestedAt: string
    executedAt: string | null
  }>
}

/** Récapitulatif d'un retrait : les frais sont annoncés AVANT confirmation (EF-13-07). */
export interface WithdrawalQuote {
  withdrawalId: string
  amountXaf: number
  ulamuFeeXaf: number
  netToReceiveXaf: number
  operator: string
  otpExpiresInSeconds: number
  /**
   * Le délai d'exécution, servi par le serveur (PM-36) depuis le 28/08 (S3).
   *
   * EF-13-07 exige que les frais ET le délai soient connus avant l'engagement. Sans ce champ,
   * l'écran aurait écrit « sous 24 h » en dur — la même dette que le « 48 h » du compte-rendu.
   */
  payoutDelaySeconds: number
}

// ── Administration — M03 (vérification), M16 (pilotage) ────────────────────

export interface VerificationQueue {
  /** Objectif de traitement en heures (PM-11) — au-delà, le dossier est « en retard ». */
  targetHours: number
  overdueAfterHours: number
  items: Array<{
    caseId: string
    subjectKind: 'PROFESSIONAL' | 'FACILITY'
    subject: string
    subjectName: string
    /**
     * Resserré le 24/08/2026 : c'était `string`, alors que le serveur renvoie l'énumération. Un
     * `string` oblige chaque écran à se défendre contre des valeurs que l'API ne produit pas, et
     * laisse passer celles qu'elle produit vraiment mais qu'on a oublié de traiter.
     */
    status: VerificationStatus
    waitingSince: string
    documentCount: number
    /** Dépasse l'objectif PM-11. */
    overdueTarget: boolean
    /** Dépasse le seuil critique. */
    overdue: boolean
  }>
}

/** Un des 7 indicateurs du pilote (plan_releases §3, CU-16-03). */
export interface PilotKpi {
  key: string
  label: string
  value: number
  target: number
  unit: 'count' | '%'
  /** Vert/rouge tranché par le SERVEUR — les seuils sont du métier, pas de la présentation. */
  status: string
}

/** Vérification de la chaîne sha256 du journal d'audit (EF-04-03). */
/**
 * Une entrée du journal d'audit (EF-04-04). Insertion seule, chaînée par hachage.
 *
 * Le champ `action` est une chaîne pointée — `m02.admin.role_assigned`, `m16.parameter.changed`.
 * Le filtre serveur est un égal EXACT, pas un préfixe : demander plusieurs actions demande
 * plusieurs appels.
 */
export interface AuditEntry {
  seq: string
  actorId: string | null
  actorType: string | null
  action: string
  resource: string | null
  context: unknown
  hash: string
  createdAt: string
}

export interface AuditIntegrity {
  ok: boolean
  checked: number
  brokenAtSeq?: number | null
}

/** Signalement d'utilisateur en attente de modération (M04, CU-04-04). */
export interface UserReport {
  id: string
  targetType: string
  targetId: string
  reasonCode: string
  reasonText: string | null
  status: string
  createdAt: string
  /** Au-delà du délai cible PM-23 — c'est ce qui décide de l'ordre de traitement. */
  isOverdue: boolean
}

export type ReportDecision = 'DISMISSED' | 'WARNING' | 'ESCALATED_M16' | 'ESCALATED_M03'

/** Compte trouvé par la recherche du back-office (M16). */
/**
 * Un compte trouvé par la recherche d'administration (RM-16-02 : données minimales).
 *
 * ⚠️ Ce type décrivait `{ id, username }` — le serveur renvoie `accountId` et `displayName`, et
 * jamais le nom d'utilisateur (constaté le 01/09/2026 en comparant à `AccountSearchHit`). Aucun
 * écran ne l'appelait encore : le mensonge dormait, comme celui de `PrescriptionLineInput`.
 */
export interface AdminAccount {
  accountId: string
  phone: string
  type: string
  status: string
  /** « Prénom Nom », ou « (compte sans profil) » — jamais une adresse, jamais un identifiant. */
  displayName: string
}

/** Les quatre procédures support prévues par le serveur (EF-16-03, CU-16-04). */
export type SupportProcedureType = 'PHONE_CHANGE' | 'OWNER_UNREACHABLE' | 'RECORD_TRANSFER' | 'OTHER'
export type SupportProcedureStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED'

/** Une étape franchie : horodatée et signée par le serveur, jamais par l'écran. */
export interface SupportStep {
  label: string
  note?: string
  at: string
  by: string
}

export interface SupportProcedure {
  id: string
  type: SupportProcedureType
  accountId: string | null
  steps: SupportStep[]
  justification: string
  executedBy: string
  status: SupportProcedureStatus
  createdAt: string
  completedAt: string | null
}

/**
 * Demande d'aide écrite par un utilisateur (01/09/2026).
 *
 * Elle remplace `support@ulamu.cg`, une adresse dont le domaine n'appartient pas au projet et que
 * personne ne relevait. Le `subject` reprend les catégories des procédures support : une demande
 * « j'ai perdu mon numéro » désigne directement la procédure guidée qui la traitera.
 *
 * ⚠️ À ne pas confondre avec `SupportProcedure` : celle-là est ce qu'un ADMINISTRATEUR a fait,
 * celle-ci est ce qu'un utilisateur DEMANDE.
 */
export interface SupportRequest {
  id: string
  subject: SupportProcedureType
  body: string
  status: 'OPEN' | 'ANSWERED'
  createdAt: string
  /** La réponse se lit ICI — pas dans un courriel. C'est toute la raison d'être de cet objet. */
  answer: string | null
  answeredAt: string | null
}

/** La même, vue de l'administration : sans le nom ni le numéro, on ne peut pas traiter. */
export interface AdminSupportRequest extends SupportRequest {
  requesterId: string
  requesterName: string | null
  requesterPhone: string | null
}

// ── M03 — Vérification & contrat (CU-03-01/02/03) ──────────────────────────

/** Machine d'états du dossier, côté serveur (m03.policies). */
export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO' | 'REVOKED'
export type DocumentKind = 'ID' | 'DIPLOMA' | 'LICENSE' | 'PHOTO' | 'ADDRESS_PROOF'

export interface VerificationCase {
  caseId: string
  subjectKind: 'PROFESSIONAL' | 'FACILITY'
  status: VerificationStatus
  canPractice: boolean
  /**
   * Pièces exigées et pièces manquantes — calculées PAR LE SERVEUR (2026-08).
   *
   * La liste était auparavant recopiée ici, en dur. Deux vérités pour une même règle finissent
   * toujours par diverger, et c'est l'écran qui aurait menti : le serveur reste le seul juge au
   * moment du dépôt.
   */
  requiredDocuments: DocumentKind[]
  missingDocuments: DocumentKind[]
  canSubmit: boolean
  /** Les pièces sont-elles encore modifiables ? Faux dès que le dossier est en examen. */
  documentsEditable: boolean
  /** Délai de traitement annoncé, en heures (PM-11). */
  announcedDelayHours: number
  documents: Array<{ id: string; kind: DocumentKind; expiresAt: string | null; createdAt: string }>
  /**
   * `documentKind` est résolu par le serveur : l'écran nomme la pièce sans second appel. Il vaut
   * `null` quand la décision porte sur l'ensemble du dossier — ou quand la pièce visée a été
   * remplacée depuis, la décision restant immuable (RM-03-02).
   */
  decisions: Array<{
    id: string
    decision: string
    reasons: string
    documentId: string | null
    documentKind: DocumentKind | null
    decidedAt: string
  }>
  agreement: {
    version: number
    commissionPct: number
    bodyHash: string
    body: string | null
    /** `false` = le texte régénéré ne correspond plus au sceau : on ne le présente jamais comme conforme. */
    integrity: boolean
    signedAt: string | null
    effectiveAt: string | null
  } | null
  /**
   * La dernière version que le soignant a RÉELLEMENT signée, hors version courante (S4, 28/08/2026).
   *
   * Quand un super-administrateur change PM-01 dans E3, le serveur ré-édite les contrats signés. La
   * nouvelle version est **non signée** : `canPractice` tombe à `false`, et le soignant ne peut plus
   * exercer tant qu'il n'a pas re-signé.
   *
   * `agreement` ne porte que la version courante. Sans ce champ, C1 aurait demandé une signature à
   * l'aveugle — « nouveau taux : 12 % », sans dire d'où l'on vient.
   *
   * `null` quand aucun avenant n'est en cours : première signature, ou version courante déjà signée.
   */
  lastSigned: { version: number; commissionPct: number; signedAt: string } | null
}

export interface UploadDocumentRequest {
  kind: DocumentKind
  fileBase64: string
  mime: string
  expiresAt?: string
}

/**
 * Récupère un média de consultation (photo, note vocale) pour l'afficher.
 *
 * Même raison que pour les pièces justificatives : la route exige un jeton, qu'un `<img src>` ne
 * sait pas porter. Et le serveur vérifie en plus que le demandeur est bien PARTICIPANT de la
 * session — un contenu médical ne s'ouvre pas sur la seule connaissance d'une clé.
 */
export async function lireMediaSession(fileKey: string): Promise<{ url: string; type: string }> {
  const token = getToken?.()
  const res = await fetch(`${API_BASE_URL}/v1/media/sessions/${fileKey}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.()
    throw new ApiError(res.status, codeFromStatus(res.status), "Ce média n'a pas pu être ouvert.")
  }
  const blob = await res.blob()
  return { url: URL.createObjectURL(blob), type: blob.type }
}

/**
 * Récupère une pièce justificative pour l'afficher.
 *
 * Impossible de mettre l'URL dans un `<a href>` ou un `<img src>` : la route exige un jeton
 * `Authorization`, et ni l'un ni l'autre ne sait en porter. On récupère donc le fichier avec le
 * jeton, puis on l'affiche depuis un `blob:` local. C'est aussi ce qui empêche l'URL d'une pièce
 * d'identité de finir dans l'historique du navigateur ou dans le journal d'un serveur mandataire.
 *
 * L'URL rendue est révoquée par l'appelant quand il n'en a plus besoin — sinon le fichier déchiffré
 * reste en mémoire de l'onglet jusqu'à sa fermeture.
 */
export async function lirePieceJustificative(documentId: string): Promise<{ url: string; type: string }> {
  const token = getToken?.()
  const res = await fetch(`${API_BASE_URL}/v1/verification/me/documents/${documentId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.()
    throw new ApiError(res.status, codeFromStatus(res.status), "Cette pièce n'a pas pu être ouverte.")
  }
  // Le type vient du fichier lui-même : c'est lui qui décide si on affiche une image ou un PDF.
  const blob = await res.blob()
  return { url: URL.createObjectURL(blob), type: blob.type }
}

/**
 * URL publique d'une photo de profil. La route `media/avatars` est `@Public` côté API : la clé est un
 * uuid non devinable, et une photo de vitrine n'est pas une donnée de santé.
 *
 * ⚠️ Le stockage est le disque local de l'instance API, et `render.yaml` ne déclare AUCUN disque
 * persistant : sur le plan gratuit, les photos disparaissent au redéploiement. C'est acceptable en
 * pilote, pas à la livraison — voir §7 du plan.
 */
export function urlAvatar(key: string): string {
  return `${API_BASE_URL}/v1/media/avatars/${key}`
}

export const api = {
  login: (dto: LoginRequest) => request<LoginResponse>('POST', '/v1/auth/login', dto),
  logout: () => request<void>('POST', '/v1/accounts/me/logout', undefined, true),
  me: () => request<MeResponse>('GET', '/v1/accounts/me', undefined, true),
  requestOtp: (dto: RequestOtpRequest) => request<RequestOtpResponse>('POST', '/v1/accounts/otp/request', dto),
  registerProfessional: (dto: RegisterProfessionalRequest) =>
    request<RegisterResponse>('POST', '/v1/accounts/register/professional', dto),
  /**
   * Le rythme des codes TOTP, vu du SERVEUR (chantier 34, 02/09/2026).
   *
   * Publique et sans jeton : deux des quatre écrans qui affichent le décompte sont atteints sans
   * être connecté — la saisie du second facteur à la connexion, et la réinitialisation du mot de
   * passe par TOTP.
   *
   * ⚠️ Ne PAS calculer ce nombre localement, même si `Date.now()` le donnerait en une ligne : un
   * code TOTP se calcule sur des tranches de temps absolues, et une horloge de navigateur qui dérive
   * déphaserait le décompte de ce que le téléphone affiche. L'écran donnerait alors une seconde
   * vérité sur le même instant.
   */
  rythmeTotp: () =>
    request<{ periodeSecondes: number; secondesAvantNouveauCode: number }>('GET', '/v1/auth/totp/rythme'),

  setupTotp: () => request<SetupTotpResponse>('POST', '/v1/accounts/me/totp/setup', undefined, true),
  confirmTotp: (code: string) => request<ConfirmTotpResponse>('POST', '/v1/accounts/me/totp/confirm', { code }, true),
  resetPasswordByTotp: (dto: ResetPasswordTotpRequest) => request<void>('POST', '/v1/auth/password-reset/totp', dto),
  resetPasswordByEmail: (dto: ResetPasswordRequest) => request<void>('POST', '/v1/auth/password-reset', dto),

  // M01 — sécurité du compte
  sessions: () => request<SessionInfo[]>('GET', '/v1/accounts/me/sessions', undefined, true),
  revokeSession: (id: string) => request<void>('DELETE', `/v1/accounts/me/sessions/${id}`, undefined, true),
  startPhoneChange: (dto: { newPhone: string }) =>
    request<{ expiresInSeconds: number }>('POST', '/v1/accounts/me/phone-change/start', dto, true),
  confirmPhoneChange: (dto: { newPhone: string; oldPhoneCode: string; newPhoneCode: string }) =>
    request<MeResponse>('POST', '/v1/accounts/me/phone-change/confirm', dto, true),
  /**
   * Mot de passe changé depuis une session ouverte — à ne pas confondre avec `resetPasswordBy*`, qui
   * sert quand l'accès est perdu. Le serveur ferme les AUTRES appareils et renvoie combien.
   */
  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    request<{ otherSessionsClosed: number }>('POST', '/v1/accounts/me/password', dto, true),
  /**
   * Première adresse email du compte, ou remplacement.
   * `requiresOldEmailCode` dit si le compte en avait déjà une : dans ce cas il faut DEUX codes, sans
   * quoi une session volée suffirait à détourner le canal de récupération.
   */
  startEmailChange: (dto: { newEmail: string }) =>
    request<{ requiresOldEmailCode: boolean; oldEmailHint: string | null }>('POST', '/v1/accounts/me/email/start', dto, true),
  confirmEmailChange: (dto: { newEmail: string; newEmailCode: string; oldEmailCode?: string }) =>
    request<{ email: string }>('POST', '/v1/accounts/me/email/confirm', dto, true),
  /** Nouveau lot de codes de secours — l'ancien est détruit, ceux-ci ne s'affichent qu'une fois. */
  regenerateBackupCodes: (dto: { password: string; code: string }) =>
    request<ConfirmTotpResponse>('POST', '/v1/accounts/me/totp/backup-codes', dto, true),
  /**
   * Désactive le second facteur — mot de passe ET code (application ou code de secours).
   *
   * ⚠️ Absente du client jusqu'au 02/09/2026 : la route existait au serveur depuis toujours, aucun
   * écran ne l'appelait. Un utilisateur qui avait activé sa double authentification ne pouvait plus
   * la retirer depuis l'application — il fallait passer par le support. Décision D-053 : le TOTP est
   * optionnel pour TOUS les types de compte, chacun l'active et le désactive comme il l'entend.
   */
  disableTotp: (dto: { password: string; code: string }) =>
    request<void>('POST', '/v1/accounts/me/totp/disable', dto, true),

  /*
    ── La 2FA par EMAIL, injoignable depuis le web jusqu'au 02/09/2026 ─────────────────────────

    Trois routes existaient au serveur, aucune n'était déclarée ici. Le web ne pouvait donc ni
    l'activer, ni la désactiver — et sa connexion ne savait même pas la reconnaître (voir
    `LoginResponse`). Un compte qui l'activait depuis le mobile se retrouvait bloqué sur le web,
    sans message et sans recours dans l'application.
  */
  /** Envoie un code à l'adresse du compte, première étape de l'activation. */
  requestEmailTwoFactorOtp: () =>
    request<{ sent: true; debugCode?: string }>('POST', '/v1/accounts/me/2fa/email/request', undefined, true),
  /** Confirme le code reçu et arme la 2FA par email. */
  enableEmailTwoFactor: (otpCode: string) =>
    request<void>('POST', '/v1/accounts/me/2fa/email/enable', { otpCode }, true),
  /** La désactivation ne demande que le mot de passe : le second facteur qu'on retire ne se prouve pas lui-même. */
  disableEmailTwoFactor: (password: string) =>
    request<void>('POST', '/v1/accounts/me/2fa/email/disable', { password }, true),

  /** Ré-association de l'appareil : renvoie un secret à scanner, puis on enchaîne sur `confirmTotp`. */
  resetTotp: (dto: { password: string; code: string }) =>
    request<SetupTotpResponse>('POST', '/v1/accounts/me/totp/reset', dto, true),
  setAvatar: (dto: { imageBase64: string; mime: string }) =>
    request<MeResponse>('POST', '/v1/accounts/me/avatar', dto, true),
  removeAvatar: () => request<MeResponse>('DELETE', '/v1/accounts/me/avatar', undefined, true),
  /** Les trois conditions de clôture, telles que le serveur les appliquera — l'écran n'en invente aucune. */
  closePrerequisites: () =>
    request<Array<{ key: string; label: string; ok: boolean }>>('GET', '/v1/accounts/me/close/prerequisites', undefined, true),
  /** `channel` dit si le code part par email ou par SMS — l'écran ne doit pas le deviner. */
  requestCloseOtp: () =>
    request<{ channel: 'email' | 'sms'; hint: string }>('POST', '/v1/accounts/me/close/request-otp', undefined, true),
  closeAccount: (dto: { password: string; otpCode: string }) =>
    request<void>('POST', '/v1/accounts/me/close', dto, true),

  /*
    ── M14 — le CENTRE de notifications (chantier 37, 03/09/2026) ────────────────────────────────

    Ces cinq routes existaient au serveur depuis le début et **aucune n'était déclarée ici**. Le web
    ne branchait que les PRÉFÉRENCES : un soignant pouvait choisir les notifications qu'il reçoit,
    et n'en voyait jamais une seule.

    Ce n'était pas un oubli — le chantier 1 l'avait écarté en écrivant « M14 est une fonctionnalité
    à part entière, pas un morceau de coquille ». C'était juste ; elle est construite maintenant.

    Ce que le médecin ne recevait pas, entre autres : « un patient vous sollicite » (avec son compte
    à rebours), « votre compte-rendu est en retard » (et le paiement part), « re-signez votre
    contrat ou vous n'exercez plus ». Le patient, lui, les voit sur mobile depuis toujours.
  */
  /** Historique paginé, du plus récent au plus ancien. La rétention PM-37 filtre déjà côté serveur. */
  notifications: (q: { cursor?: string; limit?: number } = {}) =>
    request<NotificationsPage>(
      'GET',
      `/v1/notifications/me${q.cursor || q.limit ? `?${new URLSearchParams({ ...(q.cursor ? { cursor: q.cursor } : {}), ...(q.limit ? { limit: String(q.limit) } : {}) })}` : ''}`,
      undefined,
      true,
    ),
  /** Le compteur de la pastille. Séparé de la liste : il se rafraîchit souvent, elle non. */
  notificationsUnreadCount: () =>
    request<{ unread: number }>('GET', '/v1/notifications/me/unread-count', undefined, true),
  /** Idempotent côté serveur : rejouer un « marquer lu » ne change rien et ne lève pas. */
  markNotificationRead: (id: string) =>
    request<{ id: string; read: boolean }>('POST', `/v1/notifications/me/${id}/read`, undefined, true),
  /**
   * Tout marquer comme lu — une seule requête, et non une par ligne.
   *
   * La route a été écrite pour cet écran (chantier 37) : le serveur savait supprimer en lot depuis
   * le début, mais pas LIRE en lot. Elle s'arrête à la même fenêtre de rétention que la liste —
   * « tout » veut dire « tout ce que vous voyez », rien de plus.
   */
  markAllNotificationsRead: () =>
    request<{ read: number }>('POST', '/v1/notifications/me/read-all', undefined, true),
  deleteNotification: (id: string) =>
    request<{ id: string; deleted: boolean }>('DELETE', `/v1/notifications/me/${id}`, undefined, true),
  /** Suppression groupée — le serveur plafonne la taille du lot, l'écran n'envoie que ce qu'il affiche. */
  deleteNotifications: (ids: string[]) =>
    request<{ deleted: number }>('DELETE', '/v1/notifications/me', { ids }, true),

  // M14 — préférences de notification (les seules du lot qui suivent le compte)
  /** `critical` remonte toujours `adjustable: false` — les alertes vitales ne se coupent pas (RM-14-02). */
  notificationPreferences: () =>
    request<{ preferences: Array<{ category: NotificationCategory; enabled: boolean; adjustable: boolean }> }>(
      'GET',
      '/v1/notifications/me/preferences',
      undefined,
      true,
    ),
  setNotificationPreference: (dto: { category: NotificationCategory; enabled: boolean }) =>
    request<{ category: string; enabled: boolean }>('PUT', '/v1/notifications/me/preferences', dto, true),

  // M05 — vitrine, offres, présence
  /**
   * ⚠️ Plus de `specialty` (01/09/2026) : le serveur la REFUSE désormais en 400 — elle est établie
   * par le contrôle des pièces, pas déclarée par son titulaire (dette 8bis). La laisser dans ce
   * type inviterait à l'envoyer, et l'appel entier échouerait pour ce seul champ.
   */
  updateMyProfessionalProfile: (dto: { biography?: string; district?: string }) =>
    request<MeResponse>('PATCH', '/v1/me/professional-profile', dto, true),
  myOffers: () => request<Offer[]>('GET', '/v1/offers', undefined, true),
  /** Bornes PM-09/PM-06/PM-25 — annoncées AVANT la saisie, jamais écrites dans la page. */
  offerLimits: () => request<OfferLimits>('GET', '/v1/offers/limits', undefined, true),
  createOffer: (dto: { label: string; durationMin: number; priceXaf: number; kind?: OfferKind }) =>
    request<Offer>('POST', '/v1/offers', dto, true),
  updateOffer: (id: string, dto: { label?: string; durationMin?: number; priceXaf?: number; kind?: OfferKind; active?: boolean }) =>
    request<Offer>('PATCH', `/v1/offers/${id}`, dto, true),
  /** ⚠️ Le serveur DÉSACTIVE (deactivateOffer), il ne supprime pas : l'historique des sessions déjà
   *  vendues sur cette offre doit rester lisible. L'interface doit donc dire « désactiver ». */
  deactivateOffer: (id: string) => request<void>('DELETE', `/v1/offers/${id}`, undefined, true),
  /**
   * L'annuaire tel qu'un patient le parcourt. Route publique — pas de jeton nécessaire, et c'est
   * voulu : on ne montre pas au médecin une version « connectée » de ce que voit un visiteur.
   */
  searchDirectory: (q: { category?: string; district?: string; specialty?: string; page?: number }) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p.set(k, String(v))
    return request<{ items: DirectoryItem[]; page: number; pageSize: number; total: number; suggestion: string | null }>(
      'GET',
      `/v1/directory${p.toString() ? `?${p}` : ''}`,
    )
  },
  /**
   * La fiche publique d'un professionnel — appelée SANS jeton, comme un visiteur.
   *
   * C2 l'utilise sur son propre identifiant : « ce que les patients voient » doit être la vraie
   * réponse publique, pas une reconstitution. Une 404 signifie donc quelque chose : la route filtre
   * sur RM-05-01, et un professionnel non vérifié ou sans contrat signé n'y figure pas.
   */
  directoryProfile: (professionalId: string) =>
    request<DirectoryProfile>('GET', `/v1/directory/${professionalId}`),
  myPresence: () => request<OwnPresence>('GET', '/v1/presence/me', undefined, true),
  setPresence: (state: PresenceState) => request<Presence>('POST', '/v1/presence/state', { state }, true),
  presenceHeartbeat: () => request<Presence>('POST', '/v1/presence/heartbeat', undefined, true),

  // M02 — sous-rôles d'administration (SUPER_ADMIN)
  //
  // ⚠️ Le préfixe est `v1/admin`, pas `v1`. Ces quatre chemins disaient `/v1/admins` et renvoyaient
  // donc 404 — l'écran « Administrateurs » (E4) aurait été vide sans que rien n'explique pourquoi.
  // Corrigés le 24/08/2026 après appel réel : `GET /v1/admin/admins` répond bien la liste.
  admins: () => request<PlatformAdmin[]>('GET', '/v1/admin/admins', undefined, true),
  createAdmin: (dto: { phone: string; username: string; password: string; firstName: string; lastName: string; role: AdminRole }) =>
    request<{ accountId: string }>('POST', '/v1/admin/admins', dto, true),
  assignAdminRole: (accountId: string, role: AdminRole, reason?: string) =>
    request<{ accountId: string; role: string }>('POST', `/v1/admin/admins/${accountId}/role`, { role, reason }, true),
  /** Le serveur refuse l'auto-révocation (continuité d'administration) et coupe les sessions du révoqué. */
  revokeAdminRole: (accountId: string) =>
    request<void>('DELETE', `/v1/admin/admins/${accountId}/role`, undefined, true),

  // M16 — paramètres métier (SUPER_ADMIN)
  parameters: () => request<PlatformParameter[]>('GET', '/v1/admin/parameters', undefined, true),
  parameterHistory: (key: string) =>
    request<ParameterChange[]>('GET', `/v1/admin/parameters/${key}/history`, undefined, true),
  /**
   * S5 — ce que le changement coûterait, AVANT de le faire (28/08 → 01/09/2026).
   *
   * Changer PM-01 ré-édite tous les contrats signés : chacun de ces soignants **cesse de pouvoir
   * exercer** jusqu'à sa re-signature. `updateParameter` renvoie bien le compte, mais APRÈS coup.
   */
  parameterImpact: (key: string) =>
    request<{ key: string; isRateParameter: boolean; signedAgreements: number }>(
      'GET',
      `/v1/admin/parameters/${key}/impact`,
      undefined,
      true,
    ),
  /**
   * Le motif est OBLIGATOIRE (RM-16-03) : un seuil qui change sans explication est ingérable.
   *
   * Le serveur renvoie `reissuedCount` — le nombre de contrats réellement ré-édités. Ce type
   * prétendait ne rien savoir de la réponse, alors que c'est le seul moyen de confirmer à
   * l'administrateur ce que son geste vient de faire.
   *
   * ⚠️ `effectiveAt` doit être IMMÉDIATE : le serveur **refuse** une date future — « différé non
   * géré au MVP ». Le « préavis de 30 jours » de la maquette proposait donc un geste que le
   * serveur rejette par une erreur (famille 2, point 5).
   */
  updateParameter: (key: string, dto: { value: string; effectiveAt: string; reason: string }) =>
    request<{ key: string; newValue: string; effectiveAt: string; reissuedCount: number }>(
      'PUT',
      `/v1/admin/parameters/${key}`,
      dto,
      true,
    ),

  // M13 — administration Finance
  adminRefunds: (status?: RefundStatus) =>
    request<RefundRequest[]>('GET', `/v1/admin/finance/refunds${status ? `?status=${status}` : ''}`, undefined, true),
  approveRefund: (id: string) => request<unknown>('POST', `/v1/admin/finance/refunds/${id}/approve`, undefined, true),
  rejectRefund: (id: string) => request<unknown>('POST', `/v1/admin/finance/refunds/${id}/reject`, undefined, true),
  runReconciliation: () => request<ReconciliationReport>('POST', '/v1/admin/finance/reconcile', undefined, true),

  // M06 — poignées de main reçues
  /**
   * ⚠️ Renvoie `{ items }`, PAS un tableau — vérifié contre l'API déployée le 24/08/2026.
   *
   * Ce type déclarait `Handshake[]`, et TypeScript n'avait aucun moyen de savoir qu'il mentait : une
   * déclaration de type est une PROMESSE faite au compilateur, pas une vérification. Le tableau de
   * bord appelait donc `.filter` sur un objet et plantait l'écran entier, page blanche comprise.
   */
  myHandshakes: () => request<{ items: Handshake[] }>('GET', '/v1/handshakes/mine', undefined, true),
  handshake: (id: string) => request<Handshake>('GET', `/v1/handshakes/${id}`, undefined, true),
  /** « Je suis prêt à recevoir » (EF-06-02). Ouvre la fenêtre de paiement PM-07 côté patient. */
  confirmHandshake: (id: string) => request<Handshake>('POST', `/v1/handshakes/${id}/confirm`, undefined, true),
  /** Motif COURT — « occupé », « hors domaine » (EF-06-02). 200 caractères au maximum. */
  refuseHandshake: (id: string, reason: string) =>
    request<Handshake>('POST', `/v1/handshakes/${id}/refuse`, { reason }, true),

  // M06 — session de soin
  /**
   * ⚠️ Renvoie `{ items }`, et ses éléments sont des `SessionListItem` — un SOUS-ENSEMBLE de
   * `CareSession` (vérifié contre `listMine` le 24/08/2026).
   *
   * Le déclarer `CareSession[]` promettait `preConsultation`, `otherPartyTyping`, `startedAt`… que
   * la liste n'envoie pas. Un écran qui s'y fiait aurait lu `undefined` là où TypeScript garantissait
   * une valeur.
   */
  mySessions: () => request<{ items: SessionListItem[] }>('GET', '/v1/care-sessions/mine', undefined, true),
  /** Les ordonnances que J'AI PRESCRITES — `prescriptions/me` filtre côté PATIENT (2026-08). */
  myPrescribed: () => request<{ items: Prescription[] }>('GET', '/v1/prescriptions/prescribed', undefined, true),
  session: (id: string) => request<CareSession>('GET', `/v1/care-sessions/${id}`, undefined, true),
  sessionMessages: (id: string) =>
    request<{ items: SessionMessage[]; nextCursor: string | null }>('GET', `/v1/care-sessions/${id}/messages`, undefined, true),
  /** `clientMsgId` est une clé d'idempotence (ADR-12) : un rejeu réseau ne crée pas un doublon. */
  sendMessage: (
    id: string,
    dto: { clientMsgId: string; kind: 'TEXT' | 'PHOTO'; body?: string; fileKey?: string; replyToId?: string },
  ) => request<SessionMessage>('POST', `/v1/care-sessions/${id}/messages`, dto, true),
  /** Téléverse d'abord, envoie ensuite : le message ne porte que la CLÉ, jamais les octets. */
  uploadSessionMedia: (id: string, dto: { fileBase64: string; mime: string }) =>
    request<{ fileKey: string }>('POST', `/v1/care-sessions/${id}/media`, dto, true),
  /**
   * Suppression d'un message. `forEveryone` n'est PAS optionnel côté serveur (`DeleteMessageDto`,
   * `@IsBoolean()`) : cet appel partait sans corps et se faisait refuser en 400 — le bouton
   * « supprimer » de C5 n'a donc jamais fonctionné. Corrigé le 28/08/2026.
   *
   * • `true`  → pour tout le monde (auteur, ≤ 15 min) : la bulle devient « Message supprimé ».
   * • `false` → pour moi seul (toujours possible) : la bulle disparaît de MON fil, pas de l'autre.
   */
  deleteSessionMessage: (sessionId: string, messageId: string, forEveryone: boolean) =>
    request<{ ok: true }>('POST', `/v1/care-sessions/${sessionId}/messages/${messageId}/delete`, { forEveryone }, true),
  /** Édition d'un message texte — auteur seulement, ≤ 15 min (le serveur tranche). */
  editSessionMessage: (sessionId: string, messageId: string, body: string) =>
    request<SessionMessage>('PATCH', `/v1/care-sessions/${sessionId}/messages/${messageId}`, { body }, true),
  /** Bascule une réaction emoji — une par participant et par message. */
  reactToSessionMessage: (sessionId: string, messageId: string, emoji: string) =>
    request<SessionMessage>('POST', `/v1/care-sessions/${sessionId}/messages/${messageId}/reactions`, { emoji }, true),
  typing: (id: string) => request<void>('POST', `/v1/care-sessions/${id}/typing`, undefined, true),

  /**
   * Le Carnet du patient, LU EN SESSION (EF-06-06, RM-06-05).
   *
   * ⚠️ Le serveur **referme l'accès dès que le décompteur tombe à zéro**, et chaque lecture est
   * tracée au journal d'audit. Ce n'est pas un dossier qu'on consulte quand on veut : c'est une
   * ouverture bornée à la durée payée.
   */
  sessionRecordSummary: (id: string) =>
    request<HealthSummary>('GET', `/v1/care-sessions/${id}/record/summary`, undefined, true),
  sessionRecord: (id: string, q: { type?: RecordEntryType; cursor?: string } = {}) => {
    const p = new URLSearchParams()
    if (q.type) p.set('type', q.type)
    if (q.cursor) p.set('cursor', q.cursor)
    return request<RecordPage>('GET', `/v1/care-sessions/${id}/record${p.toString() ? `?${p}` : ''}`, undefined, true)
  },
  extendSession: (id: string, minutes: number) =>
    request<CareSession>('POST', `/v1/care-sessions/${id}/extend`, { minutes }, true),
  /** D-021 : compte-rendu obligatoire. Sans lui, la consultation n'est pas close pour le patient. */
  depositReport: (id: string, dto: { diagnosis: string; recommendations: string }) =>
    request<CareSession>('POST', `/v1/care-sessions/${id}/report`, dto, true),

  // M09 — ordonnance (depuis une session ACTIVE uniquement, RM-09-01)
  /** Référentiel médicaments — 2 caractères minimum côté serveur, en dessous il renvoie une liste vide. */
  searchMedicaments: (q: string, limit = 12) =>
    request<{ items: Medicament[] }>('GET', `/v1/medicaments?q=${encodeURIComponent(q)}&limit=${limit}`, undefined, true),
  /**
   * Crée et SCELLE l'ordonnance (EF-09-04). Le serveur renvoie l'ordonnance complète — jeton QR et
   * échéance compris — et non un simple identifiant comme ce type le prétendait.
   *
   * Un 409 `ALLERGY_GUARD` porte les conflits dans `details` : voir `estAlerteAllergie`.
   */
  createPrescription: (
    sessionId: string,
    dto: { lines: PrescriptionLineInput[]; overrides?: Array<{ medicamentId: string; reason: string }> },
  ) => request<Prescription>('POST', `/v1/prescriptions/sessions/${sessionId}`, dto, true),
  /**
   * Annule une ordonnance non entièrement délivrée — SEUL le prescripteur, motif obligatoire
   * (CU-09-04). Le QR devient inerte et ne se réactive jamais (RM-09-05) : la seule issue après une
   * erreur est d'annuler puis d'en rédiger une nouvelle.
   */
  cancelPrescription: (id: string, reason: string) =>
    request<Prescription>('POST', `/v1/prescriptions/${id}/cancel`, { reason }, true),

  // M13 — gains et retraits
  earnings: (holderType: EarningsHolderType, holderId: string) =>
    request<Earnings>('GET', `/v1/me?holderType=${holderType}&holderId=${holderId}`, undefined, true),
  startWithdrawal: (dto: { holderType: EarningsHolderType; holderId: string; amountXaf: number; operator: MomoOperator }) =>
    request<WithdrawalQuote>('POST', '/v1/withdrawals/start', dto, true),
  /** Action sensible : mot de passe **et** code OTP (EF-13-07). */
  confirmWithdrawal: (dto: { withdrawalId: string; password: string; otpCode: string }) =>
    request<{ status: string }>('POST', '/v1/withdrawals/confirm', dto, true),

  // Administration — file de vérification (sous-rôle Vérification)
  verificationQueue: (status?: string) =>
    request<VerificationQueue>('GET', `/v1/admin/verification/queue${status ? `?status=${status}` : ''}`, undefined, true),
  /** S'attribuer le dossier avant de décider : deux vérificateurs ne travaillent pas sur le même. */
  /**
   * Le dossier complet vu par l'administration — ajouté le 24/08/2026.
   *
   * La file ne renvoyait que `documentCount`, un NOMBRE : l'examinateur ne pouvait ouvrir aucune
   * pièce, faute d'identifiant. On décidait de la vérification d'un soignant sans regarder.
   */
  adminCase: (caseId: string) =>
    request<{
      caseId: string
      subjectKind: 'PROFESSIONAL' | 'FACILITY'
      subjectName: string
      status: VerificationStatus
      submittedAt: string
      requiredDocuments: DocumentKind[]
      missingDocuments: DocumentKind[]
      documents: Array<{ id: string; kind: DocumentKind; expiresAt: string | null; createdAt: string }>
      decisions: Array<{
        id: string
        decision: string
        reasons: string
        documentId: string | null
        documentKind: DocumentKind | null
        decidedAt: string
      }>
      agreementSignedAt: string | null
    }>('GET', `/v1/admin/verification/${caseId}`, undefined, true),
  /** Lecture d'une pièce PAR L'ADMINISTRATION — tracée au journal d'audit (loi n° 29-2019). */
  adminDocumentUrl: async (caseId: string, documentId: string): Promise<{ url: string; type: string }> => {
    const token = getToken?.()
    const res = await fetch(`${API_BASE_URL}/v1/admin/verification/${caseId}/documents/${documentId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.()
      throw new ApiError(res.status, codeFromStatus(res.status), "Cette pièce n'a pas pu être ouverte.")
    }
    const blob = await res.blob()
    return { url: URL.createObjectURL(blob), type: blob.type }
  },
  claimCase: (caseId: string) => request<void>('POST', `/v1/admin/verification/${caseId}/claim`, undefined, true),
  /** `documentId` vise UNE pièce : un refus nommé est une consigne, un refus vague est une devinette. */
  decideCase: (
    caseId: string,
    dto: { decision: 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO'; reasons: string; documentId?: string },
  ) =>
    request<{ caseId: string; status: VerificationStatus }>('POST', `/v1/admin/verification/${caseId}/decide`, dto, true),

  // Administration — pilotage et audit (sous-rôle Super)
  professionalDashboard: () => request<ProfessionalDashboard>('GET', '/v1/me/dashboard', undefined, true),
  pilotKpis: () => request<PilotKpi[]>('GET', '/v1/admin/pilot-kpis', undefined, true),
  /**
   * S6 — la couverture par arrondissement (01/09/2026).
   *
   * Remplace six lignes écrites en dur dans la maquette E5. Les effectifs sont calculables ; la
   * population ne l'est pas — aucune donnée de recensement n'existe, et la phrase « moins d'un
   * soignant pour 8 000 habitants » a donc disparu avec elle.
   *
   * « Soignants » = dossier vérifié **et** contrat signé : ceux qui peuvent réellement exercer.
   *
   * ⚠️ **Les officines ne sont plus comptées depuis le 02/09/2026 (chantier 26).** La chaîne du
   * médicament est sortie du périmètre d'ULAMU ; plus personne n'alimente ces données. Additionner
   * un chiffre vivant et un chiffre figé donnait un territoire plus couvert qu'il ne l'est — dans
   * le mauvais sens, sur l'écran où l'on décide où la plateforme manque.
   */
  coverage: () =>
    request<Array<{ district: string; professionals: number }>>(
      'GET',
      '/v1/admin/coverage',
      undefined,
      true,
    ),
  /** EF-04-03 : revérifie la chaîne sha256 du journal. Une rupture signale une altération. */
  auditIntegrity: () => request<AuditIntegrity>('GET', '/v1/admin/audit/integrity', undefined, true),
  /**
   * Consultation filtrée du journal (EF-04-04). **La consultation est elle-même auditée** (RM-04-02) :
   * chaque appel laisse une trace, ce qui interdit d'en faire une interrogation de fond.
   *
   * Le filtre `action` est un égal EXACT côté serveur. Et le périmètre dépend du sous-rôle : un
   * administrateur ne voit que les domaines de sa matrice — demander en dehors renvoie 403.
   */
  auditLog: (q: { action?: string; actorId?: string; resource?: string; limit?: number } = {}) => {
    const p = new URLSearchParams()
    if (q.action) p.set('action', q.action)
    if (q.actorId) p.set('actorId', q.actorId)
    if (q.resource) p.set('resource', q.resource)
    if (q.limit) p.set('limit', String(q.limit))
    return request<{ items: AuditEntry[]; nextCursor: string | null }>(
      'GET',
      `/v1/admin/audit${p.toString() ? `?${p}` : ''}`,
      undefined,
      true,
    )
  },

  // Administration — signalements (M04) et comptes (M16)
  reports: (status?: string) =>
    request<{ items: UserReport[] }>('GET', `/v1/admin/reports${status ? `?status=${status}` : ''}`, undefined, true),
  /** CU-04-04 : toute décision est motivée, y compris un rejet. */
  decideReport: (id: string, dto: { decision: ReportDecision; reasons: string }) =>
    request<void>('POST', `/v1/admin/reports/${id}/decide`, dto, true),
  /**
   * Recherche de comptes. **Il n'existe aucune route qui les liste tous** : un administrateur
   * cherche un compte précis, il ne parcourt pas l'annuaire des inscrits (RM-16-02). Le serveur
   * renvoie un TABLEAU, pas un objet `{ items }` — ce client prétendait le contraire.
   */
  searchAccounts: (query: string) =>
    request<AdminAccount[]>('GET', `/v1/admin/accounts?query=${encodeURIComponent(query)}`, undefined, true),
  suspendAccount: (id: string, reason: string) =>
    request<void>('POST', `/v1/admin/accounts/${id}/suspend`, { reason }, true),
  reactivateAccount: (id: string, reason: string) =>
    request<void>('POST', `/v1/admin/accounts/${id}/reactivate`, { reason }, true),
  /**
   * EF-16-07 : le bannissement n'est pas appliqué, il est DEMANDÉ. Un second administrateur,
   * distinct du demandeur, doit l'approuver — c'est le serveur qui refuse l'auto-approbation.
   */
  requestBan: (id: string, reason: string) =>
    request<{ sanctionId: string }>('POST', `/v1/admin/accounts/${id}/ban`, { reason }, true),
  approveBan: (sanctionId: string) => request<void>('POST', `/v1/admin/sanctions/${sanctionId}/approve`, undefined, true),
  rejectBan: (sanctionId: string) => request<void>('POST', `/v1/admin/sanctions/${sanctionId}/reject`, undefined, true),

  // M16 — procédures support (EF-16-03, CU-16-04)
  /**
   * ⚠️ RM-16-01 : M16 **guide et journalise, il n'agit pas**. Ouvrir une procédure n'exécute
   * rien — elle trace ce qu'un administrateur a fait par ailleurs. L'écran doit le dire.
   */
  /** Écrire à l'administration — tout compte authentifié, sans condition (dette 8quater). */
  createSupportRequest: (dto: { subject: SupportProcedureType; body: string }) =>
    request<{ requestId: string }>('POST', '/v1/support-requests', dto, true),
  /** Mes demandes et leurs réponses. */
  mySupportRequests: () => request<SupportRequest[]>('GET', '/v1/support-requests/mine', undefined, true),

  /** La file d'administration — ouvertes d'abord, plus anciennes en tête. */
  adminSupportRequests: (status?: 'OPEN' | 'ANSWERED') =>
    request<AdminSupportRequest[]>(
      'GET',
      `/v1/admin/support-requests${status ? `?status=${status}` : ''}`,
      undefined,
      true,
    ),
  /** Répondre clôt la demande : il n'y a pas d'aller-retour au MVP. */
  answerSupportRequest: (id: string, answer: string) =>
    request<{ id: string; status: 'ANSWERED' }>('POST', `/v1/admin/support-requests/${id}/answer`, { answer }, true),

  supportProcedures: (q: { type?: SupportProcedureType; status?: SupportProcedureStatus } = {}) => {
    const p = new URLSearchParams()
    if (q.type) p.set('type', q.type)
    if (q.status) p.set('status', q.status)
    return request<SupportProcedure[]>('GET', `/v1/admin/support-procedures${p.toString() ? `?${p}` : ''}`, undefined, true)
  },
  openSupportProcedure: (dto: {
    type: SupportProcedureType
    accountId?: string
    justification: string
    steps: Array<{ label: string; note?: string }>
  }) => request<{ id: string }>('POST', '/v1/admin/support-procedures', dto, true),
  completeSupportProcedure: (id: string, steps: Array<{ label: string; note?: string }>) =>
    request<{ id: string; status: SupportProcedureStatus }>('POST', `/v1/admin/support-procedures/${id}/complete`, { steps }, true),
  cancelSupportProcedure: (id: string, reason: string) =>
    request<{ id: string; status: SupportProcedureStatus }>('POST', `/v1/admin/support-procedures/${id}/cancel`, { reason }, true),

  // M03 — dossier de vérification du déposant
  /** Versions acceptées à l'inscription, et quand (EF-01-08 — la preuve légale, enfin lisible). */
  myConsents: () =>
    request<Array<{ documentType: string; documentVersion: string; acceptedAt: string }>>(
      'GET',
      '/v1/accounts/me/consents',
      undefined,
      true,
    ),
  verificationMine: () => request<VerificationCase>('GET', '/v1/verification/me', undefined, true),
  verificationUpload: (dto: UploadDocumentRequest) =>
    request<{ documentId: string; kind: string }>('POST', '/v1/verification/me/documents/upload', dto, true),
  /** ⚠️ Ne renvoie PAS le dossier complet — seulement l'accusé de dépôt (CU-03-01). */
  verificationSubmit: () =>
    request<{ caseId: string; status: VerificationStatus; announcedDelayHours: number }>(
      'POST',
      '/v1/verification/me/submit',
      undefined,
      true,
    ),
  /** Retrait d'une pièce, pour la remplacer. Refusé dès que le dossier est en examen. */
  verificationRemoveDocument: (id: string) =>
    request<{ removed: true }>('DELETE', `/v1/verification/me/documents/${id}`, undefined, true),
  verificationSignStart: () => request<{ expiresInSeconds: number; debugCode?: string }>(
    'POST',
    '/v1/verification/me/agreement/sign/start',
    undefined,
    true,
  ),
  /** ⚠️ Renvoie l'accusé de signature, pas le dossier : rechargez `verificationMine` après. */
  verificationSign: (dto: { password: string; otpCode: string }) =>
    request<{ caseId: string; version: number; signedAt: string; effectiveAt: string; canPractice: boolean }>(
      'POST',
      '/v1/verification/me/agreement/sign',
      dto,
      true,
    ),
}

export { request }

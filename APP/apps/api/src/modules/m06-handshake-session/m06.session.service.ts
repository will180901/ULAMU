/**
 * M06 — SessionService : la Session de soin (D-006), messagerie chronométrée dont
 * l'horloge du SERVEUR fait foi (RM-06-02, D-025).
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * Pièce maîtresse : settle() — les transitions « temporelles » sont appliquées
 * PARESSEUSEMENT à toute lecture/écriture (aucun poller dédié, comme la présence M05) :
 * 1. PREPARING dont paidAt + PM-28 ≤ now → ACTIVE (EF-06-04, démarrage automatique) —
 *    startedAt = paidAt + PM-28 (l'échéance, pas l'instant de lecture : déterministe) ;
 * 2. ACTIVE dont endsAt ≤ now → ENDED, endedAt = endsAt (EF-06-08, CU-06-03),
 *    accès Carnet refermés (EF-06-06) ;
 * 3. ENDED sans AUCUN message du professionnel → remboursement intégral (D-008,
 *    INVARIANT N°9) puis ENDED → REFUNDED — vérification AUTO-RÉPARANTE : rejouée à
 *    chaque lecture tant que la session n'est pas remboursée (un échec réseau du
 *    remboursement est donc rattrapé au passage suivant, et par sweepElapsedActive).
 * Chaque transition est un updateMany CONDITIONNEL (anti-TOCTOU, D-046) : un seul
 * gagnant en cas de course, événements/notifications émis une seule fois.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CareSession, CareSessionStatus, Prisma, SessionMessage, SessionMessageReaction } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { openSecret, sealSecret } from "../../common/crypto/secretbox";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { StorageService } from "../../common/storage.service";
import { PaymentsService } from "../m13-payments/m13.payments.service";
import {
  accumulatedProfessionalDelaySec,
  autoStartDue,
  canExtend,
  clampMessagePageSize,
  ratingValid,
  sessionRemainingSeconds,
} from "./m06.policies";
import { ExtendSessionDto, ListMessagesQueryDto, RateSessionDto, SendMessageDto, SubmitPreConsultationDto } from "./m06.dto";

// ── Vues ─────────────────────────────────────────────────────────────────────

export interface SessionView {
  id: string;
  handshakeId: string;
  status: CareSessionStatus;
  patientAccountId: string;
  professionalId: string;
  subProfileId: string | null;
  durationMin: number;
  paidAt: string;
  startedAt: string | null;
  /** Décompteur : la SEULE vérité est endsAt + remainingSeconds calculés serveur (RM-06-02). */
  endsAt: string | null;
  endedAt: string | null;
  remainingSeconds: number;
  /** PREPARING : échéance du démarrage automatique (paidAt + PM-28, EF-06-04). */
  autoStartAt: string | null;
  extensionTotalSec: number;
  /** Retard cumulé du soignant (s) au-delà de la tolérance de 30 s entre messages (D-032). */
  professionalDelaySec: number;
  reportDepositedAt: string | null;
  /**
   * Échéance de dépôt du compte-rendu — `endedAt` + PM-30. `null` tant que la session n'est pas
   * terminée : le délai ne court qu'à partir de la clôture.
   *
   * ⚠️ **Pourquoi cette date sort du serveur.** Au-delà de PM-30, le dépôt n'est pas toléré : il
   * est **REFUSÉ**, et les gains sont gelés (CU-06-03) — or RM-06-04 ne crédite qu'au dépôt. Le
   * médecin a donc travaillé pour rien.
   *
   * L'écran ne pouvait pas la calculer : il reçoit `endedAt`, mais **PM-30 ne lui est pas
   * accessible** (la lecture des paramètres est réservée aux administrateurs). Il ne lui restait
   * qu'à écrire un délai en dur — ce qui a produit le « 48 h » des maquettes, deux fois le délai
   * réel, et un « 24 heures » en dur dans C5 qui mentirait au premier changement de PM-30.
   */
  reportDueAt: string | null;
  preConsultation: { symptoms: string; sinceWhen: string | null; attachments: string[]; submittedAt: string } | null;
  rated: boolean;
  /** L'AUTRE participant est en train d'écrire/enregistrer (signal éphémère, TTL ~6s). */
  otherPartyTyping: boolean;
}

export interface SessionListItem {
  id: string;
  status: CareSessionStatus;
  patientAccountId: string;
  professionalId: string;
  subProfileId: string | null;
  durationMin: number;
  paidAt: string;
  endsAt: string | null;
  endedAt: string | null;
  remainingSeconds: number;
  reportDepositedAt: string | null;
  /**
   * Échéance de dépôt du compte-rendu — `endedAt` + PM-30. `null` tant que la session n'est pas
   * terminée : le délai ne court qu'à partir de la clôture.
   *
   * ⚠️ **Pourquoi cette date sort du serveur.** Au-delà de PM-30, le dépôt n'est pas toléré : il
   * est **REFUSÉ**, et les gains sont gelés (CU-06-03) — or RM-06-04 ne crédite qu'au dépôt. Le
   * médecin a donc travaillé pour rien.
   *
   * L'écran ne pouvait pas la calculer : il reçoit `endedAt`, mais **PM-30 ne lui est pas
   * accessible** (la lecture des paramètres est réservée aux administrateurs). Il ne lui restait
   * qu'à écrire un délai en dur — ce qui a produit le « 48 h » des maquettes, deux fois le délai
   * réel, et un « 24 heures » en dur dans C5 qui mentirait au premier changement de PM-30.
   */
  reportDueAt: string | null;
  /**
   * La référence de commande de la séance — la CLÉ qui relie une consultation à l'argent qu'elle a
   * rapporté (S9, 28/08/2026).
   *
   * Le journal des gains (`GET /v1/earnings/me`) porte un mouvement `CREDIT` par consultation
   * capturée, référencé par ce même `orderRef` — la capture a lieu au dépôt du compte-rendu
   * (RM-06-04). Sans ce champ, le registre C4 ne pouvait pas dire ce qu'une consultation a
   * réellement rapporté : il aurait fallu écrire un prix dans la page, ou n'en montrer aucun.
   *
   * Aucun pouvoir attaché : le webhook de paiement exige un secret partagé et une RÉFÉRENCE
   * D'AGRÉGATEUR, pas celle-ci. Et la vue n'est servie qu'aux deux participants de la séance.
   */
  orderRef: string;
}

export interface MessageReplyPreview {
  id: string;
  senderId: string;
  kind: string;
  preview: string;
}
export interface MessageView {
  id: string;
  sessionId: string;
  senderId: string;
  kind: string;
  body: string | null;
  fileKey: string | null;
  mediaKeys: string[];
  clientMsgId: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  replyTo: MessageReplyPreview | null;
  /** Accusé pour les messages ENVOYÉS par le lecteur : sent | delivered | read ; null sinon. */
  status: "sent" | "delivered" | "read" | null;
  /** Réactions actives agrégées par emoji (WhatsApp-like) — [] si aucune. */
  reactions: Array<{ emoji: string; count: number; mine: boolean }>;
}

/** Fenêtre d'édition / suppression « pour tout le monde » (messagerie SARIS doc 18 §5.2). */
const EDIT_DELETE_WINDOW_MS = 15 * 60 * 1000;

/** Chiffrement au repos du corps des messages (AES-256-GCM, même primitive que les secrets TOTP). */
function encryptBody(body: string | null | undefined): string | null {
  return body ? sealSecret(body) : null;
}
/** Contenu écrit AVANT l'ajout du chiffrement = pas de préfixe "v1$" → servi tel quel (rétrocompatible). */
function decryptBody(stored: string | null): string | null {
  if (stored === null) return null;
  if (!stored.startsWith("v1$")) return stored;
  try {
    return openSecret(stored);
  } catch {
    return "[message illisible]"; // ne jamais planter le fil pour une entrée corrompue/illisible
  }
}

type MessageRow = SessionMessage & { replyTo?: SessionMessage | null; reactions?: SessionMessageReaction[] };
/** Réactions actives uniquement (deletedAt: null) — inclusion partagée par tous les points de lecture. */
const ACTIVE_REACTIONS_INCLUDE = { where: { deletedAt: null } } as const;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  /**
   * Indicateur « en train d'écrire » — EN MÉMOIRE (pas en base) : trop éphémère pour justifier une
   * table, et cette instance unique (free tier, pas de scaling horizontal) n'a pas de problème de
   * synchronisation entre process. Un redémarrage (veille Render) le vide sans dommage — il se
   * reconstruit tout seul en quelques secondes dès la prochaine frappe. Compatible avec le polling
   * existant (pas de canal SSE dédié) : lu à chaque `getSession()`, déjà interrogé toutes les 3s.
   */
  private readonly typingBySession = new Map<string, { accountId: string; expiresAtMs: number }>();
  private static readonly TYPING_TTL_MS = 6000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly payments: PaymentsService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Téléverse un média (photo / note vocale) DANS une session active — renvoie sa clé de stockage.
   * Le client envoie ensuite un message {kind: PHOTO|VOICE, fileKey} (sendMessage). Réservé aux
   * participants ; la session doit être ACTIVE (RM-06-03). Le média est servi par MediaController
   * (route /v1/media/sessions/:key, vérifiée participant).
   */
  async uploadMedia(actor: AuthenticatedActor, sessionId: string, base64: string, mime: string): Promise<{ fileKey: string }> {
    const session = await this.loadForParticipant(actor, sessionId);
    const settled = await this.settle(session);
    if (settled.status !== CareSessionStatus.ACTIVE) {
      throw new ConflictException("Un média ne peut être envoyé que dans une session active (RM-06-03)");
    }
    const fileKey = await this.storage.save("sm", base64, mime);
    return { fileKey };
  }

  // ── Accès participants (le « contexte session » exposé, spec §7) ────────────

  /** Session par id, visible UNIQUEMENT de ses deux participants — 404 sinon (pas de fuite). */
  async loadForParticipant(actor: AuthenticatedActor, sessionId: string): Promise<CareSession> {
    const session = await this.prisma.careSession.findUnique({ where: { id: sessionId } });
    if (!session || (session.patientAccountId !== actor.accountId && session.professionalId !== actor.accountId)) {
      throw new NotFoundException("Session introuvable");
    }
    return session;
  }

  // ── settle() : transitions paresseuses (EF-06-04/08/09 — voir l'en-tête) ────

  async settle(session: CareSession): Promise<CareSession> {
    let current = session;

    // 1. EF-06-04 : démarrage automatique PM-28 — startedAt = l'ÉCHÉANCE (déterministe,
    //    D-025) : même lue des heures plus tard, la session a démarré et fini aux mêmes instants.
    if (current.status === CareSessionStatus.PREPARING) {
      const pm28S = await this.params.getInt("PM-28");
      if (autoStartDue(current.paidAt.getTime(), pm28S, Date.now())) {
        const startedAt = new Date(current.paidAt.getTime() + pm28S * 1000);
        const endsAt = new Date(startedAt.getTime() + current.durationMin * 60_000);
        await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.careSession.updateMany({
            where: { id: current.id, status: CareSessionStatus.PREPARING },
            data: { status: CareSessionStatus.ACTIVE, startedAt, endsAt },
          });
          if (count === 1) {
            // CU-06-02 : décompteur lancé des deux côtés — payload sans contenu médical (RM-06-06).
            await this.outbox.emit(tx, {
              type: "notify.request",
              payload: { accountId: current.professionalId, template: "m06.session.started", priority: "critical", sessionId: current.id },
            });
            await this.outbox.emit(tx, {
              type: "notify.request",
              payload: { accountId: current.patientAccountId, template: "m06.session.started", sessionId: current.id },
            });
            await this.audit.emit(tx, {
              actorType: "system",
              action: "m06.session.auto_started",
              resource: `session:${current.id}`,
              context: { pm28S },
            });
          }
        });
        current = await this.prisma.careSession.findUniqueOrThrow({ where: { id: current.id } });
      }
    }

    // 2. EF-06-08 / CU-06-03 : décompteur épuisé → clôture (endedAt = endsAt, pas l'instant
    //    de lecture) + fermeture des accès Carnet (EF-06-06 : « refermé à la clôture »).
    if (current.status === CareSessionStatus.ACTIVE && current.endsAt && current.endsAt.getTime() <= Date.now()) {
      const endedAt = current.endsAt;
      await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.careSession.updateMany({
          where: { id: current.id, status: CareSessionStatus.ACTIVE, endsAt: { lte: new Date() } },
          data: { status: CareSessionStatus.ENDED, endedAt },
        });
        if (count === 1) {
          await tx.sessionRecordAccess.updateMany({
            where: { sessionId: current.id, closedAt: null },
            data: { closedAt: endedAt },
          });
          await this.audit.emit(tx, {
            actorType: "system",
            action: "m06.session.ended",
            resource: `session:${current.id}`,
          });
        }
      });
      current = await this.prisma.careSession.findUniqueOrThrow({ where: { id: current.id } });
    }

    // 3. D-008 (INVARIANT N°9) : terminée sans AUCUN message du professionnel → remboursement
    //    intégral immédiat. refund() est idempotent (RM-13-04) et appelé HORS transaction
    //    (réseau) ; la transition ENDED→REFUNDED conditionnelle garantit une seule émission
    //    d'événements. Si le remboursement échoue ici, la session reste ENDED : la
    //    vérification se rejoue à la prochaine lecture (auto-réparant).
    if (current.status === CareSessionStatus.ENDED) {
      const professionalMessages = await this.prisma.sessionMessage.count({
        where: { sessionId: current.id, senderId: current.professionalId },
      });
      if (professionalMessages === 0) {
        await this.payments.refund(current.orderRef, "Aucune réponse du professionnel (D-008)");
        await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.careSession.updateMany({
            where: { id: current.id, status: CareSessionStatus.ENDED },
            data: { status: CareSessionStatus.REFUNDED },
          });
          if (count === 1) {
            // → indicateurs M05 (incident compté, EF-06-09) — payload minimal.
            await this.outbox.emit(tx, {
              type: "m06.session.refunded",
              payload: { professionalId: current.professionalId },
            });
            // CU-06-04 : patient notifié avec excuse — critique (argent), sans contenu médical.
            await this.outbox.emit(tx, {
              type: "notify.request",
              payload: { accountId: current.patientAccountId, template: "m06.session.refunded", priority: "critical", sessionId: current.id },
            });
            await this.audit.emit(tx, {
              actorType: "system",
              action: "m06.session.refunded",
              resource: `session:${current.id}`,
              context: { rule: "D-008" },
            });
          }
        });
        current = await this.prisma.careSession.findUniqueOrThrow({ where: { id: current.id } });
      }
    }

    return current;
  }

  /** settle() par identifiant — pour les chemins qui ne tiennent pas encore la ligne. */
  async settleById(sessionId: string): Promise<CareSession | null> {
    const session = await this.prisma.careSession.findUnique({ where: { id: sessionId } });
    return session ? this.settle(session) : null;
  }

  /**
   * Règle les sessions « temporellement rassises » d'UN professionnel — appelé avant le
   * compte PM-27 de l'initiation (EF-06-14) : le plafond se mesure sur des statuts à jour.
   */
  async settleStaleForProfessional(professionalId: string): Promise<void> {
    const pm28S = await this.params.getInt("PM-28");
    const now = new Date();
    const stale = await this.prisma.careSession.findMany({
      where: {
        professionalId,
        OR: [
          { status: CareSessionStatus.PREPARING, paidAt: { lte: new Date(now.getTime() - pm28S * 1000) } },
          { status: CareSessionStatus.ACTIVE, endsAt: { lte: now } },
        ],
      },
      take: 50,
    });
    for (const session of stale) await this.settle(session);
  }

  // ── EF-06-04 : pré-consultation (D-019) — transmise = la session démarre ────

  async submitPreConsultation(actor: AuthenticatedActor, sessionId: string, dto: SubmitPreConsultationDto): Promise<SessionView> {
    const session = await this.loadForParticipant(actor, sessionId);
    if (session.patientAccountId !== actor.accountId) {
      throw new ForbiddenException("Seul le patient remplit la pré-consultation (D-019)");
    }
    const settled = await this.settle(session);
    if (settled.status !== CareSessionStatus.PREPARING) {
      if (settled.status === CareSessionStatus.ACTIVE) {
        throw new ConflictException(
          "La session a déjà démarré (démarrage automatique, PM-28) — envoyez ces informations directement dans la conversation",
        );
      }
      throw new ConflictException("La session n'est plus en préparation — la pré-consultation n'est plus attendue");
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + settled.durationMin * 60_000);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.preConsultation.create({
          data: {
            sessionId,
            symptoms: dto.symptoms,
            sinceWhen: dto.sinceWhen ?? null,
            attachments: dto.attachments ?? [],
            submittedAt: now,
          },
        });
        // EF-06-04 : « le décompteur ne démarre qu'à la transmission » — transition conditionnelle.
        const { count } = await tx.careSession.updateMany({
          where: { id: sessionId, status: CareSessionStatus.PREPARING },
          data: { status: CareSessionStatus.ACTIVE, startedAt: now, endsAt },
        });
        if (count === 0) throw new ConflictException("La session a démarré entre-temps — réessayez dans la conversation");
        // D-019 : transmise au professionnel — la notification ne porte JAMAIS les symptômes (RM-06-06).
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: settled.professionalId, template: "m06.session.started", priority: "critical", sessionId },
        });
        await this.audit.emit(tx, {
          actorId: actor.accountId,
          actorType: "patient",
          action: "m06.session.started",
          resource: `session:${sessionId}`,
          context: { trigger: "pre_consultation" }, // jamais le contenu médical (RM-04-03)
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("La pré-consultation a déjà été transmise pour cette session");
      }
      throw err;
    }
    return this.getSession(actor, sessionId);
  }

  // ── EF-06-05/13 : messages (RM-06-03, ADR-12) ────────────────────────────────

  async sendMessage(actor: AuthenticatedActor, sessionId: string, dto: SendMessageDto): Promise<MessageView> {
    const session = await this.loadForParticipant(actor, sessionId);
    // AVANT TOUT : transitions paresseuses (démarrage auto PM-28, clôture, D-008).
    const settled = await this.settle(session);
    if (settled.status !== CareSessionStatus.ACTIVE) {
      throw new ConflictException(
        "Aucun message ne peut exister hors d'une session active (RM-06-03, D-006) — la session est " +
          this.statusLabel(settled.status),
      );
    }
    const mediaKeys = dto.mediaKeys ?? [];
    const hasMedia = !!dto.fileKey || mediaKeys.length > 0;
    const contentValid = dto.kind === "TEXT" ? !!dto.body?.trim() : hasMedia;
    if (!contentValid) {
      throw new BadRequestException(
        "Message invalide : un texte exige un contenu, une photo / note vocale / document exige un fichier (EF-06-05)",
      );
    }
    // Citation/réponse : le message cité doit appartenir à la session et ne pas être supprimé.
    let replyTo: SessionMessage | null = null;
    if (dto.replyToId) {
      replyTo = await this.prisma.sessionMessage.findFirst({ where: { id: dto.replyToId, sessionId, deletedAt: null } });
      if (!replyTo) throw new BadRequestException("Message cité introuvable dans cette session");
    }

    const recipient = actor.accountId === settled.patientAccountId ? settled.professionalId : settled.patientAccountId;
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // Re-vérification DANS la transaction : la clôture a pu gagner entre settle() et ici
        // (fenêtre résiduelle réduite à la transaction — RM-06-03 tenue au plus près).
        const live = await tx.careSession.findFirst({
          where: { id: sessionId, status: CareSessionStatus.ACTIVE, endsAt: { gt: new Date() } },
          select: { id: true },
        });
        if (!live) throw new ConflictException("La session vient de se terminer — le message n'a pas été envoyé (RM-06-03)");
        const message = await tx.sessionMessage.create({
          data: {
            sessionId,
            senderId: actor.accountId,
            kind: dto.kind,
            body: encryptBody(dto.body),
            fileKey: dto.fileKey ?? null,
            mediaKeys,
            replyToId: dto.replyToId ?? null,
            clientMsgId: dto.clientMsgId,
          },
        });
        // C4 : l'autre partie est avertie — JAMAIS le contenu du message (RM-06-06, RM-14-03).
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: recipient, template: "m06.message.received", sessionId },
        });
        return message;
      });
      return this.toMessageView(created, { session: settled, viewerId: actor.accountId, replyTo });
    } catch (err) {
      // ADR-12 / EF-06-13 : rejeu de la file hors ligne — la clé (sessionId, clientMsgId)
      // existe déjà → on RETOURNE le message existant, un seul effet, jamais de doublon.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await this.prisma.sessionMessage.findUnique({
          where: { sessionId_clientMsgId: { sessionId, clientMsgId: dto.clientMsgId } },
          include: { replyTo: true, reactions: ACTIVE_REACTIONS_INCLUDE },
        });
        if (existing) return this.toMessageView(existing, { session: settled, viewerId: actor.accountId, replyTo: existing.replyTo });
      }
      throw err;
    }
  }

  // ── Édition / suppression (messagerie SARIS doc 18 §5.2) ─────────────────────

  /** Édition d'un message TEXTE par son auteur, dans la fenêtre de 15 min. */
  async editMessage(actor: AuthenticatedActor, sessionId: string, messageId: string, body: string): Promise<MessageView> {
    const session = await this.loadForParticipant(actor, sessionId);
    const msg = await this.prisma.sessionMessage.findFirst({ where: { id: messageId, sessionId } });
    if (!msg) throw new NotFoundException("Message introuvable");
    if (msg.senderId !== actor.accountId) throw new ForbiddenException("Seul l'auteur peut modifier son message");
    if (msg.deletedAt) throw new ConflictException("Ce message a été supprimé");
    if (msg.kind !== "TEXT") throw new ConflictException("Seul un message texte peut être modifié");
    if (Date.now() - msg.createdAt.getTime() > EDIT_DELETE_WINDOW_MS) {
      throw new ConflictException("Modification impossible : la fenêtre de 15 minutes est dépassée");
    }
    const clean = body.trim();
    if (!clean) throw new BadRequestException("Le message ne peut pas être vide");
    const updated = await this.prisma.sessionMessage.update({
      where: { id: messageId },
      data: { body: encryptBody(clean), editedAt: new Date() },
      include: { replyTo: true, reactions: ACTIVE_REACTIONS_INCLUDE },
    });
    return this.toMessageView(updated, { session, viewerId: actor.accountId, replyTo: updated.replyTo });
  }

  /** Suppression : « pour moi » (masquage, toujours possible) ou « pour tout le monde » (auteur, ≤ 15 min). */
  async deleteMessage(actor: AuthenticatedActor, sessionId: string, messageId: string, forEveryone: boolean): Promise<{ ok: true }> {
    const session = await this.loadForParticipant(actor, sessionId);
    const msg = await this.prisma.sessionMessage.findFirst({ where: { id: messageId, sessionId } });
    if (!msg) throw new NotFoundException("Message introuvable");
    if (forEveryone) {
      if (msg.senderId !== actor.accountId) throw new ForbiddenException("Seul l'auteur peut supprimer pour tout le monde");
      if (Date.now() - msg.createdAt.getTime() > EDIT_DELETE_WINDOW_MS) {
        throw new ConflictException("Suppression pour tous impossible : la fenêtre de 15 minutes est dépassée");
      }
      await this.prisma.sessionMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    } else {
      await this.prisma.sessionMessageHidden.upsert({
        where: { messageId_accountId: { messageId, accountId: actor.accountId } },
        update: {},
        create: { messageId, accountId: actor.accountId },
      });
    }
    return { ok: true };
  }

  /**
   * Bascule une réaction emoji (1 par participant/message, façon WhatsApp) : même emoji déjà actif →
   * retrait (soft-delete) ; emoji différent OU réaction déjà retirée → upsert (la « résurrection » via
   * upsert évite qu'une contrainte d'unicité bloque un second clic après un premier retrait).
   */
  async reactToMessage(actor: AuthenticatedActor, sessionId: string, messageId: string, emoji: string): Promise<MessageView> {
    const session = await this.loadForParticipant(actor, sessionId);
    const msg = await this.prisma.sessionMessage.findFirst({ where: { id: messageId, sessionId } });
    if (!msg || msg.deletedAt) throw new NotFoundException("Message introuvable");
    const key = { messageId_accountId: { messageId, accountId: actor.accountId } };
    const existing = await this.prisma.sessionMessageReaction.findUnique({ where: key });
    if (existing && !existing.deletedAt && existing.emoji === emoji) {
      await this.prisma.sessionMessageReaction.update({ where: key, data: { deletedAt: new Date() } });
    } else {
      await this.prisma.sessionMessageReaction.upsert({
        where: key,
        update: { emoji, deletedAt: null },
        create: { messageId, accountId: actor.accountId, emoji },
      });
    }
    const fresh = await this.prisma.sessionMessage.findUniqueOrThrow({
      where: { id: messageId },
      include: { replyTo: true, reactions: ACTIVE_REACTIONS_INCLUDE },
    });
    return this.toMessageView(fresh, { session, viewerId: actor.accountId, replyTo: fresh.replyTo });
  }

  /** Fil de la session, du plus ancien au plus récent, paginé par curseur — lecture seule après clôture (CU-06-03). */
  async listMessages(
    actor: AuthenticatedActor,
    sessionId: string,
    query: ListMessagesQueryDto,
  ): Promise<{ items: MessageView[]; nextCursor: string | null }> {
    const session = await this.loadForParticipant(actor, sessionId);
    await this.settle(session); // la lecture applique les transitions paresseuses

    // Accusés : à l'ouverture du fil, le lecteur a « lu jusqu'à maintenant » (curseur par participant).
    const isPatient = session.patientAccountId === actor.accountId;
    await this.prisma.careSession.update({
      where: { id: sessionId },
      data: isPatient ? { patientLastReadAt: new Date() } : { professionalLastReadAt: new Date() },
    });

    const take = clampMessagePageSize(query.limit);
    if (query.cursor) {
      const anchor = await this.prisma.sessionMessage.findFirst({
        where: { id: query.cursor, sessionId },
        select: { id: true },
      });
      if (!anchor) throw new BadRequestException("Curseur de pagination invalide");
    }
    const rows = await this.prisma.sessionMessage.findMany({
      // « Supprimer pour moi » : on exclut les messages masqués pour le lecteur.
      where: { sessionId, hiddenFor: { none: { accountId: actor.accountId } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: take + 1, // +1 : détecte s'il reste une page
      include: { replyTo: true, reactions: ACTIVE_REACTIONS_INCLUDE },
    });
    const page = rows.slice(0, take);
    const items = page.map((m) => this.toMessageView(m, { session, viewerId: actor.accountId, replyTo: m.replyTo }));
    return { items, nextCursor: rows.length > take ? (items[items.length - 1]?.id ?? null) : null };
  }

  // ── État + décompteur (RM-06-02 : calculé SERVEUR) ───────────────────────────

  /** Signale « en train d'écrire » (ou d'enregistrer) — TTL court, lu par le polling existant. */
  async setTyping(actor: AuthenticatedActor, sessionId: string): Promise<{ ok: true }> {
    await this.loadForParticipant(actor, sessionId); // 404 si pas participant — jamais de fuite
    this.typingBySession.set(sessionId, { accountId: actor.accountId, expiresAtMs: Date.now() + SessionService.TYPING_TTL_MS });
    return { ok: true };
  }

  /** true si L'AUTRE participant a un signal « en train d'écrire » encore valide pour cette session. */
  private otherPartyTyping(sessionId: string, viewerId: string): boolean {
    const entry = this.typingBySession.get(sessionId);
    if (!entry || entry.accountId === viewerId) return false; // jamais son propre signal
    return entry.expiresAtMs > Date.now();
  }

  async getSession(actor: AuthenticatedActor, sessionId: string): Promise<SessionView> {
    const session = await this.loadForParticipant(actor, sessionId);
    const settled = await this.settle(session);
    const [pm28S, pm30S] = await Promise.all([this.params.getInt("PM-28"), this.params.getInt("PM-30")]);
    const [preConsultation, rating, msgs] = await Promise.all([
      this.prisma.preConsultation.findUnique({ where: { sessionId } }),
      this.prisma.sessionRating.findUnique({ where: { sessionId }, select: { sessionId: true } }),
      this.prisma.sessionMessage.findMany({
        where: { sessionId, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { senderId: true, createdAt: true },
      }),
    ]);
    const professionalDelaySec = accumulatedProfessionalDelaySec(msgs, settled.professionalId);
    const now = Date.now();
    return {
      id: settled.id,
      handshakeId: settled.handshakeId,
      status: settled.status,
      patientAccountId: settled.patientAccountId,
      professionalId: settled.professionalId,
      subProfileId: settled.subProfileId,
      durationMin: settled.durationMin,
      paidAt: settled.paidAt.toISOString(),
      startedAt: settled.startedAt ? settled.startedAt.toISOString() : null,
      endsAt: settled.endsAt ? settled.endsAt.toISOString() : null,
      endedAt: settled.endedAt ? settled.endedAt.toISOString() : null,
      remainingSeconds: settled.status === CareSessionStatus.ACTIVE ? sessionRemainingSeconds(settled.endsAt, now) : 0,
      autoStartAt:
        settled.status === CareSessionStatus.PREPARING
          ? new Date(settled.paidAt.getTime() + pm28S * 1000).toISOString()
          : null,
      extensionTotalSec: settled.extensionTotalSec,
      professionalDelaySec,
      reportDepositedAt: settled.reportDepositedAt ? settled.reportDepositedAt.toISOString() : null,
      reportDueAt: this.reportDueAt(settled.endedAt, pm30S),
      preConsultation: preConsultation
        ? {
            symptoms: preConsultation.symptoms,
            sinceWhen: preConsultation.sinceWhen,
            attachments: preConsultation.attachments,
            submittedAt: preConsultation.submittedAt.toISOString(),
          }
        : null,
      rated: rating !== null,
      otherPartyTyping: this.otherPartyTyping(sessionId, actor.accountId),
    };
  }

  /** Sessions de l'acteur (patient ou professionnel), plus récentes d'abord. */
  async listMine(actor: AuthenticatedActor): Promise<{ items: SessionListItem[] }> {
    const [pm28S, pm30S] = await Promise.all([this.params.getInt("PM-28"), this.params.getInt("PM-30")]);
    const nowMs = Date.now();
    const rows = await this.prisma.careSession.findMany({
      where: { OR: [{ patientAccountId: actor.accountId }, { professionalId: actor.accountId }] },
      orderBy: { paidAt: "desc" },
      take: 100,
    });
    const items: SessionListItem[] = [];
    for (let session of rows) {
      // Transitions paresseuses : seulement si la ligne est temporellement rassise (lecture honnête).
      const staleness =
        (session.status === CareSessionStatus.PREPARING && autoStartDue(session.paidAt.getTime(), pm28S, nowMs)) ||
        (session.status === CareSessionStatus.ACTIVE && session.endsAt !== null && session.endsAt.getTime() <= nowMs) ||
        session.status === CareSessionStatus.ENDED; // D-008 auto-réparant
      if (staleness) session = await this.settle(session);
      items.push({
        id: session.id,
        status: session.status,
        patientAccountId: session.patientAccountId,
        professionalId: session.professionalId,
        subProfileId: session.subProfileId,
        durationMin: session.durationMin,
        paidAt: session.paidAt.toISOString(),
        endsAt: session.endsAt ? session.endsAt.toISOString() : null,
        endedAt: session.endedAt ? session.endedAt.toISOString() : null,
        remainingSeconds: session.status === CareSessionStatus.ACTIVE ? sessionRemainingSeconds(session.endsAt, Date.now()) : 0,
        reportDepositedAt: session.reportDepositedAt ? session.reportDepositedAt.toISOString() : null,
        reportDueAt: this.reportDueAt(session.endedAt, pm30S),
        orderRef: session.orderRef,
      });
    }
    return { items };
  }

  // ── EF-06-07 : prolongation gratuite (D-016) ─────────────────────────────────

  async extend(actor: AuthenticatedActor, sessionId: string, dto: ExtendSessionDto): Promise<SessionView> {
    const session = await this.loadForParticipant(actor, sessionId);
    if (session.professionalId !== actor.accountId) {
      throw new ForbiddenException("La prolongation est à la seule initiative du professionnel (D-016)");
    }
    const settled = await this.settle(session);
    if (settled.status !== CareSessionStatus.ACTIVE || !settled.endsAt) {
      throw new ConflictException("Seule une session active peut être prolongée (EF-06-07)");
    }
    const pm29S = await this.params.getInt("PM-29");
    const addSec = dto.minutes * 60;
    if (!canExtend(settled.extensionTotalSec, addSec, pm29S)) {
      throw new ConflictException(
        `Prolongation impossible : le cumul gratuit est plafonné à ${Math.floor(pm29S / 60)} minutes (PM-29)`,
      );
    }

    const newEndsAt = new Date(settled.endsAt.getTime() + addSec * 1000);
    await this.prisma.$transaction(async (tx) => {
      // Compare-and-swap (D-046) : statut + cumul lus — toute écriture concurrente fait échouer.
      const { count } = await tx.careSession.updateMany({
        where: { id: sessionId, status: CareSessionStatus.ACTIVE, extensionTotalSec: settled.extensionTotalSec },
        data: { extensionTotalSec: settled.extensionTotalSec + addSec, endsAt: newEndsAt },
      });
      if (count === 0) throw new ConflictException("Modification simultanée de la session — réessayez");
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: settled.patientAccountId, template: "m06.session.extended", sessionId, minutes: dto.minutes },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m06.session.extended",
        resource: `session:${sessionId}`,
        context: { minutes: dto.minutes, extensionTotalSec: settled.extensionTotalSec + addSec },
      });
    });
    return this.getSession(actor, sessionId);
  }

  // ── EF-06-10 : annulation par le patient ─────────────────────────────────────

  async cancel(actor: AuthenticatedActor, sessionId: string): Promise<SessionView> {
    const session = await this.loadForParticipant(actor, sessionId);
    if (session.patientAccountId !== actor.accountId) {
      throw new ForbiddenException("Seul le patient peut annuler sa session (EF-06-10)");
    }
    const settled = await this.settle(session);
    if (settled.status === CareSessionStatus.REFUNDED) {
      throw new ConflictException("Cette session a déjà été remboursée");
    }
    if (settled.status === CareSessionStatus.ENDED) {
      throw new ConflictException(
        "Session terminée — l'annulation n'est plus possible (le remboursement automatique D-008 s'applique si le professionnel n'a jamais répondu ; sinon, ouvrez un signalement)",
      );
    }

    // L'annulation d'une session ACTIVE n'est ouverte qu'après 5 min d'attente sans réponse du soignant
    // (laisse au soignant un délai de grâce). En PREPARING (avant démarrage du décompteur), l'annulation reste libre.
    const MIN_OPEN_MS = 5 * 60 * 1000;
    if (
      settled.status === CareSessionStatus.ACTIVE &&
      (!settled.startedAt || Date.now() - settled.startedAt.getTime() < MIN_OPEN_MS)
    ) {
      throw new ConflictException(
        "Annulation possible après 5 minutes de session ouverte sans réponse du soignant (EF-06-10)",
      );
    }

    const now = new Date();
    try {
      await this.prisma.$transaction(
        async (tx) => {
          // EF-06-10 : autorisée UNIQUEMENT avant le premier message du professionnel —
          // vérifié DANS une transaction Serializable (anti-course avec sendMessage, D-046).
          const professionalMessages = await tx.sessionMessage.count({
            where: { sessionId, senderId: settled.professionalId },
          });
          if (professionalMessages > 0) {
            throw new ConflictException(
              "Le professionnel a déjà répondu — pas d'annulation unilatérale après échange : ouvrez un signalement (M04) ou contactez le support (EF-06-10)",
            );
          }
          const { count } = await tx.careSession.updateMany({
            where: { id: sessionId, status: { in: [CareSessionStatus.PREPARING, CareSessionStatus.ACTIVE] } },
            data: { status: CareSessionStatus.REFUNDED, endedAt: now },
          });
          if (count === 0) throw new ConflictException("La session a changé d'état entre-temps — réessayez");
          await tx.sessionRecordAccess.updateMany({
            where: { sessionId, closedAt: null },
            data: { closedAt: now },
          });
          // Annulation patient ≠ incident D-008 : on n'émet PAS m06.session.refunded
          // (l'indicateur M05 ne compte que les silences du professionnel, EF-06-09).
          await this.outbox.emit(tx, {
            type: "notify.request",
            payload: { accountId: settled.professionalId, template: "m06.session.cancelled", sessionId },
          });
          await this.audit.emit(tx, {
            actorId: actor.accountId,
            actorType: "patient",
            action: "m06.session.cancelled",
            resource: `session:${sessionId}`,
            context: { fromStatus: settled.status },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      throw this.translateSerializationConflict(err);
    }

    // HORS transaction (réseau) : remboursement intégral C1, idempotent (RM-13-04).
    // Le patient est notifié par M13 (« m13.refund », critique). En cas d'échec ici, la
    // session est déjà REFUNDED côté M06 : trace d'audit + réconciliation M13 (EF-13-09).
    try {
      await this.payments.refund(settled.orderRef, "Annulation par le patient avant toute réponse du professionnel (EF-06-10)");
    } catch (err) {
      this.logger.error(`Ordre de remboursement en échec pour la session ${sessionId}: ${(err as Error).message}`);
      await this.audit.emit(this.prisma, {
        actorType: "system",
        action: "m06.refund.order_failed",
        resource: `session:${sessionId}`,
        context: { orderRef: settled.orderRef, stage: "cancel" },
      });
    }
    return this.getSession(actor, sessionId);
  }

  // ── EF-06-11 : notation (PM-13, D-021) ───────────────────────────────────────

  async rate(actor: AuthenticatedActor, sessionId: string, dto: RateSessionDto): Promise<{ sessionId: string; score: number; comment: string | null }> {
    const session = await this.loadForParticipant(actor, sessionId);
    if (session.patientAccountId !== actor.accountId) {
      throw new ForbiddenException("Seul le patient note la session (EF-06-11)");
    }
    const settled = await this.settle(session);
    if (settled.status !== CareSessionStatus.ENDED) {
      if (settled.status === CareSessionStatus.REFUNDED) {
        throw new ConflictException("Session remboursée — elle ne se note pas (l'incident est déjà compté, EF-06-09)");
      }
      throw new ConflictException("La session ne se note qu'après sa clôture (EF-06-11)");
    }
    const bounds = await this.params.getIntList("PM-13");
    if (!ratingValid(dto.score, bounds)) {
      throw new BadRequestException(`Note invalide : entier entre ${bounds[0]} et ${bounds[1]} attendu (PM-13)`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.sessionRating.create({
          data: { sessionId, patientId: actor.accountId, score: dto.score, comment: dto.comment ?? null },
        });
        // → indicateurs M05 (note moyenne, EF-05-01).
        await this.outbox.emit(tx, {
          type: "m06.session.rated",
          payload: { professionalId: settled.professionalId, score: dto.score },
        });
        await this.audit.emit(tx, {
          actorId: actor.accountId,
          actorType: "patient",
          action: "m06.session.rated",
          resource: `session:${sessionId}`,
          context: { score: dto.score }, // jamais le commentaire (RM-04-03)
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("Cette session a déjà été notée — une seule notation par session (EF-06-11)");
      }
      throw err;
    }
    return { sessionId, score: dto.score, comment: dto.comment ?? null };
  }

  // ── Balayages publics (cadencés par M16/cron plus tard — AUCUN poller ici) ───

  /**
   * EF-06-04 : démarre les sessions PREPARING dont l'échéance PM-28 est passée.
   * Le mode paresseux couvre déjà toute lecture/écriture ; ce balayage garantit le
   * démarrage (et donc la fin, et donc D-008) même si PERSONNE ne lit la session.
   */
  async sweepOverduePreparing(now: Date = new Date()): Promise<{ started: number }> {
    const pm28S = await this.params.getInt("PM-28");
    const stale = await this.prisma.careSession.findMany({
      where: { status: CareSessionStatus.PREPARING, paidAt: { lte: new Date(now.getTime() - pm28S * 1000) } },
      take: 200,
    });
    let started = 0;
    for (const session of stale) {
      const after = await this.settle(session);
      if (after.status !== CareSessionStatus.PREPARING) started += 1;
    }
    return { started };
  }

  /**
   * EF-06-08/09 : clôt les sessions ACTIVE échues et applique D-008 (remboursement < 1 min
   * après la clôture fautive — c'est CE balayage, cadencé par M16, qui tient la promesse
   * CU-06-04 quand personne ne lit la session). Rattrape aussi les ENDED dont le
   * remboursement D-008 aurait échoué (auto-réparation, voir settle §3).
   */
  async sweepElapsedActive(now: Date = new Date()): Promise<{ settled: number }> {
    // Fenêtre de rattrapage des ENDED : PM-30 (l'horizon opérationnel d'après-session) —
    // au-delà, seul le chemin paresseux (lecture) rejouerait un D-008 resté en échec.
    const pm30S = await this.params.getInt("PM-30");
    const stale = await this.prisma.careSession.findMany({
      where: {
        OR: [
          { status: CareSessionStatus.ACTIVE, endsAt: { lte: now } },
          { status: CareSessionStatus.ENDED, endedAt: { gte: new Date(now.getTime() - pm30S * 1000) } },
        ],
      },
      take: 200,
    });
    for (const session of stale) await this.settle(session);
    return { settled: stale.length };
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  /** `endedAt` + PM-30 — voir `SessionView.reportDueAt`. `null` tant que la session n'est pas close. */
  private reportDueAt(endedAt: Date | null, pm30S: number): string | null {
    return endedAt === null ? null : new Date(endedAt.getTime() + pm30S * 1000).toISOString();
  }

  private statusLabel(status: CareSessionStatus): string {
    switch (status) {
      case CareSessionStatus.PREPARING:
        return "en préparation (transmettez d'abord la pré-consultation)";
      case CareSessionStatus.ENDED:
        return "terminée (lecture seule)";
      case CareSessionStatus.REFUNDED:
        return "remboursée";
      default:
        return "active";
    }
  }

  /** P2034 = conflit de sérialisation (deux écritures simultanées) → 409 propre. */
  private translateSerializationConflict(err: unknown): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return new ConflictException("Opération simultanée sur la session — réessayez");
    }
    return err;
  }

  /** Aperçu court d'un message cité (jamais de contenu médical détaillé, RM-06-06). */
  private replyPreview(m: SessionMessage): string {
    if (m.kind === "PHOTO") return "📷 Photo";
    if (m.kind === "VOICE") return "🎤 Note vocale";
    if (m.kind === "DOCUMENT") return "📎 Document";
    return (decryptBody(m.body) ?? "").slice(0, 120);
  }

  private toMessageView(
    message: MessageRow,
    opts?: { session?: CareSession; viewerId?: string; replyTo?: SessionMessage | null },
  ): MessageView {
    const deleted = !!message.deletedAt;
    // Accusé pour les messages ENVOYÉS par le lecteur : on lit le curseur de l'AUTRE participant.
    let status: MessageView["status"] = null;
    if (opts?.session && opts.viewerId && message.senderId === opts.viewerId && !deleted) {
      const otherReadAt =
        message.senderId === opts.session.patientAccountId ? opts.session.professionalLastReadAt : opts.session.patientLastReadAt;
      if (otherReadAt && otherReadAt.getTime() >= message.createdAt.getTime()) status = "read";
      else if (otherReadAt) status = "delivered";
      else status = "sent";
    }
    const replyTo = opts?.replyTo && !opts.replyTo.deletedAt ? opts.replyTo : null;
    // Agrège les réactions actives par emoji (un tombstone n'affiche plus ses réactions — rien à montrer).
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    if (!deleted) {
      for (const r of message.reactions ?? []) {
        const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
        cur.count += 1;
        if (opts?.viewerId && r.accountId === opts.viewerId) cur.mine = true;
        byEmoji.set(r.emoji, cur);
      }
    }
    const reactions = Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
    return {
      id: message.id,
      sessionId: message.sessionId,
      senderId: message.senderId,
      kind: message.kind,
      body: deleted ? null : decryptBody(message.body),
      fileKey: deleted ? null : message.fileKey,
      mediaKeys: deleted ? [] : message.mediaKeys,
      clientMsgId: message.clientMsgId,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt ? message.editedAt.toISOString() : null,
      deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
      replyTo: replyTo ? { id: replyTo.id, senderId: replyTo.senderId, kind: replyTo.kind, preview: this.replyPreview(replyTo) } : null,
      status,
      reactions,
    };
  }
}

/**
 * M06 — routes Poignée de main & Session (toutes authentifiées : AuthGuard global).
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * Répartition des rôles (vérifiée dans les services, au plus près des données) :
 * - PATIENT : initier, payer, pré-consultation, annuler, noter ;
 * - PROFESSIONNEL destinataire : confirmer, refuser, prolonger, compte-rendu, Carnet ;
 * - PARTICIPANTS : messages, état de la session (404 pour tout tiers — pas de fuite).
 * Les routes « mine » précèdent « :id » (ordre de résolution NestJS).
 */
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import {
  DeleteMessageDto,
  DepositReportDto,
  EditMessageDto,
  ExtendSessionDto,
  InitiateHandshakeDto,
  ListMessagesQueryDto,
  PayHandshakeDto,
  RateSessionDto,
  ReactToMessageDto,
  RefuseHandshakeDto,
  SendMessageDto,
  SessionRecordQueryDto,
  SubmitPreConsultationDto,
  UploadSessionMediaDto,
} from "./m06.dto";
import { HandshakeService } from "./m06.handshake.service";
import { RecordAccessService } from "./m06.record-access.service";
import { ReportService } from "./m06.report.service";
import { SessionService } from "./m06.session.service";

@Controller("v1")
export class M06Controller {
  constructor(
    private readonly handshakes: HandshakeService,
    private readonly sessions: SessionService,
    private readonly reports: ReportService,
    private readonly recordAccess: RecordAccessService,
  ) {}

  // ── Poignée de main (EF-06-01/02/03 ; CU-06-01) ──────────────────────────────

  /** Initiation depuis une offre active (PATIENT) — notification pro < 5 s (ENF-09). */
  @Post("handshakes")
  initiate(@Actor() actor: AuthenticatedActor, @Body() dto: InitiateHandshakeDto) {
    return this.handshakes.initiate(actor, dto);
  }

  /** Mes poignées de main (patient OU professionnel) — l'expiration PM-07 s'applique à la lecture. */
  @Get("handshakes/mine")
  listMyHandshakes(@Actor() actor: AuthenticatedActor) {
    return this.handshakes.listMine(actor);
  }

  /** État + compte à rebours PM-07 calculé SERVEUR (CU-06-01, RM-06-02). */
  @Get("handshakes/:handshakeId")
  getHandshake(@Actor() actor: AuthenticatedActor, @Param("handshakeId") handshakeId: string) {
    return this.handshakes.getOne(actor, handshakeId);
  }

  /** « Je suis prêt à recevoir » (PRO destinataire) — ouvre la fenêtre de paiement PM-07. */
  @Post("handshakes/:handshakeId/confirm")
  @HttpCode(200)
  confirm(@Actor() actor: AuthenticatedActor, @Param("handshakeId") handshakeId: string) {
    return this.handshakes.confirm(actor, handshakeId);
  }

  /** Refus avec motif court (PRO destinataire) — affiché au patient (CU-06-01). */
  @Post("handshakes/:handshakeId/refuse")
  @HttpCode(200)
  refuse(@Actor() actor: AuthenticatedActor, @Param("handshakeId") handshakeId: string, @Body() dto: RefuseHandshakeDto) {
    return this.handshakes.refuse(actor, handshakeId, dto);
  }

  /** Paiement (PATIENT) — uniquement CONFIRMED dans sa fenêtre (RM-06-01) ; l'issue vient du webhook M13. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("handshakes/:handshakeId/pay")
  @HttpCode(200)
  pay(@Actor() actor: AuthenticatedActor, @Param("handshakeId") handshakeId: string, @Body() dto: PayHandshakeDto) {
    return this.handshakes.pay(actor, handshakeId, dto);
  }

  /** Annulation de la demande par le PATIENT, tant que le soignant n'a pas confirmé (INITIATED → ABANDONED). */
  @Post("handshakes/:handshakeId/abandon")
  @HttpCode(200)
  abandon(@Actor() actor: AuthenticatedActor, @Param("handshakeId") handshakeId: string) {
    return this.handshakes.abandon(actor, handshakeId);
  }

  // ── Session (EF-06-04 → EF-06-11 ; CU-06-02/03/04) ──────────────────────────

  /** Mes sessions (patient OU professionnel) — transitions paresseuses appliquées. */
  @Get("care-sessions/mine")
  listMySessions(@Actor() actor: AuthenticatedActor) {
    return this.sessions.listMine(actor);
  }

  /** État + décompteur (endsAt, remainingSeconds calculés SERVEUR — RM-06-02). */
  @Get("care-sessions/:sessionId")
  getSession(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string) {
    return this.sessions.getSession(actor, sessionId);
  }

  /** Pré-consultation (PATIENT, session PREPARING) — sa transmission DÉMARRE le décompteur (D-019). */
  @Post("care-sessions/:sessionId/pre-consultation")
  preConsultation(
    @Actor() actor: AuthenticatedActor,
    @Param("sessionId") sessionId: string,
    @Body() dto: SubmitPreConsultationDto,
  ) {
    return this.sessions.submitPreConsultation(actor, sessionId, dto);
  }

  /** Téléversement d'un média (photo / note vocale) → fileKey, puis envoyer un message kind PHOTO/VOICE. */
  @Post("care-sessions/:sessionId/media")
  uploadMedia(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string, @Body() dto: UploadSessionMediaDto) {
    return this.sessions.uploadMedia(actor, sessionId, dto.fileBase64, dto.mime);
  }

  /** Message (participants, session ACTIVE) — clientMsgId : rejeu hors ligne sans doublon (ADR-12). */
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post("care-sessions/:sessionId/messages")
  sendMessage(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string, @Body() dto: SendMessageDto) {
    return this.sessions.sendMessage(actor, sessionId, dto);
  }

  /** Fil de la session, paginé — lecture seule après clôture (CU-06-03). */
  @Get("care-sessions/:sessionId/messages")
  listMessages(
    @Actor() actor: AuthenticatedActor,
    @Param("sessionId") sessionId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.sessions.listMessages(actor, sessionId, query);
  }

  /** Édition d'un message texte (auteur, ≤ 15 min). */
  @Patch("care-sessions/:sessionId/messages/:messageId")
  editMessage(
    @Actor() actor: AuthenticatedActor,
    @Param("sessionId") sessionId: string,
    @Param("messageId") messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.sessions.editMessage(actor, sessionId, messageId, dto.body);
  }

  /** Suppression « pour moi » (toujours) ou « pour tout le monde » (auteur, ≤ 15 min). */
  @Post("care-sessions/:sessionId/messages/:messageId/delete")
  @HttpCode(200)
  deleteMessage(
    @Actor() actor: AuthenticatedActor,
    @Param("sessionId") sessionId: string,
    @Param("messageId") messageId: string,
    @Body() dto: DeleteMessageDto,
  ) {
    return this.sessions.deleteMessage(actor, sessionId, messageId, dto.forEveryone);
  }

  /** Bascule une réaction emoji (1 par participant/message, façon WhatsApp). */
  @Post("care-sessions/:sessionId/messages/:messageId/reactions")
  @HttpCode(200)
  reactToMessage(
    @Actor() actor: AuthenticatedActor,
    @Param("sessionId") sessionId: string,
    @Param("messageId") messageId: string,
    @Body() dto: ReactToMessageDto,
  ) {
    return this.sessions.reactToMessage(actor, sessionId, messageId, dto.emoji);
  }

  /** Signal « en train d'écrire » (éphémère, TTL ~6s, lu par le polling existant de getSession). */
  @Post("care-sessions/:sessionId/typing")
  @HttpCode(204)
  setTyping(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string) {
    return this.sessions.setTyping(actor, sessionId);
  }

  /** Prolongation gratuite (PRO, session ACTIVE) — cumul plafonné PM-29 (D-016). */
  @Post("care-sessions/:sessionId/extend")
  @HttpCode(200)
  extend(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string, @Body() dto: ExtendSessionDto) {
    return this.sessions.extend(actor, sessionId, dto);
  }

  /** Compte-rendu (PRO, pendant la session ou ≤ PM-30 après) — déclenche le crédit des gains (RM-06-04). */
  @Post("care-sessions/:sessionId/report")
  depositReport(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string, @Body() dto: DepositReportDto) {
    return this.reports.depositReport(actor, sessionId, dto);
  }

  /** Annulation (PATIENT) — possible tant que le professionnel n'a JAMAIS répondu (EF-06-10). */
  @Post("care-sessions/:sessionId/cancel")
  @HttpCode(200)
  cancel(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string) {
    return this.sessions.cancel(actor, sessionId);
  }

  /** Notation 1..max PM-13 (PATIENT, session terminée) — une seule fois (EF-06-11). */
  @Post("care-sessions/:sessionId/rating")
  rate(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string, @Body() dto: RateSessionDto) {
    return this.sessions.rate(actor, sessionId, dto);
  }

  // ── Carnet en session (EF-06-06 ; RM-06-05) — PRO, session ACTIVE, tracé C5 ──

  /** Fiche synthèse du Carnet (groupe sanguin, allergies actives, maladies chroniques). */
  @Get("care-sessions/:sessionId/record/summary")
  recordSummary(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string) {
    return this.recordAccess.getSummary(actor, sessionId);
  }

  /** Chronologie complète du Carnet, filtrable par type, paginée (lecture seule). */
  @Get("care-sessions/:sessionId/record")
  record(
    @Actor() actor: AuthenticatedActor,
    @Param("sessionId") sessionId: string,
    @Query() query: SessionRecordQueryDto,
  ) {
    return this.recordAccess.getFullRecord(actor, sessionId, query);
  }
}

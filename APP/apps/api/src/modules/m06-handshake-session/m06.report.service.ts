/**
 * M06 — ReportService : le compte-rendu obligatoire (EF-06-08, D-021) et ses relances.
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * RM-06-04 (et C1 capture différée M13) : les gains de la session ne sont crédités
 * QU'AU dépôt du compte-rendu — « qualité avant trésorerie ».
 * C2 : le compte-rendu EST une entrée du Carnet (M07), écrite DANS la même transaction
 * que le dépôt — l'acte et sa mémoire réussissent ou échouent ensemble (ADR-11).
 */
import { ConflictException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { CareOfferKind, CareSessionStatus, RecordEntryType, RecordProvenance } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { HealthRecordWriterService } from "../m07-health-record/m07.writer.service";
import { PaymentsService } from "../m13-payments/m13.payments.service";
import { reminderDue, REPORT_REMINDER_OFFSETS_S, reportWindowOpen } from "./m06.policies";
import { DepositReportDto } from "./m06.dto";
import { SessionService } from "./m06.session.service";

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly writer: HealthRecordWriterService,
    private readonly payments: PaymentsService,
    private readonly sessions: SessionService,
  ) {}

  // ── EF-06-08 / CU-06-03 : dépôt du compte-rendu (D-021) ──────────────────────

  async depositReport(
    actor: AuthenticatedActor,
    sessionId: string,
    dto: DepositReportDto,
  ): Promise<{ sessionId: string; reportDepositedAt: string; entryId: string }> {
    const session = await this.sessions.loadForParticipant(actor, sessionId);
    if (session.professionalId !== actor.accountId) {
      throw new ForbiddenException("Seul le professionnel de la session rédige le compte-rendu");
    }
    const settled = await this.sessions.settle(session); // transitions paresseuses d'abord

    if (settled.status === CareSessionStatus.REFUNDED) {
      throw new ConflictException("Session remboursée — aucun compte-rendu n'est attendu");
    }
    if (settled.status === CareSessionStatus.PREPARING) {
      throw new ConflictException("La session n'a pas encore commencé — le compte-rendu se rédige pendant ou après la session");
    }
    const pm30S = await this.params.getInt("PM-30");
    const now = new Date();

    /*
      ── Hors délai : ACCEPTÉ, mais sans crédit (chantier 89, 11/09/2026) ────────────────────────

      Jusqu'ici, passé PM-30, ce dépôt était **refusé définitivement** — par le professionnel comme
      par quiconque : aucune route d'administration ne permettait de forcer.

      Deux choses étaient perdues d'un coup, et une seule avait été décidée :

        · les GAINS étaient gelés — c'est la sanction voulue par CU-06-03 ;
        · le CARNET du patient ne recevait jamais le compte-rendu — **personne n'a décidé cela.**

      Une consultation avait eu lieu, le patient avait payé, et la trace clinique manquait pour
      toujours. *Une sanction qui vise l'argent ne doit pas emporter le dossier de santé d'un
      tiers* — le patient n'a rien fait, et c'est lui qui perdait.

      Décision du porteur, 11/09 : **séparer les deux.** Le dépôt passe, le crédit non.

      ⚠️ Ce n'est PAS un assouplissement de CU-06-03 : les gains restent gelés exactement comme
      avant, parce que c'est `capture()` qui crédite et qu'on ne l'appelle plus. La sanction est
      entière ; seul le dossier du patient est sauvé.
    */
    const horsDelai =
      settled.status === CareSessionStatus.ENDED && !reportWindowOpen(settled.endedAt, pm30S, now.getTime());

    let entryId = "";
    await this.prisma.$transaction(async (tx) => {
      // Dépôt UNIQUE : conditionnel sur reportDepositedAt null (anti-TOCTOU, D-046).
      const { count } = await tx.careSession.updateMany({
        where: { id: sessionId, reportDepositedAt: null, status: { in: [CareSessionStatus.ACTIVE, CareSessionStatus.ENDED] } },
        data: { reportDepositedAt: now },
      });
      if (count === 0) {
        throw new ConflictException("Un compte-rendu a déjà été déposé pour cette session");
      }
      // C2 : Entrée au Carnet — propriétaire = patient OU personne à charge (D-033),
      // provenance posée explicitement (RM-07-03), référence de l'acte "session:<id>".
      const entry = await this.writer.appendEntry(tx, {
        ...(settled.subProfileId ? { ownerSubProfileId: settled.subProfileId } : { ownerPatientId: settled.patientAccountId }),
        type: RecordEntryType.CONSULTATION_REPORT,
        provenance: RecordProvenance.RECORDED_BY_PROFESSIONAL,
        authorId: actor.accountId,
        sourceRef: `session:${sessionId}`,
        payload: { diagnosis: dto.diagnosis, recommendations: dto.recommendations },
      });
      entryId = entry.entryId;
      // CU-06-03 : patient notifié et invité à noter — JAMAIS le contenu médical (RM-06-06).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: settled.patientAccountId, template: "m06.report.deposited", sessionId },
      });
      // EF-06-12 / CU-06-05 : proposition de suivi si le professionnel a une offre FOLLOW_UP
      // active — simple lien notifié, même mécanique complète ensuite (poignée incluse).
      const followUp = await tx.careOffer.findFirst({
        where: { professionalId: settled.professionalId, kind: CareOfferKind.FOLLOW_UP, active: true },
        orderBy: { createdAt: "desc" },
      });
      if (followUp) {
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: {
            accountId: settled.patientAccountId,
            template: "m06.followup.offered",
            offerId: followUp.id,
            professionalId: settled.professionalId,
            sessionId,
          },
        });
      }
      // C5 dans la transaction — l'identifiant d'entrée, JAMAIS le diagnostic (RM-04-03).
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m06.report.deposited",
        resource: `session:${sessionId}`,
        context: { entryId },
      });
    });

    /*
      ⚠️ **Hors délai : on ne crédite PAS.** C'est ici, et nulle part ailleurs, que le gel des gains
      prend effet — il n'existe aucun drapeau « gelé » en base. Les gains étaient gelés parce que le
      dépôt n'avait jamais lieu ; ils le restent maintenant parce que le dépôt N'APPELLE PAS la
      capture. *Le même effet, obtenu sans confisquer le dossier du patient.*

      Le dépôt tardif est tracé et l'administration prévenue : un compte-rendu qui arrive après
      l'échéance n'est pas un dépôt ordinaire, et l'équipe doit pouvoir trancher le sort de l'argent
      en connaissance de cause — c'est elle qui a été alertée du retard.
    */
    if (horsDelai) {
      await this.audit.emit(this.prisma, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m06.report.deposited_late",
        resource: `session:${sessionId}`,
        context: { entryId, pm30S },
      });
      const admins = await this.prisma.adminRoleAssignment.findMany({ where: { role: "SUPER_ADMIN" } });
      for (const admin of admins) {
        await this.outbox.emit(this.prisma, {
          type: "notify.request",
          payload: {
            accountId: admin.accountId,
            template: "m06.report.deposited_late.admin",
            sessionId,
            professionalId: settled.professionalId,
          },
        });
      }
      return { sessionId, reportDepositedAt: now.toISOString(), entryId };
    }

    // HORS transaction (C1, réseau/transactions propres à M13) : ordre de crédit —
    // capture() est IDEMPOTENTE (RM-13-04). En cas d'échec ici, le compte-rendu est
    // déposé et tracé : la part reste « en attente » côté M13, rattrapée par la
    // réconciliation (EF-13-09) / le support — on ne perd jamais le compte-rendu pour
    // un incident de crédit (qualité d'abord, RM-06-04).
    try {
      await this.payments.capture(settled.orderRef);
    } catch (err) {
      this.logger.error(`Capture des gains en échec pour la session ${sessionId}: ${(err as Error).message}`);
      await this.audit.emit(this.prisma, {
        actorType: "system",
        action: "m06.capture.order_failed",
        resource: `session:${sessionId}`,
        context: { orderRef: settled.orderRef },
      });
    }
    return { sessionId, reportDepositedAt: now.toISOString(), entryId };
  }

  // ── EF-06-08 : relances 12 h / 23 h + alerte PM-30 (CU-06-03) ────────────────

  /**
   * Méthode PUBLIQUE volontairement non câblée à un poller : M16/cron l'appellera
   * (un seul drain par processus — M04). DÉDUPLICATION PAR CADENCEMENT (documenté) :
   * il n'existe pas de table de relances — chaque échéance (fin + 12 h, fin + 23 h,
   * fin + PM-30) n'est émise que si elle tombe dans la fenêtre (now − windowS, now].
   * Le cron DOIT donc être cadencé exactement à `windowS` (défaut : 3600 s, horaire) :
   * plus lent, des relances seraient manquées ; plus rapide, elles partiraient en double.
   */
  async remindMissingReports(now: Date = new Date(), windowS = 3600): Promise<{ reminders: number; frozen: number }> {
    const pm30S = await this.params.getInt("PM-30");
    // Périmètre : sessions terminées (non remboursées) sans compte-rendu, dont la fin est
    // assez récente pour qu'une échéance puisse tomber dans la fenêtre de balayage.
    const horizonS = pm30S + windowS;
    const candidates = await this.prisma.careSession.findMany({
      where: {
        status: CareSessionStatus.ENDED,
        reportDepositedAt: null,
        endedAt: { not: null, gte: new Date(now.getTime() - horizonS * 1000) },
      },
      take: 500,
    });

    let reminders = 0;
    let frozen = 0;
    for (const session of candidates) {
      const endedAtMs = (session.endedAt as Date).getTime();
      // Relances au professionnel (EF-06-08 : 12 h et 23 h — chiffres de spec).
      for (const offsetS of REPORT_REMINDER_OFFSETS_S) {
        if (reminderDue(endedAtMs, offsetS, windowS, now.getTime())) {
          const hoursLeft = Math.max(0, Math.floor((endedAtMs + pm30S * 1000 - now.getTime()) / 3_600_000));
          await this.outbox.emit(this.prisma, {
            type: "notify.request",
            payload: { accountId: session.professionalId, template: "m06.report.reminder", priority: "critical", sessionId: session.id, hoursLeft },
          });
          reminders += 1;
        }
      }
      // CU-06-03 : PM-30 franchi sans compte-rendu → gains gelés, alerte au professionnel
      // ET à l'Équipe ULAMU (récidive = sanction M16, hors périmètre ici).
      if (reminderDue(endedAtMs, pm30S, windowS, now.getTime())) {
        frozen += 1;
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.emit(tx, {
            type: "notify.request",
            payload: { accountId: session.professionalId, template: "m06.report.overdue", priority: "critical", sessionId: session.id },
          });
          const admins = await tx.adminRoleAssignment.findMany({ where: { role: "SUPER_ADMIN" } });
          for (const admin of admins) {
            await this.outbox.emit(tx, {
              type: "notify.request",
              payload: { accountId: admin.accountId, template: "m06.report.overdue.admin", priority: "critical", sessionId: session.id, professionalId: session.professionalId },
            });
          }
          await this.audit.emit(tx, {
            actorType: "system",
            action: "m06.report.overdue",
            resource: `session:${session.id}`,
            context: { professionalId: session.professionalId, pm30S },
          });
        });
      }
    }
    return { reminders, frozen };
  }
}

/**
 * M06 — RecordAccessService : lecture du Carnet PENDANT la session (EF-06-06, RM-06-05).
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * - LECTURE SEULE, par le professionnel de la session, sur session ACTIVE uniquement —
 *   toute écriture passe par compte-rendu / ordonnance / examens (C2) ;
 * - « ouvert à l'activation, refermé à la clôture » : SessionRecordAccess (openedAt) est
 *   créé au premier accès ; closedAt est posé par la clôture/annulation (SessionService) ;
 * - chaque consultation est tracée C5 (« m06.record.accessed ») — SANS contenu médical
 *   (RM-04-03) : seuls la vue et le filtre de type sont journalisés ;
 * - le contenu lui-même est servi par M07 (HealthRecordReaderService, C2).
 */
import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { CareSession, CareSessionStatus, RecordEntryType } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { PrismaService } from "../../common/prisma.service";
import { FullRecordPage, HealthRecordReaderService } from "../m07-health-record/m07.reader.service";
import { HealthSummary } from "../m07-health-record/m07.policies";
import { SessionRecordQueryDto } from "./m06.dto";
import { SessionService } from "./m06.session.service";

@Injectable()
export class RecordAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditEmitter,
    private readonly reader: HealthRecordReaderService,
    private readonly sessions: SessionService,
  ) {}

  /** Fiche synthèse du Carnet du patient (ou de la personne à charge) de la session. */
  async getSummary(actor: AuthenticatedActor, sessionId: string): Promise<HealthSummary> {
    const session = await this.openAccess(actor, sessionId, "summary", undefined);
    return this.reader.getSummary(this.ownerOf(session));
  }

  /** Chronologie complète, filtrable par type, paginée — déléguée à M07 (C2). */
  async getFullRecord(actor: AuthenticatedActor, sessionId: string, query: SessionRecordQueryDto): Promise<FullRecordPage> {
    const session = await this.openAccess(actor, sessionId, "full", query.type);
    return this.reader.getFullRecord(this.ownerOf(session), { type: query.type, cursor: query.cursor });
  }

  // ── Garde commune : session ACTIVE + trace C5 + ouverture de l'accès ─────────

  private async openAccess(
    actor: AuthenticatedActor,
    sessionId: string,
    view: "summary" | "full",
    type: RecordEntryType | undefined,
  ): Promise<CareSession> {
    const session = await this.sessions.loadForParticipant(actor, sessionId);
    if (session.professionalId !== actor.accountId) {
      throw new ForbiddenException("Le Carnet en session n'est lisible que par le professionnel (EF-06-06)");
    }
    // Transitions paresseuses d'abord : une session échue se referme AVANT toute lecture.
    const settled = await this.sessions.settle(session);
    if (settled.status !== CareSessionStatus.ACTIVE) {
      throw new ConflictException(
        "L'accès au Carnet n'est ouvert que pendant la session active — il se referme à la clôture (EF-06-06, RM-06-05)",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      // openedAt au PREMIER accès ; les lectures suivantes vivent sous le même accès ouvert.
      const open = await tx.sessionRecordAccess.findFirst({ where: { sessionId, closedAt: null }, select: { id: true } });
      if (!open) await tx.sessionRecordAccess.create({ data: { sessionId } });
      // C5 : chaque consultation tracée — vue et filtre seulement, JAMAIS le contenu lu (RM-04-03).
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m06.record.accessed",
        resource: `session:${sessionId}`,
        context: { view, ...(type ? { type } : {}) },
      });
    });
    return settled;
  }

  /** Propriétaire du Carnet lu : la personne à charge si la session est « pour » elle (D-033). */
  private ownerOf(session: CareSession): { patientId?: string; subProfileId?: string } {
    return session.subProfileId ? { subProfileId: session.subProfileId } : { patientId: session.patientAccountId };
  }
}

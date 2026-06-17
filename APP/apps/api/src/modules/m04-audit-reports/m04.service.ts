/**
 * M04 — Audit & Signalements : consultation du journal et file de modération.
 * Spec : docs/cahier_des_charges/02_modules/M04_audit_signalements.md
 * Invariants : journal en écriture seule (RM-04-01) ; consulter le journal est un acte
 * audité (RM-04-02, EF-04-04) ; jamais de contenu médical dans l'audit (RM-04-03) ;
 * le signaleur reste anonyme (RM-04-04, EF-04-07) ; décisions immuables (insertion seule).
 */
import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, ReportStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { AuditChainService, ChainVerificationResult } from "./m04.audit-chain.service";
import {
  auditActorType,
  clampAuditPageSize,
  isReportOverdue,
  mapDecisionToStatus,
  redactReportForAdmin,
  ReportDecision,
  ReportReasonCode,
  ReportTargetTypeCode,
} from "./m04.policies";

export interface AuditQueryFilters {
  actorId?: string;
  action?: string;
  resource?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Cloisonnement du journal par domaine (CU-04-02, matrice M02 §5) :
 * chaque sous-rôle ne voit que les actions de son périmètre ; SUPER_ADMIN voit tout.
 */
const AUDIT_DOMAIN_SCOPE: Record<string, string[] | null> = {
  SUPER_ADMIN: null, // accès complet
  ADMIN_VERIFICATION: ["m01.", "m02.", "m03.", "m04."],
  ADMIN_FINANCE: ["m13.", "m18.", "m19."],
  ADMIN_MAP: ["m11.", "m12."],
};

@Injectable()
export class M04Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly chain: AuditChainService,
  ) {}

  // ── Consultation du journal (EF-04-04 ; CU-04-02) ──────────────────────────

  /**
   * Recherche paginée par seq (descendant — du plus récent au plus ancien).
   * RM-04-02 : la consultation est ELLE-MÊME auditée, filtres en contexte.
   * BigInt (seq) sérialisé en string dans la réponse.
   */
  async queryAuditLog(
    adminId: string,
    q: AuditQueryFilters,
  ): Promise<{
    items: Array<{
      seq: string;
      actorId: string | null;
      actorType: string | null;
      action: string;
      resource: string | null;
      context: unknown;
      hash: string;
      createdAt: string;
    }>;
    nextCursor: string | null;
  }> {
    const pageSize = clampAuditPageSize(q.limit);
    const where = await this.buildScopedWhere(adminId, q);
    if (q.cursor) where.seq = { lt: BigInt(q.cursor) };

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.auditEvent.findMany({ where, orderBy: { seq: "desc" }, take: pageSize });
      // RM-04-02 / EF-04-04 : qui a consulté quoi — le contexte porte les filtres, pas les résultats.
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m04.audit.queried",
        resource: "auditLog",
        context: {
          actorId: q.actorId ?? null,
          action: q.action ?? null,
          from: q.from ?? null,
          to: q.to ?? null,
          cursor: q.cursor ?? null,
          limit: pageSize,
          resultCount: rows.length,
        },
      });
      const items = rows.map((r) => ({
        seq: r.seq.toString(), // BigInt → string (JSON)
        actorId: r.actorId,
        actorType: r.actorType,
        action: r.action,
        resource: r.resource,
        context: r.context as unknown,
        hash: r.hash,
        createdAt: r.createdAt.toISOString(),
      }));
      const nextCursor = rows.length === pageSize ? rows[rows.length - 1].seq.toString() : null;
      return { items, nextCursor };
    });
  }

  // ── Intégrité de la chaîne (EF-04-02) ──────────────────────────────────────

  /** Vérification à la demande (tout admin) — l'acte de vérifier est lui aussi audité (RM-04-02). */
  async checkIntegrity(adminId: string, fromSeq?: string, limit?: number): Promise<ChainVerificationResult> {
    const result = await this.chain.verifyChain(fromSeq === undefined ? undefined : BigInt(fromSeq), limit);
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m04.integrity.checked",
        resource: "auditLog",
        context: {
          ok: result.ok,
          checked: result.checked,
          brokenAtSeq: result.brokenAtSeq ?? null,
          fromSeq: fromSeq ?? null,
        },
      });
      if (!result.ok) await this.alertChainBroken(tx, result);
    });
    return result;
  }

  /** Balayage périodique automatique (EF-04-02) — appelé par le scheduler du module. */
  async runIntegritySweep(): Promise<ChainVerificationResult> {
    const result = await this.chain.verifyChain();
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m04.integrity.swept",
        resource: "auditLog",
        context: { ok: result.ok, checked: result.checked, brokenAtSeq: result.brokenAtSeq ?? null },
      });
      if (!result.ok) await this.alertChainBroken(tx, result);
    });
    if (!result.ok) {
      this.logger.error(`RUPTURE DE CHAÎNE D'AUDIT détectée au seq ${result.brokenAtSeq} — alerte critique émise (EF-04-02)`);
    }
    return result;
  }

  /** « Toute rupture de chaîne = alerte critique au Super Admin » (EF-04-02). */
  private async alertChainBroken(tx: Prisma.TransactionClient, result: ChainVerificationResult): Promise<void> {
    const superAdmins = await tx.adminRoleAssignment.findMany({ where: { role: "SUPER_ADMIN" } });
    for (const admin of superAdmins) {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: {
          accountId: admin.accountId,
          template: "m04.integrity.broken",
          priority: "critical",
          brokenAtSeq: result.brokenAtSeq ?? null,
        },
      });
    }
  }

  // ── Signalements (EF-04-05 ; CU-04-03) ─────────────────────────────────────

  /**
   * Tout acteur authentifié signale une cible — accusé de réception immédiat {reportId}.
   * RM-04-03 : ni le texte libre ni aucun contenu ne partent dans l'audit (motif codé seulement).
   */
  async createReport(
    actor: AuthenticatedActor,
    dto: { targetType: ReportTargetTypeCode; targetId: string; reasonCode: ReportReasonCode; reasonText?: string },
  ): Promise<{ reportId: string }> {
    return this.prisma.$transaction(async (tx) => {
      // La cible doit exister quand elle est vérifiable dès aujourd'hui (revue D-046) :
      // PROFILE → compte, FACILITY → structure ; SESSION_MESSAGE attend M06 (Chantier 3).
      if (dto.targetType === "PROFILE") {
        const target = await tx.account.findUnique({ where: { id: dto.targetId } });
        if (!target) throw new NotFoundException("Cible du signalement introuvable (compte)");
      }
      if (dto.targetType === "FACILITY") {
        const target = await tx.facility.findUnique({ where: { id: dto.targetId } });
        if (!target) throw new NotFoundException("Cible du signalement introuvable (structure)");
      }
      const report = await tx.userReport.create({
        data: {
          reporterId: actor.accountId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reasonCode: dto.reasonCode,
          reasonText: dto.reasonText ?? null,
          // statut OPEN par défaut (EF-04-05) — entre en file de modération (EF-04-06).
        },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: auditActorType(actor.accountType),
        action: "m04.report.created",
        resource: `report:${report.id}`,
        context: { targetType: dto.targetType, targetId: dto.targetId, reasonCode: dto.reasonCode },
      });
      return { reportId: report.id };
    });
  }

  // ── File de modération (EF-04-06 ; CU-04-04) ───────────────────────────────

  /**
   * File triée par ancienneté (CU-04-04), marquage isOverdue selon le délai cible PM-23.
   * RM-04-04 : l'identité du signaleur n'apparaît JAMAIS — redactReportForAdmin.
   */
  async listReports(status?: ReportStatus, limit?: number): Promise<{
    items: Array<{
      id: string;
      targetType: string;
      targetId: string;
      reasonCode: string;
      reasonText: string | null;
      status: ReportStatus;
      createdAt: string;
      isOverdue: boolean;
    }>;
  }> {
    const slaHours = await this.params.getInt("PM-23"); // délai cible de traitement (h)
    const rows = await this.prisma.userReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "asc" }, // ancienneté — les plus vieux d'abord
      take: clampAuditPageSize(limit), // file bornée
    });
    const nowMs = Date.now();
    // CU-04-04 : « ancienneté ET gravité du motif » — gravité d'abord, ancienneté ensuite.
    const weight = (code: string): number =>
      ({ HARASSMENT: 3, SUSPECTED_FAKE_PROFILE: 2, MISLEADING_INFORMATION: 2, INAPPROPRIATE_BEHAVIOR: 1, SPAM: 1, OTHER: 0 })[code] ?? 0;
    const finals: ReportStatus[] = ["DISMISSED", "ACTION_TAKEN"];
    return {
      items: rows
        .sort((a, b) => weight(b.reasonCode) - weight(a.reasonCode) || a.createdAt.getTime() - b.createdAt.getTime())
        .map((r) => ({
          ...redactReportForAdmin(r), // RM-04-04 : reporterId retiré
          createdAt: r.createdAt.toISOString(),
          // PM-23 — jamais de faux signal sur un dossier déjà traité.
          isOverdue: finals.includes(r.status) ? false : isReportOverdue(r.createdAt, nowMs, slaHours),
        })),
    };
  }

  /**
   * Décision motivée, horodatée, auditée (CU-04-04) — ModerationDecision en INSERTION SEULE.
   * Issues (EF-04-06) : DISMISSED → DISMISSED ; WARNING / ESCALATED_* → ACTION_TAKEN.
   * Le signaleur est notifié de l'issue SANS détail des sanctions (CU-04-03).
   */
  async decideReport(
    adminId: string,
    reportId: string,
    dto: { decision: ReportDecision; reasons: string },
  ): Promise<{ reportId: string; decisionId: string; status: ReportStatus }> {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.userReport.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundException("Signalement introuvable");
      if (report.status === "DISMISSED" || report.status === "ACTION_TAKEN") {
        throw new ConflictException("Signalement déjà traité — les décisions de modération sont immuables");
      }

      const status = mapDecisionToStatus(dto.decision);
      // Écriture conditionnelle (anti-TOCTOU) : deux admins ne décident pas le même signalement.
      const moved = await tx.userReport.updateMany({
        where: { id: reportId, status: { in: ["OPEN", "IN_REVIEW"] } },
        data: { status },
      });
      if (moved.count !== 1) {
        throw new ConflictException("Signalement déjà traité par un autre admin — rechargez la file");
      }
      const decision = await tx.moderationDecision.create({
        data: { reportId, decision: dto.decision, reasons: dto.reasons, adminId },
      });

      // EF-04-06 « avertir l'auteur » : l'avertissement atteint la cible quand elle est
      // adressable (PROFILE → compte ; FACILITY → titulaire actif). SESSION_MESSAGE attend M06.
      if (dto.decision === "WARNING") {
        let warnAccountId: string | null = null;
        if (report.targetType === "PROFILE") warnAccountId = report.targetId;
        if (report.targetType === "FACILITY") {
          const owner = await tx.facilityMember.findFirst({
            where: { facilityId: report.targetId, role: "OWNER", active: true },
          });
          warnAccountId = owner?.accountId ?? null;
        }
        if (warnAccountId) {
          await this.outbox.emit(tx, {
            type: "notify.request",
            payload: { accountId: warnAccountId, template: "m04.report.warning", reasonCode: report.reasonCode },
          });
        }
      }

      // Transmission de cas (EF-04-06, interfaces §7) : suspension → M16, révocation → M03.
      if (dto.decision === "ESCALATED_M16") {
        await this.outbox.emit(tx, {
          type: "m16.sanction.requested",
          payload: { reportId, targetType: report.targetType, targetId: report.targetId },
        });
      }
      if (dto.decision === "ESCALATED_M03") {
        await this.outbox.emit(tx, {
          type: "m03.revocation.requested",
          payload: { reportId, targetType: report.targetType, targetId: report.targetId },
        });
      }

      // Notification du signaleur (CU-04-03) : l'issue, jamais le détail des sanctions (C4/M14).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: report.reporterId, template: "m04.report.resolved", reportId, outcome: status },
      });

      // Audit C5 — RM-04-04 : pas d'identité du signaleur dans le contexte.
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m04.report.decided",
        resource: `report:${reportId}`,
        context: { decision: dto.decision, status, targetType: report.targetType, targetId: report.targetId },
      });

      return { reportId, decisionId: decision.id, status };
    });
  }

  // ── Export du journal (EF-04-04) ────────────────────────────────────────────

  /** Export CSV (max 5000 lignes), lui-même audité. L'export PDF est déclaré hors MVP (revue D-046). */
  async exportAuditCsv(adminId: string, q: AuditQueryFilters): Promise<string> {
    const where = await this.buildScopedWhere(adminId, q);
    const rows = await this.prisma.auditEvent.findMany({ where, orderBy: { seq: "asc" }, take: 5000 });
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m04.audit.exported",
        resource: "auditLog",
        context: { rowCount: rows.length, action: q.action ?? null, from: q.from ?? null, to: q.to ?? null },
      });
    });
    const esc = (v: string | null): string => (v === null ? "" : `"${v.replaceAll('"', '""')}"`);
    const header = "seq;createdAt;actorId;actorType;action;resource;hash";
    const lines = rows.map((r) =>
      [r.seq.toString(), r.createdAt.toISOString(), esc(r.actorId), esc(r.actorType), esc(r.action), esc(r.resource), r.hash].join(";"),
    );
    return [header, ...lines].join("\n");
  }

  // ── Aides internes ──────────────────────────────────────────────────────────

  private readonly logger = new Logger(M04Service.name);

  /** Construit le filtre du journal en appliquant le cloisonnement par sous-rôle (CU-04-02). */
  private async buildScopedWhere(adminId: string, q: AuditQueryFilters): Promise<Prisma.AuditEventWhereInput> {
    const assignment = await this.prisma.adminRoleAssignment.findUnique({ where: { accountId: adminId } });
    const prefixes = assignment ? AUDIT_DOMAIN_SCOPE[assignment.role] ?? [] : [];
    const where: Prisma.AuditEventWhereInput = {};
    if (prefixes !== null) {
      if (q.action) {
        if (!prefixes.some((p) => (q.action as string).startsWith(p))) {
          throw new ForbiddenException("Ce domaine du journal est hors de votre périmètre (matrice M02 §5)");
        }
      } else {
        where.OR = prefixes.map((p) => ({ action: { startsWith: p } }));
      }
    }
    if (q.actorId) where.actorId = q.actorId;
    if (q.action) where.action = q.action;
    if (q.resource) where.resource = q.resource;
    if (q.from || q.to) {
      where.createdAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    return where;
  }
}

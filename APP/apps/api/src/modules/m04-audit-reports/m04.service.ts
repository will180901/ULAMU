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
 * Contexte d'un signalement (chantier 60, 07/09/2026) — de QUI il s'agit, jamais de QUOI.
 *
 * ⚠️ Aucun de ces types ne porte le contenu d'un message : `SessionMessage.body` est chiffré au
 * repos (RM-06-06) et n'a pas à être déchiffré pour l'administration. Voir `getReportContext`.
 */
export interface MinimalAccount {
  accountId: string;
  phone: string;
  type: string;
  status: string;
  /** « Prénom Nom », ou « (compte sans profil) » — jamais une adresse, jamais un identifiant. */
  displayName: string;
}

export type ReportTarget =
  | { kind: "PROFILE"; found: true; account: MinimalAccount }
  | { kind: "PROFILE"; found: false }
  | {
      kind: "SESSION_MESSAGE";
      found: true;
      message: {
        messageId: string;
        sessionId: string;
        /** TEXT | PHOTO | VOICE — de quelle NATURE, jamais le contenu. */
        kind: string;
        createdAt: string;
        edited: boolean;
        deleted: boolean;
      };
      /** L'auteur du message : c'est sur lui que porte la décision. `null` si son compte a disparu. */
      author: MinimalAccount | null;
    }
  | { kind: "SESSION_MESSAGE"; found: false }
  | { kind: "FACILITY"; found: true; facility: { facilityId: string; name: string } }
  | { kind: "FACILITY"; found: false }
  | { kind: "UNKNOWN"; found: false };

export interface ReportContext {
  id: string;
  targetType: string;
  targetId: string;
  reasonCode: ReportReasonCode;
  reasonText: string | null;
  status: ReportStatus;
  createdAt: string;
  target: ReportTarget;
}

/**
 * Cloisonnement du journal par domaine (CU-04-02, matrice M02 §5) :
 * chaque sous-rôle ne voit que les actions de son périmètre ; SUPER_ADMIN voit tout.
 */
/**
 * Plafond de l'export CSV du journal (EF-04-04).
 *
 * Il valait 5000 en dur, au milieu d'une requête. Le nommer sert à deux choses : le retrouver, et
 * pouvoir dire au demandeur qu'on s'y est arrêté — voir `exportAuditCsv`, qui demande une ligne de
 * plus pour savoir s'il y avait une suite.
 */
const EXPORT_MAX_ROWS = 5000;

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

  // ── Contexte d'un signalement (chantier 60, 07/09/2026) ────────────────────

  /**
   * De QUI parle ce signalement — sans jamais dire de QUOI il parle.
   *
   * ── Le défaut ─────────────────────────────────────────────────────────────────────────────────
   *
   * `listReports` ne renvoie que `targetType` et `targetId`, et l'écran d'administration n'affiche
   * que les huit premiers caractères de l'identifiant. Pour un `PROFILE`, un administrateur pouvait
   * encore recouper à la main. Pour un `SESSION_MESSAGE`, il lisait « SESSION_MESSAGE · A3F91C2B »
   * — et **rien, nulle part, ne permettait de savoir qui avait écrit ce message.**
   *
   * ⚠️ Une file de modération dont les entrées ne s'instruisent pas est pire qu'une file vide :
   * elle fait croire à un recours. Le mobile vient d'ouvrir la porte d'entrée (chantier 59) ; la
   * file est encore vide (mesurée le 07/09), c'est le moment de l'outiller.
   *
   * ── Ce que cette route ne fera JAMAIS : servir le contenu du message ──────────────────────────
   *
   * Ma première recommandation au porteur disait « pour un message, son texte, son auteur et sa
   * session ». **Le texte était de trop, et c'était une erreur.**
   *
   * `SessionMessage.body` est **chiffré au repos** (`sealSecret`) et n'est déchiffré que pour les
   * participants de la session. RM-06-06 scelle le contenu de session précisément pour qu'il ne
   * soit pas lisible en passant ; RM-04-03 interdit déjà le contenu médical dans l'audit. Un
   * message de consultation peut parfaitement contenir les résultats d'analyse du patient — celui
   * qui ne signale rien, et qui n'a rien demandé.
   *
   * Alors on résout **l'auteur, jamais le contenu**. Cela suffit à instruire : le modérateur sait
   * QUI est visé, quand, dans quelle session, et il a déjà le récit du signaleur dans `reasonText`
   * — c'est à cela que sert ce champ. Ce qu'il décide ensuite porte sur la personne (avertir,
   * suspendre, transmettre à M03), jamais sur la phrase.
   *
   * *Ouvrir le contenu chiffré des consultations à l'administration serait une décision de produit,
   * pas un détail d'implémentation. Elle appartient au porteur, pas à cette route.*
   *
   * ── Le pouvoir sans trace n'existe pas (RM-16-03) ─────────────────────────────────────────────
   *
   * Résoudre une cible, c'est révéler une identité à un administrateur. L'acte est donc audité,
   * comme l'est déjà la consultation du journal (RM-04-02). Et l'audit ne porte ni le signaleur
   * (RM-04-04) ni la moindre bribe de contenu (RM-04-03).
   */
  async getReportContext(adminId: string, reportId: string): Promise<ReportContext> {
    const report = await this.prisma.userReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Signalement introuvable");

    const cible = await this.resolveTarget(report.targetType, report.targetId);

    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m04.report.context.viewed",
        resource: `report:${reportId}`,
        // Ni signaleur (RM-04-04), ni contenu (RM-04-03) : de quoi savoir QUI a regardé QUOI.
        context: { targetType: report.targetType, targetId: report.targetId, resolved: cible.found },
      });
    });

    return {
      // `redactReportForAdmin` retire `reporterId` — la même parade qu'à la file (RM-04-04).
      ...redactReportForAdmin({
        reporterId: report.reporterId,
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reasonCode: report.reasonCode as ReportReasonCode,
        reasonText: report.reasonText,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      }),
      target: cible,
    };
  }

  /**
   * Résout la cible en une identité minimale (RM-16-02), ou dit franchement qu'elle est introuvable.
   *
   * ⚠️ `found: false` n'est pas une erreur à cacher : un compte fermé, un message effacé, une
   * structure disparue arrivent. L'écran doit pouvoir dire « cette cible n'existe plus » plutôt que
   * d'afficher un vide qu'on prend pour un chargement — *une lecture qui échoue n'est ni un zéro ni
   * un « non »*.
   */
  private async resolveTarget(targetType: string, targetId: string): Promise<ReportTarget> {
    if (targetType === "PROFILE") {
      const compte = await this.minimalAccount(targetId);
      return compte ? { kind: "PROFILE", found: true, account: compte } : { kind: "PROFILE", found: false };
    }

    if (targetType === "SESSION_MESSAGE") {
      const message = await this.prisma.sessionMessage.findUnique({
        where: { id: targetId },
        // `body` n'est PAS sélectionné : il est chiffré, et il n'a rien à faire ici (RM-06-06).
        select: { id: true, sessionId: true, senderId: true, kind: true, createdAt: true, editedAt: true, deletedAt: true },
      });
      if (!message) return { kind: "SESSION_MESSAGE", found: false };
      return {
        kind: "SESSION_MESSAGE",
        found: true,
        message: {
          messageId: message.id,
          sessionId: message.sessionId,
          kind: message.kind,
          createdAt: message.createdAt.toISOString(),
          edited: message.editedAt !== null,
          deleted: message.deletedAt !== null,
        },
        // L'auteur du message : c'est LUI qui est visé, et c'est sur lui que porte la décision.
        author: await this.minimalAccount(message.senderId),
      };
    }

    if (targetType === "FACILITY") {
      /*
        Les structures sont sorties du produit (D-051) et aucun client n'offre plus de les signaler.
        Mais des lignes peuvent exister en base : les taire ferait disparaître un signalement de
        l'écran sans que personne ne sache pourquoi.
      */
      const facility = await this.prisma.facility.findUnique({ where: { id: targetId }, select: { id: true, name: true } });
      return facility
        ? { kind: "FACILITY", found: true, facility: { facilityId: facility.id, name: facility.name } }
        : { kind: "FACILITY", found: false };
    }

    return { kind: "UNKNOWN", found: false };
  }

  /** Identité minimale d'un compte pour l'administration (RM-16-02) — même forme qu'`AccountSearchHit`. */
  private async minimalAccount(accountId: string): Promise<MinimalAccount | null> {
    const a = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { patientProfile: true, professionalProfile: true, facilityMemberProfile: true },
    });
    if (!a) return null;
    const p = a.patientProfile ?? a.professionalProfile ?? a.facilityMemberProfile;
    return {
      accountId: a.id,
      phone: a.phone,
      type: a.type,
      status: a.status,
      displayName: p ? `${p.firstName} ${p.lastName}`.trim() : "(compte sans profil)",
    };
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
  /**
   * ── Le plafond ne doit pas être silencieux (écart E, 05/09/2026) ──────────────────────────
   *
   * L'export s'arrête à `EXPORT_MAX_ROWS` lignes. Il le faisait **sans le dire** : un
   * administrateur qui exportait un journal de 12 000 entrées recevait un fichier de 5 000 lignes
   * qui avait toutes les apparences d'un export complet — même en-tête, même format, aucune marque.
   *
   * Le service renvoie donc maintenant `truncated`, et le contrôleur le pose en en-tête de réponse.
   * **L'écran n'a ainsi aucun nombre à recopier** : une constante dupliquée dans le web dériverait
   * le jour où celle-ci change, et l'avertissement deviendrait faux dans un sens ou dans l'autre.
   *
   * *Un export incomplet qui se présente comme complet est pire qu'un export refusé.*
   */
  async exportAuditCsv(adminId: string, q: AuditQueryFilters): Promise<{ csv: string; rowCount: number; truncated: boolean }> {
    const where = await this.buildScopedWhere(adminId, q);
    // On demande UNE ligne de plus que le plafond : si elle revient, c'est qu'il y avait la suite.
    const rows = await this.prisma.auditEvent.findMany({ where, orderBy: { seq: "asc" }, take: EXPORT_MAX_ROWS + 1 });
    const truncated = rows.length > EXPORT_MAX_ROWS;
    if (truncated) rows.length = EXPORT_MAX_ROWS;
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m04.audit.exported",
        resource: "auditLog",
        // `truncated` au journal aussi : sinon on ne saurait pas, plus tard, que cet export
        // ne portait qu'une partie de la période demandée.
        context: { rowCount: rows.length, truncated, action: q.action ?? null, from: q.from ?? null, to: q.to ?? null },
      });
    });
    const esc = (v: string | null): string => (v === null ? "" : `"${v.replaceAll('"', '""')}"`);
    const header = "seq;createdAt;actorId;actorType;action;resource;hash";
    const lines = rows.map((r) =>
      [r.seq.toString(), r.createdAt.toISOString(), esc(r.actorId), esc(r.actorType), esc(r.action), esc(r.resource), r.hash].join(";"),
    );
    return { csv: [header, ...lines].join("\n"), rowCount: rows.length, truncated };
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

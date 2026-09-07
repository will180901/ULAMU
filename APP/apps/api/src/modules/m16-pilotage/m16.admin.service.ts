/**
 * M16 — back-office Équipe ULAMU (EF-16-03/06/07).
 *
 * Invariants barrière (pas politesse) :
 * - RM-16-01 : les SEULES écritures propres sont les SANCTIONS (AccountSanction + application
 *   sur Account.status / LoginSession). Tout autre effet passe par un service propriétaire
 *   (remboursement → M13 PaymentsService) ou reste une lecture.
 * - RM-16-02 : recherche & vues = données minimales, JAMAIS de médical.
 * - RM-16-03 : motif obligatoire + audit C5 sur chaque action.
 * - RM-16-04 / EF-16-07 : bannissement = double validation par deux admins DISTINCTS.
 * - D-046 : transitions par updateMany CONDITIONNEL + test du count (anti-TOCTOU).
 */
import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, SanctionStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { PrismaService } from "../../common/prisma.service";
import { PaymentsService } from "../m13-payments/m13.payments.service";
import { VerificationStatusService } from "../m03-verification-contracts/m03.status.service";
import { canSecondApproveBan } from "./m16.policies";

export interface AccountSearchHit {
  accountId: string;
  phone: string;
  type: string;
  status: string;
  displayName: string;
}

/**
 * Une demande de bannissement telle que l'administration doit la voir pour la trancher.
 *
 * ⚠️ Le NOM du compte visé et celui du demandeur, pas seulement leurs identifiants : approuver une
 * exclusion DÉFINITIVE en ne lisant qu'un uuid tronqué n'est pas une décision, c'est un clic.
 */
export interface SanctionListItem {
  sanctionId: string;
  accountId: string;
  accountName: string | null;
  accountStatus: string | null;
  reason: string;
  status: string;
  requestedBy: string;
  requestedByName: string | null;
  approvedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditEmitter,
    private readonly outbox: OutboxService,
    private readonly payments: PaymentsService,
    // Lecture seule du statut de vérification (C6) — disponible pour enrichir les vues admin.
    private readonly verification: VerificationStatusService,
    // Arbitrage des strikes : M16 DÉCIDE, M12 (propriétaire) APPLIQUE (RM-16-01).
  ) {}

  // ── EF-16-03 : recherche de comptes (RM-16-02 : données minimales) ───────────

  /**
   * Recherche par téléphone (contains) OU nom (patient/pro/membre, contains, insensible à la
   * casse). Retour STRICTEMENT minimal — aucune donnée médicale.
   */
  async searchAccounts(query: string): Promise<AccountSearchHit[]> {
    const q = query.trim();
    if (q.length === 0) return [];
    const like: Prisma.StringFilter = { contains: q, mode: "insensitive" };

    const accounts = await this.prisma.account.findMany({
      where: {
        OR: [
          { phone: { contains: q } },
          { patientProfile: { OR: [{ firstName: like }, { lastName: like }] } },
          { professionalProfile: { OR: [{ firstName: like }, { lastName: like }] } },
          { facilityMemberProfile: { OR: [{ firstName: like }, { lastName: like }] } },
        ],
      },
      include: { patientProfile: true, professionalProfile: true, facilityMemberProfile: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return accounts.map((a) => {
      const p = a.patientProfile ?? a.professionalProfile ?? a.facilityMemberProfile;
      const displayName = p ? `${p.firstName} ${p.lastName}`.trim() : "(compte sans profil)";
      return { accountId: a.id, phone: a.phone, type: a.type, status: a.status, displayName };
    });
  }

  // ── CU-16-01 : suspension d'un compte (effet < 1 min partout) ────────────────

  /**
   * ACTIVE → SUSPENDED (transition conditionnelle), révocation de toutes les sessions actives,
   * trace SanctionCompte(SUSPENSION, EXECUTED), audit + notification au titulaire.
   * Si le compte est un PROFESSIONAL en pleine session payée (PREPARING/ACTIVE) : chaque session
   * est remboursée (M13, HORS transaction, idempotent) puis passée à REFUNDED (C1).
   */
  async suspendAccount(adminId: string, accountId: string, reason: string): Promise<{ accountId: string; suspended: boolean }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException("Compte introuvable");

    let suspended = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.account.updateMany({
        where: { id: accountId, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });
      if (count === 0) {
        throw new ConflictException(`Le compte n'est pas actif (statut ${account.status}) — suspension impossible`);
      }
      suspended = true;

      // Effet < 1 min : toutes les sessions de connexion actives sont révoquées.
      await tx.loginSession.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.accountSanction.create({
        data: { accountId, type: "SUSPENSION", reason, requestedBy: adminId, status: "EXECUTED", decidedAt: new Date() },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.account.suspended",
        resource: `account:${accountId}`,
        context: { reason, accountType: account.type },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId, template: "m16.account.suspended" },
      });
    });

    // CU-16-01 (C1) : un pro suspendu en pleine session payée → remboursement + clôture.
    if (account.type === "PROFESSIONAL") {
      await this.refundLiveProfessionalSessions(adminId, accountId, reason);
    }

    return { accountId, suspended };
  }

  /**
   * Rembourse et clôt les sessions PREPARING/ACTIVE d'un professionnel suspendu (C1).
   * Le remboursement passe par M13 (RM-16-01) HORS transaction et est idempotent (RM-13-04) ;
   * la session passe ensuite à REFUNDED par updateMany conditionnel (un seul gagnant, D-046).
   */
  private async refundLiveProfessionalSessions(adminId: string, professionalId: string, reason: string): Promise<void> {
    const sessions = await this.prisma.careSession.findMany({
      where: { professionalId, status: { in: ["PREPARING", "ACTIVE"] } },
      select: { id: true, orderRef: true },
      take: 200,
    });
    for (const session of sessions) {
      try {
        await this.payments.refund(session.orderRef, reason, adminId);
        await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.careSession.updateMany({
            where: { id: session.id, status: { in: ["PREPARING", "ACTIVE"] } },
            data: { status: "REFUNDED", endedAt: new Date() },
          });
          if (count === 1) {
            await this.audit.emit(tx, {
              actorId: adminId,
              actorType: "admin",
              action: "m16.session.refunded_on_suspension",
              resource: `care_session:${session.id}`,
              context: { professionalId, reason },
            });
          }
        });
      } catch (err) {
        // Un échec de remboursement ne bloque pas la suspension : tracé, repris par la
        // réconciliation finance (EF-13-09). On continue les autres sessions.
        this.logger.error(`Remboursement de la session ${session.id} en échec : ${(err as Error).message}`);
      }
    }
  }

  // ── EF-16-03 : réactivation d'un compte ──────────────────────────────────────

  async reactivateAccount(adminId: string, accountId: string, reason: string): Promise<{ accountId: string; reactivated: boolean }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException("Compte introuvable");

    let reactivated = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.account.updateMany({
        where: { id: accountId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });
      if (count === 0) {
        throw new ConflictException(`Le compte n'est pas suspendu (statut ${account.status}) — réactivation impossible`);
      }
      reactivated = true;

      // La/les SUSPENSION(s) EXECUTED du compte sont LEVÉES (EXECUTED → REVERSED) : l'historique
      // reflète que la suspension n'est plus active (la machine d'états REVERSED devient réelle).
      await tx.accountSanction.updateMany({
        where: { accountId, type: "SUSPENSION", status: "EXECUTED" },
        data: { status: "REVERSED" },
      });
      await tx.accountSanction.create({
        data: { accountId, type: "REACTIVATION", reason, requestedBy: adminId, status: "EXECUTED", decidedAt: new Date() },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.account.reactivated",
        resource: `account:${accountId}`,
        context: { reason, accountType: account.type },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId, template: "m16.account.reactivated" },
      });
    });

    return { accountId, reactivated };
  }

  // ── EF-16-07 : bannissement définitif (double validation) ────────────────────

  /** Demande de bannissement : SanctionCompte(BAN, PENDING_SECOND_APPROVAL) + alerte aux Super Admin. */
  /**
   * Les demandes de bannissement, et d'abord celles qui attendent un second accord.
   *
   * ── Le défaut (chantier 67, 07/09/2026) ────────────────────────────────────────────────────────
   *
   * `approveBan` et `rejectBan` agissent sur un **identifiant de sanction** — et **aucune route ne
   * permettait de le découvrir**. La double validation EF-16-07 était donc inapplicable en
   * pratique : le second administrateur ne pouvait pas savoir qu'on l'attendait, ni sur quoi.
   *
   * ⚠️ C'est exactement le trou qu'avait la file des remboursements manuels avant qu'on l'ouvre, et
   * il porte ici sur l'acte le plus lourd de la plateforme : **exclure quelqu'un définitivement**.
   * Une demande déposée restait dans un état que rien ne pouvait résoudre — ni approuver, ni
   * rejeter, et le compte visé restait actif indéfiniment.
   *
   * Trouvé en balayant les capacités du client web qu'aucun écran n'appelle — le même outil qui
   * avait servi au mobile au chantier 58, et qu'on n'avait jamais pointé sur le web.
   *
   * ── Ce que la file porte ──────────────────────────────────────────────────────────────────────
   *
   * Le NOM du compte visé et celui du demandeur : sans eux, on approuverait une exclusion définitive
   * en ne lisant que des identifiants. Et `requestedBy`, parce que la règle de double validation
   * l'exige — l'approbateur doit être un autre administrateur, et l'écran doit pouvoir le dire
   * AVANT le clic plutôt que de laisser le serveur refuser après.
   */
  async listSanctions(status?: SanctionStatus): Promise<SanctionListItem[]> {
    const lignes = await this.prisma.accountSanction.findMany({
      where: { type: "BAN", ...(status ? { status } : {}) },
      // Les demandes en attente d'abord, les plus anciennes en tête : quelqu'un attend une décision,
      // et un compte reste actif pendant ce temps.
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 200,
    });
    if (lignes.length === 0) return [];

    const ids = [...new Set(lignes.flatMap((s) => [s.accountId, s.requestedBy, s.approvedBy].filter(Boolean) as string[]))];
    const comptes = await this.prisma.account.findMany({
      where: { id: { in: ids } },
      include: { patientProfile: true, professionalProfile: true, facilityMemberProfile: true },
    });
    const nomDe = new Map(
      comptes.map((c) => {
        const p = c.patientProfile ?? c.professionalProfile ?? c.facilityMemberProfile;
        return [c.id, p ? `${p.firstName} ${p.lastName}`.trim() : "(compte sans profil)"];
      }),
    );
    const statutDe = new Map(comptes.map((c) => [c.id, c.status]));

    return lignes.map((s) => ({
      sanctionId: s.id,
      accountId: s.accountId,
      accountName: nomDe.get(s.accountId) ?? null,
      /** L'état ACTUEL du compte visé : une demande peut viser un compte déjà suspendu. */
      accountStatus: statutDe.get(s.accountId) ?? null,
      reason: s.reason,
      status: s.status,
      requestedBy: s.requestedBy,
      requestedByName: nomDe.get(s.requestedBy) ?? null,
      approvedBy: s.approvedBy,
      createdAt: s.createdAt.toISOString(),
      decidedAt: s.decidedAt ? s.decidedAt.toISOString() : null,
    }));
  }

  async requestBan(adminId: string, accountId: string, reason: string): Promise<{ sanctionId: string }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException("Compte introuvable");
    if (account.status === "CLOSED") throw new ConflictException("Le compte est déjà clos");
    // EF-16-07 : une seule demande de bannissement VIVANTE par compte — sinon deux approbations
    // indépendantes produiraient deux exécutions/notifications et permettraient au demandeur d'une
    // demande d'approuver l'autre (contournement du double-contrôle).
    const pending = await this.prisma.accountSanction.findFirst({
      where: { accountId, type: "BAN", status: "PENDING_SECOND_APPROVAL" },
    });
    if (pending) throw new ConflictException("Une demande de bannissement est déjà en attente pour ce compte");

    const sanction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.accountSanction.create({
        data: { accountId, type: "BAN", reason, requestedBy: adminId, status: "PENDING_SECOND_APPROVAL" },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.account.ban_requested",
        resource: `account:${accountId}`,
        context: { reason, sanctionId: created.id, accountType: account.type },
      });
      // EF-16-07 : on prévient les Super Admin qu'une seconde approbation est attendue.
      await this.notifySuperAdmins(tx, "m16.account.ban_pending_approval", { sanctionId: created.id });
      return created;
    });

    return { sanctionId: sanction.id };
  }

  /**
   * Seconde approbation : exige un admin DISTINCT du demandeur (EF-16-07) sinon 403.
   * Transition conditionnelle PENDING_SECOND_APPROVAL → EXECUTED (un seul gagnant, D-046) ;
   * Account → CLOSED + closedAt + révocation des sessions ; audit + notification au compte.
   */
  async approveBan(adminId: string, sanctionId: string): Promise<{ sanctionId: string; banned: boolean }> {
    const sanction = await this.prisma.accountSanction.findUnique({ where: { id: sanctionId } });
    if (!sanction || sanction.type !== "BAN") throw new NotFoundException("Demande de bannissement introuvable");
    if (sanction.status !== "PENDING_SECOND_APPROVAL") {
      throw new ConflictException(`Cette demande a déjà été décidée (statut ${sanction.status})`);
    }
    if (!canSecondApproveBan(sanction.requestedBy, adminId)) {
      // RM-16-03/16-04 : une tentative d'auto-approbation d'un ban est un événement de sécurité — tracé.
      await this.audit.emit(this.prisma, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.account.ban_self_approval_denied",
        resource: `account:${sanction.accountId}`,
        context: { sanctionId, requestedBy: sanction.requestedBy },
      });
      throw new ForbiddenException("Double validation : l'approbateur doit être un admin différent du demandeur (EF-16-07)");
    }

    const account = await this.prisma.account.findUnique({ where: { id: sanction.accountId } });
    let bannedNow = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.accountSanction.updateMany({
        where: { id: sanctionId, status: "PENDING_SECOND_APPROVAL" },
        data: { status: "EXECUTED", approvedBy: adminId, decidedAt: new Date() },
      });
      if (count === 0) throw new ConflictException("Cette demande vient d'être décidée par un autre admin");

      // Application de la sanction (écriture propre M16 sur Account, RM-16-01) — n'a d'EFFET que si
      // le compte n'était pas déjà clos : on n'émet audit « banni » + notification que sur transition réelle.
      const closed = await tx.account.updateMany({
        where: { id: sanction.accountId, status: { not: "CLOSED" } },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      bannedNow = closed.count === 1;
      if (bannedNow) {
        await tx.loginSession.updateMany({
          where: { accountId: sanction.accountId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.emit(tx, {
          actorId: adminId,
          actorType: "admin",
          action: "m16.account.banned",
          resource: `account:${sanction.accountId}`,
          context: { sanctionId, requestedBy: sanction.requestedBy, reason: sanction.reason },
        });
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: sanction.accountId, template: "m16.account.banned" },
        });
      } else {
        // Compte déjà clos : la décision est consignée, mais aucun effet/notification dupliqué.
        await this.audit.emit(tx, {
          actorId: adminId,
          actorType: "admin",
          action: "m16.account.ban_executed_noop",
          resource: `account:${sanction.accountId}`,
          context: { sanctionId, reason: "compte déjà clos" },
        });
      }
    });

    // CU-16-01 (C1) : un pro banni en pleine session payée → remboursement + clôture (comme la suspension).
    if (bannedNow && account?.type === "PROFESSIONAL") {
      await this.refundLiveProfessionalSessions(adminId, sanction.accountId, sanction.reason);
    }

    return { sanctionId, banned: bannedNow };
  }

  /** Rejet du bannissement : PENDING → REJECTED (tout admin, y compris le demandeur). */
  async rejectBan(adminId: string, sanctionId: string): Promise<{ sanctionId: string; rejected: boolean }> {
    const sanction = await this.prisma.accountSanction.findUnique({ where: { id: sanctionId } });
    if (!sanction || sanction.type !== "BAN") throw new NotFoundException("Demande de bannissement introuvable");

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.accountSanction.updateMany({
        where: { id: sanctionId, status: "PENDING_SECOND_APPROVAL" },
        data: { status: "REJECTED", approvedBy: adminId, decidedAt: new Date() },
      });
      if (count === 0) throw new ConflictException("Cette demande a déjà été décidée");
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.account.ban_rejected",
        resource: `account:${sanction.accountId}`,
        context: { sanctionId, requestedBy: sanction.requestedBy },
      });
    });

    return { sanctionId, rejected: true };
  }

  /*
    ── L'arbitrage des strikes de fiabilité est RETIRÉ (02/09/2026, chantier 26) ────────────────

    EF-12-07 arbitrait la contestation d'un « strike » — la pénalité posée à une pharmacie qui
    n'avait pas le produit qu'elle annonçait. Avec M12, l'objet lui-même disparaît : plus de
    dévoilement, donc plus de promesse à tenir, donc plus de strike à contester.

    Ce n'est pas un pouvoir qu'on retire à l'administration, c'est un litige qui n'existe plus.
    La route `POST /v1/admin/strikes/:id/resolve` part avec.
  */

  // ── Aide partagée ─────────────────────────────────────────────────────────────

  /** Notifie tous les Super Admin (EF-16-07) — priorité critique. */
  private async notifySuperAdmins(tx: Prisma.TransactionClient, template: string, payload: Record<string, unknown>): Promise<void> {
    const admins = await tx.adminRoleAssignment.findMany({ where: { role: "SUPER_ADMIN" } });
    for (const admin of admins) {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: admin.accountId, template, priority: "critical", ...payload },
      });
    }
  }
}

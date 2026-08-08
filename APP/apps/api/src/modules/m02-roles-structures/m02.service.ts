/**
 * M02 — Rôles & Espaces Structures.
 * Spec : docs/cahier_des_charges/02_modules/M02_roles_espaces_structures.md
 * Invariants : un seul titulaire actif par structure (RM-02-01) ; toute action tracée
 * au nom du membre ET de la structure (RM-02-02, C5) ; un compte = une structure (RM-02-05) ;
 * pas de cumul de casquettes au MVP (RM-02-06, Q-008).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { FacilityMember, InvitationStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { isAcceptableUsername, normalizeUsername } from "../m01-accounts/m01.policies";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { SMS_GATEWAY, SmsGateway } from "../../common/sms/sms.service";
import { normalizePhone } from "../m01-accounts/m01.policies";
import { M01Service } from "../m01-accounts/m01.service";
import { PermissionsService } from "./m02.permissions.service";
import {
  canModifyMember,
  FACILITY_RIGHTS,
  invitationRefusalReason,
  rightsAreValid,
} from "./m02.policies";

@Injectable()
export class M02Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly permissions: PermissionsService,
    private readonly m01: M01Service,
    @Inject(SMS_GATEWAY) private readonly sms: SmsGateway,
  ) {}

  // ── Création d'un espace pharmacie (EF-02-03 ; CU-02-01) ───────────────────

  async createFacility(
    actorId: string,
    dto: {
      type: "PHARMACY";
      name: string;
      district: string;
      quarter: string;
      latitude?: number;
      longitude?: number;
      hours?: string;
    },
  ): Promise<{ facilityId: string }> {
    return this.prisma.$transaction(async (tx) => {
      // RM-02-06 (décision D-045) : seul un compte dédié FACILITY_MEMBER crée et rejoint
      // une structure — inscription via /accounts/register/facility-member (M01).
      const account = await tx.account.findUnique({ where: { id: actorId } });
      if (!account || account.type !== "FACILITY_MEMBER") {
        throw new ForbiddenException(
          "La création d'une structure exige un compte « membre de structure » dédié (RM-02-06, D-045) — inscrivez-vous via le parcours structure",
        );
      }
      // RM-02-05/06 : le futur titulaire ne doit avoir AUCUN rattachement actif —
      // un compte = une seule structure au MVP. Contrôle fait dans la transaction
      // pour fermer la fenêtre de course entre deux créations simultanées.
      const existing = await tx.facilityMember.findFirst({ where: { accountId: actorId, active: true } });
      if (existing) {
        throw new ConflictException("Ce compte est déjà rattaché à une structure — une seule structure par compte au MVP (RM-02-05)");
      }

      // L'espace naît « non vérifié » (EF-02-03, RM-02-04) : la vérification est portée
      // par le dossier M03 (VerificationCase), ouvert à la consommation de l'événement
      // m02.facility.created. D'ici là : invisible des patients, rien de publiable (C6).
      const facility = await tx.facility.create({
        data: {
          type: dto.type, // MVP : pharmacies seulement (D-026) — verrouillé par le DTO
          name: dto.name,
          district: dto.district,
          quarter: dto.quarter,
          latitude: dto.latitude ?? null, // jamais exposée sans dévoilement (règle 5 du dictionnaire)
          longitude: dto.longitude ?? null,
          hours: dto.hours ?? null,
          members: {
            // Le créateur devient titulaire (RM-02-01) avec tous les droits internes.
            create: { accountId: actorId, role: "OWNER", rights: [...FACILITY_RIGHTS] },
          },
        },
      });

      await this.outbox.emit(tx, { type: "m02.facility.created", payload: { facilityId: facility.id } });
      await this.audit.emit(tx, {
        actorId,
        actorType: "facility_member",
        action: "m02.facility.created",
        resource: `facility:${facility.id}`,
        context: { type: dto.type, name: dto.name, district: dto.district },
      });
      return { facilityId: facility.id };
    });
  }

  // ── Invitations (EF-02-04 ; CU-02-02) ──────────────────────────────────────

  async inviteMember(
    actorId: string,
    facilityId: string,
    dto: { phone: string; proposedRights: string[] },
  ): Promise<{ invitationId: string; expiresAt: string }> {
    await this.requireOwner(actorId, facilityId); // réservé au titulaire (EF-02-05)
    const phone = this.normalizeOrThrow(dto.phone);
    if (!rightsAreValid(dto.proposedRights)) {
      throw new BadRequestException("Droits proposés invalides — valeurs admises : stock, dispense, stats (EF-02-05)");
    }

    // RM-02-05 : refus si le numéro correspond à un compte déjà rattaché à une structure.
    const invitee = await this.prisma.account.findUnique({ where: { phone } });
    if (invitee) {
      const attached = await this.prisma.facilityMember.findFirst({ where: { accountId: invitee.id, active: true } });
      if (attached) {
        throw new ConflictException("Ce numéro appartient à un compte déjà membre d'une structure (RM-02-05)");
      }
    }
    // Une seule invitation en attente par numéro et par structure (usage unique, spec §6).
    const pending = await this.prisma.facilityInvitation.findFirst({
      where: { facilityId, phone, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
    });
    if (pending) throw new ConflictException("Une invitation est déjà en attente pour ce numéro");

    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId }, include: { verificationCase: true } });
    if (!facility) throw new NotFoundException("Structure introuvable");
    // CU-02-02 : seul un titulaire d'espace VÉRIFIÉ et actif invite (D-029, RM-02-04).
    if (facility.status !== "ACTIVE") {
      throw new ForbiddenException("Structure suspendue ou fermée — aucune invitation possible");
    }
    if (facility.verificationCase?.status !== "VERIFIED") {
      throw new ForbiddenException("Structure non vérifiée (D-029) — la vérification M03 doit aboutir avant d'inviter des membres");
    }

    const ttlSeconds = await this.params.getInt("PM-22"); // expiration des invitations
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const invitation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.facilityInvitation.create({
        data: { facilityId, phone, proposedRights: dto.proposedRights, expiresAt },
      });
      await this.audit.emit(tx, {
        actorId,
        actorType: "facility_member",
        action: "m02.invitation.created",
        resource: `invitation:${created.id}`,
        context: { facilityId, phone, proposedRights: dto.proposedRights },
      });
      return created;
    });

    // SMS d'invitation SANS lien (menace T-13) — le destinataire passe par l'application.
    const days = Math.max(1, Math.round(ttlSeconds / 86_400));
    await this.sms.send(
      phone,
      `ULAMU : la pharmacie ${facility.name} vous invite à rejoindre son espace. Ouvrez l'application ULAMU pour répondre. Invitation valable ${days} jour(s).`,
    );
    return { invitationId: invitation.id, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvitation(actorId: string, invitationId: string): Promise<{ facilityId: string; memberId: string }> {
    const account = await this.prisma.account.findUnique({ where: { id: actorId } });
    if (!account || account.status !== "ACTIVE") throw new UnauthorizedException("Compte introuvable ou inactif");

    const invitation = await this.prisma.facilityInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException("Invitation introuvable");

    // Statut EXPIRED géré à la lecture : une PENDING dépassée est marquée puis refusée (PM-22).
    if (invitation.status === InvitationStatus.PENDING && invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.facilityInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED, decidedAt: new Date() },
      });
      throw new GoneException("Invitation expirée (PM-22) — demandez une nouvelle invitation au titulaire");
    }

    const hasActiveMembership = Boolean(
      await this.prisma.facilityMember.findFirst({ where: { accountId: actorId, active: true } }),
    );
    const refusal = invitationRefusalReason(
      { status: invitation.status, phone: invitation.phone, expiresAtMs: invitation.expiresAt.getTime() },
      { nowMs: Date.now(), phone: account.phone, hasActiveMembership },
    );
    if (refusal === "NOT_PENDING") throw new ConflictException("Invitation déjà traitée ou annulée (usage unique)");
    if (refusal === "EXPIRED") throw new GoneException("Invitation expirée (PM-22) — demandez une nouvelle invitation au titulaire");
    if (refusal === "PHONE_MISMATCH") throw new ForbiddenException("Cette invitation est destinée à un autre numéro de téléphone");
    if (refusal === "ALREADY_MEMBER") {
      throw new ConflictException("Votre compte est déjà rattaché à une structure — une seule structure par compte au MVP (RM-02-05)");
    }

    // RM-02-06 (Q-008) : pas de cumul de casquettes au MVP — seul un compte de type
    // FACILITY_MEMBER peut être rattaché. DÉCISION D'IMPLÉMENTATION À CONFIRMER :
    // l'inscription M01 ne crée pas (encore) de comptes FACILITY_MEMBER ; le parcours
    // « numéro sans compte → inscription puis rattachement » (CU-02-02) suppose un
    // parcours d'inscription dédié, à trancher avec M01 (voir réponse finale).
    if (account.type !== "FACILITY_MEMBER") {
      throw new ForbiddenException(
        "Ce compte ne peut pas rejoindre une structure : au MVP, un compte patient ou professionnel ne cumule pas " +
          "la casquette de membre de structure (RM-02-06) — utilisez un compte dédié de type membre de structure",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle : ferme la course entre deux acceptations concurrentes
      // (RM-02-05) — seule la transition PENDING→ACCEPTED gagne, l'autre échoue proprement.
      const won = await tx.facilityInvitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.ACCEPTED, decidedAt: new Date() },
      });
      if (won.count !== 1) throw new ConflictException("Invitation déjà traitée ou annulée (usage unique)");
      // Re-contrôle du rattachement DANS la transaction (RM-02-05) — l'état a pu changer.
      const attachedNow = await tx.facilityMember.findFirst({ where: { accountId: actorId, active: true } });
      if (attachedNow) {
        throw new ConflictException("Votre compte est déjà rattaché à une structure — une seule structure par compte au MVP (RM-02-05)");
      }
      // Upsert : si un rattachement SUSPENDU existait dans CETTE structure, il est réactivé
      // avec les droits proposés (la contrainte unique facilityId+accountId interdit un doublon).
      const member = await tx.facilityMember.upsert({
        where: { facilityId_accountId: { facilityId: invitation.facilityId, accountId: actorId } },
        update: { role: "MEMBER", rights: invitation.proposedRights, active: true },
        create: {
          facilityId: invitation.facilityId,
          accountId: actorId,
          role: "MEMBER",
          rights: invitation.proposedRights,
        },
      });
      await this.audit.emit(tx, {
        actorId,
        actorType: "facility_member",
        action: "m02.invitation.accepted",
        resource: `invitation:${invitation.id}`,
        context: { facilityId: invitation.facilityId, memberId: member.id, rights: invitation.proposedRights },
      });
      return { facilityId: invitation.facilityId, memberId: member.id };
    });
  }

  // ── Gestion des membres (EF-02-05/07 ; CU-02-03/04) ────────────────────────

  /** Détail d'une structure + ses membres — tout membre ACTIF (pas seulement le titulaire) peut lire. */
  /**
   * « Quelle est MA structure ? » — le point d'entrée qui manquait.
   *
   * `getFacilityDetail` exige de connaître l'identifiant à l'avance, et rien ne le donnait : ni
   * `GET /accounts/me`, ni l'inscription. Un membre de structure ne pouvait donc atteindre AUCUN
   * écran de son espace — le rattachement existait en base, mais était invisible depuis un client.
   *
   * Renvoie `null` plutôt qu'une erreur quand le compte n'est rattaché à rien : ce n'est pas un
   * échec, c'est le cas normal d'un titulaire qui n'a pas encore créé sa pharmacie. L'interface doit
   * pouvoir distinguer « pas encore de structure » d'une panne.
   */
  async getMyFacility(actorId: string) {
    const membership = await this.prisma.facilityMember.findFirst({
      where: { accountId: actorId, active: true },
    });
    if (!membership) return null;
    return this.getFacilityDetail(actorId, membership.facilityId);
  }

  async getFacilityDetail(actorId: string, facilityId: string) {
    const membership = await this.permissions.getMembership(actorId, facilityId);
    if (!membership || !membership.active) {
      throw new NotFoundException("Structure introuvable"); // pas de fuite inter-structures (RM-02-03)
    }
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new NotFoundException("Structure introuvable");
    const members = await this.prisma.facilityMember.findMany({
      where: { facilityId },
      include: { account: { include: { facilityMemberProfile: true } } },
      orderBy: { createdAt: "asc" },
    });
    return {
      id: facility.id,
      type: facility.type,
      name: facility.name,
      district: facility.district,
      quarter: facility.quarter,
      hours: facility.hours,
      status: facility.status,
      members: members.map((m) => ({
        id: m.id,
        accountId: m.accountId,
        firstName: m.account.facilityMemberProfile?.firstName ?? null,
        lastName: m.account.facilityMemberProfile?.lastName ?? null,
        role: m.role,
        rights: m.rights,
        active: m.active,
      })),
    };
  }

  async updateMemberRights(
    actorId: string,
    facilityId: string,
    memberId: string,
    rights: string[],
  ): Promise<{ memberId: string; rights: string[] }> {
    const actorMembership = await this.requireOwner(actorId, facilityId);
    if (!rightsAreValid(rights)) {
      throw new BadRequestException("Droits invalides — valeurs admises : stock, dispense, stats (EF-02-05)");
    }
    const target = await this.requireMemberOfFacility(facilityId, memberId);
    if (!canModifyMember(actorMembership.role, target.role, "UPDATE_RIGHTS")) {
      throw new ForbiddenException("Seul le titulaire modifie les droits, et jamais ceux d'un titulaire (EF-02-05, RM-02-01)");
    }

    await this.prisma.$transaction(async (tx) => {
      // Effet immédiat (CU-02-03) : les droits sont relus à chaque requête (RM-02-03).
      await tx.facilityMember.update({ where: { id: target.id }, data: { rights } });
      await this.audit.emit(tx, {
        actorId,
        actorType: "facility_member",
        action: "m02.member.rights_updated",
        resource: `facilityMember:${target.id}`,
        context: { facilityId, oldRights: target.rights, newRights: rights },
      });
      // Notification du membre (CU-02-03) — relayée par C4/M14.
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: target.accountId, template: "m02.member.rights_updated", facilityId, memberId: target.id },
      });
    });
    return { memberId: target.id, rights };
  }

  async suspendMember(actorId: string, facilityId: string, memberId: string): Promise<void> {
    const actorMembership = await this.requireOwner(actorId, facilityId);
    const target = await this.requireMemberOfFacility(facilityId, memberId);
    // Jamais sur soi-même : le titulaire transfère d'abord la titularité (CU-02-05).
    if (target.accountId === actorId) {
      throw new ForbiddenException("Le titulaire ne peut pas se retirer lui-même — transférez d'abord la titularité (CU-02-05)");
    }
    if (!canModifyMember(actorMembership.role, target.role, "SUSPEND")) {
      throw new ForbiddenException("Seul le titulaire retire un membre, et jamais un titulaire (EF-02-07, RM-02-01)");
    }
    if (!target.active) throw new ConflictException("Ce membre est déjà suspendu");

    await this.prisma.$transaction(async (tx) => {
      // Suspension : active=false — l'accès tombe immédiatement (EF-02-07, < 1 min),
      // l'historique du membre reste attribué à son nom (CU-02-04, traçabilité C5).
      await tx.facilityMember.update({ where: { id: target.id }, data: { active: false } });
      await this.audit.emit(tx, {
        actorId,
        actorType: "facility_member",
        action: "m02.member.suspended",
        resource: `facilityMember:${target.id}`,
        context: { facilityId, targetAccountId: target.accountId },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: target.accountId, template: "m02.member.suspended", facilityId, memberId: target.id },
      });
    });
  }

  // ── Transfert de titularité (EF-02-06 ; CU-02-05) ──────────────────────────

  async startOwnershipTransfer(
    actorId: string,
    facilityId: string,
    toMemberId: string,
  ): Promise<{ intentId: string; expiresInSeconds: number }> {
    await this.requireOwner(actorId, facilityId);
    const target = await this.requireTransferTarget(facilityId, toMemberId, actorId);
    // Intention PERSISTÉE et liée à UNE cible : l'OTP demandé pour transférer à A
    // ne peut jamais confirmer un transfert vers B (EF-02-06). Durée de vie = celle des OTP (PM-17).
    const ttlSeconds = await this.params.getInt("PM-17");
    const intent = await this.prisma.ownershipTransferIntent.create({
      data: {
        facilityId,
        fromAccountId: actorId,
        toAccountId: target.accountId,
        toMemberId: target.id,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    // « Les deux confirment par OTP » (CU-02-05) : un code au titulaire ET un à la cible.
    await this.m01.requestSensitiveActionOtp(actorId);
    await this.m01.requestSensitiveActionOtp(target.accountId);
    return { intentId: intent.id, expiresInSeconds: ttlSeconds };
  }

  async confirmOwnershipTransfer(
    actorId: string,
    facilityId: string,
    intentId: string,
    ownerOtpCode: string,
    targetOtpCode: string,
  ): Promise<{ facilityId: string; newOwnerMemberId: string }> {
    const owner = await this.requireOwner(actorId, facilityId);
    const intent = await this.prisma.ownershipTransferIntent.findUnique({ where: { id: intentId } });
    if (!intent || intent.facilityId !== facilityId || intent.fromAccountId !== actorId) {
      throw new NotFoundException("Intention de transfert introuvable pour cette structure");
    }
    if (intent.consumedAt) throw new ConflictException("Cette intention de transfert a déjà été utilisée");
    if (intent.expiresAt.getTime() <= Date.now()) {
      throw new GoneException("Intention de transfert expirée (PM-17) — recommencez la procédure");
    }
    const target = await this.requireTransferTarget(facilityId, intent.toMemberId, actorId);

    await this.prisma.$transaction(async (tx) => {
      // Intention consommée par écriture conditionnelle — une seule confirmation gagne.
      const consumed = await tx.ownershipTransferIntent.updateMany({
        where: { id: intent.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new ConflictException("Cette intention de transfert a déjà été utilisée");
      // OTP des DEUX parties, consommés DANS la transaction (EF-02-06, CU-02-05).
      await this.m01.verifySensitiveActionOtp(tx, actorId, ownerOtpCode);
      await this.m01.verifySensitiveActionOtp(tx, target.accountId, targetOtpCode);
      // Bascule conditionnelle — un seul titulaire actif à tout instant (RM-02-01) :
      // chaque updateMany exige le rôle attendu ; toute course concurrente échoue.
      const demoted = await tx.facilityMember.updateMany({
        where: { id: owner.id, role: "OWNER", active: true },
        data: { role: "MEMBER" },
      });
      const promoted = await tx.facilityMember.updateMany({
        where: { id: target.id, role: "MEMBER", active: true },
        data: { role: "OWNER" },
      });
      if (demoted.count !== 1 || promoted.count !== 1) {
        throw new ConflictException("Transfert impossible : l'état des membres a changé entre-temps (RM-02-01)");
      }
      // Revalidation du dossier par M03 (CU-02-05).
      await this.outbox.emit(tx, { type: "m03.case.recheck", payload: { facilityId } });
      // Notification aux deux parties (CU-02-05).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: actorId, template: "m02.ownership.transferred.from", facilityId },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: target.accountId, template: "m02.ownership.transferred.to", facilityId },
      });
      // Audit détaillé C5 (RM-02-02) : membre ET structure, origine et destination.
      await this.audit.emit(tx, {
        actorId,
        actorType: "facility_member",
        action: "m02.ownership.transferred",
        resource: `facility:${facilityId}`,
        context: {
          fromMemberId: owner.id,
          fromAccountId: actorId,
          toMemberId: target.id,
          toAccountId: target.accountId,
        },
      });
    });
    return { facilityId, newOwnerMemberId: target.id };
  }

  // ── Sous-rôles admin (EF-02-08) — SUPER_ADMIN uniquement (garde au contrôleur) ──

  async createAdmin(
    actorId: string,
    dto: { phone: string; username: string; password: string; firstName: string; lastName: string; role: "SUPER_ADMIN" | "ADMIN_FINANCE" | "ADMIN_VERIFICATION" | "ADMIN_MAP" },
  ): Promise<{ accountId: string }> {
    const phone = this.normalizeOrThrow(dto.phone);
    const existing = await this.prisma.account.findUnique({ where: { phone } });
    if (existing) throw new ConflictException("Ce numéro est déjà enregistré (RM-01-01)");
    const username = normalizeUsername(dto.username);
    if (!isAcceptableUsername(username)) throw new BadRequestException("Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)");
    const usernameTaken = await this.prisma.account.findUnique({ where: { username }, select: { id: true } });
    if (usernameTaken) throw new ConflictException("Ce nom d'utilisateur est déjà pris");
    const { hashPassword } = await import("../../common/crypto/password");
    const passwordHash = await hashPassword(dto.password);
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          phone,
          username,
          passwordHash,
          type: "ADMIN",
          facilityMemberProfile: { create: { firstName: dto.firstName, lastName: dto.lastName } },
          adminRole: { create: { role: dto.role, assignedBy: actorId } },
        },
      });
      await this.audit.emit(tx, {
        actorId,
        actorType: "admin",
        action: "m02.admin.created",
        resource: `account:${account.id}`,
        context: { role: dto.role },
      });
      return { accountId: account.id };
    });
  }

  async assignAdminRole(
    actorId: string,
    targetAccountId: string,
    role: "SUPER_ADMIN" | "ADMIN_FINANCE" | "ADMIN_VERIFICATION" | "ADMIN_MAP",
    reason?: string,
  ): Promise<{ accountId: string; role: string }> {
    const target = await this.prisma.account.findUnique({ where: { id: targetAccountId } });
    if (!target || target.type !== "ADMIN") throw new NotFoundException("Compte admin introuvable");
    await this.prisma.$transaction(async (tx) => {
      await tx.adminRoleAssignment.upsert({
        where: { accountId: targetAccountId },
        update: { role, assignedBy: actorId, assignedAt: new Date() },
        create: { accountId: targetAccountId, role, assignedBy: actorId },
      });
      await this.audit.emit(tx, {
        actorId,
        actorType: "admin",
        action: "m02.admin.role_assigned",
        resource: `account:${targetAccountId}`,
        context: { role, reason: reason ?? null },
      });
    });
    return { accountId: targetAccountId, role };
  }

  async revokeAdminRole(actorId: string, targetAccountId: string): Promise<void> {
    if (actorId === targetAccountId) {
      throw new ForbiddenException("Un SUPER_ADMIN ne révoque pas son propre rôle (continuité d'administration)");
    }
    const assignment = await this.prisma.adminRoleAssignment.findUnique({ where: { accountId: targetAccountId } });
    if (!assignment) throw new NotFoundException("Aucun sous-rôle attribué à ce compte");
    await this.prisma.$transaction(async (tx) => {
      await tx.adminRoleAssignment.delete({ where: { accountId: targetAccountId } });
      // Les sessions de l'admin révoqué tombent immédiatement (effet < 1 min).
      await tx.loginSession.updateMany({ where: { accountId: targetAccountId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.emit(tx, {
        actorId,
        actorType: "admin",
        action: "m02.admin.role_revoked",
        resource: `account:${targetAccountId}`,
      });
    });
  }

  // ── Aides internes ─────────────────────────────────────────────────────────

  /** Titulaire ACTIF de la structure, sinon refus explicite (EF-02-05, CU-02-06). */
  private async requireOwner(accountId: string, facilityId: string): Promise<FacilityMember> {
    const membership = await this.permissions.getMembership(accountId, facilityId);
    if (!membership || !membership.active || membership.role !== "OWNER") {
      throw new ForbiddenException("Action réservée au titulaire de la structure (EF-02-05)");
    }
    return membership;
  }

  /** Membre appartenant bien à la structure visée — pas de fuite inter-structures. */
  private async requireMemberOfFacility(facilityId: string, memberId: string): Promise<FacilityMember> {
    const member = await this.prisma.facilityMember.findUnique({ where: { id: memberId } });
    if (!member || member.facilityId !== facilityId) throw new NotFoundException("Membre introuvable dans cette structure");
    return member;
  }

  /** Cible d'un transfert : membre ACTIF de la structure, simple MEMBER, différent du titulaire. */
  private async requireTransferTarget(facilityId: string, toMemberId: string, actorId: string): Promise<FacilityMember> {
    const target = await this.requireMemberOfFacility(facilityId, toMemberId);
    if (target.accountId === actorId) throw new BadRequestException("Le titulaire ne peut pas se transférer la titularité à lui-même");
    if (!target.active || target.role !== "MEMBER") {
      throw new BadRequestException("La cible du transfert doit être un membre actif de la structure (RM-02-01)");
    }
    return target;
  }

  private normalizeOrThrow(raw: string): string {
    const phone = normalizePhone(raw); // réutilise la règle M01 (RM-01-01)
    if (!phone) throw new BadRequestException("Numéro de téléphone congolais invalide");
    return phone;
  }
}

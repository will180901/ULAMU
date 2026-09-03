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
import { AdminRole, FacilityMember, InvitationStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService, type TxClient } from "../../common/outbox.service";
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
      /* RM-02-06 (D-045) : seul un compte dédié FACILITY_MEMBER crée et rejoint une structure.

         ⚠️ 02/09/2026 (chantier 25 / D-051) — la route `/accounts/register/facility-member` N'EXISTE
         PLUS : ULAMU a trois acteurs (patient, soignant, administration). Cette garde ne peut donc
         plus être franchie que par un compte HÉRITÉ. Elle reste, et c'est délibéré : elle est ce qui
         empêche un soignant ou un patient de créer une structure, et la retirer ouvrirait ce que
         personne n'a demandé d'ouvrir. Le message ci-dessous ne renvoie plus vers un parcours
         d'inscription — il n'y en a plus. */
      const account = await tx.account.findUnique({ where: { id: actorId } });
      if (!account || account.type !== "FACILITY_MEMBER") {
        throw new ForbiddenException(
          "La création d'une structure n'est plus ouverte : ULAMU compte trois acteurs — patient, soignant, administration (D-051, 02/09/2026)",
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

    /* RM-02-06 (Q-008) : pas de cumul de casquettes — seul un compte FACILITY_MEMBER se rattache.

       ⚠️ 02/09/2026 (chantier 25 / D-051) — la question « à trancher avec M01 » qui figurait ici est
       TRANCHÉE, et dans l'autre sens : il n'y aura pas de parcours d'inscription dédié, le type sort
       du produit. CU-02-02 (« numéro sans compte → inscription puis rattachement ») est donc sans
       objet : plus aucun compte ne peut naître pour accepter une invitation. */
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

  /**
   * Tous les comptes d'administration, avec leur sous-rôle courant.
   *
   * ⚠️ Cette route manquait. On pouvait CRÉER un administrateur et lui attribuer ou révoquer un
   * sous-rôle **par identifiant de compte**, mais rien ne permettait de savoir QUI sont les
   * administrateurs. Un Super Admin ne pouvait donc ni vérifier qu'une révocation avait pris effet,
   * ni retrouver l'identifiant sur lequel agir — sans ouvrir la base. Attribuer un sous-rôle exigeait
   * en pratique de modifier le seed et de rejouer la base entière.
   *
   * Les comptes ADMIN **sans** attribution sont inclus volontairement : ce sont précisément ceux qui
   * attendent un rôle, et les masquer les rendrait introuvables.
   */
  async listAdmins(): Promise<
    Array<{
      accountId: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string;
      role: string | null;
      assignedBy: string | null;
      assignedAt: string | null;
      /**
       * Le compte a-t-il un second facteur ACTIF — application d'authentification, ou code par email ?
       *
       * Ajouté le 02/09/2026 (chantier 32), **en contrepartie de D-053**. Depuis que le TOTP est
       * optionnel pour tous, la console d'administration n'est plus protégée que par un mot de passe
       * pour qui ne l'active pas. On ne remet pas l'obligation — **on rend l'état visible**.
       *
       * Sans cette information, elle existait en base (`totpSecret`, `emailTwoFactorEnabled`) et
       * personne ne pouvait la lire : chacun connaissait son propre réglage, nul ne connaissait celui
       * des autres. Un super-administrateur ne pouvait donc pas savoir si son équipe était protégée.
       */
      secondFacteur: { totp: boolean; email: boolean };
    }>
  > {
    const comptes = await this.prisma.account.findMany({
      where: { type: "ADMIN" },
      select: {
        id: true,
        username: true,
        phone: true,
        emailTwoFactorEnabled: true,
        patientProfile: { select: { firstName: true, lastName: true } },
        /* `totpSecret` porte un drapeau `enabled` : une configuration ENTAMÉE mais jamais confirmée
           laisse une ligne avec `enabled: false`. Compter la ligne plutôt que le drapeau annoncerait
           protégé un compte qui a scanné le QR sans jamais valider. */
        totpSecret: { select: { enabled: true } },
      },
      orderBy: { username: "asc" },
    });
    if (comptes.length === 0) return [];

    const attributions = await this.prisma.adminRoleAssignment.findMany({
      where: { accountId: { in: comptes.map((c) => c.id) } },
    });
    const parCompte = new Map(attributions.map((a) => [a.accountId, a]));

    return comptes.map((c) => {
      const a = parCompte.get(c.id);
      return {
        accountId: c.id,
        username: c.username,
        firstName: c.patientProfile?.firstName ?? null,
        lastName: c.patientProfile?.lastName ?? null,
        phone: c.phone,
        role: a?.role ?? null,
        assignedBy: a?.assignedBy ?? null,
        assignedAt: a?.assignedAt.toISOString() ?? null,
        secondFacteur: { totp: c.totpSecret?.enabled === true, email: c.emailTwoFactorEnabled },
      };
    });
  }

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
      // Changer de rôle, c'est aussi QUITTER l'ancien : la garde vaut ici autant qu'à la révocation.
      await this.assertLaisseUnTitulaire(tx, targetAccountId, role);
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
      await this.assertLaisseUnTitulaire(tx, targetAccountId, null);
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

  /** Intitulés d'écran des quatre sous-rôles — un message d'erreur doit parler la langue de E4. */
  private static readonly INTITULE_ROLE: Record<AdminRole, string> = {
    SUPER_ADMIN: "super-administrateur",
    ADMIN_VERIFICATION: "administrateur Vérification",
    ADMIN_FINANCE: "administrateur Finance",
    ADMIN_MAP: "administrateur Couverture territoriale",
  };

  /**
   * Un sous-rôle ne perd jamais son DERNIER titulaire (dette 8ter, soldée le 01/09/2026).
   *
   * ── Ce qui manquait ─────────────────────────────────────────────────────────────────────────
   *
   * Le serveur refusait déjà qu'un SUPER_ADMIN se révoque lui-même, mais rien n'empêchait de
   * retirer le **dernier** administrateur Vérification ou Finance : le domaine se retrouvait sans
   * personne, et seul un SUPER_ADMIN pouvait le réparer. La maquette E4 annonçait ce garde-fou
   * (« une case grisée signale le dernier porteur d'un sous-rôle ») ; la phrase avait été retirée
   * de l'écran faute de mécanisme derrière.
   *
   * ── Et un cas plus grave, trouvé en l'écrivant ──────────────────────────────────────────────
   *
   * La révocation n'était pas le seul chemin. `assignAdminRole` fait un **upsert** : donner un
   * autre rôle au dernier titulaire le fait quitter le sien tout aussi sûrement — et c'est
   * exactement ce que propose le bouton « Changer le rôle » de E4. Pire, un SUPER_ADMIN unique
   * pouvait s'attribuer à LUI-MÊME un rôle moindre : la garde d'auto-révocation ne voyait rien
   * passer, et comme seul un SUPER_ADMIN peut attribuer des rôles, plus personne n'aurait jamais
   * pu en attribuer. L'administration de la plateforme devenait irréparable sans écrire
   * directement en base.
   *
   * La garde couvre donc les deux routes et les quatre rôles.
   *
   * ⚠️ Limite connue : deux révocations simultanées des deux derniers titulaires d'un même rôle
   * pourraient chacune voir un survivant. Le cas demande deux SUPER_ADMIN agissant à la même
   * seconde sur le même rôle ; il n'est pas traité ici, qui coûterait un verrou sérialisable sur
   * une table de quatre lignes.
   *
   * @param nouveauRole le rôle qu'on s'apprête à poser, ou `null` pour une révocation.
   */
  private async assertLaisseUnTitulaire(
    tx: TxClient,
    targetAccountId: string,
    nouveauRole: AdminRole | null,
  ): Promise<void> {
    const actuel = await tx.adminRoleAssignment.findUnique({
      where: { accountId: targetAccountId },
      select: { role: true },
    });
    // Aucun rôle actuel : rien à perdre. Même rôle : on ne quitte rien.
    if (!actuel || actuel.role === nouveauRole) return;

    const autres = await tx.adminRoleAssignment.count({
      where: { role: actuel.role, accountId: { not: targetAccountId } },
    });
    if (autres > 0) return;

    const intitule = M02Service.INTITULE_ROLE[actuel.role];
    const consequence =
      actuel.role === "SUPER_ADMIN"
        ? " Sans lui, plus personne ne pourrait attribuer de rôle : l'administration deviendrait irréparable."
        : "";
    throw new ConflictException(
      `Ce compte est le dernier ${intitule}.${consequence} Nommez d'abord quelqu'un d'autre à ce sous-rôle, puis revenez retirer celui-ci.`,
    );
  }

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

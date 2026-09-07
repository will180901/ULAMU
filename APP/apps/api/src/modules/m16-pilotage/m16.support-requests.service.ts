/**
 * Les demandes de support écrites par les utilisateurs (01/09/2026, dette 8quater).
 *
 * ── Pourquoi ce service existe ─────────────────────────────────────────────────────────────────
 *
 * L'application affichait `support@ulamu.cg`. Le domaine `ulamu.cg` n'appartient pas au projet :
 * ni acheté, ni relevé. L'adresse figurait dans les mentions légales — **acceptées à l'inscription,
 * donc valant preuve** — et derrière « Écrire à l'administration » en C1. Une voie de contact qui ne
 * mène nulle part est pire qu'aucune voie de contact : elle est crue, et on attend une réponse qui
 * ne viendra jamais.
 *
 * ── La moitié qui manquait ─────────────────────────────────────────────────────────────────────
 *
 * `SupportProcedure` existait déjà, mais c'est la trace de ce qu'un ADMINISTRATEUR a **fait** :
 * `executedBy` y est obligatoire, la justification est la sienne. Rien ne portait ce qu'un
 * utilisateur **demande**. Les deux moitiés d'un même geste, et la première n'existait pas.
 *
 * D'où le choix de réutiliser `SupportProcedureType` comme sujet : une demande « j'ai perdu mon
 * numéro » (PHONE_CHANGE) désigne directement la procédure guidée qui la traite. Les deux moitiés
 * parlent enfin la même langue.
 *
 * ── Ce que ce service ne fait PAS ──────────────────────────────────────────────────────────────
 *
 * Il n'agit sur rien. Répondre à une demande ne change ni un numéro, ni un dossier, ni un compte :
 * l'effet réel passe par la procédure du module propriétaire (RM-16-01), exactement comme pour
 * `SupportProcedure`. Cette table est un canal de parole, pas un pouvoir de plus.
 */
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { SupportProcedureType, SupportRequestStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { EMAIL_GATEWAY, EmailGateway, avisSecuriteTemplate } from "../../common/email/email.service";
import { M01Service } from "../m01-accounts/m01.service";
import { OutboxService } from "../../common/outbox.service";
import { PrismaService } from "../../common/prisma.service";
import { auditActorType } from "../m04-audit-reports/m04.policies";

export interface SupportRequestView {
  id: string;
  subject: SupportProcedureType;
  body: string;
  status: SupportRequestStatus;
  createdAt: Date;
  answer: string | null;
  answeredAt: Date | null;
}

/** Vue d'administration : la même, plus qui demande — indispensable pour traiter. */
export interface AdminSupportRequestView extends SupportRequestView {
  requesterId: string;
  requesterName: string | null;
  requesterPhone: string | null;
}

@Injectable()
export class SupportRequestService {
  private readonly logger = new Logger(SupportRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditEmitter,
    private readonly outbox: OutboxService,
    private readonly m01: M01Service,
    @Inject(EMAIL_GATEWAY) private readonly email: EmailGateway,
  ) {}

  // ── Côté utilisateur ────────────────────────────────────────────────────────

  /**
   * Écrire à l'administration. Tout compte authentifié peut le faire — y compris, et surtout, un
   * compte bloqué quelque part : c'est précisément quand plus rien ne marche qu'on écrit.
   */
  async create(
    actor: AuthenticatedActor,
    dto: { subject: SupportProcedureType; body: string },
  ): Promise<{ requestId: string }> {
    const cree = await this.prisma.$transaction(async (tx) => {
      const r = await tx.supportRequest.create({
        data: { requesterId: actor.accountId, subject: dto.subject, body: dto.body },
      });
      /*
        Le CORPS ne part pas au journal d'audit, seulement le sujet — même règle que pour les
        signalements (RM-04-03). Une demande de support contient souvent ce qui va mal dans la vie
        de quelqu'un ; le journal d'audit, lui, est en insertion seule et ne s'efface jamais.
      */
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: auditActorType(actor.accountType),
        action: "m16.support_request.created",
        resource: `support-request:${r.id}`,
        context: { subject: dto.subject },
      });
      return r;
    });
    return { requestId: cree.id };
  }

  /** Mes demandes et leurs réponses — la réponse se lit ICI, jamais dans un courriel. */
  async mine(actor: AuthenticatedActor): Promise<SupportRequestView[]> {
    const lignes = await this.prisma.supportRequest.findMany({
      where: { requesterId: actor.accountId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return lignes.map((r) => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      answer: r.answer,
      answeredAt: r.answeredAt,
    }));
  }

  /**
   * Écrire au support SANS session — le recours d'un compte suspendu ou clôturé (chantier 63).
   *
   * ⚠️ **Ce chemin existe parce que l'autre est fermé.** Un compte suspendu reçoit « contactez le
   * support pour connaître le motif et les voies de recours », puis la garde refuse chacune de ses
   * requêtes : l'invitation était écrite et impraticable.
   *
   * L'identité est prouvée par un code envoyé à l'adresse DU COMPTE — pas par une session, qu'on ne
   * délivre pas : un jeton valide pour un compte suspendu retirerait à la suspension le sens même
   * qu'elle a. Et cela n'ouvre aucun pouvoir nouveau, puisque qui relève cette boîte pouvait déjà
   * réinitialiser le mot de passe.
   *
   * La demande entre dans **la même file**, avec la même trace : l'administration la traite comme
   * les autres, et sait seulement qu'elle est venue par ce chemin-là.
   */
  async createWithoutSession(
    rawEmail: string,
    otpCode: string,
    dto: { subject: SupportProcedureType; body: string },
  ): Promise<{ requestId: string }> {
    const cree = await this.prisma.$transaction(async (tx) => {
      const compte = await this.m01.consumeSupportAccessOtp(tx, rawEmail, otpCode);
      const r = await tx.supportRequest.create({
        data: { requesterId: compte.accountId, subject: dto.subject, body: dto.body },
      });
      /*
        Le corps ne part pas au journal, seulement le sujet (RM-04-03) — comme pour une demande
        déposée depuis l'application. `sansSession` est en revanche une information utile : elle dit
        que la personne n'avait aucun autre moyen d'écrire, et c'est ce qui explique la réponse par
        email plus loin.
      */
      await this.audit.emit(tx, {
        actorId: compte.accountId,
        actorType: auditActorType(compte.accountType),
        action: "m16.support_request.created",
        resource: `support-request:${r.id}`,
        context: { subject: dto.subject, sansSession: true, statutDuCompte: compte.status },
      });
      return r;
    });
    return { requestId: cree.id };
  }

  // ── Côté administration ─────────────────────────────────────────────────────

  /** La file : les ouvertes d'abord, les plus anciennes en tête — quelqu'un attend. */
  async list(status?: SupportRequestStatus): Promise<AdminSupportRequestView[]> {
    const lignes = await this.prisma.supportRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 200,
    });

    // Les noms en une seule requête : une par ligne ferait vingt allers-retours pour un écran.
    const ids = [...new Set(lignes.map((r) => r.requesterId))];
    const comptes = await this.prisma.account.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        phone: true,
        professionalProfile: { select: { firstName: true, lastName: true } },
        patientProfile: { select: { firstName: true, lastName: true } },
        facilityMemberProfile: { select: { firstName: true, lastName: true } },
      },
    });
    const nomDe = new Map(
      comptes.map((c) => {
        const p = c.professionalProfile ?? c.patientProfile ?? c.facilityMemberProfile;
        return [c.id, { nom: p ? `${p.firstName} ${p.lastName}`.trim() : null, phone: c.phone }];
      }),
    );

    return lignes.map((r) => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      answer: r.answer,
      answeredAt: r.answeredAt,
      requesterId: r.requesterId,
      requesterName: nomDe.get(r.requesterId)?.nom ?? null,
      requesterPhone: nomDe.get(r.requesterId)?.phone ?? null,
    }));
  }

  /**
   * Répondre. La réponse clôt la demande : il n'y a pas d'aller-retour au MVP, et prétendre le
   * contraire avec un statut « en cours » que rien ne ferait avancer serait un ornement.
   *
   * Une demande déjà répondue ne se réécrit pas — la réponse a été lue, la corriger après coup
   * réécrirait l'histoire. L'utilisateur en rouvre une, ce qui laisse les deux traces.
   */
  async answer(adminId: string, id: string, texte: string): Promise<{ id: string; status: SupportRequestStatus }> {
    const existante = await this.prisma.supportRequest.findUnique({ where: { id } });
    if (!existante) throw new NotFoundException("Demande de support introuvable");
    if (existante.status === "ANSWERED") {
      throw new ForbiddenException("Cette demande a déjà reçu une réponse : elle ne se réécrit pas.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supportRequest.update({
        where: { id },
        data: { status: "ANSWERED", answer: texte, answeredAt: new Date(), answeredBy: adminId },
      });
      // Comme à la création : le texte de la réponse reste hors du journal.
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.support_request.answered",
        resource: `support-request:${id}`,
        context: { subject: existante.subject },
      });

      /*
        ── Prévenir le demandeur (chantier 61, 07/09/2026) ────────────────────────────────────

        « La réponse se lit ICI » était vrai, et incomplet : **rien ne disait qu'elle était
        arrivée.** Quelqu'un qui écrit parce que plus rien ne marche devait revenir consulter un
        écran de réglages, au hasard, jusqu'à trouver. Une réponse que personne ne sait lire vaut
        l'adresse morte qu'on avait remplacée.

        ⚠️ La notification ne porte NI la réponse, NI la demande — seulement le sujet, comme
        l'audit. Une demande de support contient souvent ce qui va mal dans la vie de quelqu'un
        (RM-14-03) ; on annonce qu'il y a une réponse, on ne la recopie pas dans une bannière que
        le téléphone affichera peut-être écran verrouillé.
      */
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: existante.requesterId, template: "m16.support_request.answered", subject: existante.subject },
      });
    });

    /*
      ── Et par email si la personne ne peut pas ouvrir l'application (chantier 63) ─────────────

      La notification vit DANS l'application. Un compte suspendu ou clôturé ne peut plus s'y
      connecter : la réponse qu'il attend lui serait déposée dans un endroit qu'il ne peut pas
      atteindre — exactement le défaut qu'on vient de corriger côté écriture.

      ⚠️ Cet email porte le TEXTE de la réponse, contrairement à la notification. C'est délibéré et
      c'est l'exception : la notification s'affiche sur un écran verrouillé que d'autres voient,
      l'email arrive dans la boîte du titulaire — celle-là même où partent déjà ses codes et ses
      avis de sécurité. Sans le texte, cet email ne serait qu'un avis d'aller lire là où il ne peut
      pas aller.

      Hors transaction et sans jeter : une panne du fournisseur d'email n'a pas à annuler une
      réponse déjà enregistrée.
    */
    const demandeur = await this.prisma.account.findUnique({ where: { id: existante.requesterId } });
    if (demandeur && demandeur.status !== "ACTIVE" && demandeur.email) {
      await this.email
        .send(
          demandeur.email,
          "Réponse à votre demande d'aide ULAMU",
          avisSecuriteTemplate("L'administration a répondu à votre demande", texte),
        )
        .catch((err) =>
          this.logger.error(`Réponse de support non envoyée par email (demande ${id}) : ${String(err)}`),
        );
    }

    return { id, status: "ANSWERED" };
  }
}

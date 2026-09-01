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
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { SupportProcedureType, SupportRequestStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditEmitter,
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
    });

    return { id, status: "ANSWERED" };
  }
}

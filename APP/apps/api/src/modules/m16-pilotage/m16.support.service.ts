/**
 * M16 — Procédures support (EF-16-03, CU-16-04) : la TRACE auditée des interventions sensibles
 * (changement de numéro CU-01-05, titulaire injoignable CU-02-05, transfert de Carnet CU-07-05).
 *
 * RM-16-01 : l'effet RÉEL reste exécuté par les procédures des modules propriétaires — M16
 * GUIDE, MOTIVE et JOURNALISE, il n'agit pas « hors procédure ». Chaque étape est auditée.
 * RM-16-02 : aucun contenu médical dans les étapes (notes libres opérationnelles seulement).
 */
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SupportProcedureStatus, SupportProcedureType } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { PrismaService } from "../../common/prisma.service";
import {
  CancelSupportProcedureDto,
  CompleteSupportProcedureDto,
  ListSupportProceduresQueryDto,
  OpenSupportProcedureDto,
  SupportStepDto,
} from "./m16.dto";

/** Une étape persistée : libellé + note + horodatage + exécutant. */
interface StoredStep {
  label: string;
  note?: string;
  at: string;
  by: string;
}

@Injectable()
export class SupportProcedureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditEmitter,
  ) {}

  /** CU-16-04 : ouvre une procédure guidée (statut OPEN) avec ses premières étapes franchies. */
  async openProcedure(adminId: string, dto: OpenSupportProcedureDto): Promise<{ id: string }> {
    const steps = this.stampSteps(dto.steps, adminId);

    const created = await this.prisma.$transaction(async (tx) => {
      const proc = await tx.supportProcedure.create({
        data: {
          type: dto.type as SupportProcedureType,
          accountId: dto.accountId ?? null,
          steps: steps as unknown as Prisma.InputJsonValue,
          justification: dto.justification,
          executedBy: adminId,
          status: SupportProcedureStatus.OPEN,
        },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.support.opened",
        resource: `support_procedure:${proc.id}`,
        context: { type: dto.type, accountId: dto.accountId ?? null, stepCount: steps.length },
      });
      return proc;
    });

    return { id: created.id };
  }

  /** Avance / clôture la procédure : ajoute des étapes franchies, passe à COMPLETED (OPEN → COMPLETED). */
  async completeProcedure(adminId: string, id: string, dto: CompleteSupportProcedureDto): Promise<{ id: string; status: SupportProcedureStatus }> {
    const proc = await this.prisma.supportProcedure.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException("Procédure support introuvable");
    if (proc.status !== SupportProcedureStatus.OPEN) {
      throw new ConflictException(`Procédure déjà ${proc.status} — clôture impossible`);
    }
    const merged = [...this.readSteps(proc.steps), ...this.stampSteps(dto.steps, adminId)];

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.supportProcedure.updateMany({
        where: { id, status: SupportProcedureStatus.OPEN },
        data: { status: SupportProcedureStatus.COMPLETED, steps: merged as unknown as Prisma.InputJsonValue, completedAt: new Date() },
      });
      if (count === 0) throw new ConflictException("La procédure vient d'être close par ailleurs");
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.support.completed",
        resource: `support_procedure:${id}`,
        context: { type: proc.type, stepCount: merged.length },
      });
    });

    return { id, status: SupportProcedureStatus.COMPLETED };
  }

  /** Annulation motivée : OPEN → CANCELLED (le motif est consigné comme étape finale). */
  async cancelProcedure(adminId: string, id: string, dto: CancelSupportProcedureDto): Promise<{ id: string; status: SupportProcedureStatus }> {
    const proc = await this.prisma.supportProcedure.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException("Procédure support introuvable");
    if (proc.status !== SupportProcedureStatus.OPEN) {
      throw new ConflictException(`Procédure déjà ${proc.status} — annulation impossible`);
    }
    const merged = [...this.readSteps(proc.steps), ...this.stampSteps([{ label: "Annulation", note: dto.reason }], adminId)];

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.supportProcedure.updateMany({
        where: { id, status: SupportProcedureStatus.OPEN },
        data: { status: SupportProcedureStatus.CANCELLED, steps: merged as unknown as Prisma.InputJsonValue, completedAt: new Date() },
      });
      if (count === 0) throw new ConflictException("La procédure vient d'être décidée par ailleurs");
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.support.cancelled",
        resource: `support_procedure:${id}`,
        context: { type: proc.type, reason: dto.reason },
      });
    });

    return { id, status: SupportProcedureStatus.CANCELLED };
  }

  /** Liste filtrée des procédures (récentes d'abord). */
  listProcedures(query: ListSupportProceduresQueryDto) {
    return this.prisma.supportProcedure.findMany({
      where: {
        type: query.type ? (query.type as SupportProcedureType) : undefined,
        status: query.status ? (query.status as SupportProcedureStatus) : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ── Aides internes ──────────────────────────────────────────────────────────

  /** Horodate et signe chaque étape franchie (qui, quand). */
  private stampSteps(steps: SupportStepDto[], adminId: string): StoredStep[] {
    const at = new Date().toISOString();
    return steps.map((s) => ({ label: s.label, note: s.note, at, by: adminId }));
  }

  /** Relit les étapes déjà persistées (champ JSON). */
  private readSteps(raw: Prisma.JsonValue | null): StoredStep[] {
    return Array.isArray(raw) ? (raw as unknown as StoredStep[]) : [];
  }
}

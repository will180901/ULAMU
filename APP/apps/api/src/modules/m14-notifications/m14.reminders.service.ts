/**
 * Rappels de médicaments (M14) — CRUD propre au PATIENT. Aucune donnée partagée ; chaque patient
 * ne voit et ne gère QUE ses rappels (RM-14, isolation par compte). Les heures sont stockées en
 * "HH:MM,HH:MM". La notification PROGRAMMÉE à l'heure dite relève du push (lot natif) — ici on gère
 * la donnée réelle (liste, prochaine prise, « marquer pris »), consommable côté app immédiatement.
 */
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { PrismaService } from "../../common/prisma.service";

export interface ReminderView {
  id: string;
  medicationName: string;
  dosage: string | null;
  times: string[];
  active: boolean;
  lastTakenAt: string | null;
  createdAt: string;
}

interface ReminderRow {
  id: string;
  medicationName: string;
  dosage: string | null;
  times: string;
  active: boolean;
  lastTakenAt: Date | null;
  createdAt: Date;
  patientAccountId: string;
}

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedActor, dto: { medicationName: string; dosage?: string; times: string[] }): Promise<ReminderView> {
    this.assertPatient(actor);
    const row = await this.prisma.medicationReminder.create({
      data: {
        patientAccountId: actor.accountId,
        medicationName: dto.medicationName.trim(),
        dosage: dto.dosage?.trim() || null,
        times: normalizeTimes(dto.times),
      },
    });
    return this.toView(row);
  }

  async listMine(actor: AuthenticatedActor): Promise<{ items: ReminderView[] }> {
    this.assertPatient(actor);
    const rows = await this.prisma.medicationReminder.findMany({
      where: { patientAccountId: actor.accountId },
      orderBy: { createdAt: "desc" },
    });
    return { items: rows.map((r) => this.toView(r)) };
  }

  async update(
    actor: AuthenticatedActor,
    id: string,
    dto: { medicationName?: string; dosage?: string; times?: string[]; active?: boolean },
  ): Promise<ReminderView> {
    const row = await this.requireOwn(actor, id);
    const data: Record<string, unknown> = {};
    if (dto.medicationName !== undefined) data.medicationName = dto.medicationName.trim();
    if (dto.dosage !== undefined) data.dosage = dto.dosage?.trim() || null;
    if (dto.times !== undefined) data.times = normalizeTimes(dto.times);
    if (dto.active !== undefined) data.active = dto.active;
    const updated = await this.prisma.medicationReminder.update({ where: { id: row.id }, data });
    return this.toView(updated);
  }

  async remove(actor: AuthenticatedActor, id: string): Promise<void> {
    const row = await this.requireOwn(actor, id);
    await this.prisma.medicationReminder.delete({ where: { id: row.id } });
  }

  async markTaken(actor: AuthenticatedActor, id: string): Promise<ReminderView> {
    const row = await this.requireOwn(actor, id);
    const updated = await this.prisma.medicationReminder.update({ where: { id: row.id }, data: { lastTakenAt: new Date() } });
    return this.toView(updated);
  }

  private assertPatient(actor: AuthenticatedActor): void {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Les rappels de médicaments sont réservés aux patients");
    }
  }

  private async requireOwn(actor: AuthenticatedActor, id: string): Promise<ReminderRow> {
    this.assertPatient(actor);
    const row = (await this.prisma.medicationReminder.findUnique({ where: { id } })) as ReminderRow | null;
    if (!row || row.patientAccountId !== actor.accountId) {
      throw new NotFoundException("Rappel introuvable");
    }
    return row;
  }

  private toView(r: ReminderRow): ReminderView {
    return {
      id: r.id,
      medicationName: r.medicationName,
      dosage: r.dosage,
      times: r.times ? r.times.split(",").filter(Boolean) : [],
      active: r.active,
      lastTakenAt: r.lastTakenAt ? r.lastTakenAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }
}

/** Normalise des heures "HH:MM" : dédupliquées, valides, triées, jointes par virgule. */
function normalizeTimes(times: string[]): string {
  return [...new Set(times.map((t) => t.trim()).filter((t) => /^\d{2}:\d{2}$/.test(t)))].sort().join(",");
}

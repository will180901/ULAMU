/**
 * M07 — HealthRecordReaderService : lecture du Carnet (fiche synthèse, chronologie,
 * allergies actives). Consommé par M07 (routes patient), M06 (lecture en session,
 * RM-06-05) et M09 (garde-fou allergies, CU-07-02).
 *
 * Invariants de lecture :
 * - RM-07-04 : le patient voit TOUT — aucune entrée n'est filtrée hors du filtre
 *   de type demandé ; les entrées remplacées restent visibles, marquées superseded ;
 * - RM-07-03 : la provenance est exposée sur CHAQUE entrée ;
 * - la fiche synthèse (EF-07-03) est CALCULÉE depuis les entrées, jamais stockée.
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { HealthRecord, HealthRecordEntry, RecordEntryType, RecordProvenance } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { clampRecordPageSize, computeSummary, HealthSummary, supersededIdSet } from "./m07.policies";

/** Propriétaire d'un Carnet : compte patient OU sous-profil (RM-07-01). */
export interface RecordOwner {
  patientId?: string;
  subProfileId?: string;
}

/** Une entrée telle qu'exposée au lecteur (EF-07-03, RM-07-03/04). */
export interface RecordEntryView {
  id: string;
  type: RecordEntryType;
  /** RM-07-03 : une déclaration patient n'est jamais présentée comme un diagnostic. */
  provenance: RecordProvenance;
  authorId: string | null;
  sourceRef: string | null;
  payload: Record<string, unknown>;
  supersedesId: string | null;
  createdAt: string;
  /** true = remplacée par une entrée plus récente (EF-07-04) — visible mais corrigée. */
  superseded: boolean;
}

export interface FullRecordPage {
  recordId: string | null;
  items: RecordEntryView[];
  nextCursor: string | null;
}

export interface FullRecordExport {
  recordId: string | null;
  entries: RecordEntryView[];
}

@Injectable()
export class HealthRecordReaderService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Fiche synthèse (EF-07-03) ───────────────────────────────────────────────

  /**
   * Groupe sanguin / allergies actives / maladies chroniques, calculés depuis les
   * entrées ALLERGY et MEDICAL_HISTORY en ignorant les entrées remplacées (RM-07-02).
   * Carnet absent (pas encore créé) → synthèse vide, jamais d'erreur.
   */
  async getSummary(owner: { patientId?: string; subProfileId?: string }): Promise<HealthSummary> {
    const record = await this.findRecord(owner);
    if (!record) return { bloodType: null, activeAllergies: [], chronicDiseases: [] };
    const entries = await this.prisma.healthRecordEntry.findMany({
      where: { recordId: record.id, type: { in: [RecordEntryType.ALLERGY, RecordEntryType.MEDICAL_HISTORY] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, type: true, payload: true, supersedesId: true, createdAt: true },
    });
    return computeSummary(entries);
  }

  /** Allergies actives seules (consommé par le garde-fou M09, CU-07-02 — « on protège d'abord »). */
  async getActiveAllergies(owner: { patientId?: string; subProfileId?: string }): Promise<string[]> {
    return (await this.getSummary(owner)).activeAllergies;
  }

  // ── Chronologie paginée (EF-07-03, CU-07-01) ───────────────────────────────

  /**
   * Chronologie du plus récent au plus ancien, filtrable par type, paginée par curseur.
   * Chaque entrée expose id, type, provenance, authorId, sourceRef, payload,
   * supersedesId, createdAt et superseded (RM-07-03/04).
   */
  async getFullRecord(
    owner: { patientId?: string; subProfileId?: string },
    opts: { type?: RecordEntryType; cursor?: string; limit?: number } = {},
  ): Promise<FullRecordPage> {
    const record = await this.findRecord(owner);
    if (!record) return { recordId: null, items: [], nextCursor: null };

    const take = clampRecordPageSize(opts.limit);
    if (opts.cursor) {
      const anchor = await this.prisma.healthRecordEntry.findFirst({
        where: { id: opts.cursor, recordId: record.id },
        select: { id: true },
      });
      if (!anchor) throw new BadRequestException("Curseur de pagination invalide");
    }

    const rows = await this.prisma.healthRecordEntry.findMany({
      where: { recordId: record.id, ...(opts.type ? { type: opts.type } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      take: take + 1, // +1 : détecte s'il reste une page
    });
    const page = rows.slice(0, take);

    // superseded se calcule sur TOUT le Carnet (une correction peut être hors page/filtre).
    const replaced = await this.supersededAmong(record.id, page.map((r) => r.id));
    const items = page.map((r) => this.toView(r, replaced.has(r.id)));
    return { recordId: record.id, items, nextCursor: rows.length > take ? (items[items.length - 1]?.id ?? null) : null };
  }

  // ── Export complet (EF-07-08) ───────────────────────────────────────────────

  /** Toutes les entrées, chronologie ascendante — matière première de l'export JSON. */
  async getFullExport(owner: { patientId?: string; subProfileId?: string }): Promise<FullRecordExport> {
    const record = await this.findRecord(owner);
    if (!record) return { recordId: null, entries: [] };
    const rows = await this.prisma.healthRecordEntry.findMany({
      where: { recordId: record.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const replaced = supersededIdSet(rows);
    return { recordId: record.id, entries: rows.map((r) => this.toView(r, replaced.has(r.id))) };
  }

  // ── Aides internes ──────────────────────────────────────────────────────────

  /** Résout le Carnet du propriétaire — exactement un propriétaire (RM-07-01), sinon 400. */
  private async findRecord(owner: { patientId?: string; subProfileId?: string }): Promise<HealthRecord | null> {
    const ownersGiven = Number(Boolean(owner.patientId)) + Number(Boolean(owner.subProfileId));
    if (ownersGiven !== 1) {
      throw new BadRequestException("Exactement un propriétaire requis : patient OU sous-profil (RM-07-01)");
    }
    if (owner.patientId) {
      return this.prisma.healthRecord.findUnique({ where: { patientAccountId: owner.patientId } });
    }
    return this.prisma.healthRecord.findUnique({ where: { subProfileId: owner.subProfileId as string } });
  }

  /** Parmi `entryIds`, lesquelles sont remplacées par une entrée du même Carnet ? */
  private async supersededAmong(recordId: string, entryIds: string[]): Promise<Set<string>> {
    if (entryIds.length === 0) return new Set();
    const replacements = await this.prisma.healthRecordEntry.findMany({
      where: { recordId, supersedesId: { in: entryIds } },
      select: { supersedesId: true },
    });
    return supersededIdSet(replacements);
  }

  private toView(row: HealthRecordEntry, superseded: boolean): RecordEntryView {
    return {
      id: row.id,
      type: row.type,
      provenance: row.provenance, // RM-07-03 : toujours exposée
      authorId: row.authorId,
      sourceRef: row.sourceRef,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      supersedesId: row.supersedesId,
      createdAt: row.createdAt.toISOString(),
      superseded,
    };
  }
}

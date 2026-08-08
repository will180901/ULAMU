/**
 * M11 — StockService : routes internes de la pharmacie (entrées, sorties, corrections, seuils,
 * fraîcheur, journal, alertes, import). Spec : docs/cahier_des_charges/02_modules/M11_stocks_catalogues.md
 *
 * Garde systématique : assertFacilityRight(accountId, facilityId, "stock") AVANT toute action
 * (M02) — RM-11-05 : un membre ne voit jamais le stock d'une autre pharmacie. Toute variation
 * passe par un StockMovement signé tracé (RM-11-01) ; entrées/sorties/corrections/exclusions
 * sont auditées C5 (sans contenu sensible, RM-04-03). Stock jamais négatif.
 */
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StockMovementType } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { PermissionsService } from "../m02-roles-structures/m02.permissions.service";
import { StockAvailabilityService } from "./m11.availability.service";
import {
  correctionDelta,
  evaluateStockLevel,
  isExpiringSoon,
  movementSignIsValid,
  StockAlert,
} from "./m11.policies";
import {
  ImportCsvDto,
  ImportLineDto,
  MovementsQueryDto,
  SetThresholdDto,
  StockCorrectionDto,
  StockEntryDto,
  StockExitDto,
} from "./m11.dto";

const MOVEMENTS_PAGE_DEFAULT = 50;
const MOVEMENTS_PAGE_MAX = 200;

export interface ImportReport {
  applied: boolean;
  okCount: number;
  errorCount: number;
  /** Erreurs ligne par ligne (index 0-based) — l'import N'applique RIEN s'il en reste (EF-11-10). */
  errors: Array<{ index: number; medicamentId: string; lotCode: string; message: string }>;
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly audit: AuditEmitter,
    private readonly permissions: PermissionsService,
    private readonly availability: StockAvailabilityService,
  ) {}

  // ── EF-11-02 : approvisionnement / entrée ───────────────────────────────────

  /** Upsert du lot, StockMovement(ENTRY, +quantité), stock devenu frais (RM-11-06). */
  async addEntry(actor: AuthenticatedActor, facilityId: string, dto: StockEntryDto) {
    const member = await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");
    await this.assertMedicamentExists(dto.medicamentId);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.upsert({
        where: { facilityId_medicamentId_lotCode: { facilityId, medicamentId: dto.medicamentId, lotCode: dto.lotCode } },
        create: {
          facilityId,
          medicamentId: dto.medicamentId,
          lotCode: dto.lotCode,
          quantity: dto.quantity,
          expiryDate: new Date(dto.expiryDate),
          priceXaf: dto.priceXaf,
        },
        // Réappro d'un lot existant : on cumule la quantité, on rafraîchit prix/péremption saisis.
        update: { quantity: { increment: dto.quantity }, expiryDate: new Date(dto.expiryDate), priceXaf: dto.priceXaf },
      });

      await tx.stockMovement.create({
        data: {
          stockItemId: item.id,
          facilityId,
          type: StockMovementType.ENTRY,
          quantity: dto.quantity, // signé positif (RM-11-01)
          reason: dto.supplier ? `appro:${dto.supplier}` : null,
          memberId: member.accountId,
        },
      });

      await this.availability.touchFreshness(tx, facilityId, new Date());

      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m11.stock.entry",
        resource: `facility:${facilityId}`,
        // RM-04-03 : pas de contenu sensible — identifiants et quantité seulement.
        context: { medicamentId: dto.medicamentId, lotCode: dto.lotCode, quantity: dto.quantity },
      });

      return { stockItemId: item.id, quantity: item.quantity };
    });
  }

  // ── EF-11-03 : sortie manuelle motivée ──────────────────────────────────────

  /** StockMovement(EXIT, -quantité, reason) — jamais négatif (décrément conditionnel, D-046). */
  async addExit(actor: AuthenticatedActor, facilityId: string, dto: StockExitDto) {
    const member = await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findUnique({
        where: { facilityId_medicamentId_lotCode: { facilityId, medicamentId: dto.medicamentId, lotCode: dto.lotCode } },
      });
      if (!item) throw new NotFoundException("Lot introuvable dans cette pharmacie");

      // Anti-TOCTOU (D-046) : sortie CONDITIONNELLE — n'aboutit que si le lot a assez d'unités.
      const { count } = await tx.stockItem.updateMany({
        where: { id: item.id, quantity: { gte: dto.quantity } },
        data: { quantity: { decrement: dto.quantity } },
      });
      if (count === 0) throw new BadRequestException("Quantité de sortie supérieure au stock du lot (RM-11-01)");

      await tx.stockMovement.create({
        data: {
          stockItemId: item.id,
          facilityId,
          type: StockMovementType.EXIT,
          quantity: -dto.quantity, // signé négatif
          reason: dto.reason,
          memberId: member.accountId,
        },
      });

      await this.availability.touchFreshness(tx, facilityId, new Date());

      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m11.stock.exit",
        resource: `facility:${facilityId}`,
        context: { medicamentId: dto.medicamentId, lotCode: dto.lotCode, quantity: dto.quantity },
      });

      return { stockItemId: item.id };
    });
  }

  // ── EF-11-09 : correction d'inventaire ──────────────────────────────────────

  /** Ajuste un lot à une quantité cible → StockMovement(CORRECTION, delta signé). */
  async correctInventory(actor: AuthenticatedActor, facilityId: string, dto: StockCorrectionDto) {
    const member = await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findUnique({
        where: { facilityId_medicamentId_lotCode: { facilityId, medicamentId: dto.medicamentId, lotCode: dto.lotCode } },
      });
      if (!item) throw new NotFoundException("Lot introuvable dans cette pharmacie");

      const delta = correctionDelta(item.quantity, dto.targetQuantity);
      if (delta === 0) return { stockItemId: item.id, delta: 0 };

      // Cible posée directement (count attendu = 1) — la cible EST le stock physique compté.
      await tx.stockItem.update({ where: { id: item.id }, data: { quantity: dto.targetQuantity } });

      await tx.stockMovement.create({
        data: {
          stockItemId: item.id,
          facilityId,
          type: StockMovementType.CORRECTION,
          quantity: delta, // delta signé (RM-11-01)
          reason: dto.reason ?? "inventaire",
          memberId: member.accountId,
        },
      });

      await this.availability.touchFreshness(tx, facilityId, new Date());

      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m11.stock.correction",
        resource: `facility:${facilityId}`,
        context: { medicamentId: dto.medicamentId, lotCode: dto.lotCode, delta },
      });

      return { stockItemId: item.id, delta };
    });
  }

  // ── EF-11-05 : seuil de stock faible ────────────────────────────────────────

  /** Upsert StockThreshold(facility, medicament, lowStock). */
  async setThreshold(actor: AuthenticatedActor, facilityId: string, dto: SetThresholdDto) {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");
    await this.assertMedicamentExists(dto.medicamentId);

    const threshold = await this.prisma.stockThreshold.upsert({
      where: { facilityId_medicamentId: { facilityId, medicamentId: dto.medicamentId } },
      create: { facilityId, medicamentId: dto.medicamentId, lowStock: dto.lowStock },
      update: { lowStock: dto.lowStock },
    });
    return { medicamentId: threshold.medicamentId, lowStock: threshold.lowStock };
  }

  // ── EF-11-08 / CU-11-03 : confirmation de fraîcheur ─────────────────────────

  /**
   * « Stock à jour » (un clic) : insère une FreshnessConfirmation et remet lastFreshAt = now —
   * réintègre la pharmacie à la recherche immédiatement (RM-11-06).
   */
  async confirmFreshness(actor: AuthenticatedActor, facilityId: string) {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.freshnessConfirmation.create({ data: { facilityId, confirmedBy: actor.accountId, confirmedAt: now } });
      await this.availability.touchFreshness(tx, facilityId, now);
      return { facilityId, confirmedAt: now };
    });
  }

  // ── EF-11-06 : journal des mouvements (paginé) ──────────────────────────────

  /** Journal par lot/pharmacie, paginé par curseur (le plus récent d'abord). */
  /**
   * Stock COURANT, lot par lot — l'inventaire qui manquait.
   *
   * Le module n'exposait que les MOUVEMENTS et les ALERTES : un pharmacien pouvait voir ce qui était
   * entré et sorti, et ce qui manquait, mais jamais **ce qu'il a en rayon à l'instant**. Reconstituer
   * un état à partir d'un journal de mouvements côté client aurait été à la fois lourd et faux (les
   * corrections d'inventaire ne se rejouent pas comme des deltas).
   *
   * Tri FEFO (`First Expired, First Out`, RM-11-02) : les lots qui périment en premier remontent en
   * tête. C'est l'ordre dans lequel ils doivent être servis, donc l'ordre dans lequel on les lit.
   */
  async listItems(actor: AuthenticatedActor, facilityId: string) {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");
    const now = new Date();
    const items = await this.prisma.stockItem.findMany({
      where: { facilityId },
      orderBy: [{ expiryDate: "asc" }],
    });
    const meds = await this.prisma.medicament.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.medicamentId))] } },
    });
    const byId = new Map(meds.map((m) => [m.id, m]));
    return {
      items: items.map((i) => {
        const med = byId.get(i.medicamentId);
        return {
          id: i.id,
          medicamentId: i.medicamentId,
          // Le libellé est joint côté serveur : sans lui, l'interface n'afficherait que des UUID,
          // et devrait faire une requête par ligne pour les résoudre.
          dci: med?.dci ?? "Médicament inconnu",
          form: med?.form ?? null,
          dosage: med?.dosage ?? null,
          lotCode: i.lotCode,
          quantity: i.quantity,
          expiryDate: i.expiryDate.toISOString(),
          priceXaf: i.priceXaf,
          /** Périmé : le serveur tranche, pour que toutes les interfaces disent la même chose. */
          expired: i.expiryDate.getTime() <= now.getTime(),
        };
      }),
    };
  }

  async listMovements(actor: AuthenticatedActor, facilityId: string, query: MovementsQueryDto) {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");

    const limit = Math.min(query.limit ?? MOVEMENTS_PAGE_DEFAULT, MOVEMENTS_PAGE_MAX);
    const stockItemIds = query.medicamentId || query.lotCode ? await this.matchingStockItemIds(facilityId, query) : undefined;

    const where: Prisma.StockMovementWhereInput = { facilityId };
    if (stockItemIds) where.stockItemId = { in: stockItemIds };

    const rows = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((m) => ({
        id: m.id,
        stockItemId: m.stockItemId,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        reference: m.reference,
        memberId: m.memberId,
        createdAt: m.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    };
  }

  // ── EF-11-05 : alertes (faible / rupture / péremption proche) ───────────────

  async alerts(actor: AuthenticatedActor, facilityId: string): Promise<{ alerts: StockAlert[] }> {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");
    const now = new Date();
    const pm32Days = await this.params.getInt("PM-32"); // jours

    const items = await this.prisma.stockItem.findMany({ where: { facilityId } });
    const thresholds = await this.prisma.stockThreshold.findMany({ where: { facilityId } });
    const lowByMed = new Map(thresholds.map((t) => [t.medicamentId, t.lowStock]));

    // Disponible NON périmé par produit (RM-11-03), agrégé en mémoire.
    const freshByMed = new Map<string, number>();
    const alerts: StockAlert[] = [];
    for (const item of items) {
      if (item.expiryDate.getTime() > now.getTime()) {
        freshByMed.set(item.medicamentId, (freshByMed.get(item.medicamentId) ?? 0) + item.quantity);
        // Péremption proche : un lot valide dont la date tombe sous PM-32 (CU-11-04).
        if (item.quantity > 0 && isExpiringSoon(item.expiryDate, pm32Days, now)) {
          alerts.push({ medicamentId: item.medicamentId, kind: "EXPIRING_SOON", quantity: item.quantity, lotCode: item.lotCode, expiryDate: item.expiryDate });
        }
      } else if (!freshByMed.has(item.medicamentId)) {
        freshByMed.set(item.medicamentId, 0);
      }
    }

    for (const [medicamentId, freshAvailable] of freshByMed) {
      const level = evaluateStockLevel(medicamentId, freshAvailable, lowByMed.get(medicamentId) ?? null);
      if (level) alerts.push(level);
    }

    return { alerts };
  }

  // ── EF-11-10 : import initial guidé (CSV déjà parsé) ────────────────────────

  /**
   * Rapproche chaque ligne (médicament existant, lot, quantité, péremption) et renvoie les
   * erreurs ligne par ligne. N'applique RIEN tant qu'il reste une erreur OU si apply !== true
   * (CU-11-06 : rien n'est publié avant validation finale du titulaire).
   */
  async importCsv(actor: AuthenticatedActor, facilityId: string, dto: ImportCsvDto): Promise<ImportReport> {
    await this.permissions.assertFacilityRight(actor.accountId, facilityId, "stock");

    const errors: ImportReport["errors"] = [];
    const knownMedIds = new Set(
      (
        await this.prisma.medicament.findMany({
          where: { id: { in: [...new Set(dto.lines.map((l) => l.medicamentId))] }, active: true },
          select: { id: true },
        })
      ).map((m) => m.id),
    );

    dto.lines.forEach((line, index) => {
      const message = this.validateImportLine(line, knownMedIds);
      if (message) errors.push({ index, medicamentId: line.medicamentId, lotCode: line.lotCode, message });
    });

    const okCount = dto.lines.length - errors.length;
    // Validation seule, ou présence d'erreurs : on ne touche pas au stock.
    if (!dto.apply || errors.length > 0) {
      return { applied: false, okCount, errorCount: errors.length, errors };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const line of dto.lines) {
        const item = await tx.stockItem.upsert({
          where: { facilityId_medicamentId_lotCode: { facilityId, medicamentId: line.medicamentId, lotCode: line.lotCode } },
          create: {
            facilityId,
            medicamentId: line.medicamentId,
            lotCode: line.lotCode,
            quantity: line.quantity,
            expiryDate: new Date(line.expiryDate),
            priceXaf: line.priceXaf,
          },
          update: { quantity: { increment: line.quantity }, expiryDate: new Date(line.expiryDate), priceXaf: line.priceXaf },
        });
        await tx.stockMovement.create({
          data: {
            stockItemId: item.id,
            facilityId,
            type: StockMovementType.ENTRY,
            quantity: line.quantity,
            reference: "import",
            memberId: actor.accountId,
          },
        });
      }
      await this.availability.touchFreshness(tx, facilityId, new Date());
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m11.stock.import",
        resource: `facility:${facilityId}`,
        context: { lineCount: dto.lines.length },
      });
    });

    return { applied: true, okCount, errorCount: 0, errors: [] };
  }

  // ── Internes ────────────────────────────────────────────────────────────────

  private validateImportLine(line: ImportLineDto, knownMedIds: Set<string>): string | null {
    if (!knownMedIds.has(line.medicamentId)) return "Médicament absent du référentiel (rapprochement requis)";
    if (!movementSignIsValid(StockMovementType.ENTRY, line.quantity)) return "Quantité invalide (entier strictement positif)";
    const expiry = new Date(line.expiryDate);
    if (Number.isNaN(expiry.getTime())) return "Date de péremption invalide";
    if (!Number.isInteger(line.priceXaf) || line.priceXaf < 0) return "Prix de vente invalide";
    return null;
  }

  private async matchingStockItemIds(facilityId: string, query: MovementsQueryDto): Promise<string[]> {
    const items = await this.prisma.stockItem.findMany({
      where: {
        facilityId,
        ...(query.medicamentId ? { medicamentId: query.medicamentId } : {}),
        ...(query.lotCode ? { lotCode: query.lotCode } : {}),
      },
      select: { id: true },
    });
    return items.map((i) => i.id);
  }

  private async assertMedicamentExists(medicamentId: string): Promise<void> {
    const med = await this.prisma.medicament.findUnique({ where: { id: medicamentId }, select: { id: true } });
    if (!med) throw new BadRequestException("Médicament inconnu du référentiel");
  }
}

/**
 * M11 — StockAvailabilityService : le contrat C7 (disponibilité) exposé à M12 et le décrément
 * automatique C3 exposé à M09. Spec : docs/cahier_des_charges/02_modules/M11_stocks_catalogues.md
 *
 * Signatures imposées (M09/M12 en dépendent — ne pas renommer) :
 * - consume(tx, …) : décrément FEFO DANS la transaction de l'appelant (EF-11-04, CU-09-02) ;
 * - availableQuantity / isPublishable : briques de la recherche M12 ;
 * - searchAnonymous / pickOptimalFacility : recherche ANONYME par arrondissement (EF-12-02/03).
 *
 * Invariants : stock jamais négatif (RM-11-01) ; lots périmés exclus (RM-11-03) ; seules les
 * pharmacies vérifiées (C6), fraîches (RM-11-06) et non exclues (strikes) publient (RM-11-02) ;
 * la recherche anonyme n'expose NI identité NI prix (RM-11-04/05).
 */
import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, ReservationStatus, StockMovementType, StrikeStatus } from "@prisma/client";
import { TxClient } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { VerificationStatusService } from "../m03-verification-contracts/m03.status.service";
import {
  FacilityCandidate,
  isExcludedByStrikes,
  isFresh,
  pickOptimal,
  planFefoConsumption,
  publishableQuantity,
  STRIKE_EXCLUSION_THRESHOLD,
  STRIKE_WINDOW_DAYS,
} from "./m11.policies";

export interface ConsumeArgs {
  facilityId: string;
  medicamentId: string;
  quantity: number;
  /** Référence de l'acte d'origine : "dispensation:<uuid>" (CU-09-02). */
  reference: string;
  /** Membre à l'origine — null/absent = système (le décrément C3 n'est pas une action du pharmacien). */
  memberId?: string;
}

export interface ConsumeResult {
  lots: Array<{ stockItemId: string; lotCode: string; taken: number }>;
}

export interface AnonymousSearchArgs {
  district?: string;
  items: Array<{ medicamentId: string; quantity: number }>;
}

export interface AnonymousDistrictResult {
  district: string;
  pharmacyCount: number;
  products: Array<{ medicamentId: string; totalAvailable: number; pharmaciesWithIt: number }>;
}

export interface PickOptimalArgs {
  district: string;
  items: Array<{ medicamentId: string; quantity: number }>;
  excludeFacilityIds?: string[];
}

export interface PickOptimalResult {
  facilityId: string;
  coverage: number;
  freshnessAt: Date;
}

@Injectable()
export class StockAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly status: VerificationStatusService,
  ) {}

  // ── C3 : décrément automatique d'une délivrance (EF-11-04, CU-09-02) ────────

  /**
   * Décrémente le stock FEFO (premier périmé, premier sorti) sur les lots NON périmés,
   * DANS la transaction de l'appelant (M09). RM-11-01 : si le disponible < quantity, on
   * jette « Stock insuffisant » — la délivrance échoue en entier, rien n'est décrémenté.
   * Pour chaque lot entamé : un StockMovement(DISPENSE, quantité NÉGATIVE) tracé + décrément
   * du lot. Le stock devient « frais » (un mouvement = activité, RM-11-06).
   */
  async consume(tx: Prisma.TransactionClient, args: ConsumeArgs): Promise<ConsumeResult> {
    const now = new Date();
    const lots = await tx.stockItem.findMany({
      where: { facilityId: args.facilityId, medicamentId: args.medicamentId, quantity: { gt: 0 } },
    });

    const plan = planFefoConsumption(
      lots.map((l) => ({ stockItemId: l.id, lotCode: l.lotCode, quantity: l.quantity, expiryDate: l.expiryDate })),
      args.quantity,
      now,
    );
    if (!plan) {
      throw new ConflictException("Stock insuffisant pour la délivrance (RM-11-01)");
    }

    for (const pick of plan) {
      // Anti-TOCTOU (D-046) : décrément CONDITIONNEL — n'aboutit que si le lot a encore
      // assez d'unités au moment de l'écriture. Une course rendrait count === 0 → on jette.
      const { count } = await tx.stockItem.updateMany({
        where: { id: pick.stockItemId, quantity: { gte: pick.taken } },
        data: { quantity: { decrement: pick.taken } },
      });
      if (count === 0) {
        throw new ConflictException("Stock insuffisant pour la délivrance (course détectée, RM-11-01)");
      }
      await tx.stockMovement.create({
        data: {
          stockItemId: pick.stockItemId,
          facilityId: args.facilityId,
          type: StockMovementType.DISPENSE,
          quantity: -pick.taken, // signé négatif (RM-11-01)
          reference: args.reference,
          memberId: args.memberId ?? null,
        },
      });
    }

    // Un mouvement = stock vivant : la pharmacie reste publiable (RM-11-06, EF-11-08).
    await this.touchFreshness(tx, args.facilityId, now);

    return { lots: plan };
  }

  // ── C7 : disponibilité (briques de la recherche M12) ────────────────────────

  /**
   * Disponible réel d'un produit = somme des lots NON périmés (expiryDate > now, RM-11-03)
   * MOINS les ReservationLine de réservations ACTIVE de cette pharmacie pour ce produit
   * (RM-12-02 : pas de double promesse). Jamais < 0.
   *
   * `tx` optionnel (correctif D-046 anti sur-réservation) : quand M12 pose une réservation en
   * transaction SERIALIZABLE, il DOIT passer son `tx` ici pour que la lecture critique entre
   * dans le même snapshot — sinon la lecture (autocommit) sort de la transaction et PostgreSQL
   * SSI ne peut détecter le conflit lecture/écriture (deux poses concurrentes liraient le même
   * disponible et sur-réserveraient). Avec `tx`, l'une des deux transactions échoue (P2034).
   */
  async availableQuantity(
    facilityId: string,
    medicamentId: string,
    now: Date = new Date(),
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const freshAgg = await client.stockItem.aggregate({
      _sum: { quantity: true },
      where: { facilityId, medicamentId, expiryDate: { gt: now } },
    });
    const freshTotal = freshAgg._sum.quantity ?? 0;

    const reservedAgg = await client.reservationLine.aggregate({
      _sum: { quantity: true },
      where: {
        medicamentId,
        reservation: { facilityId, status: ReservationStatus.ACTIVE },
      },
    });
    const reservedTotal = reservedAgg._sum.quantity ?? 0;

    return publishableQuantity(freshTotal, reservedTotal);
  }

  /**
   * Une pharmacie publie sa disponibilité (RM-11-02) si elle :
   * 1) peut exercer (Badge Vérifié + contrat signé, C6) ;
   * 2) est fraîche (lastFreshAt < PM-33, RM-11-06, EF-11-08) ;
   * 3) n'est pas exclue par strikes (>= 3 ACTIVE en 30 j, EF-12-07).
   */
  async isPublishable(facilityId: string, now: Date = new Date()): Promise<boolean> {
    const { canPractice } = await this.status.getForFacility(facilityId);
    if (!canPractice) return false;

    const state = await this.prisma.facilityStockState.findUnique({ where: { facilityId } });
    const pm33 = await this.params.getInt("PM-33"); // secondes
    if (!isFresh(state?.lastFreshAt ?? null, pm33, now)) return false;

    return !(await this.isExcludedByStrikes(facilityId, now));
  }

  // ── EF-12-02 : recherche ANONYME par arrondissement ─────────────────────────

  /**
   * Résultat agrégé par arrondissement, STRICTEMENT anonyme (RM-11-04/05) : ni nom, ni
   * position, ni téléphone, ni facilityId, ni prix. Ne compte que les pharmacies publiables.
   * pharmacyCount = nb de pharmacies publiables couvrant AU MOINS un produit demandé avec
   * availableQuantity >= quantité.
   */
  async searchAnonymous(args: AnonymousSearchArgs): Promise<AnonymousDistrictResult[]> {
    const now = new Date();
    if (args.items.length === 0) return [];

    const districts = await this.listPharmacyDistricts(args.district);

    const results: AnonymousDistrictResult[] = [];
    for (const district of districts) {
      const facilityIds = await this.publishableFacilitiesInDistrict(district, now);

      const products = args.items.map((item) => ({ medicamentId: item.medicamentId, totalAvailable: 0, pharmaciesWithIt: 0 }));
      const productByMed = new Map(products.map((p) => [p.medicamentId, p]));
      const coveringFacilities = new Set<string>();

      for (const facilityId of facilityIds) {
        for (const item of args.items) {
          const qty = await this.availableQuantity(facilityId, item.medicamentId, now);
          if (qty <= 0) continue;
          const product = productByMed.get(item.medicamentId)!;
          product.totalAvailable += qty;
          if (qty >= item.quantity) {
            product.pharmaciesWithIt += 1;
            coveringFacilities.add(facilityId);
          }
        }
      }

      // N'apparaît que si au moins une pharmacie couvre un produit demandé.
      if (coveringFacilities.size > 0) {
        results.push({ district, pharmacyCount: coveringFacilities.size, products });
      }
    }
    return results;
  }

  // ── EF-12-03 : meilleure pharmacie de l'arrondissement ──────────────────────

  /**
   * Choisit la meilleure pharmacie publiable de l'arrondissement (hors excludeFacilityIds),
   * score documenté RM-12-04 : couverture max, puis fraîcheur, puis facilityId stable.
   * Retourne null si aucune ne couvre au moins un produit. SEUL le facilityId sort d'ici —
   * il n'est révélé au patient qu'après dévoilement (M12/M13), jamais en recherche anonyme.
   */
  async pickOptimalFacility(args: PickOptimalArgs): Promise<PickOptimalResult | null> {
    const now = new Date();
    if (args.items.length === 0) return null;

    const exclude = new Set(args.excludeFacilityIds ?? []);
    const facilityIds = (await this.publishableFacilitiesInDistrict(args.district, now)).filter((id) => !exclude.has(id));

    const candidates: FacilityCandidate[] = [];
    for (const facilityId of facilityIds) {
      let coverage = 0;
      for (const item of args.items) {
        if ((await this.availableQuantity(facilityId, item.medicamentId, now)) >= item.quantity) coverage += 1;
      }
      if (coverage === 0) continue;
      const state = await this.prisma.facilityStockState.findUnique({ where: { facilityId } });
      candidates.push({ facilityId, coverage, freshnessAt: state?.lastFreshAt ?? new Date(0) });
    }

    const best = pickOptimal(candidates);
    return best ? { facilityId: best.facilityId, coverage: best.coverage, freshnessAt: best.freshnessAt } : null;
  }

  // ── Internes ────────────────────────────────────────────────────────────────

  /** MAJ FacilityStockState.lastFreshAt = now (un mouvement ou une confirmation = stock frais). */
  async touchFreshness(tx: TxClient, facilityId: string, at: Date): Promise<void> {
    await tx.facilityStockState.upsert({
      where: { facilityId },
      create: { facilityId, lastFreshAt: at },
      update: { lastFreshAt: at },
    });
  }

  /**
   * Exclusion TEMPORAIRE (EF-12-07) : >= 3 strikes ACTIVE dans la FENÊTRE de comptage de 30 jours
   * (STRIKE_WINDOW_DAYS) déclenchent une exclusion d'une DURÉE de PM-34 jours, comptée depuis le
   * strike déclencheur (le plus récent). Au-delà de PM-34 sans nouveau strike, la pharmacie revient
   * — un nouveau strike rallonge la mise à l'écart. Les deux nombres sont distincts : 30 j = fenêtre
   * (constante de spec), PM-34 = durée d'exclusion (paramètre, jamais en dur — RT §3).
   */
  private async isExcludedByStrikes(facilityId: string, now: Date): Promise<boolean> {
    const since = new Date(now.getTime() - STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recent = await this.prisma.reliabilityStrike.findMany({
      where: { facilityId, status: StrikeStatus.ACTIVE, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: STRIKE_EXCLUSION_THRESHOLD,
      select: { createdAt: true },
    });
    if (!isExcludedByStrikes(recent.length)) return false; // < seuil → jamais exclue

    // Strike déclencheur = le plus récent (recent[0]) ; l'exclusion court PM-34 jours à partir de lui.
    const pm34Days = await this.params.getInt("PM-34");
    const exclusionEnd = recent[0]!.createdAt.getTime() + pm34Days * 24 * 60 * 60 * 1000;
    return now.getTime() < exclusionEnd;
  }

  /** Arrondissements des pharmacies (filtré si un district précis est demandé). */
  private async listPharmacyDistricts(district?: string): Promise<string[]> {
    if (district) return [district];
    const rows = await this.prisma.facility.findMany({
      where: { type: "PHARMACY" },
      distinct: ["district"],
      select: { district: true },
    });
    return rows.map((r) => r.district);
  }

  /** Pharmacies PUBLIABLES d'un arrondissement (vérifiées, fraîches, non exclues). */
  private async publishableFacilitiesInDistrict(district: string, now: Date): Promise<string[]> {
    const pharmacies = await this.prisma.facility.findMany({
      where: { type: "PHARMACY", district, status: "ACTIVE" },
      select: { id: true },
    });
    const ids: string[] = [];
    for (const p of pharmacies) {
      if (await this.isPublishable(p.id, now)) ids.push(p.id);
    }
    return ids;
  }
}

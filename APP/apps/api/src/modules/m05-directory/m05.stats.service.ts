/**
 * M05 — StatsService : indicateurs de réactivité et de notation (EF-05-01).
 * Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * Alimentation par les ÉVÉNEMENTS M06 (spec §7 « Consomme ») via l'outbox commun —
 * abonnements posés par M05DirectoryModule.onModuleInit, drain DÉJÀ pollé par M04 (ADR-11).
 *
 * Philosophie BEST-EFFORT assumée :
 * - un handler ne jette JAMAIS (pilule empoisonnée interdite : une exception bloquerait
 *   le drain commun et donc l'audit C5 de toute la plateforme) — échec = journalisé ;
 * - idempotence APPROCHÉE : un événement rejoué peut sur-compter à la marge. Acceptable
 *   pour des INDICATEURS publics (EF-05-01), contrairement à l'argent (RM-13-02) —
 *   le recalcul périodique complet (spec §5 « recalcul quotidien ») viendra avec M16/cron ;
 * - payloads attendus : { professionalId, delayS?, score? } — tout payload illisible est ignoré.
 */
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";

interface StatDeltas {
  initiations?: number;
  confirmed?: number;
  delayS?: number;
  ratingSum?: number;
  ratingCount?: number;
  incidents?: number;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
  ) {}

  /** m06.handshake.initiated → initiationsTotal++ (dénominateur du taux de confirmation). */
  async onHandshakeInitiated(payload: Record<string, unknown>): Promise<void> {
    const professionalId = this.professionalIdOf(payload, "m06.handshake.initiated");
    if (!professionalId) return;
    await this.apply(professionalId, { initiations: 1 });
  }

  /** m06.handshake.confirmed → confirmedTotal++ et cumul du délai de confirmation (s). */
  async onHandshakeConfirmed(payload: Record<string, unknown>): Promise<void> {
    const professionalId = this.professionalIdOf(payload, "m06.handshake.confirmed");
    if (!professionalId) return;
    const delayS = this.nonNegativeInt(payload.delayS) ?? 0; // délai absent = compté confirmé sans délai
    await this.apply(professionalId, { confirmed: 1, delayS });
  }

  /** m06.session.rated → cumul de notation (échelle PM-13 ; score hors échelle = ignoré). */
  async onSessionRated(payload: Record<string, unknown>): Promise<void> {
    const professionalId = this.professionalIdOf(payload, "m06.session.rated");
    if (!professionalId) return;
    const score = this.nonNegativeInt(payload.score);
    try {
      const [min, max] = await this.params.getIntList("PM-13");
      if (score === null || score < min || score > max) {
        this.logger.warn(`m06.session.rated ignoré : score hors échelle PM-13 (${String(payload.score)})`);
        return;
      }
    } catch (err) {
      this.logger.warn(`m06.session.rated ignoré : échelle PM-13 illisible (${(err as Error).message})`);
      return;
    }
    await this.apply(professionalId, { ratingSum: score, ratingCount: 1 });
  }

  /** m06.session.refunded → incidentsTotal++ (sessions remboursées, D-008) — pénalise la pertinence. */
  async onSessionRefunded(payload: Record<string, unknown>): Promise<void> {
    const professionalId = this.professionalIdOf(payload, "m06.session.refunded");
    if (!professionalId) return;
    await this.apply(professionalId, { incidents: 1 });
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  private professionalIdOf(payload: Record<string, unknown>, eventType: string): string | null {
    const id = payload.professionalId;
    if (typeof id === "string" && id.trim().length > 0) return id;
    this.logger.warn(`${eventType} ignoré : professionalId absent ou invalide`);
    return null;
  }

  private nonNegativeInt(value: unknown): number | null {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    return Number.isInteger(n) && n >= 0 ? n : null;
  }

  /**
   * Upsert incrémental de ProfessionalStats. Course possible sur la PREMIÈRE écriture
   * d'un professionnel (deux upserts concurrents → P2002) : un seul retry suffit alors,
   * la ligne existe et le chemin update s'applique. Tout autre échec est journalisé —
   * jamais relancé en exception (best-effort, voir l'en-tête).
   */
  private async apply(professionalId: string, d: StatDeltas, isRetry = false): Promise<void> {
    try {
      await this.prisma.professionalStats.upsert({
        where: { professionalId },
        create: {
          professionalId,
          initiationsTotal: d.initiations ?? 0,
          confirmedTotal: d.confirmed ?? 0,
          confirmDelaySumS: d.delayS ?? 0,
          ratingSum: d.ratingSum ?? 0,
          ratingCount: d.ratingCount ?? 0,
          incidentsTotal: d.incidents ?? 0,
        },
        update: {
          ...(d.initiations ? { initiationsTotal: { increment: d.initiations } } : {}),
          ...(d.confirmed ? { confirmedTotal: { increment: d.confirmed } } : {}),
          ...(d.delayS ? { confirmDelaySumS: { increment: d.delayS } } : {}),
          ...(d.ratingSum ? { ratingSum: { increment: d.ratingSum } } : {}),
          ...(d.ratingCount ? { ratingCount: { increment: d.ratingCount } } : {}),
          ...(d.incidents ? { incidentsTotal: { increment: d.incidents } } : {}),
        },
      });
    } catch (err) {
      if (!isRetry && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        await this.apply(professionalId, d, true);
        return;
      }
      this.logger.warn(`Indicateurs non mis à jour pour ${professionalId} : ${(err as Error).message}`);
    }
  }
}

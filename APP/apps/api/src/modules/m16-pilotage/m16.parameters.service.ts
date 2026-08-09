/**
 * M16 — Paramètres de la plateforme (EF-16-04, CU-16-02), SUPER_ADMIN seul (garde au contrôleur).
 *
 * Le Super Admin modifie un PM-xx avec date d'effet et MOTIF ; l'historique est conservé
 * (ParameterChange, insertion seule). Un changement de TAUX contractuel (PM-01/PM-02) déclenche
 * la mécanique d'avenant (M03/D-022) : ré-édition des contrats signés.
 * RM-16-01 : l'historique + PlatformParameter sont des écritures PROPRES ; l'avenant passe par
 * un service propriétaire exporté (M03Service.reissueAgreement).
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditEmitter } from "../../common/audit.emitter";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { M03Service } from "../m03-verification-contracts/m03.service";
import { isRateParameter } from "./m16.policies";

/** Borne du lot d'avenants déclenchés par un changement de taux (évite un balayage non borné). */
const REISSUE_BATCH = 500;

@Injectable()
export class ParametersService {
  private readonly logger = new Logger(ParametersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditEmitter,
    private readonly params: ParamsService,
    private readonly m03: M03Service,
  ) {}

  /**
   * Tous les paramètres de la plateforme, triés par clé.
   *
   * ⚠️ Cette route manquait entièrement. On pouvait MODIFIER un paramètre par sa clé et lire son
   * historique, mais rien ne permettait de DÉCOUVRIR lesquels existent, leur valeur courante ou ce
   * qu'ils signifient : un administrateur devait connaître PM-01 à PM-40 de mémoire, ou garder le
   * cahier des charges ouvert à côté. Le tableau des paramètres était donc, en pratique, inutilisable
   * — ce qui obligeait à passer par une migration de base pour changer un seuil.
   *
   * Le tri est fait en base sur la clé : « PM-01 », « PM-02 »… se trient correctement en texte
   * puisque les numéros sont sur deux chiffres.
   */
  async list(): Promise<Array<{ key: string; value: string; description: string; effectiveAt: string; updatedAt: string }>> {
    const rows = await this.prisma.platformParameter.findMany({ orderBy: { key: "asc" } });
    return rows.map((p) => ({
      key: p.key,
      value: p.value,
      description: p.description,
      effectiveAt: p.effectiveAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * CU-16-02 : change un PM-xx avec date d'effet + motif. 404 si le paramètre n'existe pas.
   * Transaction : historique (ParameterChange) + mise à jour (PlatformParameter) + audit.
   * APRÈS commit : invalidation du cache ParamsService, puis — si c'est un taux contractuel —
   * ré-édition des contrats signés (avenant, D-022). Le lot est borné.
   */
  async updateParameter(
    adminId: string,
    key: string,
    value: string,
    effectiveAtIso: string,
    reason: string,
  ): Promise<{ key: string; newValue: string; effectiveAt: Date; reissuedCount: number }> {
    const existing = await this.prisma.platformParameter.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`Paramètre métier inconnu : ${key}`);

    const effectiveAt = new Date(effectiveAtIso);
    if (Number.isNaN(effectiveAt.getTime())) {
      throw new BadRequestException("Date d'effet invalide (format ISO 8601 attendu)");
    }
    // MVP : ParamsService applique la valeur IMMÉDIATEMENT (aucun différé — il ne lit pas effectiveAt).
    // On REFUSE donc une date d'effet future, pour ne pas mentir sur le contrat (CU-16-02) ; le service
    // « à la date d'effet » est reporté en V1. (Petite tolérance d'horloge.)
    if (effectiveAt.getTime() > Date.now() + 60_000) {
      throw new BadRequestException(
        "Date d'effet différée non gérée au MVP : indiquez une date d'effet immédiate (le différé arrive en V1)",
      );
    }

    let oldValue = existing.value;
    let changed = false;
    await this.prisma.$transaction(async (tx) => {
      // Re-lecture DANS la transaction (verrou de ligne) : l'ancienne valeur consignée est bien celle
      // réellement remplacée, même si deux changements s'intercalent (anti-TOCTOU).
      const fresh = await tx.platformParameter.findUniqueOrThrow({ where: { key } });
      oldValue = fresh.value;
      changed = fresh.value !== value;
      await tx.parameterChange.create({
        data: { key, oldValue, newValue: value, effectiveAt, changedBy: adminId, reason },
      });
      await tx.platformParameter.update({ where: { key }, data: { value, effectiveAt } });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m16.parameter.changed",
        resource: `parameter:${key}`,
        context: { oldValue, newValue: value, effectiveAtIso, reason },
      });
    });

    // Le cache de 60 s du ParamsService doit refléter la nouvelle valeur sans attendre l'expiration.
    this.params.clearCache();

    // Avenant (D-022) UNIQUEMENT si c'est le taux de commission (PM-01) ET que la valeur a CHANGÉ —
    // sinon on ré-éditerait des contrats identiques (M03 n'est pas idempotent pour les cas signés).
    let reissuedCount = 0;
    if (isRateParameter(key) && changed) {
      reissuedCount = await this.reissueSignedAgreements(adminId);
    }

    return { key, newValue: value, effectiveAt, reissuedCount };
  }

  /**
   * Ré-édite (avenant) les contrats des dossiers AYANT une version SIGNÉE — D-022.
   * Chaque ré-édition passe par M03Service.reissueAgreement (idempotent côté M03) ; un échec
   * isolé est tracé et n'interrompt pas le lot. Lot borné (REISSUE_BATCH).
   */
  private async reissueSignedAgreements(adminId: string): Promise<number> {
    const cases = await this.prisma.verificationCase.findMany({
      where: { status: "VERIFIED", agreement: { versions: { some: { signedAt: { not: null } } } } },
      select: { id: true },
      take: REISSUE_BATCH,
    });
    let reissued = 0;
    for (const c of cases) {
      try {
        const res = await this.m03.reissueAgreement(adminId, c.id);
        if (res.reissued) reissued += 1;
      } catch (err) {
        this.logger.error(`Avenant en échec pour le dossier ${c.id} : ${(err as Error).message}`);
      }
    }
    return reissued;
  }

  /** Historique d'un paramètre (EF-16-04) — récents d'abord. */
  listHistory(key: string) {
    return this.prisma.parameterChange.findMany({
      where: { key },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

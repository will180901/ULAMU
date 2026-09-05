/**
 * M04 — routes audit & signalements.
 * POST /v1/reports : tout acteur authentifié (AuthGuard global, RM-02-03).
 * /v1/admin/* : AdminGuard — type ADMIN + sous-rôle (le TOTP n'est plus exigé, D-053) ; journal = tout admin,
 * file de modération = ADMIN_VERIFICATION (EF-04-06) ; SUPER_ADMIN passe partout.
 */
import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { AdminRole } from "@prisma/client";
import type { Response } from "express";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { CreateReportDto, DecideReportDto, IntegrityQueryDto, ListReportsQueryDto, QueryAuditDto } from "./m04.dto";
import { M04Service } from "./m04.service";

@Controller("v1")
@UseGuards(AdminGuard) // lit les métadonnées @AdminOnly — les routes sans décorateur restent non-admin
export class M04Controller {
  constructor(private readonly service: M04Service) {}

  // ── Signalements (EF-04-05 ; CU-04-03) ─────────────────────────────────────

  /** Tout utilisateur signale une cible — accusé de réception immédiat {reportId}. */
  @Post("reports")
  createReport(@Actor() actor: AuthenticatedActor, @Body() dto: CreateReportDto) {
    return this.service.createReport(actor, dto);
  }

  // ── Journal d'audit (EF-04-02/04 ; CU-04-02) ───────────────────────────────

  /** Vérification d'intégrité de la chaîne (EF-04-02) — tout admin ; acte audité (RM-04-02). */
  @AdminOnly()
  @Get("admin/audit/integrity")
  checkIntegrity(@Actor() actor: AuthenticatedActor, @Query() q: IntegrityQueryDto) {
    return this.service.checkIntegrity(actor.accountId, q.fromSeq, q.limit);
  }

  /** Consultation filtrée et paginée (EF-04-04) — la consultation est elle-même auditée (RM-04-02). */
  @AdminOnly()
  @Get("admin/audit")
  queryAudit(@Actor() actor: AuthenticatedActor, @Query() q: QueryAuditDto) {
    return this.service.queryAuditLog(actor.accountId, q);
  }

  /**
   * Export CSV du journal (EF-04-04) — lui-même audité ; PDF déclaré hors MVP (revue D-046).
   *
   * ⚠️ **`X-Export-Truncated` n'est pas décoratif.** L'export s'arrête à `EXPORT_MAX_ROWS`, et le
   * faisait en silence : un journal de 12 000 entrées rendait un fichier de 5 000 lignes ayant
   * toutes les apparences d'un export complet. L'écran lit cet en-tête plutôt que de recopier le
   * plafond — une constante dupliquée dans le web dériverait le jour où celle-ci change.
   *
   * `X-Export-Rows` évite au navigateur de recompter des lignes qu'il vient de recevoir, et rend
   * l'avertissement lisible : « 5 000 lignes, et il y en avait davantage ».
   */
  @AdminOnly()
  @Get("admin/audit/export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async exportAudit(
    @Actor() actor: AuthenticatedActor,
    @Query() q: QueryAuditDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { csv, rowCount, truncated } = await this.service.exportAuditCsv(actor.accountId, q);
    res.setHeader("X-Export-Rows", String(rowCount));
    res.setHeader("X-Export-Truncated", truncated ? "1" : "0");
    // Sans cet en-tête, `fetch` ne verrait ni l'un ni l'autre : seuls les en-têtes CORS exposés
    // traversent, et le web est servi depuis une autre origine que l'API.
    res.setHeader("Access-Control-Expose-Headers", "X-Export-Rows, X-Export-Truncated");
    return csv;
  }

  // ── File de modération (EF-04-06 ; CU-04-04) ───────────────────────────────

  /** File triée par ancienneté, marquage isOverdue (PM-23) — sans identité du signaleur (RM-04-04). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION)
  @Get("admin/reports")
  listReports(@Query() q: ListReportsQueryDto) {
    return this.service.listReports(q.status, q.limit);
  }

  /** Décision motivée — immuable, auditée ; le signaleur est notifié de l'issue (CU-04-03/04). */
  @AdminOnly(AdminRole.ADMIN_VERIFICATION)
  @Post("admin/reports/:id/decide")
  @HttpCode(200)
  decideReport(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: DecideReportDto) {
    return this.service.decideReport(actor.accountId, id, dto);
  }
}

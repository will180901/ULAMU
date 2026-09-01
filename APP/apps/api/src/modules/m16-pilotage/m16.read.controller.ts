/**
 * M16 — routes de LECTURE (EF-16-01/02/05).
 * AuthGuard global : tout est authentifié. Les tableaux de bord personnels vérifient l'accès
 * serveur (chacun ne voit que le sien). Les KPIs du pilote sont réservés à l'Équipe ULAMU.
 */
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { DashboardService } from "./m16.dashboard.service";
import { PilotKpiService } from "./m16.kpi.service";

@Controller("v1")
export class M16ReadController {
  constructor(
    private readonly dashboards: DashboardService,
    private readonly kpis: PilotKpiService,
  ) {}

  /** EF-16-01 : tableau de bord du professionnel connecté. */
  @Get("me/dashboard")
  professionalDashboard(@Actor() actor: AuthenticatedActor) {
    return this.dashboards.professionalDashboard(actor);
  }

  /** EF-16-01 : tableau de bord d'une structure dont l'acteur est membre actif. */
  @Get("me/facility/:facilityId/dashboard")
  facilityDashboard(@Actor() actor: AuthenticatedActor, @Param("facilityId") facilityId: string) {
    return this.dashboards.facilityDashboard(actor, facilityId);
  }

  /** EF-16-02 : Mon Espace patient (compteurs + reçus, jamais le Carnet). */
  @Get("me/space")
  patientSpace(@Actor() actor: AuthenticatedActor) {
    return this.dashboards.patientSpace(actor);
  }

  /**
   * EF-16-05 / CU-16-03 : les 7 KPIs du pilote. Réservé à l'Équipe ULAMU (tout sous-rôle).
   * AdminGuard impose le TOTP (RM-01-06) ; @AdminOnly() sans argument = n'importe quel admin.
   */
  @UseGuards(AdminGuard)
  @AdminOnly()
  @Get("admin/pilot-kpis")
  pilotKpis() {
    return this.kpis.getPilotKpis();
  }

  /**
   * S6 — la couverture par arrondissement (EF-16-05, famille 3 groupe E).
   *
   * Remplace six lignes écrites en dur dans la maquette E5. Agrégats seuls : un compte de soignants
   * exerçants et un compte d'officines actives par arrondissement, aucune donnée individuelle
   * (RM-16-05).
   */
  @UseGuards(AdminGuard)
  @AdminOnly()
  @Get("admin/coverage")
  coverage() {
    return this.kpis.couvertureParArrondissement();
  }
}

import { Module } from "@nestjs/common";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { M06HandshakeSessionModule } from "../m06-handshake-session/m06.module";
import { M09PrescriptionsModule } from "../m09-prescriptions/m09.module";
import { M13PaymentsModule } from "../m13-payments/m13.module";
import { M14NotificationsModule } from "../m14-notifications/m14.module";
import { M16ParametresPublicsController } from "./m16.parameters-publics.controller";
import { M16AdminController } from "./m16.admin.controller";
import { AdminService } from "./m16.admin.service";
import { DashboardService } from "./m16.dashboard.service";
import { PilotKpiService } from "./m16.kpi.service";
import { ParametersService } from "./m16.parameters.service";
import { M16ReadController } from "./m16.read.controller";
import { SchedulerService } from "./m16.scheduler.service";
import { SupportRequestService } from "./m16.support-requests.service";
import { SupportProcedureService } from "./m16.support.service";

/**
 * M16 — Pilotage & Administration (MVP réduit, D-026).
 * Spec : docs/cahier_des_charges/02_modules/M16_pilotage_administration.md
 *
 * RM-16-01 (la barrière) : le Pilotage LIT les domaines métier ; ses SEULES écritures propres
 * sont les sanctions (AccountSanction + application sur Account/LoginSession), l'historique des
 * paramètres (ParameterChange + PlatformParameter) et les procédures support (SupportProcedure).
 * Tout autre effet passe par un service exporté d'un module propriétaire (M13 remboursement,
 * M03 avenant) ou par les balayages des modules (cadencés ici, exécutés là-bas).
 *
 * Importe les modules dont il consomme les services EXPORTÉS :
 * - M13 : PaymentsService (gains, reçus, remboursement) + ReconciliationService (cron quotidien) ;
 * - M03 : M03Service (avenant D-022) + VerificationStatusService (lecture C6) ;
 * - M06 : SessionService / HandshakeService / ReportService (balayages D-008/PM-07/PM-30) ;
 * - M09 : PrescriptionService (balayage PM-10) ;
 * - M14 : NotificationsService (reprise critique EF-14-08, purge PM-37).
 *
 * Dépendances communes (PrismaService, ParamsService, AuditEmitter, OutboxService, AdminGuard)
 * fournies par CommonModule (@Global) — pas besoin de les ré-importer.
 *
 * NOTE ScheduleModule : les @Cron de SchedulerService nécessitent ScheduleModule.forRoot()
 * AU NIVEAU RACINE — c'est l'orchestrateur qui l'ajoute à app.module.ts (un seul forRoot par
 * application). Sans lui, les méthodes tickX() restent appelables manuellement (et testables),
 * mais ne se déclenchent pas automatiquement.
 */
@Module({
  imports: [
    M13PaymentsModule,
    M03VerificationContractsModule,
    M06HandshakeSessionModule,
    M09PrescriptionsModule,
    M14NotificationsModule,
  ],
  controllers: [M16ReadController, M16AdminController, M16ParametresPublicsController],
  providers: [
    PilotKpiService,
    DashboardService,
    AdminService,
    ParametersService,
    SupportProcedureService,
    SupportRequestService,
    SchedulerService,
  ],
})
export class M16PilotageModule {}

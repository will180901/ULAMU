import { join } from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { CommonModule } from "./common/common.module";
import { AuthGuard } from "./common/auth/auth.guard";
import { UserThrottlerGuard } from "./common/user-throttler.guard";
import { HealthController } from "./health.controller";
import { M01AccountsModule } from "./modules/m01-accounts/m01.module";
import { M02RolesStructuresModule } from "./modules/m02-roles-structures/m02.module";
import { M03VerificationContractsModule } from "./modules/m03-verification-contracts/m03.module";
import { M04AuditReportsModule } from "./modules/m04-audit-reports/m04.module";
import { M05DirectoryModule } from "./modules/m05-directory/m05.module";
import { M06HandshakeSessionModule } from "./modules/m06-handshake-session/m06.module";
import { M07HealthRecordModule } from "./modules/m07-health-record/m07.module";
import { M09PrescriptionsModule } from "./modules/m09-prescriptions/m09.module";
import { M13PaymentsModule } from "./modules/m13-payments/m13.module";
import { M14NotificationsModule } from "./modules/m14-notifications/m14.module";
import { M16PilotageModule } from "./modules/m16-pilotage/m16.module";
import { MediaModule } from "./modules/media/media.module";
import { OtaModule } from "./modules/ota/ota.module";

@Module({
  imports: [
    // Charge apps/api/.env dans process.env AVANT l'instanciation de Prisma (DATABASE_URL, API_PORT).
    ConfigModule.forRoot({ isGlobal: true }),
    // Fichiers statiques publics (ex. logo ULAMU pour l'email OTP — cf. common/email/email.service.ts,
    // les webmails comme Gmail retirent les <svg> inline et bloquent les data URI, il faut une vraie
    // URL http(s) accessible). process.cwd() plutôt que __dirname : "npm run dev"/"npm run start:prod"
    // ont tous deux pour cwd apps/api, alors que __dirname diffère entre dev (src/, ts-node-dev exécute
    // les .ts directement) et prod (dist/src/, tsc préserve le sous-dossier src/ dans l'outDir).
    ServeStaticModule.forRoot({ rootPath: join(process.cwd(), "public"), serveRoot: "/assets" }),
    CommonModule,
    // ScheduleModule.forRoot() (un seul par application) active les @Cron du SchedulerService M16 :
    // la cadence opérationnelle (D-008/PM-07/PM-08/PM-10/PM-30, réconciliation EF-13-09, purge PM-37).
    ScheduleModule.forRoot(),
    // Limite générale par utilisateur authentifié (repli IP sur les routes publiques, cf. UserThrottlerGuard).
    // Des routes sensibles (OTP, messages, paiement) posent une limite dédiée plus stricte via @Throttle().
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 150 }]),
    M01AccountsModule,
    M02RolesStructuresModule,
    M03VerificationContractsModule,
    M04AuditReportsModule,
    M05DirectoryModule,
    M06HandshakeSessionModule,
    M07HealthRecordModule,
    M09PrescriptionsModule,
    /* M11 (stocks) et M12 (recherche & dévoilement) sont RETIRÉS le 02/09/2026 — chantier 26.
       ULAMU couvre trois acteurs : le patient, le médecin, l'administration. La pharmacie n'en est
       pas un depuis D-051, et ces deux modules n'avaient plus personne pour les exploiter.
       Le référentiel médicaments, lui, est passé dans M09 : ce n'était pas une donnée de stock. */
    M13PaymentsModule,
    M14NotificationsModule,
    M16PilotageModule,
    MediaModule,
    OtaModule,
  ],
  controllers: [HealthController],
  providers: [
    // Authentification par défaut sur TOUTES les routes — @Public() pour les exceptions (RM-02-03).
    { provide: APP_GUARD, useClass: AuthGuard },
    // APRÈS AuthGuard : req.actor est déjà posé quand ce garde calcule sa clé de suivi par utilisateur.
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}

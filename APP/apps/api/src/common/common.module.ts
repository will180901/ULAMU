import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ParamsService } from "./params.service";
import { OutboxService } from "./outbox.service";
import { AuditEmitter } from "./audit.emitter";
import { AuthGuard } from "./auth/auth.guard";
import { AdminGuard } from "./auth/admin.guard";
import { DevSmsGateway, SMS_GATEWAY } from "./sms/sms.service";
import { AGGREGATOR_GATEWAY, DevAggregatorGateway } from "./momo/aggregator.gateway";
import { StorageService } from "./storage.service";

/** Socle transverse — global : chaque module l'utilise sans réimporter. */
@Global()
@Module({
  providers: [
    PrismaService,
    ParamsService,
    OutboxService,
    AuditEmitter,
    AuthGuard,
    AdminGuard,
    DevSmsGateway,
    { provide: SMS_GATEWAY, useExisting: DevSmsGateway },
    DevAggregatorGateway,
    { provide: AGGREGATOR_GATEWAY, useExisting: DevAggregatorGateway },
    StorageService,
  ],
  exports: [
    PrismaService,
    ParamsService,
    OutboxService,
    AuditEmitter,
    AuthGuard,
    AdminGuard,
    DevSmsGateway,
    SMS_GATEWAY,
    DevAggregatorGateway,
    AGGREGATOR_GATEWAY,
    StorageService,
  ],
})
export class CommonModule {}

import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ParamsService } from "./params.service";
import { OutboxService } from "./outbox.service";
import { AuditEmitter } from "./audit.emitter";
import { AuthGuard } from "./auth/auth.guard";
import { AdminGuard } from "./auth/admin.guard";
import { DevSmsGateway, SMS_GATEWAY } from "./sms/sms.service";
import { DevEmailGateway, EMAIL_GATEWAY, ResendEmailGateway } from "./email/email.service";
import { AGGREGATOR_GATEWAY, DevAggregatorGateway } from "./momo/aggregator.gateway";
import { StorageService } from "./storage.service";

// Resend seulement si une clé est configurée (prod/Render) — sinon la passerelle de dev journalise
// (même principe que SMS_GATEWAY/DevSmsGateway).
const emailGatewayProvider = process.env.RESEND_API_KEY
  ? { provide: EMAIL_GATEWAY, useClass: ResendEmailGateway }
  : { provide: EMAIL_GATEWAY, useClass: DevEmailGateway };

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
    emailGatewayProvider,
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
    EMAIL_GATEWAY,
    DevAggregatorGateway,
    AGGREGATOR_GATEWAY,
    StorageService,
  ],
})
export class CommonModule {}

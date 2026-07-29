import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ParamsService } from "./params.service";
import { OutboxService } from "./outbox.service";
import { AuditEmitter } from "./audit.emitter";
import { AuthGuard } from "./auth/auth.guard";
import { AdminGuard } from "./auth/admin.guard";
import { DevSmsGateway, SMS_GATEWAY } from "./sms/sms.service";
import { BrevoEmailGateway, DevEmailGateway, EMAIL_GATEWAY, ResendEmailGateway } from "./email/email.service";
import { AGGREGATOR_GATEWAY, DevAggregatorGateway } from "./momo/aggregator.gateway";
import { StorageService } from "./storage.service";

// Passerelle email choisie selon la clé présente, dans cet ordre :
//   1. Brevo — la production actuelle : livre à tout destinataire avec un simple expéditeur vérifié,
//      sans exiger de domaine (cf. BrevoEmailGateway) ;
//   2. Resend — conservé : redevient le meilleur choix le jour où un domaine ULAMU sera vérifié ;
//   3. sinon la passerelle de dev, qui journalise (même principe que SMS_GATEWAY/DevSmsGateway).
// JAMAIS de vrai envoi sous test : les suites d'intégration créent des dizaines de comptes, elles
// enverraient autant de vrais emails (et épuiseraient le quota du fournisseur). Aujourd'hui jest ne
// charge pas .env, donc les clés sont absentes de toute façon — cette garde évite que ça devienne faux
// silencieusement si un setupFile dotenv est ajouté un jour.
const emailGatewayProvider = (() => {
  if (process.env.NODE_ENV === "test") return { provide: EMAIL_GATEWAY, useClass: DevEmailGateway };
  if (process.env.BREVO_API_KEY) return { provide: EMAIL_GATEWAY, useClass: BrevoEmailGateway };
  if (process.env.RESEND_API_KEY) return { provide: EMAIL_GATEWAY, useClass: ResendEmailGateway };
  return { provide: EMAIL_GATEWAY, useClass: DevEmailGateway };
})();

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

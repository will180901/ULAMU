import { Logger, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { AuditChainService } from "./m04.audit-chain.service";
import { M04Controller } from "./m04.controller";
import { M04Service } from "./m04.service";

/**
 * M04 — Audit & Signalements (MVP Chantier 1).
 * Spec : docs/cahier_des_charges/02_modules/M04_audit_signalements.md
 * Consommateur C5 : s'abonne aux événements "audit.event" de l'outbox (EF-04-01) —
 * l'audit n'ajoute aucune latence aux modules émetteurs (CU-04-01), la file garantit zéro perte.
 * Exporte AuditChainService — M16 consommera verifyChain.
 */
@Module({
  controllers: [M04Controller],
  providers: [AuditChainService, M04Service],
  exports: [AuditChainService],
})
export class M04AuditReportsModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(M04AuditReportsModule.name);
  private drainTimer?: NodeJS.Timeout;
  private integrityTimer?: NodeJS.Timeout;
  private draining = false;

  // Cadences techniques (pas des paramètres métier) : relais outbox réactif,
  // balayage d'intégrité périodique (EF-04-02 « vérification automatique »).
  private static readonly DRAIN_INTERVAL_MS = 1_500;
  private static readonly INTEGRITY_INTERVAL_MS = 6 * 3_600_000;

  constructor(
    private readonly outbox: OutboxService,
    private readonly chain: AuditChainService,
    private readonly service: M04Service,
  ) {}

  onModuleInit(): void {
    // EF-04-01/02 : réception asynchrone des événements C5, chaînage par empreinte.
    // En cas d'échec TRANSITOIRE le handler jette — l'outbox rejouera (CU-04-01) ;
    // un payload définitivement illisible est mis en quarantaine (pas de pilule empoisonnée).
    this.outbox.on("audit.event", async (payload) => {
      await this.chain.append(payload);
    });

    // Le RELAIS de l'outbox (ADR-11) : sans lui, rien n'est consommé en production.
    this.drainTimer = setInterval(() => {
      if (this.draining) return; // pas de chevauchement
      this.draining = true;
      this.outbox
        .drain()
        .catch((err: Error) => this.logger.error(`Relais outbox en échec (rejeu au prochain tick) : ${err.message}`))
        .finally(() => {
          this.draining = false;
        });
    }, M04AuditReportsModule.DRAIN_INTERVAL_MS);

    // EF-04-02 : vérification périodique automatique + alerte critique en cas de rupture.
    this.integrityTimer = setInterval(() => {
      this.service
        .runIntegritySweep()
        .catch((err: Error) => this.logger.error(`Balayage d'intégrité en échec : ${err.message}`));
    }, M04AuditReportsModule.INTEGRITY_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.drainTimer) clearInterval(this.drainTimer);
    if (this.integrityTimer) clearInterval(this.integrityTimer);
  }
}

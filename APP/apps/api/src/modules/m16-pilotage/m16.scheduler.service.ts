/**
 * M16 — Cadence opérationnelle : les balayages temporels dé-scopés des chantiers précédents,
 * désormais déclenchés ici (M16 est le « chef d'orchestre » du temps de la plateforme).
 *
 * Chaque balayage reste implémenté dans son module propriétaire (RM-16-01) — M16 ne fait
 * qu'APPELER les méthodes publiques exportées. Chaque appel est entouré d'un try/catch qui LOG
 * l'erreur sans interrompre les autres : un balayage en échec ne bloque jamais la cadence.
 *
 * Les méthodes tickX() sont PUBLIQUES (testables et appelables manuellement) ; les @Cron ne
 * font que les invoquer. ScheduleModule.forRoot() est ajouté à la racine par l'orchestrateur
 * (app.module.ts) — voir la note dans m16.module.ts.
 */
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HandshakeService } from "../m06-handshake-session/m06.handshake.service";
import { ReportService } from "../m06-handshake-session/m06.report.service";
import { SessionService } from "../m06-handshake-session/m06.session.service";
import { PrescriptionService } from "../m09-prescriptions/m09.prescription.service";
import { ReconciliationService } from "../m13-payments/m13.reconciliation.service";
import { NotificationsService } from "../m14-notifications/m14.service";

/** Récapitulatif d'un tick : pour chaque étape, son résultat ou son erreur. */
export type TickSummary = Record<string, unknown>;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly sessions: SessionService,
    private readonly handshakes: HandshakeService,
    private readonly reports: ReportService,
    private readonly prescriptions: PrescriptionService,
    private readonly reconciliation: ReconciliationService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Balayages fréquents (chaque minute) ──────────────────────────────────────

  /**
   * D-008 / PM-07 / PM-10 / PM-08 : sessions à démarrer ou échues, poignées de main expirées,
   * ordonnances et dévoilements expirés. Le plus court délai utile fixe la cadence (1 min).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async runFrequent(): Promise<void> {
    await this.tickFrequent();
  }

  async tickFrequent(): Promise<TickSummary> {
    return this.collect({
      "m06.sweepOverduePreparing": () => this.sessions.sweepOverduePreparing(),
      "m06.sweepElapsedActive": () => this.sessions.sweepElapsedActive(),
      "m06.handshake.sweepExpired": () => this.handshakes.sweepExpired(),
      "m09.prescription.sweepExpired": () => this.prescriptions.sweepExpired(),
      /* « m12.disclosure.sweepExpired » retiré le 02/09/2026 (chantier 26) : les dévoilements
         n'existent plus, il n'y a plus de réservation de 24 h à faire expirer. */
    });
  }

  // ── Balayages horaires ────────────────────────────────────────────────────────

  /** PM-30 : relances de compte-rendu manquant ; EF-14-08 : reprise des notifications critiques. */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourly(): Promise<void> {
    await this.tickHourly();
  }

  async tickHourly(): Promise<TickSummary> {
    return this.collect({
      "m06.report.remindMissingReports": () => this.reports.remindMissingReports(),
      "m14.retryFailedCritical": () => this.notifications.retryFailedCritical(),
    });
  }

  // ── Balayages quotidiens ───────────────────────────────────────────────────────

  /** EF-13-09 : réconciliation finance quotidienne ; PM-37 : purge des notifications expirées. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDaily(): Promise<void> {
    await this.tickDaily();
  }

  async tickDaily(): Promise<TickSummary> {
    return this.collect({
      "m13.reconciliation.runDaily": () => this.reconciliation.runDaily("m16.scheduler"),
      "m14.purgeExpired": () => this.notifications.purgeExpired(),
    });
  }

  // ── Exécution résiliente ──────────────────────────────────────────────────────

  /**
   * Exécute chaque balayage SÉQUENTIELLEMENT, isolé dans un try/catch : un échec est LOGUÉ
   * et consigné dans le récapitulatif ({ error }) mais n'interrompt pas les suivants.
   */
  private async collect(steps: Record<string, () => Promise<unknown>>): Promise<TickSummary> {
    const summary: TickSummary = {};
    for (const [name, run] of Object.entries(steps)) {
      try {
        summary[name] = await run();
      } catch (err) {
        const message = (err as Error).message;
        this.logger.error(`Balayage ${name} en échec : ${message}`);
        summary[name] = { error: message };
      }
    }
    return summary;
  }
}

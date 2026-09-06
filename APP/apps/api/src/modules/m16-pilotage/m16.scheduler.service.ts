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
import { PrismaService } from "../../common/prisma.service";
import { StorageService } from "../../common/storage.service";
import { SWEEP_INTERVALS_MS, sweepIsDue } from "./m16.policies";
import { EarningsService } from "../m13-payments/m13.earnings.service";
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
    private readonly earnings: EarningsService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * ── Le rattrapage (chantier 57, 06/09/2026) ─────────────────────────────────────────────────
   *
   * ⚠️ **Les `@Cron` ci-dessous ne suffisent pas sur cet hébergement.** Render endort le service
   * après ~15 min d'inactivité, et un service endormi ne déclenche rien. Mesuré en production sur
   * 11,4 jours de journal : le balayage QUOTIDIEN a tourné **une seule fois**.
   *
   * Le tick d'une minute, lui, part dès que le service est éveillé — donc à la première requête
   * venue. On y regarde donc si les balayages plus lents sont EN RETARD, et on rattrape.
   *
   * Les `@Cron` restent : le jour où l'hébergement gardera le processus vivant, ils feront le
   * travail à l'heure et le rattrapage ne trouvera jamais rien à faire. Les deux chemins passent
   * par la même écriture conditionnelle, donc jamais deux fois.
   */
  private async rattraperSiDu(nom: "hourly" | "daily", travail: () => Promise<TickSummary>): Promise<TickSummary | null> {
    const dernier = await this.prisma.schedulerRun.findUnique({ where: { name: nom } });
    if (!sweepIsDue(dernier?.lastRunAt.getTime() ?? null, Date.now(), SWEEP_INTERVALS_MS[nom]!)) return null;

    /*
      Réservation CONDITIONNELLE avant de travailler (anti-TOCTOU, D-046) : deux instances — ou le
      `@Cron` et le rattrapage au même instant — ne doivent pas lancer le même balayage deux fois.
      Celui qui écrit gagne ; l'autre voit `count: 0` et s'abstient.
    */
    const maintenant = new Date();
    const limite = new Date(Date.now() - SWEEP_INTERVALS_MS[nom]!);
    const { count } = await this.prisma.schedulerRun.updateMany({
      where: { name: nom, lastRunAt: { lte: limite } },
      data: { lastRunAt: maintenant },
    });
    if (count === 0) {
      // Soit un autre vient de le prendre, soit la ligne n'existe pas encore : on la crée.
      if (dernier) return null;
      try {
        await this.prisma.schedulerRun.create({ data: { name: nom, lastRunAt: maintenant } });
      } catch {
        return null; // course au premier passage : l'autre l'a créée, il s'en charge
      }
    }
    this.logger.warn(`Balayage ${nom} en retard — rattrapage au réveil (chantier 57)`);
    return travail();
  }

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
      /* Chantier 57 : les balayages lents se rattrapent ici — voir `rattraperSiDu`. */
      "rattrapage.hourly": () => this.rattraperSiDu("hourly", () => this.tickHourly()),
      "rattrapage.daily": () => this.rattraperSiDu("daily", () => this.tickDaily()),
      /* « m12.disclosure.sweepExpired » retiré le 02/09/2026 (chantier 26) : les dévoilements
         n'existent plus, il n'y a plus de réservation de 24 h à faire expirer. */
    });
  }

  // ── Balayages horaires ────────────────────────────────────────────────────────

  /**
   * PM-30 : relances de compte-rendu manquant ; EF-14-08 : reprise des notifications critiques ;
   * et depuis le 06/09/2026 le rattrapage des **retraits orphelins** (chantier 50).
   *
   * ⚠️ Ce dernier est le seul balayage qui touche à de l'ARGENT DÉJÀ DÉBITÉ. Il est ici et pas dans
   * le tick d'une minute à dessein : un retrait en cours de confirmation ne doit jamais être
   * ramassé par erreur, et le balayage ne regarde de toute façon que ceux qui traînent depuis un
   * quart d'heure.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourly(): Promise<void> {
    await this.tickHourly();
  }

  async tickHourly(): Promise<TickSummary> {
    return this.collect({
      "m06.report.remindMissingReports": () => this.reports.remindMissingReports(),
      "m14.retryFailedCritical": () => this.notifications.retryFailedCritical(),
      "m13.sweepStuckWithdrawals": () => this.earnings.sweepStuckWithdrawals(),
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
      /* Chantier 51 : les fichiers que plus aucune ligne ne désigne. Quotidien — un orphelin ne
         fait de mal à personne dans la journée, et la lecture des références coûte cinq requêtes. */
      "storage.sweepOrphans": () => this.storage.sweepOrphans(),
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

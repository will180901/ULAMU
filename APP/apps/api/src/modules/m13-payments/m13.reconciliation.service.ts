/**
 * M13 — réconciliation quotidienne avec l'agrégateur (EF-13-09, CU-13-05).
 * Chaque franc est rapproché : tout écart déclenche une alerte Admin Finance immédiate —
 * aucun écart ne vieillit plus de 24 h.
 *
 * ⚠️ PAS DE SCHEDULER DÉDIÉ ICI (décision Chantier 2) : runDaily() est exposé via
 * POST /v1/admin/finance/reconcile et sera branché sur un cron par M16 (pilotage) —
 * comme le balayage d'intégrité M04, la cadence opérationnelle viendra avec M16.
 */
import { Inject, Injectable } from "@nestjs/common";
import { PaymentStatus, WithdrawalStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AGGREGATOR_GATEWAY, AggregatorGateway } from "../../common/momo/aggregator.gateway";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { PaymentsService } from "./m13.payments.service";
import { withdrawalFee } from "./m13.policies";

type LedgerKind = "CHARGE" | "REFUND" | "PAYOUT";

interface LedgerLine {
  aggregatorRef: string;
  kind: LedgerKind;
  amountXaf: number;
}

export interface ReconciliationReport {
  checkedAtIso: string;
  aggregatorLines: number;
  dbLines: number;
  /** Confirmé chez l'agrégateur, introuvable (ou non confirmé) en base. */
  missingInDb: LedgerLine[];
  /** Confirmé en base, introuvable chez l'agrégateur. */
  missingAtAggregator: LedgerLine[];
  /** Présent des deux côtés mais montants divergents. */
  amountMismatch: Array<{ aggregatorRef: string; kind: LedgerKind; dbAmountXaf: number; aggregatorAmountXaf: number }>;
  hasGaps: boolean;
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly audit: AuditEmitter,
    private readonly payments: PaymentsService,
    @Inject(AGGREGATOR_GATEWAY) private readonly gateway: AggregatorGateway,
  ) {}

  /** Rapprochement complet (ENF-08 : toute transaction traçable). `triggeredBy` = admin déclencheur. */
  async runDaily(triggeredBy?: string): Promise<ReconciliationReport> {
    // Côté agrégateur : le relevé des opérations confirmées (clé d'idempotence = aggregatorRef).
    const aggregatorLines = await this.gateway.listConfirmed();
    const aggregatorByKey = new Map<string, LedgerLine>();
    for (const line of aggregatorLines) {
      const key = `${line.kind}:${line.aggregatorRef}`;
      const prev = aggregatorByKey.get(key);
      // Doublon côté agrégateur (ex. double remboursement) : montants cumulés → l'écart ressort.
      aggregatorByKey.set(key, {
        aggregatorRef: line.aggregatorRef,
        kind: line.kind,
        amountXaf: (prev?.amountXaf ?? 0) + line.amountXaf,
      });
    }

    // Côté base : ce que NOUS considérons confirmé (la base est la vérité côté ULAMU).
    const expected = new Map<string, LedgerLine>();
    const payments = await this.prisma.payment.findMany({
      where: { status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED] } },
    });
    for (const p of payments) {
      const ref = p.aggregatorRef ?? p.id;
      expected.set(`CHARGE:${ref}`, { aggregatorRef: ref, kind: "CHARGE", amountXaf: p.amountXaf });
      if (p.status === PaymentStatus.REFUNDED) {
        expected.set(`REFUND:${ref}`, { aggregatorRef: ref, kind: "REFUND", amountXaf: -p.amountXaf });
      }
    }
    // Retraits exécutés : le virement part NET de commission ULAMU (PM-02 — 0 % en D-022).
    const pm02 = await this.params.getInt("PM-02");
    const withdrawals = await this.prisma.withdrawal.findMany({ where: { status: WithdrawalStatus.EXECUTED } });
    for (const w of withdrawals) {
      const ref = w.aggregatorRef ?? w.id;
      const netXaf = w.amountXaf - withdrawalFee(w.amountXaf, pm02);
      expected.set(`PAYOUT:${ref}`, { aggregatorRef: ref, kind: "PAYOUT", amountXaf: -netXaf });
    }

    // Rapprochement clé par clé (kind + aggregatorRef) — chaque franc compte (EF-13-09).
    const missingInDb: LedgerLine[] = [];
    const missingAtAggregator: LedgerLine[] = [];
    const amountMismatch: ReconciliationReport["amountMismatch"] = [];
    for (const [key, aggLine] of aggregatorByKey) {
      const dbLine = expected.get(key);
      if (!dbLine) missingInDb.push(aggLine);
      else if (dbLine.amountXaf !== aggLine.amountXaf) {
        amountMismatch.push({
          aggregatorRef: aggLine.aggregatorRef,
          kind: aggLine.kind,
          dbAmountXaf: dbLine.amountXaf,
          aggregatorAmountXaf: aggLine.amountXaf,
        });
      }
    }
    for (const [key, dbLine] of expected) {
      if (!aggregatorByKey.has(key)) missingAtAggregator.push(dbLine);
    }

    const hasGaps = missingInDb.length > 0 || missingAtAggregator.length > 0 || amountMismatch.length > 0;
    const report: ReconciliationReport = {
      checkedAtIso: new Date().toISOString(),
      aggregatorLines: aggregatorLines.length,
      dbLines: expected.size,
      missingInDb,
      missingAtAggregator,
      amountMismatch,
      hasGaps,
    };

    // Audit C5 + alerte critique aux Admin Finance en cas d'écart (CU-13-05) — même transaction.
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorId: triggeredBy,
        actorType: triggeredBy ? "admin" : "system",
        action: "m13.reconciliation.done",
        resource: "reconciliation:daily",
        context: {
          aggregatorLines: report.aggregatorLines,
          dbLines: report.dbLines,
          missingInDb: missingInDb.length,
          missingAtAggregator: missingAtAggregator.length,
          amountMismatch: amountMismatch.length,
          hasGaps,
        },
      });
      if (hasGaps) {
        await this.payments.notifyFinanceAdmins(tx, "m13.reconciliation.gap", {
          missingInDb: missingInDb.length,
          missingAtAggregator: missingAtAggregator.length,
          amountMismatch: amountMismatch.length,
          // Les références en cause (CU-13-05) — opaques, jamais d'entité métier (RM-13-01).
          refs: [...missingInDb, ...missingAtAggregator].slice(0, 20).map((l) => `${l.kind}:${l.aggregatorRef}`),
        });
      }
    });

    return report;
  }
}

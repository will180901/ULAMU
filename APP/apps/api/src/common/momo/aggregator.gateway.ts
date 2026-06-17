/**
 * Passerelle agrégateur Mobile Money (ADR-09) — interface unique, implémentation dev en mémoire.
 * RM-13-03 : ULAMU ne détient pas les fonds ; tout transite par l'agrégateur agréé.
 * Le choix du prestataire réel (CinetPay, FlutterWave…) reste ⚠️ ADR-09 — cette interface
 * est le contrat à implémenter alors. Critère vital déjà couvert : l'API de REMBOURSEMENT.
 */
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

export type MomoOperator = "MTN_MOMO" | "AIRTEL_MONEY";

export interface ChargeRequest {
  aggregatorRef: string; // notre référence (idempotence côté agrégateur)
  phone: string;
  amountXaf: number;
  operator: MomoOperator;
}

export interface PayoutRequest {
  aggregatorRef: string;
  phone: string;
  amountXaf: number;
  operator: MomoOperator;
}

export interface AggregatorGateway {
  /** Pousse la demande de paiement sur le téléphone du payeur (USSD). Confirmation asynchrone (webhook). */
  requestCharge(req: ChargeRequest): Promise<{ accepted: boolean }>;
  /** Rembourse un encaissement confirmé. */
  refundCharge(aggregatorRef: string): Promise<{ accepted: boolean }>;
  /** Virement sortant (retrait de gains). */
  requestPayout(req: PayoutRequest): Promise<{ accepted: boolean; executedRef: string }>;
  /** Relevé du jour côté agrégateur — base de la réconciliation (EF-13-09). */
  listConfirmed(): Promise<Array<{ aggregatorRef: string; amountXaf: number; kind: "CHARGE" | "REFUND" | "PAYOUT" }>>;
}

export const AGGREGATOR_GATEWAY = "AGGREGATOR_GATEWAY";

/**
 * Implémentation DEV : simule l'opérateur en mémoire. Le webhook est déclenché par
 * `confirmPending` (tests) ou automatiquement si `autoConfirm` est posé.
 */
@Injectable()
export class DevAggregatorGateway implements AggregatorGateway {
  private readonly logger = new Logger("MoMoDev");
  /** Demandes en attente de confirmation « téléphone » (CU-13-01). */
  readonly pending: ChargeRequest[] = [];
  readonly ledger: Array<{ aggregatorRef: string; amountXaf: number; kind: "CHARGE" | "REFUND" | "PAYOUT" }> = [];
  /** Webhook branché par M13 au démarrage (paiement confirmé/échoué). */
  onChargeResult?: (aggregatorRef: string, ok: boolean, reason?: string) => Promise<void>;
  /** Tests : force le prochain virement à échouer (vérifie le re-crédit automatique, CU-13-04). */
  failNextPayout = false;

  async requestCharge(req: ChargeRequest): Promise<{ accepted: boolean }> {
    this.pending.push(req);
    this.logger.log(`[DEV] Demande MoMo ${req.amountXaf} XAF → ${req.phone} (${req.operator})`);
    // DEV uniquement : si MOMO_AUTOCONFIRM_MS>0, simule la saisie du code par le payeur après
    // ce délai (le webhook confirme alors la charge). Les TESTS ne posent pas l'env → confirmation
    // MANUELLE via confirmPending inchangée. Permet au flux de paiement d'aboutir sur l'appareil.
    const autoMs = Number(process.env.MOMO_AUTOCONFIRM_MS ?? "0");
    if (process.env.NODE_ENV !== "test" && Number.isFinite(autoMs) && autoMs > 0) {
      const timer = setTimeout(() => {
        this.confirmPending(req.aggregatorRef, true).catch(() => undefined);
      }, autoMs);
      if (typeof timer.unref === "function") timer.unref();
    }
    return { accepted: true };
  }

  /** Simule la saisie du code MoMo par le payeur (ou son refus). */
  async confirmPending(aggregatorRef: string, ok = true, reason?: string): Promise<void> {
    const idx = this.pending.findIndex((p) => p.aggregatorRef === aggregatorRef);
    if (idx === -1) throw new Error(`Aucune demande en attente : ${aggregatorRef}`);
    const [req] = this.pending.splice(idx, 1);
    if (ok) this.ledger.push({ aggregatorRef: req!.aggregatorRef, amountXaf: req!.amountXaf, kind: "CHARGE" });
    if (this.onChargeResult) await this.onChargeResult(aggregatorRef, ok, reason);
  }

  async refundCharge(aggregatorRef: string): Promise<{ accepted: boolean }> {
    const charged = this.ledger.find((l) => l.aggregatorRef === aggregatorRef && l.kind === "CHARGE");
    if (!charged) return { accepted: false };
    this.ledger.push({ aggregatorRef, amountXaf: -charged.amountXaf, kind: "REFUND" });
    return { accepted: true };
  }

  async requestPayout(req: PayoutRequest): Promise<{ accepted: boolean; executedRef: string }> {
    if (this.failNextPayout) {
      this.failNextPayout = false;
      this.logger.warn(`[DEV] Virement MoMo REFUSÉ (simulé) pour ${req.aggregatorRef}`);
      return { accepted: false, executedRef: "" };
    }
    const executedRef = `payout-${randomUUID()}`;
    this.ledger.push({ aggregatorRef: req.aggregatorRef, amountXaf: -req.amountXaf, kind: "PAYOUT" });
    this.logger.log(`[DEV] Virement MoMo ${req.amountXaf} XAF → ${req.phone}`);
    return { accepted: true, executedRef };
  }

  async listConfirmed(): Promise<Array<{ aggregatorRef: string; amountXaf: number; kind: "CHARGE" | "REFUND" | "PAYOUT" }>> {
    return [...this.ledger];
  }
}

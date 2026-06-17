/**
 * Émetteur C5 — chaque module l'utilise pour journaliser (dans sa transaction).
 * RM-04-03 : le contexte ne contient JAMAIS de contenu médical.
 */
import { Injectable } from "@nestjs/common";
import { OutboxService, TxClient } from "./outbox.service";

export interface AuditEntry {
  actorId?: string;
  actorType?: "patient" | "professional" | "facility_member" | "admin" | "system";
  action: string;
  resource?: string;
  context?: Record<string, unknown>;
}

@Injectable()
export class AuditEmitter {
  constructor(private readonly outbox: OutboxService) {}

  async emit(tx: TxClient, entry: AuditEntry): Promise<void> {
    await this.outbox.emit(tx, {
      type: "audit.event",
      payload: {
        actorId: entry.actorId ?? null,
        actorType: entry.actorType ?? "system",
        action: entry.action,
        resource: entry.resource ?? null,
        context: entry.context ?? null,
        createdAtIso: new Date().toISOString(),
      },
    });
  }
}

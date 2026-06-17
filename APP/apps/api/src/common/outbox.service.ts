/**
 * Outbox (ADR-11) : les événements (audit C5, inter-modules, notifications C4) sont écrits
 * dans la MÊME transaction que l'action métier, puis relayés — zéro événement perdu.
 */
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export type TxClient = Prisma.TransactionClient | PrismaService;

export interface OutboxMessage {
  type: string;
  payload: Record<string, unknown>;
}

type Handler = (payload: Record<string, unknown>) => Promise<void>;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private handlers = new Map<string, Handler[]>();
  /** Un seul drain à la fois par processus — pas de double traitement (ADR-11). */
  private draining = false;

  constructor(private readonly prisma: PrismaService) {}

  /** À appeler DANS la transaction métier (tx) — c'est tout le motif outbox. */
  async emit(tx: TxClient, message: OutboxMessage): Promise<void> {
    await tx.outboxEvent.create({
      data: { type: message.type, payload: message.payload as Prisma.InputJsonValue },
    });
  }

  /** Abonnement d'un module consommateur (préfixe possible : "audit.", "m01."). */
  on(typeOrPrefix: string, handler: Handler): void {
    const list = this.handlers.get(typeOrPrefix) ?? [];
    list.push(handler);
    this.handlers.set(typeOrPrefix, list);
  }

  /** Relais : traite un lot d'événements en attente, dans l'ordre. Appelé par un scheduler (et par les tests). */
  async drain(batch = 50): Promise<number> {
    if (this.draining) return 0; // un drain est déjà en cours dans ce processus
    this.draining = true;
    try {
      return await this.drainBatch(batch);
    } finally {
      this.draining = false;
    }
  }

  private async drainBatch(batch: number): Promise<number> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: "asc" },
      take: batch,
    });
    for (const event of events) {
      for (const [key, handlers] of this.handlers) {
        if (event.type === key || event.type.startsWith(key)) {
          for (const h of handlers) {
            try {
              await h(event.payload as Record<string, unknown>);
            } catch (err) {
              this.logger.error(`Handler ${key} en échec sur ${event.type}: ${(err as Error).message}`);
              throw err; // on ne marque pas traité — l'événement sera rejoué
            }
          }
        }
      }
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    }
    return events.length;
  }
}

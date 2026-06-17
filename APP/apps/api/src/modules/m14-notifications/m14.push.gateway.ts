/**
 * M14 — Passerelle push (EF-14-02), locale au module.
 * En dev : journalise + capture (boîte `sent` pour les tests, panne simulable).
 * En production : FCM réel derrière la MÊME interface (ADR-08) — branché plus tard,
 * sans toucher au reste du module (il suffit de fournir un autre PUSH_GATEWAY).
 * RM-14-03 : title/body proviennent du catalogue — jamais de contenu médical.
 */
import { Injectable, Logger } from "@nestjs/common";

export interface PushMessage {
  accountId: string;
  title: string;
  body: string;
  category: string;
  priority: string;
}

export interface PushGateway {
  /** Envoie une notification push à l'appareil du compte — jette en cas d'échec (EF-14-08). */
  send(message: PushMessage): Promise<void>;
}

/** Jeton d'injection local au module M14 (FCM réel = ADR-08, plus tard). */
export const PUSH_GATEWAY = "PUSH_GATEWAY";

@Injectable()
export class DevPushGateway implements PushGateway {
  private readonly logger = new Logger("PUSH");
  /** Boîte de capture pour les tests/dev. */
  readonly sent: PushMessage[] = [];
  /** Tests EF-14-08 : nombre d'envois à faire échouer avant de réussir. */
  failNext = 0;

  async send(message: PushMessage): Promise<void> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error("Échec push simulé (dev)");
    }
    this.sent.push(message);
    this.logger.log(`[DEV] PUSH → ${message.accountId} [${message.category}/${message.priority}] ${message.title}`);
  }
}

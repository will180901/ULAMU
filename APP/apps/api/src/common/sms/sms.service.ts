/**
 * Passerelle SMS directe (RM-01-03) — l'OTP ne passe PAS par M14.
 * En dev : journalise. En production : fournisseur réel derrière la même interface.
 * Sécurité : les SMS ULAMU ne contiennent jamais de lien (menace T-13).
 */
import { Injectable, Logger } from "@nestjs/common";

export interface SmsGateway {
  send(phone: string, message: string): Promise<void>;
}

@Injectable()
export class DevSmsGateway implements SmsGateway {
  private readonly logger = new Logger("SMS");
  /** Boîte de capture pour les tests/dev. */
  readonly sent: Array<{ phone: string; message: string }> = [];

  async send(phone: string, message: string): Promise<void> {
    this.sent.push({ phone, message });
    this.logger.log(`[DEV] SMS → ${phone}: ${message}`);
  }
}

export const SMS_GATEWAY = "SMS_GATEWAY";

/**
 * Passerelle email (2026-07 — remplace le SMS pour l'inscription et la réinitialisation de mot de
 * passe, cf. décision utilisateur : SMS trial Twilio limité à 5 numéros vérifiés, inutilisable en
 * conditions réelles ; email = canal fiable dès maintenant, sans délai d'enregistrement opérateur).
 * En dev (RESEND_API_KEY absente) : journalise. En production : Resend (clé dans le tableau de bord
 * Render, jamais commitée — même principe que MOMO_WEBHOOK_SECRET/SECRETBOX_KEY).
 */
import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

export interface EmailGateway {
  send(to: string, subject: string, html: string): Promise<void>;
}

@Injectable()
export class DevEmailGateway implements EmailGateway {
  private readonly logger = new Logger("Email");
  /** Boîte de capture pour les tests/dev. */
  readonly sent: Array<{ to: string; subject: string; html: string }> = [];

  async send(to: string, subject: string, html: string): Promise<void> {
    this.sent.push({ to, subject, html });
    this.logger.log(`[DEV] Email → ${to} : ${subject}`);
  }
}

@Injectable()
export class ResendEmailGateway implements EmailGateway {
  private readonly logger = new Logger("Email");
  private readonly client = new Resend(process.env.RESEND_API_KEY);
  // Adresse d'envoi par défaut de Resend (mode « sandbox », sans domaine vérifié) — livrable
  // uniquement à l'adresse du compte Resend tant qu'aucun domaine n'est vérifié (cf. discussion).
  private readonly from = process.env.RESEND_FROM_EMAIL ?? "ULAMU <onboarding@resend.dev>";

  async send(to: string, subject: string, html: string): Promise<void> {
    const { error } = await this.client.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Échec d'envoi email → ${to} : ${error.message}`);
      throw new Error(`Envoi email impossible : ${error.message}`);
    }
  }
}

export const EMAIL_GATEWAY = "EMAIL_GATEWAY";

// Logo ULAMU pour l'en-tête de l'email OTP : servi en fichier statique réel (apps/api/public/logo-email.png,
// exposé via ServeStaticModule dans app.module.ts sous /assets) plutôt qu'en <svg> inline ou en <img> base64 —
// les deux ont été testés en conditions réelles avec Gmail et rejetés (svg retiré par sanitisation anti-XSS,
// data URI affiché comme image cassée) : seule une vraie URL http(s) fonctionne de façon fiable.
const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "https://ulamu-api.onrender.com";
const LOGO_URL = `${PUBLIC_API_URL}/assets/logo-email.png`;

/** Gabarit HTML de l'email OTP — branding ULAMU, pas de lien cliquable (même règle que le SMS, menace T-13). */
export function otpEmailTemplate(code: string, minutesValid: number): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4E4E7;">
            <tr>
              <td style="background:#2756A6;padding:28px 32px;text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="width:34px;height:34px;">
                      <img src="${LOGO_URL}" width="34" height="34" alt="ULAMU" style="display:block;width:34px;height:34px;border-radius:7px;" />
                    </td>
                    <td style="padding-left:10px;color:#FFFFFF;font-size:19px;font-weight:700;">ulamu</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:center;">
                <p style="margin:0 0 8px;font-size:14px;color:#71717A;">Votre code de vérification</p>
                <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:8px;color:#111112;">${code}</p>
                <p style="margin:0;font-size:13px;color:#71717A;">Valable ${minutesValid} minutes. Ne le partagez avec personne — ULAMU ne vous le demandera jamais par téléphone ou email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px;text-align:center;border-top:1px solid #E4E4E7;">
                <p style="margin:16px 0 0;font-size:12px;color:#A1A1AA;">Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

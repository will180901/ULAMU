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

/**
 * Brevo (ex-Sendinblue) — passerelle retenue pour la production. Raison : Brevo délivre à N'IMPORTE
 * QUEL destinataire dès qu'un simple EXPÉDITEUR est vérifié, sans posséder de domaine. Resend, lui,
 * exige un domaine vérifié : sans domaine il ne livre qu'à l'adresse du compte Resend, ce qui rendait
 * inscription, réinitialisation et 2FA impossibles pour tout autre utilisateur (503 systématique).
 *
 * Appel HTTP direct avec le `fetch` global de Node 20, plutôt qu'un SDK : aucune dépendance npm
 * ajoutée, donc rien de plus à installer ni à reconstruire au déploiement.
 */
@Injectable()
export class BrevoEmailGateway implements EmailGateway {
  private readonly logger = new Logger("Email");
  private readonly apiKey = process.env.BREVO_API_KEY ?? "";
  /** Doit être une adresse VÉRIFIÉE dans le compte Brevo, sinon l'API refuse l'envoi. */
  private readonly fromEmail = process.env.BREVO_FROM_EMAIL ?? "";
  private readonly fromName = process.env.BREVO_FROM_NAME ?? "ULAMU";

  async send(to: string, subject: string, html: string): Promise<void> {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": this.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      // Le corps de la réponse porte le motif exact (expéditeur non vérifié, quota du jour atteint…) :
      // on le journalise pour pouvoir diagnostiquer. Jamais le contenu du message, qui porte le code OTP.
      const detail = await res.text().catch(() => "");
      this.logger.error(`Échec d'envoi email → ${to} (HTTP ${res.status}) : ${detail}`);
      throw new Error(`Envoi email impossible (HTTP ${res.status})`);
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

/**
 * Avis de sécurité — « votre mot de passe a changé », « votre adresse a changé ».
 *
 * Même règle que le code de vérification : AUCUN lien cliquable (menace T-13). Un avis qui invite à
 * cliquer apprend à l'utilisateur un réflexe dont le hameçonnage vit. On décrit ce qui s'est passé,
 * et on laisse la personne revenir par ses propres moyens.
 */
export function avisSecuriteTemplate(titre: string, corps: string): string {
  return [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0F172A">',
    '<p style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64748B;margin:0 0 12px">ULAMU</p>',
    `<h1 style="font-size:19px;line-height:1.3;margin:0 0 12px">${titre}</h1>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 16px">${corps}</p>`,
    "<p style=\"font-size:12px;line-height:1.6;color:#64748B;margin:0\">Cet email est envoyé automatiquement. N'y répondez pas.</p>",
    "</div>",
  ].join("");
}

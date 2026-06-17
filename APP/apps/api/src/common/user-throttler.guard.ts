/**
 * ThrottlerGuard qui limite PAR UTILISATEUR authentifié (accountId), jamais par IP seule — plusieurs
 * comptes peuvent partager une IP derrière un même proxy/NAT. Repli sur l'IP pour les routes @Public()
 * (login, OTP…) où AuthGuard n'a pas encore posé req.actor à ce stade de la chaîne de gardes.
 */
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const actor = req.actor as { accountId?: string } | undefined;
    if (actor?.accountId) return `u:${actor.accountId}`;
    return `ip:${(req.ip as string | undefined) ?? "unknown"}`;
  }
}

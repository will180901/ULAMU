/**
 * Garde d'authentification : jeton de session opaque (Bearer), vérifié en base (EF-01-05).
 * Expiration par inactivité : desktop 30 min (ENF-07), mobile PM-20 glissant.
 * RM-02-03 : tout se vérifie côté serveur, à chaque requête.
 */
import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma.service";
import { ParamsService } from "../params.service";

export const IS_PUBLIC = "isPublic";
/** Routes publiques (inscription, connexion, OTP) — tout le reste est authentifié par défaut. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const DESKTOP_IDLE_SECONDS = 30 * 60; // ENF-07

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AuthenticatedActor {
  accountId: string;
  accountType: string;
  sessionId: string;
  client: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; actor?: AuthenticatedActor }>();
    const header = req.headers["authorization"];
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Jeton manquant");
    const token = header.slice(7).trim();

    const session = await this.prisma.loginSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { account: true },
    });
    if (!session || session.revokedAt) throw new UnauthorizedException("Session invalide");
    if (session.account.status !== "ACTIVE") throw new UnauthorizedException("Compte non actif");

    const idleSeconds = (Date.now() - session.lastActiveAt.getTime()) / 1000;
    const maxIdle = session.client === "desktop" ? DESKTOP_IDLE_SECONDS : await this.params.getInt("PM-20");
    if (idleSeconds > maxIdle) {
      await this.prisma.loginSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException("Session expirée");
    }

    await this.prisma.loginSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } });
    req.actor = {
      accountId: session.accountId,
      accountType: session.account.type,
      sessionId: session.id,
      client: session.client,
    };
    return true;
  }
}

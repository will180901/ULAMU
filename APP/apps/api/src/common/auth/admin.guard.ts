/**
 * Garde des routes d'administration (matrice M02 §5).
 * RM-01-06 : TOTP OBLIGATOIRE pour les admins — sans TOTP actif, aucune action admin.
 * RM-16-03 : le pouvoir sans trace n'existe pas — l'appelant audite ses actions.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthenticatedActor } from "./auth.guard";

export const ADMIN_ROLES = "adminRoles";
/** Restreint une route à certains sous-rôles admin (vide = tout admin). SUPER_ADMIN passe partout. */
export const AdminOnly = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES, roles);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ADMIN_ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (required === undefined) return true; // route non-admin

    const req = ctx.switchToHttp().getRequest<{ actor?: AuthenticatedActor }>();
    const actor = req.actor;
    if (!actor || actor.accountType !== "ADMIN") throw new ForbiddenException("Réservé à l'Équipe ULAMU");

    const assignment = await this.prisma.adminRoleAssignment.findUnique({ where: { accountId: actor.accountId } });
    if (!assignment) throw new ForbiddenException("Aucun sous-rôle admin attribué");

    const totp = await this.prisma.totpSecret.findUnique({ where: { accountId: actor.accountId } });
    if (!totp?.enabled) throw new ForbiddenException("TOTP obligatoire pour les actions admin (RM-01-06)");

    if (required.length > 0 && assignment.role !== "SUPER_ADMIN" && !required.includes(assignment.role)) {
      throw new ForbiddenException("Sous-rôle insuffisant (matrice M02)");
    }
    return true;
  }
}

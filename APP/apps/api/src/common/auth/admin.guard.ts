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

    /* RM-01-06 : TOTP obligatoire pour toute action admin. L'exigence est levable par variable
       d'environnement le temps de la construction, mais elle vaut `true` PAR DÉFAUT — et ce sens est
       délibéré. Un drapeau qu'on oublie de repositionner doit laisser le système fermé, jamais
       ouvert : supprimer la règle du code obligerait quelqu'un à *penser* à la réécrire avant la
       livraison, et personne n'y pense.
       ✅ 01/09/2026 : la variable a été RETIRÉE de Render et de `render.yaml`. L'exigence est donc
       active en production. Le drapeau reste lisible ici pour le développement local — et il est
       délibérément gardé plutôt que supprimé : le jour où quelqu'un le repose, ce commentaire dit
       ce qu'il lève. */
    if (process.env.ADMIN_REQUIRE_TOTP !== "false") {
      const totp = await this.prisma.totpSecret.findUnique({ where: { accountId: actor.accountId } });
      if (!totp?.enabled) throw new ForbiddenException("TOTP obligatoire pour les actions admin (RM-01-06)");
    }

    if (required.length > 0 && assignment.role !== "SUPER_ADMIN" && !required.includes(assignment.role)) {
      throw new ForbiddenException("Sous-rôle insuffisant (matrice M02)");
    }
    return true;
  }
}

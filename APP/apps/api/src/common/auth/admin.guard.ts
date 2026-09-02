/**
 * Garde des routes d'administration (matrice M02 §5).
 * RM-16-03 : le pouvoir sans trace n'existe pas — l'appelant audite ses actions.
 *
 * ── Le TOTP n'est plus exigé (02/09/2026, D-053) ──────────────────────────────────────────────
 *
 * RM-01-06 rendait le TOTP **obligatoire pour les comptes d'administration** : cette garde
 * répondait 403 sur toute route admin tant qu'il n'était pas activé. Décision du porteur du
 * 02/09/2026 : **le TOTP est optionnel pour TOUS les types de compte**, désactivé par défaut, et
 * chacun l'active ou le désactive comme il l'entend.
 *
 * Ce que la garde vérifie encore, et qui ne bouge pas : le compte est bien de type ADMIN, il porte
 * un sous-rôle, et ce sous-rôle couvre la route demandée. **Ce qui protège l'administration reste
 * donc l'authentification et la matrice M02** — plus un second facteur imposé.
 *
 * ⚠️ Ce que cela coûte, écrit ici parce que c'est ici qu'on le lira : la console d'administration
 * d'une plateforme de santé, ouverte sur internet, n'est plus protégée que par un mot de passe pour
 * qui ne l'active pas. Le risque est inscrit au §9 du plan d'exécution web, avec la recommandation
 * qui l'accompagne.
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

    /* Le contrôle du TOTP qui vivait ici est RETIRÉ (02/09/2026, D-053) — voir l'en-tête.

       `ADMIN_REQUIRE_TOTP` disparaît avec lui. Elle n'est plus lue nulle part : la laisser posée sur
       Render serait sans effet, mais autant le savoir en la cherchant. */

    if (required.length > 0 && assignment.role !== "SUPER_ADMIN" && !required.includes(assignment.role)) {
      throw new ForbiddenException("Sous-rôle insuffisant (matrice M02)");
    }
    return true;
  }
}

/**
 * La garde des routes d'administration — chantier 31, 02/09/2026.
 *
 * ── Pourquoi ce fichier n'existait pas, et pourquoi il existe maintenant ──────────────────────
 *
 * `AdminGuard` protège les sept écrans d'administration : type de compte, sous-rôle, et — jusqu'au
 * 02/09/2026 — second facteur obligatoire. **Aucun test ne l'a jamais couverte.** On s'en est aperçu
 * en lui retirant l'exigence de TOTP (D-053) : les 485 tests sont restés verts, ce qui ne prouvait
 * rien puisqu'aucun ne l'éprouvait.
 *
 * Une garde d'accès sans test est le pire endroit où avoir confiance : elle échoue en silence dans
 * le bon sens (tout le monde passe) et son défaut ne se voit qu'au premier abus.
 *
 * ── Ce que la garde vérifie encore ────────────────────────────────────────────────────────────
 *
 * Trois choses, dans cet ordre : le compte est de type ADMIN ; il porte un sous-rôle ; ce sous-rôle
 * couvre la route — SUPER_ADMIN passant partout. **Le TOTP n'en fait plus partie** (D-053) : il est
 * optionnel pour tous les types de compte.
 *
 * Le test verrouille les deux sens. Ce qui doit être refusé l'est, et — c'est le point de ce
 * chantier — **un administrateur SANS TOTP passe**. Sans cette seconde moitié, rien n'empêcherait de
 * remettre l'exigence par mégarde.
 *
 * Aucune base : `PrismaService` est simulé, comme dans `m05.offers.limits.spec.ts`.
 */
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AdminGuard } from "./admin.guard";
import { AuthenticatedActor } from "./auth.guard";

/** Un contexte d'exécution réduit à ce que la garde lit : l'acteur posé par `AuthGuard`. */
function contexte(actor: AuthenticatedActor | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ actor }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

/** Le `Reflector` ne sert qu'à dire quels sous-rôles la route exige — `undefined` = route non-admin. */
function reflector(roles: AdminRole[] | undefined): Reflector {
  return { getAllAndOverride: () => roles } as unknown as Reflector;
}

/** `role` = le sous-rôle attribué au compte, `null` = aucun. */
function prisma(role: AdminRole | null): PrismaService {
  return {
    adminRoleAssignment: { findUnique: jest.fn().mockResolvedValue(role === null ? null : { role }) },
  } as unknown as PrismaService;
}

const ADMIN: AuthenticatedActor = { accountId: "a1", accountType: "ADMIN" } as AuthenticatedActor;
const SOIGNANT: AuthenticatedActor = { accountId: "p1", accountType: "PROFESSIONAL" } as AuthenticatedActor;

describe("AdminGuard — qui entre dans l'administration", () => {
  it("laisse passer une route qui n'est pas d'administration", async () => {
    const garde = new AdminGuard(prisma(null), reflector(undefined));

    await expect(garde.canActivate(contexte(undefined))).resolves.toBe(true);
  });

  it("refuse un compte qui n'est pas de l'Équipe ULAMU", async () => {
    const garde = new AdminGuard(prisma("SUPER_ADMIN"), reflector([]));

    await expect(garde.canActivate(contexte(SOIGNANT))).rejects.toThrow(ForbiddenException);
  });

  it("refuse un compte d'administration sans sous-rôle attribué", async () => {
    const garde = new AdminGuard(prisma(null), reflector([]));

    await expect(garde.canActivate(contexte(ADMIN))).rejects.toThrow(/sous-rôle/i);
  });

  it("refuse un sous-rôle qui ne couvre pas la route (matrice M02)", async () => {
    const garde = new AdminGuard(prisma("ADMIN_FINANCE"), reflector(["ADMIN_VERIFICATION"]));

    await expect(garde.canActivate(contexte(ADMIN))).rejects.toThrow(/insuffisant/i);
  });

  it("laisse passer le SUPER_ADMIN sur une route réservée à un autre sous-rôle", async () => {
    const garde = new AdminGuard(prisma("SUPER_ADMIN"), reflector(["ADMIN_FINANCE"]));

    await expect(garde.canActivate(contexte(ADMIN))).resolves.toBe(true);
  });

  /*
    ── La moitié qui donne son sens à ce fichier (D-053) ────────────────────────────────────────

    Jusqu'au 02/09/2026, la garde lisait `totpSecret` et répondait 403 tant qu'il n'était pas
    activé. Le faux Prisma ci-dessus n'expose AUCUN `totpSecret` : si quelqu'un remet l'exigence, la
    garde lèvera sur un `findUnique` inexistant, et ce test tombera.

    C'est délibéré. Un test qui se contente d'attendre `true` ne dirait rien du chemin parcouru ;
    celui-ci échoue aussi bien si l'exigence revient que si elle revient mal écrite.
  */
  it("laisse passer un administrateur SANS second facteur activé", async () => {
    const garde = new AdminGuard(prisma("ADMIN_VERIFICATION"), reflector(["ADMIN_VERIFICATION"]));

    await expect(garde.canActivate(contexte(ADMIN))).resolves.toBe(true);
  });
});

/**
 * Un sous-rôle d'administration ne perd jamais son DERNIER titulaire (dette 8ter, 01/09/2026).
 *
 * ── Ce qui manquait ────────────────────────────────────────────────────────────────────────────
 *
 * Le serveur refusait qu'un SUPER_ADMIN se révoque lui-même — et rien d'autre. Retirer le
 * **dernier** administrateur Vérification, ou Finance, passait sans un mot : le domaine se
 * retrouvait sans personne, et seul un SUPER_ADMIN pouvait le réparer. La maquette E4 annonçait
 * pourtant ce garde-fou (« une case grisée signale le dernier porteur d'un sous-rôle ») ; la phrase
 * avait dû être retirée de l'écran, faute de mécanisme derrière.
 *
 * ── Pourquoi ces tests appellent le VRAI service ───────────────────────────────────────────────
 *
 * Les autres épreuves de ce dépôt recopient la règle et l'éprouvent à part, parce que le service
 * traîne Prisma derrière lui. Ici ce serait passer à côté : le défaut n'était pas dans la règle,
 * il était dans les **chemins** qui ne l'appelaient pas. Recopier la règle prouverait qu'elle
 * compte juste, pas qu'on la consulte avant de supprimer.
 *
 * On monte donc le vrai `M02Service` sur un faux Prisma — deux tables en mémoire suffisent, la
 * transaction se contentant de rendre le même client.
 *
 * ── Le cas que personne n'avait vu ─────────────────────────────────────────────────────────────
 *
 * La révocation n'est pas le seul chemin. `assignAdminRole` fait un **upsert** : donner un autre
 * rôle au dernier titulaire le lui fait quitter tout aussi sûrement, et c'est exactement ce que
 * propose le bouton « Changer le rôle » de E4. Pire — un SUPER_ADMIN unique pouvait s'attribuer à
 * lui-même un rôle moindre : la garde d'auto-révocation ne voyait rien passer, et comme seul un
 * SUPER_ADMIN peut attribuer des rôles, **plus personne n'aurait jamais pu en attribuer**.
 */
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { M02Service } from "./m02.service";

type Role = "SUPER_ADMIN" | "ADMIN_FINANCE" | "ADMIN_VERIFICATION" | "ADMIN_MAP";

/**
 * Le strict nécessaire : la table des attributions, et une transaction qui rend le même client.
 * Tout le reste des dépendances de `M02Service` reste indéfini — aucune des deux routes éprouvées
 * ici ne les touche.
 */
function monterService(attributions: Array<{ accountId: string; role: Role }>) {
  const table = [...attributions];
  const journal: Array<{ action: string; resource: string }> = [];

  const client = {
    account: {
      findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, type: "ADMIN" }),
    },
    adminRoleAssignment: {
      findUnique: async ({ where }: { where: { accountId: string } }) =>
        table.find((a) => a.accountId === where.accountId) ?? null,
      count: async ({ where }: { where: { role: Role; accountId: { not: string } } }) =>
        table.filter((a) => a.role === where.role && a.accountId !== where.accountId.not).length,
      delete: async ({ where }: { where: { accountId: string } }) => {
        const i = table.findIndex((a) => a.accountId === where.accountId);
        table.splice(i, 1);
      },
      upsert: async ({ where, update, create }: { where: { accountId: string }; update: { role: Role }; create: { accountId: string; role: Role } }) => {
        const existant = table.find((a) => a.accountId === where.accountId);
        if (existant) existant.role = update.role;
        else table.push({ accountId: create.accountId, role: create.role });
      },
    },
    loginSession: { updateMany: async () => ({ count: 0 }) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
  };

  const audit = { emit: async (_tx: unknown, e: { action: string; resource: string }) => void journal.push(e) };

  // Six dépendances depuis le 03/09 : `PermissionsService` est parti avec la moitié
  // « structures » du module (dette n°17).
  const service = new M02Service(
    client as never,
    undefined as never,
    undefined as never,
    audit as never,
    undefined as never,
    undefined as never,
  );
  return { service, table, journal };
}

describe("M02 — le dernier titulaire d'un sous-rôle", () => {
  describe("la révocation", () => {
    it("refuse de retirer le dernier administrateur Finance", async () => {
      const { service, table } = monterService([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "firmine", role: "ADMIN_FINANCE" },
      ]);

      await expect(service.revokeAdminRole("super", "firmine")).rejects.toBeInstanceOf(ConflictException);
      // Et le rôle est TOUJOURS là : refuser sans annuler ne servirait à rien.
      expect(table).toContainEqual({ accountId: "firmine", role: "ADMIN_FINANCE" });
    });

    it("dit quoi faire, au lieu de dire non", async () => {
      const { service } = monterService([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "patrick", role: "ADMIN_VERIFICATION" },
      ]);

      // Un refus sans issue laisse l'administrateur devant un bouton qui ne marche pas.
      await expect(service.revokeAdminRole("super", "patrick")).rejects.toThrow(/dernier administrateur Vérification/);
      await expect(service.revokeAdminRole("super", "patrick")).rejects.toThrow(/Nommez d'abord quelqu'un d'autre/);
    });

    it("accepte dès qu’un second titulaire existe", async () => {
      const { service, table } = monterService([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "firmine", role: "ADMIN_FINANCE" },
        { accountId: "chancelle", role: "ADMIN_FINANCE" },
      ]);

      await service.revokeAdminRole("super", "firmine");

      expect(table).toEqual([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "chancelle", role: "ADMIN_FINANCE" },
      ]);
    });

    it("laisse intacte la garde d’auto-révocation, qui existait déjà", async () => {
      const { service } = monterService([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "autre", role: "SUPER_ADMIN" },
      ]);

      // Deux SUPER_ADMIN : la nouvelle garde laisserait passer. L'ancienne, non.
      await expect(service.revokeAdminRole("super", "super")).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("le changement de rôle — le chemin qu’on avait oublié", () => {
    it("refuse de déplacer ailleurs le dernier administrateur Vérification", async () => {
      const { service, table } = monterService([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "patrick", role: "ADMIN_VERIFICATION" },
      ]);

      // « Changer le rôle » de E4 vide le sous-rôle aussi sûrement que « Révoquer ».
      await expect(service.assignAdminRole("super", "patrick", "ADMIN_MAP")).rejects.toBeInstanceOf(ConflictException);
      expect(table).toContainEqual({ accountId: "patrick", role: "ADMIN_VERIFICATION" });
    });

    it("empêche l’unique super-administrateur de se déclasser lui-même", async () => {
      const { service, table } = monterService([{ accountId: "super", role: "SUPER_ADMIN" }]);

      // Le cas irréparable : seul un SUPER_ADMIN attribue des rôles. S'il se déclasse, plus
      // personne ne peut en attribuer — y compris pour le remettre.
      await expect(service.assignAdminRole("super", "super", "ADMIN_MAP")).rejects.toThrow(/irréparable/);
      expect(table).toEqual([{ accountId: "super", role: "SUPER_ADMIN" }]);
    });

    it("laisse ré-attribuer le MÊME rôle : on ne quitte rien", async () => {
      const { service, table } = monterService([{ accountId: "super", role: "SUPER_ADMIN" }]);

      // Refuser ici serait un faux positif : le sous-rôle garde exactement son titulaire.
      await service.assignAdminRole("super", "super", "SUPER_ADMIN", "confirmation annuelle");

      expect(table).toEqual([{ accountId: "super", role: "SUPER_ADMIN" }]);
    });

    it("laisse promouvoir un compte qui n’avait aucun rôle", async () => {
      const { service, table } = monterService([{ accountId: "super", role: "SUPER_ADMIN" }]);

      await service.assignAdminRole("super", "chancelle", "ADMIN_FINANCE");

      expect(table).toContainEqual({ accountId: "chancelle", role: "ADMIN_FINANCE" });
    });

    it("laisse déplacer un titulaire dès qu’un autre couvre son sous-rôle", async () => {
      const { service, table } = monterService([
        { accountId: "super", role: "SUPER_ADMIN" },
        { accountId: "firmine", role: "ADMIN_FINANCE" },
        { accountId: "chancelle", role: "ADMIN_FINANCE" },
      ]);

      await service.assignAdminRole("super", "firmine", "ADMIN_MAP");

      expect(table).toContainEqual({ accountId: "firmine", role: "ADMIN_MAP" });
      expect(table).toContainEqual({ accountId: "chancelle", role: "ADMIN_FINANCE" });
    });
  });
});

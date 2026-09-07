/**
 * La file des demandes de bannissement — chantier 67, 07/09/2026 (EF-16-07).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ `approveBan` et `rejectBan` n'existaient que **par identifiant de sanction**, et aucune route
 * ne permettait de le découvrir. La double validation était donc **inapplicable en pratique** : le
 * second administrateur ne pouvait pas savoir qu'on l'attendait, ni sur quoi.
 *
 * Sur l'acte le plus lourd de la plateforme — exclure quelqu'un définitivement — une demande
 * restait dans un état que rien ne pouvait résoudre, et le compte visé restait actif.
 *
 * C'est exactement le trou qu'avait la file des remboursements manuels avant qu'on l'ouvre. Trouvé
 * en balayant les capacités du client web qu'aucun écran n'appelle.
 *
 * Trois propriétés sont verrouillées ici :
 *
 *   1. **les demandes EN ATTENTE d'abord, les plus anciennes en tête** — un compte reste actif
 *      pendant qu'on attend, et l'ordre est ce qui transforme une liste en file de travail ;
 *   2. **le NOM du compte visé et celui du demandeur** — approuver une exclusion définitive en ne
 *      lisant qu'un identifiant tronqué n'est pas une décision, c'est un clic ;
 *   3. **`requestedBy` est rendu** — sans lui, l'écran ne peut pas dire AVANT le clic que
 *      l'approbateur doit être quelqu'un d'autre, et laisse le serveur refuser après.
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { PrismaService } from "../../common/prisma.service";
import { AdminService } from "./m16.admin.service";

interface SanctionFausse {
  id: string;
  accountId: string;
  type: string;
  reason: string;
  requestedBy: string;
  approvedBy: string | null;
  status: string;
  createdAt: Date;
  decidedAt: Date | null;
}

const JOUR = 86_400_000;

const sanction = (o: Partial<SanctionFausse> = {}): SanctionFausse => ({
  id: "s-1",
  accountId: "cible-1",
  type: "BAN",
  reason: "Propos menaçants répétés après avertissement.",
  requestedBy: "admin-1",
  approvedBy: null,
  status: "PENDING_SECOND_APPROVAL",
  createdAt: new Date(Date.now() - 2 * JOUR),
  decidedAt: null,
  ...o,
});

/**
 * Prisma réduit à ce que la méthode touche — le `where` ET le `orderBy` sont APPLIQUÉS ici.
 *
 * Une doublure qui trierait d'elle-même laisserait passer un code ayant cessé de demander l'ordre ;
 * une doublure qui rendrait tout ne prouverait rien du filtre.
 */
function service(sanctions: SanctionFausse[]): AdminService {
  const prisma = {
    accountSanction: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { type: string; status?: string };
        orderBy?: Array<{ status?: "asc" | "desc"; createdAt?: "asc" | "desc" }>;
      }) => {
        const gardees = sanctions.filter((s) => s.type === where.type && (!where.status || s.status === where.status));
        for (const critere of [...(orderBy ?? [])].reverse()) {
          if (critere.status) {
            const sens = critere.status === "asc" ? 1 : -1;
            gardees.sort((a, b) => sens * a.status.localeCompare(b.status));
          }
          if (critere.createdAt) {
            const sens = critere.createdAt === "asc" ? 1 : -1;
            gardees.sort((a, b) => sens * (a.createdAt.getTime() - b.createdAt.getTime()));
          }
        }
        return gardees;
      },
    },
    account: {
      findMany: async () => [
        {
          id: "cible-1",
          status: "ACTIVE",
          patientProfile: { firstName: "Jean", lastName: "Loemba" },
          professionalProfile: null,
          facilityMemberProfile: null,
        },
        {
          id: "admin-1",
          status: "ACTIVE",
          patientProfile: null,
          professionalProfile: null,
          facilityMemberProfile: { firstName: "Sylvie", lastName: "Ngouabi" },
        },
      ],
    },
  } as unknown as PrismaService;

  return new AdminService(
    prisma,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
}

describe("La file des bannissements — ce qu'elle rend", () => {
  it("nomme le compte visé et le demandeur, pas seulement leurs identifiants", async () => {
    const [ligne] = await service([sanction()]).listSanctions();

    expect(ligne.accountName).toBe("Jean Loemba");
    expect(ligne.requestedByName).toBe("Sylvie Ngouabi");
    expect(ligne.reason).toContain("menaçants");
  });

  /*
    Sans `requestedBy`, l'écran ne peut pas dire AVANT le clic que l'approbateur doit être un autre
    administrateur — il laisserait le serveur refuser après coup, sur un geste qu'on croyait acquis.
  */
  it("rend le demandeur, dont dépend toute la double validation", async () => {
    const [ligne] = await service([sanction()]).listSanctions();
    expect(ligne.requestedBy).toBe("admin-1");
  });

  it("dit l'état ACTUEL du compte visé — une demande peut viser un compte déjà suspendu", async () => {
    const [ligne] = await service([sanction()]).listSanctions();
    expect(ligne.accountStatus).toBe("ACTIVE");
  });

  it("ne rend rien quand aucune demande n'existe", async () => {
    expect(await service([]).listSanctions()).toEqual([]);
  });
});

describe("La file des bannissements — son ordre et son filtre", () => {
  /*
    Les plus anciennes en tête : elles attendent depuis le plus longtemps, et pendant ce temps le
    compte visé reste actif. L'ordre est ce qui transforme une liste en file de travail.
  */
  it("met les demandes les plus anciennes en tête", async () => {
    const vieille = sanction({ id: "s-vieille", createdAt: new Date(Date.now() - 30 * JOUR) });
    const recente = sanction({ id: "s-recente", createdAt: new Date(Date.now() - 1 * JOUR) });
    const lignes = await service([recente, vieille]).listSanctions();
    expect(lignes.map((l) => l.sanctionId)).toEqual(["s-vieille", "s-recente"]);
  });

  it("se filtre sur les demandes encore en attente", async () => {
    const attente = sanction({ id: "s-attente", status: "PENDING_SECOND_APPROVAL" });
    const tranchee = sanction({ id: "s-tranchee", status: "EXECUTED", decidedAt: new Date() });
    const lignes = await service([attente, tranchee]).listSanctions("PENDING_SECOND_APPROVAL" as never);
    expect(lignes.map((l) => l.sanctionId)).toEqual(["s-attente"]);
  });

  /*
    Une SUSPENSION n'est pas un bannissement : elle s'applique immédiatement et ne demande aucun
    second accord. La mêler à cette file ferait chercher une décision là où il n'y en a pas à prendre.
  */
  it("ne mélange pas les suspensions aux bannissements", async () => {
    const suspension = sanction({ id: "s-susp", type: "SUSPENSION", status: "EXECUTED" });
    const lignes = await service([sanction(), suspension]).listSanctions();
    expect(lignes.map((l) => l.sanctionId)).toEqual(["s-1"]);
  });
});

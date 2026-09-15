/**
 * Parcourir les avis d'un soignant — chantier 123, 15/09/2026 (EF-05-07 ; CU-05-02).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Il n'existait aucun moyen de lire les avis au-delà des dix derniers.** La fiche servait
 * `latestComments` : dix, sans curseur, sans tri, sans filtre, et sans dire qu'il y en avait
 * d'autres. Question du porteur, le 15/09 : *« supposant qu'on atteint une grande audience,
 * comment les avis vont s'afficher ? »* — la réponse honnête était : dix, toujours les dix mêmes,
 * et les trois cent quatre-vingt-dix autres inaccessibles à jamais.
 *
 * > **Une moyenne sans ses avis est un chiffre qu'on doit croire sur parole.**
 *
 * ── Les trois choses que ces tests tiennent ──────────────────────────────────────────────────
 *
 * 1. **On peut tout parcourir**, page après page, sans jamais revoir ni sauter une ligne.
 * 2. **Aucun identifiant de patient ne sort.** Décision du porteur, prise en connaissance de
 *    cause le 15/09 : « Mireille a consulté le Dr X » est une information médicale sur une
 *    personne identifiable. À la place, la FIDÉLITÉ — *quelqu'un qui revient est le signal le plus
 *    fort qui existe, et il ne nomme personne.*
 * 3. **Un compte suspendu ne laisse pas ses avis lisibles par leur seule URL.**
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { NotFoundException } from "@nestjs/common";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { DirectoryService } from "./m05.directory.service";
import { PresenceService } from "./m05.presence.service";

const PRO = "pro-1";

interface Avis {
  sessionId: string;
  patientId: string;
  score: number;
  comment: string | null;
  createdAt: Date;
}

/** Ce que le service demande à Prisma, reproduit à la main : tri, curseur, take, filtre. */
function monter(avis: Avis[], options: { visible?: boolean; seances?: Record<string, number> } = {}) {
  const { visible = true, seances = {} } = options;
  let dernierWhere: unknown = null;
  /*
    ⚠️ **La graine change à CHAQUE requête**, et c'est le cœur du filet. Un mélange identique d'un
    appel à l'autre serait reproductible… et parfaitement inoffensif : le curseur retrouverait
    toujours sa place. PostgreSQL, lui, peut rendre deux ordres différents pour deux requêtes
    identiques quand rien ne départage les lignes.

    *Un désordre qui se répète à l'identique n'est plus un désordre.* Elle reste déterministe à
    l'échelle du test, donc un échec se rejoue.
  */
  let requete = 0;

  const prisma = {
    professionalProfile: {
      findFirst: async () => (visible ? { accountId: PRO } : null),
    },
    sessionRating: {
      findMany: async (args: {
        where: { score?: number; comment?: { not: null } };
        orderBy: Array<Record<string, "asc" | "desc">>;
        take: number;
        cursor?: { sessionId: string };
        skip?: number;
      }) => {
        dernierWhere = args.where;
        let rows = [...avis];
        if (args.where.score !== undefined) rows = rows.filter((r) => r.score === args.where.score);
        // Le bouchon honore CE filtre-là aussi : sans quoi l'ajouter au service ne changerait rien
        // au test, et le test prouverait l'inverse de ce qu'il croit prouver.
        if (args.where.comment !== undefined) rows = rows.filter((r) => r.comment !== null);
        /*
          ⚠️ **On mélange AVANT de trier, et ce n'est pas un caprice.** `Array.prototype.sort` est
          stable : à critères égaux, il conserve l'ordre d'insertion. PostgreSQL, lui, ne garantit
          RIEN sur les lignes de rang égal. Un bouchon stable rendrait donc un curseur sans
          départage unique parfaitement fiable ici, et catastrophique en production.

          *Un bouchon plus gentil que la base ne teste pas le code : il teste le bouchon.* Le
          mélange est déterministe (graine fixe) pour que l'échec, quand il vient, soit reproductible.
        */
        let graine = 7 + ++requete * 104729;
        const aleatoire = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648);
        for (let i = rows.length - 1; i > 0; i--) {
          const j = Math.floor(aleatoire() * (i + 1));
          [rows[i], rows[j]] = [rows[j], rows[i]];
        }
        rows.sort((a, b) => {
          for (const critere of args.orderBy) {
            const [champ, sens] = Object.entries(critere)[0] as [keyof Avis, "asc" | "desc"];
            const va = a[champ] as string | number | Date;
            const vb = b[champ] as string | number | Date;
            if (va < vb) return sens === "asc" ? -1 : 1;
            if (va > vb) return sens === "asc" ? 1 : -1;
          }
          return 0;
        });
        if (args.cursor) {
          const i = rows.findIndex((r) => r.sessionId === args.cursor!.sessionId);
          rows = i === -1 ? [] : rows.slice(i + (args.skip ?? 0));
        }
        return rows.slice(0, args.take);
      },
      count: async (args: { where: { score?: number } }) =>
        args.where.score === undefined ? avis.length : avis.filter((r) => r.score === args.where.score).length,
    },
    careSession: {
      groupBy: async (args: { where: { patientAccountId: { in: string[] } } }) =>
        args.where.patientAccountId.in.map((id) => ({ patientAccountId: id, _count: { _all: seances[id] ?? 1 } })),
    },
  } as unknown as PrismaService;

  const params = { getInt: async () => 300, getIntList: async () => [1, 5] } as unknown as ParamsService;
  const service = new DirectoryService(prisma, params, {} as PresenceService);
  return { service, dernierWhere: () => dernierWhere };
}

const avis = (n: number, score: number, jour: number, patient = `pat-${n}`, comment: string | null = `avis ${n}`): Avis => ({
  sessionId: `s-${String(n).padStart(3, "0")}`,
  patientId: patient,
  score,
  comment,
  createdAt: new Date(Date.UTC(2026, 8, jour)),
});

describe("Parcourir les avis", () => {
  /*
    ⚠️ LE test de ce chantier : quatre cents avis ne se réduisent plus à dix.
  */
  it("rend le TOTAL, pas seulement la page servie", async () => {
    const beaucoup = Array.from({ length: 400 }, (_, i) => avis(i, (i % 5) + 1, (i % 28) + 1));
    const { service } = monter(beaucoup);

    const page = await service.getReviews(PRO, {});

    expect(page.total).toBe(400);
    expect(page.items).toHaveLength(20); // page par défaut
    expect(page.nextCursor).not.toBeNull();
  });

  /*
    Sans ordre TOTAL, deux pages successives rendent deux fois la même ligne et en sautent une
    autre — le défaut classique d'un curseur posé sur un champ non unique.
  */
  it("ne rend jamais deux fois le même avis, ni n’en saute", async () => {
    const tous = Array.from({ length: 25 }, (_, i) => avis(i, 3, 1)); // MÊME note, MÊME jour
    const { service } = monter(tous);

    const p1 = await service.getReviews(PRO, { limit: 10, sort: "best" });
    const p2 = await service.getReviews(PRO, { limit: 10, sort: "best", cursor: p1.nextCursor! });
    const p3 = await service.getReviews(PRO, { limit: 10, sort: "best", cursor: p2.nextCursor! });

    const vus = [...p1.items, ...p2.items, ...p3.items].map((r) => r.comment);
    expect(vus).toHaveLength(25);
    expect(new Set(vus).size).toBe(25);
    expect(p3.nextCursor).toBeNull(); // la dernière page ne promet pas de suite
  });

  it("trie du meilleur au pire, et l’inverse", async () => {
    const { service } = monter([avis(1, 5, 1), avis(2, 1, 2), avis(3, 3, 3)]);

    const meilleurs = await service.getReviews(PRO, { sort: "best" });
    const pires = await service.getReviews(PRO, { sort: "worst" });

    expect(meilleurs.items.map((r) => r.score)).toEqual([5, 3, 1]);
    expect(pires.items.map((r) => r.score)).toEqual([1, 3, 5]);
  });

  it("montre les plus récents par défaut", async () => {
    const { service } = monter([avis(1, 5, 1), avis(2, 4, 20), avis(3, 3, 10)]);

    const page = await service.getReviews(PRO, {});

    expect(page.items.map((r) => r.comment)).toEqual(["avis 2", "avis 3", "avis 1"]);
  });

  /*
    Le filtre sert la barre qu'on touche dans la répartition : *la seule question qu'on se pose
    vraiment devant une moyenne est « qu'est-ce qui s'est mal passé chez les mécontents ? »*
  */
  it("ne garde que la note demandée, et recompte le total en conséquence", async () => {
    const { service } = monter([avis(1, 1, 1), avis(2, 5, 2), avis(3, 1, 3)]);

    const page = await service.getReviews(PRO, { score: 1 });

    expect(page.items.map((r) => r.score)).toEqual([1, 1]);
    expect(page.total).toBe(2); // « 2 avis à 1 étoile », pas « 3 avis »
  });

  /*
    ⚠️ Une note sans commentaire compte autant dans la moyenne. L'exclure ferait deux totaux qui ne
    se répondent pas : *« 400 avis » en haut et 120 lignes en dessous se lit comme une
    dissimulation.*
  */
  it("garde les notes SANS commentaire : elles comptent dans la moyenne", async () => {
    const { service } = monter([avis(1, 5, 1, "pat-1", null), avis(2, 4, 2)]);

    const page = await service.getReviews(PRO, {});

    expect(page.total).toBe(2);
    expect(page.items.map((r) => r.comment)).toEqual(["avis 2", null]);
  });
});

/*
  ⚠️ **La confidentialité n'est pas un détail de présentation.** Ces deux cas gardent la décision du
  porteur du 15/09 : on prouve l'acte, on ne nomme pas la personne.
*/
describe("Ce qu’un avis ne dit JAMAIS", () => {
  it("n’expose aucun identifiant de patient", async () => {
    const { service } = monter([avis(1, 5, 1, "pat-secret")]);

    const page = await service.getReviews(PRO, {});

    expect(JSON.stringify(page)).not.toContain("pat-secret");
    expect(Object.keys(page.items[0]).sort()).toEqual(["comment", "consultationsWithPro", "createdAt", "score"]);
  });

  /*
    À la place du nom : la fidélité. *Quelqu'un qui revient est le signal le plus fort qui existe,
    et il ne nomme personne.*
  */
  it("dit combien de fois ce patient est revenu chez CE soignant", async () => {
    const { service } = monter([avis(1, 5, 1, "fidele"), avis(2, 4, 2, "nouveau")], {
      seances: { fidele: 4, nouveau: 1 },
    });

    const page = await service.getReviews(PRO, { sort: "worst" });

    expect(page.items.map((r) => r.consultationsWithPro)).toEqual([1, 4]);
  });

  /*
    Un avis prouve à lui seul qu'une consultation a eu lieu : afficher « 0 consultation » sous un
    avis serait absurde, et donnerait à croire que l'avis est faux.
  */
  it("ne descend jamais sous une consultation", async () => {
    const { service } = monter([avis(1, 5, 1, "inconnu")], { seances: { inconnu: 0 } });

    const page = await service.getReviews(PRO, {});

    expect(page.items[0].consultationsWithPro).toBe(1);
  });
});

describe("Un soignant qu’on ne doit plus voir", () => {
  /*
    Sans ce contrôle, les avis d'un compte suspendu resteraient lisibles par leur seule URL — la
    fiche, elle, refuse déjà (RM-05-01/05). *Une porte fermée à côté d'une fenêtre ouverte n'est pas
    une porte fermée.*
  */
  it("ne laisse pas lire ses avis par l’URL", async () => {
    const { service } = monter([avis(1, 5, 1)], { visible: false });

    await expect(service.getReviews(PRO, {})).rejects.toBeInstanceOf(NotFoundException);
  });
});

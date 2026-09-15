/**
 * Le prix d'appel de l'annuaire est celui d'une CONSULTATION — chantier 121, 15/09/2026.
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Mesuré en production le 15/09**, à la minute où le premier soignant de l'annuaire a publié
 * une offre de suivi : sa carte annonçait **15 min et 3 000 XAF** — les chiffres de son SUIVI —
 * alors que sa consultation dure 30 min et coûte 5 000 XAF. Un patient ouvrant l'application
 * choisissait donc sur un tarif qu'il ne pouvait pas obtenir.
 *
 * > **Un prix d'appel qu'on ne peut pas payer n'est pas un prix, c'est un appât.**
 *
 * Le suivi ne s'achète pas depuis l'annuaire : il se déclenche sur proposition du soignant après un
 * compte-rendu (EF-06-12). C'est le défaut que le chantier 65 avait corrigé sur la FICHE, resté sur
 * la LISTE — l'écran que tout le monde voit en premier.
 *
 * 📌 **Et le mensonge ne s'arrêtait pas à l'affichage.** La même valeur porte le tri par prix et le
 * filtre « prix maximum » (EF-05-03) : un soignant dont le suivi est à 2 500 remontait en tête d'un
 * filtre « ≤ 3 000 » pour une consultation facturée 12 000. *Corriger l'affichage sans corriger le
 * filtre aurait déplacé le mensonge au lieu de le retirer* — d'où les trois cas ci-dessous.
 *
 * Aucune base : `PrismaService` est réduit à ce que `search()` touche (projet Jest « unit »).
 */
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { DirectoryService } from "./m05.directory.service";
import { PresenceService } from "./m05.presence.service";

interface OffreBrute {
  professionalId: string;
  id: string;
  label: string;
  durationMin: number;
  priceXaf: number;
  kind: "STANDARD" | "FOLLOW_UP";
  active: boolean;
}

interface Soignant {
  accountId: string;
  nom: string;
  offres: OffreBrute[];
}

function monter(soignants: Soignant[]) {
  const maintenant = new Date();

  const prisma = {
    professionalProfile: {
      findMany: async () =>
        soignants.map((s) => ({
          accountId: s.accountId,
          firstName: s.nom,
          lastName: "Test",
          category: "GENERAL_PRACTITIONER",
          specialty: null,
          district: "Moungali",
          biography: null,
        })),
    },
    professionalStats: {
      findMany: async () =>
        soignants.map((s) => ({
          professionalId: s.accountId,
          initiationsTotal: 4,
          confirmedTotal: 4,
          refusedTotal: 0,
          confirmDelaySumS: 80,
          ratingSum: 8,
          ratingCount: 2,
          incidentsTotal: 0,
          updatedAt: maintenant,
        })),
    },
    presenceStatus: {
      findMany: async () =>
        soignants.map((s) => ({
          accountId: s.accountId,
          state: "ONLINE",
          lastHeartbeatAt: maintenant,
        })),
    },
    careOffer: {
      /*
        Le vrai service trie par prix croissant et ne demande que les offres ACTIVES : on reproduit
        exactement ces deux conditions, sinon le test prouverait le contraire de la production.
      */
      findMany: async () =>
        soignants
          .flatMap((s) => s.offres)
          .filter((o) => o.active)
          .sort((a, b) => a.priceXaf - b.priceXaf),
    },
  } as unknown as PrismaService;

  const params = {
    getInt: async () => 300, // PM-26
    getIntList: async () => [1, 5], // PM-13
  } as unknown as ParamsService;

  return new DirectoryService(prisma, params, {} as PresenceService);
}

const CONSULT = (professionalId: string, priceXaf: number, durationMin = 30): OffreBrute => ({
  professionalId,
  id: `c-${professionalId}-${priceXaf}`,
  label: "Consultation",
  durationMin,
  priceXaf,
  kind: "STANDARD",
  active: true,
});

const SUIVI = (professionalId: string, priceXaf: number, durationMin = 15): OffreBrute => ({
  professionalId,
  id: `s-${professionalId}-${priceXaf}`,
  label: "Session de suivi",
  durationMin,
  priceXaf,
  kind: "FOLLOW_UP",
  active: true,
});

describe("Le prix d'appel de la carte d'annuaire", () => {
  /*
    ⚠️ LE test de ce chantier — le cas exact vu en production le 15/09.
  */
  it("ignore une offre de SUIVI moins chère que la consultation", async () => {
    const service = monter([{ accountId: "pro-1", nom: "Armel", offres: [SUIVI("pro-1", 3000, 15), CONSULT("pro-1", 5000, 30)] }]);

    const { items } = await service.search({});

    expect(items[0].cheapestOffer).not.toBeNull();
    expect(items[0].cheapestOffer!.kind).toBe("STANDARD");
    expect(items[0].cheapestOffer!.priceXaf).toBe(5000);
    expect(items[0].cheapestOffer!.durationMin).toBe(30);
  });

  it("retient bien la MOINS CHÈRE quand il y a plusieurs consultations", async () => {
    const service = monter([
      { accountId: "pro-1", nom: "Armel", offres: [CONSULT("pro-1", 9000, 60), SUIVI("pro-1", 1000), CONSULT("pro-1", 4000, 20)] },
    ]);

    const { items } = await service.search({});

    expect(items[0].cheapestOffer!.priceXaf).toBe(4000);
    expect(items[0].cheapestOffer!.durationMin).toBe(20);
  });

  /*
    Conséquence assumée : sans consultation active, il n'y a rien à vendre à un nouveau patient,
    donc pas de prix d'appel. Le chantier 65 a déjà tranché ce cas sur la fiche ; la liste dit la
    même chose. *Un soignant sans prix n'est pas un soignant gratuit.*
  */
  it("n’invente aucun prix pour un soignant qui ne propose QUE du suivi", async () => {
    const service = monter([{ accountId: "pro-1", nom: "Armel", offres: [SUIVI("pro-1", 2500)] }]);

    const { items } = await service.search({});

    expect(items[0].cheapestOffer).toBeNull();
  });

  /*
    Le compte sert à l'écran pour écrire « 5 000 F » ou « à partir de 5 000 F ». Il ne compte que
    ce qui s'achète : ni le suivi, ni les offres éteintes. *Un « à partir de » qui ne correspond à
    rien fait chercher une offre moins chère qui n'existe pas.*
  */
  it("dit combien de consultations sont réellement proposées", async () => {
    const service = monter([
      {
        accountId: "pro-1",
        nom: "Armel",
        offres: [CONSULT("pro-1", 4000, 20), CONSULT("pro-1", 9000, 60), SUIVI("pro-1", 1000), { ...CONSULT("pro-1", 2000), active: false }],
      },
      { accountId: "pro-2", nom: "Seul", offres: [CONSULT("pro-2", 5000), SUIVI("pro-2", 2000)] },
      { accountId: "pro-3", nom: "Rien", offres: [SUIVI("pro-3", 2000)] },
    ]);

    const { items } = await service.search({});
    const parId = new Map(items.map((i) => [i.professionalId, i.consultationCount]));

    expect(parId.get("pro-1")).toBe(2); // le suivi et l'éteinte ne comptent pas
    expect(parId.get("pro-2")).toBe(1); // un seul tarif : pas de « à partir de »
    expect(parId.get("pro-3")).toBe(0); // rien à vendre
  });

  it("ne compte pas une consultation DÉSACTIVÉE", async () => {
    const service = monter([
      {
        accountId: "pro-1",
        nom: "Armel",
        offres: [{ ...CONSULT("pro-1", 2000), active: false }, CONSULT("pro-1", 7000)],
      },
    ]);

    const { items } = await service.search({});

    expect(items[0].cheapestOffer!.priceXaf).toBe(7000);
  });
});

/*
  ⚠️ **Le filtre et le tri boivent à la même source.** Ces deux cas sont la raison pour laquelle la
  correction ne pouvait pas se faire dans l'écran : c'est le serveur qui décide qui apparaît, et
  dans quel ordre.
*/
describe("Le filtre « prix maximum » et le tri par prix", () => {
  it("n’attrapent pas un soignant dont seul le SUIVI passe sous le plafond", async () => {
    const service = monter([
      { accountId: "pro-cher", nom: "Cher", offres: [SUIVI("pro-cher", 2500), CONSULT("pro-cher", 12000)] },
      { accountId: "pro-juste", nom: "Juste", offres: [CONSULT("pro-juste", 2800)] },
    ]);

    const { items, total } = await service.search({ maxPrice: 3000 });

    expect(total).toBe(1);
    expect(items[0].professionalId).toBe("pro-juste");
  });

  it("classent sur le prix de la consultation, pas sur celui du suivi", async () => {
    const service = monter([
      { accountId: "pro-a", nom: "A", offres: [SUIVI("pro-a", 500), CONSULT("pro-a", 10000)] },
      { accountId: "pro-b", nom: "B", offres: [CONSULT("pro-b", 6000)] },
    ]);

    const { items } = await service.search({ sort: "price" });

    // Avec l'ancien calcul, « A » passait devant avec ses 500 XAF de suivi.
    expect(items.map((i) => i.professionalId)).toEqual(["pro-b", "pro-a"]);
  });
});

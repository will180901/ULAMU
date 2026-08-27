/**
 * `OffersService.limitsForMine()` — les bornes de composition d'une offre, annoncées AVANT la saisie.
 *
 * ── Pourquoi cette route existe ────────────────────────────────────────────────────────────────
 *
 * PM-09 (durée), PM-06 (prix plancher) et PM-25 (offres actives max) étaient vérifiées côté service
 * et **jamais renvoyées**. Deux conséquences, toutes deux mauvaises :
 *
 * 1. L'écran ne pouvait qu'écrire « entre 10 et 60 minutes » et « au moins 500 XAF » en dur — la
 *    dette exacte qui a produit les « 12 % » et les « 48 h » des maquettes.
 * 2. Le médecin découvrait les bornes par un REFUS après coup : on lui faisait composer une offre
 *    entière, puis on la rejetait. Annoncer avant est la règle appliquée aux frais de retrait
 *    (EF-13-07) ; elle vaut ici aussi.
 *
 * Le test 3 est le garde-fou : il change les paramètres et exige que la réponse suive.
 *
 * Aucune base : `PrismaService` et `ParamsService` sont simulés (projet Jest « unit »).
 */
import { ForbiddenException } from "@nestjs/common";
import { AuditEmitter } from "../../common/audit.emitter";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { OffersService } from "./m05.offers.service";
import type { AuthenticatedActor } from "../../common/auth/auth.guard";

const PRO: AuthenticatedActor = {
  accountId: "11111111-2222-3333-4444-555555555555",
  accountType: "PROFESSIONAL",
} as AuthenticatedActor;

const PATIENT: AuthenticatedActor = { ...PRO, accountType: "PATIENT" } as AuthenticatedActor;

function paramsAvec(pm09: number[], pm06: number, pm25: number): ParamsService {
  return {
    getIntList: jest.fn(async (cle: string) => {
      if (cle === "PM-09") return pm09;
      throw new Error(`Liste non simulée : ${cle}`);
    }),
    getInt: jest.fn(async (cle: string) => {
      if (cle === "PM-06") return pm06;
      if (cle === "PM-25") return pm25;
      throw new Error(`Paramètre non simulé : ${cle}`);
    }),
  } as unknown as ParamsService;
}

function prismaAvec(actives: number): PrismaService {
  return { careOffer: { count: jest.fn().mockResolvedValue(actives) } } as unknown as PrismaService;
}

function service(prisma: PrismaService, params: ParamsService): OffersService {
  // `audit` et `verification` ne sont pas touchés par `limitsForMine` : lecture pure.
  return new OffersService(prisma, params, {} as AuditEmitter, {} as never);
}

describe("OffersService.limitsForMine — les bornes annoncées avant la saisie", () => {
  it("sert les trois bornes du paramétrage, plus mon compte d’offres actives", async () => {
    const vue = await service(prismaAvec(3), paramsAvec([10, 60], 500, 5)).limitsForMine(PRO);

    expect(vue).toEqual({
      durationMinMinutes: 10,
      durationMaxMinutes: 60,
      priceFloorXaf: 500,
      maxActiveOffers: 5,
      activeOffers: 3,
    });
  });

  it("compte les offres ACTIVES seulement — une offre désactivée ne prend pas de place (PM-25)", async () => {
    const prisma = prismaAvec(2);
    await service(prisma, paramsAvec([10, 60], 500, 5)).limitsForMine(PRO);

    expect(prisma.careOffer.count).toHaveBeenCalledWith({
      where: { professionalId: PRO.accountId, active: true },
    });
  });

  it("suit le paramétrage si E3 le change — aucune borne en dur", async () => {
    const vue = await service(prismaAvec(0), paramsAvec([15, 45], 1000, 3)).limitsForMine(PRO);

    expect(vue.durationMinMinutes).toBe(15)
    expect(vue.durationMaxMinutes).toBe(45)
    expect(vue.priceFloorXaf).toBe(1000)
    expect(vue.maxActiveOffers).toBe(3)
  });

  it("refuse un compte qui n’est pas professionnel (EF-05-02)", async () => {
    await expect(service(prismaAvec(0), paramsAvec([10, 60], 500, 5)).limitsForMine(PATIENT)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

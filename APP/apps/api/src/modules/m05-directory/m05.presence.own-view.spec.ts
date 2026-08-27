/**
 * `PresenceService.getMine()` — la vue que le professionnel a de SA propre présence, et le plafond
 * PM-27 qu'elle transporte désormais.
 *
 * ── Pourquoi ce test existe ────────────────────────────────────────────────────────────────────
 *
 * EF-06-14 plafonne les sessions simultanées, et M06 refuse l'initiation au-delà. Mais ce chiffre
 * n'était renvoyé qu'au **patient**, dans le texte d'un message d'erreur. Côté médecin, l'écran ne
 * pouvait que l'écrire en dur — et mentir le jour où le super-admin le change dans E3.
 *
 * C'est exactement la dette qui a produit les « 12 % » et les « 48 h » des maquettes
 * (cf. `docs/ALIGNEMENT_MAQUETTE_CAHIER.md`, familles 1 et 2). Le test 3 est là pour qu'elle ne
 * revienne pas : il change PM-27 et vérifie que la vue suit.
 *
 * Aucune base : `PrismaService` et `ParamsService` sont simulés (projet Jest « unit »).
 */
import { PresenceStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { PresenceService } from "./m05.presence.service";

const MOI = "11111111-2222-3333-4444-555555555555";

/** PM-26 = 900 s (absent après 15 min), PM-27 = plafond de sessions simultanées. */
function paramsAvec(pm27: number, pm26 = 900): ParamsService {
  return {
    getInt: jest.fn(async (cle: string) => {
      if (cle === "PM-26") return pm26;
      if (cle === "PM-27") return pm27;
      throw new Error(`Paramètre non simulé : ${cle}`);
    }),
  } as unknown as ParamsService;
}

/** Prisma réduit à ce que `getMine()` lit : une ligne de présence, ou rien. */
function prismaAvec(row: Partial<PresenceStatus> | null): PrismaService {
  return {
    presenceStatus: { findUnique: jest.fn().mockResolvedValue(row) },
  } as unknown as PrismaService;
}

function service(prisma: PrismaService, params: ParamsService): PresenceService {
  return new PresenceService(prisma, params, {} as OutboxService, {} as AuditEmitter);
}

describe("PresenceService.getMine — la vue du professionnel sur lui-même", () => {
  it("sert le plafond PM-27 avec l'état, pour que l'écran n'ait aucun chiffre à écrire", async () => {
    const maintenant = new Date();
    const vue = await service(
      prismaAvec({ accountId: MOI, state: "ONLINE", since: maintenant, lastHeartbeatAt: maintenant }),
      paramsAvec(3),
    ).getMine(MOI);

    expect(vue.maxConcurrentSessions).toBe(3);
    expect(vue.state).toBe("ONLINE");
    expect(vue.availableForInitiation).toBe(true);
  });

  it("sert le plafond même à un professionnel qui ne s'est JAMAIS connecté au web", async () => {
    // Sans ligne de présence, la vue de repli existait déjà — mais elle ne portait pas le plafond.
    // Un médecin tout neuf aurait vu « 0 consultation sur … » sans savoir sur combien.
    const vue = await service(prismaAvec(null), paramsAvec(3)).getMine(MOI);

    expect(vue.maxConcurrentSessions).toBe(3);
    expect(vue.state).toBe("OFFLINE");
    expect(vue.availableForInitiation).toBe(false);
  });

  it("suit PM-27 quand le super-admin le change dans E3 — jamais un 3 en dur", async () => {
    const maintenant = new Date();
    const vue = await service(
      prismaAvec({ accountId: MOI, state: "ONLINE", since: maintenant, lastHeartbeatAt: maintenant }),
      paramsAvec(5),
    ).getMine(MOI);

    expect(vue.maxConcurrentSessions).toBe(5);
  });

  it("un ONLINE rassis reste indisponible : le plafond n'a pas changé cette règle (PM-26)", async () => {
    const vieux = new Date(Date.now() - 20 * 60 * 1000); // 20 min > PM-26 (15 min)
    const vue = await service(
      prismaAvec({ accountId: MOI, state: "ONLINE", since: vieux, lastHeartbeatAt: vieux }),
      paramsAvec(3),
    ).getMine(MOI);

    expect(vue.availableForInitiation).toBe(false);
    expect(vue.maxConcurrentSessions).toBe(3);
  });
});

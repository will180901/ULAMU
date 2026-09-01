/**
 * L'application se câble, et ses routes gardent leur forme (01/09/2026).
 *
 * ── Le trou que ce fichier bouche ──────────────────────────────────────────────────────────────
 *
 * Les 541 autres tests n'ont **jamais démarré Nest**. Ils éprouvent des services avec un faux
 * Prisma, ce qui est le bon choix : rapide, sans base, et ça teste les règles. Mais aucun ne verrait
 * un module mal déclaré, une garde mal enregistrée, ou un chemin de route réinterprété.
 *
 * C'est exactement ce qui se joue dans une montée de version du cadre. La migration NestJS 10 → 11
 * du 01/09/2026 a fait passer `platform-express` d'**Express 4 à Express 5**, donc
 * `path-to-regexp` de la v0.1 à la v8 : c'est elle qui interprète `/v1/care-sessions/:sessionId`.
 * Une route qui change de forme ne casse aucun test unitaire — elle rend juste 404 en production.
 *
 * ── Pourquoi un faux Prisma, et pas une vraie base ─────────────────────────────────────────────
 *
 * `DATABASE_URL` désigne la base Neon de PRODUCTION, et `SchedulerService` porte un
 * `@Cron(EVERY_MINUTE)` qui écrit. Monter l'application pour de vrai ici la ferait travailler sur
 * les vraies données — c'est la famille d'accident du 23/08/2026. On bouchonne donc Prisma : Nest
 * câble tout, enregistre toutes ses routes, et rien ne touche à rien.
 *
 * ── Pourquoi des routes TÉMOINS plutôt qu'un compte ────────────────────────────────────────────
 *
 * Exiger « exactement 192 routes » ferait échouer ce test à chaque route ajoutée — il finirait
 * modifié sans être lu. On nomme donc les chemins dont la FORME est en jeu : un paramètre, deux
 * paramètres, un segment après un paramètre. Si `path-to-regexp` change d'avis, ceux-là le disent.
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module";
import { PrismaService } from "./common/prisma.service";

/** Tout appel rend une promesse vide ; aucune connexion n'est ouverte. */
function prismaBouchon(): unknown {
  const table = new Proxy({}, { get: () => async () => [] });
  return new Proxy(
    {
      $connect: async () => undefined,
      $disconnect: async () => undefined,
      $transaction: async (f: unknown) => (typeof f === "function" ? (f as (t: unknown) => unknown)(table) : []),
    } as Record<string, unknown>,
    { get: (cible, cle: string) => (cle in cible ? cible[cle] : table) },
  );
}

describe("L'application se câble", () => {
  let app: INestApplication;
  let chemins: Set<string>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaBouchon())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Express 4 rangeait la pile dans `_router`, Express 5 dans `router`. Lire les deux évite que
    // ce test devienne un faux positif silencieux le jour d'une prochaine montée de version.
    const instance = app.getHttpAdapter().getInstance() as {
      _router?: { stack: unknown[] };
      router?: { stack: unknown[] };
    };
    const pile = (instance._router?.stack ?? instance.router?.stack ?? []) as Array<{
      route?: { path: string; methods: Record<string, boolean> };
    }>;

    chemins = new Set<string>();
    for (const couche of pile) {
      if (!couche.route) continue;
      for (const [m, actif] of Object.entries(couche.route.methods)) {
        if (actif) chemins.add(`${m.toUpperCase()} ${couche.route.path}`);
      }
    }
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it("démarre : tous les modules se résolvent", () => {
    // Si un module manquait un fournisseur, `app.init()` aurait déjà jeté dans `beforeAll`.
    expect(app).toBeDefined();
    expect(chemins.size).toBeGreaterThan(150);
  });

  /*
    Les routes témoins. Chacune est là pour une raison de forme :
      • un paramètre simple, le cas le plus courant ;
      • un paramètre SUIVI d'un segment fixe — la forme que `path-to-regexp` v8 traite autrement ;
      • deux paramètres dans un même chemin ;
      • un chemin encodé (`scan/:qrToken`), qui porte un jeton en clair dans l'URL.
    Et deux routes qui n'existaient pas avant le 01/09, pour que ce test dise aussi quelque chose
    du câblage récent.
  */
  it.each([
    "POST /v1/auth/login",
    "GET /v1/care-sessions/:sessionId",
    "GET /v1/care-sessions/:sessionId/record/summary",
    // Un segment FIXE en concurrence avec un paramètre au même niveau : si l'ordre d'enregistrement
    // s'inversait, `/mine` serait avalé par `:sessionId` et rendrait « séance introuvable ».
    "GET /v1/care-sessions/mine",
    "PATCH /v1/care-sessions/:sessionId/messages/:messageId",
    "POST /v1/prescriptions/scan/:qrToken/dispense",
    "GET /v1/admin/verification/:caseId",
    "PUT /v1/admin/parameters/:key",
    "DELETE /v1/admin/admins/:accountId/role",
    "GET /v1/support-requests/mine",
    "POST /v1/admin/support-requests/:id/answer",
  ])("expose %s, avec cette forme exacte", (route) => {
    expect([...chemins]).toContain(route);
  });

  it("sert les fichiers statiques sous /assets sans avaler les routes d'API", () => {
    // `ServeStaticModule` pose un joker interne. Avec Express 5 et path-to-regexp v8, un joker mal
    // borné capture TOUT ce qui suit — l'API entière répondrait alors des fichiers.
    expect([...chemins]).toContain("POST /v1/auth/login");
    expect([...chemins].some((c) => c.includes("/assets"))).toBe(false);
  });
});

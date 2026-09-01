/**
 * Relève la table des routes de l'API — le filet de la migration NestJS.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * Les 541 tests unitaires ne démarrent JAMAIS l'application : ils éprouvent des services avec un
 * faux Prisma. Ils ne verraient donc rien si la migration cassait le câblage de Nest, l'ordre des
 * gardes, ou — le vrai risque d'Express 5 — la façon dont les chemins sont interprétés.
 *
 * On relève donc la liste exacte des routes AVANT, puis APRÈS. Une seule route qui change de forme
 * et la comparaison le dit.
 *
 * ── Pourquoi on ne démarre pas l'application pour de vrai ──────────────────────────────────────
 *
 * `DATABASE_URL` pointe sur la base Neon de PRODUCTION, et `SchedulerService` porte un
 * `@Cron(EVERY_MINUTE)` qui écrit. Lancer l'API ici, même une minute, la ferait travailler sur les
 * vraies données. On monte donc l'arbre avec un Prisma bouchonné : Nest câble tout, enregistre
 * toutes les routes, et rien ne touche à quoi que ce soit.
 */
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma.service";

/** Un faux Prisma : tout appel rend une promesse vide, aucune connexion n'est ouverte. */
function prismaBouchon(): unknown {
  const table = new Proxy(
    {},
    {
      get: () => async () => [],
    },
  );
  return new Proxy(
    {
      $connect: async () => undefined,
      $disconnect: async () => undefined,
      $transaction: async (f: unknown) => (typeof f === "function" ? (f as (t: unknown) => unknown)(table) : []),
      onModuleInit: async () => undefined,
      onModuleDestroy: async () => undefined,
    },
    {
      get: (cible: Record<string, unknown>, cle: string) => (cle in cible ? cible[cle] : table),
    },
  );
}

async function principal(): Promise<void> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaBouchon())
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  // Express 4 range la pile dans `_router`, Express 5 dans `router`. Gérer les deux est déjà,
  // en soi, une partie de ce qu'on vérifie.
  const instance = app.getHttpAdapter().getInstance() as {
    _router?: { stack: unknown[] };
    router?: { stack: unknown[] };
  };
  const pile = instance._router?.stack ?? instance.router?.stack ?? [];
  console.error(`[info] pile trouvée dans ${instance._router ? "_router" : instance.router ? "router" : "NULLE PART"}`);

  const routes: string[] = [];
  for (const couche of pile as Array<{ route?: { path: string; methods: Record<string, boolean> } }>) {
    if (!couche.route) continue;
    const methodes = Object.keys(couche.route.methods)
      .filter((m) => couche.route!.methods[m])
      .map((m) => m.toUpperCase())
      .sort();
    for (const m of methodes) routes.push(`${m.padEnd(6)} ${couche.route.path}`);
  }

  routes.sort();
  console.log(routes.join("\n"));
  console.error(`[info] ${routes.length} routes relevées`);

  await app.close();
  process.exit(0);
}

principal().catch((e) => {
  console.error("[ÉCHEC]", e);
  process.exit(1);
});

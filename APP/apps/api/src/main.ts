import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  // bodyParser:false + useBodyParser(...) explicite : Nest enregistre sinon ses propres parsers
  // JSON/urlencoded par défaut (limite Express standard = 100 Ko) AVANT qu'on puisse les reconfigurer —
  // un app.use(json({limit})) posé après create() n'aurait plus la main (le premier parser a déjà
  // consommé le flux). Nécessaire pour les pièces jointes de session (notes vocales longues, EF-06-xx).
  // NestExpressApplication (pas juste INestApplication) : seule cette interface déclare useBodyParser.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser("json", { limit: "130mb" });
  app.useBodyParser("urlencoded", { limit: "130mb", extended: true });
  // Validation côté serveur partout — le client est indicatif (menaces §4.2).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  // Hébergement : la plateforme (Render, etc.) impose le port via PORT ; sinon API_PORT (local), sinon 3001.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  // 0.0.0.0 : écoute sur toutes les interfaces (obligatoire en conteneur/hébergement, pas seulement localhost).
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`ULAMU API démarrée sur :${port}`);
}

void bootstrap();

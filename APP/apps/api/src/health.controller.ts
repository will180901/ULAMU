import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/auth/auth.guard";

/**
 * Sonde de santé pour l'hébergeur (Render & co.) — route PUBLIQUE (sans authentification),
 * utilisée par la plateforme pour vérifier que le serveur répond. GET /health → 200.
 */
@Controller()
export class HealthController {
  @Public()
  @Get("health")
  health(): { status: string; service: string } {
    return { status: "ok", service: "ulamu-api" };
  }
}

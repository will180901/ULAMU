import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/auth/auth.guard";

/** Instant de démarrage du processus — figé au chargement du module, donc au démarrage de l'API. */
const DEMARRE_A = new Date();

/**
 * Sonde de santé pour l'hébergeur (Render & co.) — route PUBLIQUE (sans authentification),
 * utilisée par la plateforme pour vérifier que le serveur répond. GET /health → 200.
 *
 * ── Pourquoi elle dit aussi depuis quand elle tourne ───────────────────────────────────────────
 *
 * Le 28/08, une variable d'environnement a été retirée de `render.yaml`, poussée, déployée — et
 * le comportement qu'elle commandait a continué. Impossible de trancher entre deux explications :
 * la variable survit sur le service (Render ne supprime pas ce qu'il a déjà posé), ou le
 * redéploiement n'était pas terminé et l'ancienne instance servait encore.
 *
 * Deux essais y sont passés faute de pouvoir répondre. `startedAt` tranche d'un appel : une API
 * démarrée il y a deux minutes a pris le dernier déploiement, une API debout depuis six heures ne
 * l'a pas pris. Utile aussi sur le plan gratuit, où le service s'endort et redémarre tout seul.
 *
 * ── Et pourquoi elle annonce le mode démonstration ────────────────────────────────────────────
 *
 * `MODE VITRINE` confirme les poignées de main et valide les paiements à la place des humains.
 * C'est utile pour démontrer et **désastreux quand on l'ignore** : on teste un écran de décision
 * qui décide tout seul, et on cherche le défaut dans le code. Un mode qui change le comportement
 * du produit ne doit pas être silencieux.
 *
 * Ce sont deux booléens, sans valeur ni délai : ils disent qu'une simulation tourne, pas comment
 * la contourner.
 */
@Controller()
export class HealthController {
  @Public()
  @Get("health")
  health(): {
    status: string;
    service: string;
    startedAt: string;
    uptimeSeconds: number;
    demo: { handshakeAutoConfirm: boolean; paymentAutoConfirm: boolean };
  } {
    const positif = (v: string | undefined): boolean => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    };
    return {
      status: "ok",
      service: "ulamu-api",
      startedAt: DEMARRE_A.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - DEMARRE_A.getTime()) / 1000),
      demo: {
        handshakeAutoConfirm: positif(process.env.HANDSHAKE_AUTOCONFIRM_MS),
        paymentAutoConfirm: positif(process.env.MOMO_AUTOCONFIRM_MS),
      },
    };
  }
}

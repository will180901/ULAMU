/**
 * M14 — Enregistrement des appareils pour le push (FCM/APNs). Un compte = plusieurs appareils ;
 * un jeton = un appareil (clé unique). La livraison push réelle (FcmPushGateway) résoudra ces
 * jetons par compte ; tant que Firebase n'est pas fourni, DevPushGateway journalise (prêt à recevoir).
 */
import { Injectable } from "@nestjs/common";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Enregistre/rafraîchit le jeton de l'appareil courant pour ce compte (idempotent par jeton). */
  async register(actor: AuthenticatedActor, token: string, platform: string): Promise<{ ok: true }> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { accountId: actor.accountId, platform, lastSeenAt: new Date() },
      create: { accountId: actor.accountId, token, platform },
    });
    return { ok: true };
  }

  /** Retire un jeton (déconnexion / désinstallation d'un appareil). */
  async unregister(actor: AuthenticatedActor, token: string): Promise<{ ok: true }> {
    await this.prisma.deviceToken.deleteMany({ where: { token, accountId: actor.accountId } });
    return { ok: true };
  }
}

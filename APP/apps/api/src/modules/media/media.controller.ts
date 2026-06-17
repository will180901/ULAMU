/**
 * Service de fichiers média (lecture). Deux routes :
 *  • avatars : PUBLIC (photo de profil non sensible, clé uuid non devinable) ;
 *  • session : AUTHENTIFIÉ + vérifié participant (photos/notes vocales de consultation = médical).
 * L'écriture passe par M01 (avatar) et M06 (média de session). Ici, lecture seule.
 */
import { Controller, ForbiddenException, Get, NotFoundException, Param, StreamableFile } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor, Public } from "../../common/auth/auth.guard";
import { PrismaService } from "../../common/prisma.service";
import { StorageService } from "../../common/storage.service";

@Controller("v1/media")
export class MediaController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get("avatars/:key")
  async avatar(@Param("key") key: string): Promise<StreamableFile> {
    if (!key.startsWith("av_")) {
      throw new NotFoundException("Image introuvable");
    }
    const file = await this.storage.read(key);
    if (!file) {
      throw new NotFoundException("Image introuvable");
    }
    return new StreamableFile(file.buffer, { type: file.contentType });
  }

  /** Média d'une consultation : seuls le patient et le professionnel de la session y accèdent (RM-06). */
  @Get("sessions/:key")
  async sessionMedia(@Actor() actor: AuthenticatedActor, @Param("key") key: string): Promise<StreamableFile> {
    if (!key.startsWith("sm_")) {
      throw new NotFoundException("Média introuvable");
    }
    // OR mediaKeys: un album (plusieurs photos) laisse fileKey null et range ses clés dans mediaKeys[].
    const message = await this.prisma.sessionMessage.findFirst({
      where: { OR: [{ fileKey: key }, { mediaKeys: { has: key } }] },
      include: { session: { select: { patientAccountId: true, professionalId: true } } },
    });
    if (!message) {
      throw new NotFoundException("Média introuvable");
    }
    const s = message.session;
    if (s.patientAccountId !== actor.accountId && s.professionalId !== actor.accountId) {
      throw new ForbiddenException("Accès au média réservé aux participants de la consultation");
    }
    const file = await this.storage.read(key);
    if (!file) {
      throw new NotFoundException("Média introuvable");
    }
    return new StreamableFile(file.buffer, { type: file.contentType });
  }
}

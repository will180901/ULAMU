/** Service de fichiers média (lecture). StorageService + PrismaService viennent du CommonModule global. */
import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";

@Module({
  controllers: [MediaController],
})
export class MediaModule {}

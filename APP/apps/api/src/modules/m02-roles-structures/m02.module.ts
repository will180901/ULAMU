import { Module } from "@nestjs/common";
import { M01AccountsModule } from "../m01-accounts/m01.module";
import { M02AdminController } from "./m02.admin.controller";
import { M02Controller } from "./m02.controller";
import { PermissionsService } from "./m02.permissions.service";
import { M02Service } from "./m02.service";

/**
 * M02 — Rôles & Espaces Structures (MVP Chantier 1 : pharmacies seulement, D-026).
 * Exporte PermissionsService — « Ce compte a-t-il le droit X ? » (interface §8),
 * consommé par M03, M09, M11, M16. Importe M01 pour l'OTP d'action sensible (EF-02-06).
 */
@Module({
  imports: [M01AccountsModule],
  controllers: [M02Controller, M02AdminController],
  providers: [M02Service, PermissionsService],
  exports: [PermissionsService],
})
export class M02RolesStructuresModule {}

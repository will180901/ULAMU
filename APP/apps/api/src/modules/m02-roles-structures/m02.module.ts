import { Module } from "@nestjs/common";
import { M01AccountsModule } from "../m01-accounts/m01.module";
import { M02AdminController } from "./m02.admin.controller";
import { M02Service } from "./m02.service";

/**
 * M02 — Rôles & sous-rôles d'administration.
 *
 * ── Ce module a perdu sa moitié « structures » le 03/09/2026 (dette n°17) ─────────────────────
 *
 * Il portait aussi la gestion des espaces pharmacie : `M02Controller` (9 routes) et
 * `PermissionsService` (« ce compte a-t-il le droit X dans cette structure ? »). Les deux sont
 * retirés — plus aucun compte `FACILITY_MEMBER` ne peut naître (D-051), et l'inventaire de la base
 * de production a confirmé qu'il n'en existe **aucun** : le code était inatteignable, pas seulement
 * « censé » l'être.
 *
 * `PermissionsService` n'avait plus qu'un lecteur, M13, pour un cas de figure — les gains d'une
 * structure — que la base ne contient pas non plus (zéro `EarningsAccount` de type FACILITY). M13
 * refuse désormais ce cas explicitement, sans avoir besoin de ce module.
 *
 * Ce qui reste est dans le périmètre : les **sous-rôles d'administration** (EF-02-08, écran E4).
 * M01 est importé pour l'OTP d'action sensible.
 */
@Module({
  imports: [M01AccountsModule],
  controllers: [M02AdminController],
  providers: [M02Service],
  exports: [],
})
export class M02RolesStructuresModule {}

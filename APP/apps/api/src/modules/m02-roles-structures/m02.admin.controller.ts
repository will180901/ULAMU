/**
 * M02 — administration des sous-rôles (EF-02-08) : réservé au SUPER_ADMIN.
 * (EF-02-08 exigeait aussi le TOTP ; il n'est plus imposé depuis D-053, 02/09/2026.)
 * Le premier SUPER_ADMIN est créé par le seed (bootstrap) — il active son TOTP puis opère ici.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { USERNAME_MSG, USERNAME_REGEX } from "../m01-accounts/m01.dto";
import { M02Service } from "./m02.service";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN_FINANCE", "ADMIN_VERIFICATION", "ADMIN_MAP"] as const;
type AdminRoleName = (typeof ADMIN_ROLES)[number];

export class CreateAdminDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @MinLength(3) @MaxLength(30) @Matches(USERNAME_REGEX, { message: USERNAME_MSG }) username!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsIn([...ADMIN_ROLES]) role!: AdminRoleName;
}

export class AssignRoleDto {
  @IsIn([...ADMIN_ROLES]) role!: AdminRoleName;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

@Controller("v1/admin")
@UseGuards(AdminGuard)
export class M02AdminController {
  constructor(private readonly service: M02Service) {}

  /** Création d'un compte admin par le SUPER_ADMIN (EF-02-08). Mot de passe initial à changer à la première connexion (consigne opérationnelle). */
  /**
   * Les comptes d'administration et leur sous-rôle (EF-02-08).
   *
   * ⚠️ Cette route manquait : créer un administrateur et lui attribuer un rôle se faisait **par
   * identifiant de compte**, sans aucun moyen de savoir qui sont les administrateurs, ni de vérifier
   * qu'une révocation a pris effet. Attribuer un sous-rôle imposait donc, en pratique, de modifier
   * le seed et de rejouer la base entière.
   */
  @AdminOnly("SUPER_ADMIN")
  @Get("admins")
  listAdmins() {
    return this.service.listAdmins();
  }

  @AdminOnly("SUPER_ADMIN")
  @Post("admins")
  createAdmin(@Actor() actor: AuthenticatedActor, @Body() dto: CreateAdminDto) {
    return this.service.createAdmin(actor.accountId, dto);
  }

  /** Attribution / changement de sous-rôle d'un compte admin existant. */
  @AdminOnly("SUPER_ADMIN")
  @Post("admins/:accountId/role")
  @HttpCode(200)
  assignRole(@Actor() actor: AuthenticatedActor, @Param("accountId") accountId: string, @Body() dto: AssignRoleDto) {
    return this.service.assignAdminRole(actor.accountId, accountId, dto.role, dto.reason);
  }

  /** Révocation du sous-rôle (le compte admin devient inopérant sans rôle). */
  @AdminOnly("SUPER_ADMIN")
  @Delete("admins/:accountId/role")
  @HttpCode(204)
  async revokeRole(@Actor() actor: AuthenticatedActor, @Param("accountId") accountId: string) {
    await this.service.revokeAdminRole(actor.accountId, accountId);
  }
}

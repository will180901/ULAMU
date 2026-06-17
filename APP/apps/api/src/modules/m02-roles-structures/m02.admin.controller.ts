/**
 * M02 — administration des sous-rôles (EF-02-08) : réservé au SUPER_ADMIN, sous TOTP (RM-01-06).
 * Le premier SUPER_ADMIN est créé par le seed (bootstrap) — il active son TOTP puis opère ici.
 */
import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from "class-validator";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { M02Service } from "./m02.service";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN_FINANCE", "ADMIN_VERIFICATION", "ADMIN_MAP"] as const;
type AdminRoleName = (typeof ADMIN_ROLES)[number];

export class CreateAdminDto {
  @IsString() @IsNotEmpty() phone!: string;
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

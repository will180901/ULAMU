/**
 * M14 — routes des rappels de médicaments (CRUD patient). AuthGuard global ; chacun ne gère
 * QUE ses propres rappels (vérifié côté service).
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { RemindersService } from "./m14.reminders.service";

class CreateReminderDto {
  @IsString() @IsNotEmpty({ message: "Nom du médicament requis" }) @MaxLength(120) medicationName!: string;
  @IsOptional() @IsString() @MaxLength(120) dosage?: string;
  @IsArray({ message: "Heures : liste attendue" })
  @ArrayMinSize(1, { message: "Indiquez au moins une heure de prise" })
  @ArrayMaxSize(12, { message: "12 heures maximum" })
  @Matches(/^\d{2}:\d{2}$/, { each: true, message: "Heure invalide (format HH:MM)" })
  times!: string[];
}

class UpdateReminderDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) medicationName?: string;
  @IsOptional() @IsString() @MaxLength(120) dosage?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @Matches(/^\d{2}:\d{2}$/, { each: true, message: "Heure invalide (format HH:MM)" })
  times?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller("v1/reminders")
export class RemindersController {
  constructor(private readonly service: RemindersService) {}

  @Post()
  create(@Actor() actor: AuthenticatedActor, @Body() dto: CreateReminderDto) {
    return this.service.create(actor, dto);
  }

  @Get("me")
  listMine(@Actor() actor: AuthenticatedActor) {
    return this.service.listMine(actor);
  }

  @Patch(":id")
  update(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: UpdateReminderDto) {
    return this.service.update(actor, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Actor() actor: AuthenticatedActor, @Param("id") id: string): Promise<void> {
    await this.service.remove(actor, id);
  }

  @Post(":id/taken")
  @HttpCode(200)
  markTaken(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.service.markTaken(actor, id);
  }
}

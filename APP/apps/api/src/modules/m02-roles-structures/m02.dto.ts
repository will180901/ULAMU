/**
 * M02 — DTOs (validation de surface ; les règles métier vivent dans m02.policies.ts).
 */
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { FACILITY_RIGHTS } from "./m02.policies";

/** Création d'espace (EF-02-03, CU-02-01). MVP : pharmacies seulement (D-026) — labos en V1. */
export class CreateFacilityDto {
  @IsIn(["PHARMACY"]) type!: "PHARMACY";
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) district!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) quarter!: string;
  /** Position GPS posée sur carte (CU-02-01) — couple obligatoire si fourni, jamais exposée sans dévoilement. */
  @ValidateIf((o: CreateFacilityDto) => o.longitude !== undefined)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ValidateIf((o: CreateFacilityDto) => o.latitude !== undefined)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @IsOptional() @IsString() @MaxLength(200) hours?: string;
}

/** Invitation d'un membre par numéro de téléphone (EF-02-04, CU-02-02). */
export class InviteMemberDto {
  @IsString() @IsNotEmpty() phone!: string;
  /** Droits internes proposés (EF-02-05) : "stock" | "dispense" | "stats". */
  @IsArray() @IsIn([...FACILITY_RIGHTS], { each: true }) proposedRights!: string[];
}

export class AcceptInvitationDto {
  @IsUUID() invitationId!: string;
}

/** Modification des droits d'un membre (EF-02-05, CU-02-03). */
export class UpdateMemberRightsDto {
  @IsArray() @IsIn([...FACILITY_RIGHTS], { each: true }) rights!: string[];
}

/** Transfert de titularité (EF-02-06, CU-02-05). */
export class StartTransferDto {
  @IsUUID() toMemberId!: string;
}

/** Confirmation liée à l'intention persistée — OTP des DEUX parties (CU-02-05). */
export class ConfirmTransferDto {
  @IsUUID() intentId!: string;
  @IsString() @Length(6, 6) ownerOtpCode!: string;
  @IsString() @Length(6, 6) targetOtpCode!: string;
}

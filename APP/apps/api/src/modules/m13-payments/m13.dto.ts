import { IsIn, IsInt, IsNotEmpty, IsString, IsUUID, Length, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { EARNINGS_HOLDER_TYPES, EarningsHolderTypeCode, MOMO_OPERATORS, MomoOperatorCode } from "./m13.policies";

/** Consultation des gains (EF-13-06) — le titulaire visé est explicite, l'accès est vérifié serveur. */
export class EarningsMeQueryDto {
  @IsIn([...EARNINGS_HOLDER_TYPES]) holderType!: EarningsHolderTypeCode;
  @IsUUID() holderId!: string;
}

/** Demande de retrait (EF-13-07, CU-13-04) — l'opérateur est choisi explicitement, jamais déduit. */
export class StartWithdrawalDto {
  @IsIn([...EARNINGS_HOLDER_TYPES]) holderType!: EarningsHolderTypeCode;
  @IsUUID() holderId!: string;
  /** Montant entier en XAF, strictement positif. */
  @Type(() => Number) @IsInt({ message: "Le montant doit être un entier de XAF" }) @Min(1, { message: "Le montant doit être strictement positif" })
  amountXaf!: number;
  @IsIn([...MOMO_OPERATORS]) operator!: MomoOperatorCode;
}

/** Confirmation de retrait : action sensible = mot de passe + OTP (EF-13-07). */
export class ConfirmWithdrawalDto {
  @IsUUID() withdrawalId!: string;
  @IsString() @IsNotEmpty({ message: "Mot de passe requis" }) password!: string;
  @IsString() @Length(6, 6, { message: "Code OTP à 6 chiffres requis" }) otpCode!: string;
}

/** Remboursement manuel (EF-13-10) — toujours motivé, tracé au demandeur (RM-13-06). */
export class CreateManualRefundDto {
  @IsUUID() paymentId!: string;
  @IsString() @IsNotEmpty({ message: "Motif du remboursement requis" }) @MaxLength(2000) reason!: string;
}

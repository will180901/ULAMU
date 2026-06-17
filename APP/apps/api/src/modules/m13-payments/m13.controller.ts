/**
 * M13 — routes titulaire de gains (EF-13-06/07 ; CU-13-04).
 * AuthGuard global : tout est authentifié ; l'accès au compte de gains visé est
 * vérifié serveur dans EarningsService (PROFESSIONAL = soi-même, FACILITY = OWNER actif).
 */
import { Body, Controller, Get, Headers, HttpCode, Post, Query, UnauthorizedException } from "@nestjs/common";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor, Public } from "../../common/auth/auth.guard";
import { ConfirmWithdrawalDto, EarningsMeQueryDto, StartWithdrawalDto } from "./m13.dto";
import { EarningsService } from "./m13.earnings.service";
import { PaymentsService } from "./m13.payments.service";

/**
 * Webhook agrégateur Mobile Money (EF-13-01) — l'opérateur (MTN MoMo / Airtel Money via
 * l'agrégateur agréé, ADR-09) confirme/refuse le paiement de façon ASYNCHRONE. Aujourd'hui SIMULÉ
 * (auto-confirm dev) ; ce point d'entrée prépare la bascule vers les vraies API : le prestataire
 * appellera cette route avec sa référence + l'issue, authentifié par un secret partagé.
 */
class PaymentWebhookDto {
  @IsString() @IsNotEmpty() @MaxLength(200) aggregatorRef!: string;
  @IsBoolean() success!: boolean;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

@Controller("v1")
export class M13Controller {
  constructor(
    private readonly earnings: EarningsService,
    private readonly payments: PaymentsService,
  ) {}

  /**
   * Confirmation/refus de paiement par l'agrégateur (EF-13-01). PUBLIC mais protégé par un SECRET
   * partagé (`MOMO_WEBHOOK_SECRET`) — handleChargeResult est idempotent (RM-13-04), un rejeu est sans
   * effet. Tant que le secret n'est pas configuré, la route refuse tout (sécurité par défaut).
   */
  @Public()
  @Post("payments/webhook")
  @HttpCode(200)
  async webhook(@Headers("x-webhook-secret") secret: string | undefined, @Body() dto: PaymentWebhookDto) {
    const expected = process.env.MOMO_WEBHOOK_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException("Webhook non autorisé");
    }
    await this.payments.handleChargeResult(dto.aggregatorRef, dto.success, dto.reason);
    return { received: true };
  }

  /** EF-13-05 : reçus du payeur, consultables et exportables à vie (D-010). */
  @Get("payments/receipts")
  myReceipts(@Actor() actor: AuthenticatedActor) {
    return this.payments.listReceiptsForPayer(actor.accountId);
  }

  /** Solde disponible, journal des mouvements et retraits (EF-13-06 — le journal est la vérité). */
  @Get("me")
  getMine(@Actor() actor: AuthenticatedActor, @Query() query: EarningsMeQueryDto) {
    return this.earnings.getMine(actor, query);
  }

  /** Étape 1 du retrait : récapitulatif (frais annoncés AVANT confirmation) + envoi OTP (EF-13-07). */
  @Post("withdrawals/start")
  @HttpCode(200)
  startWithdrawal(@Actor() actor: AuthenticatedActor, @Body() dto: StartWithdrawalDto) {
    return this.earnings.startWithdrawal(actor, dto);
  }

  /** Étape 2 : mot de passe + OTP → débit conditionnel + virement MoMo (CU-13-04). */
  @Post("withdrawals/confirm")
  @HttpCode(200)
  confirmWithdrawal(@Actor() actor: AuthenticatedActor, @Body() dto: ConfirmWithdrawalDto) {
    return this.earnings.confirmWithdrawal(actor, dto);
  }
}

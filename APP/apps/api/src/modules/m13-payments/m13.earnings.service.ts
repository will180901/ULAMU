/**
 * M13 — gains & retraits côté titulaire (EF-13-06/07/08 ; CU-13-04).
 * Autorisations (mêmes règles partout) :
 * - PROFESSIONAL : l'acteur EST le titulaire (holderId = son accountId) ;
 * - FACILITY : plus servi (D-051) — refus explicite, voir `assertHolderAccess`.
 * Retrait = action sensible : mot de passe + OTP (EF-13-07), commission ULAMU PM-02 (0 %).
 */
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { EarningsHolderType, Withdrawal, WithdrawalStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { AGGREGATOR_GATEWAY, AggregatorGateway } from "../../common/momo/aggregator.gateway";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { ProofRefusedException } from "../../common/auth/proof-refused";
import { PrismaService } from "../../common/prisma.service";
import { M01Service } from "../m01-accounts/m01.service";
import { ConfirmWithdrawalDto, EarningsMeQueryDto, StartWithdrawalDto } from "./m13.dto";
import { PaymentsService } from "./m13.payments.service";
import { decideOrphanWithdrawal, withdrawalFee } from "./m13.policies";

/**
 * Depuis combien de temps un retrait revendiqué doit être en attente pour qu'on le déclare orphelin.
 *
 * ⚠️ **Ce n'est PAS un paramètre métier**, et c'est pourquoi il n'est pas un PM-xx : il ne décrit
 * aucune règle opposable à un utilisateur, seulement une marge technique — le temps au-delà duquel
 * un `confirmWithdrawal` encore en vol ne peut plus l'être. Le poser trop court couperait un
 * virement en cours ; quinze minutes dépassent largement tout appel d'agrégateur.
 *
 * *(Et un PM-xx neuf poserait un autre problème : Render ne joue jamais le seed, la clé serait donc
 * ABSENTE en production et `params.getInt` jetterait — le balayage mourrait à chaque passage.)*
 */
const DELAI_RETRAIT_ORPHELIN_MS = 15 * 60 * 1000;

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly payments: PaymentsService,
    private readonly m01: M01Service,
    @Inject(AGGREGATOR_GATEWAY) private readonly gateway: AggregatorGateway,
  ) {}

  /**
   * Garde d'accès au compte de gains — vérifiée serveur, à chaque requête (RM-02-03).
   *
   * ── Le cas FACILITY ne passe plus par M02 (dette n°17, 03/09/2026) ──────────────────────────
   *
   * Il vérifiait auparavant, via `PermissionsService`, que l'acteur était titulaire ACTIF de la
   * structure. Ce chemin ne pouvait plus aboutir : plus aucun compte `FACILITY_MEMBER` ne peut
   * naître depuis D-051, et l'inventaire de la base de production a confirmé le 03/09 qu'il n'en
   * existe **aucun** — ni aucune adhésion, ni aucun compte de gains de type FACILITY.
   *
   * La garde répondait donc déjà « refusé » à tous les coups, en trois requêtes. Elle le dit
   * maintenant en une ligne, et M13 n'a plus besoin d'importer M02.
   *
   * ⚠️ Le type `EarningsHolderType` de Prisma garde sa valeur `FACILITY` : c'est une colonne de
   * base, et la retirer demanderait une migration sur la production. Ce `switch` reste donc
   * exhaustif — il refuse ce qu'il ne sait plus servir, au lieu de laisser passer.
   */
  private assertHolderAccess(actor: AuthenticatedActor, holderType: EarningsHolderType, holderId: string): void {
    if (holderType !== "PROFESSIONAL") {
      throw new ForbiddenException(
        "Les comptes de gains de structure ne sont plus servis par ULAMU (D-051) — seuls les gains d'un professionnel le sont",
      );
    }
    if (actor.accountId !== holderId) {
      throw new ForbiddenException("Seul le titulaire de ce compte de gains peut y accéder (EF-13-06)");
    }
  }

  // ── GET /v1/earnings/me (EF-13-06) ──────────────────────────────────────────

  async getMine(actor: AuthenticatedActor, query: EarningsMeQueryDto): Promise<{
    holderType: EarningsHolderType;
    holderId: string;
    availableXaf: number;
    pendingXaf: number;
    entries: Array<{
      id: string;
      type: string;
      amountXaf: number;
      reference: string;
      createdAt: Date;
      grossXaf: number | null;
      commissionXaf: number | null;
    }>;
    withdrawals: Array<{ id: string; amountXaf: number; operator: string; status: WithdrawalStatus; failReason: string | null; requestedAt: Date; executedAt: Date | null }>;
  }> {
    const holderType = query.holderType as EarningsHolderType;
    await this.assertHolderAccess(actor, holderType, query.holderId);

    const earnings = await this.payments.getEarnings(holderType, query.holderId);
    const account = await this.prisma.earningsAccount.findUnique({
      where: { holderType_holderId: { holderType, holderId: query.holderId } },
    });
    const withdrawals = account
      ? await this.prisma.withdrawal.findMany({
          where: { accountId: account.id },
          orderBy: { requestedAt: "desc" },
          take: 50,
        })
      : [];

    return {
      ...earnings,
      entries: await this.withSplitDetail(holderType, query.holderId, earnings.entries),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amountXaf: w.amountXaf,
        operator: w.operator,
        status: w.status,
        failReason: w.failReason,
        requestedAt: w.requestedAt,
        executedAt: w.executedAt,
      })),
    };
  }

  /**
   * S2 — le brut et la commission, à côté du net (famille 1, point 1).
   *
   * ── Pourquoi cette jointure ────────────────────────────────────────────────────────────────────
   *
   * `EarningsEntry.amountXaf` ne porte que le **net**. Le brut et la commission existent bel et
   * bien, mais dans `PaymentSplit`, que la vue du portefeuille ne joignait pas. Un médecin voyait
   * donc « + 11 000 XAF » sans jamais savoir ce que le patient avait payé ni ce qui avait été
   * prélevé — et les maquettes comblaient ce silence en écrivant « 12 % » dans la page.
   *
   * Or **le taux n'est pas PM-01** : c'est celui du contrat signé de CE bénéficiaire-là (RM-13-07).
   * Deux médecins peuvent avoir deux taux le même jour. Aucun écran ne peut donc calculer une
   * commission ; il ne peut que lire celle qui a été appliquée. C'est ce que sert cette jointure.
   *
   * Lecture seule, sur des données déjà écrites. Le lien se fait par `reference` = `orderRef` du
   * paiement — la même clé que le registre C4 utilise (S9).
   *
   * `null` sur les lignes qui n'ont pas de part de paiement : un retrait, ou un mouvement dont le
   * paiement a disparu. `null` et non `0` — l'absence de détail n'est pas une commission nulle.
   */
  private async withSplitDetail(
    holderType: EarningsHolderType,
    holderId: string,
    entries: Array<{ id: string; type: string; amountXaf: number; reference: string; createdAt: Date }>,
  ): Promise<
    Array<{
      id: string;
      type: string;
      amountXaf: number;
      reference: string;
      createdAt: Date;
      grossXaf: number | null;
      commissionXaf: number | null;
    }>
  > {
    // Les références de retrait (`withdrawal:<id>`) ne désignent aucun paiement : inutile de les
    // chercher en base.
    const orderRefs = [...new Set(entries.filter((e) => !e.reference.startsWith("withdrawal:")).map((e) => e.reference))];
    if (orderRefs.length === 0) {
      return entries.map((e) => ({ ...e, grossXaf: null, commissionXaf: null }));
    }

    const splits = await this.prisma.paymentSplit.findMany({
      where: { holderType, holderId, payment: { orderRef: { in: orderRefs } } },
      select: { grossXaf: true, commissionXaf: true, payment: { select: { orderRef: true } } },
    });
    const parRef = new Map(splits.map((s) => [s.payment.orderRef, s]));

    return entries.map((e) => {
      const s = parRef.get(e.reference);
      return { ...e, grossXaf: s?.grossXaf ?? null, commissionXaf: s?.commissionXaf ?? null };
    });
  }

  // ── EF-13-07 : retrait en deux temps (CU-13-04) ─────────────────────────────

  /**
   * Étape 1 — récapitulatif + OTP : crée le Withdrawal(PENDING), vérifie le solde
   * (indicatif ici, REVÉRIFIÉ au débit dans la transaction de confirmation), annonce
   * les frais AVANT confirmation (commission ULAMU PM-02 = 0 %) et envoie l'OTP (M01).
   */
  async startWithdrawal(actor: AuthenticatedActor, dto: StartWithdrawalDto): Promise<{
    withdrawalId: string;
    amountXaf: number;
    ulamuFeeXaf: number;
    netToReceiveXaf: number;
    operator: string;
    otpExpiresInSeconds: number;
    /**
     * S3 — le délai d'exécution annoncé AVANT de confirmer (famille 1, point 2).
     *
     * EF-13-07 exige que les frais ET le délai soient connus avant l'engagement. Les frais y étaient
     * déjà ; le délai, lui, n'était nulle part — alors l'écran aurait écrit « sous 24 h » en dur,
     * la même dette que le « 48 h » du compte-rendu. PM-36 vaut 86 400 s aujourd'hui ; il se change
     * dans E3, et le récapitulatif suivra tout seul.
     */
    payoutDelaySeconds: number;
  }> {
    const holderType = dto.holderType as EarningsHolderType;
    await this.assertHolderAccess(actor, holderType, dto.holderId);

    const account = await this.prisma.earningsAccount.findUnique({
      where: { holderType_holderId: { holderType, holderId: dto.holderId } },
    });
    if (!account || account.availableXaf < dto.amountXaf) {
      throw new ConflictException("Solde disponible insuffisant pour ce retrait");
    }

    // PM-02 : 0 % ULAMU sur les retraits — lu en base, jamais codé en dur.
    // ⚠️ Les frais OPÉRATEUR réels (EF-13-07) seront fournis par l'agrégateur retenu (ADR-09) —
    // l'implémentation dev n'expose pas de barème : seul le « net hors frais opérateur » est annoncé.
    const [pm02, pm36S] = await Promise.all([this.params.getInt("PM-02"), this.params.getInt("PM-36")]);
    const fee = withdrawalFee(dto.amountXaf, pm02);

    // Le MoMo de destination est celui du compte de l'acteur autorisé : le professionnel
    // lui-même, ou le titulaire (OWNER) pour une structure (« vers le MoMo du titulaire »).
    const actorAccount = await this.prisma.account.findUnique({ where: { id: actor.accountId } });
    if (!actorAccount) throw new UnauthorizedException("Compte introuvable");

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.withdrawal.create({
        data: {
          accountId: account.id,
          requestedBy: actor.accountId,
          amountXaf: dto.amountXaf,
          operator: dto.operator,
          phone: actorAccount.phone,
        },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: holderType === "PROFESSIONAL" ? "professional" : "facility_member",
        action: "m13.withdrawal.started",
        resource: `withdrawal:${created.id}`,
        context: { holderType, holderId: dto.holderId, amountXaf: dto.amountXaf, operator: dto.operator },
      });
      return created;
    });

    // OTP « action sensible » (M01) — envoi SMS hors transaction.
    const otp = await this.m01.requestSensitiveActionOtp(actor.accountId);

    return {
      withdrawalId: withdrawal.id,
      amountXaf: dto.amountXaf,
      ulamuFeeXaf: fee,
      netToReceiveXaf: dto.amountXaf - fee,
      operator: dto.operator,
      otpExpiresInSeconds: otp.expiresInSeconds,
      payoutDelaySeconds: pm36S,
    };
  }

  /**
   * Étape 2 — confirmation : mot de passe + OTP, débit CONDITIONNEL (solde revérifié
   * dans la transaction, anti-TOCTOU D-046), virement agrégateur, EXECUTED.
   * Échec du virement → FAILED + RE-CRÉDIT AUTOMATIQUE INTÉGRAL + alerte (EF-13-08, CU-13-04) :
   * l'argent ne disparaît jamais entre deux systèmes.
   */
  async confirmWithdrawal(actor: AuthenticatedActor, dto: ConfirmWithdrawalDto): Promise<{
    withdrawalId: string;
    status: WithdrawalStatus;
    amountXaf: number;
    failReason: string | null;
  }> {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: dto.withdrawalId },
      include: { account: true },
    });
    if (!withdrawal) throw new NotFoundException("Retrait introuvable");
    if (withdrawal.requestedBy !== actor.accountId) {
      throw new ForbiddenException("Ce retrait n'a pas été initié par vous");
    }
    // Ré-autorisation au moment de l'exécution (un titulaire révoqué entre-temps est refusé).
    await this.assertHolderAccess(actor, withdrawal.account.holderType, withdrawal.account.holderId);
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new ConflictException(`Ce retrait a déjà été traité (statut ${withdrawal.status})`);
    }

    const passwordOk = await this.m01.verifyAccountPassword(actor.accountId, dto.password);
    if (!passwordOk) throw new ProofRefusedException("Mot de passe incorrect");

    // OTP consommé dans sa PROPRE transaction, AVANT le débit (D-047) : un code faux y incrémente
    // attempts de façon durable (le rollback de la tx de débit n'efface plus le compteur) —
    // plus de brute-force du code à 6 chiffres sur le chemin retrait. Un crash entre les deux
    // transactions ne coûte qu'un OTP à redemander, jamais de l'argent.
    const feeXaf = withdrawalFee(withdrawal.amountXaf, await this.params.getInt("PM-02"));
    const netXaf = withdrawal.amountXaf - feeXaf;
    await this.prisma.$transaction(async (tx) => {
      await this.m01.verifySensitiveActionOtp(tx, actor.accountId, dto.otpCode); // jette si invalide
    });

    // TX 1 — revendication du retrait + débit conditionnel + mouvement.
    await this.prisma.$transaction(async (tx) => {
      // Revendication : un seul confirm concurrent gagne (aggregatorRef sert de marqueur).
      const claimed = await tx.withdrawal.updateMany({
        where: { id: withdrawal.id, status: WithdrawalStatus.PENDING, aggregatorRef: null },
        data: { aggregatorRef: withdrawal.id },
      });
      if (claimed.count === 0) throw new ConflictException("Ce retrait est déjà en cours de traitement");

      // RM-13-02 + D-046 : solde revérifié AU DÉBIT — jamais de solde négatif par un retrait.
      const debited = await tx.earningsAccount.updateMany({
        where: { id: withdrawal.accountId, availableXaf: { gte: withdrawal.amountXaf } },
        data: { availableXaf: { decrement: withdrawal.amountXaf } },
      });
      if (debited.count === 0) {
        throw new ConflictException("Solde disponible insuffisant au moment du débit"); // rollback intégral
      }
      await tx.earningsEntry.create({
        data: {
          accountId: withdrawal.accountId,
          type: "WITHDRAWAL",
          amountXaf: -withdrawal.amountXaf,
          reference: `withdrawal:${withdrawal.id}`,
        },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: withdrawal.account.holderType === "PROFESSIONAL" ? "professional" : "facility_member",
        action: "m13.withdrawal.debited",
        resource: `withdrawal:${withdrawal.id}`,
        context: { amountXaf: withdrawal.amountXaf, netXaf, operator: withdrawal.operator },
      });
    });

    // Virement agrégateur — RÉSEAU, hors transaction (RM-13-03).
    let payoutOk = false;
    let payoutFailReason = "Virement refusé par l'agrégateur Mobile Money";
    try {
      const res = await this.gateway.requestPayout({
        aggregatorRef: withdrawal.id,
        phone: withdrawal.phone,
        amountXaf: netXaf,
        operator: withdrawal.operator,
      });
      payoutOk = res.accepted;
    } catch (err) {
      this.logger.error(`Virement agrégateur en échec pour ${withdrawal.id}: ${(err as Error).message}`);
      payoutFailReason = "Agrégateur Mobile Money indisponible";
    }

    // TX 2 — issue (transitions conditionnelles PENDING→…, idempotentes).
    if (payoutOk) {
      await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.withdrawal.updateMany({
          where: { id: withdrawal.id, status: WithdrawalStatus.PENDING },
          // net/frais FIGÉS à l'exécution — la réconciliation reste stable même si PM-02 change.
          data: { status: WithdrawalStatus.EXECUTED, executedAt: new Date(), netXaf, feeXaf },
        });
        if (count === 0) return;
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: actor.accountId, template: "m13.withdrawal.executed", amountXaf: withdrawal.amountXaf, netXaf },
        });
        await this.audit.emit(tx, {
          actorId: actor.accountId,
          actorType: withdrawal.account.holderType === "PROFESSIONAL" ? "professional" : "facility_member",
          action: "m13.withdrawal.executed",
          resource: `withdrawal:${withdrawal.id}`,
          context: { amountXaf: withdrawal.amountXaf, netXaf },
        });
      });
    } else {
      await this.failAndRecredit(withdrawal, payoutFailReason, actor.accountId);
    }

    const fresh = await this.prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawal.id } });
    return { withdrawalId: fresh.id, status: fresh.status, amountXaf: fresh.amountXaf, failReason: fresh.failReason };
  }

  /**
   * ── Les retraits ORPHELINS : débités, sans issue (chantier 50, 06/09/2026) ──────────────────
   *
   * `confirmWithdrawal` procède en trois temps, et il le doit : **TX 1** débite le solde, puis
   * l'appel réseau à l'agrégateur se fait HORS transaction (RM-13-03 — on ne tient pas une
   * transaction ouverte pendant un appel réseau), puis **TX 2** conclut.
   *
   * ⚠️ **Si le processus meurt entre 1 et 3, l'argent est débité et personne ne le sait.** Le
   * retrait reste `PENDING` avec son `aggregatorRef` posé, et rien ne le rattrape :
   *
   *   • l'utilisateur ne peut pas réessayer — la revendication exige `aggregatorRef: null`, il
   *     reçoit « déjà en cours de traitement », pour toujours ;
   *   • la réconciliation quotidienne ne le voit pas : elle ne lit que les retraits `EXECUTED` ;
   *   • aucune route d'administration ne peut le débloquer ;
   *   • et il **empêche la clôture du compte** (`m01` compte les `PENDING` parmi les prérequis).
   *
   * Le plan gratuit de Render endort le service après ~15 min et le redémarre à la demande : un
   * déploiement, un redémarrage, ou un délai d'agrégateur qui survit au processus suffisent.
   *
   * ── Pourquoi ce balayage ne DEVINE rien ──────────────────────────────────────────────────────
   *
   * Re-créditer un retrait dont le virement est effectivement parti paierait DEUX FOIS. Le
   * balayage ne décide donc pas : il **demande à l'agrégateur** (`listConfirmed`, le même relevé
   * que la réconciliation) si une ligne `PAYOUT` porte cette référence.
   *
   *   • ligne trouvée  → le virement a eu lieu : on solde en `EXECUTED`, rien n'est re-crédité ;
   *   • ligne absente  → il n'a pas eu lieu : `failAndRecredit`, le soignant retrouve son argent.
   *
   * Dans les deux cas l'administration Finance est prévenue : un processus mort au milieu d'un
   * mouvement d'argent ne doit jamais rester silencieux, même quand il se répare tout seul.
   */
  async sweepStuckWithdrawals(): Promise<{ examines: number; executes: number; recredites: number }> {
    const limite = new Date(Date.now() - DELAI_RETRAIT_ORPHELIN_MS);
    const orphelins = await this.prisma.withdrawal.findMany({
      // Cette clause EST `isOrphanWithdrawal`, écrite en SQL : la règle et sa mise en base disent
      // la même chose, et c'est la règle que le .spec éprouve.
      where: { status: WithdrawalStatus.PENDING, aggregatorRef: { not: null }, requestedAt: { lt: limite } },
      include: { account: true },
    });
    if (orphelins.length === 0) return { examines: 0, executes: 0, recredites: 0 };

    /*
      Le relevé de l'agrégateur est l'ARBITRE. S'il est illisible — réseau, agrégateur endormi —
      on ne touche à rien : décider sans lui, c'est risquer de payer deux fois. Le prochain passage
      réessaiera, et le retrait reste visible dans `scripts/etat-retraits.ts`.
    */
    let virements: string[] | null = null;
    try {
      const releve = await this.gateway.listConfirmed();
      virements = releve.filter((l) => l.kind === "PAYOUT").map((l) => l.aggregatorRef);
    } catch (err) {
      this.logger.error(`Retraits orphelins non traités — relevé agrégateur illisible : ${(err as Error).message}`);
      return { examines: orphelins.length, executes: 0, recredites: 0 };
    }

    const pm02 = await this.params.getInt("PM-02");
    let executes = 0;
    let recredites = 0;

    for (const w of orphelins) {
      const feeXaf = withdrawalFee(w.amountXaf, pm02);
      const netXaf = w.amountXaf - feeXaf;
      /*
        La décision ne se prend pas ici : elle vit dans `m13.policies` avec son pourquoi, et le
        .spec l'éprouve. Ce service ne fait que l'appliquer.
      */
      const decision = decideOrphanWithdrawal(w.aggregatorRef, virements);
      if (decision === "ATTENDRE") continue;
      if (decision === "SOLDER") {
        // Le virement est parti : on ne re-crédite RIEN, on ne fait que constater.
        await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.withdrawal.updateMany({
            where: { id: w.id, status: WithdrawalStatus.PENDING },
            data: { status: WithdrawalStatus.EXECUTED, executedAt: new Date(), netXaf, feeXaf },
          });
          if (count === 0) return; // un autre passage l'a soldé entre-temps
          await this.audit.emit(tx, {
            actorType: "system",
            action: "m13.withdrawal.orphan.executed",
            resource: `withdrawal:${w.id}`,
            context: { amountXaf: w.amountXaf, netXaf, raison: "virement confirmé par l'agrégateur" },
          });
          await this.payments.notifyFinanceAdmins(tx, "m13.withdrawal.failed", { withdrawalId: w.id });
        });
        executes += 1;
      } else {
        // Aucun virement chez l'agrégateur : l'argent doit revenir au soignant.
        await this.failAndRecredit(w, "Interrompu avant l'exécution — montant recrédité", "m16.scheduler");
        recredites += 1;
      }
    }

    this.logger.warn(
      `Retraits orphelins : ${orphelins.length} examiné(s), ${executes} soldé(s), ${recredites} recrédité(s)`,
    );
    return { examines: orphelins.length, executes, recredites };
  }

  /** CU-13-04 : échec opérateur → re-crédit automatique INTÉGRAL + alerte — tout dans la même tx. */
  private async failAndRecredit(withdrawal: Withdrawal, failReason: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.withdrawal.updateMany({
        where: { id: withdrawal.id, status: WithdrawalStatus.PENDING },
        data: { status: WithdrawalStatus.FAILED, failReason },
      });
      if (count === 0) return; // déjà soldé (rejeu)

      // RM-13-02 : re-crédit = mouvement CREDIT + solde, même transaction.
      await tx.earningsEntry.create({
        data: {
          accountId: withdrawal.accountId,
          type: "CREDIT",
          amountXaf: withdrawal.amountXaf,
          reference: `withdrawal:${withdrawal.id}:recredit`,
        },
      });
      await tx.earningsAccount.update({
        where: { id: withdrawal.accountId },
        data: { availableXaf: { increment: withdrawal.amountXaf } },
      });

      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: actorId, template: "m13.withdrawal.failed", amountXaf: withdrawal.amountXaf, failReason },
      });
      // Alerte finance (CU-13-04) : un échec de virement ne doit jamais passer inaperçu.
      await this.payments.notifyFinanceAdmins(tx, "m13.withdrawal.failed", { withdrawalId: withdrawal.id });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m13.withdrawal.failed",
        resource: `withdrawal:${withdrawal.id}`,
        context: { amountXaf: withdrawal.amountXaf, failReason, recredited: true },
      });
    });
  }
}

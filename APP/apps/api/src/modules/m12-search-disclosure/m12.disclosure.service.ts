/**
 * M12 — DisclosureService : la moitié PAYANTE du modèle signature (D-009).
 * Spec : docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md
 *
 * « Voici exactement où, réservé pour toi pendant 24 h » — 500 XAF (PM-03, 100 % ULAMU).
 *
 * Invariants :
 * - RM-12-01 (RÈGLE D'OR) : aucune identité de structure (nom, téléphone, quartier, GPS,
 *   itinéraire, compte à rebours) n'est exposée sans un dévoilement ACTIVE du patient — toute
 *   sortie d'identité passe par revealIfActive() (m12.policies) ;
 * - RM-12-05 : le dévoilement est personnel — lié au compte du patient (404 sinon) ;
 * - RM-12-02 : disponible publié = stock réel − réservations actives (pas de double promesse) ;
 * - RM-12-03 : réservation servie ou expirée = quantités libérées immédiatement ;
 * - RM-12-06 : le patient ne paie jamais deux fois un même échec (re-dévoilement gratuit ou
 *   remboursement) ;
 * - Anti-TOCTOU (D-046) : transitions par updateMany CONDITIONNEL (count) ; la pose de
 *   réservation re-vérifie availableQuantity en transaction SERIALIZABLE (anti sur-réservation).
 *
 * RIEN n'est révélé tant que le paiement n'est pas confirmé (CU-12-02) : la pharmacie optimale
 * est RE-CHOISIE au moment de la confirmation du paiement (le stock a pu bouger).
 *
 * NOTE : aucun poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11). sweepExpired()
 * est public, cadencé par M16/cron plus tard.
 */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  Disclosure,
  DisclosureStatus,
  Prisma,
  ReservationStatus,
  StrikeStatus,
} from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService, TxClient } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { StockAvailabilityService } from "../m11-stocks/m11.availability.service";
import { STRIKE_WINDOW_DAYS } from "../m11-stocks/m11.policies";
import { PaymentsService, PaymentState } from "../m13-payments/m13.payments.service";
import { RequestDisclosureDto } from "./m12.dto";
import {
  disclosureExpired,
  disclosureIdFromOrderRef,
  DisclosureStatusCode,
  excludedFacilityIds,
  normalizeItems,
  orderRefForDisclosure,
  reachesStrikeThreshold,
  remainingSeconds,
  RevealedFacility,
  revealIfActive,
  SearchItem,
  STRIKE_EXCLUSION_THRESHOLD,
} from "./m12.policies";

/** Vue d'un dévoilement — l'identité de la pharmacie n'est présente QUE si status ACTIVE (RM-12-01). */
export interface DisclosureView {
  id: string;
  status: DisclosureStatus;
  district: string;
  requestedItems: SearchItem[];
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  servedAt: string | null;
  /** Compte à rebours SERVEUR (RM-06-02 / D-025) — 0 hors dévoilement ACTIVE. */
  remainingSeconds: number;
  /** Référence opaque du paiement (C1) — utile au reçu (M13), jamais une identité. */
  orderRef: string;
  /** Prix du dévoilement (PM-03), lu en direct — jamais une valeur figée côté client. */
  amountXaf: number;
  /** RM-12-01 : nom / téléphone / quartier / GPS révélés UNIQUEMENT si ACTIVE, sinon null. */
  facility: RevealedFacility | null;
}

@Injectable()
export class DisclosureService {
  private readonly logger = new Logger(DisclosureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly availability: StockAvailabilityService,
    private readonly payments: PaymentsService,
  ) {}

  /** Prix courant du dévoilement (PM-03) — lecture publique pour l'afficher AVANT paiement (jamais en dur côté client). */
  async getPrice(): Promise<{ amountXaf: number }> {
    return { amountXaf: await this.params.getInt("PM-03") };
  }

  // ── EF-12-03 / CU-12-02 : demande de dévoilement (paiement C1) ──────────────

  /**
   * 1) on vérifie qu'une pharmacie COUVRE les produits dans l'arrondissement (pickOptimalFacility) —
   *    sinon 409 + proposition de cloche (rien n'est facturé pour rien) ;
   * 2) on crée le Disclosure(PENDING_PAYMENT, orderRef="disclosure:<id>", requestedItems) ;
   * 3) on ordonne l'encaissement PM-03 (C1, 100 % ULAMU — pas de bénéficiaire, capture IMMEDIATE).
   * RIEN n'est révélé ici : facilityId reste null jusqu'à la confirmation du paiement (CU-12-02).
   */
  async requestDisclosure(actor: AuthenticatedActor, dto: RequestDisclosureDto): Promise<DisclosureView> {
    this.assertPatient(actor);
    const items = normalizeItems(dto.items);
    if (items.length === 0) {
      throw new ConflictException("Aucun produit valide à dévoiler");
    }

    // Pré-vérification : au moins une pharmacie couvre un produit MAINTENANT. La pharmacie sera
    // RE-CHOISIE à la confirmation (le stock peut bouger) — ici on évite de facturer dans le vide.
    const candidate = await this.availability.pickOptimalFacility({ district: dto.district, items });
    if (!candidate) {
      throw new ConflictException(
        "Aucune pharmacie ne couvre ces produits dans cet arrondissement pour l'instant — " +
          "posez une cloche « me prévenir si disponible » (EF-12-06)",
      );
    }

    const amountXaf = await this.params.getInt("PM-03"); // prix du dévoilement (jamais en dur)

    const disclosure = await this.prisma.$transaction(async (tx) => {
      const created = await tx.disclosure.create({
        data: {
          patientAccountId: actor.accountId,
          district: dto.district,
          orderRef: "pending", // remplacé juste après par "disclosure:<id>" (besoin de l'id)
          status: DisclosureStatus.PENDING_PAYMENT,
          requestedItems: items as unknown as Prisma.InputJsonValue,
        },
      });
      const orderRef = orderRefForDisclosure(created.id);
      const withRef = await tx.disclosure.update({ where: { id: created.id }, data: { orderRef } });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m12.disclosure.requested",
        resource: `disclosure:${created.id}`,
        context: { district: dto.district, productCount: items.length, amountXaf },
      });
      return withRef;
    });

    // C1 : ordre référencé, 100 % ULAMU (PM-03) — pas de bénéficiaire, capture IMMEDIATE.
    // L'issue arrive par l'outbox (m13.payment.succeeded/failed) → onPaymentSucceeded/Failed.
    await this.payments.requestCharge({
      orderRef: disclosure.orderRef,
      payerAccountId: actor.accountId,
      amountXaf,
      operator: dto.operator,
      capture: "IMMEDIATE",
    });

    // On retourne l'état SANS identité (PENDING_PAYMENT → facility masquée par revealIfActive).
    return await this.toView(disclosure, null, Date.now());
  }

  // ── Webhooks M13 (C1, via l'outbox commun — abonnés par M12Module) ──────────

  /**
   * m13.payment.succeeded : PENDING_PAYMENT → ACTIVE (transition conditionnelle, D-046).
   * On RE-CHOISIT la pharmacie optimale MAINTENANT (le stock a pu bouger depuis la demande) et on
   * pose la réservation 24 h en transaction SERIALIZABLE, en re-vérifiant availableQuantity (anti
   * sur-réservation, RM-12-02). Si AUCUNE pharmacie ne couvre à la confirmation → remboursement
   * automatique (RM-12-06) + REFUNDED + cloche. IDEMPOTENT : un événement rejoué est sans effet.
   */
  async onPaymentSucceeded(payload: Record<string, unknown>): Promise<void> {
    const disclosure = await this.loadFromOrderRef(payload);
    if (!disclosure) return; // ordre d'un autre module, ou dévoilement inconnu

    // Rejeu : déjà activé/servi/remboursé pour cet ordre → no-op (ADR-11/12).
    if (disclosure.status !== DisclosureStatus.PENDING_PAYMENT) {
      // Cas excédentaire : un succès de paiement alors que le dévoilement n'attend plus rien →
      // remboursement défensif (le canal C1 a confirmé un ordre dont on n'a plus l'usage).
      if (disclosure.status === DisclosureStatus.EXPIRED) {
        await this.safeRefund(disclosure.orderRef, "Paiement confirmé après expiration de la demande de dévoilement");
      }
      return;
    }

    const items = this.itemsOf(disclosure);
    const now = new Date();

    // RE-CHOIX au moment de la confirmation (CU-12-02) — hors transaction (lectures M11).
    const candidate = await this.availability.pickOptimalFacility({ district: disclosure.district, items });
    if (!candidate) {
      // Aucune pharmacie disponible À LA CONFIRMATION → remboursement intégral (RM-12-06).
      await this.refundForNoAlternative(disclosure, "Plus aucune pharmacie ne couvrait vos produits au moment du paiement");
      return;
    }

    const pm08S = await this.params.getInt("PM-08"); // durée dévoilement/réservation (secondes, 24 h)
    const expiresAt = new Date(now.getTime() + pm08S * 1000);

    let activated = false;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Transition conditionnelle PENDING_PAYMENT → ACTIVE (un seul gagnant en cas de course).
          const { count } = await tx.disclosure.updateMany({
            where: { id: disclosure.id, status: DisclosureStatus.PENDING_PAYMENT },
            data: { status: DisclosureStatus.ACTIVE, facilityId: candidate.facilityId, paidAt: now, expiresAt },
          });
          if (count === 0) return; // rejeu : déjà traité

          // RM-12-02 : pose de la réservation, disponible re-vérifié DANS la transaction Serializable.
          await this.placeReservation(tx, disclosure.id, candidate.facilityId, items, expiresAt, now);
          activated = true;

          await this.notifyRevealed(tx, disclosure.patientAccountId, disclosure.id);
          await this.audit.emit(tx, {
            actorType: "system",
            action: "m12.disclosure.activated",
            resource: `disclosure:${disclosure.id}`,
            context: { facilityId: candidate.facilityId, coverage: candidate.coverage, orderRef: disclosure.orderRef },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      // Sur-réservation détectée (course de stock) ou conflit de sérialisation : on rembourse
      // (RM-12-06 : on ne garde jamais 500 XAF sans révélation tenable).
      if (err instanceof ConflictException || this.isSerializationConflict(err)) {
        this.logger.warn(`Réservation impossible à la confirmation de ${disclosure.orderRef}: ${(err as Error).message}`);
        await this.refundForNoAlternative(disclosure, "La pharmacie n'avait plus le stock suffisant au moment du paiement");
        return;
      }
      throw err; // erreur technique → l'outbox rejouera
    }

    if (!activated) return; // rejeu pur (transition déjà passée)
  }

  /**
   * m13.payment.failed : rien n'est révélé (CU-12-02). On notifie le patient ; il peut relancer
   * un nouveau dévoilement (le dévoilement PENDING_PAYMENT reste en l'état, jamais activé).
   */
  async onPaymentFailed(payload: Record<string, unknown>): Promise<void> {
    const disclosure = await this.loadFromOrderRef(payload);
    if (!disclosure) return;
    await this.outbox.emit(this.prisma, {
      type: "notify.request",
      payload: { accountId: disclosure.patientAccountId, template: "m12.disclosure.payment_failed", disclosureId: disclosure.id },
    });
  }

  // ── EF-12-04 / CU-12-05 : lecture (expiration paresseuse + masquage RM-12-01) ──

  /**
   * RM-12-05 : 404 si le dévoilement n'appartient pas au patient. L'expiration est appliquée
   * PARESSEUSEMENT (ACTIVE & expiresAt ≤ now → EXPIRED + Reservation EXPIRED + stock republié,
   * RM-12-03). RM-12-01 : l'identité n'est jointe que si le statut FINAL est ACTIVE.
   */
  async getDisclosure(actor: AuthenticatedActor, disclosureId: string): Promise<DisclosureView> {
    const disclosure = await this.prisma.disclosure.findUnique({ where: { id: disclosureId } });
    // 404 (jamais 403) si ce n'est pas le sien : pas de fuite d'existence (RM-12-05).
    if (!disclosure || disclosure.patientAccountId !== actor.accountId) {
      throw new NotFoundException("Dévoilement introuvable");
    }
    await this.expireIfStale(disclosure, new Date());
    const fresh = await this.prisma.disclosure.findUniqueOrThrow({ where: { id: disclosureId } });
    const facility = await this.loadRevealedFacility(fresh);
    return await this.toView(fresh, facility, Date.now());
  }

  /** EF-12-09 : mes dévoilements (expiration paresseuse appliquée), du plus récent au plus ancien. */
  async listMine(actor: AuthenticatedActor, limit: number): Promise<{ items: DisclosureView[] }> {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => this.expireStaleIn(tx, { patientAccountId: actor.accountId }, now));
    const rows = await this.prisma.disclosure.findMany({
      where: { patientAccountId: actor.accountId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const views: DisclosureView[] = [];
    for (const d of rows) {
      const facility = await this.loadRevealedFacility(d);
      views.push(await this.toView(d, facility, now.getTime()));
    }
    return { items: views };
  }

  // ── EF-12-05 / CU-12-03 : remise en pharmacie (clôture propre) ──────────────

  /**
   * Marque la réservation SERVED + le dévoilement SERVED, quantités libérées (RM-12-03). Réservé
   * à un membre ACTIF de la pharmacie révélée (ou déclenché à la délivrance M09). Le scan M09
   * appellera cette même méthode avec un acteur de la pharmacie.
   */
  async markServed(actor: AuthenticatedActor, disclosureId: string): Promise<DisclosureView> {
    const disclosure = await this.prisma.disclosure.findUnique({ where: { id: disclosureId } });
    if (!disclosure) throw new NotFoundException("Dévoilement introuvable");
    if (!disclosure.facilityId) {
      throw new ConflictException("Ce dévoilement n'a révélé aucune pharmacie");
    }
    await this.assertActiveFacilityMember(actor, disclosure.facilityId);

    const now = new Date();
    let served = false;
    await this.prisma.$transaction(async (tx) => {
      // ACTIVE → SERVED (conditionnel). L'expiration a pu gagner la course : on ne sert pas un expiré.
      const { count } = await tx.disclosure.updateMany({
        where: { id: disclosureId, status: DisclosureStatus.ACTIVE },
        data: { status: DisclosureStatus.SERVED, servedAt: now },
      });
      if (count === 0) return;
      served = true;
      // RM-12-03 : réservation servie → quantités libérées immédiatement.
      await tx.reservation.updateMany({
        where: { disclosureId, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.SERVED, servedAt: now },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: disclosure.patientAccountId, template: "m12.disclosure.served", disclosureId },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m12.disclosure.served",
        resource: `disclosure:${disclosureId}`,
        context: { facilityId: disclosure.facilityId },
      });
    });

    const fresh = await this.prisma.disclosure.findUniqueOrThrow({ where: { id: disclosureId } });
    if (!served && fresh.status !== DisclosureStatus.SERVED) {
      throw new ConflictException(`Remise impossible : le dévoilement n'est plus actif (statut ${fresh.status})`);
    }
    const facility = await this.loadRevealedFacility(fresh);
    return await this.toView(fresh, facility, Date.now());
  }

  // ── EF-12-06 / CU-12-04 : « produit non disponible » (GARANTIE Q-004) ───────

  /**
   * Le patient signale, depuis sa session ACTIVE, que la pharmacie révélée n'avait pas le produit :
   * 1) strike de fiabilité ACTIVE sur la pharmacie fautive (EF-12-07) + libération de la réservation ;
   * 2) re-choix EXCLUANT la pharmacie fautive ET toutes celles déjà essayées (chaîne supersedes) :
   *    - alternative trouvée → RE-DÉVOILEMENT GRATUIT (nouvelle Disclosure ACTIVE, supersedesId,
   *      sans paiement) + nouvelle réservation ; l'ancien dévoilement passe EXPIRED (RM-12-06) ;
   *    - aucune alternative → remboursement intégral des 500 XAF (RM-12-06) + REFUNDED + excuse + cloche ;
   * 3) si la pharmacie atteint 3 strikes ACTIVE en 30 j → exclusion (gérée par M11.isPublishable,
   *    non dupliquée) + alerte contractuelle au titulaire.
   */
  async reportUnavailable(actor: AuthenticatedActor, disclosureId: string): Promise<DisclosureView> {
    this.assertPatient(actor);
    const disclosure = await this.prisma.disclosure.findUnique({ where: { id: disclosureId } });
    if (!disclosure || disclosure.patientAccountId !== actor.accountId) {
      throw new NotFoundException("Dévoilement introuvable");
    }
    // Expiration paresseuse d'abord : on ne signale que sur un dévoilement encore ACTIVE.
    await this.expireIfStale(disclosure, new Date());
    const current = await this.prisma.disclosure.findUniqueOrThrow({ where: { id: disclosureId } });
    if (current.status !== DisclosureStatus.ACTIVE || !current.facilityId) {
      throw new ConflictException("Signalement impossible : ce dévoilement n'est plus actif (EF-12-06)");
    }

    const faultyFacilityId = current.facilityId;
    const items = this.itemsOf(current);
    const now = new Date();

    // Pharmacies à exclure du re-dévoilement : la fautive + toutes celles essayées dans la chaîne.
    const exclude = await this.chainFacilityIds(current);

    // Re-choix HORS transaction (lectures M11) — la fautive est déjà notée pour exclusion.
    const alternative = await this.availability.pickOptimalFacility({
      district: current.district,
      items,
      excludeFacilityIds: exclude,
    });

    // 1) Strike + libération + (re-dévoilement | remboursement) dans UNE transaction (atomique).
    if (alternative) {
      const pm08S = await this.params.getInt("PM-08");
      const newExpiresAt = new Date(now.getTime() + pm08S * 1000);
      let done = false;
      let newDisclosureId: string | null = null;
      try {
        await this.prisma.$transaction(
          async (tx) => {
            // Transition ACTIVE → EXPIRED de l'ancien (conditionnelle) : on ne re-dévoile qu'une fois.
            const { count } = await tx.disclosure.updateMany({
              where: { id: current.id, status: DisclosureStatus.ACTIVE },
              data: { status: DisclosureStatus.EXPIRED },
            });
            if (count === 0) return; // course : déjà traité ailleurs
            done = true;

            await this.releaseReservation(tx, current.id, now);
            await this.recordStrike(tx, faultyFacilityId, current.id, now);

            // RE-DÉVOILEMENT GRATUIT (RM-12-06) : nouvelle Disclosure ACTIVE, sans paiement.
            const fresh = await tx.disclosure.create({
              data: {
                patientAccountId: current.patientAccountId,
                district: current.district,
                facilityId: alternative.facilityId,
                orderRef: `${current.orderRef}:redisclose:${now.getTime()}`,
                status: DisclosureStatus.ACTIVE,
                requestedItems: current.requestedItems ?? Prisma.JsonNull,
                supersedesId: current.id,
                paidAt: current.paidAt,
                expiresAt: newExpiresAt,
              },
            });
            newDisclosureId = fresh.id;
            await this.placeReservation(tx, fresh.id, alternative.facilityId, items, newExpiresAt, now);

            await this.outbox.emit(tx, {
              type: "notify.request",
              payload: {
                accountId: current.patientAccountId,
                template: "m12.disclosure.redisclosed",
                disclosureId: fresh.id,
                supersedesId: current.id,
              },
            });
            await this.audit.emit(tx, {
              actorId: actor.accountId,
              actorType: "patient",
              action: "m12.disclosure.reported_unavailable",
              resource: `disclosure:${current.id}`,
              context: { faultyFacilityId, newDisclosureId: fresh.id, outcome: "redisclosed" },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err) {
        // Le stock de l'alternative a filé entre le re-choix et la pose : on bascule en remboursement.
        if (err instanceof ConflictException || this.isSerializationConflict(err)) {
          this.logger.warn(`Re-dévoilement impossible pour ${current.orderRef}: ${(err as Error).message}`);
          await this.reportWithRefund(actor, current, faultyFacilityId, now);
          return this.viewOf(current.id);
        }
        throw err;
      }
      // Strike posé : si la fautive atteint le seuil, on alerte son titulaire (hors transaction).
      if (done) await this.maybeAlertOnStrikeThreshold(faultyFacilityId, now);
      // MAJOR corrigé : on renvoie le NOUVEAU dévoilement actif (où aller), pas l'ancien EXPIRED.
      return this.viewOf(newDisclosureId ?? current.id);
    }

    // 2) Aucune alternative → remboursement intégral (RM-12-06).
    await this.reportWithRefund(actor, current, faultyFacilityId, now);
    await this.maybeAlertOnStrikeThreshold(faultyFacilityId, now);
    return this.viewOf(current.id);
  }

  // ── EF-12-07 : contestation d'un strike (côté pharmacie) ────────────────────

  /** ACTIVE → CONTESTED (arbitrage M16 plus tard). Réservé à un membre actif de la pharmacie. */
  async contestStrike(actor: AuthenticatedActor, strikeId: string, reason: string): Promise<{ strikeId: string; status: StrikeStatus }> {
    const strike = await this.prisma.reliabilityStrike.findUnique({ where: { id: strikeId } });
    if (!strike) throw new NotFoundException("Strike introuvable");
    await this.assertActiveFacilityMember(actor, strike.facilityId);

    let contested = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.reliabilityStrike.updateMany({
        where: { id: strikeId, status: StrikeStatus.ACTIVE },
        data: { status: StrikeStatus.CONTESTED },
      });
      if (count === 0) return;
      contested = true;
      // M16 (arbitrage) prendra le relais — on émet l'événement inter-modules + audit.
      await this.outbox.emit(tx, {
        type: "m12.strike.contested",
        payload: { strikeId, facilityId: strike.facilityId, reason },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "facility_member",
        action: "m12.strike.contested",
        resource: `strike:${strikeId}`,
        context: { facilityId: strike.facilityId, reason },
      });
    });

    const fresh = await this.prisma.reliabilityStrike.findUniqueOrThrow({ where: { id: strikeId } });
    if (!contested && fresh.status !== StrikeStatus.CONTESTED) {
      throw new ConflictException(`Contestation impossible : le strike n'est plus actif (statut ${fresh.status})`);
    }
    return { strikeId, status: fresh.status };
  }

  /**
   * Arbitrage d'un strike par l'Équipe ULAMU (EF-12-07, déclenché par M16 — back-office) :
   * uphold=false ⇒ CANCELLED (le strike tombe, la pharmacie cesse d'être pénalisée) ;
   * uphold=true ⇒ ACTIVE (maintenu). Transition conditionnelle depuis ACTIVE/CONTESTED (D-046).
   * Écriture PROPRIÉTAIRE de M12 (RM-16-01) : M16 DÉCIDE, M12 APPLIQUE et notifie le titulaire —
   * le Pilotage ne touche jamais ReliabilityStrike directement.
   */
  async arbitrateStrike(adminId: string, strikeId: string, uphold: boolean, reason: string): Promise<{ strikeId: string; status: StrikeStatus }> {
    const strike = await this.prisma.reliabilityStrike.findUnique({ where: { id: strikeId } });
    if (!strike) throw new NotFoundException("Strike introuvable");
    const target = uphold ? StrikeStatus.ACTIVE : StrikeStatus.CANCELLED;

    let arbitrated = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.reliabilityStrike.updateMany({
        where: { id: strikeId, status: { in: [StrikeStatus.ACTIVE, StrikeStatus.CONTESTED] } },
        data: { status: target },
      });
      if (count === 0) return;
      arbitrated = true;
      // Le titulaire de la pharmacie est informé de l'issue (jamais de médical, RM-14-03).
      const owner = await tx.facilityMember.findFirst({ where: { facilityId: strike.facilityId, role: "OWNER", active: true } });
      if (owner) {
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: owner.accountId, template: uphold ? "m12.strike.upheld" : "m12.strike.cancelled", strikeId },
        });
      }
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m12.strike.arbitrated",
        resource: `strike:${strikeId}`,
        context: { facilityId: strike.facilityId, uphold, reason },
      });
    });

    const fresh = await this.prisma.reliabilityStrike.findUniqueOrThrow({ where: { id: strikeId } });
    if (!arbitrated && fresh.status === strike.status) {
      throw new ConflictException(`Ce strike n'est plus arbitrable (statut ${fresh.status})`);
    }
    return { strikeId, status: fresh.status };
  }

  // ── Balayage public (cadencé par M16/cron plus tard — AUCUN poller ici) ─────

  /**
   * CU-12-05 : expire les dévoilements ACTIVE échus (expiresAt ≤ now), libère leur réservation
   * (stock republié, RM-12-03) et informe le patient. Conditionnel ligne à ligne (D-046).
   */
  async sweepExpired(now: Date = new Date()): Promise<{ expired: number }> {
    let expired = 0;
    await this.prisma.$transaction(async (tx) => {
      expired = await this.expireStaleIn(tx, {}, now);
    });
    return { expired };
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  /**
   * Pose la réservation 24 h DANS la transaction (Serializable) : pour chaque item, on RE-LIT le
   * disponible publié (availableQuantity = stock − réservations ACTIVE) et on jette si insuffisant
   * (anti sur-réservation, RM-12-02). La ligne de réservation déduit immédiatement le disponible.
   */
  private async placeReservation(
    tx: Prisma.TransactionClient,
    disclosureId: string,
    facilityId: string,
    items: SearchItem[],
    expiresAt: Date,
    now: Date,
  ): Promise<void> {
    const reservation = await tx.reservation.create({
      data: { disclosureId, facilityId, status: ReservationStatus.ACTIVE, expiresAt },
    });
    for (const item of items) {
      // RM-12-02 : disponible publié re-vérifié au moment de la pose (le stock a pu bouger).
      // On passe `tx` (Serializable) pour que la lecture entre dans le snapshot — sans quoi
      // PostgreSQL SSI ne détecterait pas deux poses concurrentes (sur-réservation). Avec `tx`,
      // l'une des deux échoue (P2034) et bascule en remboursement (catch isSerializationConflict).
      const available = await this.availability.availableQuantity(facilityId, item.medicamentId, now, tx);
      const toReserve = Math.min(available, item.quantity);
      if (toReserve <= 0) {
        // Au moins un produit dévoilé n'est plus disponible : on annule tout (révélation non tenable).
        throw new ConflictException("Stock insuffisant à la pose de la réservation (RM-12-02)");
      }
      await tx.reservationLine.create({
        data: { reservationId: reservation.id, medicamentId: item.medicamentId, quantity: toReserve },
      });
    }
    // Un mouvement de disponibilité = stock vivant : la pharmacie reste publiable (RM-11-06).
    await this.availability.touchFreshness(tx, facilityId, now);
  }

  /** Libère la réservation ACTIVE d'un dévoilement → EXPIRED (quantités republiées, RM-12-03). */
  private async releaseReservation(tx: TxClient, disclosureId: string, now: Date): Promise<void> {
    await tx.reservation.updateMany({
      where: { disclosureId, status: ReservationStatus.ACTIVE },
      data: { status: ReservationStatus.EXPIRED, servedAt: null },
    });
  }

  /** Strike de fiabilité ACTIVE sur la pharmacie fautive (EF-12-07). */
  private async recordStrike(tx: TxClient, facilityId: string, disclosureId: string, _now: Date): Promise<void> {
    await tx.reliabilityStrike.create({
      data: {
        facilityId,
        disclosureId,
        reason: "Produit dévoilé manquant à l'arrivée du patient (EF-12-06)",
        status: StrikeStatus.ACTIVE,
      },
    });
  }

  /**
   * Si la pharmacie ATTEINT le seuil de strikes (EF-12-07), on alerte son titulaire (alerte
   * contractuelle, CU-12-04). L'EXCLUSION elle-même est gérée par M11.isPublishable (qui compte
   * les strikes) — on ne duplique pas la décision, on notifie seulement. Fenêtre 30 j cohérente
   * avec M11 (STRIKE_WINDOW_DAYS). Hors transaction du signalement (alerte best-effort).
   */
  private async maybeAlertOnStrikeThreshold(facilityId: string, now: Date): Promise<void> {
    // Fenêtre unique partagée avec M11 (source de vérité) — pas de « 30 » dupliqué (RT §3).
    const since = new Date(now.getTime() - STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const active = await this.prisma.reliabilityStrike.count({
      where: { facilityId, status: StrikeStatus.ACTIVE, createdAt: { gte: since } },
    });
    if (!reachesStrikeThreshold(active)) return;
    const owner = await this.prisma.facilityMember.findFirst({
      where: { facilityId, role: "OWNER", active: true },
    });
    if (!owner) return;
    await this.prisma.$transaction(async (tx) => {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: {
          accountId: owner.accountId,
          template: "m12.facility.excluded",
          priority: "critical",
          facilityId,
          strikeCount: active,
          threshold: STRIKE_EXCLUSION_THRESHOLD,
        },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m12.facility.strike_threshold_reached",
        resource: `facility:${facilityId}`,
        context: { strikeCount: active, threshold: STRIKE_EXCLUSION_THRESHOLD },
      });
    });
  }

  /**
   * Voie « aucune alternative » du signalement (RM-12-06) : strike + libération + ACTIVE→REFUNDED
   * + remboursement intégral des 500 XAF + excuse + cloche, dans UNE transaction (puis le refund
   * réseau M13 hors transaction, idempotent Q-004).
   */
  private async reportWithRefund(
    actor: AuthenticatedActor,
    disclosure: Disclosure,
    faultyFacilityId: string,
    now: Date,
  ): Promise<void> {
    let toRefund = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.disclosure.updateMany({
        where: { id: disclosure.id, status: DisclosureStatus.ACTIVE },
        data: { status: DisclosureStatus.REFUNDED },
      });
      if (count === 0) return;
      toRefund = true;
      await this.releaseReservation(tx, disclosure.id, now);
      await this.recordStrike(tx, faultyFacilityId, disclosure.id, now);
      // Excuse + cloche « me prévenir si disponible » (CU-12-04).
      await tx.productAvailabilityAlert.create({
        data: {
          patientAccountId: disclosure.patientAccountId,
          district: disclosure.district,
          medicamentIds: this.itemsOf(disclosure).map((i) => i.medicamentId),
        },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: disclosure.patientAccountId, template: "m12.disclosure.refunded", disclosureId: disclosure.id },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m12.disclosure.reported_unavailable",
        resource: `disclosure:${disclosure.id}`,
        context: { faultyFacilityId, outcome: "refunded" },
      });
    });
    if (toRefund) {
      // BLOCKER corrigé : on rembourse l'orderRef RACINE (celui qui porte le vrai Payment C1).
      // Un re-dévoilement a un orderRef SUFFIXÉ sans Payment ; rembourser ce suffixe serait perdu.
      await this.safeRefund(
        await this.rootOrderRef(disclosure),
        "Garantie de réservation : produit manquant, aucune alternative (EF-12-06)",
      );
    }
  }

  /**
   * Remonte la chaîne `supersedes` jusqu'au dévoilement RACINE — le seul qui porte un vrai Payment
   * C1 (orderRef "disclosure:<idRacine>"). Les re-dévoilements gratuits ont un orderRef suffixé
   * (":redisclose:<ts>") sans paiement : il ne faut JAMAIS les passer à refund() (RM-12-06).
   */
  private async rootOrderRef(disclosure: Disclosure): Promise<string> {
    let current = disclosure;
    let guard = 0;
    while (current.supersedesId && guard < 20) {
      const prev = await this.prisma.disclosure.findUnique({ where: { id: current.supersedesId } });
      if (!prev) break;
      current = prev;
      guard += 1;
    }
    return current.orderRef;
  }

  /**
   * « Aucune pharmacie à la confirmation » (RM-12-06) : PENDING_PAYMENT → REFUNDED + remboursement
   * + excuse + cloche. Distinct de reportWithRefund (pas de strike : aucune pharmacie n'a failli).
   */
  private async refundForNoAlternative(disclosure: Disclosure, reason: string): Promise<void> {
    let toRefund = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.disclosure.updateMany({
        where: { id: disclosure.id, status: DisclosureStatus.PENDING_PAYMENT },
        data: { status: DisclosureStatus.REFUNDED },
      });
      if (count === 0) return;
      toRefund = true;
      await tx.productAvailabilityAlert.create({
        data: {
          patientAccountId: disclosure.patientAccountId,
          district: disclosure.district,
          medicamentIds: this.itemsOf(disclosure).map((i) => i.medicamentId),
        },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: disclosure.patientAccountId, template: "m12.disclosure.refunded", disclosureId: disclosure.id },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m12.disclosure.refunded_no_facility",
        resource: `disclosure:${disclosure.id}`,
        context: { reason },
      });
    });
    if (toRefund) await this.safeRefund(disclosure.orderRef, reason);
  }

  /**
   * Remboursement M13 (Q-004). Idempotence : un ConflictException de refund() (paiement déjà
   * REFUNDED ou non remboursable) est un rejeu légitime → no-op. Mais un NotFoundException
   * (« aucun Payment pour cet orderRef ») n'est PAS inoffensif : pour un dévoilement payé, un
   * paiement DOIT exister. On ne l'avale donc jamais en silence (ce serait masquer une perte
   * d'argent) — on AUDITE + ALERTE les admins finance pour réconciliation (M13).
   */
  private async safeRefund(orderRef: string, reason: string): Promise<void> {
    try {
      await this.payments.refund(orderRef, reason);
    } catch (err) {
      if (err instanceof ConflictException) {
        this.logger.warn(`Remboursement déjà appliqué pour ${orderRef}: ${(err as Error).message}`);
        return;
      }
      if (err instanceof NotFoundException) {
        // Anomalie : on ne masque jamais un remboursement dû — trace + alerte finance (réconciliation).
        this.logger.error(`Remboursement IMPOSSIBLE — aucun paiement pour ${orderRef} (anomalie RM-12-06)`);
        await this.prisma.$transaction(async (tx) => {
          await this.audit.emit(tx, {
            actorType: "system",
            action: "m12.refund.payment_missing",
            resource: `order:${orderRef}`,
            context: { orderRef, reason },
          });
          await this.payments.notifyFinanceAdmins(tx, "m12.refund.payment_missing", { orderRef });
        });
        return;
      }
      throw err; // erreur technique → propagée (rejeu outbox éventuel)
    }
  }

  /**
   * Expire (EXPIRED) les dévoilements ACTIVE échus du périmètre : libération de la réservation
   * (stock republié, RM-12-03) + notification patient + audit, conditionnels ligne à ligne (D-046).
   */
  private async expireStaleIn(tx: TxClient, scope: Prisma.DisclosureWhereInput, now: Date): Promise<number> {
    const stale = await tx.disclosure.findMany({
      where: {
        AND: [scope, { status: DisclosureStatus.ACTIVE, OR: [{ expiresAt: { lte: now } }, { expiresAt: null }] }],
      },
      take: 200,
    });
    let expired = 0;
    for (const d of stale) {
      const { count } = await tx.disclosure.updateMany({
        where: { id: d.id, status: DisclosureStatus.ACTIVE, OR: [{ expiresAt: { lte: now } }, { expiresAt: null }] },
        data: { status: DisclosureStatus.EXPIRED },
      });
      if (count === 1) {
        expired += 1;
        await this.releaseReservation(tx, d.id, now);
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: d.patientAccountId, template: "m12.disclosure.expired", disclosureId: d.id },
        });
        await this.audit.emit(tx, {
          actorType: "system",
          action: "m12.disclosure.expired",
          resource: `disclosure:${d.id}`,
          context: {},
        });
      }
    }
    return expired;
  }

  /** Expiration paresseuse d'UN dévoilement (lecture / signalement) — committée à part. */
  private async expireIfStale(disclosure: Disclosure, now: Date): Promise<void> {
    if (!disclosureExpired(disclosure.status as DisclosureStatusCode, disclosure.expiresAt, now.getTime())) return;
    await this.prisma.$transaction(async (tx) => this.expireStaleIn(tx, { id: disclosure.id }, now));
  }

  /** Charge le dévoilement depuis l'orderRef d'un événement M13 — null si pas un ordre M12. */
  private async loadFromOrderRef(payload: Record<string, unknown>): Promise<Disclosure | null> {
    const orderRef = typeof payload.orderRef === "string" ? payload.orderRef : null;
    if (!orderRef) return null;
    const disclosureId = disclosureIdFromOrderRef(orderRef);
    if (!disclosureId) return null; // ordre d'un autre module (C1 partagé — M06 « handshake: »)
    const disclosure = await this.prisma.disclosure.findUnique({ where: { id: disclosureId } });
    if (!disclosure) {
      this.logger.error(`Événement M13 pour un dévoilement inconnu (${orderRef}) — ignoré, réconciliation M13 en garde-fou`);
      return null;
    }
    // Sécurité : l'orderRef stocké doit correspondre (un re-dévoilement a un orderRef suffixé).
    if (disclosure.orderRef !== orderRef) {
      this.logger.warn(`orderRef ${orderRef} ne correspond pas au dévoilement ${disclosureId} — ignoré`);
      return null;
    }
    return disclosure;
  }

  /** Identifiants de pharmacies déjà essayées le long de la chaîne supersedes + la fautive courante. */
  private async chainFacilityIds(disclosure: Disclosure): Promise<string[]> {
    const ids: Array<string | null> = [disclosure.facilityId];
    let supersedesId = disclosure.supersedesId;
    let guard = 0;
    while (supersedesId && guard < 20) {
      const prev = await this.prisma.disclosure.findUnique({ where: { id: supersedesId } });
      if (!prev) break;
      ids.push(prev.facilityId);
      supersedesId = prev.supersedesId;
      guard += 1;
    }
    return excludedFacilityIds(ids);
  }

  /** Charge l'identité de la pharmacie SI le dévoilement est ACTIVE (RM-12-01) ; null sinon. */
  private async loadRevealedFacility(disclosure: Disclosure): Promise<RevealedFacility | null> {
    if (disclosure.status !== DisclosureStatus.ACTIVE || !disclosure.facilityId) return null;
    const facility = await this.prisma.facility.findUnique({ where: { id: disclosure.facilityId } });
    if (!facility) return null;
    const revealed: RevealedFacility = {
      facilityId: facility.id,
      name: facility.name,
      phone: facility.phone,
      quarter: facility.quarter,
      latitude: facility.latitude,
      longitude: facility.longitude,
    };
    // Point UNIQUE de masquage (RM-12-01) — défense en profondeur même si l'appelant se trompe.
    return revealIfActive(disclosure.status as DisclosureStatusCode, revealed);
  }

  private async viewOf(disclosureId: string): Promise<DisclosureView> {
    const fresh = await this.prisma.disclosure.findUniqueOrThrow({ where: { id: disclosureId } });
    const facility = await this.loadRevealedFacility(fresh);
    return await this.toView(fresh, facility, Date.now());
  }

  /** Items recherchés du dévoilement (JSON typé). */
  private itemsOf(disclosure: Disclosure): SearchItem[] {
    const raw = disclosure.requestedItems as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((i): i is { medicamentId: string; quantity: number } => {
        return (
          typeof i === "object" &&
          i !== null &&
          typeof (i as { medicamentId?: unknown }).medicamentId === "string" &&
          typeof (i as { quantity?: unknown }).quantity === "number"
        );
      })
      .map((i) => ({ medicamentId: i.medicamentId, quantity: i.quantity }));
  }

  private async notifyRevealed(tx: TxClient, accountId: string, disclosureId: string): Promise<void> {
    // CU-12-02 : la session s'ouvre — payload MINIMAL (jamais d'identité de pharmacie ici, RM-14-03).
    await this.outbox.emit(tx, {
      type: "notify.request",
      payload: { accountId, template: "m12.disclosure.revealed", priority: "critical", disclosureId },
    });
  }

  private async assertActiveFacilityMember(actor: AuthenticatedActor, facilityId: string): Promise<void> {
    // Lecture directe (frontière : M12 n'importe pas M02) — membre ACTIF de la pharmacie révélée.
    const membership = await this.prisma.facilityMember.findUnique({
      where: { facilityId_accountId: { facilityId, accountId: actor.accountId } },
    });
    if (!membership || !membership.active) {
      throw new ForbiddenException("Action réservée à un membre actif de la pharmacie concernée");
    }
  }

  private assertPatient(actor: AuthenticatedActor): void {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Action réservée aux patients (D-009)");
    }
  }

  private isSerializationConflict(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
  }

  private async toView(disclosure: Disclosure, facility: RevealedFacility | null, nowMs: number): Promise<DisclosureView> {
    const status = disclosure.status as DisclosureStatusCode;
    const amountXaf = await this.params.getInt("PM-03"); // prix du dévoilement — jamais en dur (cf. requestDisclosure)
    return {
      id: disclosure.id,
      status: disclosure.status,
      district: disclosure.district,
      requestedItems: this.itemsOf(disclosure),
      createdAt: disclosure.createdAt.toISOString(),
      paidAt: disclosure.paidAt ? disclosure.paidAt.toISOString() : null,
      expiresAt: disclosure.expiresAt ? disclosure.expiresAt.toISOString() : null,
      servedAt: disclosure.servedAt ? disclosure.servedAt.toISOString() : null,
      // RM-12-01 : compte à rebours visible UNIQUEMENT pendant un dévoilement ACTIVE.
      remainingSeconds: status === "ACTIVE" ? remainingSeconds(disclosure.expiresAt, nowMs) : 0,
      orderRef: disclosure.orderRef,
      amountXaf,
      facility: revealIfActive(status, facility),
    };
  }
}

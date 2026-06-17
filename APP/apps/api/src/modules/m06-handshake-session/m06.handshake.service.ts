/**
 * M06 — HandshakeService : la poignée de main (D-007), porte d'entrée de l'acte médical.
 * Spec : docs/cahier_des_charges/02_modules/M06_poignee_session.md
 *
 * Invariants :
 * - RM-06-01 (INVARIANT N°1) : JAMAIS de paiement sans confirmation valide — pay() exige
 *   CONFIRMED **et** confirmExpiresAt > now ; et c'est le webhook M13 (et lui seul) qui
 *   prononce CONFIRMED → PAID, par transition conditionnelle (D-046) ;
 * - chaque étape a sa fenêtre PM-07 ; l'expiration est appliquée PARESSEUSEMENT à la
 *   lecture / au paiement (updateMany conditionnels) + sweepExpired() pour M16/cron ;
 * - EF-06-01 : la notification d'initiation ne porte que prénom + âge (fiche anonymisée),
 *   en priorité critique (ENF-09 : < 5 s — tenu par le drain outbox M04 + push M14) ;
 * - EF-06-14 : un patient n'a qu'UNE poignée en cours par professionnel ; un professionnel
 *   mène au plus PM-27 sessions PREPARING/ACTIVE — comptes vérifiés DANS une transaction
 *   Serializable (anti-TOCTOU, D-046).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CareSessionStatus, Handshake, HandshakeStatus, Prisma, SubProfileStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService, TxClient } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { VerificationStatusService } from "../m03-verification-contracts/m03.status.service";
import { OffersService } from "../m05-directory/m05.offers.service";
import { PresenceService } from "../m05-directory/m05.presence.service";
import { PaymentsService, PaymentState } from "../m13-payments/m13.payments.service";
import {
  ageInYears,
  handshakeExpired,
  handshakeIdFromOrderRef,
  HandshakeStatusCode,
  orderRefForHandshake,
  retryOrderRefForHandshake,
} from "./m06.policies";
import { InitiateHandshakeDto, PayHandshakeDto, RefuseHandshakeDto } from "./m06.dto";
import { SessionService } from "./m06.session.service";

export interface HandshakeView {
  id: string;
  status: HandshakeStatus;
  patientAccountId: string;
  professionalId: string;
  offerId: string;
  subProfileId: string | null;
  initiatedAt: string;
  confirmedAt: string | null;
  confirmExpiresAt: string | null;
  refusalReason: string | null;
  /** Fin de la fenêtre PM-07 courante (initiation OU confirmation) — compte à rebours CU-06-01. */
  windowExpiresAt: string | null;
  /** Calculé par le SERVEUR (RM-06-02) — les horloges clientes sont indicatives. */
  windowRemainingSeconds: number;
  /** Posé quand la poignée est PAID — porte d'entrée de la session (CU-06-02). */
  sessionId: string | null;
}

type HandshakeWithSession = Handshake & { session: { id: string } | null };

@Injectable()
export class HandshakeService {
  private readonly logger = new Logger(HandshakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly offers: OffersService,
    private readonly presence: PresenceService,
    private readonly verification: VerificationStatusService,
    private readonly payments: PaymentsService,
    private readonly sessions: SessionService,
  ) {}

  // ── EF-06-01 / CU-06-01 : initiation depuis une offre (M05) ──────────────────

  async initiate(actor: AuthenticatedActor, dto: InitiateHandshakeDto): Promise<HandshakeView> {
    this.assertPatient(actor);

    // L'offre doit être ACTIVE (contrat M05 : null si inactive/inexistante).
    const offer = await this.offers.getActiveOffer(dto.offerId);
    if (!offer) throw new NotFoundException("Offre introuvable ou désactivée — repassez par l'annuaire");

    // D-029 / C6 : le professionnel doit pouvoir exercer (Badge Vérifié + contrat signé).
    const status = await this.verification.getForProfessional(offer.professionalId);
    if (!status.canPractice) {
      throw new ConflictException("Ce professionnel ne peut pas exercer actuellement (vérification ou contrat en défaut, D-029)");
    }

    // EF-05-06 / RM-05-04 : « on ne paie jamais un absent » — disponible = ONLINE + battement frais.
    if (!(await this.presence.isAvailableForInitiation(offer.professionalId))) {
      throw new ConflictException(
        "Ce professionnel n'est pas disponible pour l'instant (EF-05-06) — posez une cloche pour être averti de son retour",
      );
    }

    // Carnet familial (D-033) : la consultation « pour » une personne à charge exige d'en être le TUTEUR.
    let subProfile: { firstName: string; birthDate: Date } | null = null;
    if (dto.subProfileId) {
      const sp = await this.prisma.subProfile.findUnique({ where: { id: dto.subProfileId } });
      if (!sp || sp.guardianAccountId !== actor.accountId) {
        throw new ForbiddenException("Sous-profil introuvable ou vous n'en êtes pas le tuteur (D-033)");
      }
      if (sp.status !== SubProfileStatus.DEPENDENT) {
        throw new ConflictException("Ce profil a été transféré à son titulaire — il consulte désormais avec son propre compte (RM-07-06)");
      }
      subProfile = { firstName: sp.firstName, birthDate: sp.birthDate };
    }

    // EF-06-01 : fiche ANONYMISÉE — prénom + âge, rien de plus avant paiement.
    const profile = await this.prisma.patientProfile.findUnique({ where: { accountId: actor.accountId } });
    if (!profile) throw new ConflictException("Profil patient incomplet — complétez votre profil avant d'initier une consultation");
    const now = new Date();
    const card = subProfile
      ? { firstName: subProfile.firstName, age: ageInYears(subProfile.birthDate, now) }
      : { firstName: profile.firstName, age: ageInYears(profile.birthDate, now) };

    const [pm07S, pm27] = await Promise.all([this.params.getInt("PM-07"), this.params.getInt("PM-27")]);

    // Lecture honnête avant les comptes : on règle les sessions rassises du professionnel
    // (PM-27 se mesure sur des statuts à jour) — transitions paresseuses, aucun poller.
    await this.sessions.settleStaleForProfessional(offer.professionalId);

    try {
      const view = await this.prisma.$transaction(
        async (tx) => {
          // Expiration paresseuse des poignées rassises de CE couple patient↔professionnel.
          await this.expireStaleIn(tx, { patientAccountId: actor.accountId, professionalId: offer.professionalId }, pm07S, now);

          // EF-06-14 : une seule poignée en cours par professionnel et par patient.
          const open = await tx.handshake.count({
            where: {
              patientAccountId: actor.accountId,
              professionalId: offer.professionalId,
              status: { in: [HandshakeStatus.INITIATED, HandshakeStatus.CONFIRMED] },
            },
          });
          if (open > 0) {
            throw new ConflictException("Vous avez déjà une poignée de main en cours avec ce professionnel (EF-06-14)");
          }

          // EF-06-14 / PM-27 : plafond de sessions simultanées du professionnel — compte
          // CONDITIONNEL dans la transaction Serializable (deux initiations simultanées ne
          // passent pas ensemble sous le plafond, D-046).
          const busy = await tx.careSession.count({
            where: { professionalId: offer.professionalId, status: { in: [CareSessionStatus.PREPARING, CareSessionStatus.ACTIVE] } },
          });
          if (busy >= pm27) {
            throw new ConflictException(
              `Ce professionnel est occupé : il mène déjà ${pm27} sessions simultanées (PM-27) — réessayez un peu plus tard`,
            );
          }

          const handshake = await tx.handshake.create({
            data: {
              patientAccountId: actor.accountId,
              professionalId: offer.professionalId,
              offerId: offer.id,
              subProfileId: dto.subProfileId ?? null,
              initiatedAt: now,
            },
          });
          // → indicateurs M05 (dénominateur du taux de confirmation, EF-05-01).
          await this.outbox.emit(tx, { type: "m06.handshake.initiated", payload: { professionalId: offer.professionalId } });
          // ENF-09 (< 5 s) : priorité CRITIQUE — fiche anonymisée prénom + âge, payload minimal.
          await this.outbox.emit(tx, {
            type: "notify.request",
            payload: {
              accountId: offer.professionalId,
              template: "m06.handshake.initiated",
              priority: "critical",
              handshakeId: handshake.id,
              offerId: offer.id,
              patientFirstName: card.firstName,
              patientAge: card.age,
            },
          });
          await this.audit.emit(tx, {
            actorId: actor.accountId,
            actorType: "patient",
            action: "m06.handshake.initiated",
            resource: `handshake:${handshake.id}`,
            context: { offerId: offer.id, professionalId: offer.professionalId, forSubProfile: Boolean(dto.subProfileId) },
          });
          return this.toView({ ...handshake, session: null }, pm07S, now.getTime());
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      // DEV/DÉMO uniquement : simule le « Je suis prêt » du professionnel après un court délai,
      // pour qu'un patient seul (sans app pro) puisse dérouler tout le parcours sur son téléphone.
      this.scheduleDevAutoConfirm(view.id, offer.professionalId);
      return view;
    } catch (err) {
      throw this.translateSerializationConflict(err);
    }
  }

  /**
   * Simulation DEV (env `HANDSHAKE_AUTOCONFIRM_MS`, jamais en test) : un professionnel virtuel
   * confirme la poignée après le délai donné. Strictement hors-production — en PROD c'est le vrai
   * professionnel qui confirme depuis son app (EF-06-02). Le faux acteur ne sert qu'à appeler confirm().
   */
  private scheduleDevAutoConfirm(handshakeId: string, professionalId: string): void {
    if (process.env.NODE_ENV === "test") return;
    const ms = Number(process.env.HANDSHAKE_AUTOCONFIRM_MS);
    if (!Number.isFinite(ms) || ms <= 0) return;
    const actor: AuthenticatedActor = {
      accountId: professionalId,
      accountType: "PROFESSIONAL",
      sessionId: "dev-autoconfirm",
      client: "system",
    };
    setTimeout(() => {
      this.confirm(actor, handshakeId).catch((err) =>
        this.logger.warn(`[DEV] auto-confirmation de la poignée ${handshakeId} échouée : ${(err as Error).message}`),
      );
    }, ms);
  }

  // ── EF-06-02 : « Je suis prêt à recevoir » / refus motivé ────────────────────

  async confirm(actor: AuthenticatedActor, handshakeId: string): Promise<HandshakeView> {
    const handshake = await this.loadForProfessional(actor, handshakeId);
    const pm07S = await this.params.getInt("PM-07");
    const now = new Date();
    await this.expireIfStale(handshake, pm07S, now); // paresseux, committé AVANT la transition

    const confirmExpiresAt = new Date(now.getTime() + pm07S * 1000);
    let confirmed = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.handshake.updateMany({
        where: { id: handshakeId, status: HandshakeStatus.INITIATED },
        data: { status: HandshakeStatus.CONFIRMED, confirmedAt: now, confirmExpiresAt },
      });
      if (count === 0) return; // tranché après relecture, hors transaction
      confirmed = true;
      // → indicateurs M05 : délai de confirmation en secondes ENTIÈRES (EF-05-01).
      const delayS = Math.max(0, Math.round((now.getTime() - handshake.initiatedAt.getTime()) / 1000));
      await this.outbox.emit(tx, {
        type: "m06.handshake.confirmed",
        payload: { professionalId: handshake.professionalId, delayS },
      });
      // CU-06-01 : le patient est notifié, le bouton payer s'active avec compte à rebours PM-07.
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: handshake.patientAccountId, template: "m06.handshake.confirmed", priority: "critical", handshakeId },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m06.handshake.confirmed",
        resource: `handshake:${handshakeId}`,
        context: { delayS },
      });
    });

    const fresh = await this.findWithSession(handshakeId);
    if (!confirmed) {
      // Rejeu réseau d'une confirmation déjà passée : on renvoie l'état, sans effet (ADR-12).
      if (fresh.status !== HandshakeStatus.CONFIRMED) this.throwNotConfirmable(fresh.status);
    }
    return this.toView(fresh, pm07S, Date.now());
  }

  async refuse(actor: AuthenticatedActor, handshakeId: string, dto: RefuseHandshakeDto): Promise<HandshakeView> {
    const handshake = await this.loadForProfessional(actor, handshakeId);
    const pm07S = await this.params.getInt("PM-07");
    const now = new Date();
    await this.expireIfStale(handshake, pm07S, now);

    let refused = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.handshake.updateMany({
        where: { id: handshakeId, status: HandshakeStatus.INITIATED },
        data: { status: HandshakeStatus.REFUSED, refusalReason: dto.reason.trim(), decidedAt: now },
      });
      if (count === 0) return;
      refused = true;
      // CU-06-01 : motif court affiché au patient (les suggestions équivalentes relèvent de M05).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: handshake.patientAccountId, template: "m06.handshake.refused", handshakeId, reason: dto.reason.trim() },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "professional",
        action: "m06.handshake.refused",
        resource: `handshake:${handshakeId}`,
        context: { reason: dto.reason.trim() }, // motif court, jamais de contenu médical
      });
    });

    const fresh = await this.findWithSession(handshakeId);
    if (!refused && fresh.status !== HandshakeStatus.REFUSED) {
      throw new ConflictException(`Refus impossible : la poignée de main n'est plus en attente (statut ${fresh.status})`);
    }
    return this.toView(fresh, pm07S, Date.now());
  }

  /** Annulation de la demande par le PATIENT, tant que le soignant n'a pas confirmé (INITIATED → ABANDONED). */
  async abandon(actor: AuthenticatedActor, handshakeId: string): Promise<HandshakeView> {
    this.assertPatient(actor);
    const handshake = await this.prisma.handshake.findUnique({ where: { id: handshakeId } });
    if (!handshake || handshake.patientAccountId !== actor.accountId) {
      throw new NotFoundException("Poignée de main introuvable");
    }
    const pm07S = await this.params.getInt("PM-07");
    const now = new Date();
    await this.expireIfStale(handshake, pm07S, now);

    let abandoned = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.handshake.updateMany({
        where: { id: handshakeId, status: HandshakeStatus.INITIATED },
        data: { status: HandshakeStatus.ABANDONED, decidedAt: now },
      });
      if (count === 0) return;
      abandoned = true;
      // Audit seulement : pas de notification (le soignant n'avait pas encore confirmé ; évite un template M14 absent).
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m06.handshake.abandoned",
        resource: `handshake:${handshakeId}`,
        context: { from: handshake.status },
      });
    });

    const fresh = await this.findWithSession(handshakeId);
    if (!abandoned && fresh.status !== HandshakeStatus.ABANDONED) {
      throw new ConflictException(`Annulation impossible : la poignée de main n'est plus en attente (statut ${fresh.status})`);
    }
    return this.toView(fresh, pm07S, Date.now());
  }

  // ── EF-06-03 / RM-06-01 (INVARIANT N°1) : paiement — ordre C1 vers M13 ───────

  async pay(actor: AuthenticatedActor, handshakeId: string, dto: PayHandshakeDto): Promise<PaymentState> {
    this.assertPatient(actor);
    const handshake = await this.prisma.handshake.findUnique({ where: { id: handshakeId } });
    if (!handshake || handshake.patientAccountId !== actor.accountId) {
      throw new NotFoundException("Poignée de main introuvable");
    }
    const pm07S = await this.params.getInt("PM-07");
    const now = new Date();
    // Expiration paresseuse AU PAIEMENT (updateMany conditionnel) — puis relecture.
    await this.expireIfStale(handshake, pm07S, now);
    const fresh = await this.prisma.handshake.findUniqueOrThrow({ where: { id: handshakeId } });

    // RM-06-01 : CONFIRMED **et** fenêtre encore ouverte, sinon 409 explicite — sans
    // confirmation valide, « le bouton payer n'existe pas » (D-007).
    if (fresh.status !== HandshakeStatus.CONFIRMED || !fresh.confirmExpiresAt || fresh.confirmExpiresAt.getTime() <= now.getTime()) {
      this.throwNotPayable(fresh.status);
    }

    // Le prix et la durée viennent de l'offre d'ORIGINE (référencée à vie, CU-05-03) —
    // une désactivation survenue depuis n'invalide pas une poignée déjà confirmée.
    const offer = await this.prisma.careOffer.findUnique({ where: { id: fresh.offerId } });
    if (!offer) throw new ConflictException("Offre d'origine introuvable — contactez le support");

    // D-029 / RM-05-05 (correctif D-048) : on RE-VÉRIFIE « peut exercer » au paiement —
    // un professionnel suspendu/révoqué ENTRE la confirmation et le paiement ne doit jamais
    // être payé (getActiveOffer/présence ne portent pas la cascade C6 ; on la vérifie ici).
    const canPractice = await this.verification.getForProfessional(fresh.professionalId);
    if (!canPractice.canPractice) {
      throw new ConflictException("Ce professionnel ne peut plus exercer — rien n'a été débité (D-029)");
    }

    // C1 : ordre référencé, capture DIFFÉRÉE (RM-06-04 : gains crédités au compte-rendu).
    const charge = (orderRef: string) =>
      this.payments.requestCharge({
        orderRef,
        payerAccountId: actor.accountId,
        amountXaf: offer.priceXaf,
        operator: dto.operator,
        beneficiary: { holderType: "PROFESSIONAL", holderId: fresh.professionalId },
        capture: "DEFERRED",
      });

    // Premier essai : référence stable (idempotente, RM-13-04). FAILED est TERMINAL côté
    // M13 — un nouvel essai dans la fenêtre (EF-06-03) passe par une référence suffixée à
    // la seconde (deux double-clics dans la même seconde = un seul nouvel ordre).
    const first = await charge(orderRefForHandshake(handshakeId));
    if (first.status !== "FAILED") return first;
    return charge(retryOrderRefForHandshake(handshakeId, now.getTime()));
  }

  // ── Webhooks M13 (C1, via l'outbox commun — abonnés par M06Module) ──────────

  /**
   * m13.payment.succeeded : LA transition CONFIRMED → PAID (conditionnelle, D-046) +
   * ouverture de la session PREPARING (CU-06-02). IDEMPOTENT : un événement rejoué
   * retombe sur « déjà traité ». Cas limites (documentés) :
   * - poignée EXPIRÉE entre-temps (l'expiration paresseuse a gagné la course) →
   *   remboursement immédiat + audit — fail-closed, rien n'est gardé sans session ;
   * - paiement EXCÉDENTAIRE (double succès sur deux ordres d'essai) → l'ordre qui n'a
   *   pas ouvert la session est remboursé.
   * Anomalies de données (poignée/offre introuvables) : journalisées puis ACCEPTÉES —
   * jamais de « pilule empoisonnée » qui bloquerait le drain commun (ADR-11) ; les
   * erreurs TECHNIQUES, elles, remontent pour rejeu.
   */
  async onPaymentSucceeded(payload: Record<string, unknown>): Promise<void> {
    const orderRef = typeof payload.orderRef === "string" ? payload.orderRef : null;
    if (!orderRef) return;
    const handshakeId = handshakeIdFromOrderRef(orderRef);
    if (!handshakeId) return; // ordre d'un autre module (C1 partagé)

    const handshake = await this.prisma.handshake.findUnique({ where: { id: handshakeId } });
    if (!handshake) {
      this.logger.error(`m13.payment.succeeded pour une poignée inconnue (${orderRef}) — ignoré, réconciliation M13 en garde-fou`);
      return;
    }
    const offer = await this.prisma.careOffer.findUnique({ where: { id: handshake.offerId } });
    if (!offer) {
      this.logger.error(`Offre ${handshake.offerId} introuvable pour ${orderRef} — ignoré (les offres ne sont jamais supprimées, CU-05-03)`);
      return;
    }

    let opened = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.handshake.updateMany({
        where: { id: handshakeId, status: HandshakeStatus.CONFIRMED },
        data: { status: HandshakeStatus.PAID },
      });
      if (count === 0) return; // tranché après relecture, hors transaction
      opened = true;
      const session = await tx.careSession.create({
        data: {
          handshakeId,
          patientAccountId: handshake.patientAccountId,
          professionalId: handshake.professionalId,
          subProfileId: handshake.subProfileId,
          durationMin: offer.durationMin, // durée de l'offre (CU-06-02)
          orderRef,
          paidAt: new Date(),
        },
      });
      // CU-06-02 : reçu émis par M13 ; ici, pré-consultation proposée au patient et
      // « en préparation » côté professionnel — payloads minimaux (RM-06-06).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: handshake.patientAccountId, template: "m06.session.preparing.patient", sessionId: session.id },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: handshake.professionalId, template: "m06.session.preparing.professional", priority: "critical", sessionId: session.id },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m06.handshake.paid",
        resource: `handshake:${handshakeId}`,
        context: { sessionId: session.id, orderRef },
      });
    });
    if (opened) return;

    const fresh = await this.prisma.handshake.findUniqueOrThrow({ where: { id: handshakeId } });
    const session = await this.prisma.careSession.findUnique({ where: { handshakeId } });
    if (fresh.status === HandshakeStatus.PAID && session && session.orderRef === orderRef) {
      return; // rejeu de l'outbox : déjà traité (ADR-11/12)
    }
    // Cas limite : succès de paiement sans session à ouvrir → remboursement immédiat.
    const reason =
      fresh.status === HandshakeStatus.PAID
        ? "Paiement excédentaire : la session était déjà ouverte par un autre ordre (M06)"
        : "Poignée de main expirée avant la confirmation du paiement — remboursement automatique (EF-06-03)";
    try {
      await this.payments.refund(orderRef, reason);
    } catch (err) {
      if (err instanceof ConflictException || err instanceof NotFoundException) {
        this.logger.error(`Remboursement du cas limite impossible pour ${orderRef}: ${(err as Error).message}`);
      } else {
        throw err; // erreur technique → l'outbox rejouera
      }
    }
    await this.audit.emit(this.prisma, {
      actorType: "system",
      action: "m06.payment.orphan_refunded",
      resource: `handshake:${handshakeId}`,
      context: { orderRef, handshakeStatus: fresh.status },
    });
  }

  /**
   * m13.payment.failed : rien ne bouge côté poignée (CONFIRMED reste payable dans sa
   * fenêtre PM-07, EF-06-03) — le patient est guidé vers un nouvel essai.
   */
  async onPaymentFailed(payload: Record<string, unknown>): Promise<void> {
    const orderRef = typeof payload.orderRef === "string" ? payload.orderRef : null;
    if (!orderRef) return;
    const handshakeId = handshakeIdFromOrderRef(orderRef);
    if (!handshakeId) return;
    const handshake = await this.prisma.handshake.findUnique({ where: { id: handshakeId } });
    if (!handshake) return;
    await this.outbox.emit(this.prisma, {
      type: "notify.request",
      payload: { accountId: handshake.patientAccountId, template: "m06.payment.failed", handshakeId },
    });
  }

  // ── Lectures (CU-06-01 : statuts et comptes à rebours visibles) ──────────────

  async getOne(actor: AuthenticatedActor, handshakeId: string): Promise<HandshakeView> {
    const handshake = await this.prisma.handshake.findUnique({ where: { id: handshakeId } });
    if (!handshake || (handshake.patientAccountId !== actor.accountId && handshake.professionalId !== actor.accountId)) {
      throw new NotFoundException("Poignée de main introuvable");
    }
    const pm07S = await this.params.getInt("PM-07");
    await this.expireIfStale(handshake, pm07S, new Date()); // la lecture applique l'expiration
    const fresh = await this.findWithSession(handshakeId);
    return this.toView(fresh, pm07S, Date.now());
  }

  async listMine(actor: AuthenticatedActor): Promise<{ items: HandshakeView[] }> {
    const pm07S = await this.params.getInt("PM-07");
    const now = new Date();
    const scope = { OR: [{ patientAccountId: actor.accountId }, { professionalId: actor.accountId }] };
    await this.prisma.$transaction(async (tx) => this.expireStaleIn(tx, scope, pm07S, now));
    const rows = await this.prisma.handshake.findMany({
      where: scope,
      orderBy: { initiatedAt: "desc" },
      take: 100,
      include: { session: { select: { id: true } } },
    });
    return { items: rows.map((h) => this.toView(h, pm07S, Date.now())) };
  }

  // ── Balayage public (cadencé par M16/cron plus tard — AUCUN poller ici) ──────

  /**
   * CU-06-01 : « expirée, professionnel libéré, patient informé — rien n'est débité ».
   * Le mode paresseux couvre toute lecture ; ce balayage garantit l'information du patient
   * même si personne ne relit la poignée. Transition + notification + audit par ligne,
   * conditionnels (un seul gagnant, D-046).
   */
  async sweepExpired(now: Date = new Date()): Promise<{ expired: number }> {
    const pm07S = await this.params.getInt("PM-07");
    let expired = 0;
    await this.prisma.$transaction(async (tx) => {
      expired = await this.expireStaleIn(tx, {}, pm07S, now);
    });
    return { expired };
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  /**
   * Expire (EXPIRED) les poignées rassises du périmètre donné : INITIATED au-delà de
   * PM-07 depuis l'initiation, CONFIRMED au-delà de confirmExpiresAt (fenêtres distinctes,
   * EF-06-02/03). Conditionnel ligne à ligne — notification patient + audit UNE fois.
   */
  private async expireStaleIn(tx: TxClient, scope: Prisma.HandshakeWhereInput, pm07S: number, now: Date): Promise<number> {
    const staleBefore = new Date(now.getTime() - pm07S * 1000);
    const stale = await tx.handshake.findMany({
      where: {
        AND: [
          scope,
          {
            OR: [
              { status: HandshakeStatus.INITIATED, initiatedAt: { lte: staleBefore } },
              // confirmExpiresAt null sur une CONFIRMED = anomalie → expirée (fail-closed, RM-06-01).
              { status: HandshakeStatus.CONFIRMED, OR: [{ confirmExpiresAt: { lte: now } }, { confirmExpiresAt: null }] },
            ],
          },
        ],
      },
      take: 200,
    });
    let expired = 0;
    for (const h of stale) {
      const where: Prisma.HandshakeWhereInput =
        h.status === HandshakeStatus.INITIATED
          ? { id: h.id, status: HandshakeStatus.INITIATED, initiatedAt: { lte: staleBefore } }
          : { id: h.id, status: HandshakeStatus.CONFIRMED, OR: [{ confirmExpiresAt: { lte: now } }, { confirmExpiresAt: null }] };
      const { count } = await tx.handshake.updateMany({ where, data: { status: HandshakeStatus.EXPIRED, decidedAt: now } });
      if (count === 1) {
        expired += 1;
        await this.outbox.emit(tx, {
          type: "notify.request",
          payload: { accountId: h.patientAccountId, template: "m06.handshake.expired", handshakeId: h.id },
        });
        await this.audit.emit(tx, {
          actorType: "system",
          action: "m06.handshake.expired",
          resource: `handshake:${h.id}`,
          context: { from: h.status },
        });
      }
    }
    return expired;
  }

  /** Expiration paresseuse d'UNE poignée (lecture / confirmation / paiement) — committée à part. */
  private async expireIfStale(handshake: Handshake, pm07S: number, now: Date): Promise<void> {
    if (!handshakeExpired(handshake.status as HandshakeStatusCode, handshake.initiatedAt, handshake.confirmExpiresAt, pm07S, now.getTime())) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await this.expireStaleIn(tx, { id: handshake.id }, pm07S, now);
    });
  }

  private async loadForProfessional(actor: AuthenticatedActor, handshakeId: string): Promise<Handshake> {
    if (actor.accountType !== "PROFESSIONAL") {
      throw new ForbiddenException("Action réservée au professionnel destinataire (EF-06-02)");
    }
    const handshake = await this.prisma.handshake.findUnique({ where: { id: handshakeId } });
    // 404 (et non 403) si la poignée appartient à un autre professionnel : pas de fuite d'existence.
    if (!handshake || handshake.professionalId !== actor.accountId) {
      throw new NotFoundException("Poignée de main introuvable");
    }
    return handshake;
  }

  private assertPatient(actor: AuthenticatedActor): void {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Action réservée aux patients (EF-06-01)");
    }
  }

  private throwNotConfirmable(status: HandshakeStatus): never {
    switch (status) {
      case HandshakeStatus.EXPIRED:
        throw new ConflictException("La demande a expiré (fenêtre PM-07) — le patient est invité à réinitier");
      case HandshakeStatus.REFUSED:
        throw new ConflictException("Cette demande a déjà été refusée");
      case HandshakeStatus.PAID:
        throw new ConflictException("Cette poignée de main est déjà payée — la session est ouverte");
      default:
        throw new ConflictException(`Confirmation impossible (statut ${status})`);
    }
  }

  private throwNotPayable(status: HandshakeStatus): never {
    switch (status) {
      case HandshakeStatus.INITIATED:
        throw new ConflictException(
          "Paiement impossible : le professionnel n'a pas encore confirmé « Je suis prêt à recevoir » — sans confirmation, le bouton payer n'existe pas (RM-06-01, D-007)",
        );
      case HandshakeStatus.CONFIRMED: // fenêtre dépassée mais expiration pas encore matérialisée
      case HandshakeStatus.EXPIRED:
        throw new ConflictException(
          "Paiement impossible : la confirmation a expiré (fenêtre PM-07) — rien n'a été débité, réinitiez une demande (RM-06-01)",
        );
      case HandshakeStatus.REFUSED:
        throw new ConflictException("Paiement impossible : le professionnel a refusé cette demande — rien n'a été débité");
      case HandshakeStatus.PAID:
        throw new ConflictException("Cette poignée de main est déjà payée — votre session est ouverte");
      default:
        throw new ConflictException(`Paiement impossible (statut ${status})`);
    }
  }

  /** P2034 = conflit de sérialisation (deux initiations simultanées) → 409 propre. */
  private translateSerializationConflict(err: unknown): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return new ConflictException("Initiation simultanée détectée — réessayez");
    }
    return err;
  }

  private async findWithSession(handshakeId: string): Promise<HandshakeWithSession> {
    return this.prisma.handshake.findUniqueOrThrow({
      where: { id: handshakeId },
      include: { session: { select: { id: true } } },
    });
  }

  private toView(h: HandshakeWithSession, pm07S: number, nowMs: number): HandshakeView {
    let windowExpiresAt: Date | null = null;
    if (h.status === HandshakeStatus.INITIATED) windowExpiresAt = new Date(h.initiatedAt.getTime() + pm07S * 1000);
    if (h.status === HandshakeStatus.CONFIRMED) windowExpiresAt = h.confirmExpiresAt;
    return {
      id: h.id,
      status: h.status,
      patientAccountId: h.patientAccountId,
      professionalId: h.professionalId,
      offerId: h.offerId,
      subProfileId: h.subProfileId,
      initiatedAt: h.initiatedAt.toISOString(),
      confirmedAt: h.confirmedAt ? h.confirmedAt.toISOString() : null,
      confirmExpiresAt: h.confirmExpiresAt ? h.confirmExpiresAt.toISOString() : null,
      refusalReason: h.refusalReason,
      windowExpiresAt: windowExpiresAt ? windowExpiresAt.toISOString() : null,
      // RM-06-02 : compte à rebours calculé SERVEUR.
      windowRemainingSeconds: windowExpiresAt ? Math.max(0, Math.ceil((windowExpiresAt.getTime() - nowMs) / 1000)) : 0,
      sessionId: h.session?.id ?? null,
    };
  }
}

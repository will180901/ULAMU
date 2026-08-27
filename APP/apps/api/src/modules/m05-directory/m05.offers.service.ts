/**
 * M05 — OffersService : gestion des offres de consultation (EF-05-02 ; CU-05-03).
 * Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * Invariants :
 * - RM-05-01 / D-029 : pas de création (ni réactivation) d'offre sans Badge Vérifié
 *   ET contrat signé — statut effectif lu via M03 (VerificationStatusService, C6) ;
 * - EF-05-02 : durée dans les bornes PM-09, prix ≥ PM-06 (commission incluse, D-010),
 *   plafond PM-25 offres ACTIVES vérifié dans une transaction SERIALIZABLE (anti-TOCTOU, D-046) ;
 * - CU-05-03 : DELETE = désactivation (active=false) — jamais de suppression physique,
 *   l'historique des sessions passées référence l'offre à vie ;
 * - audit C5 de chaque écriture, DANS la transaction.
 *
 * Expose le contrat consommé par M06 (signature EXACTE) : getActiveOffer(offerId).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CareOffer, Prisma } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { VerificationStatusService } from "../m03-verification-contracts/m03.status.service";
import { durationIsValid, priceIsValid } from "./m05.policies";
import { CreateOfferDto, UpdateOfferDto } from "./m05.dto";

// ── Contrat consommé par M06 (départ de la poignée de main, spec §7) ─────────

export interface ActiveOfferView {
  id: string;
  professionalId: string;
  label: string;
  durationMin: number;
  priceXaf: number;
  kind: "STANDARD" | "FOLLOW_UP";
}

/** Vue de gestion côté professionnel (CU-05-03). */
export interface OfferView extends ActiveOfferView {
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Les bornes qu'un professionnel doit connaître AVANT de composer une offre.
 *
 * ⚠️ **Pourquoi elles sortent d'ici.** PM-06, PM-09 et PM-25 étaient vérifiées côté service et
 * n'étaient **jamais renvoyées** : l'écran ne pouvait qu'écrire « entre 10 et 60 minutes » et
 * « au moins 500 XAF » en dur, puis mentir le jour où le super-admin les change dans E3. C'est la
 * même dette que le « 12 % » des maquettes, et que PM-27 corrigé le 27/08 côté présence.
 *
 * Le médecin les découvrait autrement par un refus APRÈS COUP — on lui faisait composer une offre,
 * puis on la rejetait. Les annoncer avant est la même règle que les frais de retrait annoncés avant
 * confirmation (EF-13-07).
 */
export interface OfferLimits {
  /** PM-09 — durée autorisée, bornes incluses (minutes). */
  durationMinMinutes: number;
  durationMaxMinutes: number;
  /** PM-06 — prix plancher en XAF, commission INCLUSE (D-010, RM-05-03 : prix final patient). */
  priceFloorXaf: number;
  /** PM-25 — offres ACTIVES maximum. */
  maxActiveOffers: number;
  /** Combien j'en ai d'actives en ce moment — pour dire « 3 sur 5 » sans second appel. */
  activeOffers: number;
}

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly audit: AuditEmitter,
    private readonly verification: VerificationStatusService,
  ) {}

  // ── Contrat M06 — signature EXACTE ──────────────────────────────────────────

  /**
   * Offre ACTIVE par identifiant — null si inactive ou inexistante (jamais d'exception) :
   * M06 s'en sert pour démarrer la poignée de main, une offre désactivée n'est plus initiable.
   */
  async getActiveOffer(offerId: string): Promise<ActiveOfferView | null> {
    const offer = await this.prisma.careOffer.findFirst({ where: { id: offerId, active: true } });
    if (!offer) return null;
    return {
      id: offer.id,
      professionalId: offer.professionalId,
      label: offer.label,
      durationMin: offer.durationMin,
      priceXaf: offer.priceXaf,
      kind: offer.kind,
    };
  }

  // ── EF-05-01 : profil public (bio/spécialité/arrondissement) ────────────────

  /** Modifie mon profil public — M01 (updateMyProfile/setAvatar) est réservé aux comptes patients. */
  async updateMyProfile(
    actor: AuthenticatedActor,
    dto: { specialty?: string; biography?: string; district?: string },
  ): Promise<{ specialty: string | null; biography: string | null; district: string | null }> {
    if (actor.accountType !== "PROFESSIONAL") {
      throw new ForbiddenException("Action réservée aux professionnels de santé (EF-05-01)");
    }
    const updated = await this.prisma.professionalProfile.update({
      where: { accountId: actor.accountId },
      data: {
        ...(dto.specialty !== undefined ? { specialty: dto.specialty } : {}),
        ...(dto.biography !== undefined ? { biography: dto.biography } : {}),
        ...(dto.district !== undefined ? { district: dto.district } : {}),
      },
    });
    await this.audit.emit(this.prisma, {
      actorId: actor.accountId,
      actorType: "professional",
      action: "m05.profile.updated",
      resource: `account:${actor.accountId}`,
    });
    return { specialty: updated.specialty, biography: updated.biography, district: updated.district };
  }

  // ── EF-05-02 : créer une offre (CU-05-03) ───────────────────────────────────

  async createOffer(actor: AuthenticatedActor, dto: CreateOfferDto): Promise<OfferView> {
    this.assertProfessional(actor);
    await this.assertCanPractice(actor.accountId); // RM-05-01 / D-029

    const [bounds, floor, maxActive] = await Promise.all([
      this.params.getIntList("PM-09"),
      this.params.getInt("PM-06"),
      this.params.getInt("PM-25"),
    ]);
    this.assertOfferFields(dto.durationMin, dto.priceXaf, bounds, floor);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Plafond PM-25 vérifié DANS la transaction SERIALIZABLE : deux créations
          // simultanées ne peuvent pas passer ensemble sous le plafond (anti-TOCTOU, D-046).
          await this.assertActiveBelowCap(tx, actor.accountId, maxActive);
          const offer = await tx.careOffer.create({
            data: {
              professionalId: actor.accountId,
              label: dto.label.trim(),
              durationMin: dto.durationMin,
              priceXaf: dto.priceXaf,
              kind: dto.kind ?? "STANDARD",
            },
          });
          // C5 — dans la transaction. Aucun contenu médical : une offre est un objet commercial public.
          await this.audit.emit(tx, {
            actorId: actor.accountId,
            actorType: "professional",
            action: "m05.offer.created",
            resource: `offer:${offer.id}`,
            context: { durationMin: offer.durationMin, priceXaf: offer.priceXaf, kind: offer.kind },
          });
          return this.toView(offer);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      throw this.translateSerializationConflict(err);
    }
  }

  // ── EF-05-02 : modifier / activer / désactiver (CU-05-03) ───────────────────

  async updateOffer(actor: AuthenticatedActor, offerId: string, dto: UpdateOfferDto): Promise<OfferView> {
    this.assertProfessional(actor);
    if (
      dto.label === undefined &&
      dto.durationMin === undefined &&
      dto.priceXaf === undefined &&
      dto.kind === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException("Aucun champ à modifier");
    }

    const existing = await this.prisma.careOffer.findFirst({
      where: { id: offerId, professionalId: actor.accountId }, // une offre ne se modifie que par SON professionnel
    });
    if (!existing) throw new NotFoundException("Offre introuvable");

    // On valide l'offre RÉSULTANTE (champs fusionnés) contre PM-09/PM-06.
    const [bounds, floor, maxActive] = await Promise.all([
      this.params.getIntList("PM-09"),
      this.params.getInt("PM-06"),
      this.params.getInt("PM-25"),
    ]);
    this.assertOfferFields(dto.durationMin ?? existing.durationMin, dto.priceXaf ?? existing.priceXaf, bounds, floor);

    // Réactiver = republier dans l'annuaire : mêmes garde-fous qu'une création (RM-05-01 / D-029).
    const reactivating = dto.active === true && !existing.active;
    if (reactivating) await this.assertCanPractice(actor.accountId);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          if (reactivating) await this.assertActiveBelowCap(tx, actor.accountId, maxActive); // PM-25, D-046
          const { count } = await tx.careOffer.updateMany({
            where: { id: offerId, professionalId: actor.accountId },
            data: {
              ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
              ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
              ...(dto.priceXaf !== undefined ? { priceXaf: dto.priceXaf } : {}),
              ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
              ...(dto.active !== undefined ? { active: dto.active } : {}),
            },
          });
          if (count === 0) throw new NotFoundException("Offre introuvable"); // disparue entre-temps
          const fresh = await tx.careOffer.findUniqueOrThrow({ where: { id: offerId } });
          await this.audit.emit(tx, {
            actorId: actor.accountId,
            actorType: "professional",
            action: "m05.offer.updated",
            resource: `offer:${offerId}`,
            context: {
              changed: Object.entries({
                label: dto.label,
                durationMin: dto.durationMin,
                priceXaf: dto.priceXaf,
                kind: dto.kind,
                active: dto.active,
              })
                .filter(([, v]) => v !== undefined)
                .map(([k]) => k),
              active: fresh.active,
            },
          });
          return this.toView(fresh);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      throw this.translateSerializationConflict(err);
    }
  }

  /**
   * DELETE = désactivation (CU-05-03) : l'offre disparaît de l'annuaire mais l'historique
   * des sessions passées la référence toujours. IDEMPOTENT : déjà inactive → succès sans effet
   * (updateMany conditionnel, D-046).
   */
  async deactivateOffer(actor: AuthenticatedActor, offerId: string): Promise<void> {
    this.assertProfessional(actor);
    const existing = await this.prisma.careOffer.findFirst({
      where: { id: offerId, professionalId: actor.accountId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Offre introuvable");

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.careOffer.updateMany({
        where: { id: offerId, professionalId: actor.accountId, active: true },
        data: { active: false },
      });
      if (count === 1) {
        await this.audit.emit(tx, {
          actorId: actor.accountId,
          actorType: "professional",
          action: "m05.offer.deactivated",
          resource: `offer:${offerId}`,
        });
      }
    });
  }

  /** Offres du professionnel connecté, actives ET inactives (gestion CU-05-03). */
  async listMine(actor: AuthenticatedActor): Promise<OfferView[]> {
    this.assertProfessional(actor);
    const offers = await this.prisma.careOffer.findMany({
      where: { professionalId: actor.accountId },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
    return offers.map((o) => this.toView(o));
  }

  /** Les bornes de composition d'une offre (PM-09/PM-06/PM-25) + mon compte d'offres actives. */
  async limitsForMine(actor: AuthenticatedActor): Promise<OfferLimits> {
    this.assertProfessional(actor);
    const [bounds, floor, maxActive, activeOffers] = await Promise.all([
      this.params.getIntList("PM-09"),
      this.params.getInt("PM-06"),
      this.params.getInt("PM-25"),
      this.prisma.careOffer.count({ where: { professionalId: actor.accountId, active: true } }),
    ]);
    return {
      durationMinMinutes: bounds[0],
      durationMaxMinutes: bounds[1],
      priceFloorXaf: floor,
      maxActiveOffers: maxActive,
      activeOffers,
    };
  }

  // ── Aides internes ───────────────────────────────────────────────────────────

  private assertProfessional(actor: AuthenticatedActor): void {
    if (actor.accountType !== "PROFESSIONAL") {
      throw new ForbiddenException("Action réservée aux professionnels de santé (EF-05-02)");
    }
  }

  /** RM-05-01 / D-029 : Badge Vérifié + contrat signé exigés pour publier une offre. */
  private async assertCanPractice(professionalId: string): Promise<void> {
    const status = await this.verification.getForProfessional(professionalId);
    if (!status.canPractice) {
      throw new ForbiddenException(
        "Publication d'offre impossible : votre profil doit être vérifié et votre contrat signé (D-029)",
      );
    }
  }

  /** Messages précis, PM injectés (jamais en dur) — EF-05-02. */
  private assertOfferFields(durationMin: number, priceXaf: number, bounds: number[], floor: number): void {
    if (!durationIsValid(durationMin, bounds)) {
      throw new BadRequestException(`Durée invalide : entre ${bounds[0]} et ${bounds[1]} minutes (PM-09)`);
    }
    if (!priceIsValid(priceXaf, floor)) {
      throw new BadRequestException(`Prix invalide : minimum ${floor} XAF, commission incluse (PM-06, D-010)`);
    }
  }

  /** Plafond d'offres ACTIVES (PM-25) — à appeler DANS la transaction Serializable. */
  private async assertActiveBelowCap(tx: Prisma.TransactionClient, professionalId: string, maxActive: number): Promise<void> {
    const activeCount = await tx.careOffer.count({ where: { professionalId, active: true } });
    if (activeCount >= maxActive) {
      throw new ConflictException(
        `Nombre maximum d'offres actives atteint (${maxActive}, PM-25) — désactivez une offre avant d'en publier une autre`,
      );
    }
  }

  /** P2034 = conflit de sérialisation (deux écritures simultanées) → 409 propre, le client réessaie. */
  private translateSerializationConflict(err: unknown): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return new ConflictException("Modification simultanée de vos offres — réessayez");
    }
    return err;
  }

  private toView(offer: CareOffer): OfferView {
    return {
      id: offer.id,
      professionalId: offer.professionalId,
      label: offer.label,
      durationMin: offer.durationMin,
      priceXaf: offer.priceXaf,
      kind: offer.kind,
      active: offer.active,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
    };
  }
}

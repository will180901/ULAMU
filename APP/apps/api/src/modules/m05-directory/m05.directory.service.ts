/**
 * M05 — DirectoryService : la vitrine publique de l'offre de soin (EF-05-01/03/04/07/08 ;
 * CU-05-01/02/05). Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * Invariants :
 * - RM-05-01 / D-029 : seuls les professionnels VÉRIFIÉS et SOUS CONTRAT SIGNÉ apparaissent —
 *   jointure Prisma directe sur VerificationCase (status VERIFIED) + AgreementVersion signée
 *   (lecture seule, pas d'import de module pour ça — frontière C6 respectée en écriture) ;
 * - RM-05-05 : un compte suspendu (M01/M03/M16) disparaît à la lecture (account.status ACTIVE) ;
 * - RM-05-02 : tri « pertinence » = relevanceScore documenté (m05.policies) — JAMAIS vendu ;
 *   le score est même EXPOSÉ dans la réponse (transparence du classement) ;
 * - RM-05-03 / D-010 : les prix renvoyés sont FINAUX pour le patient ;
 * - présence calculée À LA LECTURE (PM-26) — jamais de « en ligne » périmé (spec §8) ;
 * - AUCUNE donnée de santé ici : profils publics, offres, notations — rien du Carnet (D4).
 *
 * Échelle MVP : le filtrage fin et le tri se font en mémoire après une requête bornée aux
 * professionnels vérifiés (population faible au lancement) ; le cache vitrine ENF-03
 * viendra avec l'infrastructure (spec §8).
 */
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import {
  ALERT_VALIDITY_DAYS,
  avgConfirmDelayS,
  clampPageSize,
  confirmRatePct,
  DirectorySortCode,
  effectivePresenceState,
  hasRecentActivity,
  PresenceStateCode,
  ratingAvg,
  ReactivityStats,
  relevanceScore,
} from "./m05.policies";
import { PresenceService } from "./m05.presence.service";
import { DirectoryQueryDto } from "./m05.dto";

// ── Vues publiques (EF-05-01) ────────────────────────────────────────────────

export interface DirectoryOfferView {
  id: string;
  label: string;
  durationMin: number;
  priceXaf: number; // prix FINAL patient (RM-05-03, D-010)
  kind: "STANDARD" | "FOLLOW_UP";
}

export interface DirectoryItemView {
  professionalId: string;
  displayName: string;
  category: string;
  specialty: string | null;
  district: string | null;
  badgeVerified: true; // par construction : seuls les vérifiés sortent d'ici (RM-05-01)
  rating: { avg: number | null; count: number };
  reactivity: { confirmRatePct: number; avgConfirmDelayS: number | null }; // EF-05-01
  presence: PresenceStateCode; // état effectif (ONLINE rassis → OFFLINE)
  availableNow: boolean; // pilote le bouton « initier » (EF-05-06)
  /**
   * Depuis combien de secondes ce professionnel n'a plus donné signe de vie. `null` quand il est
   * joignable — il est là, il n'y a rien à dater.
   *
   * ⚠️ **Deux bornes délibérées, posées ICI et pas à l'affichage.** EF-05-01 énumère ce qui est
   * public — nom, spécialité, badge, biographie, arrondissement, note, réactivité, « statut de
   * présence » — et n'y range PAS la dernière connexion. Le porteur a choisi de l'ajouter le
   * 28/08/2026, mais encadrée :
   *
   *  1. **Rien quand il est en ligne.** Publier l'horodatage exact d'un battement de cœur ne
   *     renseigne personne et expose une activité à la seconde près.
   *  2. **Plafonné à une semaine.** Au-delà, la valeur est écrêtée : le client ne peut dire que
   *     « plus d'une semaine », jamais « trois mois ». Un médecin qui s'éloigne quelque temps ne
   *     porte pas son absence en écriteau devant tous les patients — et il n'a aucun réglage pour
   *     le masquer, contrairement aux messageries grand public.
   *
   * Plafonner à l'affichage aurait laissé la donnée complète dans la réponse HTTP : n'importe qui
   * lisant l'API aurait pu recalculer les trois mois. La borne n'a de sens qu'à la source.
   */
  lastSeenSeconds: number | null;
  cheapestOffer: DirectoryOfferView | null; // CU-05-01
  relevanceScore: number; // transparence du classement (RM-05-02)
}

export interface DirectoryProfileView extends DirectoryItemView {
  biography: string | null;
  offers: DirectoryOfferView[]; // offres ACTIVES uniquement (CU-05-02)
  ratingDistribution: Record<string, number>; // EF-05-07 : répartition par note
  latestComments: Array<{ score: number; comment: string; createdAt: string }>; // anonymes
}

/** Ligne interne enrichie avant filtrage/tri en mémoire. */
interface EnrichedRow {
  profile: {
    accountId: string;
    firstName: string;
    lastName: string;
    category: string;
    specialty: string | null;
    district: string | null;
    biography: string | null;
  };
  stats: ReactivityStats | null;
  presence: PresenceStateCode;
  availableNow: boolean;
  lastSeenSeconds: number | null;
  cheapestOffer: DirectoryOfferView | null;
  score: number;
  ratingAvg: number | null;
  ratingCount: number;
  confirmRatePctValue: number;
  avgDelayS: number | null;
}

/** Une semaine. Au-delà, « dernière vue » est écrêtée — voir `lastSeenSeconds`. */
const PLAFOND_DERNIERE_VUE_S = 7 * 24 * 3600;

@Injectable()
export class DirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly presence: PresenceService,
  ) {}

  // ── EF-05-03/04 : recherche publique avec filtres (CU-05-01) ────────────────

  async search(query: DirectoryQueryDto): Promise<{
    items: DirectoryItemView[];
    page: number;
    pageSize: number;
    total: number;
    suggestion: string | null;
  }> {
    const [pm26S, ratingScale] = await Promise.all([this.params.getInt("PM-26"), this.params.getIntList("PM-13")]);

    // RM-05-01 (vérifié + contrat signé) et RM-05-05 (compte actif) — filtres en base.
    const where: Prisma.ProfessionalProfileWhereInput = {
      account: { status: "ACTIVE" },
      verificationCase: {
        status: "VERIFIED",
        agreement: { versions: { some: { signedAt: { not: null } }, none: { signedAt: null } } },
      },
      ...(query.category ? { category: query.category } : {}),
      ...(query.district ? { district: { equals: query.district, mode: "insensitive" } } : {}),
      ...(query.specialty ? { specialty: { contains: query.specialty, mode: "insensitive" } } : {}),
    };

    const profiles = await this.prisma.professionalProfile.findMany({
      where,
      select: {
        accountId: true,
        firstName: true,
        lastName: true,
        category: true,
        specialty: true,
        district: true,
        biography: true,
      },
    });

    let rows = await this.enrich(profiles, pm26S, ratingScale);

    // Filtres calculés (présence, prix, note) — appliqués à la lecture, jamais figés.
    if (query.maxPrice !== undefined) {
      rows = rows.filter((r) => r.cheapestOffer !== null && r.cheapestOffer.priceXaf <= query.maxPrice!);
    }
    if (query.minRating !== undefined) {
      // Affichage honnête (EF-05-07) : sans avis, on ne prétend pas atteindre la note demandée.
      rows = rows.filter((r) => r.ratingAvg !== null && r.ratingAvg >= query.minRating!);
    }
    if (query.availableNow === true) {
      rows = rows.filter((r) => r.availableNow); // EF-05-06 : présence fraîche uniquement
    }

    this.sort(rows, query.sort ?? "relevance");

    const pageSize = clampPageSize(query.pageSize);
    const page = query.page ?? 1;
    const total = rows.length;
    const pageRows = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    // CU-05-01 : aucun résultat → suggestions d'élargissement.
    const hasFilters =
      query.category !== undefined ||
      query.specialty !== undefined ||
      query.maxPrice !== undefined ||
      query.minRating !== undefined ||
      query.availableNow === true ||
      query.district !== undefined;
    const suggestion =
      total === 0 && hasFilters
        ? "Aucun résultat. Élargissez votre recherche : retirez un filtre, ou parcourez les professionnels indisponibles et posez une cloche d'alerte pour être averti de leur retour."
        : null;

    return { items: pageRows.map((r) => this.toItemView(r)), page, pageSize, total, suggestion };
  }

  // ── EF-05-01/07 : fiche publique complète (CU-05-02) ────────────────────────

  async getProfile(professionalId: string): Promise<DirectoryProfileView> {
    const [pm26S, ratingScale] = await Promise.all([this.params.getInt("PM-26"), this.params.getIntList("PM-13")]);

    const profile = await this.prisma.professionalProfile.findFirst({
      where: {
        accountId: professionalId,
        account: { status: "ACTIVE" }, // RM-05-05
        verificationCase: { status: "VERIFIED", agreement: { versions: { some: { signedAt: { not: null } }, none: { signedAt: null } } } }, // RM-05-01
      },
      select: {
        accountId: true,
        firstName: true,
        lastName: true,
        category: true,
        specialty: true,
        district: true,
        biography: true,
      },
    });
    if (!profile) throw new NotFoundException("Professionnel introuvable"); // inexistant, non vérifié ou suspendu : même réponse

    const [row] = await this.enrich([profile], pm26S, ratingScale);

    const activeOffers = await this.prisma.careOffer.findMany({
      where: { professionalId, active: true },
      orderBy: { priceXaf: "asc" },
    });

    // EF-05-07 : moyenne, répartition, derniers commentaires — collectés par M06, AFFICHÉS ici.
    const distributionRows = await this.prisma.sessionRating.groupBy({
      by: ["score"],
      where: { session: { professionalId } },
      _count: { score: true },
    });
    const [minScore, maxScore] = ratingScale;
    const ratingDistribution: Record<string, number> = {};
    for (let s = minScore; s <= maxScore; s++) ratingDistribution[String(s)] = 0;
    for (const d of distributionRows) ratingDistribution[String(d.score)] = d._count.score;

    // Commentaires ANONYMES (aucun identifiant patient exposé) — signalables via M04.
    const comments = await this.prisma.sessionRating.findMany({
      where: { session: { professionalId }, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { score: true, comment: true, createdAt: true },
    });

    return {
      ...this.toItemView(row),
      biography: profile.biography,
      offers: activeOffers.map((o) => ({
        id: o.id,
        label: o.label,
        durationMin: o.durationMin,
        priceXaf: o.priceXaf,
        kind: o.kind,
      })),
      ratingDistribution,
      latestComments: comments.map((c) => ({
        score: c.score,
        comment: c.comment as string,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  // ── EF-05-06 : cloche « m'avertir quand il est disponible » (CU-05-05) ──────

  /**
   * Pose (ou re-pose) une cloche : upsert sur (patient, professionnel), validité
   * ALERT_VALIDITY_DAYS (7 jours — chiffre de SPEC CU-05-05), re-pose = réarmement
   * (notifiedAt remis à null). Refusée si le professionnel est déjà disponible.
   */
  async poseAvailabilityAlert(
    actor: AuthenticatedActor,
    professionalId: string,
  ): Promise<{ professionalId: string; expiresAt: string }> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("La cloche d'alerte est réservée aux patients connectés (EF-05-04)");
    }

    // Le professionnel doit exister dans la vitrine (mêmes règles RM-05-01/RM-05-05).
    const pro = await this.prisma.professionalProfile.findFirst({
      where: {
        accountId: professionalId,
        account: { status: "ACTIVE" },
        verificationCase: { status: "VERIFIED", agreement: { versions: { some: { signedAt: { not: null } }, none: { signedAt: null } } } },
      },
      select: { accountId: true },
    });
    if (!pro) throw new NotFoundException("Professionnel introuvable");

    // EF-05-06 : la cloche ne se pose que sur un ABSENT — disponible = on peut initier tout de suite.
    if (await this.presence.isAvailableForInitiation(professionalId)) {
      throw new ConflictException("Ce professionnel est disponible maintenant — vous pouvez initier une consultation");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ALERT_VALIDITY_DAYS * 24 * 3_600_000);
    const alert = await this.prisma.availabilityAlert.upsert({
      where: { patientId_professionalId: { patientId: actor.accountId, professionalId } },
      create: { patientId: actor.accountId, professionalId, expiresAt },
      update: { createdAt: now, expiresAt, notifiedAt: null }, // re-pose = réarmement (CU-05-05)
    });
    return { professionalId, expiresAt: alert.expiresAt.toISOString() };
  }

  // ── Enrichissement et tri ────────────────────────────────────────────────────

  private async enrich(
    profiles: Array<{
      accountId: string;
      firstName: string;
      lastName: string;
      category: string;
      specialty: string | null;
      district: string | null;
      biography: string | null;
    }>,
    pm26S: number,
    ratingScale: number[],
  ): Promise<EnrichedRow[]> {
    if (profiles.length === 0) return [];
    const ids = profiles.map((p) => p.accountId);
    const nowMs = Date.now();

    const [statsRows, presenceRows, activeOffers] = await Promise.all([
      this.prisma.professionalStats.findMany({ where: { professionalId: { in: ids } } }),
      this.prisma.presenceStatus.findMany({ where: { accountId: { in: ids } } }),
      this.prisma.careOffer.findMany({
        where: { professionalId: { in: ids }, active: true },
        orderBy: { priceXaf: "asc" }, // la première rencontrée par professionnel = la moins chère
      }),
    ]);

    const statsById = new Map(statsRows.map((s) => [s.professionalId, s]));
    const presenceById = new Map(presenceRows.map((p) => [p.accountId, p]));
    const cheapestById = new Map<string, (typeof activeOffers)[number]>();
    for (const offer of activeOffers) {
      if (!cheapestById.has(offer.professionalId)) cheapestById.set(offer.professionalId, offer);
    }

    return profiles.map((profile) => {
      const statsRow = statsById.get(profile.accountId) ?? null;
      const presenceRow = presenceById.get(profile.accountId) ?? null;

      // Présence calculée À LA LECTURE (PM-26) — jamais de bouton « initier » périmé (spec §8).
      const presence: PresenceStateCode = presenceRow
        ? effectivePresenceState(presenceRow.state, presenceRow.lastHeartbeatAt.getTime(), nowMs, pm26S)
        : "OFFLINE";
      const availableNow = presence === "ONLINE";

      // Voir `lastSeenSeconds` : rien quand il est là, écrêté à une semaine quand il ne l'est pas.
      const lastSeenSeconds = ((): number | null => {
        if (availableNow || !presenceRow) return null;
        const ecouleS = Math.max(0, Math.floor((nowMs - presenceRow.lastHeartbeatAt.getTime()) / 1000));
        return Math.min(ecouleS, PLAFOND_DERNIERE_VUE_S);
      })();

      const stats: ReactivityStats | null = statsRow
        ? {
            initiationsTotal: statsRow.initiationsTotal,
            confirmedTotal: statsRow.confirmedTotal,
            confirmDelaySumS: statsRow.confirmDelaySumS,
            ratingSum: statsRow.ratingSum,
            ratingCount: statsRow.ratingCount,
            incidentsTotal: statsRow.incidentsTotal,
          }
        : null;

      // Composante « activité récente » (RM-05-02) : dernier signe de vie — stats ou battement.
      const lastSignalAtMs = Math.max(
        statsRow ? statsRow.updatedAt.getTime() : Number.NEGATIVE_INFINITY,
        presenceRow ? presenceRow.lastHeartbeatAt.getTime() : Number.NEGATIVE_INFINITY,
      );
      const recent = hasRecentActivity(Number.isFinite(lastSignalAtMs) ? lastSignalAtMs : null, nowMs);

      const cheapest = cheapestById.get(profile.accountId);
      const avg = stats ? ratingAvg(stats) : null;
      const delay = stats ? avgConfirmDelayS(stats) : null;

      return {
        profile,
        stats,
        presence,
        availableNow,
        lastSeenSeconds,
        cheapestOffer: cheapest
          ? { id: cheapest.id, label: cheapest.label, durationMin: cheapest.durationMin, priceXaf: cheapest.priceXaf, kind: cheapest.kind }
          : null,
        score: relevanceScore(stats, recent, ratingScale),
        ratingAvg: avg === null ? null : Math.round(avg * 10) / 10,
        ratingCount: stats?.ratingCount ?? 0,
        confirmRatePctValue: stats ? confirmRatePct(stats) : 0,
        avgDelayS: delay === null ? null : Math.round(delay),
      };
    });
  }

  /** EF-05-03 : pertinence (défaut, RM-05-02), prix, note, réactivité — départage stable. */
  private sort(rows: EnrichedRow[], sortKey: DirectorySortCode): void {
    const byName = (a: EnrichedRow, b: EnrichedRow): number =>
      `${a.profile.lastName} ${a.profile.firstName}`.localeCompare(`${b.profile.lastName} ${b.profile.firstName}`, "fr");

    rows.sort((a, b) => {
      switch (sortKey) {
        case "price": {
          // Sans offre active : en fin de liste (rien à comparer).
          const pa = a.cheapestOffer?.priceXaf ?? Number.POSITIVE_INFINITY;
          const pb = b.cheapestOffer?.priceXaf ?? Number.POSITIVE_INFINITY;
          if (pa !== pb) return pa - pb;
          break;
        }
        case "rating": {
          // Affichage honnête : sans avis, derrière les notés (EF-05-07).
          const ra = a.ratingAvg ?? Number.NEGATIVE_INFINITY;
          const rb = b.ratingAvg ?? Number.NEGATIVE_INFINITY;
          if (ra !== rb) return rb - ra;
          if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
          break;
        }
        case "reactivity": {
          if (a.confirmRatePctValue !== b.confirmRatePctValue) return b.confirmRatePctValue - a.confirmRatePctValue;
          const da = a.avgDelayS ?? Number.POSITIVE_INFINITY;
          const db = b.avgDelayS ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
          break;
        }
        case "relevance":
        default:
          break;
      }
      // Pertinence — départage commun à tous les tris.
      if (a.score !== b.score) return b.score - a.score;
      if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
      return byName(a, b);
    });
  }

  private toItemView(row: EnrichedRow): DirectoryItemView {
    return {
      professionalId: row.profile.accountId,
      displayName: `${row.profile.firstName} ${row.profile.lastName}`,
      category: row.profile.category,
      specialty: row.profile.specialty,
      district: row.profile.district,
      badgeVerified: true,
      rating: { avg: row.ratingAvg, count: row.ratingCount },
      reactivity: { confirmRatePct: row.confirmRatePctValue, avgConfirmDelayS: row.avgDelayS },
      presence: row.presence,
      availableNow: row.availableNow,
      lastSeenSeconds: row.lastSeenSeconds,
      cheapestOffer: row.cheapestOffer,
      relevanceScore: Math.round(row.score * 1000) / 1000,
    };
  }
}

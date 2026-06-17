/**
 * M16 — Tableaux de bord personnels (EF-16-01/02), LECTURE SEULE.
 *
 * RM-16-01 : aucune écriture ; les gains sont lus via PaymentsService (M13, C1), le reste
 * en lecture Prisma directe. RM-16-02 : JAMAIS le contenu du Carnet ni d'une session —
 * uniquement des compteurs et des reçus. Chacun ne voit QUE le sien (accès vérifié serveur).
 */
import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { PaymentsService } from "../m13-payments/m13.payments.service";

export interface ProfessionalDashboard {
  sessionsThisMonth: number;
  earnings: { availableXaf: number; pendingXaf: number };
  averageRating: number | null;
  confirmationRatePct: number;
}

export interface FacilityDashboard {
  facilityId: string;
  reservationsServed: number;
  earnings: { availableXaf: number; pendingXaf: number };
}

export interface PatientSpace {
  sessionsCount: number;
  disclosuresCount: number;
  prescriptionsCount: number;
  receipts: Awaited<ReturnType<PaymentsService["listReceiptsForPayer"]>>;
}

interface ActorRef {
  accountId: string;
  accountType: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  // ── EF-16-01 : tableau de bord professionnel ─────────────────────────────────

  async professionalDashboard(actor: ActorRef): Promise<ProfessionalDashboard> {
    if (actor.accountType !== "PROFESSIONAL") {
      throw new ForbiddenException("Tableau de bord réservé aux professionnels");
    }
    const start = startOfMonth();
    const [sessionsThisMonth, earnings, stats] = await Promise.all([
      this.prisma.careSession.count({
        where: { professionalId: actor.accountId, paidAt: { gte: start } },
      }),
      this.payments.getEarnings("PROFESSIONAL", actor.accountId),
      this.prisma.professionalStats.findUnique({ where: { professionalId: actor.accountId } }),
    ]);

    const averageRating =
      stats && stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : null;
    const confirmationRatePct =
      stats && stats.initiationsTotal > 0
        ? Math.round((stats.confirmedTotal / stats.initiationsTotal) * 1000) / 10
        : 0;

    return {
      sessionsThisMonth,
      earnings: { availableXaf: earnings.availableXaf, pendingXaf: earnings.pendingXaf },
      averageRating,
      confirmationRatePct,
    };
  }

  // ── EF-16-01 : tableau de bord structure (pharmacie) ─────────────────────────

  async facilityDashboard(actor: ActorRef, facilityId: string): Promise<FacilityDashboard> {
    // Accès vérifié serveur : membre ACTIF de la pharmacie visée (D-003).
    const membership = await this.prisma.facilityMember.findFirst({
      where: { facilityId, accountId: actor.accountId, active: true },
    });
    if (!membership) throw new ForbiddenException("Réservé aux membres actifs de la structure");

    const [reservationsServed, earnings] = await Promise.all([
      this.prisma.reservation.count({ where: { facilityId, status: "SERVED" } }),
      this.payments.getEarnings("FACILITY", facilityId),
    ]);

    return {
      facilityId,
      reservationsServed,
      earnings: { availableXaf: earnings.availableXaf, pendingXaf: earnings.pendingXaf },
    };
  }

  // ── EF-16-02 : Mon Espace patient ────────────────────────────────────────────

  async patientSpace(actor: ActorRef): Promise<PatientSpace> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Espace réservé aux patients");
    }
    // RM-16-02 : on agrège des COMPTEURS — jamais le contenu du Carnet ni des sessions.
    const [sessionsCount, disclosuresCount, prescriptionsCount, receipts] = await Promise.all([
      this.prisma.careSession.count({ where: { patientAccountId: actor.accountId } }),
      this.prisma.disclosure.count({ where: { patientAccountId: actor.accountId } }),
      this.prisma.prescription.count({ where: { patientAccountId: actor.accountId } }),
      this.payments.listReceiptsForPayer(actor.accountId),
    ]);

    return { sessionsCount, disclosuresCount, prescriptionsCount, receipts };
  }
}

/** Début du mois courant (heure serveur) — borne du « sessions du mois » (EF-16-01). */
function startOfMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

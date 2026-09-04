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
// La règle du taux vit dans M05, et nulle part ailleurs (dette n°23).
import { confirmDenominator, confirmRate } from "../m05-directory/m05.policies";

export interface ProfessionalDashboard {
  sessionsThisMonth: number;
  earnings: { availableXaf: number; pendingXaf: number };
  averageRating: number | null;
  confirmationRatePct: number;
  /**
   * Sur combien de demandes ce taux porte — les sollicitations MOINS les refus motivés (n°23).
   *
   * Sans lui, l'écran affiche un pourcentage dont il ignore l'assiette : « 100 % » sur deux
   * demandes et « 100 % » sur deux cents s'écrivent pareil et ne valent pas la même chose. C'est
   * aussi la seule façon honnête de dire au médecin que ses refus n'y sont plus comptés.
   */
  confirmationBase: number;
  /**
   * Les six derniers mois, du plus ancien au plus récent (2026-08).
   *
   * Ils manquaient : la maquette B2 montrait un graphique, et rien ne calculait de série. L'écran
   * n'affichait donc que quatre nombres bruts, sans aucune idée d'une progression.
   *
   * Ce n'est pas une estimation : chaque consultation payée porte sa date, chaque crédit de gains
   * aussi. On regroupe ce qui EXISTE — un mois sans consultation vaut zéro, pas « pas de données ».
   */
  lastSixMonths: Array<{ month: string; sessions: number; earnedXaf: number }>;
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
    // Six mois pleins, en repartant du 1er du mois d'il y a cinq mois.
    const debutSerie = new Date(start);
    debutSerie.setMonth(debutSerie.getMonth() - 5);

    const [sessionsThisMonth, earnings, stats, seances, credits] = await Promise.all([
      this.prisma.careSession.count({
        where: { professionalId: actor.accountId, paidAt: { gte: start } },
      }),
      this.payments.getEarnings("PROFESSIONAL", actor.accountId),
      this.prisma.professionalStats.findUnique({ where: { professionalId: actor.accountId } }),
      this.prisma.careSession.findMany({
        where: { professionalId: actor.accountId, paidAt: { gte: debutSerie } },
        select: { paidAt: true },
      }),
      // Les CRÉDITS seulement : un retrait n'est pas un gain, et un remboursement n'en est pas un
      // non plus. Les additionner donnerait une courbe qui descend quand le médecin retire son
      // argent — l'inverse de ce que le graphique doit dire.
      this.prisma.earningsEntry.findMany({
        where: {
          type: "CREDIT",
          createdAt: { gte: debutSerie },
          account: { holderType: "PROFESSIONAL", holderId: actor.accountId },
        },
        select: { createdAt: true, amountXaf: true },
      }),
    ]);

    const averageRating =
      stats && stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : null;
    /*
      La formule était recopiée ici (dette n°23) : `confirmedTotal / initiationsTotal`, à la main.
      Elle vit désormais dans `confirmRate` (M05), seule définition du taux — sans quoi le tableau
      de bord du médecin et l'annuaire public auraient affiché deux chiffres différents pour lui.

      `confirmRate` renvoie 0..1 ; l'arrondi au dixième de POINT reste ici, c'est de la présentation.
    */
    const confirmationRatePct = stats ? Math.round(confirmRate(stats) * 1000) / 10 : 0;
    const confirmationBase = stats ? confirmDenominator(stats) : 0;

    // Les six cases sont créées VIDES d'abord : un mois sans activité doit valoir zéro et occuper
    // sa place. Ne renvoyer que les mois vécus donnerait une courbe qui saute des mois entiers.
    const cases = new Map<string, { month: string; sessions: number; earnedXaf: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(debutSerie);
      d.setMonth(d.getMonth() + i);
      const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      cases.set(cle, { month: cle, sessions: 0, earnedXaf: 0 });
    }
    const cleDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    for (const s of seances) {
      const c = cases.get(cleDe(s.paidAt));
      if (c) c.sessions += 1;
    }
    for (const e of credits) {
      const c = cases.get(cleDe(e.createdAt));
      if (c) c.earnedXaf += e.amountXaf;
    }

    return {
      sessionsThisMonth,
      earnings: { availableXaf: earnings.availableXaf, pendingXaf: earnings.pendingXaf },
      averageRating,
      confirmationRatePct,
      confirmationBase,
      lastSixMonths: [...cases.values()],
    };
  }

  /*
    ── Le tableau de bord d'une STRUCTURE est retiré le 03/09/2026 (dette n°17) ─────────────────

    Il vivait ici, entre celui du professionnel et l'Espace patient, et comptait deux choses qui
    n'existent plus : les **réservations servies** — notion sortie du produit avec la chaîne du
    médicament (D-052) — et les **gains d'une structure**, dont l'inventaire de la base a confirmé
    le 03/09 qu'il n'en existe aucun.

    Sa garde d'accès exigeait un membre ACTIF de la structure : avec zéro adhésion en base, elle
    répondait **403 à tous les coups**. Une route qui ne peut que refuser n'est pas une route.

    C'était la dernière survivante du balayage — trouvée par `scripts/relever-routes.ts` et non à
    l'œil, parce qu'elle vivait dans M16 et non dans M02. *Un périmètre se vérifie par les ROUTES
    servies, pas par les dossiers du code.*
  */

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

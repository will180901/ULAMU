/**
 * M16 — KPIs du pilote (EF-16-05, CU-16-03) : EXACTEMENT les 7 critères de succès du
 * plan_releases §3, en LECTURE SEULE et en AGRÉGATS uniquement (RM-16-01/05).
 *
 * Aucune donnée médicale individuelle ne sort d'ici : que des compteurs et des taux.
 * Calculs Prisma directs (le Pilotage lit les domaines, il n'appelle pas leurs services
 * d'écriture). Cibles = chiffres de spec, figés dans m16.policies (pas des PM-xx).
 */
import { Injectable } from "@nestjs/common";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { evaluateKpi, KPI_TARGETS, KpiStatus, rate } from "./m16.policies";

export interface PilotKpi {
  /** Clé technique stable du KPI. */
  key: string;
  /** Libellé lisible (FR) du critère du pilote. */
  label: string;
  /** Valeur agrégée courante. */
  value: number;
  /** Cible de spec (plan_releases §3). */
  target: number;
  /** Unité d'affichage : "count" = effectif, "%" = taux. */
  unit: "count" | "%";
  /** Vert si la cible est atteinte, rouge sinon. */
  status: KpiStatus;
}

@Injectable()
export class PilotKpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
  ) {}

  /** CU-16-03 : les 7 indicateurs en temps quasi réel, avec seuils vert/rouge. */
  async getPilotKpis(): Promise<PilotKpi[]> {
    const [
      prosVerifiesActifs,
      pharmaciesStockVivant,
      sessionsRealisees,
      devoilementsPayes,
      tauxConfirmation,
      tauxRemboursementAuto,
      patientsRevenus,
    ] = await Promise.all([
      this.prosVerifiesActifs(),
      this.pharmaciesStockVivant(),
      this.sessionsRealisees(),
      this.devoilementsPayes(),
      this.tauxConfirmation(),
      this.tauxRemboursementAuto(),
      this.patientsRevenus(),
    ]);

    return [
      this.kpi("PROS_VERIFIES", "Professionnels vérifiés et actifs", prosVerifiesActifs, "count"),
      this.kpi("PHARMACIES_STOCK_VIVANT", "Pharmacies au stock vivant", pharmaciesStockVivant, "count"),
      this.kpi("SESSIONS", "Sessions réalisées", sessionsRealisees, "count"),
      this.kpi("DEVOILEMENTS_PAYES", "Dévoilements payés", devoilementsPayes, "count"),
      this.kpi("TAUX_CONFIRMATION", "Taux de confirmation des poignées de main", tauxConfirmation, "%"),
      this.kpi("TAUX_REMBOURSEMENT_AUTO", "Taux de remboursement automatique", tauxRemboursementAuto, "%"),
      this.kpi("PATIENTS_REVENUS", "Patients revenus (≥ 2 sessions)", patientsRevenus, "%"),
    ];
  }

  /**
   * S6 — la couverture par arrondissement (famille 3, groupe E).
   *
   * ── Ce que ce compte remplace ──────────────────────────────────────────────────────────────────
   *
   * La maquette E5 écrit six arrondissements avec leurs effectifs **en dur** — « Bacongo 78
   * soignants · 21 officines » — et conclut : « moins d'un soignant vérifié pour 8 000 habitants ».
   *
   * Les effectifs, eux, sont **calculables** : chaque fiche professionnelle et chaque structure
   * portent leur `district`. La population ne l'est pas — aucune donnée de recensement n'existe, et
   * ULAMU n'a aucune raison d'en détenir. La phrase sur les habitants disparaît donc ; le tableau,
   * lui, devient vrai.
   *
   * ── Ce qui est compté, exactement ──────────────────────────────────────────────────────────────
   *
   * • **Soignants** : les mêmes que le KPI « professionnels vérifiés et actifs » — dossier
   *   `VERIFIED` **et** contrat signé (D-029). Compter les vérifiés non signés gonflerait la
   *   couverture d'exerçants qui n'exercent pas.
   * • **Officines** : structures `PHARMACY` au statut `ACTIVE`. Une pharmacie suspendue ne couvre
   *   personne.
   *
   * Un arrondissement sans profil renseigné (`district: null`) n'apparaît pas : on ne fabrique pas
   * une ligne « non renseigné » qui ressemblerait à un territoire.
   *
   * Agrégats seuls, aucune donnée individuelle (RM-16-05).
   */
  async couvertureParArrondissement(): Promise<Array<{ district: string; professionals: number; facilities: number }>> {
    const [soignants, officines] = await Promise.all([
      this.prisma.professionalProfile.groupBy({
        by: ["district"],
        where: {
          district: { not: null },
          // La relation est un à un (`VerificationCase.professionalId` est unique) : `is`, pas `some`.
          verificationCase: { is: { status: "VERIFIED", agreement: { versions: { some: { signedAt: { not: null } } } } } },
        },
        _count: { _all: true },
      }),
      this.prisma.facility.groupBy({
        by: ["district"],
        where: { type: "PHARMACY", status: "ACTIVE" },
        _count: { _all: true },
      }),
    ]);

    const parDistrict = new Map<string, { district: string; professionals: number; facilities: number }>();
    for (const l of soignants) {
      const d = l.district as string;
      parDistrict.set(d, { district: d, professionals: l._count._all, facilities: 0 });
    }
    for (const l of officines) {
      const existant = parDistrict.get(l.district);
      if (existant) existant.facilities = l._count._all;
      else parDistrict.set(l.district, { district: l.district, professionals: 0, facilities: l._count._all });
    }

    // Du mieux couvert au moins couvert : c'est la fin de la liste qui intéresse le pilotage.
    return [...parDistrict.values()].sort(
      (a, b) => b.professionals + b.facilities - (a.professionals + a.facilities),
    );
  }

  /** Assemble un KPI à partir de sa cible de spec et de sa valeur agrégée. */
  private kpi(name: keyof typeof KPI_TARGETS, label: string, value: number, unit: "count" | "%"): PilotKpi {
    const t = KPI_TARGETS[name];
    return { key: t.key, label, value, target: t.target, unit, status: evaluateKpi(value, t.target, t.direction) };
  }

  // ── Effectifs (agrégats, RM-16-05) ──────────────────────────────────────────

  /** Professionnels VERIFIED dont le contrat possède au moins une version signée (D-029). */
  private prosVerifiesActifs(): Promise<number> {
    return this.prisma.verificationCase.count({
      where: {
        professionalId: { not: null },
        status: "VERIFIED",
        agreement: { versions: { some: { signedAt: { not: null } } } },
      },
    });
  }

  /**
   * Pharmacies (PHARMACY actives) dont la fraîcheur du stock est en-deçà du seuil PM-33 (secondes).
   * On filtre bien sur le type/statut de la structure : un labo ou une structure suspendue ne gonfle
   * pas le compteur « pharmacies au stock vivant ».
   */
  private async pharmaciesStockVivant(): Promise<number> {
    const freshnessWindowS = await this.params.getInt("PM-33");
    const threshold = new Date(Date.now() - freshnessWindowS * 1000);
    const fresh = await this.prisma.facilityStockState.findMany({
      where: { lastFreshAt: { gte: threshold } },
      select: { facilityId: true },
    });
    if (fresh.length === 0) return 0;
    return this.prisma.facility.count({
      where: { id: { in: fresh.map((s) => s.facilityId) }, type: "PHARMACY", status: "ACTIVE" },
    });
  }

  /** Sessions de consultation menées à terme. */
  private sessionsRealisees(): Promise<number> {
    return this.prisma.careSession.count({ where: { status: "ENDED" } });
  }

  /**
   * Dévoilements effectivement payés et NON remboursés (preuve de la 2ᵉ source de revenus) : un
   * dévoilement REFUNDED conserve son paidAt mais ne compte pas comme une recette nette.
   */
  private devoilementsPayes(): Promise<number> {
    return this.prisma.disclosure.count({ where: { paidAt: { not: null }, status: { not: "REFUNDED" } } });
  }

  // ── Taux (agrégats, RM-16-05) ───────────────────────────────────────────────

  /** Σ confirmées / Σ initiées des poignées de main (ProfessionalStats) — 0 % si aucune. */
  private async tauxConfirmation(): Promise<number> {
    const agg = await this.prisma.professionalStats.aggregate({
      _sum: { confirmedTotal: true, initiationsTotal: true },
    });
    return rate(agg._sum.confirmedTotal ?? 0, agg._sum.initiationsTotal ?? 0);
  }

  /**
   * Σ incidents (sessions remboursées D-008, ProfessionalStats.incidentsTotal) rapportée aux
   * sessions arrivées à un état terminal (ENDED ou REFUNDED) — la part remboursée du flux.
   */
  private async tauxRemboursementAuto(): Promise<number> {
    const [incidents, terminales] = await Promise.all([
      this.prisma.professionalStats.aggregate({ _sum: { incidentsTotal: true } }),
      this.prisma.careSession.count({ where: { status: { in: ["ENDED", "REFUNDED"] } } }),
    ]);
    return rate(incidents._sum.incidentsTotal ?? 0, terminales);
  }

  /**
   * Part des patients « revenus » : ayant ≥ 2 sessions parmi ceux en ayant ≥ 1.
   * groupBy patientAccountId → on compte les groupes selon leur effectif de sessions.
   */
  private async patientsRevenus(): Promise<number> {
    // Sur les sessions RÉALISÉES (ENDED) uniquement — cohérent avec le KPI « sessions réalisées »
    // (on ne compte pas une session payée non démarrée ni remboursée comme une visite « revenue »).
    const groups = await this.prisma.careSession.groupBy({
      by: ["patientAccountId"],
      where: { status: "ENDED" },
      _count: { _all: true },
    });
    const withAtLeastOne = groups.length;
    const withAtLeastTwo = groups.filter((g) => g._count._all >= 2).length;
    return rate(withAtLeastTwo, withAtLeastOne);
  }
}

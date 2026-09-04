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
// La définition du taux de confirmation vit dans M05, et nulle part ailleurs (dette n°23).
import { confirmRate } from "../m05-directory/m05.policies";
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

  /**
   * CU-16-03 : les indicateurs du pilote en temps quasi réel, avec seuils vert/rouge.
   *
   * ⚠️ **Ils étaient SEPT, ils sont CINQ depuis le 02/09/2026 (chantier 26).** Deux mesuraient la
   * chaîne du médicament en pharmacie — « pharmacies au stock vivant » et « dévoilements payés » —
   * et ULAMU ne la couvre plus : elle sortait du périmètre des trois acteurs (patient, médecin,
   * administration). Les garder aurait servi des compteurs à décroissance lente sur des données
   * que plus personne n'alimente : un chiffre faux est pire qu'un chiffre absent, et c'est un
   * écran de PILOTAGE.
   *
   * ⚠️ Le plan de sortie compte toujours sept critères de succès : **deux ne sont plus mesurés, ni
   * mesurables.** Cet écart appartient au porteur, il est inscrit au §9 du plan d'exécution.
   */
  async getPilotKpis(): Promise<PilotKpi[]> {
    const [
      prosVerifiesActifs,
      sessionsRealisees,
      tauxConfirmation,
      tauxRemboursementAuto,
      patientsRevenus,
    ] = await Promise.all([
      this.prosVerifiesActifs(),
      this.sessionsRealisees(),
      this.tauxConfirmation(),
      this.tauxRemboursementAuto(),
      this.patientsRevenus(),
    ]);

    return [
      this.kpi("PROS_VERIFIES", "Professionnels vérifiés et actifs", prosVerifiesActifs, "count"),
      this.kpi("SESSIONS", "Sessions réalisées", sessionsRealisees, "count"),
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
   * ⚠️ **Les officines ont été retirées du décompte le 02/09/2026 (chantier 26).** Elles étaient
   * comptées sur les structures `PHARMACY` actives — une donnée que plus personne n'alimente
   * depuis que la chaîne du médicament est sortie du périmètre. Un indicateur de couverture qui
   * additionne un chiffre vivant et un chiffre figé donne un total faux, et c'est un écran de
   * pilotage : on y décide où la plateforme manque.
   *
   * Un arrondissement sans profil renseigné (`district: null`) n'apparaît pas : on ne fabrique pas
   * une ligne « non renseigné » qui ressemblerait à un territoire.
   *
   * Agrégats seuls, aucune donnée individuelle (RM-16-05).
   */
  async couvertureParArrondissement(): Promise<Array<{ district: string; professionals: number }>> {
    const soignants = await this.prisma.professionalProfile.groupBy({
      by: ["district"],
      where: {
        district: { not: null },
        // La relation est un à un (`VerificationCase.professionalId` est unique) : `is`, pas `some`.
        verificationCase: { is: { status: "VERIFIED", agreement: { versions: { some: { signedAt: { not: null } } } } } },
      },
      _count: { _all: true },
    });

    // Du mieux couvert au moins couvert : c'est la fin de la liste qui intéresse le pilotage.
    return soignants
      .map((l) => ({ district: l.district as string, professionals: l._count._all }))
      .sort((a, b) => b.professionals - a.professionals);
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

  /** Sessions de consultation menées à terme. */
  private sessionsRealisees(): Promise<number> {
    return this.prisma.careSession.count({ where: { status: "ENDED" } });
  }

  // ── Taux (agrégats, RM-16-05) ───────────────────────────────────────────────

  /**
   * Σ confirmées / (Σ initiées − Σ refus motivés) — 0 % si aucune (dette n°23, 04/09/2026).
   *
   * ⚠️ Le dénominateur n'excluait les refus NULLE PART : la formule était recopiée à la main ici,
   * dans `m16.dashboard.service.ts` et dans `m05.policies.ts`. Trois copies, donc trois vérités
   * possibles pour un même chiffre. Le calcul passe désormais par `confirmRate` (M05), qui porte
   * la définition et son pourquoi.
   *
   * L'agrégat reste ici parce que celui-ci est un taux de PLATEFORME, pas d'un médecin : la somme
   * des compteurs de tous, réduite en une seule ligne d'indicateurs.
   */
  private async tauxConfirmation(): Promise<number> {
    const agg = await this.prisma.professionalStats.aggregate({
      _sum: { confirmedTotal: true, initiationsTotal: true, refusedTotal: true },
    });
    return confirmRate({
      initiationsTotal: agg._sum.initiationsTotal ?? 0,
      confirmedTotal: agg._sum.confirmedTotal ?? 0,
      refusedTotal: agg._sum.refusedTotal ?? 0,
      confirmDelaySumS: 0,
      ratingSum: 0,
      ratingCount: 0,
      incidentsTotal: 0,
    });
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

/**
 * M16 — routes de LECTURE (EF-16-01/02/05).
 * AuthGuard global : tout est authentifié. Les tableaux de bord personnels vérifient l'accès
 * serveur (chacun ne voit que le sien). Les KPIs du pilote sont réservés à l'Équipe ULAMU.
 */
import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Actor } from "../../common/auth/actor.decorator";
import { AdminGuard, AdminOnly } from "../../common/auth/admin.guard";
import { AuthenticatedActor, Public } from "../../common/auth/auth.guard";
import { DashboardService } from "./m16.dashboard.service";
import { CreateSupportRequestDto, CreateSupportRequestWithoutSessionDto } from "./m16.dto";
import { PilotKpiService } from "./m16.kpi.service";
import { SupportRequestService } from "./m16.support-requests.service";

@Controller("v1")
export class M16ReadController {
  constructor(
    private readonly dashboards: DashboardService,
    private readonly kpis: PilotKpiService,
    private readonly supportRequests: SupportRequestService,
  ) {}

  /*
    ── Écrire à l'administration (01/09/2026, dette 8quater) ─────────────────────────────────────

    Ces deux routes remplacent une adresse de courriel — `support@ulamu.cg` — dont le domaine
    n'appartient pas au projet. Elle figurait dans les mentions légales, acceptées à l'inscription
    et valant donc preuve : on promettait une voie de contact qui ne menait nulle part.

    Aucun sous-rôle, aucune condition : **tout compte authentifié écrit**. C'est précisément quand
    plus rien d'autre ne marche qu'on a besoin d'écrire — un dossier bloqué, un numéro perdu.
  */

  /** Déposer une demande. Renvoie son identifiant : l'accusé de réception est immédiat. */
  @Post("support-requests")
  @HttpCode(201)
  createSupportRequest(@Actor() actor: AuthenticatedActor, @Body() dto: CreateSupportRequestDto) {
    return this.supportRequests.create(actor, dto);
  }

  /**
   * Écrire au support SANS session — le recours d'un compte suspendu ou clôturé (chantier 63).
   *
   * ⚠️ **Publique, et c'est tout le point.** La garde refuse chaque requête d'un compte non actif,
   * pendant que la notification de suspension l'invite à « contacter le support pour connaître le
   * motif et les voies de recours ». L'invitation était écrite et impraticable.
   *
   * L'identité se prouve par un code envoyé à l'adresse DU COMPTE (`purpose: SUPPORT_ACCESS`), pas
   * par une session — qu'on ne délivre pas : un jeton valide pour un compte suspendu retirerait à
   * la suspension le sens qu'elle a. Le quota horaire PM-19, la durée de vie PM-17 et le compteur
   * d'essais durci (D-048) protègent déjà ce mécanisme ; il n'y a pas de rempart neuf à tenir.
   */
  @Public()
  @Post("support-requests/public")
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createSupportRequestWithoutSession(@Body() dto: CreateSupportRequestWithoutSessionDto) {
    return this.supportRequests.createWithoutSession(dto.email, dto.otpCode, { subject: dto.subject, body: dto.body });
  }

  /** Mes demandes ET leurs réponses — la réponse se lit ici, c'est tout l'intérêt. */
  @Get("support-requests/mine")
  mySupportRequests(@Actor() actor: AuthenticatedActor) {
    return this.supportRequests.mine(actor);
  }

  /** EF-16-01 : tableau de bord du professionnel connecté. */
  @Get("me/dashboard")
  professionalDashboard(@Actor() actor: AuthenticatedActor) {
    return this.dashboards.professionalDashboard(actor);
  }

  /** EF-16-02 : Mon Espace patient (compteurs + reçus, jamais le Carnet). */
  @Get("me/space")
  patientSpace(@Actor() actor: AuthenticatedActor) {
    return this.dashboards.patientSpace(actor);
  }

  /**
   * EF-16-05 / CU-16-03 : les 7 KPIs du pilote. Réservé à l'Équipe ULAMU (tout sous-rôle).
   * @AdminOnly() sans argument = n'importe quel admin. (AdminGuard imposait aussi le TOTP
   * jusqu'au 02/09/2026 ; D-053 l'a rendu optionnel pour tous les types de compte.)
   */
  @UseGuards(AdminGuard)
  @AdminOnly()
  @Get("admin/pilot-kpis")
  pilotKpis() {
    return this.kpis.getPilotKpis();
  }

  /**
   * S6 — la couverture par arrondissement (EF-16-05, famille 3 groupe E).
   *
   * Remplace six lignes écrites en dur dans la maquette E5. Agrégats seuls : un compte de soignants
   * exerçants et un compte d'officines actives par arrondissement, aucune donnée individuelle
   * (RM-16-05).
   */
  @UseGuards(AdminGuard)
  @AdminOnly()
  @Get("admin/coverage")
  coverage() {
    return this.kpis.couvertureParArrondissement();
  }
}

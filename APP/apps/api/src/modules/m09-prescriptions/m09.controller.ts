/**
 * M09 — routes Ordonnance & Délivrance.
 * AuthGuard global : tout est authentifié (la connexion active est la condition même de la
 * délivrance, EF-09-06). La portée et les droits sont TOUJOURS vérifiés côté service :
 * - prescription : seul le professionnel de la session, en session active (RM-09-01) ;
 * - délivrance : droit « dispense » sur une pharmacie vérifiée (RM-09-03).
 * RM-09-04 : le scan ne révèle QUE l'ordonnance — jamais le Carnet.
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { CancelPrescriptionDto, CreatePrescriptionDto, DispenseDto } from "./m09.dto";
import { DispensationService } from "./m09.dispensation.service";
import { PrescriptionService } from "./m09.prescription.service";

/** Le scan cible une pharmacie précise : le droit « dispense » sur CETTE pharmacie est vérifié. */
class ScanQueryDto {
  @IsUUID(undefined, { message: "Pharmacie invalide" })
  facilityId!: string;
}

@Controller("v1/prescriptions")
export class M09Controller {
  constructor(
    private readonly prescriptions: PrescriptionService,
    private readonly dispensations: DispensationService,
  ) {}

  // ── Prescripteur en session (EF-09-01/02/03/04/08/09) ───────────────────────

  /** Crée et scelle une ordonnance depuis une session active (CU-09-01). */
  @Post("sessions/:sessionId")
  create(@Actor() actor: AuthenticatedActor, @Param("sessionId") sessionId: string, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptions.createInSession(actor, sessionId, dto);
  }

  /** Historique des ordonnances du patient connecté (EF-09-09). */
  @Get("me")
  listMine(@Actor() actor: AuthenticatedActor) {
    return this.prescriptions.listForPatient(actor);
  }

  /**
   * Les ordonnances que j'ai PRESCRITES (EF-09-09, côté soignant).
   *
   * Déclarée AVANT `@Get(":id")`, sans quoi « prescribed » serait pris pour un identifiant.
   */
  @Get("prescribed")
  listPrescribed(@Actor() actor: AuthenticatedActor) {
    return this.prescriptions.listForPrescriber(actor);
  }

  /** Détail d'une ordonnance (patient propriétaire ou prescripteur — portée vérifiée service). */
  @Get(":id")
  getOne(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.prescriptions.getForActor(actor, id);
  }

  /** Annule une ordonnance non entièrement délivrée — seul le prescripteur, motif requis (CU-09-04). */
  @Post(":id/cancel")
  @HttpCode(200)
  cancel(@Actor() actor: AuthenticatedActor, @Param("id") id: string, @Body() dto: CancelPrescriptionDto) {
    return this.prescriptions.cancel(actor, id, dto.reason);
  }

  // ── Pharmacie : scan & délivrance (EF-09-06/07 ; CU-09-02/03) ───────────────

  /** Scanne un QR : état réel côté serveur (lignes + quantités restantes + validité). RM-09-04. */
  @Post("scan/:qrToken")
  @HttpCode(200)
  scan(@Actor() actor: AuthenticatedActor, @Param("qrToken") qrToken: string, @Query() query: ScanQueryDto) {
    return this.dispensations.scanVerify(actor, qrToken, query.facilityId);
  }

  /** Délivre totalement ou partiellement (le solde reste délivrable ailleurs, CU-09-03). */
  @Post("scan/:qrToken/dispense")
  @HttpCode(200)
  dispense(@Actor() actor: AuthenticatedActor, @Param("qrToken") qrToken: string, @Body() dto: DispenseDto) {
    return this.dispensations.dispense(actor, qrToken, dto);
  }
}

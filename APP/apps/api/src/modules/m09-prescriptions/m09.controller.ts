/**
 * M09 — routes Ordonnance & Délivrance.
 * AuthGuard global : tout est authentifié (la connexion active est la condition même de la
 * délivrance, EF-09-06). La portée et les droits sont TOUJOURS vérifiés côté service :
 * - prescription : seul le professionnel de la session, en session active (RM-09-01) ;
 * - délivrance : droit « dispense » sur une pharmacie vérifiée (RM-09-03).
 * RM-09-04 : le scan ne révèle QUE l'ordonnance — jamais le Carnet.
 */
import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { CancelPrescriptionDto, CreatePrescriptionDto } from "./m09.dto";
import { PrescriptionService } from "./m09.prescription.service";

@Controller("v1/prescriptions")
export class M09Controller {
  constructor(private readonly prescriptions: PrescriptionService) {}

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

  /*
    ── Le scan et la délivrance sont RETIRÉS (02/09/2026, chantier 26) ─────────────────────────

    ULAMU couvre trois acteurs : le patient, le médecin, l'administration. La pharmacie n'en est
    pas un — le compte de structure est sorti du produit le 02/09 (D-051), et avec lui le sous-
    système qui n'avait plus personne pour l'exploiter.

    `POST scan/:qrToken` et `POST scan/:qrToken/dispense` étaient les deux seules routes que la
    pharmacie appelait ici. Elles exigeaient le droit « dispense » sur une officine vérifiée : plus
    aucun compte ne peut le porter, elles ne répondaient donc déjà plus à personne.

    ⚠️ **Ce que cela change pour l'ordonnance, et il faut le savoir** : elle est toujours prescrite,
    scellée, consultable et annulable — mais elle ne peut plus être SERVIE dans ULAMU. Les statuts
    `DISPENSED` et `PARTIALLY_DISPENSED` du modèle deviennent inatteignables, et le QR n'a plus de
    lecteur. L'écart était déjà inscrit dans ALIGNEMENT_MAQUETTE_CAHIER pour C4 ; il est désormais
    définitif. Voir la dette n°14 au §9 du plan d'exécution web.
  */
}

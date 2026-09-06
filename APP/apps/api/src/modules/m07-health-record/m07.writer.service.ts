/**
 * M07 — HealthRecordWriterService : l'API C2 d'écriture dans le Carnet, consommée par
 * M06 (comptes-rendus), M09 (ordonnances), M10 (résultats), M08-V1 (constantes) et par
 * les déclarations patient de M07 lui-même (EF-07-05/06).
 *
 * Contrat (signature imposée — ne pas modifier sans coordonner M06/M09/M10) :
 * - appendEntry s'exécute DANS la transaction de l'appelant (tx) — l'acte métier,
 *   l'entrée du Carnet et la notification C4 réussissent ou échouent ENSEMBLE (ADR-11) ;
 * - INSERTION SEULE (RM-07-02) : aucune entrée n'est jamais modifiée ni supprimée —
 *   une correction est une nouvelle entrée avec supersedesId (même Carnet, même type) ;
 * - le Carnet du propriétaire est résolu, et CRÉÉ s'il manque (sécurité : l'événement
 *   EF-07-01 peut ne pas encore être relayé au moment du premier dépôt) ;
 * - notifie le patient propriétaire (template "m07.entry.added") — JAMAIS pour une
 *   PERSONAL_NOTE ; pour un sous-profil, le « patient propriétaire » est son TUTEUR
 *   (D-033, RM-07-06) ; le payload C4 ne contient AUCUN contenu médical (RM-14-03) ;
 * - AUCUN audit ici : l'appelant audite SON acte métier dans la même transaction (C5).
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { HealthRecord, Prisma, RecordEntryType, RecordProvenance, SubProfileStatus } from "@prisma/client";
import { OutboxService } from "../../common/outbox.service";
import { canSupersede } from "./m07.policies";

export interface AppendEntryInput {
  /** Exactement UN des deux propriétaires (RM-07-01) : compte patient… */
  ownerPatientId?: string;
  /** …ou sous-profil « personne à charge » (EF-07-09). */
  ownerSubProfileId?: string;
  type: RecordEntryType;
  /** RM-07-03 : la provenance est toujours posée par l'écrivain, jamais déduite. */
  provenance: RecordProvenance;
  /** Compte auteur (null = système). */
  authorId?: string;
  /** Référence de l'acte d'origine : "session:uuid", "mission:uuid"… (CU-07-01). */
  sourceRef?: string;
  /** Contenu structuré — jamais relayé dans l'audit ni les notifications (RM-04-03/RM-14-03). */
  payload: Record<string, unknown>;
  /** Correction d'une entrée précédente (RM-07-02) — même Carnet, même type. */
  supersedesId?: string;
}

@Injectable()
export class HealthRecordWriterService {
  constructor(private readonly outbox: OutboxService) {}

  /** Ajoute une entrée immuable au Carnet du propriétaire, dans la transaction appelante. */
  async appendEntry(tx: Prisma.TransactionClient, input: AppendEntryInput): Promise<{ entryId: string }> {
    const { record, notifyAccountId } = await this.resolveOrCreateRecord(tx, input);

    // RM-07-02 : une correction référence une entrée du MÊME Carnet et du MÊME type.
    if (input.supersedesId) {
      const target = await tx.healthRecordEntry.findUnique({ where: { id: input.supersedesId } });
      if (!target || !canSupersede({ recordId: target.recordId, type: target.type }, { recordId: record.id, type: input.type })) {
        throw new BadRequestException(
          "L'entrée remplacée doit exister, appartenir au même Carnet et être du même type (RM-07-02)",
        );
      }
    }

    // INSERTION SEULE (RM-07-02, EF-07-04) — l'historique ne se réécrit jamais.
    const entry = await tx.healthRecordEntry.create({
      data: {
        recordId: record.id,
        type: input.type,
        provenance: input.provenance,
        authorId: input.authorId ?? null,
        sourceRef: input.sourceRef ?? null,
        payload: input.payload as Prisma.InputJsonValue,
        supersedesId: input.supersedesId ?? null,
      },
    });

    // CU-07-03 (C4) : le patient propriétaire est notifié de toute nouvelle entrée —
    // SAUF ses notes personnelles (il vient de les écrire lui-même, aucun intérêt).
    // RM-14-03 : aucun contenu médical dans la demande — clé de modèle uniquement.
    if (input.type !== RecordEntryType.PERSONAL_NOTE && notifyAccountId) {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: notifyAccountId, template: "m07.entry.added" },
      });
    }

    return { entryId: entry.id };
  }

  /**
   * Résout le Carnet du propriétaire — et le CRÉE s'il manque (RM-07-01 : un propriétaire
   * = un Carnet, exactement ; l'upsert sur la clé unique absorbe les courses entre écrivains).
   * Retourne aussi le compte à notifier : le patient lui-même, ou le tuteur du sous-profil.
   */
  private async resolveOrCreateRecord(
    tx: Prisma.TransactionClient,
    input: AppendEntryInput,
  ): Promise<{ record: HealthRecord; notifyAccountId: string | null }> {
    const ownersGiven = Number(Boolean(input.ownerPatientId)) + Number(Boolean(input.ownerSubProfileId));
    if (ownersGiven !== 1) {
      throw new BadRequestException("Exactement un propriétaire requis : patient OU sous-profil (RM-07-01)");
    }

    if (input.ownerPatientId) {
      // Sécurité : on ne crée jamais un Carnet pour un compte inexistant ou non patient.
      const account = await tx.account.findUnique({ where: { id: input.ownerPatientId }, select: { id: true, type: true } });
      if (!account || account.type !== "PATIENT") {
        throw new BadRequestException("Propriétaire du Carnet introuvable ou non patient (RM-07-01)");
      }
      const record = await tx.healthRecord.upsert({
        where: { patientAccountId: input.ownerPatientId },
        create: { patientAccountId: input.ownerPatientId },
        update: {},
      });
      return { record, notifyAccountId: input.ownerPatientId };
    }

    const subProfileId = input.ownerSubProfileId as string;
    const subProfile = await tx.subProfile.findUnique({ where: { id: subProfileId } });
    if (!subProfile) {
      throw new BadRequestException("Sous-profil introuvable (EF-07-09)");
    }
    /*
      ── Après un transfert, l'écriture SUIT le Carnet (chantier 52, 06/09/2026) ────────────────

      Ce chemin refusait tout net : « écrivez via son compte patient ». C'était sans conséquence
      tant que **aucun client ne savait transférer un Carnet** — et le chantier 48 l'a rendu
      possible le 06/09. Le cas est devenu atteignable le jour même :

        1. un tuteur réserve une consultation POUR sa personne à charge — la session porte son
           `subProfileId` ;
        2. celle-ci atteint sa majorité et revendique son Carnet (CU-07-05) ;
        3. le professionnel dépose son compte-rendu → refusé.

      Ce que ce refus coûtait, et ce n'est pas une gêne d'écran : **le compte-rendu est obligatoire**
      (relances PM-30, puis « gains gelés » passé le délai), et **les gains ne sont crédités qu'au
      dépôt** (RM-06-04). Le professionnel n'aurait donc jamais été payé, et le patient n'aurait
      jamais reçu le compte-rendu de sa propre consultation.

      Suivre le transfert est aussi ce qui est JUSTE : `claim` ne recopie pas le Carnet, il en
      **change le propriétaire** (`patientAccountId` posé, `subProfileId` libéré). Écrire « via le
      sous-profil » après coup désigne donc le MÊME Carnet — il a seulement changé de nom. On le
      suit ; on n'en crée pas un second (RM-07-01).

      Le titulaire est notifié à la place du tuteur : c'est son Carnet, et le tuteur n'y a plus accès.
    */
    if (subProfile.status !== SubProfileStatus.DEPENDENT) {
      if (!subProfile.transferredToId) {
        // Transféré sans destinataire : incohérence de données, on ne devine pas de propriétaire.
        throw new BadRequestException(
          "Ce Carnet a été transféré sans titulaire identifiable — contactez le support (RM-07-06)",
        );
      }
      const record = await tx.healthRecord.upsert({
        where: { patientAccountId: subProfile.transferredToId },
        create: { patientAccountId: subProfile.transferredToId },
        update: {},
      });
      return { record, notifyAccountId: subProfile.transferredToId };
    }
    const record = await tx.healthRecord.upsert({
      where: { subProfileId },
      create: { subProfileId },
      update: {},
    });
    return { record, notifyAccountId: subProfile.guardianAccountId };
  }
}

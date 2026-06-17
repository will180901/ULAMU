/**
 * M07 — Carnet : la mémoire médicale à vie du patient (D-020).
 * Spec : docs/cahier_des_charges/02_modules/M07_carnet.md
 * Invariants : un propriétaire = un Carnet (RM-07-01) ; immutabilité totale (RM-07-02) ;
 * provenance toujours visible (RM-07-03) ; le patient voit tout (RM-07-04) ; sous-profil
 * accessible au seul tuteur jusqu'au transfert, puis plus du tout (RM-07-06).
 *
 * Frontières : l'accès professionnel en session relève de M06 (RM-07-05/RM-06-05) ;
 * les écritures C2 passent par HealthRecordWriterService ; la conservation après
 * clôture (EF-07-10, PM-31) est appliquée par M16 — rien n'est supprimé ici.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordEntryType, RecordProvenance, SubProfileStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { canonicalJson } from "../../common/crypto/hash-chain";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { M01Service } from "../m01-accounts/m01.service";
import { ClaimSubProfileDto, CreateSubProfileDto, DeclareEntryDto } from "./m07.dto";
import { declaredPayloadSizeOk, HealthSummary, isOwnerAdult, MAX_DECLARED_PAYLOAD_BYTES } from "./m07.policies";
import { FullRecordPage, HealthRecordReaderService, RecordOwner } from "./m07.reader.service";
import { HealthRecordWriterService } from "./m07.writer.service";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export interface SubProfileView {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  status: SubProfileStatus;
  createdAt: string;
}

@Injectable()
export class M07Service {
  private readonly logger = new Logger(M07Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly m01: M01Service,
    private readonly writer: HealthRecordWriterService,
    private readonly reader: HealthRecordReaderService,
  ) {}

  // ── EF-07-01 : création automatique du Carnet (consommation outbox, CU-01-01) ──
  // Handler IDEMPOTENT : l'outbox peut rejouer l'événement (ADR-11).

  async handlePatientCreated(payload: Record<string, unknown>): Promise<void> {
    const accountId = typeof payload["accountId"] === "string" ? payload["accountId"] : null;
    if (!accountId) {
      this.logger.error("m01.account.patient_created sans accountId — événement ignoré");
      return;
    }
    const existing = await this.prisma.healthRecord.findUnique({ where: { patientAccountId: accountId } });
    if (existing) return; // idempotent — un patient = un Carnet, exactement (RM-07-01)
    try {
      await this.prisma.$transaction(async (tx) => {
        const record = await tx.healthRecord.create({ data: { patientAccountId: accountId } });
        await this.audit.emit(tx, {
          actorType: "system",
          action: "m07.record.created",
          resource: `health_record:${record.id}`,
          context: { accountId },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) return; // course entre rejouages — Carnet déjà créé
      throw err; // erreur transitoire : l'outbox rejouera
    }
  }

  // ── Portée « me » : patient connecté ou sous-profil de SON foyer (RM-07-06) ──

  /**
   * Résout le propriétaire visé par une route « me » : le patient lui-même, ou —
   * avec subProfileId — une personne à charge dont il est le TUTEUR (EF-07-09).
   * 404 volontairement indistinct si le sous-profil n'existe pas ou n'est pas le sien
   * (anti-énumération) ; accès coupé après transfert (RM-07-06).
   */
  private async resolveScope(actor: AuthenticatedActor, subProfileId?: string): Promise<RecordOwner> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException(
        "Le Carnet n'est accessible qu'aux comptes patients — l'accès professionnel passe par la session (RM-07-05)",
      );
    }
    if (!subProfileId) return { patientId: actor.accountId };

    const subProfile = await this.prisma.subProfile.findUnique({ where: { id: subProfileId } });
    if (!subProfile || subProfile.guardianAccountId !== actor.accountId) {
      throw new NotFoundException("Sous-profil introuvable");
    }
    if (subProfile.status !== SubProfileStatus.DEPENDENT) {
      throw new ForbiddenException("Ce Carnet a été transféré à son titulaire — le tuteur n'y a plus accès (RM-07-06)");
    }
    return { subProfileId };
  }

  // ── EF-07-06 / CU-07-02 : déclarations patient ───────────────────────────────

  async declareEntry(
    actor: AuthenticatedActor,
    dto: DeclareEntryDto,
    subProfileId?: string,
  ): Promise<{ entryId: string }> {
    const owner = await this.resolveScope(actor, subProfileId);
    if (!declaredPayloadSizeOk(dto.payload)) {
      throw new BadRequestException(
        `Déclaration trop volumineuse : ${MAX_DECLARED_PAYLOAD_BYTES} octets maximum (le Carnet doit rester lisible hors ligne, ENF-02)`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      // Provenance DECLARED_BY_PATIENT : jamais présentée comme un diagnostic (RM-07-03) ;
      // prise en compte immédiate par le garde-fou M09 — on protège d'abord (CU-07-02).
      const { entryId } = await this.writer.appendEntry(tx, {
        ...(owner.patientId ? { ownerPatientId: owner.patientId } : {}),
        ...(owner.subProfileId ? { ownerSubProfileId: owner.subProfileId } : {}),
        type: dto.type as RecordEntryType,
        provenance: RecordProvenance.DECLARED_BY_PATIENT,
        authorId: actor.accountId,
        payload: dto.payload,
        ...(dto.supersedesId ? { supersedesId: dto.supersedesId } : {}),
      });
      // C5 dans la transaction — type et références seulement, JAMAIS le contenu (RM-04-03).
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m07.entry.declared",
        resource: `record_entry:${entryId}`,
        context: { type: dto.type, supersedesId: dto.supersedesId ?? null, subProfileId: subProfileId ?? null },
      });
      return { entryId };
    });
  }

  // ── EF-07-03/07 : lecture patient (RM-07-04 : il voit tout) ─────────────────

  async getMySummary(actor: AuthenticatedActor, subProfileId?: string): Promise<HealthSummary> {
    const owner = await this.resolveScope(actor, subProfileId);
    return this.reader.getSummary(owner);
  }

  async getMyRecord(
    actor: AuthenticatedActor,
    query: { type?: string; cursor?: string; limit?: number; subProfileId?: string },
  ): Promise<FullRecordPage> {
    const owner = await this.resolveScope(actor, query.subProfileId);
    return this.reader.getFullRecord(owner, {
      ...(query.type ? { type: query.type as RecordEntryType } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    });
  }

  // ── EF-07-08 : export (JSON + empreinte ; le PDF signé arrive avec l'UI) ─────

  /**
   * Export JSON complet du Carnet avec empreinte sha256 du contenu canonique
   * (canonicalJson — la même sérialisation que la chaîne d'audit EF-04-02) :
   * à contenu identique, empreinte identique — vérifiable hors plateforme (CU-07-06).
   * Dé-périmétrage assumé : le rendu PDF signé/filigrané viendra avec l'interface.
   * Chaque export est audité C5 (entité ExportCarnet absente du schéma Chantier 3 —
   * la trace EST le journal d'audit).
   */
  async exportMyRecord(
    actor: AuthenticatedActor,
    subProfileId?: string,
  ): Promise<{
    generatedAt: string;
    algorithm: string;
    fingerprint: string;
    content: Record<string, unknown>;
    signedPdf: null;
    note: string;
  }> {
    const owner = await this.resolveScope(actor, subProfileId);
    const full = await this.reader.getFullExport(owner);

    const content: Record<string, unknown> = {
      recordId: full.recordId,
      owner: { patientId: owner.patientId ?? null, subProfileId: owner.subProfileId ?? null },
      entries: full.entries,
    };
    // L'empreinte couvre le CONTENU (pas la date de génération) — stable et vérifiable.
    const fingerprint = createHash("sha256").update(canonicalJson(content), "utf8").digest("hex");
    const generatedAt = new Date().toISOString();

    // C5 : chaque export est tracé — métadonnées seulement, jamais le contenu (RM-04-03).
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m07.record.exported",
        resource: full.recordId ? `health_record:${full.recordId}` : `account:${actor.accountId}`,
        context: { entryCount: full.entries.length, fingerprint, subProfileId: subProfileId ?? null },
      });
    });

    return {
      generatedAt,
      algorithm: "sha256(canonicalJson)",
      fingerprint,
      content,
      signedPdf: null,
      note: "Export JSON avec empreinte vérifiable — le PDF signé et filigrané arrive avec l'interface (EF-07-08).",
    };
  }

  // ── EF-07-09 / D-033 : Carnet familial (CU-07-04) ────────────────────────────

  /** Crée la personne à charge ET son Carnet distinct, dans la même transaction (RM-07-01). */
  async createSubProfile(
    actor: AuthenticatedActor,
    dto: CreateSubProfileDto,
  ): Promise<{ subProfileId: string; healthRecordId: string }> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Seul un compte patient peut créer une personne à charge (EF-07-09)");
    }
    // CU-07-04 : « un patient majeur » — garanti par construction (PM-16 à l'inscription M01).
    const birth = new Date(dto.birthDate);
    if (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now()) {
      throw new BadRequestException("Date de naissance invalide : elle doit être passée");
    }
    return this.prisma.$transaction(async (tx) => {
      const subProfile = await tx.subProfile.create({
        data: {
          guardianAccountId: actor.accountId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: birth,
          sex: dto.sex,
        },
      });
      const record = await tx.healthRecord.create({ data: { subProfileId: subProfile.id } });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m07.subprofile.created",
        resource: `sub_profile:${subProfile.id}`,
        context: { healthRecordId: record.id },
      });
      return { subProfileId: subProfile.id, healthRecordId: record.id };
    });
  }

  /** Personnes à charge du tuteur — les transférées restent listées (statut), sans accès au Carnet. */
  async listSubProfiles(actor: AuthenticatedActor): Promise<SubProfileView[]> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Seul un compte patient gère des personnes à charge (EF-07-09)");
    }
    const rows = await this.prisma.subProfile.findMany({
      where: { guardianAccountId: actor.accountId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      birthDate: s.birthDate.toISOString(),
      sex: s.sex,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  // ── CU-07-05 : revendication du Carnet à la majorité (transfert OTP) ─────────

  /**
   * Étape 1 — lancée par le TUTEUR : envoie l'OTP « action sensible » sur SON téléphone
   * (M01). Il le communique au majeur qui revendique depuis son propre compte.
   */
  async startClaim(actor: AuthenticatedActor, subProfileId: string): Promise<{ intentId: string; expiresInSeconds: number }> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Seul le tuteur (compte patient) peut lancer le transfert (CU-07-05)");
    }
    const subProfile = await this.prisma.subProfile.findUnique({ where: { id: subProfileId } });
    if (!subProfile || subProfile.guardianAccountId !== actor.accountId) {
      throw new NotFoundException("Sous-profil introuvable"); // anti-énumération : seul le tuteur initie
    }
    if (subProfile.status !== SubProfileStatus.DEPENDENT) {
      throw new ConflictException("Ce Carnet a déjà été transféré");
    }
    const minYears = await this.params.getInt("PM-16");
    if (!isOwnerAdult(subProfile.birthDate, minYears, new Date())) {
      throw new BadRequestException(`Transfert possible à partir de ${minYears} ans (PM-16) — pas encore l'âge requis`);
    }
    // D-048 : intention PERSISTÉE liée à CE sous-profil (même motif que M02) — l'OTP « action
    // sensible » du tuteur ne pourra confirmer QUE ce transfert, pas une autre action sensible.
    const ttlSeconds = await this.params.getInt("PM-17");
    const intent = await this.prisma.subProfileClaimIntent.create({
      data: { subProfileId, guardianAccountId: actor.accountId, expiresAt: new Date(Date.now() + ttlSeconds * 1000) },
    });
    const otp = await this.m01.requestSensitiveActionOtp(actor.accountId); // OTP au tuteur (EF-07-09)
    return { intentId: intent.id, expiresInSeconds: otp.expiresInSeconds };
  }

  /**
   * Étape 2 — lancée par le MAJEUR depuis son compte patient : OTP du tuteur vérifié
   * DANS la transaction, transition DEPENDENT→TRANSFERRED conditionnelle (anti-TOCTOU,
   * D-046), bascule du propriétaire du Carnet (patientAccountId=revendiquant,
   * subProfileId libéré — UN seul propriétaire, RM-07-01), audit C5 et C4 aux deux.
   * RM-07-06 : le tuteur perd l'accès dès le commit.
   */
  async claim(
    actor: AuthenticatedActor,
    subProfileId: string,
    dto: ClaimSubProfileDto,
  ): Promise<{ subProfileId: string; healthRecordId: string }> {
    if (actor.accountType !== "PATIENT") {
      throw new ForbiddenException("Seul un compte patient peut revendiquer un Carnet (CU-07-05)");
    }
    const subProfile = await this.prisma.subProfile.findUnique({ where: { id: subProfileId } });
    if (!subProfile) throw new NotFoundException("Sous-profil introuvable");
    if (subProfile.status !== SubProfileStatus.DEPENDENT) {
      throw new ConflictException("Ce Carnet a déjà été transféré");
    }
    if (subProfile.guardianAccountId === actor.accountId) {
      throw new BadRequestException(
        "Le tuteur ne peut pas revendiquer pour lui-même — le majeur revendique depuis SON compte (CU-07-05)",
      );
    }
    const minYears = await this.params.getInt("PM-16");
    if (!isOwnerAdult(subProfile.birthDate, minYears, new Date())) {
      throw new ForbiddenException(`Transfert possible à partir de ${minYears} ans (PM-16) — pas encore l'âge requis`);
    }

    const healthRecordId = await this.prisma.$transaction(async (tx) => {
      // D-048 : l'intention (liée à CE sous-profil) est consommée conditionnellement — un OTP
      // « action sensible » du tuteur ne suffit plus seul ; il faut une intention de claim valide.
      const intent = await tx.subProfileClaimIntent.findFirst({
        where: {
          id: dto.intentId,
          subProfileId,
          guardianAccountId: subProfile.guardianAccountId,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!intent) {
        throw new ConflictException("Aucun transfert en cours pour ce Carnet — le tuteur doit d'abord le lancer (CU-07-05)");
      }
      const consumed = await tx.subProfileClaimIntent.updateMany({
        where: { id: intent.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new ConflictException("Ce transfert a déjà été confirmé");
      // Confirmation par OTP du TUTEUR (EF-07-09) — consommé dans la transaction : si la
      // suite échoue, tout est annulé, le code reste réutilisable jusqu'à expiration (PM-17).
      await this.m01.verifySensitiveActionOtp(tx, subProfile.guardianAccountId, dto.otpCode);

      // Transition conditionnelle DEPENDENT→TRANSFERRED : un seul gagnant en cas de course (D-046).
      const transition = await tx.subProfile.updateMany({
        where: { id: subProfileId, status: SubProfileStatus.DEPENDENT },
        data: { status: SubProfileStatus.TRANSFERRED, transferredToId: actor.accountId },
      });
      if (transition.count === 0) throw new ConflictException("Ce Carnet a déjà été transféré");

      // RM-07-01 : un patient = UN Carnet. Le Carnet créé vide à l'inscription (EF-07-01)
      // cède sa place au Carnet transféré ; s'il a déjà été alimenté, on ne fusionne pas
      // automatiquement deux mémoires médicales → procédure support (M16, cas sensible CU-07-05).
      const existing = await tx.healthRecord.findUnique({
        where: { patientAccountId: actor.accountId },
        include: { _count: { select: { entries: true } } },
      });
      if (existing) {
        if (existing._count.entries > 0) {
          throw new ConflictException(
            "Votre compte possède déjà un Carnet alimenté — transfert impossible ici, contactez le support (RM-07-01)",
          );
        }
        await tx.healthRecord.delete({ where: { id: existing.id } }); // coquille vide de l'inscription
      }

      // Bascule du propriétaire : patientAccountId = revendiquant, subProfileId libéré —
      // un Carnet n'a qu'UN propriétaire (RM-07-01) ; l'historique est intact (RM-07-02).
      const moved = await tx.healthRecord.updateMany({
        where: { subProfileId },
        data: { patientAccountId: actor.accountId, subProfileId: null },
      });
      let recordId: string;
      if (moved.count === 1) {
        recordId = (await tx.healthRecord.findUniqueOrThrow({ where: { patientAccountId: actor.accountId } })).id;
      } else {
        // Réparation : sous-profil sans Carnet (ne devrait pas arriver — créé en EF-07-09).
        recordId = (await tx.healthRecord.create({ data: { patientAccountId: actor.accountId } })).id;
      }

      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m07.record.claimed",
        resource: `sub_profile:${subProfileId}`,
        context: { healthRecordId: recordId, guardianAccountId: subProfile.guardianAccountId },
      });
      // C4 aux DEUX parties (CU-07-05) — aucun contenu médical (RM-14-03).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: actor.accountId, template: "m07.record.transferred.to" },
      });
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: subProfile.guardianAccountId, template: "m07.record.transferred.from" },
      });
      return recordId;
    });

    return { subProfileId, healthRecordId };
  }
}

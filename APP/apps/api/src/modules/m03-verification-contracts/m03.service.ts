/**
 * M03 — Vérification & Contrats.
 * Spec : docs/cahier_des_charges/02_modules/M03_verification_contrats.md
 * Invariants : badge + contrat signé = condition absolue de pratique (RM-03-01) ;
 * décisions motivées et en insertion seule (RM-03-02) ; documents jamais publics (RM-03-03) ;
 * la révocation n'efface rien (RM-03-04) ; une version signée est immuable (RM-03-05).
 *
 * HORS PÉRIMÈTRE CHANTIER 1 (assumé, revue D-046) : EF-03-09 — expiration des pièces
 * (alerte avant échéance, délai de grâce, suspension du badge ; exige l'état SUSPENDED
 * dans l'enum VerificationStatus + un paramètre PM de grâce) → planifié avec M16.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma, VerificationStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { M01Service } from "../m01-accounts/m01.service";
import { AddDocumentDto, DecideDto, SignAgreementDto } from "./m03.dto";
import {
  buildAgreementText,
  canAddDocuments,
  canPracticeEffective,
  canTransition,
  isOverdue,
  missingRequiredDocs,
  requiredDocsSatisfied,
  SubjectKind,
  VerificationStatusCode,
} from "./m03.policies";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Acteur minimal côté service — découplé de la couche HTTP. */
interface ActorRef {
  accountId: string;
  accountType: string;
}

function auditActorType(accountType: string): "patient" | "professional" | "facility_member" | "admin" | "system" {
  switch (accountType) {
    case "PATIENT":
      return "patient";
    case "PROFESSIONAL":
      return "professional";
    case "FACILITY_MEMBER":
      return "facility_member";
    case "ADMIN":
      return "admin";
    default:
      return "system";
  }
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const CASE_INCLUDE = {
  documents: true,
  decisions: true,
  agreement: { include: { versions: true } },
  professional: true,
  facility: true,
} as const;

type CaseFull = Prisma.VerificationCaseGetPayload<{ include: typeof CASE_INCLUDE }>;
type AgreementVersionRow = NonNullable<CaseFull["agreement"]>["versions"][number];

@Injectable()
export class M03Service {
  private readonly logger = new Logger(M03Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly m01: M01Service,
  ) {}

  // ── Ouverture automatique des dossiers (consommation outbox, spec §7) ──────
  // Handlers IDEMPOTENTS : l'outbox peut rejouer un événement (ADR-11).

  /** « Compte professionnel créé » (M01, CU-01-02) → dossier DRAFT (EF-03-01). */
  async handleProfessionalCreated(payload: Record<string, unknown>): Promise<void> {
    const accountId = typeof payload["accountId"] === "string" ? payload["accountId"] : null;
    if (!accountId) {
      this.logger.error("m01.account.professional_created sans accountId — événement ignoré");
      return;
    }
    const existing = await this.prisma.verificationCase.findUnique({ where: { professionalId: accountId } });
    if (existing) return; // idempotent — un seul dossier par professionnel
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.verificationCase.create({ data: { professionalId: accountId } }); // statut DRAFT par défaut
        await this.audit.emit(tx, { actorType: "system", action: "m03.case.opened", resource: `professional:${accountId}` });
      });
    } catch (err) {
      if (isUniqueViolation(err)) return; // course entre rejouages — dossier déjà ouvert
      throw err; // erreur transitoire : l'outbox rejouera
    }
  }

  /** « Espace structure créé » (M02) → dossier DRAFT (EF-03-02). */
  async handleFacilityCreated(payload: Record<string, unknown>): Promise<void> {
    const facilityId = typeof payload["facilityId"] === "string" ? payload["facilityId"] : null;
    if (!facilityId) {
      this.logger.error("m02.facility.created sans facilityId — événement ignoré");
      return;
    }
    const existing = await this.prisma.verificationCase.findUnique({ where: { facilityId } });
    if (existing) return; // idempotent — un seul dossier par structure
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.verificationCase.create({ data: { facilityId } });
        await this.audit.emit(tx, { actorType: "system", action: "m03.case.opened", resource: `facility:${facilityId}` });
      });
    } catch (err) {
      if (isUniqueViolation(err)) return;
      throw err;
    }
  }

  /** Transfert de titularité (EF-02-06 / CU-02-05) → revalidation : retour en examen, décision système consignée. */
  async handleCaseRecheck(payload: Record<string, unknown>): Promise<void> {
    const facilityId = typeof payload["facilityId"] === "string" ? payload["facilityId"] : null;
    if (!facilityId) {
      this.logger.error("m03.case.recheck sans facilityId — événement ignoré");
      return;
    }
    const existing = await this.prisma.verificationCase.findUnique({ where: { facilityId } });
    if (!existing) {
      this.logger.error(`m03.case.recheck : aucun dossier pour facility:${facilityId} — événement ignoré`);
      return;
    }
    if (existing.status === "IN_REVIEW") return; // idempotent — rejouage du même événement
    if (!canTransition(existing.status, "IN_REVIEW")) {
      this.logger.warn(`m03.case.recheck ignoré : transition ${existing.status} → IN_REVIEW interdite (machine d'états)`);
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle (anti-TOCTOU) — seule la transition depuis l'état lu gagne.
      const moved = await tx.verificationCase.updateMany({
        where: { id: existing.id, status: existing.status },
        data: { status: "IN_REVIEW" },
      });
      if (moved.count !== 1) return; // un autre traitement a déjà déplacé le dossier — rejouage sans effet
      // La revalidation système est tracée en audit C5 uniquement — pas de VerificationDecision :
      // RM-03-02 réserve les décisions à un admin nommé (revue D-046).
      await this.outbox.emit(tx, {
        type: "m03.status.changed",
        payload: { subject: `facility:${facilityId}`, status: "IN_REVIEW", caseId: existing.id },
      });
      await this.audit.emit(tx, {
        actorType: "system",
        action: "m03.case.recheck",
        resource: `case:${existing.id}`,
        context: { facilityId, reason: "Transfert de titularité — revalidation requise (EF-02-06)" },
      });
    });
  }

  // ── Côté déposant (EF-03-01/02, CU-03-01) ──────────────────────────────────

  /** Téléverse une pièce — uniquement quand le dossier est entre les mains du déposant. */
  async addDocument(
    actor: ActorRef,
    dto: AddDocumentDto,
    facilityId?: string,
  ): Promise<{ documentId: string; kind: string; expiresAt: Date | null; createdAt: Date }> {
    const c = await this.resolveOwnCase(actor.accountId, facilityId);
    if (!canAddDocuments(c.status)) {
      throw new ConflictException(
        "Pièces modifiables uniquement quand le dossier est « à compléter », « complément demandé » ou « refusé » (EF-03-01/04)",
      );
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.supportingDocument.create({
        data: { caseId: c.id, kind: dto.kind, fileKey: dto.fileKey, expiresAt },
      });
      // RM-03-03 : jamais le contenu ni la clé du fichier dans l'audit — seulement le type de pièce.
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: auditActorType(actor.accountType),
        action: "m03.document.added",
        resource: `case:${c.id}`,
        context: { kind: dto.kind },
      });
      return { documentId: doc.id, kind: doc.kind, expiresAt: doc.expiresAt, createdAt: doc.createdAt };
    });
  }

  /** Dépose le dossier : jeu minimal exigé, puis DRAFT/NEEDS_INFO/REJECTED → SUBMITTED (CU-03-01, EF-03-04). */
  async submit(actor: ActorRef, facilityId?: string): Promise<{ caseId: string; status: VerificationStatus; announcedDelayHours: number }> {
    const c = await this.resolveOwnCase(actor.accountId, facilityId);
    const subject = this.subjectOf(c);
    if (!canTransition(c.status, "SUBMITTED")) {
      throw new ConflictException(`Dépôt impossible depuis l'état ${c.status} (machine d'états M03)`);
    }
    const providedKinds = c.documents.map((d) => d.kind);
    if (!requiredDocsSatisfied(subject.kind, providedKinds)) {
      const missing = missingRequiredDocs(subject.kind, providedKinds).join(", ");
      throw new BadRequestException(`Pièces obligatoires manquantes : ${missing} (EF-03-01/02)`);
    }
    // CU-03-01 : accusé de dépôt avec délai annoncé (PM-11).
    const announcedDelayHours = await this.params.getInt("PM-11");
    await this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle (anti-TOCTOU) : seule la transition depuis l'état lu gagne.
      const moved = await tx.verificationCase.updateMany({
        where: { id: c.id, status: c.status },
        data: { status: "SUBMITTED" },
      });
      if (moved.count !== 1) throw new ConflictException("Le dossier a changé d'état entre-temps — rechargez puis réessayez");
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: auditActorType(actor.accountType),
        action: "m03.case.submitted",
        resource: `case:${c.id}`,
        context: { subject: subject.ref },
      });
      // CU-03-01 : accusé de réception au déposant (C4).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: actor.accountId, template: "m03.case.submitted", caseId: c.id, announcedDelayHours },
      });
    });
    return { caseId: c.id, status: "SUBMITTED", announcedDelayHours };
  }

  /** Vue du déposant : statut, pièces, décisions motivées (CU-03-02) et contrat (intégrité revérifiée). */
  async getMine(accountId: string, facilityId?: string): Promise<{
    caseId: string;
    subjectKind: SubjectKind;
    status: VerificationStatus;
    canPractice: boolean;
    documents: Array<{ id: string; kind: string; fileKey: string; expiresAt: Date | null; createdAt: Date }>;
    decisions: Array<{ id: string; decision: string; reasons: string; decidedAt: Date }>;
    agreement: {
      version: number;
      commissionPct: number;
      bodyHash: string;
      body: string | null;
      integrity: boolean;
      signedAt: Date | null;
      effectiveAt: Date | null;
    } | null;
  }> {
    const c = await this.resolveOwnCase(accountId, facilityId);
    const subject = this.subjectOf(c);
    const latest = this.latestVersion(c);
    // Le texte est régénéré par la fonction déterministe ; son empreinte est RECOMPARÉE au sceau —
    // toute divergence (ex. renommage du sujet) est signalée, jamais servie comme conforme (CU-03-03).
    let agreement: {
      version: number;
      commissionPct: number;
      bodyHash: string;
      body: string | null;
      integrity: boolean;
      signedAt: Date | null;
      effectiveAt: Date | null;
    } | null = null;
    if (latest) {
      const regenerated = buildAgreementText(subject.name, latest.commissionPct, latest.version);
      const integrity = sha256(regenerated) === latest.bodyHash;
      agreement = {
        version: latest.version,
        commissionPct: latest.commissionPct,
        bodyHash: latest.bodyHash,
        body: integrity ? regenerated : null,
        integrity,
        signedAt: latest.signedAt,
        effectiveAt: latest.effectiveAt,
      };
    }
    return {
      caseId: c.id,
      subjectKind: subject.kind,
      status: c.status,
      canPractice: canPracticeEffective(c.status, latest?.signedAt != null),
      documents: [...c.documents]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((d) => ({ id: d.id, kind: d.kind, fileKey: d.fileKey, expiresAt: d.expiresAt, createdAt: d.createdAt })),
      // CU-03-02 : motifs précis visibles par le déposant ; l'admin signataire reste interne (RM-03-02).
      decisions: [...c.decisions]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((d) => ({ id: d.id, decision: d.decision, reasons: d.reasons, decidedAt: d.createdAt })),
      agreement,
    };
  }

  // ── Côté admin (EF-03-03/04, CU-03-02) ─────────────────────────────────────

  /** File de traitement : tri par ancienneté, dépassement 2×PM-11 signalé (EF-03-03, spec §8). */
  async queue(statusFilter?: VerificationStatusCode): Promise<{
    targetHours: number;
    overdueAfterHours: number;
    items: Array<{
      caseId: string;
      subjectKind: SubjectKind;
      subject: string;
      subjectName: string;
      status: VerificationStatus;
      waitingSince: Date;
      documentCount: number;
      overdueTarget: boolean;
      overdue: boolean;
    }>;
  }> {
    const targetHours = await this.params.getInt("PM-11");
    const where: Prisma.VerificationCaseWhereInput = statusFilter
      ? { status: statusFilter }
      : { status: { in: ["SUBMITTED", "IN_REVIEW"] } }; // charge de travail active par défaut
    const cases = await this.prisma.verificationCase.findMany({
      where,
      orderBy: { updatedAt: "asc" }, // ancienneté = entrée dans le statut courant
      include: CASE_INCLUDE,
    });
    const now = Date.now();
    return {
      targetHours,
      overdueAfterHours: 2 * targetHours, // spec §8 : alerte au-delà de 2× PM-11
      items: cases.map((c) => {
        const subject = this.subjectOf(c);
        const ageMs = now - c.updatedAt.getTime();
        return {
          caseId: c.id,
          subjectKind: subject.kind,
          subject: subject.ref,
          subjectName: subject.name,
          status: c.status,
          waitingSince: c.updatedAt,
          documentCount: c.documents.length,
          // EF-03-03 : deux seuils distincts — délai cible dépassé (1×PM-11) et escalade (2×PM-11, spec §8).
          overdueTarget: ageMs > targetHours * 3_600_000,
          overdue: isOverdue(c.updatedAt.getTime(), targetHours, now),
        };
      }),
    };
  }

  /** Prise en examen (CU-03-02) : SUBMITTED → IN_REVIEW. */
  async claim(adminId: string, caseId: string): Promise<{ caseId: string; status: VerificationStatus }> {
    const c = await this.requireCase(caseId);
    // VERIFIED → IN_REVIEW existe dans la machine d'états mais est réservé à la revalidation système (EF-02-06).
    if (c.status !== "SUBMITTED" || !canTransition(c.status, "IN_REVIEW")) {
      throw new ConflictException(`Prise en examen impossible depuis l'état ${c.status} (CU-03-02)`);
    }
    await this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle (anti-TOCTOU) : deux admins ne « prennent » pas le même dossier.
      const moved = await tx.verificationCase.updateMany({
        where: { id: c.id, status: "SUBMITTED" },
        data: { status: "IN_REVIEW" },
      });
      if (moved.count !== 1) throw new ConflictException("Ce dossier vient d'être pris en examen par un autre admin");
      await this.audit.emit(tx, { actorId: adminId, actorType: "admin", action: "m03.case.claimed", resource: `case:${c.id}` });
    });
    return { caseId: c.id, status: "IN_REVIEW" };
  }

  /** Décision motivée (EF-03-04, RM-03-02) ; si VERIFIED : génération du contrat (EF-03-06). */
  async decide(adminId: string, caseId: string, dto: DecideDto): Promise<{ caseId: string; status: VerificationStatus }> {
    const c = await this.requireCase(caseId);
    const target: VerificationStatusCode = dto.decision;
    if (!canTransition(c.status, target)) {
      throw new ConflictException(`Transition ${c.status} → ${target} interdite — prenez d'abord le dossier en examen (CU-03-02)`);
    }
    const subject = this.subjectOf(c);
    // PM-01 lu au moment de la génération — jamais de taux en dur.
    const commissionPct = target === "VERIFIED" ? await this.params.getInt("PM-01") : null;

    return this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle (anti-TOCTOU) : deux décisions concurrentes ne passent pas.
      const moved = await tx.verificationCase.updateMany({
        where: { id: c.id, status: c.status },
        data: { status: target },
      });
      if (moved.count !== 1) throw new ConflictException("Le dossier a déjà été décidé par un autre admin — rechargez la file");
      // RM-03-02 : décision motivée, horodatée, attribuée à un admin nommé — insertion seule.
      await tx.verificationDecision.create({
        data: { caseId: c.id, decision: dto.decision, reasons: dto.reasons, adminId },
      });

      if (target === "VERIFIED" && commissionPct !== null) {
        await this.issueAgreementVersion(tx, c.id, subject.name, commissionPct);
      }

      // C6 : cascade du statut vers M02, M05, M06, M11, M12.
      await this.outbox.emit(tx, {
        type: "m03.status.changed",
        payload: { subject: subject.ref, status: target, caseId: c.id },
      });
      // CU-03-02 : le déposant est notifié de la décision (C4).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: await this.recipientAccountId(c), template: "m03.case.decided", caseId: c.id, decision: dto.decision },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m03.case.decided",
        resource: `case:${c.id}`,
        context: { decision: dto.decision, reasons: dto.reasons, subject: subject.ref },
      });
      return { caseId: c.id, status: target };
    });
  }

  /** Révocation du badge (EF-03-08, CU-03-05) — effet immédiat, rien n'est effacé (RM-03-04). */
  async revoke(adminId: string, caseId: string, reasons: string): Promise<{ caseId: string; status: VerificationStatus }> {
    const c = await this.requireCase(caseId);
    if (!canTransition(c.status, "REVOKED")) {
      throw new ConflictException(`Seul un dossier vérifié peut être révoqué — état actuel : ${c.status} (EF-03-08)`);
    }
    const subject = this.subjectOf(c);
    return this.prisma.$transaction(async (tx) => {
      // Écriture conditionnelle (anti-TOCTOU).
      const moved = await tx.verificationCase.updateMany({
        where: { id: c.id, status: c.status },
        data: { status: "REVOKED" },
      });
      if (moved.count !== 1) throw new ConflictException("Le dossier a changé d'état entre-temps — rechargez puis réessayez");
      await tx.verificationDecision.create({
        data: { caseId: c.id, decision: "REVOKED", reasons, adminId },
      });
      // C6 : cascade < 1 min — retiré de l'annuaire, plus aucune nouvelle poignée de main (CU-03-05).
      await this.outbox.emit(tx, {
        type: "m03.status.changed",
        payload: { subject: subject.ref, status: "REVOKED", caseId: c.id },
      });
      // CU-03-05 : notification au sujet révoqué (C4).
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: await this.recipientAccountId(c), template: "m03.case.revoked", caseId: c.id },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m03.case.revoked",
        resource: `case:${c.id}`,
        context: { reasons, subject: subject.ref },
      });
      return { caseId: c.id, status: "REVOKED" };
    });
  }

  /**
   * Avenant (EF-03-07, CU-03-04, D-022) : nouvelle version du contrat au taux PM-01 courant,
   * à re-signer par le sujet — préavis notifié (C4). Déclenché par l'admin après un changement
   * de conditions. Idempotent si une version non signée au même taux attend déjà.
   */
  async reissueAgreement(adminId: string, caseId: string): Promise<{ caseId: string; reissued: boolean }> {
    const c = await this.requireCase(caseId);
    if (c.status !== "VERIFIED") {
      throw new ConflictException("Un avenant ne s'émet que pour un dossier vérifié (EF-03-07)");
    }
    const subject = this.subjectOf(c);
    const commissionPct = await this.params.getInt("PM-01");
    const before = this.latestVersion(c);
    await this.prisma.$transaction(async (tx) => {
      await this.issueAgreementVersion(tx, c.id, subject.name, commissionPct);
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: await this.recipientAccountId(c), template: "m03.agreement.reissued", caseId: c.id, commissionPct },
      });
      await this.audit.emit(tx, {
        actorId: adminId,
        actorType: "admin",
        action: "m03.agreement.reissued",
        resource: `case:${c.id}`,
        context: { commissionPct, previousVersion: before?.version ?? null },
      });
    });
    const after = this.latestVersion(await this.requireCase(caseId));
    return { caseId: c.id, reissued: (after?.version ?? 0) !== (before?.version ?? 0) };
  }

  // ── Signature du contrat (EF-03-06, CU-03-03) ──────────────────────────────

  /** Démarre la signature : OTP « action sensible » sur le téléphone du signataire. */
  async signStart(accountId: string, facilityId?: string): Promise<{ expiresInSeconds: number }> {
    const c = await this.resolveOwnCase(accountId, facilityId);
    this.requireSignableVersion(c);
    return this.m01.requestSensitiveActionOtp(accountId);
  }

  /** Signature électronique : mot de passe + OTP → version scellée (CU-03-03, RM-03-05). */
  async sign(actor: ActorRef, dto: SignAgreementDto, facilityId?: string): Promise<{
    caseId: string;
    version: number;
    signedAt: Date;
    effectiveAt: Date;
    canPractice: boolean;
  }> {
    const c = await this.resolveOwnCase(actor.accountId, facilityId);
    const subject = this.subjectOf(c);
    const version = this.requireSignableVersion(c);
    if (!(await this.m01.verifyAccountPassword(actor.accountId, dto.password))) {
      throw new UnauthorizedException("Mot de passe incorrect");
    }
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await this.m01.verifySensitiveActionOtp(tx, actor.accountId, dto.otpCode);
      // RM-03-05 : une version signée est immuable — écriture conditionnelle contre les doubles signatures.
      const sealed = await tx.agreementVersion.updateMany({
        where: { id: version.id, signedAt: null },
        data: { signedAt: now, signedBy: actor.accountId, effectiveAt: now },
      });
      if (sealed.count !== 1) {
        throw new ConflictException("La version courante du contrat est déjà signée (RM-03-05)");
      }
      // C6 : badge + contrat signé ⇒ le sujet peut désormais exercer (RM-03-01).
      await this.outbox.emit(tx, {
        type: "m03.status.changed",
        payload: { subject: subject.ref, status: c.status, caseId: c.id },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: auditActorType(actor.accountType),
        action: "m03.agreement.signed",
        resource: `case:${c.id}`,
        context: { version: version.version, bodyHash: version.bodyHash },
      });
      return { caseId: c.id, version: version.version, signedAt: now, effectiveAt: now, canPractice: true };
    });
  }

  // ── Aides internes ─────────────────────────────────────────────────────────

  /**
   * « Me » : par défaut, le dossier de la structure dont l'acteur est TITULAIRE (OWNER, M02),
   * sinon son dossier professionnel. `facilityId` cible explicitement une structure —
   * un titulaire de plusieurs dossiers (revue D-046) garde ainsi accès à chacun.
   */
  private async resolveOwnCase(accountId: string, facilityId?: string): Promise<CaseFull> {
    let where: Prisma.VerificationCaseWhereUniqueInput;
    if (facilityId) {
      const ownership = await this.prisma.facilityMember.findFirst({
        where: { accountId, facilityId, role: "OWNER", active: true },
      });
      if (!ownership) throw new NotFoundException("Vous n'êtes pas titulaire de cette structure (EF-02-05)");
      where = { facilityId };
    } else {
      const ownership = await this.prisma.facilityMember.findFirst({
        where: { accountId, role: "OWNER", active: true },
        orderBy: { createdAt: "asc" },
      });
      where = ownership ? { facilityId: ownership.facilityId } : { professionalId: accountId };
    }
    const c = await this.prisma.verificationCase.findUnique({ where, include: CASE_INCLUDE });
    if (!c) throw new NotFoundException("Aucun dossier de vérification ouvert pour ce compte");
    return c;
  }

  /** Destinataire des notifications du dossier : le professionnel, ou le titulaire actif de la structure. */
  private async recipientAccountId(c: CaseFull): Promise<string | null> {
    if (c.professionalId) return c.professionalId;
    if (c.facilityId) {
      const owner = await this.prisma.facilityMember.findFirst({
        where: { facilityId: c.facilityId, role: "OWNER", active: true },
      });
      return owner?.accountId ?? null;
    }
    return null;
  }

  private async requireCase(caseId: string): Promise<CaseFull> {
    const c = await this.prisma.verificationCase.findUnique({ where: { id: caseId }, include: CASE_INCLUDE });
    if (!c) throw new NotFoundException("Dossier de vérification introuvable");
    return c;
  }

  private subjectOf(c: CaseFull): { kind: SubjectKind; ref: string; name: string } {
    if (c.facilityId && c.facility) {
      return { kind: "FACILITY", ref: `facility:${c.facilityId}`, name: c.facility.name };
    }
    if (c.professionalId && c.professional) {
      return {
        kind: "PROFESSIONAL",
        ref: `professional:${c.professionalId}`,
        name: `${c.professional.firstName} ${c.professional.lastName}`,
      };
    }
    throw new Error(`Dossier ${c.id} sans sujet — données incohérentes`);
  }

  /** Version courante = numéro le plus élevé (toutes les versions sont conservées à vie, RM-03-05). */
  private latestVersion(c: CaseFull): AgreementVersionRow | null {
    if (!c.agreement) return null;
    return [...c.agreement.versions].sort((a, b) => b.version - a.version).at(0) ?? null;
  }

  /** Le contrat est signable : dossier VERIFIED + version courante non signée (EF-03-06). */
  private requireSignableVersion(c: CaseFull): AgreementVersionRow {
    if (c.status !== "VERIFIED") {
      throw new ConflictException("Le contrat ne se signe qu'après vérification positive du dossier (EF-03-06)");
    }
    const latest = this.latestVersion(c);
    if (!latest) throw new NotFoundException("Aucun contrat généré pour ce dossier — contactez le support");
    if (latest.signedAt) throw new ConflictException("La version courante du contrat est déjà signée (RM-03-05)");
    return latest;
  }

  /**
   * Génère la version de contrat après vérification positive (EF-03-06) :
   * v1 à la première vérification ; version suivante si le contrat existe déjà
   * (re-vérification après revalidation EF-02-06) — l'historique est conservé à vie (RM-03-05).
   */
  private async issueAgreementVersion(
    tx: Prisma.TransactionClient,
    caseId: string,
    signerName: string,
    commissionPct: number,
  ): Promise<void> {
    const agreement = await tx.digitalAgreement.upsert({ where: { caseId }, update: {}, create: { caseId } });
    const last = (
      await tx.agreementVersion.findMany({ where: { agreementId: agreement.id }, orderBy: { version: "desc" }, take: 1 })
    ).at(0);
    // Une version non signée au taux courant attend déjà sa signature → rien à régénérer (idempotence).
    if (last && last.signedAt === null && last.commissionPct === commissionPct) return;
    const version = (last?.version ?? 0) + 1;
    const body = buildAgreementText(signerName, commissionPct, version);
    await tx.agreementVersion.create({
      data: { agreementId: agreement.id, version, commissionPct, bodyHash: sha256(body) },
    });
  }
}

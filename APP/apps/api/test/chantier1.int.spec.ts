/**
 * Intégration Chantier 1 — flux inter-modules contre PostgreSQL réel :
 * M01 (comptes) → M02 (structure, invitation, transfert) → M03 (dossier, décision, contrat signé)
 * → M04 (chaîne d'audit, signalement). L'outbox (ADR-11) relie le tout — drainée explicitement.
 */
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { OutboxService } from "../src/common/outbox.service";
import { PrismaService } from "../src/common/prisma.service";
import { DevSmsGateway } from "../src/common/sms/sms.service";
import { DevEmailGateway, EMAIL_GATEWAY } from "../src/common/email/email.service";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { M02RolesStructuresModule } from "../src/modules/m02-roles-structures/m02.module";
import { M02Service } from "../src/modules/m02-roles-structures/m02.service";
import { M03VerificationContractsModule } from "../src/modules/m03-verification-contracts/m03.module";
import { M03Service } from "../src/modules/m03-verification-contracts/m03.service";
import { M04AuditReportsModule } from "../src/modules/m04-audit-reports/m04.module";
import { M04Service } from "../src/modules/m04-audit-reports/m04.service";
import { AuditChainService } from "../src/modules/m04-audit-reports/m04.audit-chain.service";

describe("Chantier 1 — intégration inter-modules (M01→M02→M03→M04)", () => {
  let prisma: PrismaService;
  let sms: DevSmsGateway;
  let mail: DevEmailGateway;
  let outbox: OutboxService;
  let m01: M01Service;
  let m02: M02Service;
  let m03: M03Service;
  let m04: M04Service;
  let chain: AuditChainService;
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;

  const OWNER_PHONE = "+242051000001";
  const MEMBER_PHONE = "+242051000002";
  const PATIENT_PHONE = "+242051000003";
  const ADMIN_ID = "admin-test";

  let ownerId = "";
  let memberId = "";
  let patientId = "";
  let facilityId = "";
  let caseId = "";

  const lastOtpFor = (phone: string): string => {
    const msg = [...sms.sent].reverse().find((m) => m.phone === phone && /\b\d{6}\b/.test(m.message));
    if (!msg) throw new Error(`Aucun OTP capturé pour ${phone}`);
    return (msg.message.match(/\b(\d{6})\b/) as RegExpMatchArray)[1] as string;
  };
  /** Email deterministe derive du telephone - Account.email est unique, chaque compte a donc le sien. */
  const emailFor = (phone: string): string => `u${phone.replace(/\D/g, "").slice(-9)}@exemple.test`;
  /** OTP d'inscription/reinitialisation, desormais envoye par email. `>(\d{6})<` cible le code seul :
   * le chercher n'importe ou dans le HTML attraperait la couleur #111112 du gabarit. */
  const lastEmailOtpFor = (phone: string): string => {
    const to = emailFor(phone);
    const msg = [...mail.sent].reverse().find((m) => m.to === to && />\d{6}</.test(m.html));
    if (!msg) throw new Error(`Aucun OTP email capture pour ${to}`);
    return (msg.html.match(/>(\d{6})</) as RegExpMatchArray)[1] as string;
  };

  const registerFacilityMember = async (phone: string, firstName: string) => {
    await m01.requestOtp({ email: emailFor(phone) }, "REGISTRATION");
    return m01.registerFacilityMember({
      phone,
      email: emailFor(phone),
      username: "u" + phone.replace(/\D/g, "").slice(-9),
      otpCode: lastEmailOtpFor(phone),
      password: "motdepasse1",
      firstName,
      lastName: "Test",
      client: "web",
    });
  };

  const drainAll = async (): Promise<void> => {
    // Le poller du module M04 draine aussi (verrou anti-concurrence dans OutboxService) :
    // on boucle jusqu'à ce que la file soit réellement vide, qui que soit le draineur.
    const deadline = Date.now() + 20_000;
    for (;;) {
      await outbox.drain(100);
      const pending = await prisma.outboxEvent.count({ where: { processedAt: null } });
      if (pending === 0) return;
      if (Date.now() > deadline) throw new Error(`Outbox non vidée : ${pending} événements en attente`);
      await new Promise((r) => setTimeout(r, 150));
    }
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CommonModule, M01AccountsModule, M02RolesStructuresModule, M03VerificationContractsModule, M04AuditReportsModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    sms = moduleRef.get(DevSmsGateway);
    mail = moduleRef.get(EMAIL_GATEWAY);
    outbox = moduleRef.get(OutboxService);
    m01 = moduleRef.get(M01Service);
    m02 = moduleRef.get(M02Service);
    m03 = moduleRef.get(M03Service);
    m04 = moduleRef.get(M04Service);
    chain = moduleRef.get(AuditChainService);

    // Nettoyage complet du périmètre Chantier 1 (ordre FK).
    await prisma.moderationDecision.deleteMany();
    await prisma.userReport.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.agreementVersion.deleteMany();
    await prisma.digitalAgreement.deleteMany();
    await prisma.verificationDecision.deleteMany();
    await prisma.supportingDocument.deleteMany();
    await prisma.verificationCase.deleteMany();
    await prisma.ownershipTransferIntent.deleteMany();
    await prisma.facilityInvitation.deleteMany();
    await prisma.facilityMember.deleteMany();
    await prisma.facility.deleteMany();
    await prisma.totpBackupCode.deleteMany();
    await prisma.totpSecret.deleteMany();
    await prisma.consentRecord.deleteMany();
    await prisma.loginSession.deleteMany();
    await prisma.loginAttempt.deleteMany();
    await prisma.otpCode.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.facilityMemberProfile.deleteMany();
    await prisma.patientProfile.deleteMany();
    await prisma.professionalProfile.deleteMany();
    await prisma.adminRoleAssignment.deleteMany();
    await prisma.account.deleteMany();
  }, 60000);

  afterAll(async () => {
    await moduleRef.close(); // arrête le poller M04 (onModuleDestroy)
    await prisma.$disconnect();
  });

  it("D-045 — un compte FACILITY_MEMBER crée sa pharmacie ; M03 ouvre le dossier via l'outbox", async () => {
    const owner = await registerFacilityMember(OWNER_PHONE, "Destin");
    ownerId = owner.accountId;

    const { facilityId: fid } = await m02.createFacility(ownerId, {
      type: "PHARMACY",
      name: "Pharmacie du Marché",
      district: "Poto-Poto",
      quarter: "Marché Total",
    });
    facilityId = fid;

    await drainAll();
    const c = await prisma.verificationCase.findUnique({ where: { facilityId } });
    expect(c?.status).toBe("DRAFT"); // EF-03-02 — ouvert automatiquement
    caseId = c!.id;
  });

  it("RM-02-06 — un PATIENT ne crée pas de structure", async () => {
    await m01.requestOtp({ email: emailFor(PATIENT_PHONE) }, "REGISTRATION");
    const patient = await m01.registerPatient({
      phone: PATIENT_PHONE, email: emailFor(PATIENT_PHONE),
      username: "u" + PATIENT_PHONE.replace(/\D/g, "").slice(-9),
      otpCode: lastEmailOtpFor(PATIENT_PHONE),
      password: "motdepasse1",
      firstName: "Mireille",
      lastName: "Nkounkou",
      birthDate: "1994-03-15",
      sex: "F",
      district: "Talangaï",
      client: "mobile",
    });
    patientId = patient.accountId;
    await expect(
      m02.createFacility(patientId, { type: "PHARMACY", name: "X", district: "Y", quarter: "Z" }),
    ).rejects.toThrow(/RM-02-06/);
  });

  it("D-029 — structure non vérifiée : aucune invitation possible", async () => {
    await expect(m02.inviteMember(ownerId, facilityId, { phone: MEMBER_PHONE, proposedRights: ["stock"] })).rejects.toThrow(
      /non vérifiée/,
    );
  });

  it("M03 — pièces, dépôt, décision VERIFIED, contrat signé (mot de passe + OTP)", async () => {
    const actor = { accountId: ownerId, accountType: "FACILITY_MEMBER" };
    await m03.addDocument(actor, { kind: "LICENSE", fileKey: "s3://k1" });
    await m03.addDocument(actor, { kind: "ID", fileKey: "s3://k2" });
    await m03.addDocument(actor, { kind: "ADDRESS_PROOF", fileKey: "s3://k3" });
    const submitted = await m03.submit(actor);
    expect(submitted.status).toBe("SUBMITTED");

    await m03.claim(ADMIN_ID, caseId);
    const decided = await m03.decide(ADMIN_ID, caseId, { decision: "VERIFIED", reasons: "Dossier conforme — licence vérifiée" });
    expect(decided.status).toBe("VERIFIED");

    // Contrat v1 généré (EF-03-06) au taux PM-01 — signature : mot de passe + OTP.
    let mine = await m03.getMine(ownerId);
    expect(mine.agreement?.version).toBe(1);
    expect(mine.agreement?.commissionPct).toBe(10);
    expect(mine.agreement?.integrity).toBe(true);
    expect(mine.canPractice).toBe(false); // vérifié mais pas encore signé (RM-03-01)

    await m03.signStart(ownerId);
    await m03.sign({ accountId: ownerId, accountType: "FACILITY_MEMBER" }, { password: "motdepasse1", otpCode: lastOtpFor(OWNER_PHONE) });
    mine = await m03.getMine(ownerId);
    expect(mine.canPractice).toBe(true); // badge + contrat signé (RM-03-01)
  });

  it("CU-02-02 — invitation acceptée par un compte FACILITY_MEMBER dédié", async () => {
    const invited = await m02.inviteMember(ownerId, facilityId, { phone: MEMBER_PHONE, proposedRights: ["stock", "dispense"] });

    // Le patient ne peut pas accepter une invitation qui ne lui est pas destinée (téléphone).
    await expect(m02.acceptInvitation(patientId, invited.invitationId)).rejects.toThrow(/autre numéro/);

    const member = await registerFacilityMember(MEMBER_PHONE, "Nadège");
    memberId = member.accountId;
    const accepted = await m02.acceptInvitation(memberId, invited.invitationId);
    expect(accepted.facilityId).toBe(facilityId);

    // Usage unique : une seconde acceptation échoue (RM-02-05 / écriture conditionnelle).
    await expect(m02.acceptInvitation(memberId, invited.invitationId)).rejects.toThrow(/déjà/);
  });

  it("EF-02-06 — transfert de titularité : intention persistée + OTP des deux parties", async () => {
    const membership = await prisma.facilityMember.findFirst({ where: { facilityId, accountId: memberId } });
    const { intentId } = await m02.startOwnershipTransfer(ownerId, facilityId, membership!.id);
    const ownerCode = lastOtpFor(OWNER_PHONE);
    const targetCode = lastOtpFor(MEMBER_PHONE);

    const result = await m02.confirmOwnershipTransfer(ownerId, facilityId, intentId, ownerCode, targetCode);
    expect(result.newOwnerMemberId).toBe(membership!.id);

    const roles = await prisma.facilityMember.findMany({ where: { facilityId }, orderBy: { createdAt: "asc" } });
    expect(roles.filter((r) => r.role === "OWNER")).toHaveLength(1); // RM-02-01
    expect(roles.find((r) => r.accountId === memberId)?.role).toBe("OWNER");

    // Revalidation M03 (m03.case.recheck) via l'outbox.
    await drainAll();
    const c = await prisma.verificationCase.findUnique({ where: { facilityId } });
    expect(c?.status).toBe("IN_REVIEW");
  });

  it("M04 — la chaîne d'audit est valide, puis toute altération est détectée", async () => {
    await drainAll();
    const count = await prisma.auditEvent.count();
    expect(count).toBeGreaterThan(10); // tous les actes sensibles ont été journalisés (C5)

    const before = await chain.verifyChain();
    expect(before.ok).toBe(true);
    expect(before.checked).toBe(count);

    // Altération directe en base (RM-04-01 violé volontairement) → rupture détectée.
    await prisma.$executeRawUnsafe(`UPDATE "AuditEvent" SET "action" = 'falsifié' WHERE "seq" = (SELECT MIN("seq") FROM "AuditEvent")`);
    const after = await chain.verifyChain();
    expect(after.ok).toBe(false);
    expect(after.brokenAtSeq).toBeDefined();
  });

  it("EF-04-05/06 — signalement d'une structure, décision WARNING notifiée au titulaire", async () => {
    const { reportId } = await m04.createReport(
      { accountId: patientId, accountType: "PATIENT", sessionId: "s", client: "mobile" },
      { targetType: "FACILITY", targetId: facilityId, reasonCode: "INAPPROPRIATE_BEHAVIOR", reasonText: "Test" },
    );
    const decided = await m04.decideReport(ADMIN_ID, reportId, { decision: "WARNING", reasons: "Avertissement de test" });
    expect(decided.status).toBe("ACTION_TAKEN");

    // Décision immuable : un second traitement échoue.
    await expect(m04.decideReport(ADMIN_ID, reportId, { decision: "DISMISSED", reasons: "x" })).rejects.toThrow(/déjà traité/);

    // Notifications émises : au signaleur (issue) ET au titulaire (avertissement).
    const notifications = await prisma.outboxEvent.findMany({ where: { type: "notify.request" } });
    const payloads = notifications.map((n) => JSON.stringify(n.payload));
    expect(payloads.some((p) => p.includes("m04.report.resolved"))).toBe(true);
    expect(payloads.some((p) => p.includes("m04.report.warning"))).toBe(true);
  });
});

/**
 * Intégration Chantier 3 — le PARCOURS 🅰 de bout en bout, contre PostgreSQL réel :
 * inscription → vérification M03 → offre + présence M05 → poignée de main M06 →
 * paiement MoMo M13 → session chronométrée → compte-rendu (→ Carnet M07 + capture des gains)
 * → notation. Plus l'invariant n°9 (D-008 : remboursement automatique si le pro ne répond pas)
 * et l'invariant n°1 (pas de paiement sans confirmation valide).
 */
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { DevAggregatorGateway } from "../src/common/momo/aggregator.gateway";
import { OutboxService } from "../src/common/outbox.service";
import { PrismaService } from "../src/common/prisma.service";
import { DevSmsGateway } from "../src/common/sms/sms.service";
import { DevEmailGateway, EMAIL_GATEWAY } from "../src/common/email/email.service";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { M03VerificationContractsModule } from "../src/modules/m03-verification-contracts/m03.module";
import { M03Service } from "../src/modules/m03-verification-contracts/m03.service";
import { M05DirectoryModule } from "../src/modules/m05-directory/m05.module";
import { OffersService } from "../src/modules/m05-directory/m05.offers.service";
import { PresenceService } from "../src/modules/m05-directory/m05.presence.service";
import { M06HandshakeSessionModule } from "../src/modules/m06-handshake-session/m06.module";
import { HandshakeService } from "../src/modules/m06-handshake-session/m06.handshake.service";
import { SessionService } from "../src/modules/m06-handshake-session/m06.session.service";
import { ReportService } from "../src/modules/m06-handshake-session/m06.report.service";
import { M07HealthRecordModule } from "../src/modules/m07-health-record/m07.module";
import { HealthRecordReaderService } from "../src/modules/m07-health-record/m07.reader.service";
import { M13PaymentsModule } from "../src/modules/m13-payments/m13.module";
import { PaymentsService } from "../src/modules/m13-payments/m13.payments.service";
import { M14NotificationsModule } from "../src/modules/m14-notifications/m14.module";

type Actor = { accountId: string; accountType: string; sessionId: string; client: string };

describe("Chantier 3 — parcours 🅰 complet (M01→M03→M05→M06→M07→M13→M14)", () => {
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;
  let prisma: PrismaService;
  let sms: DevSmsGateway;
  let mail: DevEmailGateway;
  let momo: DevAggregatorGateway;
  let outbox: OutboxService;
  let m01: M01Service;
  let m03: M03Service;
  let offers: OffersService;
  let presence: PresenceService;
  let handshakes: HandshakeService;
  let sessionsSvc: SessionService;
  let reports: ReportService;
  let reader: HealthRecordReaderService;
  let payments: PaymentsService;

  const DOCTOR = "+242069100001";
  const PATIENT = "+242069100002";
  const PATIENT2 = "+242069100003";
  let doctorId = "";
  let patientId = "";
  let patient2Id = "";
  let offerId = "";

  const lastOtp = (phone: string): string => {
    const m = [...sms.sent].reverse().find((s) => s.phone === phone && /\b\d{6}\b/.test(s.message));
    if (!m) throw new Error(`Aucun OTP pour ${phone}`);
    return (m.message.match(/\b(\d{6})\b/) as RegExpMatchArray)[1] as string;
  };
  /** Email deterministe derive du telephone - Account.email est unique, chaque compte a donc le sien. */
  const emailFor = (phone: string): string => `u${phone.replace(/\D/g, "").slice(-9)}@exemple.test`;
  /** OTP d'inscription/reinitialisation, desormais envoye par email. `>(\d{6})<` cible le code seul :
   * le chercher n'importe ou dans le HTML attraperait la couleur #111112 du gabarit. */
  const lastEmailOtp = (phone: string): string => {
    const to = emailFor(phone);
    const msg = [...mail.sent].reverse().find((m) => m.to === to && />\d{6}</.test(m.html));
    if (!msg) throw new Error(`Aucun OTP email capture pour ${to}`);
    return (msg.html.match(/>(\d{6})</) as RegExpMatchArray)[1] as string;
  };
  const drain = async (): Promise<void> => {
    const deadline = Date.now() + 15_000;
    for (;;) {
      await outbox.drain(100);
      const pending = await prisma.outboxEvent.count({ where: { processedAt: null } });
      if (pending === 0) return;
      if (Date.now() > deadline) throw new Error(`Outbox non vidée : ${pending}`);
      await new Promise((r) => setTimeout(r, 120));
    }
  };
  const actor = (accountId: string, accountType: string): Actor => ({ accountId, accountType, sessionId: "s", client: accountType === "PATIENT" ? "mobile" : "web" });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CommonModule,
        M01AccountsModule,
        M03VerificationContractsModule,
        M05DirectoryModule,
        M06HandshakeSessionModule,
        M07HealthRecordModule,
        M13PaymentsModule,
        M14NotificationsModule,
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    sms = moduleRef.get(DevSmsGateway);
    mail = moduleRef.get(EMAIL_GATEWAY);
    momo = moduleRef.get(DevAggregatorGateway);
    outbox = moduleRef.get(OutboxService);
    m01 = moduleRef.get(M01Service);
    m03 = moduleRef.get(M03Service);
    offers = moduleRef.get(OffersService);
    presence = moduleRef.get(PresenceService);
    handshakes = moduleRef.get(HandshakeService);
    sessionsSvc = moduleRef.get(SessionService);
    reports = moduleRef.get(ReportService);
    reader = moduleRef.get(HealthRecordReaderService);
    payments = moduleRef.get(PaymentsService);

    // Nettoyage complet (ordre FK).
    await prisma.$transaction([
      prisma.sessionRecordAccess.deleteMany(),
      prisma.sessionRating.deleteMany(),
      prisma.preConsultation.deleteMany(),
      prisma.sessionMessage.deleteMany(),
    ]);
    await prisma.careSession.deleteMany();
    await prisma.handshake.deleteMany();
    await prisma.healthRecordEntry.deleteMany();
    await prisma.healthRecord.deleteMany();
    await prisma.subProfileClaimIntent.deleteMany();
    await prisma.subProfile.deleteMany();
    await prisma.availabilityAlert.deleteMany();
    await prisma.professionalStats.deleteMany();
    await prisma.presenceStatus.deleteMany();
    await prisma.careOffer.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.earningsEntry.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.paymentSplit.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.earningsAccount.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.agreementVersion.deleteMany();
    await prisma.digitalAgreement.deleteMany();
    await prisma.verificationDecision.deleteMany();
    await prisma.supportingDocument.deleteMany();
    await prisma.verificationCase.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.outboxEvent.deleteMany();
    // Résidus possibles d'autres suites partageant la base (structures M02).
    await prisma.moderationDecision.deleteMany();
    await prisma.userReport.deleteMany();
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
    await prisma.patientProfile.deleteMany();
    await prisma.professionalProfile.deleteMany();
    await prisma.facilityMemberProfile.deleteMany();
    await prisma.adminRoleAssignment.deleteMany();
    await prisma.account.deleteMany();

    // Inscriptions.
    await m01.requestOtp({ email: emailFor(DOCTOR) }, "REGISTRATION");
    doctorId = (await m01.registerProfessional({
      phone: DOCTOR, email: emailFor(DOCTOR), username: "u" + DOCTOR.replace(/\D/g, "").slice(-9), otpCode: lastEmailOtp(DOCTOR), password: "motdepasse1",
      firstName: "Armel", lastName: "Konaté", category: "GENERAL_PRACTITIONER", acceptTerms: true, client: "web",
    })).accountId;
    await m01.requestOtp({ email: emailFor(PATIENT) }, "REGISTRATION");
    patientId = (await m01.registerPatient({
      phone: PATIENT, email: emailFor(PATIENT), username: "u" + PATIENT.replace(/\D/g, "").slice(-9), otpCode: lastEmailOtp(PATIENT), password: "motdepasse1",
      firstName: "Mireille", lastName: "Nkounkou", birthDate: "1994-03-15", sex: "F", district: "Talangaï", acceptTerms: true, client: "mobile",
    })).accountId;
    await m01.requestOtp({ email: emailFor(PATIENT2) }, "REGISTRATION");
    patient2Id = (await m01.registerPatient({
      phone: PATIENT2, email: emailFor(PATIENT2), username: "u" + PATIENT2.replace(/\D/g, "").slice(-9), otpCode: lastEmailOtp(PATIENT2), password: "motdepasse1",
      firstName: "Gaston", lastName: "Mabiala", birthDate: "1968-01-10", sex: "M", district: "Bacongo", acceptTerms: true, client: "mobile",
    })).accountId;

    await drain(); // M03 ouvre le dossier du pro ; M07 crée les Carnets patients

    // Vérification du professionnel (M03) — sinon canPractice = false (D-029).
    const proActor = actor(doctorId, "PROFESSIONAL");
    const docKinds = ["ID", "DIPLOMA", "LICENSE", "PHOTO"] as const;
    for (const kind of docKinds) {
      await m03.addDocument(proActor, { kind, fileKey: `s3://${kind}` });
    }
    await m03.submit(proActor);
    const vcase = await prisma.verificationCase.findFirstOrThrow({ where: { professionalId: doctorId } });
    await m03.claim("admin-test", vcase.id);
    await m03.decide("admin-test", vcase.id, { decision: "VERIFIED", reasons: "Diplôme et ordre vérifiés" });
    await m03.signStart(doctorId);
    await m03.sign(proActor, { password: "motdepasse1", otpCode: lastOtp(DOCTOR) });

    // Offre + présence (M05).
    offerId = (await offers.createOffer(proActor, { label: "Consultation générale", durationMin: 30, priceXaf: 5000 })).id;
    await presence.setState(doctorId, "ONLINE");
  }, 90000);

  afterAll(async () => {
    await moduleRef.close();
    await prisma.$disconnect();
  });

  /** Mène une poignée jusqu'à la session ACTIVE et retourne l'id de session. */
  async function openSessionFor(patientAccountId: string): Promise<string> {
    const hs = await handshakes.initiate(actor(patientAccountId, "PATIENT"), { offerId });
    await handshakes.confirm(actor(doctorId, "PROFESSIONAL"), hs.id);
    await handshakes.pay(actor(patientAccountId, "PATIENT"), hs.id, { operator: "MTN_MOMO" });
    // Le patient saisit son code MoMo → webhook → m13.payment.succeeded → session PREPARING.
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderRef: `handshake:${hs.id}` } });
    await momo.confirmPending(payment.aggregatorRef as string, true);
    await drain();
    const session = await prisma.careSession.findFirstOrThrow({ where: { handshakeId: hs.id } });
    // Pré-consultation transmise → session ACTIVE (démarrage du décompteur).
    await sessionsSvc.submitPreConsultation(actor(patientAccountId, "PATIENT"), session.id, { symptoms: "Fièvre depuis 2 jours", attachments: [] });
    return session.id;
  }

  it("RM-06-01 (invariant n°1) — payer sans confirmation valide est impossible", async () => {
    const hs = await handshakes.initiate(actor(patientId, "PATIENT"), { offerId });
    // Pas de confirmation → le paiement doit être refusé (le bouton payer « n'existe pas »).
    await expect(handshakes.pay(actor(patientId, "PATIENT"), hs.id, { operator: "MTN_MOMO" })).rejects.toThrow(/RM-06-01|confirmé/);
    // Nettoyage : on refuse cette poignée pour libérer le couple patient↔pro (EF-06-14).
    await handshakes.refuse(actor(doctorId, "PROFESSIONAL"), hs.id, { reason: "Test invariant n°1" });
  });

  it("Parcours 🅰 — session, message du pro, compte-rendu → Carnet + gains crédités + notation", async () => {
    const sessionId = await openSessionFor(patientId);

    // Le professionnel répond (donc D-008 ne s'appliquera pas).
    await sessionsSvc.sendMessage(actor(doctorId, "PROFESSIONAL"), sessionId, {
      clientMsgId: "msg-1", kind: "TEXT", body: "Bonjour, depuis quand la fièvre ?",
    });
    // Idempotence offline (ADR-12) : rejeu du même clientMsgId → un seul message.
    await sessionsSvc.sendMessage(actor(doctorId, "PROFESSIONAL"), sessionId, {
      clientMsgId: "msg-1", kind: "TEXT", body: "Bonjour, depuis quand la fièvre ?",
    });
    expect(await prisma.sessionMessage.count({ where: { sessionId } })).toBe(1);

    // Compte-rendu déposé pendant la session ACTIVE → Carnet (C2) + capture des gains (RM-06-04).
    await reports.depositReport(actor(doctorId, "PROFESSIONAL"), sessionId, {
      diagnosis: "Syndrome grippal", recommendations: "Repos, hydratation, paracétamol",
    });
    await drain();

    // C2 : une entrée CONSULTATION_REPORT est dans le Carnet du patient (provenance professionnel).
    const record = await reader.getFullRecord({ patientId }, {});
    const reportEntry = record.items.find((e) => e.type === "CONSULTATION_REPORT");
    expect(reportEntry).toBeDefined();
    expect(reportEntry?.provenance).toBe("RECORDED_BY_PROFESSIONAL");
    expect(reportEntry?.sourceRef).toBe(`session:${sessionId}`);

    // RM-06-04 : gains crédités au compte-rendu — 90 % de 5000 (commission PM-01 = 10 %).
    const earnings = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(earnings.availableXaf).toBe(4500);

    // Fin du temps (forçage déterministe de endsAt) → ENDED (le pro a répondu : pas de D-008).
    await prisma.careSession.update({ where: { id: sessionId }, data: { endsAt: new Date(Date.now() - 1000) } });
    const ended = await sessionsSvc.getSession(actor(patientId, "PATIENT"), sessionId);
    expect(ended.status).toBe("ENDED");

    // Notation (EF-06-11) — une seule fois.
    await sessionsSvc.rate(actor(patientId, "PATIENT"), sessionId, { score: 5, comment: "Très à l'écoute" });
    await expect(sessionsSvc.rate(actor(patientId, "PATIENT"), sessionId, { score: 4 })).rejects.toThrow(/déjà été notée/);
    await drain();
  });

  it("D-008 (invariant n°9) — session sans réponse du pro → remboursement automatique, gains non crédités", async () => {
    const earningsBefore = (await payments.getEarnings("PROFESSIONAL", doctorId)).availableXaf;
    const sessionId = await openSessionFor(patient2Id);

    // Le professionnel n'envoie AUCUN message. Fin du temps → clôture → D-008.
    await prisma.careSession.update({ where: { id: sessionId }, data: { endsAt: new Date(Date.now() - 1000) } });
    const settled = await sessionsSvc.getSession(actor(patient2Id, "PATIENT"), sessionId);
    expect(settled.status).toBe("REFUNDED");
    await drain();

    // Le paiement est remboursé et les gains du pro n'ont pas bougé (jamais capturés).
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderRef: `handshake:${(await prisma.careSession.findUniqueOrThrow({ where: { id: sessionId } })).handshakeId}` } });
    expect(payment.status).toBe("REFUNDED");
    expect((await payments.getEarnings("PROFESSIONAL", doctorId)).availableXaf).toBe(earningsBefore);
  });

  it("EF-05-06 — l'annuaire public ne montre que les pros vérifiés et disponibles", async () => {
    // Le médecin est vérifié + ONLINE → présent et initiable.
    expect(await presence.isAvailableForInitiation(doctorId)).toBe(true);
    // En « Ne pas déranger », il n'est plus initiable (on ne paie jamais un absent).
    await presence.setState(doctorId, "DO_NOT_DISTURB");
    expect(await presence.isAvailableForInitiation(doctorId)).toBe(false);
    await presence.setState(doctorId, "ONLINE");
  });
});

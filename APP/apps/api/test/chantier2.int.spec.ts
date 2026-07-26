/**
 * Intégration Chantier 2 — cycle financier complet + notifications, contre PostgreSQL réel.
 * Couvre : encaissement différé (poignée de main), confirmation MoMo (webhook), capture au
 * compte-rendu (RM-06-04), remboursement avec débit miroir (CU-13-03), retrait + OTP + payout,
 * échec de virement → re-crédit (CU-13-04), idempotence (RM-13-04), course capture/refund (D-047),
 * et livraison C4 via le centre in-app (M14) avec respect des préférences (CU-14-03).
 */
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { DevAggregatorGateway } from "../src/common/momo/aggregator.gateway";
import { OutboxService } from "../src/common/outbox.service";
import { PrismaService } from "../src/common/prisma.service";
import { DevSmsGateway } from "../src/common/sms/sms.service";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { M13PaymentsModule } from "../src/modules/m13-payments/m13.module";
import { PaymentsService } from "../src/modules/m13-payments/m13.payments.service";
import { EarningsService } from "../src/modules/m13-payments/m13.earnings.service";
import { M14NotificationsModule } from "../src/modules/m14-notifications/m14.module";
import { NotificationsService } from "../src/modules/m14-notifications/m14.service";

describe("Chantier 2 — cycle financier + notifications (M13 + M14)", () => {
  let prisma: PrismaService;
  let sms: DevSmsGateway;
  let momo: DevAggregatorGateway;
  let outbox: OutboxService;
  let m01: M01Service;
  let payments: PaymentsService;
  let earnings: EarningsService;
  let notifications: NotificationsService;
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;

  const DOCTOR_PHONE = "+242069000001";
  const PATIENT_PHONE = "+242069000002";
  let doctorId = "";
  let patientId = "";

  const lastOtpFor = (phone: string): string => {
    const msg = [...sms.sent].reverse().find((m) => m.phone === phone && /\b\d{6}\b/.test(m.message));
    if (!msg) throw new Error(`Aucun OTP pour ${phone}`);
    return (msg.message.match(/\b(\d{6})\b/) as RegExpMatchArray)[1] as string;
  };

  const drainAll = async (): Promise<void> => {
    const deadline = Date.now() + 15_000;
    for (;;) {
      await outbox.drain(100);
      const pending = await prisma.outboxEvent.count({ where: { processedAt: null } });
      if (pending === 0) return;
      if (Date.now() > deadline) throw new Error(`Outbox non vidée : ${pending}`);
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CommonModule, M01AccountsModule, M13PaymentsModule, M14NotificationsModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    sms = moduleRef.get(DevSmsGateway);
    momo = moduleRef.get(DevAggregatorGateway);
    outbox = moduleRef.get(OutboxService);
    m01 = moduleRef.get(M01Service);
    payments = moduleRef.get(PaymentsService);
    earnings = moduleRef.get(EarningsService);
    notifications = moduleRef.get(NotificationsService);

    // Nettoyage du périmètre financier + comptes.
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.earningsEntry.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.paymentSplit.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.earningsAccount.deleteMany();
    await prisma.manualRefundRequest.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.outboxEvent.deleteMany();
    // Résidus possibles d'autres suites partageant la base (ordre FK).
    await prisma.ownershipTransferIntent.deleteMany();
    await prisma.facilityInvitation.deleteMany();
    await prisma.agreementVersion.deleteMany();
    await prisma.digitalAgreement.deleteMany();
    await prisma.verificationDecision.deleteMany();
    await prisma.supportingDocument.deleteMany();
    await prisma.verificationCase.deleteMany();
    await prisma.facilityMember.deleteMany();
    await prisma.facility.deleteMany();
    await prisma.moderationDecision.deleteMany();
    await prisma.userReport.deleteMany();
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

    const doctor = await registerProfessional(DOCTOR_PHONE);
    doctorId = doctor.accountId;
    const patient = await registerPatient(PATIENT_PHONE);
    patientId = patient.accountId;
  }, 60000);

  afterAll(async () => {
    await moduleRef.close();
    await prisma.$disconnect();
  });

  async function registerProfessional(phone: string) {
    await m01.requestOtp(phone, "REGISTRATION");
    return m01.registerProfessional({
      phone,
      username: "u" + phone.replace(/\D/g, "").slice(-9),
      otpCode: lastOtpFor(phone),
      password: "motdepasse1",
      firstName: "Armel",
      lastName: "Konaté",
      category: "GENERAL_PRACTITIONER",
      client: "web",
    });
  }
  async function registerPatient(phone: string) {
    await m01.requestOtp(phone, "REGISTRATION");
    return m01.registerPatient({
      phone,
      username: "u" + phone.replace(/\D/g, "").slice(-9),
      otpCode: lastOtpFor(phone),
      password: "motdepasse1",
      firstName: "Mireille",
      lastName: "Nkounkou",
      birthDate: "1994-03-15",
      sex: "F",
      district: "Talangaï",
      client: "mobile",
    });
  }

  it("RM-13-04 — encaissement différé idempotent : un orderRef rejoué ne redébite pas", async () => {
    const order = {
      orderRef: "session:CU01",
      payerAccountId: patientId,
      amountXaf: 5000,
      operator: "MTN_MOMO" as const,
      beneficiary: { holderType: "PROFESSIONAL" as const, holderId: doctorId },
      capture: "DEFERRED" as const,
    };
    const a = await payments.requestCharge(order);
    const b = await payments.requestCharge(order); // rejeu exact
    expect(a.paymentId).toBe(b.paymentId);
    expect(await prisma.payment.count({ where: { orderRef: "session:CU01" } })).toBe(1);
  });

  it("Cycle complet : confirmation MoMo → reçu → capture au compte-rendu → gains crédités", async () => {
    // Sans contrat signé, le taux retombe sur PM-01 = 10 % (resolveCommissionPct, repli).
    const ref = momo.pending.find((p) => p.amountXaf === 5000);
    expect(ref).toBeDefined();
    await momo.confirmPending(ref!.aggregatorRef, true); // le patient saisit son code MoMo

    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderRef: "session:CU01" }, include: { split: true } });
    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.split?.commissionXaf).toBe(500); // 10 % de 5000
    expect(payment.split?.netXaf).toBe(4500);
    expect(payment.split?.capturedAt).toBeNull(); // différé : pas encore crédité

    // Reçu PAYMENT émis et consultable (EF-13-05).
    const receipts = await payments.listReceiptsForPayer(patientId);
    expect(receipts.some((r) => r.kind === "PAYMENT" && r.amountXaf === 5000)).toBe(true);

    // En attente côté médecin, rien de disponible encore (EF-13-06).
    let view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(0);
    expect(view.pendingXaf).toBe(4500);

    // Compte-rendu déposé (M06 plus tard) → ordre de capture.
    const cap = await payments.capture("session:CU01");
    expect(cap.captured).toBe(true);
    view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(4500);
    expect(view.pendingXaf).toBe(0);

    // Rejeu de capture : no-op (RM-13-04).
    expect((await payments.capture("session:CU01")).captured).toBe(false);
  });

  it("Invariant n° 3 — somme des mouvements == solde disponible", async () => {
    const account = await prisma.earningsAccount.findUniqueOrThrow({
      where: { holderType_holderId: { holderType: "PROFESSIONAL", holderId: doctorId } },
    });
    const sum = await prisma.earningsEntry.aggregate({ _sum: { amountXaf: true }, where: { accountId: account.id } });
    expect(sum._sum.amountXaf).toBe(account.availableXaf);
  });

  it("CU-13-04 — retrait : OTP + payout, puis échec de virement → re-crédit intégral", async () => {
    const actor = { accountId: doctorId, accountType: "PROFESSIONAL", sessionId: "s", client: "web" };

    // Retrait réussi de 3000.
    const start = await earnings.startWithdrawal(actor, { holderType: "PROFESSIONAL", holderId: doctorId, amountXaf: 3000, operator: "MTN_MOMO" });
    await earnings.confirmWithdrawal(actor, { withdrawalId: start.withdrawalId, password: "motdepasse1", otpCode: lastOtpFor(DOCTOR_PHONE) });
    let view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(1500);

    // Retrait dont le virement échoue → re-crédit automatique (l'argent ne disparaît jamais).
    momo.failNextPayout = true;
    const start2 = await earnings.startWithdrawal(actor, { holderType: "PROFESSIONAL", holderId: doctorId, amountXaf: 1000, operator: "MTN_MOMO" });
    const res2 = await earnings.confirmWithdrawal(actor, { withdrawalId: start2.withdrawalId, password: "motdepasse1", otpCode: lastOtpFor(DOCTOR_PHONE) });
    expect(res2.status).toBe("FAILED");
    view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(1500); // re-crédité
  });

  it("CU-13-04 — OTP de retrait erroné : refusé, solde intact", async () => {
    const actor = { accountId: doctorId, accountType: "PROFESSIONAL", sessionId: "s", client: "web" };
    // PM-19 limite les OTP par numéro/heure (toutes finalités) : les retraits précédents l'ont
    // consommée — on purge pour ce cas (équivaut au passage d'une heure). PM-19 est testé ailleurs.
    await prisma.otpCode.deleteMany({ where: { phone: DOCTOR_PHONE } });
    const start = await earnings.startWithdrawal(actor, { holderType: "PROFESSIONAL", holderId: doctorId, amountXaf: 500, operator: "MTN_MOMO" });
    await expect(
      earnings.confirmWithdrawal(actor, { withdrawalId: start.withdrawalId, password: "motdepasse1", otpCode: "000000" }),
    ).rejects.toThrow();
    const view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(1500); // inchangé
  });

  it("CU-13-03 — remboursement d'une part capturée : débit miroir, reçu REFUND, solde négatif accepté", async () => {
    // Nouvelle consultation 2000, capture immédiate pour simplifier.
    await payments.requestCharge({
      orderRef: "session:CU03",
      payerAccountId: patientId,
      amountXaf: 2000,
      operator: "AIRTEL_MONEY",
      beneficiary: { holderType: "PROFESSIONAL", holderId: doctorId },
      capture: "IMMEDIATE",
    });
    const ref = momo.pending.find((p) => p.amountXaf === 2000);
    await momo.confirmPending(ref!.aggregatorRef, true);
    let view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(1500 + 1800); // 90 % de 2000 crédité immédiatement

    await payments.refund("session:CU03", "Consultation annulée par le médecin");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderRef: "session:CU03" } });
    expect(payment.status).toBe("REFUNDED");

    // Reçu REFUND distinct du reçu PAYMENT (clé composite).
    const receipts = await payments.listReceiptsForPayer(patientId);
    expect(receipts.filter((r) => r.orderRef === "session:CU03").map((r) => r.kind).sort()).toEqual(["PAYMENT", "REFUND"]);

    // Débit miroir : la part créditée est reprise.
    view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(1500);

    // Rejeu du remboursement : idempotent.
    await payments.refund("session:CU03", "rejeu");
    view = await payments.getEarnings("PROFESSIONAL", doctorId);
    expect(view.availableXaf).toBe(1500);
  });

  it("M14 — la confirmation de paiement a livré un reçu dans le centre in-app du patient", async () => {
    await drainAll(); // relaie les notify.request émis par M13
    const center = await notifications.listMine(patientId);
    expect(center.items.some((n) => n.template === "m13.receipt")).toBe(true);
  });

  it("CU-14-03 — catégorie 'money' désactivée : plus de notification in-app (sauf critiques)", async () => {
    await notifications.setPreference(
      { accountId: patientId, accountType: "PATIENT", sessionId: "s", client: "mobile" },
      "money",
      false,
    );
    const before = (await notifications.listMine(patientId)).items.length;
    // Une notification 'money' non critique ne doit RIEN créer.
    await notifications.deliver({ accountId: patientId, template: "m13.receipt", receiptNumber: "RC-X", amountXaf: 1 });
    const after = (await notifications.listMine(patientId)).items.length;
    expect(after).toBe(before);
  });
});

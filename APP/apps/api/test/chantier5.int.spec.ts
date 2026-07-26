/**
 * Intégration Chantier 5 — M16 Pilotage & Administration, contre PostgreSQL réel.
 *
 * Couvre le back-office et la cadence : KPIs du pilote (EF-16-05), changement de paramètre
 * historisé + avenant (EF-16-04/CU-16-02), bannissement à double validation (EF-16-07), arbitrage
 * d'un strike DÉLÉGUÉ à M12 (RM-16-01), cadence des balayages (scheduler), et CU-16-01 (un pro
 * suspendu en pleine session payée → remboursement + clôture, C1).
 */
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { DevAggregatorGateway } from "../src/common/momo/aggregator.gateway";
import { OutboxService } from "../src/common/outbox.service";
import { ParamsService } from "../src/common/params.service";
import { PrismaService } from "../src/common/prisma.service";
import { DevSmsGateway } from "../src/common/sms/sms.service";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { M03VerificationContractsModule } from "../src/modules/m03-verification-contracts/m03.module";
import { M03Service } from "../src/modules/m03-verification-contracts/m03.service";
import { M05DirectoryModule } from "../src/modules/m05-directory/m05.module";
import { OffersService } from "../src/modules/m05-directory/m05.offers.service";
import { PresenceService } from "../src/modules/m05-directory/m05.presence.service";
import { M06HandshakeSessionModule } from "../src/modules/m06-handshake-session/m06.module";
import { HandshakeService } from "../src/modules/m06-handshake-session/m06.handshake.service";
import { M07HealthRecordModule } from "../src/modules/m07-health-record/m07.module";
import { M09PrescriptionsModule } from "../src/modules/m09-prescriptions/m09.module";
import { M11StocksModule } from "../src/modules/m11-stocks/m11.module";
import { M12SearchDisclosureModule } from "../src/modules/m12-search-disclosure/m12.module";
import { M13PaymentsModule } from "../src/modules/m13-payments/m13.module";
import { M14NotificationsModule } from "../src/modules/m14-notifications/m14.module";
import { M16PilotageModule } from "../src/modules/m16-pilotage/m16.module";
import { AdminService } from "../src/modules/m16-pilotage/m16.admin.service";
import { ParametersService } from "../src/modules/m16-pilotage/m16.parameters.service";
import { PilotKpiService } from "../src/modules/m16-pilotage/m16.kpi.service";
import { SchedulerService } from "../src/modules/m16-pilotage/m16.scheduler.service";

type Actor = { accountId: string; accountType: string; sessionId: string; client: string };

describe("Chantier 5 — M16 Pilotage & Administration", () => {
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;
  let prisma: PrismaService;
  let sms: DevSmsGateway;
  let momo: DevAggregatorGateway;
  let outbox: OutboxService;
  let params: ParamsService;
  let m01: M01Service;
  let m03: M03Service;
  let offers: OffersService;
  let presence: PresenceService;
  let handshakes: HandshakeService;
  let admin: AdminService;
  let parameters: ParametersService;
  let kpis: PilotKpiService;
  let scheduler: SchedulerService;

  const DOCTOR = "+242069300001";
  const PATIENT = "+242069300002";
  const PATIENT2 = "+242069300003";
  const ADMIN_1 = "admin-1-uuid";
  const ADMIN_2 = "admin-2-uuid";
  let doctorId = "";
  let patientId = "";
  let patient2Id = "";
  let offerId = "";
  let facilityId = "";

  const lastOtp = (phone: string): string => {
    const m = [...sms.sent].reverse().find((s) => s.phone === phone && /\b\d{6}\b/.test(s.message));
    if (!m) throw new Error(`Aucun OTP pour ${phone}`);
    return (m.message.match(/\b(\d{6})\b/) as RegExpMatchArray)[1] as string;
  };
  const drain = async (): Promise<void> => {
    const deadline = Date.now() + 15_000;
    for (;;) {
      await outbox.drain(100);
      if ((await prisma.outboxEvent.count({ where: { processedAt: null } })) === 0) return;
      if (Date.now() > deadline) throw new Error("Outbox non vidée");
      await new Promise((r) => setTimeout(r, 120));
    }
  };
  const actor = (accountId: string, accountType: string): Actor => ({
    accountId, accountType, sessionId: "s", client: accountType === "PATIENT" ? "mobile" : "web",
  });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CommonModule, M01AccountsModule, M03VerificationContractsModule, M05DirectoryModule,
        M06HandshakeSessionModule, M07HealthRecordModule, M09PrescriptionsModule, M11StocksModule,
        M12SearchDisclosureModule, M13PaymentsModule, M14NotificationsModule, M16PilotageModule,
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    sms = moduleRef.get(DevSmsGateway);
    momo = moduleRef.get(DevAggregatorGateway);
    outbox = moduleRef.get(OutboxService);
    params = moduleRef.get(ParamsService);
    m01 = moduleRef.get(M01Service);
    m03 = moduleRef.get(M03Service);
    offers = moduleRef.get(OffersService);
    presence = moduleRef.get(PresenceService);
    handshakes = moduleRef.get(HandshakeService);
    admin = moduleRef.get(AdminService);
    parameters = moduleRef.get(ParametersService);
    kpis = moduleRef.get(PilotKpiService);
    scheduler = moduleRef.get(SchedulerService);

    // Nettoyage (ordre FK) — D10/D6/D5 puis socle.
    await prisma.accountSanction.deleteMany();
    await prisma.parameterChange.deleteMany();
    await prisma.supportProcedure.deleteMany();
    await prisma.dispensationLine.deleteMany();
    await prisma.dispensation.deleteMany();
    await prisma.referentialEnrichmentItem.deleteMany();
    await prisma.allergyOverride.deleteMany();
    await prisma.prescriptionLine.deleteMany();
    await prisma.prescription.deleteMany();
    await prisma.reservationLine.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.disclosure.deleteMany();
    await prisma.reliabilityStrike.deleteMany();
    await prisma.productAvailabilityAlert.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.stockItem.deleteMany();
    await prisma.stockThreshold.deleteMany();
    await prisma.freshnessConfirmation.deleteMany();
    await prisma.facilityStockState.deleteMany();
    await prisma.medicament.deleteMany();
    await prisma.$transaction([
      prisma.sessionRecordAccess.deleteMany(), prisma.sessionRating.deleteMany(),
      prisma.preConsultation.deleteMany(), prisma.sessionMessage.deleteMany(),
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

    // Médecin vérifié + signé (pour l'avenant) + offre + présence.
    await m01.requestOtp(DOCTOR, "REGISTRATION");
    doctorId = (await m01.registerProfessional({
      phone: DOCTOR, username: "u" + DOCTOR.replace(/\D/g, "").slice(-9), otpCode: lastOtp(DOCTOR), password: "motdepasse1",
      firstName: "Armel", lastName: "Konaté", category: "GENERAL_PRACTITIONER", client: "web",
    })).accountId;
    await m01.requestOtp(PATIENT, "REGISTRATION");
    patientId = (await m01.registerPatient({
      phone: PATIENT, username: "u" + PATIENT.replace(/\D/g, "").slice(-9), otpCode: lastOtp(PATIENT), password: "motdepasse1",
      firstName: "Mireille", lastName: "Nkounkou", birthDate: "1994-03-15", sex: "F", district: "Talangaï", client: "mobile",
    })).accountId;
    await m01.requestOtp(PATIENT2, "REGISTRATION");
    patient2Id = (await m01.registerPatient({
      phone: PATIENT2, username: "u" + PATIENT2.replace(/\D/g, "").slice(-9), otpCode: lastOtp(PATIENT2), password: "motdepasse1",
      firstName: "Gaston", lastName: "Mabiala", birthDate: "1968-01-10", sex: "M", district: "Bacongo", client: "mobile",
    })).accountId;
    await drain();

    const proActor = actor(doctorId, "PROFESSIONAL");
    for (const kind of ["ID", "DIPLOMA", "LICENSE", "PHOTO"] as const) {
      await m03.addDocument(proActor, { kind, fileKey: `s3://${kind}` });
    }
    await m03.submit(proActor);
    const vcase = await prisma.verificationCase.findFirstOrThrow({ where: { professionalId: doctorId } });
    await m03.claim("admin-test", vcase.id);
    await m03.decide("admin-test", vcase.id, { decision: "VERIFIED", reasons: "Vérifié" });
    await m03.signStart(doctorId);
    await m03.sign(proActor, { password: "motdepasse1", otpCode: lastOtp(DOCTOR) });

    offerId = (await offers.createOffer(proActor, { label: "Consultation", durationMin: 30, priceXaf: 5000 })).id;
    await presence.setState(doctorId, "ONLINE");

    // Une pharmacie + un strike de fiabilité (pour l'arbitrage M16→M12).
    facilityId = (await prisma.facility.create({
      data: { type: "PHARMACY", name: "Pharmacie Test", district: "Talangaï", quarter: "Q" },
    })).id;
    await prisma.facilityStockState.create({ data: { facilityId, lastFreshAt: new Date() } });

    await drain();
  }, 120000);

  afterAll(async () => {
    // Sécurité : on rétablit les PM modifiés au cas où un test aurait échoué avant restauration.
    await prisma.platformParameter.update({ where: { key: "PM-03" }, data: { value: "500" } }).catch(() => undefined);
    await prisma.platformParameter.update({ where: { key: "PM-01" }, data: { value: "10" } }).catch(() => undefined);
    params.clearCache();
    await moduleRef.close();
    await prisma.$disconnect();
  });

  it("EF-16-04 / CU-16-02 — changement de paramètre : historisé, appliqué, date future refusée", async () => {
    const before = await params.getInt("PM-03");
    expect(before).toBe(500);

    await parameters.updateParameter(ADMIN_1, "PM-03", "600", new Date().toISOString(), "Ajustement pilote");
    expect(await params.getInt("PM-03")).toBe(600); // cache invalidé, nouvelle valeur lue
    const history = await parameters.listHistory("PM-03");
    expect(history[0]?.oldValue).toBe("500");
    expect(history[0]?.newValue).toBe("600");
    expect(history[0]?.changedBy).toBe(ADMIN_1);

    // Date d'effet future → refusée au MVP (différé non géré, on ne ment pas sur le contrat).
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await expect(parameters.updateParameter(ADMIN_1, "PM-03", "700", future, "Futur")).rejects.toThrow(BadRequestException);
    // PM inconnu → 404.
    await expect(parameters.updateParameter(ADMIN_1, "PM-999", "1", new Date().toISOString(), "x")).rejects.toThrow();

    // Restauration.
    await parameters.updateParameter(ADMIN_1, "PM-03", "500", new Date().toISOString(), "Retour pilote");
    expect(await params.getInt("PM-03")).toBe(500);
  });

  it("EF-16-05 / CU-16-03 — les 7 KPIs du pilote sont calculés avec seuils vert/rouge", async () => {
    const list = await kpis.getPilotKpis();
    expect(list).toHaveLength(7);
    const keys = list.map((k) => k.key);
    expect(keys).toEqual([
      "pros_verifies_actifs", "pharmacies_stock_vivant", "sessions_realisees",
      "devoilements_payes", "taux_confirmation", "taux_remboursement_auto", "patients_revenus",
    ]);
    for (const k of list) expect(["green", "red"]).toContain(k.status);
    // Le médecin vérifié+signé compte ; la pharmacie au stock frais compte.
    expect(list.find((k) => k.key === "pros_verifies_actifs")?.value).toBeGreaterThanOrEqual(1);
    expect(list.find((k) => k.key === "pharmacies_stock_vivant")?.value).toBeGreaterThanOrEqual(1);
    // Aucune donnée médicale n'apparaît dans le tableau (RM-16-05) — agrégats seulement.
    expect(JSON.stringify(list)).not.toMatch(/diagnos|sympt|allerg/i);
  });

  it("EF-16-07 / RM-16-04 — bannissement à double validation par deux admins distincts", async () => {
    const { sanctionId } = await admin.requestBan(ADMIN_1, patient2Id, "Fraude avérée");
    // Le demandeur ne peut pas approuver son propre ban (403).
    await expect(admin.approveBan(ADMIN_1, sanctionId)).rejects.toThrow(ForbiddenException);
    // Une seconde demande pour le même compte est refusée (une seule demande vivante).
    await expect(admin.requestBan(ADMIN_2, patient2Id, "Doublon")).rejects.toThrow(ConflictException);
    // Un admin DISTINCT approuve → compte clos.
    const res = await admin.approveBan(ADMIN_2, sanctionId);
    expect(res.banned).toBe(true);
    await drain();
    const banned = await prisma.account.findUniqueOrThrow({ where: { id: patient2Id } });
    expect(banned.status).toBe("CLOSED");
    expect(banned.closedAt).not.toBeNull();
  });

  it("RM-16-01 — l'arbitrage d'un strike est DÉLÉGUÉ à M12 (M16 ne touche pas ReliabilityStrike)", async () => {
    const strike = await prisma.reliabilityStrike.create({
      data: { facilityId, reason: "Produit manquant", status: "ACTIVE" },
    });
    const res = await admin.resolveStrike(ADMIN_1, strike.id, false, "Contestation fondée");
    expect(res.status).toBe("CANCELLED");
    const fresh = await prisma.reliabilityStrike.findUniqueOrThrow({ where: { id: strike.id } });
    expect(fresh.status).toBe("CANCELLED");
    await drain();
  });

  it("Cadence — tickFrequent enchaîne les balayages sans jeter (un échec n'interrompt pas les autres)", async () => {
    const recap = await scheduler.tickFrequent();
    expect(recap).toBeDefined();
  });

  it("CU-16-01 — un professionnel suspendu en pleine session payée est remboursé, ses accès révoqués (C1)", async () => {
    // Session payée du patient avec le médecin (statut PREPARING après paiement confirmé).
    const hs = await handshakes.initiate(actor(patientId, "PATIENT"), { offerId });
    await handshakes.confirm(actor(doctorId, "PROFESSIONAL"), hs.id);
    await handshakes.pay(actor(patientId, "PATIENT"), hs.id, { operator: "MTN_MOMO" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderRef: `handshake:${hs.id}` } });
    await momo.confirmPending(payment.aggregatorRef as string, true);
    await drain();
    const session = await prisma.careSession.findFirstOrThrow({ where: { handshakeId: hs.id } });
    expect(["PREPARING", "ACTIVE"]).toContain(session.status);

    // Suspension du médecin.
    const res = await admin.suspendAccount(ADMIN_1, doctorId, "Signalement grave (M04)");
    expect(res.suspended).toBe(true);
    await drain();

    // Compte SUSPENDED, sessions de connexion révoquées (effet < 1 min).
    const acc = await prisma.account.findUniqueOrThrow({ where: { id: doctorId } });
    expect(acc.status).toBe("SUSPENDED");
    expect(await prisma.loginSession.count({ where: { accountId: doctorId, revokedAt: null } })).toBe(0);
    // Sanction tracée.
    expect(await prisma.accountSanction.count({ where: { accountId: doctorId, type: "SUSPENSION", status: "EXECUTED" } })).toBe(1);
    // CU-16-01 (C1) : la session payée est remboursée et close.
    const refundedSession = await prisma.careSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(refundedSession.status).toBe("REFUNDED");
    const refundedPayment = await prisma.payment.findFirstOrThrow({ where: { orderRef: `handshake:${hs.id}` } });
    expect(refundedPayment.status).toBe("REFUNDED");

    // Réactivation : la suspension d'origine passe à REVERSED (machine d'états cohérente).
    await admin.reactivateAccount(ADMIN_1, doctorId, "Erreur, levée");
    await drain();
    expect((await prisma.account.findUniqueOrThrow({ where: { id: doctorId } })).status).toBe("ACTIVE");
    expect(await prisma.accountSanction.count({ where: { accountId: doctorId, type: "SUSPENSION", status: "REVERSED" } })).toBe(1);
  });

  // Placé en DERNIER : l'avenant crée une nouvelle version de contrat NON signée → le médecin ne
  // peut plus exercer tant qu'il n'a pas re-signé (D-029). On ne le fait donc qu'après les tests
  // qui ont besoin d'un médecin praticable (la session de CU-16-01).
  it("EF-16-04 / D-022 — changer le taux PM-01 réédite les contrats signés (avenant), pas un PM non-taux", async () => {
    const vcase = await prisma.verificationCase.findFirstOrThrow({ where: { professionalId: doctorId } });
    const before = await prisma.agreementVersion.count({ where: { agreement: { caseId: vcase.id } } });

    // PM-08 (durée, non contractuel) ne déclenche aucun avenant.
    const noAvenant = await parameters.updateParameter(ADMIN_1, "PM-08", "86400", new Date().toISOString(), "no-op");
    expect(noAvenant.reissuedCount).toBe(0);

    // PM-01 10 → 12 : avenant ré-édité pour le dossier signé du médecin.
    const res = await parameters.updateParameter(ADMIN_1, "PM-01", "12", new Date().toISOString(), "Nouveau taux");
    expect(res.reissuedCount).toBeGreaterThanOrEqual(1);
    const after = await prisma.agreementVersion.count({ where: { agreement: { caseId: vcase.id } } });
    expect(after).toBeGreaterThan(before);

    // Restauration directe (évite un second avenant) + invalidation cache.
    await prisma.platformParameter.update({ where: { key: "PM-01" }, data: { value: "10" } });
    params.clearCache();
  });
});

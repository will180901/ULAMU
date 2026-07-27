/**
 * Intégration Chantier 4 — le parcours ORDONNANCE → RECHERCHE → DÉVOILEMENT → DÉLIVRANCE,
 * de bout en bout contre PostgreSQL réel :
 *   session M06 active → prescription M09 (scellée, QR, Carnet C2) → recherche anonyme M12 →
 *   dévoilement payé M13/C1 (pharmacie révélée + réservation 24 h) → scan + délivrance M09 →
 *   décrément FEFO du stock M11 (C3) + entrée Carnet (C2).
 *
 * Plus les invariants corrigés en revue adversariale :
 * - RM-12-01 (règle d'or) : aucune identité de pharmacie sans dévoilement ACTIVE du patient ;
 * - RM-09-05 (correctif C) : une ordonnance annulée n'est plus délivrable (garde DANS la transaction) ;
 * - RM-11-01 : le stock ne devient jamais négatif (délivrance > disponible refusée, rien décrémenté) ;
 * - RM-12-06 / Q-004 (correctif B) : « non disponible » sans alternative → remboursement intégral + strike.
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
import { M07HealthRecordModule } from "../src/modules/m07-health-record/m07.module";
import { HealthRecordReaderService } from "../src/modules/m07-health-record/m07.reader.service";
import { M09PrescriptionsModule } from "../src/modules/m09-prescriptions/m09.module";
import { PrescriptionService } from "../src/modules/m09-prescriptions/m09.prescription.service";
import { DispensationService } from "../src/modules/m09-prescriptions/m09.dispensation.service";
import { M11StocksModule } from "../src/modules/m11-stocks/m11.module";
import { StockService } from "../src/modules/m11-stocks/m11.stock.service";
import { StockAvailabilityService } from "../src/modules/m11-stocks/m11.availability.service";
import { M12SearchDisclosureModule } from "../src/modules/m12-search-disclosure/m12.module";
import { SearchService } from "../src/modules/m12-search-disclosure/m12.search.service";
import { DisclosureService } from "../src/modules/m12-search-disclosure/m12.disclosure.service";
import { M13PaymentsModule } from "../src/modules/m13-payments/m13.module";
import { M14NotificationsModule } from "../src/modules/m14-notifications/m14.module";

type Actor = { accountId: string; accountType: string; sessionId: string; client: string };

describe("Chantier 4 — ordonnance → recherche → dévoilement → délivrance (M09/M11/M12)", () => {
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
  let reader: HealthRecordReaderService;
  let prescriptions: PrescriptionService;
  let dispensations: DispensationService;
  let stock: StockService;
  let availability: StockAvailabilityService;
  let searchSvc: SearchService;
  let disclosures: DisclosureService;

  const DISTRICT = "Talangaï";
  const DOCTOR = "+242069200001";
  const PATIENT = "+242069200002";
  const PATIENT2 = "+242069200003";
  const PHARMACIST = "+242069200004";
  let doctorId = "";
  let patientId = "";
  let patient2Id = "";
  let pharmacistId = "";
  let facilityId = "";
  let offerId = "";
  let medA = "";
  let medB = "";
  let medC = "";
  let medD = "";

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
  const actor = (accountId: string, accountType: string): Actor => ({
    accountId,
    accountType,
    sessionId: "s",
    client: accountType === "PATIENT" ? "mobile" : "web",
  });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CommonModule,
        M01AccountsModule,
        M03VerificationContractsModule,
        M05DirectoryModule,
        M06HandshakeSessionModule,
        M07HealthRecordModule,
        M09PrescriptionsModule,
        M11StocksModule,
        M12SearchDisclosureModule,
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
    reader = moduleRef.get(HealthRecordReaderService);
    prescriptions = moduleRef.get(PrescriptionService);
    dispensations = moduleRef.get(DispensationService);
    stock = moduleRef.get(StockService);
    availability = moduleRef.get(StockAvailabilityService);
    searchSvc = moduleRef.get(SearchService);
    disclosures = moduleRef.get(DisclosureService);

    // Nettoyage complet (ordre FK). D5/D6 d'abord (le plus dépendant en tête).
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
    // Socle partagé (mêmes suppressions que les autres suites — base partagée).
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

    // ── Médecin (vérifié) + patients ───────────────────────────────────────────
    await m01.requestOtp({ email: emailFor(DOCTOR) }, "REGISTRATION");
    doctorId = (await m01.registerProfessional({
      phone: DOCTOR, email: emailFor(DOCTOR), username: "u" + DOCTOR.replace(/\D/g, "").slice(-9), otpCode: lastEmailOtp(DOCTOR), password: "motdepasse1",
      firstName: "Armel", lastName: "Konaté", category: "GENERAL_PRACTITIONER", client: "web",
    })).accountId;
    await m01.requestOtp({ email: emailFor(PATIENT) }, "REGISTRATION");
    patientId = (await m01.registerPatient({
      phone: PATIENT, email: emailFor(PATIENT), username: "u" + PATIENT.replace(/\D/g, "").slice(-9), otpCode: lastEmailOtp(PATIENT), password: "motdepasse1",
      firstName: "Mireille", lastName: "Nkounkou", birthDate: "1994-03-15", sex: "F", district: DISTRICT, client: "mobile",
    })).accountId;
    await m01.requestOtp({ email: emailFor(PATIENT2) }, "REGISTRATION");
    patient2Id = (await m01.registerPatient({
      phone: PATIENT2, email: emailFor(PATIENT2), username: "u" + PATIENT2.replace(/\D/g, "").slice(-9), otpCode: lastEmailOtp(PATIENT2), password: "motdepasse1",
      firstName: "Gaston", lastName: "Mabiala", birthDate: "1968-01-10", sex: "M", district: DISTRICT, client: "mobile",
    })).accountId;
    await drain(); // M03 ouvre le dossier du pro ; M07 crée les Carnets patients

    const proActor = actor(doctorId, "PROFESSIONAL");
    for (const kind of ["ID", "DIPLOMA", "LICENSE", "PHOTO"] as const) {
      await m03.addDocument(proActor, { kind, fileKey: `s3://${kind}` });
    }
    await m03.submit(proActor);
    const vcase = await prisma.verificationCase.findFirstOrThrow({ where: { professionalId: doctorId } });
    await m03.claim("admin-test", vcase.id);
    await m03.decide("admin-test", vcase.id, { decision: "VERIFIED", reasons: "Diplôme et ordre vérifiés" });
    await m03.signStart(doctorId);
    await m03.sign(proActor, { password: "motdepasse1", otpCode: lastOtp(DOCTOR) });

    offerId = (await offers.createOffer(proActor, { label: "Consultation générale", durationMin: 30, priceXaf: 5000 })).id;
    await presence.setState(doctorId, "ONLINE");

    // ── Pharmacie VÉRIFIÉE + titulaire (monté directement : onboarding M02/M03 testé ailleurs) ──
    pharmacistId = (await prisma.account.create({
      data: {
        phone: PHARMACIST, passwordHash: "x", type: "FACILITY_MEMBER",
        facilityMemberProfile: { create: { firstName: "Sylvie", lastName: "Okemba" } },
      },
    })).id;
    facilityId = (await prisma.facility.create({
      data: { type: "PHARMACY", name: "Pharmacie du Centre", district: DISTRICT, quarter: "Moungali", phone: "+242060000099" },
    })).id;
    await prisma.facilityMember.create({
      data: { facilityId, accountId: pharmacistId, role: "OWNER", rights: ["stock", "dispense"], active: true },
    });
    // Vérification de la structure (C6) : dossier VERIFIED + version de contrat SIGNÉE.
    const fcase = await prisma.verificationCase.create({ data: { facilityId, status: "VERIFIED" } });
    const agreement = await prisma.digitalAgreement.create({ data: { caseId: fcase.id } });
    await prisma.agreementVersion.create({
      data: { agreementId: agreement.id, version: 1, commissionPct: 10, bodyHash: "h", signedAt: new Date(), signedBy: pharmacistId, effectiveAt: new Date() },
    });

    // Référentiel + stock initial (StockService rafraîchit FacilityStockState).
    medA = (await prisma.medicament.create({ data: { dci: "Paracétamol", commercialNames: ["Doliprane"], form: "comprimé", dosage: "500 mg" } })).id;
    medB = (await prisma.medicament.create({ data: { dci: "Amoxicilline", commercialNames: ["Clamoxyl"], form: "gélule", dosage: "500 mg" } })).id;
    medC = (await prisma.medicament.create({ data: { dci: "Métronidazole", commercialNames: ["Flagyl"], form: "comprimé", dosage: "250 mg" } })).id;
    medD = (await prisma.medicament.create({ data: { dci: "Ibuprofène", commercialNames: ["Advil"], form: "comprimé", dosage: "400 mg" } })).id;
    const pharma = actor(pharmacistId, "FACILITY_MEMBER");
    const farExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await stock.addEntry(pharma, facilityId, { medicamentId: medA, lotCode: "LOTA", quantity: 10, expiryDate: farExpiry, priceXaf: 1500 });
    await stock.addEntry(pharma, facilityId, { medicamentId: medB, lotCode: "LOTB", quantity: 10, expiryDate: farExpiry, priceXaf: 2000 });
    await stock.addEntry(pharma, facilityId, { medicamentId: medC, lotCode: "LOTC", quantity: 1, expiryDate: farExpiry, priceXaf: 800 });
    await stock.addEntry(pharma, facilityId, { medicamentId: medD, lotCode: "LOTD", quantity: 5, expiryDate: farExpiry, priceXaf: 1200 });
    await drain();
  }, 120000);

  afterAll(async () => {
    await moduleRef.close();
    await prisma.$disconnect();
  });

  /** Mène une poignée jusqu'à la session ACTIVE et retourne l'id de session. */
  async function openSession(patientAccountId: string): Promise<string> {
    const hs = await handshakes.initiate(actor(patientAccountId, "PATIENT"), { offerId });
    await handshakes.confirm(actor(doctorId, "PROFESSIONAL"), hs.id);
    await handshakes.pay(actor(patientAccountId, "PATIENT"), hs.id, { operator: "MTN_MOMO" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderRef: `handshake:${hs.id}` } });
    await momo.confirmPending(payment.aggregatorRef as string, true);
    await drain();
    const session = await prisma.careSession.findFirstOrThrow({ where: { handshakeId: hs.id } });
    await sessionsSvc.submitPreConsultation(actor(patientAccountId, "PATIENT"), session.id, { symptoms: "Fièvre", attachments: [] });
    return session.id;
  }

  /** Clôt la session (libère le plafond PM-27 du pro) sans incidence sur les ordonnances déjà scellées. */
  async function endSession(patientAccountId: string, sessionId: string): Promise<void> {
    await prisma.careSession.update({ where: { id: sessionId }, data: { endsAt: new Date(Date.now() - 1000) } });
    await sessionsSvc.getSession(actor(patientAccountId, "PATIENT"), sessionId);
    await drain();
  }

  /** Pague un dévoilement payé jusqu'au statut ACTIVE et retourne son id. */
  async function payDisclosure(patientAccountId: string, medicamentId: string, quantity: number): Promise<string> {
    const view = await disclosures.requestDisclosure(actor(patientAccountId, "PATIENT"), {
      district: DISTRICT, items: [{ medicamentId, quantity }], operator: "MTN_MOMO",
    });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderRef: view.orderRef } });
    await momo.confirmPending(payment.aggregatorRef as string, true);
    await drain();
    return view.id;
  }

  it("Parcours complet — prescription en session → recherche → dévoilement payé → délivrance (stock + Carnet)", async () => {
    // 1) Prescription depuis une session ACTIVE (M09, C2 vers le Carnet).
    const sessionId = await openSession(patientId);
    await prescriptions.createInSession(actor(doctorId, "PROFESSIONAL"), sessionId, {
      lines: [{ medicamentId: medA, posology: "1 cp matin et soir", durationDays: 5, qtyPrescribed: 2 }],
    });
    const prescription = await prisma.prescription.findFirstOrThrow({
      where: { sessionId, patientAccountId: patientId }, include: { lines: true },
    });
    expect(prescription.status).toBe("ACTIVE");
    expect(prescription.qrToken).toBeTruthy();
    await drain();

    // C2 : l'ordonnance scellée est inscrite au Carnet du patient (provenance professionnel).
    const afterSeal = await reader.getFullRecord({ patientId }, { type: "PRESCRIPTION" });
    expect(afterSeal.items.some((e) => e.sourceRef === `prescription:${prescription.id}`)).toBe(true);

    await endSession(patientId, sessionId);

    // 2) Recherche anonyme (M12/C7) — la pharmacie couvre le produit, AUCUNE identité exposée.
    const result = await searchSvc.search(actor(patientId, "PATIENT"), { district: DISTRICT, items: [{ medicamentId: medA, quantity: 2 }] });
    const district = result.districts.find((d) => d.district === DISTRICT);
    expect(district?.pharmacyCount).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(result)).not.toContain(facilityId); // jamais d'identité (RM-12-01)

    // 3) Dévoilement payé (C1 100 % ULAMU) → pharmacie révélée + réservation 24 h.
    const disclosureId = await payDisclosure(patientId, medA, 2);
    const revealed = await disclosures.getDisclosure(actor(patientId, "PATIENT"), disclosureId);
    expect(revealed.status).toBe("ACTIVE");
    expect(revealed.facility?.facilityId).toBe(facilityId);
    expect(revealed.facility?.name).toBe("Pharmacie du Centre");
    expect(revealed.remainingSeconds).toBeGreaterThan(0);
    // La réservation déduit le disponible publié (RM-12-02) : 10 − 2 = 8.
    expect(await availability.availableQuantity(facilityId, medA)).toBe(8);

    // 4) Délivrance en pharmacie : scan (état serveur, jamais le Carnet) puis délivrance.
    const pharma = actor(pharmacistId, "FACILITY_MEMBER");
    const scan = await dispensations.scanVerify(pharma, prescription.qrToken, facilityId);
    expect(scan.dispensable).toBe(true);
    expect(scan.lines[0]?.remaining).toBe(2);
    expect(JSON.stringify(scan)).not.toContain("prescription:"); // pas de sourceRef Carnet exposé

    const lineId = prescription.lines[0]!.id;
    const dispensed = await dispensations.dispense(pharma, prescription.qrToken, {
      facilityId, lines: [{ prescriptionLineId: lineId, quantity: 2 }],
    });
    expect(dispensed.status).toBe("DISPENSED");
    await drain();

    // C3 : le stock physique a baissé de 2 (lot LOTA : 10 → 8), mouvement DISPENSE tracé.
    const item = await prisma.stockItem.findFirstOrThrow({ where: { facilityId, medicamentId: medA } });
    expect(item.quantity).toBe(8);
    const dispenseMoves = await prisma.stockMovement.count({ where: { stockItemId: item.id, type: "DISPENSE" } });
    expect(dispenseMoves).toBe(1);

    // C2 : la délivrance est inscrite au Carnet (2 entrées PRESCRIPTION : scellement + délivrance).
    const record = await reader.getFullRecord({ patientId }, { type: "PRESCRIPTION" });
    const sources = record.items.map((e) => e.sourceRef);
    expect(sources).toContain(`prescription:${prescription.id}`);
    expect(sources.some((s) => s?.startsWith("dispensation:"))).toBe(true);
  }, 60000);

  it("RM-12-01 (règle d'or) — aucune identité de pharmacie hors dévoilement ACTIVE du patient", async () => {
    // Dévoilement EN ATTENTE de paiement : rien n'est révélé (facility masquée).
    const view = await disclosures.requestDisclosure(actor(patientId, "PATIENT"), {
      district: DISTRICT, items: [{ medicamentId: medA, quantity: 1 }], operator: "MTN_MOMO",
    });
    const pending = await disclosures.getDisclosure(actor(patientId, "PATIENT"), view.id);
    expect(pending.status).toBe("PENDING_PAYMENT");
    expect(pending.facility).toBeNull();

    // Un AUTRE patient ne peut pas lire ce dévoilement (404, pas de fuite d'existence — RM-12-05).
    await expect(disclosures.getDisclosure(actor(patient2Id, "PATIENT"), view.id)).rejects.toThrow(/introuvable/i);
  });

  it("RM-09-05 (correctif) — une ordonnance annulée n'est plus délivrable", async () => {
    const sessionId = await openSession(patientId);
    await prescriptions.createInSession(actor(doctorId, "PROFESSIONAL"), sessionId, {
      lines: [{ medicamentId: medB, posology: "1 gélule 3x/jour", durationDays: 7, qtyPrescribed: 2 }],
    });
    const presc = await prisma.prescription.findFirstOrThrow({ where: { sessionId, patientAccountId: patientId }, include: { lines: true } });
    await endSession(patientId, sessionId);

    // Le prescripteur annule (RM-09-05 : QR invalidé, pas de réactivation).
    await prescriptions.cancel(actor(doctorId, "PROFESSIONAL"), presc.id, "Erreur de saisie");
    await drain();

    const pharma = actor(pharmacistId, "FACILITY_MEMBER");
    // Délivrance refusée : l'annulation a invalidé le QR (RM-09-05) — le scan ne le retrouve plus ;
    // la garde de statut conditionnelle dans la transaction (correctif C) reste le filet anti-course.
    await expect(
      dispensations.dispense(pharma, presc.qrToken, { facilityId, lines: [{ prescriptionLineId: presc.lines[0]!.id, quantity: 1 }] }),
    ).rejects.toThrow(/introuvable|invalide|délivrable|annulée|RM-09-05/i);

    // Aucune délivrance n'a été enregistrée, le stock de medB est intact (10).
    expect(await prisma.dispensation.count({ where: { prescriptionId: presc.id } })).toBe(0);
    const item = await prisma.stockItem.findFirstOrThrow({ where: { facilityId, medicamentId: medB } });
    expect(item.quantity).toBe(10);
  }, 60000);

  it("RM-11-01 — délivrer plus que le disponible est refusé, rien n'est décrémenté", async () => {
    const sessionId = await openSession(patientId);
    await prescriptions.createInSession(actor(doctorId, "PROFESSIONAL"), sessionId, {
      lines: [{ medicamentId: medC, posology: "1 cp", durationDays: 3, qtyPrescribed: 5 }],
    });
    const presc = await prisma.prescription.findFirstOrThrow({ where: { sessionId, patientAccountId: patientId }, include: { lines: true } });
    await endSession(patientId, sessionId);

    const pharma = actor(pharmacistId, "FACILITY_MEMBER");
    // Le stock de medC est de 1, on tente d'en délivrer 5.
    await expect(
      dispensations.dispense(pharma, presc.qrToken, { facilityId, lines: [{ prescriptionLineId: presc.lines[0]!.id, quantity: 5 }] }),
    ).rejects.toThrow(/insuffisant/i);

    // RM-11-01 : rollback complet — stock intact (1), aucune entrée Carnet, ligne non délivrée.
    const item = await prisma.stockItem.findFirstOrThrow({ where: { facilityId, medicamentId: medC } });
    expect(item.quantity).toBe(1);
    const line = await prisma.prescriptionLine.findUniqueOrThrow({ where: { id: presc.lines[0]!.id } });
    expect(line.qtyDispensed).toBe(0);
  }, 60000);

  it("RM-12-06 / Q-004 (correctif) — « non disponible » sans alternative → remboursement intégral + strike", async () => {
    const disclosureId = await payDisclosure(patient2Id, medD, 1);
    const paid = await prisma.disclosure.findUniqueOrThrow({ where: { id: disclosureId } });
    expect(paid.status).toBe("ACTIVE");
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderRef: paid.orderRef } });
    expect(payment.status).toBe("SUCCEEDED");

    // Le patient signale le produit manquant : une seule pharmacie existe → aucune alternative → remboursement.
    const after = await disclosures.reportUnavailable(actor(patient2Id, "PATIENT"), disclosureId);
    expect(after.status).toBe("REFUNDED");
    await drain();

    // RM-12-06 : les 500 XAF sont remboursés (le bon orderRef RACINE a été ciblé, correctif B).
    const refundedPayment = await prisma.payment.findFirstOrThrow({ where: { orderRef: paid.orderRef } });
    expect(refundedPayment.status).toBe("REFUNDED");
    // Un strike de fiabilité ACTIVE est posé sur la pharmacie fautive (EF-12-07).
    expect(await prisma.reliabilityStrike.count({ where: { facilityId, status: "ACTIVE" } })).toBeGreaterThanOrEqual(1);
    // La réservation est libérée : le disponible de medD est republié (5).
    expect(await availability.availableQuantity(facilityId, medD)).toBe(5);
  }, 60000);
});

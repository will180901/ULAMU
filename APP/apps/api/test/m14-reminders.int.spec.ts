/**
 * Intégration M14 — Rappels de médicaments + mise à jour de profil (M01), contre PostgreSQL réel.
 * Vérifie le CRUD complet propre au PATIENT et surtout l'ISOLATION par compte (RM-14 / exigence
 * « ça ne doit pas affecter les autres utilisateurs ») : le patient B ne voit, ne modifie ni ne
 * supprime JAMAIS un rappel du patient A. Couvre aussi la normalisation des heures, « marquer pris »,
 * le refus des comptes non-patients, et PATCH profil (dont le garde-fou d'âge PM-16).
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { DevSmsGateway } from "../src/common/sms/sms.service";
import { DevEmailGateway, EMAIL_GATEWAY } from "../src/common/email/email.service";
import { PrismaService } from "../src/common/prisma.service";
import { AuthenticatedActor } from "../src/common/auth/auth.guard";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { RemindersService } from "../src/modules/m14-notifications/m14.reminders.service";

describe("M14 — rappels de médicaments + profil (CRUD isolé par patient)", () => {
  let reminders: RemindersService;
  let accounts: M01Service;
  let prisma: PrismaService;
  let sms: DevSmsGateway;
  let mail: DevEmailGateway;

  const lastOtpFor = (phone: string): string => {
    const msg = [...sms.sent].reverse().find((m) => m.phone === phone && /\b\d{6}\b/.test(m.message));
    if (!msg) throw new Error(`Aucun OTP capturé pour ${phone}`);
    return (msg.message.match(/\b(\d{6})\b/) as RegExpMatchArray)[1] as string;
  };
  const usernameFor = (phone: string): string => "u" + phone.replace(/\D/g, "").slice(-9);
  const emailFor = (phone: string): string => `u${phone.replace(/\D/g, "").slice(-9)}@exemple.test`;
  /** OTP d'inscription, desormais envoye par email. `>(\d{6})<` cible le code seul : le chercher
   * n'importe ou dans le HTML attraperait la couleur #111112 du gabarit. */
  const lastEmailOtpFor = (phone: string): string => {
    const to = emailFor(phone);
    const msg = [...mail.sent].reverse().find((m) => m.to === to && />\d{6}</.test(m.html));
    if (!msg) throw new Error(`Aucun OTP email capture pour ${to}`);
    return (msg.html.match(/>(\d{6})</) as RegExpMatchArray)[1] as string;
  };

  const registerPatient = async (phone: string, district = "Bacongo") => {
    await accounts.requestOtp({ email: emailFor(phone) }, "REGISTRATION");
    const res = await accounts.registerPatient({
      phone,
      email: emailFor(phone),
      username: usernameFor(phone),
      otpCode: lastEmailOtpFor(phone),
      password: "motdepasse1",
      firstName: "Grace",
      lastName: "Mabiala",
      birthDate: "1990-05-20",
      sex: "F",
      district,
      client: "mobile",
    });
    return res.accountId as string;
  };
  const actorOf = (accountId: string, accountType = "PATIENT"): AuthenticatedActor => ({
    accountId,
    accountType,
    sessionId: "sess-" + accountId,
    client: "mobile",
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule, M01AccountsModule],
      providers: [RemindersService],
    }).compile();
    await moduleRef.init();
    reminders = moduleRef.get(RemindersService);
    accounts = moduleRef.get(M01Service);
    prisma = moduleRef.get(PrismaService);
    sms = moduleRef.get(DevSmsGateway);
    mail = moduleRef.get(EMAIL_GATEWAY);

    // Slate propre (ordre FK) — la base est partagée entre suites d'intégration (cf. m01.int.spec).
    await prisma.medicationReminder.deleteMany();
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("CRUD complet : créer → lister → mettre à jour → marquer pris → supprimer", async () => {
    const a = actorOf(await registerPatient("+242062100001"));

    // create — heures normalisées (désordonnées + doublon + invalide → triées/dédupliquées/filtrées)
    const created = await reminders.create(a, { medicationName: "  Amlodipine ", dosage: "5 mg", times: ["20:00", "08:00", "08:00", "xx:yy"] });
    expect(created.medicationName).toBe("Amlodipine");
    expect(created.dosage).toBe("5 mg");
    expect(created.times).toEqual(["08:00", "20:00"]);
    expect(created.active).toBe(true);
    expect(created.lastTakenAt).toBeNull();

    // list
    const list1 = await reminders.listMine(a);
    expect(list1.items).toHaveLength(1);
    expect(list1.items[0]?.id).toBe(created.id);

    // update — désactiver + changer dosage + heures
    const updated = await reminders.update(a, created.id, { active: false, dosage: "10 mg", times: ["07:30"] });
    expect(updated.active).toBe(false);
    expect(updated.dosage).toBe("10 mg");
    expect(updated.times).toEqual(["07:30"]);

    // markTaken — pose lastTakenAt
    const taken = await reminders.markTaken(a, created.id);
    expect(taken.lastTakenAt).not.toBeNull();
    expect(new Date(taken.lastTakenAt as string).getTime()).toBeGreaterThan(0);

    // remove → liste vide
    await reminders.remove(a, created.id);
    expect((await reminders.listMine(a)).items).toHaveLength(0);
  });

  it("ISOLATION : le patient B ne peut ni voir, ni modifier, ni supprimer, ni marquer le rappel de A", async () => {
    const a = actorOf(await registerPatient("+242062100002"));
    const b = actorOf(await registerPatient("+242062100003"));

    const rA = await reminders.create(a, { medicationName: "Metformine", dosage: "850 mg", times: ["08:00"] });

    // B ne voit que SES rappels (aucun ici)
    expect((await reminders.listMine(b)).items).toHaveLength(0);

    // B ne peut pas lire/modifier/supprimer/marquer le rappel de A → NotFound (jamais 200, jamais fuite)
    await expect(reminders.update(b, rA.id, { active: false })).rejects.toBeInstanceOf(NotFoundException);
    await expect(reminders.remove(b, rA.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(reminders.markTaken(b, rA.id)).rejects.toBeInstanceOf(NotFoundException);

    // Le rappel de A est intact (B n'a rien pu altérer)
    const stillThere = await reminders.listMine(a);
    expect(stillThere.items).toHaveLength(1);
    expect(stillThere.items[0]?.active).toBe(true);
  });

  it("les comptes non-patients sont refusés (assertPatient → Forbidden)", async () => {
    const pro = actorOf("pro-account-id", "PRO");
    await expect(reminders.create(pro, { medicationName: "X", times: ["08:00"] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(reminders.listMine(pro)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("PATCH profil : met à jour les champs du patient, isolé, et applique PM-16 (mineur refusé)", async () => {
    const accountId = await registerPatient("+242062100004", "Talangaï");

    const me0 = await accounts.getMe(accountId);
    expect(me0.district).toBe("Talangaï");

    // mise à jour partielle réussie
    const me1 = await accounts.updateMyProfile(accountId, { firstName: "Grâce", district: "Poto-Poto" });
    expect(me1.firstName).toBe("Grâce");
    expect(me1.district).toBe("Poto-Poto");
    expect(me1.lastName).toBe("Mabiala"); // inchangé

    // PM-16 : une date de naissance de mineur est refusée
    const minorIso = new Date(Date.now() - 10 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    await expect(accounts.updateMyProfile(accountId, { birthDate: minorIso })).rejects.toThrow(/PM-16/);

    // le district n'a pas changé suite au refus
    expect((await accounts.getMe(accountId)).district).toBe("Poto-Poto");
  });
});

/**
 * Intégration M01 — flux complets contre PostgreSQL réel (docker, port 5433).
 * Pré-requis : prisma db push + seed (PM-01→40). Couvre les CU-01-01→08.
 * Chaque scénario utilise des numéros distincts pour respecter PM-19 (3 OTP/h/numéro).
 * Connexion par nom d'utilisateur (D-049) ; le téléphone reste la racine.
 */
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { DevSmsGateway } from "../src/common/sms/sms.service";
import { DevEmailGateway, EMAIL_GATEWAY } from "../src/common/email/email.service";
import { PrismaService } from "../src/common/prisma.service";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { totpAt } from "../src/common/crypto/totp";

describe("M01 — intégration (CU-01-01 → CU-01-08)", () => {
  let service: M01Service;
  let prisma: PrismaService;
  let sms: DevSmsGateway;
  let mail: DevEmailGateway;

  /** OTP par SMS — ne sert plus qu'aux flux internes restés sur le téléphone (changement de numéro,
   * clôture de compte). L'inscription et la réinitialisation passent par l'email (voir plus bas). */
  const lastOtpFor = (phone: string): string => {
    const msg = [...sms.sent].reverse().find((m) => m.phone === phone && /\b\d{6}\b/.test(m.message));
    if (!msg) throw new Error(`Aucun OTP capturé pour ${phone}`);
    return (msg.message.match(/\b(\d{6})\b/) as RegExpMatchArray)[1] as string;
  };

  /** Nom d'utilisateur déterministe dérivé du téléphone (pour le login dans les tests). */
  const usernameFor = (phone: string): string => "u" + phone.replace(/\D/g, "").slice(-9);
  /** Email déterministe dérivé du téléphone — Account.email est unique, chaque compte a donc le sien. */
  const emailFor = (phone: string): string => `u${phone.replace(/\D/g, "").slice(-9)}@exemple.test`;

  /** OTP lu dans l'email capturé. `>(\d{6})<` cible le code seul : le chercher n'importe où dans le
   * HTML attraperait la couleur #111112 du gabarit. */
  const lastEmailOtpFor = (phone: string): string => {
    const to = emailFor(phone);
    const msg = [...mail.sent].reverse().find((m) => m.to === to && />\d{6}</.test(m.html));
    if (!msg) throw new Error(`Aucun OTP email capturé pour ${to}`);
    return (msg.html.match(/>(\d{6})</) as RegExpMatchArray)[1] as string;
  };

  const registerPatient = async (phone: string, password = "motdepasse1") => {
    await service.requestOtp({ email: emailFor(phone) }, "REGISTRATION");
    return service.registerPatient({
      phone,
      email: emailFor(phone),
      username: usernameFor(phone),
      otpCode: lastEmailOtpFor(phone),
      password,
      firstName: "Mireille",
      lastName: "Nkounkou",
      birthDate: "1994-03-15",
      sex: "F",
      district: "Talangaï",
      client: "mobile",
    });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule, M01AccountsModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(M01Service);
    prisma = moduleRef.get(PrismaService);
    sms = moduleRef.get(DevSmsGateway);
    mail = moduleRef.get(EMAIL_GATEWAY);

    // Nettoyage complet (ordre FK) — superset : les suites partagent la même base.
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

  it("CU-01-01 — inscription patient : OTP, compte, username, consentements, session, outbox", async () => {
    const phone = "+242061000001";
    const { accountId, sessionToken } = await registerPatient(phone);
    expect(sessionToken).toHaveLength(64);

    const account = await prisma.account.findUnique({ where: { phone }, include: { patientProfile: true, consents: true } });
    expect(account?.type).toBe("PATIENT");
    expect(account?.username).toBe(usernameFor(phone));
    expect(account?.patientProfile?.district).toBe("Talangaï");
    expect(account?.consents).toHaveLength(2); // CGU + PRIVACY (EF-01-08)

    const events = await prisma.outboxEvent.findMany({ where: { type: { in: ["m01.account.patient_created", "audit.event"] } } });
    expect(events.some((e) => e.type === "m01.account.patient_created")).toBe(true);
    expect(events.some((e) => e.type === "audit.event")).toBe(true);

    // RM-01-01 : un numéro = un compte.
    await service.requestOtp({ email: emailFor(phone) }, "REGISTRATION").catch(() => undefined);
    await expect(registerPatient(phone)).rejects.toThrow(/déjà/);
    expect(accountId).toBeTruthy();

    // Disponibilité du username (D-049).
    expect((await service.isUsernameAvailable(usernameFor(phone))).available).toBe(false);
    expect((await service.isUsernameAvailable("librevraiment")).available).toBe(true);
  });

  it("CU-01-03 — blocage PM-18 : 5 échecs → connexion bloquée même avec le bon mot de passe", async () => {
    const phone = "+242061000002";
    await registerPatient(phone, "bonmotdepasse1");
    const username = usernameFor(phone);
    for (let i = 0; i < 5; i++) {
      await expect(service.login({ username, password: "mauvais" + i, client: "mobile" })).rejects.toThrow(/incorrects/);
    }
    await expect(service.login({ username, password: "bonmotdepasse1", client: "mobile" })).rejects.toThrow(/bloqué/);
  });

  it("CU-01-08 — TOTP : activation, exigé à la connexion, code de secours à usage unique", async () => {
    const phone = "+242061000003";
    const { accountId } = await registerPatient(phone);
    const username = usernameFor(phone);

    const { secret } = await service.setupTotp(accountId);
    const { backupCodes } = await service.confirmTotp(accountId, totpAt(secret, Math.floor(Date.now() / 1000)));
    expect(backupCodes).toHaveLength(10);

    // Sans code → totpRequired (réponse 200, pas d'exception) ; avec code → session.
    const challenge = await service.login({ username, password: "motdepasse1", client: "mobile" });
    expect(challenge.totpRequired).toBe(true);
    expect(challenge.sessionToken).toBeUndefined();

    const ok = await service.login({
      username,
      password: "motdepasse1",
      client: "mobile",
      totpCode: totpAt(secret, Math.floor(Date.now() / 1000)),
    });
    expect(ok.totpRequired).toBe(false);
    expect(ok.accountId).toBe(accountId);

    // Code de secours : une fois oui, deux fois non.
    const backup = backupCodes[0] as string;
    await service.login({ username, password: "motdepasse1", client: "mobile", totpCode: backup });
    await expect(service.login({ username, password: "motdepasse1", client: "mobile", totpCode: backup })).rejects.toThrow(/invalide/);
  });

  it("CU-01-05 — changement de numéro : OTP sur l'ancien ET le nouveau", async () => {
    const oldPhone = "+242061000004";
    const newPhone = "+242061000005";
    const { accountId } = await registerPatient(oldPhone);

    await service.startPhoneChange(accountId, newPhone);
    const oldCode = lastOtpFor(oldPhone);
    const newCode = lastOtpFor(newPhone);
    await service.confirmPhoneChange(accountId, newPhone, oldCode, newCode);

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(account?.phone).toBe(newPhone);
    // Notifications de sécurité aux deux numéros (sans lien — T-13).
    const security = sms.sent.filter((m) => m.message.includes("identifiant") || m.message.includes("remplacé"));
    expect(security.length).toBeGreaterThanOrEqual(2);
    expect(sms.sent.every((m) => !m.message.includes("http"))).toBe(true);
  });

  it("CU-01-04 — réinitialisation : nouveau mot de passe + révocation de toutes les sessions", async () => {
    const phone = "+242061000006";
    const { accountId } = await registerPatient(phone, "ancienpass1");
    const username = usernameFor(phone);
    expect(await service.listSessions(accountId)).toHaveLength(1);

    await service.requestOtp({ email: emailFor(phone) }, "PASSWORD_RESET");
    await service.resetPassword({ email: emailFor(phone), otpCode: lastEmailOtpFor(phone), newPassword: "nouveaupass1" });

    expect(await service.listSessions(accountId)).toHaveLength(0); // toutes révoquées
    await expect(service.login({ username, password: "ancienpass1", client: "mobile" })).rejects.toThrow(/incorrects/);
    const ok = await service.login({ username, password: "nouveaupass1", client: "mobile" });
    expect(ok.accountId).toBe(accountId);
  });

  it("CU-01-07 — clôture : compte fermé, sessions révoquées, reconnexion refusée", async () => {
    const phone = "+242061000007";
    const { accountId } = await registerPatient(phone, "monpass123");
    await service.requestCloseOtp(accountId);
    await service.closeAccount(accountId, "monpass123", lastOtpFor(phone));

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(account?.status).toBe("CLOSED");
    expect(account?.closedAt).toBeTruthy();
    await expect(service.login({ username: usernameFor(phone), password: "monpass123", client: "mobile" })).rejects.toThrow(/clôturé/);
  });

  it("CU-01-06 — révocation d'une session à distance", async () => {
    const phone = "+242061000008";
    const { accountId } = await registerPatient(phone);
    // 2e session sur un autre appareil — en client "mobile" : le web refuse les comptes patients (D-012).
    await service.login({ username: usernameFor(phone), password: "motdepasse1", client: "mobile", deviceLabel: "Second téléphone" });
    const sessions = await service.listSessions(accountId);
    expect(sessions).toHaveLength(2);
    await service.revokeSession(accountId, (sessions[0] as { id: string }).id);
    expect(await service.listSessions(accountId)).toHaveLength(1);
  });

  it("PM-19 — limite d'OTP : le 4e envoi dans l'heure est refusé", async () => {
    const phone = "+242061000009";
    const target = { email: emailFor(phone) };
    await service.requestOtp(target, "REGISTRATION");
    await service.requestOtp(target, "REGISTRATION");
    await service.requestOtp(target, "REGISTRATION");
    await expect(service.requestOtp(target, "REGISTRATION")).rejects.toThrow(/PM-19/);
  });

  it("2FA email (mobile) — activation, code exigé à la connexion, désactivation", async () => {
    const phone = "+242061000010";
    const { accountId } = await registerPatient(phone);
    const username = usernameFor(phone);

    // Activation : code envoyé à l'adresse du compte, puis confirmation.
    await service.requestEmailTwoFactorOtp(accountId);
    await service.enableEmailTwoFactor(accountId, lastEmailOtpFor(phone));

    // 1re tentative : mot de passe bon, mais la session n'est PAS ouverte — un code part par email.
    const first = await service.login({ username, password: "motdepasse1", client: "mobile" });
    expect(first.otpRequired).toBe(true);
    expect(first.sessionToken).toBeUndefined();

    // Un code faux ne passe pas.
    await expect(
      service.login({ username, password: "motdepasse1", client: "mobile", otpCode: "000000" }),
    ).rejects.toThrow();

    // Avec le code reçu : session ouverte.
    await service.login({ username, password: "motdepasse1", client: "mobile" });
    const second = await service.login({ username, password: "motdepasse1", client: "mobile", otpCode: lastEmailOtpFor(phone) });
    expect(second.otpRequired).toBe(false);
    expect(second.sessionToken).toBeTruthy();

    // Désactivation : le mot de passe est exigé, puis la connexion redevient directe.
    await expect(service.disableEmailTwoFactor(accountId, "mauvaispass")).rejects.toThrow(/incorrect/);
    await service.disableEmailTwoFactor(accountId, "motdepasse1");
    const after = await service.login({ username, password: "motdepasse1", client: "mobile" });
    expect(after.sessionToken).toBeTruthy();
  });

  it("échec d'envoi — le code n'est pas conservé (le quota PM-19 ne doit pas être consommé pour rien)", async () => {
    const phone = "+242061000011";
    const to = emailFor(phone);
    const original = mail.send.bind(mail);
    // Simule un refus du fournisseur (adresse rejetée, panne réseau…).
    (mail as unknown as { send: unknown }).send = () => Promise.reject(new Error("fournisseur indisponible"));
    try {
      await expect(service.requestOtp({ email: to }, "REGISTRATION")).rejects.toThrow(/Impossible d'envoyer/);
    } finally {
      (mail as unknown as { send: unknown }).send = original;
    }
    // Rien en base : l'utilisateur n'a rien reçu, son quota reste intact.
    expect(await prisma.otpCode.count({ where: { email: to } })).toBe(0);

    // Et l'envoi suivant, lui, fonctionne normalement.
    await service.requestOtp({ email: to }, "REGISTRATION");
    expect(await prisma.otpCode.count({ where: { email: to } })).toBe(1);
  });
});

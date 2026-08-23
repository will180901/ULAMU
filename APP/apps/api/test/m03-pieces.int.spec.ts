/**
 * Intégration M03 — le dossier de vérification vu par son DÉPOSANT (CU-03-01/02), et la lecture des
 * pièces par l'administration.
 *
 * Écrit avec l'écran C1 « Ma vérification » : ce sont les quatre manques que cet écran a révélés.
 * Le plus grave n'est pas côté déposant — c'est qu'AUCUNE route ne savait servir les fichiers `vd_…`.
 * L'administration devait donc décider de la vérification d'un soignant sans pouvoir ouvrir son
 * diplôme. Ces tests verrouillent la réparation.
 */
import { Test } from "@nestjs/testing";
import { CommonModule } from "../src/common/common.module";
import { OutboxService } from "../src/common/outbox.service";
import { PrismaService } from "../src/common/prisma.service";
import { DevEmailGateway, EMAIL_GATEWAY } from "../src/common/email/email.service";
import { M01AccountsModule } from "../src/modules/m01-accounts/m01.module";
import { M01Service } from "../src/modules/m01-accounts/m01.service";
import { M03VerificationContractsModule } from "../src/modules/m03-verification-contracts/m03.module";
import { M03Service } from "../src/modules/m03-verification-contracts/m03.service";

describe("M03 — pièces justificatives et lecture des fichiers (C1)", () => {
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;
  let prisma: PrismaService;
  let mail: DevEmailGateway;
  let outbox: OutboxService;
  let m01: M01Service;
  let m03: M03Service;

  const PHONE = "+242052000001";
  const AUTRE_PHONE = "+242052000002";
  const ADMIN_ID = "admin-m03-pieces";

  let proId = "";
  let autreProId = "";

  const emailFor = (phone: string) => `u${phone.replace(/\D/g, "").slice(-9)}@exemple.test`;
  const usernameFor = (phone: string) => "u" + phone.replace(/\D/g, "").slice(-9);

  const otpEmail = (phone: string): string => {
    const to = emailFor(phone);
    const m = [...mail.sent].reverse().find((x) => x.to === to && />\d{6}</.test(x.html));
    if (!m) throw new Error(`Aucun OTP email pour ${to}`);
    return (m.html.match(/>(\d{6})</) as RegExpMatchArray)[1] as string;
  };

  /** L'ouverture du dossier passe par l'outbox (ADR-11) : il faut la vider pour la voir arriver. */
  const drain = async (): Promise<void> => {
    const limite = Date.now() + 20000;
    for (;;) {
      await outbox.drain(100);
      if ((await prisma.outboxEvent.count({ where: { processedAt: null } })) === 0) return;
      if (Date.now() > limite) throw new Error("Outbox non vidée");
      await new Promise((r) => setTimeout(r, 150));
    }
  };

  const inscrirePro = async (phone: string): Promise<string> => {
    await m01.requestOtp({ email: emailFor(phone) }, "REGISTRATION");
    const r = await m01.registerProfessional({
      phone,
      email: emailFor(phone),
      username: usernameFor(phone),
      otpCode: otpEmail(phone),
      password: "motdepasse1",
      firstName: "Ange",
      lastName: "Makaya",
      category: "SPECIALIST",
      specialty: "Cardiologie",
      acceptTerms: true,
      client: "web",
    });
    await drain();
    return r.accountId;
  };

  /** Un PNG minimal valide — le stockage refuse le vide et ce qui ressemble à un exécutable. */
  const PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const deposer = (accountId: string, kind: "ID" | "DIPLOMA" | "LICENSE" | "PHOTO") =>
    m03.uploadDocument({ accountId, accountType: "PROFESSIONAL" }, { kind, fileBase64: PNG_BASE64, mime: "image/png" });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CommonModule, M01AccountsModule, M03VerificationContractsModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    mail = moduleRef.get(EMAIL_GATEWAY);
    outbox = moduleRef.get(OutboxService);
    m01 = moduleRef.get(M01Service);
    m03 = moduleRef.get(M03Service);

    await prisma.auditEvent.deleteMany();
    await prisma.agreementVersion.deleteMany();
    await prisma.digitalAgreement.deleteMany();
    await prisma.verificationDecision.deleteMany();
    await prisma.supportingDocument.deleteMany();
    await prisma.verificationCase.deleteMany();
    await prisma.totpBackupCode.deleteMany();
    await prisma.totpSecret.deleteMany();
    await prisma.consentRecord.deleteMany();
    await prisma.loginSession.deleteMany();
    await prisma.loginAttempt.deleteMany();
    await prisma.otpCode.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.professionalProfile.deleteMany();
    await prisma.account.deleteMany();

    proId = await inscrirePro(PHONE);
    autreProId = await inscrirePro(AUTRE_PHONE);
  }, 90000);

  afterAll(async () => {
    await moduleRef.close();
    await prisma.$disconnect();
  });

  it("le dossier neuf annonce ce qu'il exige, ce qui manque, et qu'il n'est pas déposable", async () => {
    const d = await m03.getMine(proId);
    expect(d.status).toBe("DRAFT");
    expect(d.requiredDocuments).toEqual(["ID", "DIPLOMA", "LICENSE", "PHOTO"]);
    expect(d.missingDocuments).toEqual(["ID", "DIPLOMA", "LICENSE", "PHOTO"]);
    expect(d.canSubmit).toBe(false);
    expect(d.documentsEditable).toBe(true);
    // Le délai était jusqu'ici renvoyé par le seul `submit` : invisible avant le dépôt, perdu après
    // rechargement — c'est-à-dire absent précisément quand on veut le connaître.
    expect(d.announcedDelayHours).toBeGreaterThan(0);
    // La clé de stockage n'est plus servie au client (voir getMine).
    expect(JSON.stringify(d.documents)).not.toContain("vd_");
  });

  it("chaque pièce déposée disparaît des manquantes ; au complet, le dépôt devient possible", async () => {
    await deposer(proId, "ID");
    expect((await m03.getMine(proId)).missingDocuments).toEqual(["DIPLOMA", "LICENSE", "PHOTO"]);

    await deposer(proId, "DIPLOMA");
    await deposer(proId, "LICENSE");
    await deposer(proId, "PHOTO");

    const d = await m03.getMine(proId);
    expect(d.missingDocuments).toEqual([]);
    expect(d.canSubmit).toBe(true);
    expect(d.documents).toHaveLength(4);
  });

  it("le déposant relit sa propre pièce ; un autre soignant ne la voit pas", async () => {
    const doc = (await m03.getMine(proId)).documents[0]!;
    const f = await m03.readOwnDocument(proId, doc.id);
    expect(f.contentType).toBe("image/png");
    expect(f.buffer.length).toBeGreaterThan(0);

    // Le second compte a son PROPRE dossier : la pièce du premier n'y figure pas.
    await expect(m03.readOwnDocument(autreProId, doc.id)).rejects.toThrow(/introuvable/i);
  });

  it("l'administration lit la pièce, et cet accès laisse une trace", async () => {
    const dossier = await m03.getMine(proId);
    const doc = dossier.documents.find((x) => x.kind === "ID")!;
    const avant = await prisma.auditEvent.count({ where: { action: "m03.document.viewed" } });

    const f = await m03.readDocumentAsAdmin(ADMIN_ID, dossier.caseId, doc.id);
    expect(f.buffer.length).toBeGreaterThan(0);

    const trace = await prisma.auditEvent.findFirst({
      where: { action: "m03.document.viewed" },
      orderBy: { seq: "desc" },
    });
    expect(await prisma.auditEvent.count({ where: { action: "m03.document.viewed" } })).toBe(avant + 1);
    // RM-03-03 : le TYPE de pièce, jamais la clé ni le contenu.
    expect(JSON.stringify(trace?.context)).toContain("ID");
    expect(JSON.stringify(trace?.context)).not.toContain("vd_");
  });

  it("une pièce se retire pour être remplacée, et son fichier part avec elle", async () => {
    const doc = (await m03.getMine(proId)).documents.find((x) => x.kind === "PHOTO")!;
    await m03.removeDocument({ accountId: proId, accountType: "PROFESSIONAL" }, doc.id);

    const apres = await m03.getMine(proId);
    expect(apres.documents.find((x) => x.kind === "PHOTO")).toBeUndefined();
    expect(apres.missingDocuments).toEqual(["PHOTO"]);
    expect(apres.canSubmit).toBe(false);
    // Le fichier lui-même n'est plus lisible : on ne garde pas une pièce d'identité orpheline.
    await expect(m03.readOwnDocument(proId, doc.id)).rejects.toThrow(/introuvable/i);

    await deposer(proId, "PHOTO"); // on remet la pièce pour la suite
    expect((await m03.getMine(proId)).canSubmit).toBe(true);
  });

  it("dossier déposé : les pièces sont gelées — l'examinateur juge sur un dossier stable", async () => {
    await m03.submit({ accountId: proId, accountType: "PROFESSIONAL" });
    const d = await m03.getMine(proId);
    expect(d.status).toBe("SUBMITTED");
    expect(d.documentsEditable).toBe(false);
    expect(d.canSubmit).toBe(false);

    const doc = d.documents[0]!;
    await expect(m03.removeDocument({ accountId: proId, accountType: "PROFESSIONAL" }, doc.id)).rejects.toThrow(/modifiables/i);
    await expect(deposer(proId, "ID")).rejects.toThrow(/modifiables/i);
    // Mais la LECTURE reste ouverte : le déposant doit pouvoir revoir ce qu'il a envoyé.
    expect((await m03.readOwnDocument(proId, doc.id)).buffer.length).toBeGreaterThan(0);
  });
});

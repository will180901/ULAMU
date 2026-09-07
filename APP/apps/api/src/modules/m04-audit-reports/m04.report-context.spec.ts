/**
 * Le contexte d'un signalement — chantier 60, 07/09/2026 (M04, CU-04-04).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * **1. Le contenu du message ne sort JAMAIS.** C'est la raison d'être de ces tests, avant même
 * l'utilité de la route. `SessionMessage.body` est chiffré au repos (`sealSecret`, RM-06-06) et
 * n'est déchiffré que pour les participants d'une consultation. Un message de session peut porter
 * les résultats d'analyse d'un patient — celui qui n'a rien signalé et n'a rien demandé.
 *
 * ⚠️ Ma première recommandation au porteur disait « pour un message, son texte, son auteur et sa
 * session ». Le texte était de trop. Ouvrir le contenu chiffré des consultations à l'administration
 * serait une décision de produit, pas un détail d'implémentation — elle appartient au porteur.
 *
 * **2. Le signaleur reste anonyme** (RM-04-04) : c'est la condition pour qu'on ose signaler.
 *
 * **3. L'auteur du message est résolu.** Sans lui, la file affichait « SESSION_MESSAGE · A3F91C2B »
 * et ne s'instruisait pas : une file de modération qui ne s'instruit pas est pire qu'une file vide,
 * elle fait croire à un recours.
 *
 * **4. Regarder laisse une trace** (RM-16-03) : résoudre une cible révèle une identité.
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { NotFoundException } from "@nestjs/common";
import { AuditEmitter } from "../../common/audit.emitter";
import { PrismaService } from "../../common/prisma.service";
import { M04Service } from "./m04.service";

const ADMIN = "admin-1";
const SIGNALEUR = "le-signaleur-qui-doit-rester-anonyme";
const SECRET_MEDICAL = "Vos analyses montrent une glycémie à 1,9 g/L";

interface Monde {
  compte?: Record<string, unknown> | null;
  message?: Record<string, unknown> | null;
  signalement?: Record<string, unknown> | null;
}

function service(monde: Monde): { svc: M04Service; auditEmis: jest.Mock } {
  const auditEmis = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    userReport: { findUnique: jest.fn().mockResolvedValue(monde.signalement ?? null) },
    sessionMessage: { findUnique: jest.fn().mockResolvedValue(monde.message ?? null) },
    account: { findUnique: jest.fn().mockResolvedValue(monde.compte ?? null) },
    facility: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn({})),
  } as unknown as PrismaService;

  const svc = new M04Service(
    prisma,
    undefined as never,
    undefined as never,
    { emit: auditEmis } as unknown as AuditEmitter,
    undefined as never,
  );
  return { svc, auditEmis };
}

function signalement(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "rep-1",
    reporterId: SIGNALEUR,
    targetType: "SESSION_MESSAGE",
    targetId: "msg-1",
    reasonCode: "HARASSMENT",
    reasonText: "il a insisté après mon refus",
    status: "OPEN",
    createdAt: new Date("2026-09-07T08:00:00.000Z"),
    ...over,
  };
}

/**
 * Le message tel que la BASE le porte — `body` compris, chiffré ou non.
 *
 * On le met exprès dans la doublure : si un jour quelqu'un ajoute `body` au `select`, la doublure
 * le rendra, et le test qui interdit le contenu tombera. Une doublure qui ne porte que ce qu'on
 * attend ne peut rien détecter.
 */
function message(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "msg-1",
    sessionId: "sess-1",
    senderId: "le-soignant",
    kind: "TEXT",
    body: SECRET_MEDICAL,
    createdAt: new Date("2026-09-07T07:59:00.000Z"),
    editedAt: null,
    deletedAt: null,
    ...over,
  };
}

function compte(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "le-soignant",
    phone: "+242060000000",
    type: "PROFESSIONAL",
    status: "ACTIVE",
    patientProfile: null,
    professionalProfile: { firstName: "Awa", lastName: "Mbemba" },
    facilityMemberProfile: null,
    ...over,
  };
}

describe("getReportContext — ce qui ne doit JAMAIS sortir", () => {
  it("ne renvoie pas le contenu du message, même si la base le porte", async () => {
    const { svc } = await service({ signalement: signalement(), message: message(), compte: compte() });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");

    /*
      On sérialise et on cherche le secret dans TOUTE la réponse : une assertion sur un champ précis
      raterait un `body` réintroduit ailleurs — dans l'auteur, dans un futur aperçu, n'importe où.
    */
    expect(JSON.stringify(ctx)).not.toContain(SECRET_MEDICAL);
    expect(JSON.stringify(ctx)).not.toContain("body");
  });

  it("ne renvoie pas l'identité du signaleur (RM-04-04)", async () => {
    const { svc } = await service({ signalement: signalement(), message: message(), compte: compte() });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");

    expect(JSON.stringify(ctx)).not.toContain(SIGNALEUR);
    expect(ctx as unknown as Record<string, unknown>).not.toHaveProperty("reporterId");
  });

  it("n'écrit dans le journal ni le signaleur ni le moindre contenu", async () => {
    const { svc, auditEmis } = await service({ signalement: signalement(), message: message(), compte: compte() });
    await svc.getReportContext(ADMIN, "rep-1");

    const [, entree] = auditEmis.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(entree.action).toBe("m04.report.context.viewed");
    expect(JSON.stringify(entree)).not.toContain(SIGNALEUR);
    expect(JSON.stringify(entree)).not.toContain(SECRET_MEDICAL);
  });
});

describe("getReportContext — ce qui rend le signalement instruisible", () => {
  it("nomme l'auteur du message signalé, et dit de quelle nature il est", async () => {
    const { svc } = await service({ signalement: signalement(), message: message(), compte: compte() });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");

    expect(ctx.target).toMatchObject({
      kind: "SESSION_MESSAGE",
      found: true,
      message: { messageId: "msg-1", sessionId: "sess-1", kind: "TEXT", edited: false, deleted: false },
      author: { accountId: "le-soignant", type: "PROFESSIONAL", status: "ACTIVE", displayName: "Awa Mbemba" },
    });
  });

  it("garde le récit du signaleur — c'est là que se lit ce qui s'est passé", async () => {
    const { svc } = await service({ signalement: signalement(), message: message(), compte: compte() });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");
    expect(ctx.reasonText).toBe("il a insisté après mon refus");
    expect(ctx.reasonCode).toBe("HARASSMENT");
  });

  it("résout aussi un signalement de PROFIL", async () => {
    const { svc } = await service({
      signalement: signalement({ targetType: "PROFILE", targetId: "le-soignant" }),
      compte: compte(),
    });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");
    expect(ctx.target).toMatchObject({ kind: "PROFILE", found: true, account: { displayName: "Awa Mbemba" } });
  });

  /*
    Un compte fermé, un message effacé : cela arrive. L'écran doit pouvoir dire « cette cible
    n'existe plus » plutôt qu'afficher un vide qu'on prend pour un chargement — une lecture qui
    échoue n'est ni un zéro ni un « non ».
  */
  it("dit franchement quand la cible n'existe plus, sans jeter", async () => {
    const { svc } = await service({ signalement: signalement(), message: null });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");
    expect(ctx.target).toEqual({ kind: "SESSION_MESSAGE", found: false });
  });

  it("signale un message dont l'auteur a disparu, sans perdre le message", async () => {
    const { svc } = await service({ signalement: signalement(), message: message(), compte: null });
    const ctx = await svc.getReportContext(ADMIN, "rep-1");
    expect(ctx.target).toMatchObject({ kind: "SESSION_MESSAGE", found: true, author: null });
  });

  it("refuse un signalement inexistant", async () => {
    const { svc } = await service({ signalement: null });
    await expect(svc.getReportContext(ADMIN, "inconnu")).rejects.toBeInstanceOf(NotFoundException);
  });
});

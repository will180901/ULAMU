/**
 * Changer son mot de passe en étant connecté — chantier 58, 06/09/2026 (CU-01-04).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * Deux choses, et la première n'a été vue qu'en construisant l'écran mobile.
 *
 * **1. Se tromper en tapant son mot de passe ne doit PAS déconnecter.** Les deux clients traitent un
 * `401` sur une requête authentifiée comme « ton jeton est mort » et effacent la session. L'API
 * répondait pourtant `401` quand la session était valide et que seul le mot de passe ACTUEL, fourni
 * dans le corps, était faux.
 *
 * ⚠️ La conséquence tombait au pire moment imaginable : on change son mot de passe précisément
 * quand on craint que quelqu'un d'autre connaisse l'ancien. Une faute de frappe mettait alors la
 * personne dehors — elle perdait le seul accès dont elle était sûre et devait repasser par « mot de
 * passe oublié », pendant que l'autre, lui, restait connecté.
 *
 * **2. Le nombre d'appareils fermés est ce que l'écran promet.** La feuille mobile annonce AVANT
 * d'agir : « Vos autres appareils connectés seront déconnectés. Celui-ci restera ouvert. » Si le
 * service fermait aussi la session courante — ou n'en fermait aucune — l'écran mentirait.
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { HttpException, Logger } from "@nestjs/common";
import { AuditEmitter } from "../../common/audit.emitter";
import { EmailGateway } from "../../common/email/email.service";
import { hashPassword } from "../../common/crypto/password";
import { PrismaService } from "../../common/prisma.service";
import { M01Service } from "./m01.service";

const COMPTE = "acc-1";
const SESSION_COURANTE = "sess-courante";

interface Doublures {
  fermees: jest.Mock;
  emailEnvoye: jest.Mock;
  auditEmis: jest.Mock;
}

/** Un compte ACTIF dont le mot de passe est réellement scellé — `verifyPassword` fait son vrai travail. */
async function service(motDePasseReel: string, sessionsFermees = 0): Promise<{ svc: M01Service; d: Doublures }> {
  const passwordHash = await hashPassword(motDePasseReel);
  const fermees = jest.fn().mockResolvedValue({ count: sessionsFermees });
  const emailEnvoye = jest.fn().mockResolvedValue(undefined);
  const auditEmis = jest.fn().mockResolvedValue(undefined);
  const tx = {
    account: { update: jest.fn().mockResolvedValue(undefined) },
    loginSession: { updateMany: fermees },
  };
  const prisma = {
    account: { findUnique: jest.fn().mockResolvedValue({ id: COMPTE, status: "ACTIVE", passwordHash, email: "a@b.cg" }) },
    $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaService;

  const svc = new M01Service(
    prisma,
    undefined as never,
    undefined as never,
    { emit: auditEmis } as unknown as AuditEmitter,
    undefined as never,
    { send: emailEnvoye } as unknown as EmailGateway,
    undefined as never,
  );
  return { svc, d: { fermees, emailEnvoye, auditEmis } };
}

/**
 * Le STATUT réellement renvoyé, lu par `getStatus()`.
 *
 * On ne se contente pas de « c'est bien une `ForbiddenException` » : ce qui déconnecte les clients
 * n'est pas la classe, c'est le nombre 401 qui part sur le fil. C'est donc lui qu'on éprouve.
 */
async function statutDe(travail: Promise<unknown>): Promise<number> {
  try {
    await travail;
  } catch (e) {
    return e instanceof HttpException ? e.getStatus() : -1;
  }
  throw new Error("Un refus était attendu — la méthode a réussi.");
}

describe("changePassword — un mot de passe actuel faux ne déconnecte pas", () => {
  it("refuse en 403, JAMAIS en 401 (401 = les deux clients effacent la session)", async () => {
    const { svc } = await service("ancien-mdp1");
    expect(await statutDe(svc.changePassword(COMPTE, "je-me-suis-trompe1", "nouveau-mdp1", SESSION_COURANTE))).toBe(403);
  });

  it("dit lequel des deux mots de passe est en cause", async () => {
    const { svc } = await service("ancien-mdp1");
    await expect(svc.changePassword(COMPTE, "faux-mdp1", "nouveau-mdp1", SESSION_COURANTE)).rejects.toThrow(
      "Mot de passe actuel incorrect",
    );
  });

  it("ne touche à rien : ni au compte, ni aux sessions, ni au journal", async () => {
    const { svc, d } = await service("ancien-mdp1");
    await expect(svc.changePassword(COMPTE, "faux-mdp1", "nouveau-mdp1", SESSION_COURANTE)).rejects.toThrow();
    expect(d.fermees).not.toHaveBeenCalled();
    expect(d.auditEmis).not.toHaveBeenCalled();
    expect(d.emailEnvoye).not.toHaveBeenCalled();
  });

  /*
    Resaisir le même mot de passe répondrait « c'est fait » et fermerait les autres appareils sans
    rien avoir changé — le pire des deux mondes.
  */
  it("refuse un nouveau mot de passe identique à l'ancien, en 400 et sans rien fermer", async () => {
    const { svc, d } = await service("ancien-mdp1");
    expect(await statutDe(svc.changePassword(COMPTE, "ancien-mdp1", "ancien-mdp1", SESSION_COURANTE))).toBe(400);
    expect(d.fermees).not.toHaveBeenCalled();
  });

  it("refuse un nouveau mot de passe trop faible (RM-01-02), avant toute écriture", async () => {
    const { svc, d } = await service("ancien-mdp1");
    expect(await statutDe(svc.changePassword(COMPTE, "ancien-mdp1", "court", SESSION_COURANTE))).toBe(400);
    expect(d.fermees).not.toHaveBeenCalled();
  });
});

describe("changePassword — ce que l'écran promet avant d'agir", () => {
  it("ferme les AUTRES sessions et épargne celle d'où l'on agit", async () => {
    const { svc, d } = await service("ancien-mdp1", 2);
    const res = await svc.changePassword(COMPTE, "ancien-mdp1", "nouveau-mdp1", SESSION_COURANTE);

    expect(res).toEqual({ otherSessionsClosed: 2 });
    /*
      `id: { not: SESSION_COURANTE }` est TOUTE la promesse de l'écran : « celui-ci restera ouvert ».
      Sans ce filtre, l'utilisateur se déconnecterait lui-même en sécurisant son compte.
    */
    expect(d.fermees).toHaveBeenCalledWith({
      where: { accountId: COMPTE, revokedAt: null, id: { not: SESSION_COURANTE } },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("laisse une trace et prévient l'adresse du compte — seul signal si ce n'était pas lui", async () => {
    const { svc, d } = await service("ancien-mdp1", 0);
    await svc.changePassword(COMPTE, "ancien-mdp1", "nouveau-mdp1", SESSION_COURANTE);

    expect(d.auditEmis).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "m01.password.changed" }));
    expect(d.emailEnvoye).toHaveBeenCalledWith("a@b.cg", expect.stringContaining("mot de passe"), expect.any(String));
  });

  /*
    Une panne du fournisseur d'email n'a pas à faire échouer un changement DÉJÀ enregistré : sinon
    l'utilisateur croit que rien n'a bougé et resaisit son ancien mot de passe, qui ne marche plus.
  */
  it("réussit même si l'email de prévenance ne part pas", async () => {
    const { svc, d } = await service("ancien-mdp1", 1);
    const journal = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    d.emailEnvoye.mockRejectedValue(new Error("fournisseur injoignable"));
    await expect(svc.changePassword(COMPTE, "ancien-mdp1", "nouveau-mdp1", SESSION_COURANTE)).resolves.toEqual({
      otherSessionsClosed: 1,
    });
    journal.mockRestore();
  });
});

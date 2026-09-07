/**
 * Le recours sans session — chantier 63, 07/09/2026 (CU-16-04, loi n° 29-2019).
 *
 * ── Ce que ce chemin existe pour réparer ──────────────────────────────────────────────────────
 *
 * Un compte suspendu reçoit *« Contactez le support pour connaître le motif et les voies de
 * recours »*, et la garde refuse ensuite **chacune** de ses requêtes. La seule voie de support
 * existante exigeant une session, l'invitation était **écrite et impraticable**.
 *
 * On ne lui délivre pas de jeton pour autant — ce serait retirer à la suspension le sens qu'elle a.
 * On lui demande une preuve : un code envoyé à l'adresse du compte, que seul son titulaire relève.
 *
 * ⚠️ Cette voie n'ouvre **aucun pouvoir nouveau** : qui relève cette boîte pouvait déjà
 * réinitialiser le mot de passe du compte. Elle donne le droit d'écrire, et de lire la réponse.
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * **1. Le refus ne dit JAMAIS si l'adresse a un compte.** Sinon cette route publique deviendrait un
 * annuaire : « cette adresse a-t-elle un compte ULAMU ? » se répondrait en lisant l'erreur.
 *
 * ⚠️ Les quatre refus de `consumeOtpOrThrow` — pas de code, code expiré, trop d'essais, code
 * incorrect — restent volontairement DISTINCTS entre eux : ils s'adressent à quelqu'un de légitime
 * qui a besoin de savoir s'il doit redemander un code. Aucun ne parle du compte, et tous les
 * chemins qui pourraient en parler exigent le BON code, donc l'accès à la boîte — c'est-à-dire un
 * pouvoir qui permettait déjà de réinitialiser le mot de passe.
 *
 * **2. Le statut du compte n'est PAS vérifié.** Le limiter aux comptes suspendus répondrait
 * différemment selon le statut — et l'apprendrait à qui pose la question.
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../common/prisma.service";
import { M01Service } from "./m01.service";

const CODE = "123456";
const EMAIL = "titulaire@exemple.cg";
const hash = (c: string): string => createHash("sha256").update(c).digest("hex");

interface Monde {
  /** Un code en attente pour cette adresse, ou aucun. */
  otp?: { codeHash: string; expiresAt: Date; attempts: number } | null;
  compte?: { id: string; type: string; status: string; email: string } | null;
}

function service(monde: Monde): { svc: M01Service; incrementsDEssai: jest.Mock } {
  const incrementsDEssai = jest.fn().mockResolvedValue(undefined);
  const otp = monde.otp === undefined ? null : monde.otp;
  const tx = {
    otpCode: {
      findFirst: jest.fn().mockResolvedValue(otp ? { id: "otp-1", ...otp } : null),
      update: jest.fn().mockResolvedValue(undefined),
    },
    account: { findFirst: jest.fn().mockResolvedValue(monde.compte ?? null) },
  };
  const prisma = {
    // L'incrément d'essai passe par le client RACINE (D-048) : il doit survivre au rollback.
    otpCode: { update: incrementsDEssai },
  } as unknown as PrismaService;

  const svc = new M01Service(
    prisma,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
  return { svc: Object.assign(svc, { __tx: tx }) as M01Service & { __tx: typeof tx }, incrementsDEssai };
}

/** Le `tx` que le service recevrait de `$transaction`. */
function txDe(svc: M01Service): never {
  return (svc as unknown as { __tx: unknown }).__tx as never;
}

const CODE_VALIDE = { codeHash: hash(CODE), expiresAt: new Date(Date.now() + 300_000), attempts: 0 };
const COMPTE = { id: "compte-1", type: "PATIENT", status: "SUSPENDED", email: EMAIL };

describe("consumeSupportAccessOtp — un refus qui ne parle jamais du compte", () => {
  /*
    LE test de ce chantier. Avec le BON code mais aucun compte derrière l'adresse, le refus doit
    ressembler à n'importe quel refus de code — jamais dire « il n'y a pas de compte ici ». Sinon la
    route publique devient un annuaire.
  */
  it("ne dit JAMAIS si l'adresse a un compte, même avec le bon code", async () => {
    const sansCompte = service({ otp: CODE_VALIDE, compte: null });
    const codeFaux = service({ otp: CODE_VALIDE, compte: COMPTE });

    const messageSansCompte = await sansCompte.svc
      .consumeSupportAccessOtp(txDe(sansCompte.svc), EMAIL, CODE)
      .catch((e: Error) => e.message);
    const messageCodeFaux = await codeFaux.svc
      .consumeSupportAccessOtp(txDe(codeFaux.svc), EMAIL, "000000")
      .catch((e: Error) => e.message);

    // Ni « compte », ni « inconnu », ni « inexistant » : le refus parle du CODE, jamais du compte.
    expect(messageSansCompte).not.toMatch(/compte|inconnu|inexistant|introuvable/i);
    expect(messageCodeFaux).not.toMatch(/compte|inconnu|inexistant|introuvable/i);
  });

  it("refuse quand le compte a disparu entre l'envoi et l'usage", async () => {
    const { svc } = service({ otp: CODE_VALIDE, compte: null });
    await expect(svc.consumeSupportAccessOtp(txDe(svc), EMAIL, CODE)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refuse une adresse sans aucun code en attente", async () => {
    const { svc } = service({ otp: null, compte: null });
    await expect(svc.consumeSupportAccessOtp(txDe(svc), "inconnue@exemple.cg", CODE)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  /* D-048 : l'incrément d'essai passe par le client racine, hors transaction — sinon le compteur
     anti-force-brute serait effacé par le rollback de l'appelant. */
  it("compte l'essai raté de façon durable", async () => {
    const { svc, incrementsDEssai } = service({ otp: CODE_VALIDE, compte: COMPTE });
    await expect(svc.consumeSupportAccessOtp(txDe(svc), EMAIL, "000000")).rejects.toThrow();
    expect(incrementsDEssai).toHaveBeenCalledTimes(1);
  });
});

describe("consumeSupportAccessOtp — ce qu'il rend quand le code est bon", () => {
  it("rend le compte, quel que soit son statut", async () => {
    const { svc } = service({ otp: CODE_VALIDE, compte: COMPTE });
    await expect(svc.consumeSupportAccessOtp(txDe(svc), EMAIL, CODE)).resolves.toEqual({
      accountId: "compte-1",
      accountType: "PATIENT",
      status: "SUSPENDED",
      email: EMAIL,
    });
  });

  /*
    Un compte ACTIF n'est pas refusé : le limiter aux comptes non actifs répondrait différemment
    selon le statut, et l'apprendrait à qui pose la question. Celui-là ne gagne rien à passer par
    ici — il a déjà l'écran d'aide dans l'application.
  */
  it("n'interroge pas le statut : un compte actif passe aussi", async () => {
    const { svc } = service({ otp: CODE_VALIDE, compte: { ...COMPTE, status: "ACTIVE" } });
    await expect(svc.consumeSupportAccessOtp(txDe(svc), EMAIL, CODE)).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("normalise l'adresse — une majuscule ne doit pas rater le compte", async () => {
    const { svc } = service({ otp: CODE_VALIDE, compte: COMPTE });
    await expect(svc.consumeSupportAccessOtp(txDe(svc), "  Titulaire@Exemple.CG ", CODE)).resolves.toMatchObject({
      accountId: "compte-1",
    });
  });
});

/**
 * Le tarif de SUIVI n'est pas ouvert à tout le monde — chantier 125, 15/09/2026 (EF-06-12 ; CU-06-05).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **`initiate()` acceptait n'importe quelle offre ACTIVE, `FOLLOW_UP` comprise.** Les écrans ne
 * la proposaient plus depuis longtemps — chantier 65 sur la fiche du soignant, chantier 120 dans le
 * choix de l'offre — mais un simple appel HTTP avec l'`offerId` du suivi vendait toujours une
 * PREMIÈRE consultation au tarif réduit. Et cet identifiant n'a rien de secret : l'annuaire le sert
 * publiquement, à qui le demande.
 *
 * > **Une règle que seul l'écran applique n'est pas une règle : c'est une convention entre gens
 * > bien élevés.**
 *
 * Deux chantiers avaient déjà réparé le symptôme côté écran. Celui-ci ferme la porte.
 *
 * ── Ce que la règle dit exactement ────────────────────────────────────────────────────────────
 *
 * Le suivi est le tarif de quelqu'un qu'on suit DÉJÀ : il exige une consultation antérieure avec CE
 * professionnel, **pour la même personne soignée** — *ce n'est pas le payeur qu'on suit, c'est le
 * patient.*
 *
 * Aucune base : `PrismaService` est réduit à ce que `initiate()` touche avant la transaction.
 */
import { ConflictException } from "@nestjs/common";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { PrismaService } from "../../common/prisma.service";
import { HandshakeService } from "./m06.handshake.service";

const PATIENT = "pat-1";
const PRO = "pro-1";

const ACTEUR = { accountId: PATIENT, accountType: "PATIENT" } as AuthenticatedActor;

interface Monde {
  /** Le type de l'offre demandée. */
  kind: "STANDARD" | "FOLLOW_UP";
  /** Les séances déjà tenues : une par entrée, avec la personne soignée. */
  seances: Array<{ subProfileId: string | null }>;
  /** Le sous-profil pour lequel on demande, s'il y en a un. */
  subProfileId?: string;
}

/** Ce que `initiate()` appelle avant d'arriver à la transaction — pas un gramme de plus. */
function monter(monde: Monde) {
  let compteAppele: { subProfileId: string | null } | null = null;

  const offers = {
    getActiveOffer: async () => ({
      id: "off-1",
      professionalId: PRO,
      label: monde.kind === "FOLLOW_UP" ? "Session de suivi" : "Consultation",
      durationMin: 20,
      priceXaf: 3000,
      kind: monde.kind,
    }),
  };

  const prisma = {
    careSession: {
      count: async (args: { where: { subProfileId: string | null } }) => {
        compteAppele = { subProfileId: args.where.subProfileId };
        return monde.seances.filter((s) => s.subProfileId === args.where.subProfileId).length;
      },
    },
    subProfile: {
      findUnique: async () => ({
        id: monde.subProfileId,
        guardianAccountId: PATIENT,
        status: "DEPENDENT",
        firstName: "Enfant",
        birthDate: new Date("2020-01-01"),
      }),
    },
    /*
      ⚠️ Il manque DÉLIBÉRÉMENT : la suite d'`initiate()` n'est pas bouchonnée. Un appel qui dépasse
      la règle du suivi échoue plus loin, sur un autre message — et c'est ce qu'on veut savoir :
      *que le refus n'a PAS eu lieu ici.* Bouchonner tout ferait un test du parcours complet, pas
      un test de cette règle.
    */
    patientProfile: { findUnique: async () => null },
  } as unknown as PrismaService;

  const service = new HandshakeService(
    prisma,
    { getInt: async () => 300 } as never,
    { emit: async () => undefined } as never,
    { emit: async () => undefined } as never,
    offers as never,
    { isAvailableForInitiation: async () => true } as never,
    { getForProfessional: async () => ({ canPractice: true }) } as never,
    {} as never,
    { settleStaleForProfessional: async () => undefined } as never,
  );

  return { service, compteAppele: () => compteAppele };
}

/** Le message du refus, quel qu'il soit, ou `null` si la règle a laissé passer. */
async function refus(monde: Monde): Promise<string | null> {
  const { service } = monter(monde);
  try {
    await service.initiate(ACTEUR, { offerId: "off-1", ...(monde.subProfileId ? { subProfileId: monde.subProfileId } : {}) });
    return null;
  } catch (e) {
    return e instanceof ConflictException ? (e.message as string) : `AUTRE: ${(e as Error).message}`;
  }
}

describe("Le tarif de suivi", () => {
  /*
    ⚠️ LE test de ce chantier : l'appel direct que les écrans ne font plus, mais que rien
    n'empêchait.
  */
  it("est REFUSÉ à quelqu’un qui n’a jamais consulté ce professionnel", async () => {
    const message = await refus({ kind: "FOLLOW_UP", seances: [] });

    expect(message).toContain("réservé aux patients déjà reçus");
  });

  it("est accepté quand une consultation a déjà eu lieu", async () => {
    const message = await refus({ kind: "FOLLOW_UP", seances: [{ subProfileId: null }] });

    // La règle du suivi laisse passer : l'appel échoue plus loin, sur le profil patient absent.
    expect(message).not.toContain("réservé aux patients déjà reçus");
  });

  /*
    Une consultation ORDINAIRE n'a jamais rien à prouver : c'est par elle qu'on devient patient.
  */
  it("ne gêne en rien une première consultation", async () => {
    const message = await refus({ kind: "STANDARD", seances: [] });

    expect(message).not.toContain("réservé aux patients déjà reçus");
  });
});

/*
  ⚠️ **Ce n'est pas le payeur qu'on suit, c'est le patient.** Sans le sous-profil dans la condition,
  un parent qui a consulté pour lui-même ouvrirait le tarif réduit à la PREMIÈRE consultation de son
  enfant — le défaut même que ce chantier ferme, déplacé d'un cran.
*/
describe("Quand la consultation est pour un proche (Carnet familial)", () => {
  it("compte les séances de CETTE personne, pas celles du parent", async () => {
    const message = await refus({
      kind: "FOLLOW_UP",
      seances: [{ subProfileId: null }], // le parent a consulté pour lui-même
      subProfileId: "enfant-1",
    });

    expect(message).toContain("réservé aux patients déjà reçus");
  });

  it("accepte le suivi de l’enfant quand c’est l’ENFANT qui a déjà consulté", async () => {
    const message = await refus({
      kind: "FOLLOW_UP",
      seances: [{ subProfileId: "enfant-1" }],
      subProfileId: "enfant-1",
    });

    expect(message).not.toContain("réservé aux patients déjà reçus");
  });

  it("interroge bien la base sur la personne soignée", async () => {
    const monde: Monde = { kind: "FOLLOW_UP", seances: [{ subProfileId: "enfant-1" }], subProfileId: "enfant-1" };
    const { service, compteAppele } = monter(monde);

    await service.initiate(ACTEUR, { offerId: "off-1", subProfileId: "enfant-1" }).catch(() => undefined);

    expect(compteAppele()).toEqual({ subProfileId: "enfant-1" });
  });
});

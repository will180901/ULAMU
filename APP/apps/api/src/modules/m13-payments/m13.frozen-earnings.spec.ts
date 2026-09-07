/**
 * L'argent immobilisé — chantier 64, 07/09/2026 (EF-13-10, CU-06-03).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * Mesuré en production le 07/09/2026 : une session du 28/08, **5 000 XAF payés**, consultation
 * tenue, **aucun compte-rendu**. À l'échéance PM-30 le balayage a fait exactement son travail — le
 * professionnel et les super-administrateurs notifiés, en application et en push, trace au journal
 * d'audit. Puis plus rien : **neuf jours plus tard, l'argent n'était ni chez le soignant, ni revenu
 * au patient.**
 *
 * ⚠️ Le mécanisme n'a pas échoué. C'est le SUIVI qui n'existait pas.
 *
 * Une notification est un **événement** : elle passe. De l'argent immobilisé est un **état** : il
 * dure. Un état ne se surveille pas avec une alerte ponctuelle — il se surveille avec une liste qui
 * montre encore le cas le lendemain, jusqu'à ce que quelqu'un tranche.
 *
 * Trois propriétés sont verrouillées ici, et chacune ferait mentir la liste :
 *
 *   1. **on ne liste que ce qui est VRAIMENT gelé** — une session finie il y a une heure n'y est
 *      pas : le soignant a encore le temps d'écrire, et l'y mettre ferait rembourser un dossier
 *      vivant ;
 *   2. **le montant et l'ancienneté sont là** — sans eux, l'écran ne dit ni combien ni depuis quand,
 *      donc ne permet aucune priorité ;
 *   3. **une demande déjà déposée se voit** — sinon deux administrateurs traitent le même dossier
 *      en croyant chacun être le premier.
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { ManualRefundsService } from "./m13.manual-refunds.service";

const PM30_S = 86_400; // 24 h
const JOUR = 86_400_000;

interface SessionFausse {
  id: string;
  orderRef: string;
  endedAt: Date | null;
  status: string;
  reportDepositedAt: Date | null;
  professionalId: string;
  patientAccountId: string;
}

const session = (o: Partial<SessionFausse> = {}): SessionFausse => ({
  id: "sess-1",
  orderRef: "handshake:abc",
  endedAt: new Date(Date.now() - 10 * JOUR),
  status: "ENDED",
  reportDepositedAt: null,
  professionalId: "pro-1",
  patientAccountId: "pat-1",
  ...o,
});

/**
 * Prisma réduit à ce que `listFrozenEarnings` touche — et le filtre `where` est APPLIQUÉ ici.
 *
 * C'est délibéré : si la doublure rendait tout, le test ne prouverait rien du filtre, qui est
 * précisément la règle qu'on défend.
 */
function service(
  sessions: SessionFausse[],
  options: { demandes?: Array<{ paymentId: string; status: string }>; sansPaiement?: boolean } = {},
): ManualRefundsService {
  const prisma = {
    careSession: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { endedAt: { lt: Date } };
        orderBy?: { endedAt?: "asc" | "desc" };
      }) => {
        const gardees = sessions.filter(
          (s) =>
            s.status === "ENDED" &&
            s.reportDepositedAt === null &&
            s.endedAt !== null &&
            s.endedAt.getTime() < where.endedAt.lt.getTime(),
        );
        /*
          Le tri est APPLIQUÉ à partir de l'argument reçu, jamais codé en dur ici : une doublure qui
          trierait d'elle-même laisserait passer un code qui a cessé de demander l'ordre.
        */
        if (orderBy?.endedAt) {
          const sens = orderBy.endedAt === "asc" ? 1 : -1;
          gardees.sort((a, b) => sens * ((a.endedAt as Date).getTime() - (b.endedAt as Date).getTime()));
        }
        return gardees;
      },
    },
    payment: {
      findMany: async () =>
        options.sansPaiement
          ? []
          : sessions.map((s) => ({
              id: `pay-${s.id}`,
              orderRef: s.orderRef,
              amountXaf: 5000,
              status: "SUCCEEDED",
              split: { netXaf: 4500, commissionXaf: 500 },
            })),
    },
    account: {
      findMany: async () => [
        { id: "pro-1", professionalProfile: { firstName: "Awa", lastName: "Mbemba" }, patientProfile: null },
        { id: "pat-1", professionalProfile: null, patientProfile: { firstName: "Jean", lastName: "Loemba" } },
      ],
    },
    manualRefundRequest: { findMany: async () => options.demandes ?? [] },
  } as unknown as PrismaService;

  const params = { getInt: async () => PM30_S } as unknown as ParamsService;
  return new ManualRefundsService(prisma, params, undefined as never, undefined as never);
}

describe("Les gains gelés — ce qui entre dans la liste", () => {
  it("liste une session payée, terminée, sans compte-rendu, au-delà de PM-30", async () => {
    const [ligne] = await service([session()]).listFrozenEarnings();

    expect(ligne.sessionId).toBe("sess-1");
    expect(ligne.amountXaf).toBe(5000);
    expect(ligne.netXaf).toBe(4500);
    expect(ligne.professionalName).toBe("Awa Mbemba");
    expect(ligne.patientName).toBe("Jean Loemba");
  });

  /*
    Le filtre le plus important. Une session terminée il y a une heure n'est PAS gelée : le soignant
    a encore le temps d'écrire son compte-rendu. L'afficher pousserait à rembourser un dossier
    parfaitement vivant.
  */
  it("n'y met PAS une session finie il y a une heure — le délai court encore", async () => {
    const recente = session({ endedAt: new Date(Date.now() - 3_600_000) });
    expect(await service([recente]).listFrozenEarnings()).toEqual([]);
  });

  it("n'y met pas une session dont le compte-rendu a été déposé", async () => {
    const deposee = session({ reportDepositedAt: new Date() });
    expect(await service([deposee]).listFrozenEarnings()).toEqual([]);
  });

  it("n'y met pas une session remboursée — il n'y a plus d'argent immobilisé", async () => {
    expect(await service([session({ status: "REFUNDED" })]).listFrozenEarnings()).toEqual([]);
  });
});

describe("Les gains gelés — ce que la liste doit dire", () => {
  it("dit depuis combien de jours l'argent est immobilisé", async () => {
    // Finie il y a 10 jours, gelée depuis 9 (l'échéance tombe 24 h après la fin).
    const [ligne] = await service([session({ endedAt: new Date(Date.now() - 10 * JOUR) })]).listFrozenEarnings();
    expect(ligne.frozenDays).toBe(9);
  });

  /*
    Sans cette information, deux administrateurs traitent le même dossier en croyant chacun être le
    premier — et la double validation RM-13-06 devient un doublon au lieu d'un garde-fou.
  */
  it("signale qu'une demande de remboursement existe déjà", async () => {
    const svc = service([session()], { demandes: [{ paymentId: "pay-sess-1", status: "PENDING_SECOND_APPROVAL" }] });
    const [ligne] = await svc.listFrozenEarnings();
    expect(ligne.refundRequestStatus).toBe("PENDING_SECOND_APPROVAL");
  });

  it("laisse le champ vide quand personne n'a encore rien demandé", async () => {
    const [ligne] = await service([session()]).listFrozenEarnings();
    expect(ligne.refundRequestStatus).toBeNull();
  });

  /*
    Les plus anciennes d'abord : ce sont elles qui attendent depuis le plus longtemps, et l'ordre est
    la seule chose qui transforme une liste en file de travail.
  */
  it("met les plus anciennes en tête", async () => {
    const vieille = session({ id: "sess-vieille", orderRef: "h:1", endedAt: new Date(Date.now() - 30 * JOUR) });
    const recente = session({ id: "sess-recente", orderRef: "h:2", endedAt: new Date(Date.now() - 3 * JOUR) });
    const lignes = await service([recente, vieille]).listFrozenEarnings();
    expect(lignes.map((l) => l.sessionId)).toEqual(["sess-vieille", "sess-recente"]);
  });

  /*
    Un paiement introuvable est une anomalie — on la MONTRE, champs vides à l'appui, plutôt que de
    retirer la ligne. Une ligne absente se prend pour « rien à signaler » ; ici il y a bien quelque
    chose, et c'est même plus grave.
  */
  it("montre quand même la session dont le paiement est introuvable", async () => {
    const [ligne] = await service([session()], { sansPaiement: true }).listFrozenEarnings();
    expect(ligne.sessionId).toBe("sess-1");
    expect(ligne.amountXaf).toBeNull();
    expect(ligne.paymentId).toBeNull();
  });

  it("ne fait aucune requête quand rien n'est gelé", async () => {
    expect(await service([]).listFrozenEarnings()).toEqual([]);
  });
});

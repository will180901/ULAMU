/**
 * Le reçu porte le libellé de ce qui a été acheté — chantier 126, 15/09/2026 (EF-13-05).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ Le reçu du patient affichait « Consultation », un mot **deviné** par l'écran depuis la
 * référence d'ordre. Le soignant nomme pourtant son offre librement : quelqu'un qui avait payé
 * « Bilan santé 60 min » recevait un reçu disant « Consultation ».
 *
 * > **Un reçu est une trace : il doit dire ce qui a été acheté, pas la catégorie dans laquelle on
 * > le range.**
 *
 * ── Ce que ces tests NE disent pas ────────────────────────────────────────────────────────────
 *
 * 📌 **M13 reste AVEUGLE au métier (RM-13-01).** Il ne fabrique aucun libellé, n'en déduit aucun et
 * n'en corrige aucun : il range ce que l'appelant lui donne, et le ressort tel quel. *Le jour où il
 * commencerait à interpréter ce texte, il faudrait lui apprendre tous les métiers de la
 * plateforme.*
 *
 * Aucune base : `PrismaService` est réduit à ce que la lecture des reçus touche.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PaymentsService } from "./m13.payments.service";
import { PrismaService } from "../../common/prisma.service";

interface Ligne {
  number: string;
  kind: string;
  orderRef: string;
  amountXaf: number;
  label: string | null;
}

function monter(lignes: Ligne[]) {
  const prisma = {
    receipt: {
      findMany: async () =>
        lignes.map((l, i) => ({
          number: l.number,
          kind: l.kind,
          createdAt: new Date(Date.UTC(2026, 8, 10 + i)),
          payment: { orderRef: l.orderRef, amountXaf: l.amountXaf, label: l.label },
        })),
    },
  } as unknown as PrismaService;

  return new PaymentsService(prisma, {} as never, {} as never, {} as never, {} as never);
}

describe("Les reçus d'un patient", () => {
  /*
    ⚠️ LE test de ce chantier : le nom choisi par le soignant arrive jusqu'au reçu.
  */
  it("portent le libellé figé au moment de la commande", async () => {
    const service = monter([
      { number: "R-001", kind: "PAYMENT", orderRef: "handshake:h1", amountXaf: 12000, label: "Bilan santé 60 min" },
    ]);

    const recus = await service.listReceiptsForPayer("pat-1");

    expect(recus[0].label).toBe("Bilan santé 60 min");
    expect(recus[0].amountXaf).toBe(12000);
  });

  /*
    Les paiements d'avant la colonne n'ont rien à inventer : l'écran retombe alors sur sa
    déduction. *Une colonne vide ment moins qu'un nom fabriqué.*
  */
  it("rendent `null` — jamais un nom inventé — pour les paiements d'avant", async () => {
    const service = monter([{ number: "R-000", kind: "PAYMENT", orderRef: "handshake:vieux", amountXaf: 5000, label: null }]);

    const recus = await service.listReceiptsForPayer("pat-1");

    expect(recus[0].label).toBeNull();
  });

  /*
    ⚠️ M13 ne corrige rien : un libellé bizarre reste tel quel côté serveur. C'est l'écran qui
    décide de ne pas afficher un texte vide — et lui seul. *Deux endroits qui nettoient la même
    donnée finissent par la nettoyer différemment.*
  */
  it("ne réécrivent ni ne devinent le libellé", async () => {
    const service = monter([
      { number: "R-002", kind: "PAYMENT", orderRef: "disclosure:d1", amountXaf: 500, label: "   " },
      { number: "R-003", kind: "REFUND", orderRef: "handshake:h2", amountXaf: 5000, label: "Consultation de nuit" },
    ]);

    const recus = await service.listReceiptsForPayer("pat-1");

    expect(recus[0].label).toBe("   ");
    expect(recus[1].label).toBe("Consultation de nuit");
    expect(recus[1].kind).toBe("REFUND");
  });
});

/*
  ── ⚠️ Les deux fautes que rien ne retenait ───────────────────────────────────────────────────

  L'injection du 15/09 l'a montré : on pouvait faire inventer un libellé à M13, et faire relire à
  M06 l'offre VIVANTE au lieu du libellé figé — **sans qu'un seul test tombe**. La seconde est la
  régression exacte du chantier 118.

  Ces deux règles vivent dans une ligne d'affectation, pas dans une fonction qu'on peut appeler :
  les éprouver demanderait de bouchonner une transaction entière, un découpage de commission et un
  journal d'audit pour vérifier un `??`. On les ancre donc dans la SOURCE, comme le filet des
  promesses d'écran le fait déjà.

  *Un test faible sur une règle que rien ne gardait vaut mieux qu'un test parfait qu'on n'écrit
  pas.*
*/
describe("Ce que le code ne doit jamais se remettre à faire", () => {
  const sourceM13 = readFileSync(resolve(__dirname, "m13.payments.service.ts"), "utf8");
  const sourceM06 = readFileSync(
    resolve(__dirname, "..", "m06-handshake-session", "m06.handshake.service.ts"),
    "utf8",
  );

  /*
    M13 est AVEUGLE au métier (RM-13-01). Le jour où il se mettrait à nommer les choses lui-même,
    il faudrait lui apprendre tous les métiers de la plateforme — et son libellé contredirait celui
    de l'appelant le jour où les deux divergent.
  */
  it("M13 range le libellé de l'appelant, et n'en invente jamais", () => {
    expect(/label: order\.label \?\? null/.test(sourceM13)).toBe(true);
  });

  /*
    ⚠️ **La régression du chantier 118, en une ligne.** Le soignant peut renommer son offre entre la
    demande et le paiement ; le reçu doit porter ce que le patient a LU. *Un reçu qui suit sa source
    n'est plus une trace.*
  */
  it("M06 envoie le libellé FIGÉ, l'offre vivante seulement en repli", () => {
    expect(/label: fresh\.offerLabel \?\? offer\.label/.test(sourceM06)).toBe(true);
  });
});

/**
 * La cloche ne sonne que si le soignant est RÉSERVABLE — chantier 65, 07/09/2026 (CU-05-05).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * La notification dit, mot pour mot : *« Vous pouvez initier une consultation depuis l'annuaire. »*
 *
 * ⚠️ Sans **offre active**, c'est faux : le serveur exige un `offerId`, et le patient rappelé par la
 * cloche se heurte à une impasse. Être en ligne ne suffit pas — encore faut-il vendre quelque chose.
 *
 * Mesuré en production le 07/09/2026 : le SEUL soignant de l'annuaire était exactement dans ce cas,
 * ses deux offres désactivées. La cloche aurait rappelé des patients vers un mur.
 *
 * **L'alerte n'est pas consommée pour autant** : `notifiedAt` reste nul, et elle sonnera au prochain
 * retour en ligne — quand une offre existera. Une alerte brûlée pour rien serait pire que pas
 * d'alerte du tout : le patient aurait attendu, et n'aurait plus rien.
 *
 * Aucune base : `PrismaService` est réduit à ce que la méthode touche (projet Jest « unit »).
 */
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { PresenceService } from "./m05.presence.service";

const PRO = "pro-1";
const PM26_S = 300;

interface Monde {
  /** Une offre STANDARD active existe-t-elle ? */
  offreActive: boolean;
  /** Les alertes en attente, non notifiées. */
  alertes: Array<{ id: string; patientId: string }>;
}

function monter(monde: Monde) {
  const notifications: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const reservees: string[] = [];

  const tx = {
    presenceStatus: {
      findUnique: async () => ({
        accountId: PRO,
        state: "OFFLINE",
        since: new Date(Date.now() - 3_600_000),
        lastHeartbeatAt: new Date(Date.now() - 3_600_000),
      }),
      upsert: async () => ({
        accountId: PRO,
        state: "ONLINE",
        since: new Date(),
        lastHeartbeatAt: new Date(),
      }),
      update: async () => ({
        accountId: PRO,
        state: "ONLINE",
        since: new Date(),
        lastHeartbeatAt: new Date(),
      }),
    },
    careOffer: {
      findFirst: async ({ where }: { where: { active: boolean; kind: string } }) =>
        monde.offreActive && where.active && where.kind === "STANDARD" ? { id: "offer-1" } : null,
    },
    availabilityAlert: {
      findMany: async () => monde.alertes,
      updateMany: async ({ where }: { where: { id: string } }) => {
        reservees.push(where.id);
        return { count: 1 };
      },
    },
  };

  const prisma = {
    $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;

  const service = new PresenceService(
    prisma,
    { getInt: async () => PM26_S } as unknown as ParamsService,
    {
      emit: async (_tx: unknown, e: { type: string; payload: Record<string, unknown> }) => void notifications.push(e),
    } as unknown as OutboxService,
    { emit: async () => undefined } as unknown as AuditEmitter,
  );
  return { service, notifications, reservees };
}

const UNE_ALERTE = [{ id: "alerte-1", patientId: "pat-1" }];

describe("La cloche d'alerte — être en ligne ne suffit pas", () => {
  it("sonne quand le soignant revient en ligne AVEC une offre active", async () => {
    const { service, notifications } = monter({ offreActive: true, alertes: UNE_ALERTE });
    await service.heartbeat(PRO);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].payload).toMatchObject({ accountId: "pat-1", template: "m05.pro.available" });
  });

  /*
    LE test de ce chantier. La notification promet « vous pouvez initier une consultation » — sans
    offre, elle rappelle le patient vers une impasse.
  */
  it("ne sonne PAS sans offre active — la promesse serait fausse", async () => {
    const { service, notifications } = monter({ offreActive: false, alertes: UNE_ALERTE });
    await service.heartbeat(PRO);

    expect(notifications).toHaveLength(0);
  });

  /*
    Et surtout : l'alerte n'est pas CONSOMMÉE. Une alerte brûlée pour rien serait pire que pas
    d'alerte du tout — le patient aurait attendu, et n'aurait plus rien.
  */
  it("garde l'alerte armée pour le prochain retour en ligne", async () => {
    const { service, reservees } = monter({ offreActive: false, alertes: UNE_ALERTE });
    await service.heartbeat(PRO);

    expect(reservees).toEqual([]);
  });

  it("sonne pour chaque patient en attente, une seule fois chacun", async () => {
    const { service, notifications, reservees } = monter({
      offreActive: true,
      alertes: [
        { id: "a1", patientId: "pat-1" },
        { id: "a2", patientId: "pat-2" },
      ],
    });
    await service.heartbeat(PRO);

    expect(notifications.map((n) => n.payload.accountId)).toEqual(["pat-1", "pat-2"]);
    expect(reservees).toEqual(["a1", "a2"]);
  });

  it("ne sonne pour personne quand personne n'attend", async () => {
    const { service, notifications } = monter({ offreActive: true, alertes: [] });
    await service.heartbeat(PRO);
    expect(notifications).toHaveLength(0);
  });
});

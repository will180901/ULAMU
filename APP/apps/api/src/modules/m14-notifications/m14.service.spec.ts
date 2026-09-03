/**
 * M14 — le centre in-app : ce que « tout marquer comme lu » a le droit de toucher.
 *
 * ── Pourquoi ce fichier existe (chantier 37, 03/09/2026) ──────────────────────────────────────
 *
 * En branchant le tiroir de notifications du web, une route manquait : la lecture GROUPÉE. La
 * suppression groupée existait depuis le début (`deleteManyMine`), la lecture non — le web aurait
 * dû envoyer une requête par ligne.
 *
 * En l'écrivant, un constat : **le centre in-app n'était éprouvé nulle part.** Ni test unitaire, ni
 * test d'intégration ne touchait `listMine`, `markRead`, `unreadCount` ou les suppressions. Ce
 * fichier ne comble pas tout ce trou — il verrouille le seul point où une erreur serait grave.
 *
 * ── Le point grave : le cloisonnement ─────────────────────────────────────────────────────────
 *
 * `markAllRead` est un `updateMany` : il écrit sur un ENSEMBLE de lignes que seule sa clause `where`
 * délimite. Un `accountId` oublié et la route marque comme lues les notifications de toute la
 * plateforme, sans erreur, sans trace visible. C'est exactement le genre de faute qu'aucun essai à
 * l'écran ne révèle — l'utilisateur qui clique voit bien son badge tomber à zéro.
 *
 * Le test lit donc la clause `where` réellement envoyée à Prisma, et vérifie ses quatre bornes :
 * le compte, le canal, l'état non-lu, et la fenêtre de rétention PM-37.
 *
 * ⚠️ Aucune base n'est ouverte ici : `PrismaService` et `ParamsService` sont remplacés par des
 * doublures. C'est délibéré — les suites d'intégration vident la base, et la base de ce projet est
 * celle du site en ligne (voir `test/garde-base-de-test.ts`).
 */
import { NotificationsService } from "./m14.service";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { PushGateway } from "./m14.push.gateway";

/** La forme exacte de l'argument que le service passe à `updateMany`. */
type AppelUpdateMany = {
  where: {
    accountId?: string;
    channel?: string;
    readAt?: Date | null;
    createdAt?: { gte?: Date };
  };
  data: { readAt?: Date; status?: string };
};

/** Doublures minimales : on n'éprouve pas Prisma, on éprouve ce qu'on lui demande. */
function service(retentionDays: number, count: number) {
  const appels: AppelUpdateMany[] = [];
  const prisma = {
    notification: {
      updateMany: jest.fn(async (args: AppelUpdateMany) => {
        appels.push(args);
        return { count };
      }),
    },
  } as unknown as PrismaService;
  const params = { getInt: jest.fn(async () => retentionDays) } as unknown as ParamsService;
  const svc = new NotificationsService(
    prisma,
    params,
    {} as OutboxService,
    {} as AuditEmitter,
    {} as PushGateway,
  );
  return { svc, appels, params };
}

describe("M14 · markAllRead — tout marquer comme lu", () => {
  it("ne touche QUE le compte demandé, en in-app, et seulement le non-lu", async () => {
    const { svc, appels } = service(30, 4);

    const res = await svc.markAllRead("compte-a");

    expect(res).toEqual({ read: 4 });
    expect(appels).toHaveLength(1);
    // Les trois bornes du cloisonnement. Sans l'une d'elles, la route déborde silencieusement.
    expect(appels[0].where.accountId).toBe("compte-a");
    expect(appels[0].where.channel).toBe("IN_APP");
    expect(appels[0].where.readAt).toBeNull();
    // Et l'écriture : une date de lecture ET le statut, comme `markRead` sur une seule ligne.
    expect(appels[0].data.readAt).toBeInstanceOf(Date);
    expect(appels[0].data.status).toBe("READ");
  });

  /*
    La quatrième borne. « Tout marquer comme lu » ne doit rien promettre de plus que le « tout » que
    l'utilisateur a sous les yeux : sa liste et son badge s'arrêtent à PM-37, ce geste aussi.
  */
  it("s’arrête à la fenêtre de rétention PM-37, comme la liste et le badge", async () => {
    const { svc, appels, params } = service(30, 0);
    const avant = Date.now();

    await svc.markAllRead("compte-a");

    expect(params.getInt).toHaveBeenCalledWith("PM-37");
    const depuis = appels[0].where.createdAt?.gte;
    expect(depuis).toBeInstanceOf(Date);
    // 30 jours en arrière, à la seconde d'exécution près.
    const ecart = Math.abs((depuis as Date).getTime() - (avant - 30 * 86_400_000));
    expect(ecart).toBeLessThan(5_000);
  });

  /*
    La rétention vient du paramètre métier, jamais d'une constante du code : un porteur qui règle
    PM-37 à 7 jours doit voir ce geste se réduire d'autant.
  */
  it("suit PM-37 quand le paramètre change", async () => {
    const { svc, appels } = service(7, 0);
    const avant = Date.now();

    await svc.markAllRead("compte-a");

    const depuis = appels[0].where.createdAt?.gte as Date;
    const ecart = Math.abs(depuis.getTime() - (avant - 7 * 86_400_000));
    expect(ecart).toBeLessThan(5_000);
  });

  /*
    Idempotence : rien à marquer est un succès. Le tiroir peut donc rejouer le geste — au retour du
    réseau, sur un double-clic — sans afficher d'erreur à un utilisateur qui n'a rien fait de mal.
  */
  it("renvoie zéro sans lever quand il n’y a rien à marquer", async () => {
    const { svc } = service(30, 0);
    await expect(svc.markAllRead("compte-a")).resolves.toEqual({ read: 0 });
  });
});

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
 * test d'intégration ne touchait `listMine`, `markRead`, `unreadCount` ou les suppressions.
 *
 * ── Pourquoi ce fichier couvre désormais les CINQ routes (03/09, second passage) ───────────────
 *
 * La première version ne verrouillait que `markAllRead`, et renvoyait le reste à la dette n°22 avec
 * une recommandation : *attendre la branche Neon de test plutôt que d'écrire deux heures de
 * doublures qu'un vrai test d'intégration rendrait redondantes.*
 *
 * **Le porteur a tranché le 03/09 : il n'y aura pas de base de test.** La recommandation est donc
 * caduque — ce qui n'est pas éprouvé ici ne le sera jamais ailleurs. Les cinq routes sont couvertes.
 *
 * ⚠️ **Ce que ces tests ne prouvent PAS**, et il faut le savoir : ils vérifient la REQUÊTE envoyée
 * à Prisma, pas ce que Postgres en fait. Une contrainte d'intégrité, un index manquant, une
 * transaction mal bornée leur échapperaient. C'est le prix d'une base unique, et il est assumé.
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Les quatre autres routes du centre in-app — dette n°22, soldée le 03/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Une ligne de la table `Notification`, telle que Prisma la rendrait. */
interface LigneNotification {
  id: string;
  accountId: string;
  template: string;
  payload: Record<string, unknown>;
  category: string;
  channel: string;
  priority: string;
  readAt: Date | null;
  createdAt: Date;
}

function ligne(p: Partial<LigneNotification> = {}): LigneNotification {
  return {
    id: "n1",
    accountId: "compte-a",
    template: "m06.handshake.initiated",
    payload: { patientFirstName: "Grâce", patientAge: "34" },
    category: "care",
    channel: "IN_APP",
    priority: "normal",
    readAt: null,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    ...p,
  };
}

/** Ce que le service a demandé à Prisma — c'est CELA qu'on éprouve, faute de base. */
interface Journal {
  findMany: Array<Record<string, unknown>>;
  findFirst: Array<Record<string, unknown>>;
  updateMany: Array<Record<string, unknown>>;
  deleteMany: Array<Record<string, unknown>>;
  count: Array<Record<string, unknown>>;
}

/**
 * Une doublure plus complète que celle du haut : elle sert des lignes et note tout.
 *
 * `ancreTrouvee` décide si le curseur de pagination est reconnu comme appartenant au compte —
 * c'est le seul levier qui permette d'éprouver le refus d'un curseur volé.
 */
function centre(
  opts: {
    retentionDays?: number;
    lignes?: LigneNotification[];
    count?: number;
    compte?: number;
    ancreTrouvee?: boolean;
  } = {},
) {
  const journal: Journal = { findMany: [], findFirst: [], updateMany: [], deleteMany: [], count: [] };
  const prisma = {
    notification: {
      findMany: jest.fn(async (args: Record<string, unknown>) => {
        journal.findMany.push(args);
        return opts.lignes ?? [];
      }),
      findFirst: jest.fn(async (args: Record<string, unknown>) => {
        journal.findFirst.push(args);
        return opts.ancreTrouvee === false ? null : { id: "curseur" };
      }),
      updateMany: jest.fn(async (args: Record<string, unknown>) => {
        journal.updateMany.push(args);
        return { count: opts.count ?? 1 };
      }),
      deleteMany: jest.fn(async (args: Record<string, unknown>) => {
        journal.deleteMany.push(args);
        return { count: opts.count ?? 1 };
      }),
      count: jest.fn(async (args: Record<string, unknown>) => {
        journal.count.push(args);
        return opts.compte ?? 0;
      }),
    },
  } as unknown as PrismaService;
  const params = { getInt: jest.fn(async () => opts.retentionDays ?? 30) } as unknown as ParamsService;
  const svc = new NotificationsService(
    prisma,
    params,
    {} as OutboxService,
    {} as AuditEmitter,
    {} as PushGateway,
  );
  return { svc, journal };
}

describe("M14 · listMine — l'historique du centre in-app", () => {
  /*
    LA borne de ce fichier, répétée route par route : le compte. Un `accountId` oublié dans un
    `findMany` sert à un utilisateur les notifications de quelqu'un d'autre — un patient nommé, un
    montant, un motif de refus. C'est une fuite de données de santé, et elle serait silencieuse.
  */
  it("ne lit QUE les notifications du compte demandé, et seulement l'in-app", async () => {
    const { svc, journal } = centre({ lignes: [ligne()] });

    await svc.listMine("compte-a");

    const w = journal.findMany[0].where as Record<string, unknown>;
    expect(w.accountId).toBe("compte-a");
    expect(w.channel).toBe("IN_APP");
  });

  it("s'arrête à la fenêtre de rétention PM-37", async () => {
    const { svc, journal } = centre({ retentionDays: 30, lignes: [] });
    const avant = Date.now();

    await svc.listMine("compte-a");

    const w = journal.findMany[0].where as { createdAt?: { gte?: Date } };
    const depuis = w.createdAt?.gte as Date;
    expect(depuis).toBeInstanceOf(Date);
    expect(Math.abs(depuis.getTime() - (avant - 30 * 86_400_000))).toBeLessThan(5_000);
  });

  /*
    Du plus récent au plus ancien, et l'`id` en second critère. Sans lui, deux notifications nées
    dans la même transaction — cas courant : une séance qui démarre en prévient deux fois — peuvent
    s'échanger de place d'une page à l'autre, et la pagination sauterait ou répéterait une ligne.
  */
  it("ordonne du plus récent au plus ancien, l'id départageant les ex æquo", async () => {
    const { svc, journal } = centre({ lignes: [] });

    await svc.listMine("compte-a");

    expect(journal.findMany[0].orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  /*
    Le texte n'est PAS lu en base : il est rendu au moment de la lecture, depuis le catalogue
    (EF-14-03). C'est ce qui permet de corriger une formulation fautive pour les notifications déjà
    reçues — et c'est exactement ce dont le chantier 29 a eu besoin.
  */
  it("rend le texte depuis le catalogue, et non depuis la base", async () => {
    const { svc } = centre({ lignes: [ligne()] });

    const res = await svc.listMine("compte-a");

    expect(res.items[0].title).toBe("Nouvelle demande de consultation");
    expect(res.items[0].body).toContain("Grâce");
    expect(res.items[0].body).toContain("34");
  });

  /* Un modèle inconnu ne fait pas tomber la liste entière : le gabarit générique prend le relais. */
  it("survit à un modèle absent du catalogue", async () => {
    const { svc } = centre({ lignes: [ligne({ template: "m99.parti.en.fumee" })] });

    const res = await svc.listMine("compte-a");

    expect(res.items).toHaveLength(1);
    expect(res.items[0].title).toBeTruthy();
    expect(res.items[0].body).toBeTruthy();
  });

  /*
    La pagination demande `take + 1` : la ligne surnuméraire sert UNIQUEMENT à savoir s'il reste une
    page. Elle ne doit jamais être servie au client.
  */
  it("demande une ligne de plus que la page, et ne la sert pas", async () => {
    const trop = Array.from({ length: 4 }, (_, i) => ligne({ id: `n${i}` }));
    const { svc, journal } = centre({ lignes: trop });

    const res = await svc.listMine("compte-a", undefined, 3);

    expect(journal.findMany[0].take).toBe(4);
    expect(res.items).toHaveLength(3);
    expect(res.nextCursor).toBe("n2"); // le dernier SERVI, pas le surnuméraire
  });

  it("dit qu'il n'y a plus de page quand le serveur n'en a pas rendu de trop", async () => {
    const { svc } = centre({ lignes: [ligne({ id: "a" }), ligne({ id: "b" })] });

    const res = await svc.listMine("compte-a", undefined, 3);

    expect(res.items).toHaveLength(2);
    expect(res.nextCursor).toBeNull();
  });

  /*
    Le curseur est un identifiant de notification, donc une valeur que le client fabrique. Celui
    d'un AUTRE compte doit être refusé — sinon la pagination devient un chemin de lecture latérale :
    « donne-moi ce qui suit la notification n°X », X appartenant à quelqu'un d'autre.
  */
  it("refuse un curseur qui n'appartient pas au compte", async () => {
    const { svc, journal } = centre({ ancreTrouvee: false });

    await expect(svc.listMine("compte-a", "curseur-vole")).rejects.toThrow(/[Cc]urseur/);

    // Et la vérification de l'ancre est elle-même cloisonnée.
    const w = journal.findFirst[0].where as Record<string, unknown>;
    expect(w.accountId).toBe("compte-a");
    expect(w.channel).toBe("IN_APP");
    // Rien n'a été lu : le refus est arrivé AVANT la requête de page.
    expect(journal.findMany).toHaveLength(0);
  });

  it("saute la ligne du curseur quand il est valide — pas de doublon entre deux pages", async () => {
    const { svc, journal } = centre({ lignes: [ligne()], ancreTrouvee: true });

    await svc.listMine("compte-a", "curseur");

    expect(journal.findMany[0].cursor).toEqual({ id: "curseur" });
    expect(journal.findMany[0].skip).toBe(1);
  });

  /* Le plafond technique protège la base : une page de dix mille lignes n'est pas une page. */
  it("plafonne la taille de page réclamée", async () => {
    const { svc, journal } = centre({ lignes: [] });

    await svc.listMine("compte-a", undefined, 100_000);

    expect(journal.findMany[0].take as number).toBeLessThanOrEqual(101);
  });
});

describe("M14 · markRead — marquer UNE notification comme lue", () => {
  it("ne touche que la sienne, en in-app, et seulement si elle est non lue", async () => {
    const { svc, journal } = centre({ count: 1 });

    const res = await svc.markRead("compte-a", "n1");

    expect(res).toEqual({ id: "n1", read: true });
    const w = journal.updateMany[0].where as Record<string, unknown>;
    expect(w.id).toBe("n1");
    expect(w.accountId).toBe("compte-a");
    expect(w.channel).toBe("IN_APP");
    expect(w.readAt).toBeNull();
  });

  /*
    Idempotence (D-046) : rejouer le geste sur une notification déjà lue est un SUCCÈS. Le tiroir
    peut donc renvoyer la requête après une coupure réseau sans afficher d'erreur à quelqu'un qui
    n'a rien fait de mal. Le service le distingue de l'absence par une seconde lecture.
  */
  it("réussit sans rien réécrire sur une notification déjà lue", async () => {
    const { svc, journal } = centre({ count: 0, ancreTrouvee: true });

    await expect(svc.markRead("compte-a", "n1")).resolves.toEqual({ id: "n1", read: true });

    expect(journal.findFirst).toHaveLength(1);
  });

  /*
    Mais une notification qui n'existe pas, ou qui n'est pas à soi, donne 404 — et non un succès.
    Un succès silencieux ferait croire à un client qu'il vient de lire quelque chose qui n'est pas
    à lui, et masquerait une tentative d'accès latéral.
  */
  it("répond introuvable quand la notification n'est pas à soi", async () => {
    const { svc, journal } = centre({ count: 0, ancreTrouvee: false });

    await expect(svc.markRead("compte-a", "n-dautrui")).rejects.toThrow(/introuvable/i);

    const w = journal.findFirst[0].where as Record<string, unknown>;
    expect(w.accountId).toBe("compte-a");
  });
});

describe("M14 · deleteMine — supprimer UNE notification", () => {
  it("ne supprime que la sienne, et en in-app", async () => {
    const { svc, journal } = centre({ count: 1 });

    const res = await svc.deleteMine("compte-a", "n1");

    expect(res).toEqual({ id: "n1", deleted: true });
    const w = journal.deleteMany[0].where as Record<string, unknown>;
    expect(w.id).toBe("n1");
    expect(w.accountId).toBe("compte-a");
    expect(w.channel).toBe("IN_APP");
  });

  /*
    Zéro ligne supprimée = 404, jamais un succès. C'est ce qui distingue « j'ai supprimé » de
    « il n'y avait rien à supprimer, ou ce n'était pas à vous » — deux réponses qu'un écran doit
    pouvoir montrer différemment.
  */
  it("répond introuvable quand rien n'a été supprimé", async () => {
    const { svc } = centre({ count: 0 });

    await expect(svc.deleteMine("compte-a", "n-dautrui")).rejects.toThrow(/introuvable/i);
  });
});

describe("M14 · deleteManyMine — supprimer un lot", () => {
  /*
    Le cas le plus dangereux du module : une suppression en LOT dont la seule borne est la clause
    `where`. Un `accountId` oublié ici, et une liste d'identifiants devinés efface les
    notifications d'autres comptes — sans erreur, sans trace, définitivement.
  */
  it("ne supprime que dans son propre compte, quels que soient les identifiants reçus", async () => {
    const { svc, journal } = centre({ count: 2 });

    const res = await svc.deleteManyMine("compte-a", ["n1", "n-dautrui", "n-inconnu"]);

    expect(res).toEqual({ deleted: 2 });
    const w = journal.deleteMany[0].where as Record<string, unknown>;
    expect(w.accountId).toBe("compte-a");
    expect(w.channel).toBe("IN_APP");
    expect(w.id).toEqual({ in: ["n1", "n-dautrui", "n-inconnu"] });
  });

  /* Un lot qui ne correspond à rien n'est pas une erreur : c'est zéro suppression. */
  it("rend zéro sans lever quand aucun identifiant ne correspond", async () => {
    const { svc } = centre({ count: 0 });

    await expect(svc.deleteManyMine("compte-a", ["x"])).resolves.toEqual({ deleted: 0 });
  });
});

describe("M14 · unreadCount — le badge", () => {
  it("compte les non-lues du seul compte demandé, en in-app", async () => {
    const { svc, journal } = centre({ compte: 7 });

    const res = await svc.unreadCount("compte-a");

    expect(res).toEqual({ unread: 7 });
    const w = journal.count[0].where as Record<string, unknown>;
    expect(w.accountId).toBe("compte-a");
    expect(w.channel).toBe("IN_APP");
    expect(w.readAt).toBeNull();
  });

  /*
    Le badge et la liste doivent s'arrêter à la MÊME date. Sinon le compteur annonce des non-lues
    que la liste ne montre pas : l'utilisateur cherche une notification introuvable, et rien ne
    fait jamais retomber son badge à zéro.
  */
  it("s'arrête à la même fenêtre PM-37 que la liste", async () => {
    const { svc, journal } = centre({ retentionDays: 12, compte: 0 });
    const avant = Date.now();

    await svc.unreadCount("compte-a");

    const w = journal.count[0].where as { createdAt?: { gte?: Date } };
    const depuis = w.createdAt?.gte as Date;
    expect(Math.abs(depuis.getTime() - (avant - 12 * 86_400_000))).toBeLessThan(5_000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Les préférences — dette n°18, soldée le 03/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { CATEGORIES_WITH_TEMPLATES, CATEGORY_LABELS, NOTIFICATION_CATEGORIES, TEMPLATE_CATALOG } from "./m14.templates";

/** Une doublure qui sert les lignes de préférence trouvées en base — aucune n'est nécessaire. */
function avecPreferences(rows: Array<{ category: string; enabled: boolean }> = []) {
  const prisma = {
    notificationPreference: { findMany: jest.fn(async () => rows) },
  } as unknown as PrismaService;
  const svc = new NotificationsService(
    prisma,
    {} as ParamsService,
    {} as OutboxService,
    {} as AuditEmitter,
    {} as PushGateway,
  );
  return svc;
}

describe("M14 · les catégories réellement alimentées", () => {
  /*
    LE test de la dette n°18. `reminder` est déclarée depuis le premier jour et AUCUN modèle ne l'a
    jamais portée : son interrupteur ne coupait rien, et on lui confiait le silence de rappels qui
    n'existent pas.

    Le web l'avait retirée à la main (chantier 29), le mobile l'affichait encore (chantier 30). Elle
    est désormais COMPTÉE — et le jour où un premier rappel sera écrit, elle reviendra d'elle-même
    dans les deux applications sans que personne ait à y penser.
  */
  it("n'offre aucune catégorie que rien n'alimente", () => {
    const portees = new Set(Object.values(TEMPLATE_CATALOG).map((t) => t.category));

    // "system" est portée par le gabarit de repli même si aucun modèle nommé ne l'a.
    const alimentees = NOTIFICATION_CATEGORIES.filter((c) => portees.has(c) || c === "system");
    expect([...CATEGORIES_WITH_TEMPLATES]).toEqual([...alimentees]);
  });

  it("écarte `reminder`, et garde les quatre autres", () => {
    expect(CATEGORIES_WITH_TEMPLATES).not.toContain("reminder");
    expect([...CATEGORIES_WITH_TEMPLATES].sort()).toEqual(["care", "critical", "money", "system"]);
  });

  /* L'ordre d'affichage ne doit pas dépendre de l'ordre des clés d'un objet, qui n'est pas un contrat. */
  it("garde l'ordre déclaré des catégories", () => {
    const attendu = NOTIFICATION_CATEGORIES.filter((c) => CATEGORIES_WITH_TEMPLATES.includes(c));
    expect(CATEGORIES_WITH_TEMPLATES).toEqual(attendu);
  });

  /* Un intitulé manquant enverrait `undefined` à un écran : chaque catégorie doit avoir le sien. */
  it("donne un intitulé et une aide à chaque catégorie déclarée", () => {
    const sansTexte = NOTIFICATION_CATEGORIES.filter(
      (c) => !CATEGORY_LABELS[c]?.label || !CATEGORY_LABELS[c]?.help,
    );
    expect(sansTexte).toEqual([]);
  });
});

describe("M14 · getPreferences — ce que les deux écrans reçoivent", () => {
  /*
    Le texte descend au serveur. Il était écrit deux fois à la main — web et mobile — et les deux
    avaient DÉJÀ divergé : « Service » contre « Système & compte », « Consultations » contre
    « Consultations & soins ». Deux utilisateurs de la même plateforme ne lisaient pas le même nom
    pour le même réglage.
  */
  it("sert l'intitulé et l'aide de chaque catégorie", async () => {
    const res = await avecPreferences().getPreferences("compte-a");

    const care = res.preferences.find((p) => p.category === "care");
    expect(care?.label).toBe(CATEGORY_LABELS.care.label);
    expect(care?.help).toBe(CATEGORY_LABELS.care.help);
    expect(res.preferences.filter((p) => !p.label || !p.help).map((p) => p.category)).toEqual([]);
  });

  it("ne sert que les catégories alimentées", async () => {
    const res = await avecPreferences().getPreferences("compte-a");

    expect(res.preferences.map((p) => p.category)).toEqual([...CATEGORIES_WITH_TEMPLATES]);
  });

  /* Aucune ligne en base = tout est activé : c'est le défaut, et il est explicite (EF-14-04). */
  it("active tout par défaut quand le compte n'a jamais rien réglé", async () => {
    const res = await avecPreferences([]).getPreferences("compte-a");

    expect(res.preferences.every((p) => p.enabled)).toBe(true);
  });

  it("suit le réglage du compte quand il existe", async () => {
    const res = await avecPreferences([{ category: "money", enabled: false }]).getPreferences("compte-a");

    expect(res.preferences.find((p) => p.category === "money")?.enabled).toBe(false);
    expect(res.preferences.find((p) => p.category === "care")?.enabled).toBe(true);
  });

  /*
    RM-14-02 : les alertes vitales ne se coupent JAMAIS. Même si une ligne parasite prétendait le
    contraire — écrite par une version antérieure, ou par une main dans la base — la sortie force
    `enabled: true`. C'est la seule garantie qui protège une notification de sécurité.
  */
  it("force les alertes vitales à actif, même contre une ligne en base qui dit le contraire", async () => {
    const res = await avecPreferences([{ category: "critical", enabled: false }]).getPreferences("compte-a");

    const critical = res.preferences.find((p) => p.category === "critical");
    expect(critical?.enabled).toBe(true);
    expect(critical?.adjustable).toBe(false);
  });

  it("marque les quatre autres comme ajustables", async () => {
    const res = await avecPreferences().getPreferences("compte-a");

    const nonAjustables = res.preferences
      .filter((p) => p.category !== "critical" && !p.adjustable)
      .map((p) => p.category);
    expect(nonAjustables).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  L'abandon d'une notification critique — chantier 55, 06/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  EF-14-08 s'appelle « livraison **garantie** des critiques ». Passé cinq tentatives, le serveur
  renonçait : il émettait `m14.delivery.failed` — **que rien n'écoutait** — et écrivait une ligne
  d'audit. Or personne ne lit un journal d'audit spontanément ; c'est à cela que servent les
  alertes. La garantie s'arrêtait donc en silence.

  ⚠️ **Et il faut être juste sur ce que l'abandon coûte** : la notification EXISTE toujours dans le
  centre in-app du destinataire — celui-ci naît `SENT` (EF-14-07). Ce qui est perdu, c'est
  l'INTERRUPTION. Pour une critique — « un patient vous attend », « votre séance commence » — c'est
  précisément l'objet.

  ⚠️ Et l'échec est rarement individuel : des identifiants FCM expirés, un quota dépassé, et **tous**
  les push critiques tombent en même temps, pour tout le monde.

  📌 Ce chemin ne peut pas se déclencher aujourd'hui : `DevPushGateway` réussit toujours (ADR-08).
  Il est éprouvé maintenant parce que le jour où FCM sera branché sera précisément celui où les
  push commenceront à échouer — et où personne ne pensera à vérifier.
*/
describe("M14 · l'abandon d'une critique alerte le super-administrateur (chantier 55)", () => {
  /** Doublure centrée sur l'abandon : le push échoue, la ligne a épuisé ses essais. */
  function serviceQuiAbandonne(attempts: number, roles: Array<{ accountId: string }>) {
    const emis: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const prisma = {
      notification: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        findUnique: jest.fn(async () => ({ attempts, template: "m06.handshake.initiated" })),
      },
      adminRoleAssignment: { findMany: jest.fn(async () => roles) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
        adminRoleAssignment: { findMany: jest.fn(async () => roles) },
      })),
    } as unknown as PrismaService;
    const outbox = {
      emit: jest.fn(async (_tx: unknown, e: { type: string; payload: Record<string, unknown> }) => void emis.push(e)),
    } as unknown as OutboxService;
    const audit = { emit: jest.fn(async () => undefined) } as unknown as AuditEmitter;
    const push = { send: jest.fn(async () => { throw new Error("FCM indisponible"); }) } as unknown as PushGateway;
    const params = { getInt: jest.fn(async () => 30) } as unknown as ParamsService;
    const svc = new NotificationsService(prisma, params, outbox, audit, push);
    return { svc, emis };
  }

  /** `attemptPush` est privée : on l'atteint par le renvoi, qui est son seul appelant public. */
  async function tenter(svc: NotificationsService) {
    await (svc as unknown as {
      attemptPush: (id: string, acc: string, cat: string, pri: string, t: string, b: string) => Promise<void>;
    }).attemptPush("notif-1", "compte-1", "care", "critical", "Titre", "Corps");
  }

  /*
    ── LE test du chantier ───────────────────────────────────────────────────────────────────

    Sans lui, une panne de push généralisée — identifiants expirés, quota dépassé — ne réveille
    personne : les patients cessent d'être alertés, et le seul témoin est une ligne d'audit.
  */
  it("prévient CHAQUE super-administrateur quand les essais sont épuisés", async () => {
    const { svc, emis } = serviceQuiAbandonne(5, [{ accountId: "admin-1" }, { accountId: "admin-2" }]);

    await tenter(svc);

    const alertes = emis.filter((e) => e.payload.template === "m14.delivery.abandoned");
    expect(alertes.map((a) => a.payload.accountId).sort()).toEqual(["admin-1", "admin-2"]);
  });

  it("émet aussi l'événement destiné au module demandeur", async () => {
    const { svc, emis } = serviceQuiAbandonne(5, [{ accountId: "admin-1" }]);

    await tenter(svc);

    expect(emis.some((e) => e.type === "m14.delivery.failed")).toBe(true);
  });

  /*
    Tant qu'un renvoi reste possible, rien n'est abandonné — et alerter à chaque échec noierait
    l'administration sous des alertes qui se résoudront toutes seules au passage suivant.
  */
  it("n'alerte PAS tant que des essais restent", async () => {
    const { svc, emis } = serviceQuiAbandonne(2, [{ accountId: "admin-1" }]);

    await tenter(svc);

    expect(emis.some((e) => e.payload.template === "m14.delivery.abandoned")).toBe(false);
    expect(emis.some((e) => e.type === "m14.delivery.failed")).toBe(false);
  });

  /*
    RM-14-03 : une notification ne porte jamais de contenu médical. Celle-ci s'adresse en plus à
    quelqu'un qui n'est PAS le destinataire d'origine — le compte concerné reste dans le journal
    d'audit, pas dans un message lisible par l'administration.
  */
  it("l'alerte ne transporte que le modèle, jamais le compte du destinataire", async () => {
    const { svc, emis } = serviceQuiAbandonne(5, [{ accountId: "admin-1" }]);

    await tenter(svc);

    const alerte = emis.find((e) => e.payload.template === "m14.delivery.abandoned");
    expect(alerte?.payload.modele).toBe("m06.handshake.initiated");
    expect(JSON.stringify(alerte?.payload)).not.toContain("compte-1");
  });
});

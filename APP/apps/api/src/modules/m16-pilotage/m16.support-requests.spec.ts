/**
 * Les demandes de support (01/09/2026, dette 8quater).
 *
 * ── Ce qu'elles remplacent ─────────────────────────────────────────────────────────────────────
 *
 * `support@ulamu.cg` : une adresse dont le domaine n'appartient pas au projet, affichée dans les
 * mentions légales — **acceptées à l'inscription, donc valant preuve** — et derrière « Écrire à
 * l'administration ». On promettait une voie de contact qui ne menait nulle part.
 *
 * ── Ce qui est verrouillé ici ──────────────────────────────────────────────────────────────────
 *
 *  1. **Tout compte authentifié écrit.** Aucun sous-rôle, aucune condition : c'est quand plus rien
 *     ne marche qu'on a besoin d'écrire.
 *  2. **La réponse revient à l'auteur, dans l'application.** Sans ce chemin, le formulaire serait un
 *     trou noir — pire que l'adresse qu'il remplace.
 *  3. **On ne voit que SES demandes.** Elles racontent souvent ce qui va mal chez quelqu'un.
 *  4. **Ni le corps ni la réponse ne partent au journal d'audit** — seul le sujet, comme pour les
 *     signalements (RM-04-03). Le journal est en insertion seule : ce qui y entre n'en sort plus.
 *  5. **Une réponse ne se réécrit pas.** Elle a été lue.
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { SupportRequestService } from "./m16.support-requests.service";

type Ligne = {
  id: string;
  requesterId: string;
  subject: "PHONE_CHANGE" | "OWNER_UNREACHABLE" | "RECORD_TRANSFER" | "OTHER";
  body: string;
  status: "OPEN" | "ANSWERED";
  createdAt: Date;
  answer: string | null;
  answeredAt: Date | null;
  answeredBy: string | null;
};

const ligne = (o: Partial<Ligne> = {}): Ligne => ({
  id: "req-1",
  requesterId: "compte-1",
  subject: "PHONE_CHANGE",
  body: "J'ai perdu mon téléphone et je ne peux plus recevoir le code.",
  status: "OPEN",
  createdAt: new Date("2026-09-01T08:00:00.000Z"),
  answer: null,
  answeredAt: null,
  answeredBy: null,
  ...o,
});

const BON_CODE = "123456";

/** Un faux Prisma : une table en mémoire, et la transaction rend le même client. */
function monterService(depart: Ligne[] = [], statutDuCompte: "ACTIVE" | "SUSPENDED" | "CLOSED" = "ACTIVE") {
  const table = [...depart];
  const journal: Array<{ action: string; context?: unknown }> = [];

  const client = {
    supportRequest: {
      create: async ({ data }: { data: Partial<Ligne> }) => {
        const r = ligne({ ...data, id: `req-${table.length + 1}` });
        table.push(r);
        return r;
      },
      findUnique: async ({ where }: { where: { id: string } }) => table.find((r) => r.id === where.id) ?? null,
      findMany: async ({ where }: { where?: { requesterId?: string; status?: string } }) =>
        table.filter(
          (r) =>
            (!where?.requesterId || r.requesterId === where.requesterId) &&
            (!where?.status || r.status === where.status),
        ),
      update: async ({ where, data }: { where: { id: string }; data: Partial<Ligne> }) => {
        const r = table.find((x) => x.id === where.id)!;
        Object.assign(r, data);
        return r;
      },
    },
    account: {
      findUnique: async () => ({ id: "compte-1", status: statutDuCompte, email: "titulaire@exemple.cg" }),
      findMany: async () => [
        {
          id: "compte-1",
          phone: "+242069000110",
          professionalProfile: { firstName: "Armel", lastName: "Konaté" },
          patientProfile: null,
          facilityMemberProfile: null,
        },
      ],
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
  };

  const audit = {
    emit: async (_tx: unknown, e: { action: string; context?: unknown }) => void journal.push(e),
  };

  /*
    Depuis le 07/09 (chantier 61), répondre PRÉVIENT le demandeur : « la réponse se lit ici » était
    vrai, et incomplet — rien ne disait qu'elle était arrivée. On capte donc ce qui part, pour
    pouvoir éprouver que la notification ne recopie ni la demande ni la réponse.
  */
  const notifications: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const outbox = {
    emit: async (_tx: unknown, e: { type: string; payload: Record<string, unknown> }) => void notifications.push(e),
  };

  /*
    Depuis le 07/09 (chantier 63), répondre à quelqu'un qui ne peut PLUS ouvrir l'application lui
    envoie aussi la réponse par email : sinon elle serait déposée dans un endroit qu'il ne peut pas
    atteindre. On capte donc les envois.
  */
  const courriels: Array<{ to: string; sujet: string; corps: string }> = [];
  const email = {
    send: async (to: string, sujet: string, corps: string) => void courriels.push({ to, sujet, corps }),
  };

  /* M01 : seule `consumeSupportAccessOtp` est utilisée ici — la preuve d'identité sans session. */
  const m01 = {
    consumeSupportAccessOtp: async (_tx: unknown, mail: string, code: string) => {
      if (code !== BON_CODE) throw new Error("Code incorrect");
      return { accountId: "compte-1", accountType: "PATIENT", status: statutDuCompte, email: mail };
    },
  };

  return {
    service: new SupportRequestService(client as never, audit as never, outbox as never, m01 as never, email as never),
    table,
    journal,
    notifications,
    courriels,
  };
}

const ACTEUR = { accountId: "compte-1", accountType: "PROFESSIONAL", sessionId: "s", client: "web" } as never;

describe("Demandes de support — écrire quand plus rien d'autre ne marche", () => {
  it("dépose une demande et rend son identifiant tout de suite", async () => {
    const { service, table } = monterService();

    const { requestId } = await service.create(ACTEUR, {
      subject: "PHONE_CHANGE" as never,
      body: "J'ai perdu mon téléphone.",
    });

    expect(requestId).toBeTruthy();
    expect(table).toHaveLength(1);
    // Ouverte par défaut : quelqu'un doit la voir arriver.
    expect(table[0].status).toBe("OPEN");
  });

  it("n'écrit PAS le corps de la demande au journal d'audit", async () => {
    const { service, journal } = monterService();

    await service.create(ACTEUR, { subject: "OTHER" as never, body: "Mon dossier est bloqué depuis trois semaines." });

    // Le journal est en insertion seule : ce qui y entre n'en sort plus jamais. Une demande de
    // support raconte souvent ce qui va mal chez quelqu'un — seul le SUJET y a sa place.
    const entree = journal.find((e) => e.action === "m16.support_request.created");
    expect(entree).toBeDefined();
    expect(JSON.stringify(entree)).not.toContain("bloqué depuis trois semaines");
    expect(entree?.context).toEqual({ subject: "OTHER" });
  });
});

describe("Demandes de support — la réponse revient à son auteur", () => {
  it("répond, clôt la demande, et la réponse est lisible par l'auteur", async () => {
    const { service } = monterService([ligne()]);

    await service.answer("adm-1", "req-1", "Passez au guichet avec votre pièce d'identité.");
    const miennes = await service.mine(ACTEUR);

    // C'est tout l'intérêt du formulaire : la réponse se lit dans l'application, sans domaine à
    // acheter ni boîte à relever.
    expect(miennes[0].status).toBe("ANSWERED");
    expect(miennes[0].answer).toBe("Passez au guichet avec votre pièce d'identité.");
    expect(miennes[0].answeredAt).toBeInstanceOf(Date);
  });

  it("ne montre à personne les demandes d'un autre", async () => {
    const { service } = monterService([ligne(), ligne({ id: "req-2", requesterId: "compte-9" })]);

    const miennes = await service.mine(ACTEUR);

    expect(miennes.map((r) => r.id)).toEqual(["req-1"]);
  });

  it("n'écrit PAS le texte de la réponse au journal", async () => {
    const { service, journal } = monterService([ligne()]);

    await service.answer("adm-1", "req-1", "Votre numéro a été changé au guichet le 2 septembre.");

    const entree = journal.find((e) => e.action === "m16.support_request.answered");
    expect(entree).toBeDefined();
    expect(JSON.stringify(entree)).not.toContain("changé au guichet");
  });

  it("refuse de réécrire une réponse déjà donnée", async () => {
    const { service } = monterService([ligne()]);
    await service.answer("adm-1", "req-1", "Première réponse.");

    // Elle a été lue : la corriger après coup réécrirait l'histoire. On en rouvre une, ce qui
    // laisse les deux traces.
    await expect(service.answer("adm-1", "req-1", "Non, en fait…")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse de répondre à une demande qui n'existe pas", async () => {
    const { service } = monterService([]);

    await expect(service.answer("adm-1", "inconnue", "…")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("Demandes de support — la file d'administration", () => {
  it("donne le nom et le numéro du demandeur : sans eux on ne peut pas traiter", async () => {
    const { service } = monterService([ligne()]);

    const file = await service.list();

    expect(file[0].requesterName).toBe("Armel Konaté");
    expect(file[0].requesterPhone).toBe("+242069000110");
  });

  it("se filtre sur les demandes encore ouvertes", async () => {
    const { service } = monterService([ligne(), ligne({ id: "req-2", status: "ANSWERED" })]);

    const ouvertes = await service.list("OPEN" as never);

    expect(ouvertes.map((r) => r.id)).toEqual(["req-1"]);
  });
});

describe("Demandes de support — prévenir que la réponse est arrivée (chantier 61)", () => {
  /*
    « La réponse se lit ICI » était vrai, et incomplet : **rien ne disait qu'elle était arrivée.**
    Quelqu'un qui écrit parce que plus rien ne marche devait revenir consulter un écran de réglages,
    au hasard, jusqu'à trouver. Une réponse que personne ne sait lire vaut l'adresse morte qu'on
    avait remplacée.
  */
  it("prévient le DEMANDEUR, et lui seul", async () => {
    const { service, notifications } = monterService([ligne()]);
    await service.answer("adm-1", "req-1", "Passez au guichet avec votre pièce d'identité.");

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("notify.request");
    expect(notifications[0].payload.accountId).toBe("compte-1");
    expect(notifications[0].payload.template).toBe("m16.support_request.answered");
  });

  /*
    ⚠️ Une notification s'affiche sur un écran verrouillé, que d'autres voient. Une demande de
    support porte souvent ce qui va mal dans la vie de quelqu'un (RM-14-03) : on annonce qu'il y a
    une réponse, on ne la recopie pas — ni elle, ni la demande.
  */
  it("ne recopie NI la demande NI la réponse dans la notification", async () => {
    const { service, notifications } = monterService([ligne()]);
    await service.answer("adm-1", "req-1", "Votre dossier est rouvert, rappelez le 06 00 00 00 00.");

    const parti = JSON.stringify(notifications[0]);
    expect(parti).not.toContain("rouvert");
    expect(parti).not.toContain("06 00 00 00 00");
    expect(parti).not.toContain("perdu mon téléphone");
  });

  it("ne prévient personne quand la réponse est refusée", async () => {
    const { service, notifications } = monterService([ligne({ status: "ANSWERED", answer: "Déjà répondu." })]);

    await expect(service.answer("adm-1", "req-1", "Seconde réponse.")).rejects.toBeInstanceOf(ForbiddenException);
    expect(notifications).toHaveLength(0);
  });
});

describe("Écrire au support SANS session — le recours d'un compte suspendu (chantier 63)", () => {
  /*
    ⚠️ Ce chemin existe parce que l'autre est fermé. Un compte suspendu reçoit « contactez le support
    pour connaître le motif et les voies de recours », puis la garde refuse chacune de ses requêtes :
    l'invitation était écrite et impraticable.
  */
  it("dépose la demande pour le compte que le code désigne", async () => {
    const { service, table } = monterService([], "SUSPENDED");

    const { requestId } = await service.createWithoutSession("titulaire@exemple.cg", BON_CODE, {
      subject: "OTHER",
      body: "Mon compte est suspendu et je ne comprends pas pourquoi.",
    });

    expect(requestId).toBeTruthy();
    expect(table).toHaveLength(1);
    expect(table[0].requesterId).toBe("compte-1");
    expect(table[0].status).toBe("OPEN");
  });

  it("refuse un code faux, et n'écrit rien", async () => {
    const { service, table, journal } = monterService([], "SUSPENDED");

    await expect(
      service.createWithoutSession("titulaire@exemple.cg", "000000", { subject: "OTHER", body: "Bonjour l'équipe." }),
    ).rejects.toThrow();
    expect(table).toHaveLength(0);
    expect(journal).toHaveLength(0);
  });

  /*
    `sansSession` dit à l'administration que la personne n'avait aucun autre moyen d'écrire — c'est
    ce qui explique la réponse par email. Le CORPS, lui, ne part pas au journal (RM-04-03) : une
    demande de support porte souvent ce qui va mal dans la vie de quelqu'un, et le journal ne
    s'efface jamais.
  */
  it("trace le chemin emprunté, jamais le contenu", async () => {
    const { service, journal } = monterService([], "SUSPENDED");
    await service.createWithoutSession("titulaire@exemple.cg", BON_CODE, {
      subject: "PHONE_CHANGE",
      body: "J'ai perdu ma ligne et je ne peux plus me connecter.",
    });

    const entree = journal[0] as { action: string; context?: Record<string, unknown> };
    expect(entree.action).toBe("m16.support_request.created");
    expect(entree.context).toMatchObject({ subject: "PHONE_CHANGE", sansSession: true, statutDuCompte: "SUSPENDED" });
    expect(JSON.stringify(entree)).not.toContain("perdu ma ligne");
  });
});

describe("La réponse atteint quelqu'un qui ne peut plus ouvrir l'application (chantier 63)", () => {
  /*
    La notification vit DANS l'application. Un compte suspendu ne peut plus s'y connecter : sans
    email, la réponse serait déposée dans un endroit qu'il ne peut pas atteindre — exactement le
    défaut qu'on vient de corriger côté écriture.
  */
  it("envoie la réponse par email à un compte suspendu, avec son texte", async () => {
    const { service, courriels } = monterService([ligne()], "SUSPENDED");
    await service.answer("adm-1", "req-1", "Votre compte a été suspendu après un signalement. Voici la marche à suivre.");

    expect(courriels).toHaveLength(1);
    expect(courriels[0].to).toBe("titulaire@exemple.cg");
    // ⚠️ Le TEXTE, contrairement à la notification : sans lui, cet email n'inviterait qu'à aller
    // lire là où la personne ne peut pas aller.
    expect(courriels[0].corps).toContain("Voici la marche à suivre");
  });

  it("envoie aussi à un compte clôturé — la contestation est le seul recours qui lui reste", async () => {
    const { service, courriels } = monterService([ligne()], "CLOSED");
    await service.answer("adm-1", "req-1", "Votre demande a été examinée.");
    expect(courriels).toHaveLength(1);
  });

  /*
    Un compte ACTIF, lui, lit la réponse dans l'application : lui écrire en plus reviendrait à
    déplacer par email une conversation que la plateforme garde volontairement chez elle.
  */
  it("n'envoie AUCUN email à un compte actif", async () => {
    const { service, courriels, notifications } = monterService([ligne()], "ACTIVE");
    await service.answer("adm-1", "req-1", "Passez au guichet avec votre pièce d'identité.");

    expect(courriels).toHaveLength(0);
    expect(notifications).toHaveLength(1);
  });
});

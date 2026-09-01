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

/** Un faux Prisma : une table en mémoire, et la transaction rend le même client. */
function monterService(depart: Ligne[] = []) {
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

  return { service: new SupportRequestService(client as never, audit as never), table, journal };
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

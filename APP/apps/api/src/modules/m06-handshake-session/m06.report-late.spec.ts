/**
 * Le dépôt HORS DÉLAI d'un compte-rendu — chantier 89, 11/09/2026.
 *
 * ── Ce que ce fichier garde ───────────────────────────────────────────────────────────────────
 *
 * Jusqu'au 11/09, passé PM-30 le dépôt était **refusé définitivement** — par le professionnel comme
 * par quiconque, aucune route d'administration ne permettant de forcer. Deux choses étaient perdues
 * d'un coup, et une seule avait été décidée :
 *
 *   · les GAINS étaient gelés — sanction voulue par CU-06-03 ;
 *   · le CARNET du patient ne recevait jamais le compte-rendu — **personne n'a décidé cela**.
 *
 * Décision du porteur : séparer les deux. Le dépôt passe, le crédit non.
 *
 * ── Pourquoi un test à DOUBLURES et non un test d'intégration ─────────────────────────────────
 *
 * Les suites d'intégration exigent une base de test que ce poste n'a pas (`DATABASE_URL` désigne la
 * production — voir `test/garde-base-de-test.ts`). Or ce changement touche à l'ARGENT : il ne peut
 * pas partir sans preuve.
 *
 * `ReportService` est une classe ordinaire à sept dépendances. On l'instancie donc avec des
 * doublures et on regarde la seule chose qui compte : **`capture()` est-il appelé ?** C'est lui, et
 * lui seul, qui crédite le professionnel — il n'existe aucun drapeau « gelé » en base.
 */
import { ConflictException } from "@nestjs/common";
import { CareSessionStatus } from "@prisma/client";

import { ReportService } from "./m06.report.service";

const HEURE = 3_600_000;
const PM30_S = 24 * 3600;

/**
 * Une séance close il y a `heures` heures, sans compte-rendu.
 *
 * `status` est typé LARGE (`CareSessionStatus`) et non déduit : sans cela TypeScript le fige sur
 * « ENDED », et les cas « remboursée » ou « pas commencée » ne compileraient plus. *Une fabrique de
 * cas de test doit annoncer le type du champ qu'on va faire varier.*
 */
function seance(heures: number): {
  id: string;
  professionalId: string;
  patientAccountId: string;
  subProfileId: null;
  orderRef: string;
  status: CareSessionStatus;
  endedAt: Date;
  reportDepositedAt: null;
} {
  return {
    id: "s1",
    professionalId: "pro-1",
    patientAccountId: "pat-1",
    subProfileId: null,
    orderRef: "cmd-1",
    status: CareSessionStatus.ENDED,
    endedAt: new Date(Date.now() - heures * HEURE),
    reportDepositedAt: null,
  };
}

/** Le service, monté avec des doublures. Rend aussi les espions qu'on veut interroger. */
function monter(session: ReturnType<typeof seance>) {
  const capture = jest.fn().mockResolvedValue(undefined);
  const appendEntry = jest.fn().mockResolvedValue({ entryId: "entree-1" });
  const emitOutbox = jest.fn().mockResolvedValue(undefined);
  const emitAudit = jest.fn().mockResolvedValue(undefined);

  const tx = {
    careSession: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    careOffer: { findFirst: jest.fn().mockResolvedValue(null) },
    adminRoleAssignment: { findMany: jest.fn().mockResolvedValue([{ accountId: "admin-1" }]) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    adminRoleAssignment: { findMany: jest.fn().mockResolvedValue([{ accountId: "admin-1" }]) },
  };

  const service = new ReportService(
    prisma as never,
    { getInt: jest.fn().mockResolvedValue(PM30_S) } as never,
    { emit: emitOutbox } as never,
    { emit: emitAudit } as never,
    { appendEntry } as never,
    { capture } as never,
    {
      loadForParticipant: jest.fn().mockResolvedValue(session),
      settle: jest.fn().mockResolvedValue(session),
    } as never,
  );

  return { service, capture, appendEntry, emitOutbox, emitAudit, tx };
}

const ACTEUR = { accountId: "pro-1" } as never;
const CONTENU = { diagnosis: "Angine", recommendations: "Repos" } as never;

describe("Le dépôt d'un compte-rendu hors délai (CU-06-03, chantier 89)", () => {
  /*
    ⚠️ **LE test de ce chantier.** `capture()` est le seul geste qui crédite le professionnel ; il
    n'existe aucun drapeau « gelé » en base. Si ce test tombe, la sanction de CU-06-03 a disparu
    sans que personne ne s'en aperçoive — et on ne le verrait qu'en lisant un relevé de gains.
  */
  it("ne crédite PAS les gains — la sanction reste entière", async () => {
    const { service, capture } = monter(seance(30));

    await service.depositReport(ACTEUR, "s1", CONTENU);

    expect(capture).not.toHaveBeenCalled();
  });

  /*
    Et l'autre moitié de la décision : le dossier du patient, lui, est sauvé. Une consultation a eu
    lieu, elle laisse sa trace — *une sanction qui vise l'argent ne doit pas emporter le dossier de
    santé d'un tiers.*
  */
  it("mais le compte-rendu rejoint bien le Carnet du patient", async () => {
    const { service, appendEntry } = monter(seance(30));

    const r = await service.depositReport(ACTEUR, "s1", CONTENU);

    expect(appendEntry).toHaveBeenCalledTimes(1);
    expect(appendEntry.mock.calls[0][1]).toMatchObject({
      ownerPatientId: "pat-1",
      payload: { diagnosis: "Angine", recommendations: "Repos" },
    });
    expect(r.entryId).toBe("entree-1");
  });

  /* Un dépôt tardif n'est pas un dépôt ordinaire : il est tracé, et l'administration prévenue. */
  it("est tracé au journal et signalé à l’administration", async () => {
    const { service, emitAudit, emitOutbox } = monter(seance(30));

    await service.depositReport(ACTEUR, "s1", CONTENU);

    const actions = emitAudit.mock.calls.map((c) => (c[1] as { action: string }).action);
    expect(actions).toContain("m06.report.deposited_late");

    const modeles = emitOutbox.mock.calls.map((c) => (c[1] as { payload: { template: string } }).payload.template);
    expect(modeles).toContain("m06.report.deposited_late.admin");
  });

  /*
    ⚠️ Le miroir : DANS le délai, rien ne change. Sans ce test, on pourrait satisfaire les trois
    précédents en ne créditant plus JAMAIS personne — et le défaut serait invisible jusqu'au premier
    soignant qui réclame sa part.
  */
  it("dans le délai, en revanche, les gains sont bien crédités", async () => {
    const { service, capture, emitAudit } = monter(seance(2));

    await service.depositReport(ACTEUR, "s1", CONTENU);

    expect(capture).toHaveBeenCalledWith("cmd-1");
    const actions = emitAudit.mock.calls.map((c) => (c[1] as { action: string }).action);
    expect(actions).not.toContain("m06.report.deposited_late");
  });

  /*
    Les refus qui demeurent : une séance remboursée n'attend aucun compte-rendu, et une séance qui
    n'a pas commencé non plus. Le chantier ouvre le dépôt TARDIF, il n'ouvre pas tout.
  */
  it("une séance remboursée refuse toujours le compte-rendu", async () => {
    const { service } = monter({ ...seance(30), status: CareSessionStatus.REFUNDED });

    await expect(service.depositReport(ACTEUR, "s1", CONTENU)).rejects.toBeInstanceOf(ConflictException);
  });

  it("et une séance qui n’a pas commencé aussi", async () => {
    const { service } = monter({ ...seance(0), status: CareSessionStatus.PREPARING });

    await expect(service.depositReport(ACTEUR, "s1", CONTENU)).rejects.toBeInstanceOf(ConflictException);
  });

  /* Le dépôt reste UNIQUE : un second passage est refusé, hors délai comme dans le délai. */
  it("un compte-rendu déjà déposé n’est pas remplacé", async () => {
    const { service, tx } = monter(seance(30));
    tx.careSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.depositReport(ACTEUR, "s1", CONTENU)).rejects.toBeInstanceOf(ConflictException);
  });
});

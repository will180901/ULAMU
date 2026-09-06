/**
 * `HealthRecordWriterService` — l'écriture dans un Carnet TRANSFÉRÉ (chantier 52, 06/09/2026).
 *
 * ── Le cas que ces tests défendent ────────────────────────────────────────────────────────────
 *
 * Ce chemin refusait tout net. C'était sans conséquence tant que **aucun client ne savait
 * transférer un Carnet** — et le chantier 48 l'a rendu possible le 06/09. Le cas est devenu
 * atteignable le jour même :
 *
 *   1. un tuteur réserve une consultation POUR sa personne à charge — la session porte son
 *      `subProfileId` ;
 *   2. celle-ci atteint sa majorité et revendique son Carnet (CU-07-05) ;
 *   3. le professionnel dépose son compte-rendu → **refusé**.
 *
 * ⚠️ **Et ce refus ne se limitait pas à un écran fâché.** Le compte-rendu est obligatoire (relances
 * PM-30, puis « gains gelés » passé le délai) et **les gains ne sont crédités qu'à son dépôt**
 * (RM-06-04). Le professionnel n'aurait jamais été payé ; le patient n'aurait jamais reçu le
 * compte-rendu de sa propre consultation.
 *
 * ── Pourquoi SUIVRE plutôt que refuser ────────────────────────────────────────────────────────
 *
 * `claim` ne recopie pas le Carnet : il en **change le propriétaire**. Écrire « via le sous-profil »
 * après coup désigne donc le MÊME Carnet, qui a seulement changé de nom. On le suit — on n'en crée
 * jamais un second (RM-07-01), et c'est le titulaire qu'on notifie, plus le tuteur.
 *
 * Aucune base : la transaction Prisma est simulée (projet Jest « unit »).
 */
import { RecordEntryType, RecordProvenance } from "@prisma/client";
import { OutboxService } from "../../common/outbox.service";
import { HealthRecordWriterService } from "./m07.writer.service";

const SOUS_PROFIL = "11111111-1111-4111-8111-111111111111";
const TUTEUR = "22222222-2222-4222-8222-222222222222";
const MAJEUR = "33333333-3333-4333-8333-333333333333";

/** L'outbox : on ne vérifie pas l'envoi, seulement QUI est notifié. */
function outboxEspion() {
  const emis: Array<Record<string, unknown>> = [];
  return {
    espion: { emit: jest.fn(async (_tx: unknown, e: { payload: Record<string, unknown> }) => void emis.push(e.payload)) } as unknown as OutboxService,
    emis,
  };
}

/**
 * Transaction réduite à ce que `appendEntry` touche pour un sous-profil : la ligne du sous-profil,
 * l'upsert du Carnet, et la création de l'entrée.
 */
function txAvec(subProfile: { status: string; transferredToId: string | null } | null) {
  const upserts: Array<Record<string, unknown>> = [];
  return {
    upserts,
    tx: {
      subProfile: { findUnique: jest.fn().mockResolvedValue(subProfile ? { id: SOUS_PROFIL, guardianAccountId: TUTEUR, ...subProfile } : null) },
      healthRecord: {
        upsert: jest.fn(async (args: Record<string, unknown>) => {
          upserts.push(args);
          return { id: "record-1" };
        }),
      },
      healthRecordEntry: { create: jest.fn().mockResolvedValue({ id: "entry-1" }) },
    },
  };
}

const COMPTE_RENDU = {
  ownerSubProfileId: SOUS_PROFIL,
  type: RecordEntryType.CONSULTATION_REPORT,
  provenance: RecordProvenance.RECORDED_BY_PROFESSIONAL,
  payload: { diagnosis: "…" },
};

describe("Écrire dans un Carnet TRANSFÉRÉ (chantier 52)", () => {
  /*
    ── LE test de ce fichier ─────────────────────────────────────────────────────────────────

    Sans lui, un professionnel qui a réellement consulté ne peut ni déposer son compte-rendu ni
    être payé, parce que son patient a eu dix-huit ans entre-temps.
  */
  it("le compte-rendu SUIT le Carnet vers son nouveau titulaire", async () => {
    const { espion } = outboxEspion();
    const { tx, upserts } = txAvec({ status: "TRANSFERRED", transferredToId: MAJEUR });
    const writer = new HealthRecordWriterService(espion);

    const { entryId } = await writer.appendEntry(tx as never, COMPTE_RENDU);

    expect(entryId).toBe("entry-1");
    // Le Carnet est résolu par le COMPTE du majeur, jamais par le sous-profil libéré.
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({ where: { patientAccountId: MAJEUR } });
  });

  it("c’est le TITULAIRE qui est notifié, plus le tuteur", async () => {
    const { espion, emis } = outboxEspion();
    const { tx } = txAvec({ status: "TRANSFERRED", transferredToId: MAJEUR });

    await new HealthRecordWriterService(espion).appendEntry(tx as never, COMPTE_RENDU);

    expect(emis).toHaveLength(1);
    expect(emis[0]).toMatchObject({ accountId: MAJEUR, template: "m07.entry.added" });
    expect(JSON.stringify(emis[0])).not.toContain(TUTEUR);
  });

  /*
    Un Carnet transféré sans destinataire est une incohérence de données. Deviner un propriétaire
    y écrirait un compte-rendu médical dans le Carnet de quelqu'un — on refuse, et on le dit.
  */
  it("transféré SANS titulaire : on refuse plutôt que de deviner", async () => {
    const { espion } = outboxEspion();
    const { tx } = txAvec({ status: "TRANSFERRED", transferredToId: null });

    await expect(new HealthRecordWriterService(espion).appendEntry(tx as never, COMPTE_RENDU)).rejects.toThrow(
      /sans titulaire identifiable/,
    );
  });

  it("un sous-profil encore à charge écrit dans SON Carnet, et notifie le tuteur", async () => {
    const { espion, emis } = outboxEspion();
    const { tx, upserts } = txAvec({ status: "DEPENDENT", transferredToId: null });

    await new HealthRecordWriterService(espion).appendEntry(tx as never, COMPTE_RENDU);

    expect(upserts[0]).toMatchObject({ where: { subProfileId: SOUS_PROFIL } });
    expect(emis[0]).toMatchObject({ accountId: TUTEUR });
  });

  it("un sous-profil inexistant est refusé", async () => {
    const { espion } = outboxEspion();
    const { tx } = txAvec(null);

    await expect(new HealthRecordWriterService(espion).appendEntry(tx as never, COMPTE_RENDU)).rejects.toThrow(
      /Sous-profil introuvable/,
    );
  });
});

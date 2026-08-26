/**
 * `StorageService.read()` — la frontière entre « ancien fichier en clair » et « chiffré que la clé
 * courante n'ouvre pas ».
 *
 * Ces deux cas faisaient lever `openBuffer` de la même façon et retombaient sur les octets bruts :
 * une pièce justificative scellée avec une autre `SECRETBOX_KEY` était servie CHIFFRÉE en HTTP 200,
 * avec son `Content-Type` d'origine. Le test 2 est là pour que ce comportement ne revienne pas.
 *
 * Aucune base : `PrismaService` est simulé (projet Jest « unit »).
 */
import { InternalServerErrorException, Logger } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { sealBuffer } from "./crypto/secretbox";
import { PrismaService } from "./prisma.service";
import { StorageService } from "./storage.service";

const CLE_A = randomBytes(32).toString("base64");
const CLE_B = randomBytes(32).toString("base64");
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("diplôme de médecine".repeat(4))]);
const CLE_FICHIER = "doc_11111111-2222-3333-4444-555555555555.pdf";

/** Prisma réduit à ce que `read()` utilise : une ligne `storedFile` ou rien. */
function prismaAvec(row: { data: Buffer; mime: string } | null): PrismaService {
  return { storedFile: { findUnique: jest.fn().mockResolvedValue(row) } } as unknown as PrismaService;
}

/** Scelle avec `cle`, puis rend la main à `SECRETBOX_KEY` telle qu'elle était. */
function scelleAvec(cle: string, clair: Buffer): Buffer {
  const avant = process.env.SECRETBOX_KEY;
  process.env.SECRETBOX_KEY = cle;
  try {
    return sealBuffer(clair);
  } finally {
    process.env.SECRETBOX_KEY = avant;
  }
}

describe("StorageService.read — clé de chiffrement", () => {
  const cleInitiale = process.env.SECRETBOX_KEY;
  let journal: jest.SpyInstance;

  beforeEach(() => {
    journal = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    journal.mockRestore();
    if (cleInitiale === undefined) delete process.env.SECRETBOX_KEY;
    else process.env.SECRETBOX_KEY = cleInitiale;
  });

  it("même clé : la pièce revient exactement telle qu'elle a été déposée", async () => {
    const enBase = scelleAvec(CLE_A, PDF);
    process.env.SECRETBOX_KEY = CLE_A;
    const service = new StorageService(prismaAvec({ data: enBase, mime: "application/pdf" }));

    const lu = await service.read(CLE_FICHIER);

    expect(lu).not.toBeNull();
    expect(lu?.buffer.equals(PDF)).toBe(true);
    expect(lu?.contentType).toBe("application/pdf");
  });

  it("clé différente : lève, et ne sert JAMAIS le chiffré à la place du fichier", async () => {
    const enBase = scelleAvec(CLE_A, PDF);
    process.env.SECRETBOX_KEY = CLE_B;
    const service = new StorageService(prismaAvec({ data: enBase, mime: "application/pdf" }));

    // Ni 200 avec du charabia, ni 404 « introuvable » : la pièce existe, c'est le serveur qui échoue.
    await expect(service.read(CLE_FICHIER)).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("clé différente : le journal nomme SECRETBOX_KEY, pour que l'incident soit diagnosticable", async () => {
    const enBase = scelleAvec(CLE_A, PDF);
    process.env.SECRETBOX_KEY = CLE_B;
    const service = new StorageService(prismaAvec({ data: enBase, mime: "application/pdf" }));

    await expect(service.read(CLE_FICHIER)).rejects.toThrow();
    expect(journal).toHaveBeenCalledTimes(1);
    expect(journal.mock.calls[0]?.[0]).toContain("SECRETBOX_KEY");
  });

  it("variable absente alors que le fichier a été scellé : lève aussi (repli codé en dur ≠ vraie clé)", async () => {
    const enBase = scelleAvec(CLE_A, PDF);
    delete process.env.SECRETBOX_KEY;
    const service = new StorageService(prismaAvec({ data: enBase, mime: "application/pdf" }));

    await expect(service.read(CLE_FICHIER)).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("fichier d'AVANT le chiffrement au repos : toujours servi en clair (rétrocompatibilité)", async () => {
    process.env.SECRETBOX_KEY = CLE_A;
    const service = new StorageService(prismaAvec({ data: PDF, mime: "application/pdf" }));

    const lu = await service.read(CLE_FICHIER);

    expect(lu?.buffer.equals(PDF)).toBe(true);
    expect(journal).not.toHaveBeenCalled();
  });

  it("clé de stockage absente en base : null (404 côté appelants), sans rien journaliser", async () => {
    process.env.SECRETBOX_KEY = CLE_A;
    const service = new StorageService(prismaAvec(null));

    expect(await service.read(CLE_FICHIER)).toBeNull();
    expect(journal).not.toHaveBeenCalled();
  });

  it("clé de stockage non sûre : null, sans même interroger la base (anti-traversal)", async () => {
    const prisma = prismaAvec({ data: PDF, mime: "application/pdf" });
    const service = new StorageService(prisma);

    expect(await service.read("../../etc/passwd")).toBeNull();
    expect(prisma.storedFile.findUnique).not.toHaveBeenCalled();
  });
});

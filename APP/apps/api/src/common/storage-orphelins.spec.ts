/**
 * Les fichiers sans propriétaire — chantier 51, 06/09/2026.
 *
 * ── Ce que ce fichier défend ──────────────────────────────────────────────────────────────────
 *
 * Un fichier stocké est toujours censé être DÉSIGNÉ par une ligne : un avatar par un profil, une
 * pièce par un document de vérification, un média par un message. Trois chemins rompent ce lien, et
 * les trois ont été constatés ou sont structurels :
 *
 *  1. **M06 téléverse en DEUX appels HTTP** : `uploadMedia` rend une clé, un second appel l'attache
 *     à un message. Entre les deux, l'utilisateur renonce ou le réseau tombe.
 *  2. **Un script de maintenance efface des lignes sans leurs fichiers.** Constaté en production le
 *     06/09 : trois pièces d'identité et un diplôme, chiffrés, sans propriétaire depuis le 24/08.
 *  3. **Le processus meurt entre l'écriture du fichier et celle de la ligne** (M01, M03).
 *
 * ⚠️ **Mais le vrai danger de ce chantier, c'est le remède.** Un balayage qui se trompe efface des
 * photos, des messages vocaux et des pièces d'identité MÉDICALES, sans retour possible. La règle
 * est donc écrite pour que son défaut soit de NE RIEN FAIRE — et c'est ce que ces tests gardent,
 * bien plus que sa capacité à nettoyer.
 */
import { AuditEmitter } from "./audit.emitter";
import { PrismaService } from "./prisma.service";
import { KNOWN_STORAGE_PREFIXES, ORPHAN_GRACE_MS, orphanIsSweepable, StorageService } from "./storage.service";

const VIDE: ReadonlySet<string> = new Set();
const JOUR = 24 * 60 * 60 * 1000;

describe("Fichiers sans propriétaire — ce qu'on efface", () => {
  it.each([
    ["un média de session", "sm_11111111-1111-4111-8111-111111111111.jpg"],
    ["une pièce justificative", "vd_22222222-2222-4222-8222-222222222222.pdf"],
    ["un avatar", "av_33333333-3333-4333-8333-333333333333.jpg"],
  ])("efface %s non référencé et assez vieux", (_cas, cle) => {
    expect(orphanIsSweepable(cle, VIDE, 2 * JOUR, ORPHAN_GRACE_MS)).toBe(true);
  });
});

describe("Fichiers sans propriétaire — ce qu'on n'efface JAMAIS", () => {
  /*
    ── LE test de ce fichier ─────────────────────────────────────────────────────────────────

    Le jour où un module ajoutera un quatrième type de fichier, il l'écrira AVANT que ce balayage
    n'apprenne où ses clés sont référencées. Un balayage qui « nettoie » ce qu'il ne comprend pas
    détruirait alors des données médicales en usage, sans retour possible.

    Le défaut de cette règle doit être de ne rien faire.
  */
  it("ne touche JAMAIS à un préfixe inconnu, même très vieux et référencé nulle part", () => {
    expect(orphanIsSweepable("xx_44444444-4444-4444-8444-444444444444.jpg", VIDE, 365 * JOUR, ORPHAN_GRACE_MS)).toBe(false);
    expect(orphanIsSweepable("ordonnance_2026.pdf", VIDE, 365 * JOUR, ORPHAN_GRACE_MS)).toBe(false);
    expect(orphanIsSweepable("", VIDE, 365 * JOUR, ORPHAN_GRACE_MS)).toBe(false);
  });

  it("ne touche pas à un fichier RÉFÉRENCÉ, si vieux soit-il", () => {
    const cle = "sm_55555555-5555-4555-8555-555555555555.jpg";

    expect(orphanIsSweepable(cle, new Set([cle]), 365 * JOUR, ORPHAN_GRACE_MS)).toBe(false);
  });

  /*
    Le délai de grâce protège le cas le plus fréquent : quelqu'un téléverse une photo, puis prend
    son temps pour écrire la légende du message qui la portera. Couper ce délai effacerait la photo
    de quelqu'un qui est justement en train de la commenter.
  */
  it("ne touche pas à un fichier récent — on peut être en train d'écrire le message", () => {
    const cle = "sm_66666666-6666-4666-8666-666666666666.jpg";

    expect(orphanIsSweepable(cle, VIDE, 60_000, ORPHAN_GRACE_MS)).toBe(false);
    expect(orphanIsSweepable(cle, VIDE, ORPHAN_GRACE_MS - 1, ORPHAN_GRACE_MS)).toBe(false);
    // La borne elle-même est incluse : à 24 h pile, le fichier est abandonné.
    expect(orphanIsSweepable(cle, VIDE, ORPHAN_GRACE_MS, ORPHAN_GRACE_MS)).toBe(true);
  });
});

describe("Les préfixes connus", () => {
  /*
    Cette liste doit rester en face des trois seuls `storage.save(...)` du serveur — `av` (M01),
    `vd` (M03), `sm` (M06). Si un quatrième apparaît sans être ajouté ici, ses fichiers ne seront
    jamais balayés : c'est le bon défaut, mais il faut le savoir.
  */
  it("recense exactement les trois préfixes que le serveur sait écrire", () => {
    expect([...KNOWN_STORAGE_PREFIXES].sort()).toEqual(["av_", "sm_", "vd_"]);
  });

  it("le délai de grâce dépasse largement la rédaction d'un message", () => {
    expect(ORPHAN_GRACE_MS).toBeGreaterThanOrEqual(JOUR);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Le balayage laisse une trace — chantier 56, 06/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  Le balayage livré au chantier 51 supprimait des photos, des messages vocaux et des pièces
  d'identité — chiffrés, mais médicaux — **en ne laissant qu'une ligne de log**. Sur une plateforme
  dont le principe est « le pouvoir sans trace n'existe pas » (RM-16-03) et dont le journal est une
  pièce légale (loi n° 29-2019), c'était le trou que ce journal existe pour empêcher.

  ⚠️ **La trace journalise des COMPTES, jamais les clés.** Une clé ne porte pas de contenu médical,
  mais elle nomme un fichier : y verser trois cents identifiants ferait du journal un index de
  fichiers, quand RM-04-03 demande l'inverse.
*/
describe("Le balayage des fichiers laisse une trace (chantier 56)", () => {
  const JOUR = 24 * 60 * 60 * 1000;

  /** Base réduite à ce que `sweepOrphans` lit : cinq sources de références, et les fichiers. */
  function service(fichiers: Array<{ key: string; sizeBytes: number; createdAt: Date }>) {
    const supprimes: unknown[] = [];
    const emis: Array<{ action: string; context?: Record<string, unknown> }> = [];
    const vide = { findMany: jest.fn(async () => []) };
    const prisma = {
      patientProfile: vide,
      professionalProfile: vide,
      facilityMemberProfile: vide,
      supportingDocument: vide,
      sessionMessage: vide,
      storedFile: {
        findMany: jest.fn(async () => fichiers),
        deleteMany: jest.fn(async (a: unknown) => {
          supprimes.push(a);
          return { count: fichiers.length };
        }),
      },
    } as unknown as PrismaService;
    const audit = {
      emit: jest.fn(async (_tx: unknown, e: { action: string; context?: Record<string, unknown> }) => void emis.push(e)),
    } as unknown as AuditEmitter;
    return { svc: new StorageService(prisma, audit), emis, supprimes };
  }

  const vieux = (key: string, sizeBytes = 1024) => ({
    key,
    sizeBytes,
    createdAt: new Date(Date.now() - 3 * JOUR),
  });

  /*
    ── LE test du chantier ───────────────────────────────────────────────────────────────────

    Sans lui, la machine efface des pièces d'identité chaque nuit et personne ne peut dire, six mois
    plus tard, ce qu'elle a supprimé ni quand.
  */
  it("journalise ce qu'il a effacé", async () => {
    const { svc, emis } = service([vieux("vd_a.pdf", 2048), vieux("sm_b.jpg", 1024)]);

    await svc.sweepOrphans();

    const trace = emis.find((e) => e.action === "storage.orphans.swept");
    expect(trace).toBeDefined();
    expect(trace?.context).toMatchObject({ effaces: 2, examines: 2, octetsLiberes: 3072 });
  });

  it("compte par TYPE de fichier — deux pièces effacées ne se disent pas comme deux photos", async () => {
    const { svc, emis } = service([vieux("vd_a.pdf"), vieux("vd_b.pdf"), vieux("sm_c.jpg")]);

    await svc.sweepOrphans();

    const trace = emis.find((e) => e.action === "storage.orphans.swept");
    expect(trace?.context?.parPrefixe).toEqual({ vd_: 2, sm_: 1 });
  });

  /*
    Une clé nomme un fichier. Trois cents clés dans une entrée d'audit feraient du journal un index
    de fichiers — RM-04-03 demande le contraire, et le décompte suffit à enquêter.
  */
  it("ne verse AUCUNE clé de fichier dans le journal", async () => {
    const { svc, emis } = service([vieux("vd_secret-du-patient.pdf")]);

    await svc.sweepOrphans();

    const trace = emis.find((e) => e.action === "storage.orphans.swept");
    expect(JSON.stringify(trace)).not.toContain("secret-du-patient");
  });

  /* Un passage qui n'efface rien n'a rien à raconter — journaliser le vide noierait le vrai. */
  it("ne journalise rien quand il n'y a rien à effacer", async () => {
    const { svc, emis, supprimes } = service([]);

    const bilan = await svc.sweepOrphans();

    expect(bilan.effaces).toBe(0);
    expect(supprimes).toHaveLength(0);
    expect(emis).toHaveLength(0);
  });
});

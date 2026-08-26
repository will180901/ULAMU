/**
 * Stockage de fichiers — pièces justificatives, photos de profil, médias de consultation.
 *
 * ── Pourquoi les fichiers sont DANS la base ────────────────────────────────────────────────────
 *
 * Ils étaient écrits sur disque, sous `uploads/`. Le plan gratuit de Render n'offre AUCUN disque
 * persistant : chaque déploiement, chaque redémarrage, chaque réveil après veille les effaçait.
 * Constaté le 24/08/2026 sur des pièces réelles — la ligne était toujours en base, le fichier
 * répondait « introuvable ». Un dossier de vérification vidé sans que personne l'ait demandé.
 *
 * PostgreSQL est la seule chose durable ET sauvegardée dont ce déploiement dispose. Les octets y
 * vont donc, toujours CHIFFRÉS (AES-256-GCM, cf. `secretbox`) : la base n'en voit pas plus le clair
 * que le disque avant elle.
 *
 * ⚠️ Ce n'est pas ce qu'on fait à grande échelle, et c'est assumé pour ce périmètre : quelques
 * dizaines de méga-octets face au quota Neon de 0,5 Go. L'abstraction par CLÉ (et non par URL) est
 * conservée intacte — le jour où le volume l'exige, un pilote S3 se glisse ici sans qu'aucun
 * appelant ne bouge.
 *
 * Entrée en base64 (le client envoie l'image/le son encodé — pas de multipart/multer).
 */
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { looksSealed, openBuffer, sealBuffer } from "./crypto/secretbox";
import { PrismaService } from "./prisma.service";

/** MIME accepté → extension. On borne aux types attendus (images + audio court). */
const EXT_BY_MIME: Record<string, string> = {
  /**
   * PDF (2026-08) — le format de la plupart des pièces justificatives : un diplôme scanné, une
   * attestation d'Ordre, un justificatif d'adresse arrivent en PDF, pas en photo. Il manquait, et
   * l'écran « Ma vérification » annonçait pourtant « PDF ou image » : le serveur répondait « type de
   * fichier non supporté » sans que rien n'explique pourquoi.
   *
   * Un PDF peut embarquer du script. Il n'est jamais rendu dans le contexte de l'application : la
   * lecture passe par un `blob:` isolé côté client (voir `LignePiece`), et le serveur ne le sert
   * qu'aux deux personnes autorisées — le déposant et l'administration de vérification.
   */
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

/**
 * Signatures binaires d'exécutables connus — liste NOIRE (ne rejette que ces signatures précises,
 * ne valide pas le contenu réel). Empêche un exécutable renommé en .jpg de passer le seul contrôle
 * de mime déclaré par le client.
 */
const EXECUTABLE_SIGNATURES: Buffer[] = [
  Buffer.from([0x4d, 0x5a]), // MZ — PE (Windows .exe/.dll)
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF (Linux)
  Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // Mach-O 32-bit
  Buffer.from([0xfe, 0xed, 0xfa, 0xcf]), // Mach-O 64-bit
  Buffer.from([0xce, 0xfa, 0xed, 0xfe]), // Mach-O 32-bit (endian inversé)
  Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), // Mach-O 64-bit (endian inversé)
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Mach-O universal (aussi magic .class Java — indésirable ici aussi)
  Buffer.from("#!", "ascii"), // script shell (shebang)
];

function looksLikeExecutable(buf: Buffer): boolean {
  return EXECUTABLE_SIGNATURES.some((sig) => buf.length >= sig.length && buf.subarray(0, sig.length).equals(sig));
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plafond par fichier : 8 Mo après décodage.
   *
   * Il valait 80 Mo, dimensionné contre les 512 Mo de RAM de l'instance. Deux choses ont changé.
   * Les octets vont maintenant dans une base dont le quota gratuit est de 0,5 Go : UN fichier de
   * 80 Mo en consommerait un sixième. Et les écrans annoncent 5 Mo — 8 Mo laisse la marge de
   * l'encodage sans démentir ce qui est affiché.
   */
  private readonly maxBytes = 8 * 1024 * 1024;

  /** Enregistre un base64 et renvoie la clé de stockage. Tolère un préfixe data-URI. */
  async save(prefix: string, base64: string, mime: string): Promise<string> {
    const ext = EXT_BY_MIME[mime.toLowerCase()];
    if (!ext) {
      throw new BadRequestException("Type de fichier non supporté");
    }
    const raw = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 0) {
      throw new BadRequestException("Fichier vide ou base64 invalide");
    }
    if (looksLikeExecutable(buf)) {
      throw new BadRequestException("Type de fichier non supporté");
    }
    if (buf.length > this.maxBytes) {
      throw new BadRequestException("Fichier trop volumineux (8 Mo maximum)");
    }
    const key = `${prefix}_${randomUUID()}.${ext}`;
    // Chiffré au repos (AES-256-GCM, même primitive que les secrets TOTP) — la base ne voit jamais le clair.
    const scelle = sealBuffer(buf);
    await this.prisma.storedFile.create({
      data: { key, mime: mime.toLowerCase(), data: scelle, sizeBytes: scelle.length },
    });
    return key;
  }

  /**
   * Lit un fichier par clé. null si absent ou clé non sûre. **Lève** si le fichier est chiffré mais
   * que la clé courante ne l'ouvre pas.
   *
   * ── Pourquoi cette distinction ─────────────────────────────────────────────────────────────────
   *
   * Un seul `try/catch` enveloppait `openBuffer`, et retombait sur les octets bruts. L'intention
   * était juste — les fichiers déposés AVANT le chiffrement au repos sont encore en clair en base et
   * doivent rester lisibles — mais `openBuffer` lève pour DEUX raisons que ce `catch` confondait :
   * l'en-tête absent (vrai fichier en clair) et le tag d'authentification qui ne colle pas
   * (fichier bien chiffré, `SECRETBOX_KEY` différente de celle qui l'a scellé).
   *
   * Dans le second cas, le service renvoyait donc le CHIFFRÉ en **HTTP 200**, avec le
   * `Content-Type` d'origine : un « PDF » de charabia, sans une ligne de journal. Côté écran, cela
   * ressemblait à une pièce mal déposée par le médecin — on accusait l'utilisateur avant de
   * soupçonner le serveur. Constaté et mesuré le 25/08/2026
   * (cf. `docs/procedure_sauvegarde_SECRETBOX_KEY.md` §2.2).
   *
   * `looksSealed` tranche sans la clé, puisque l'en-tête est en clair. Un échec APRÈS cet en-tête
   * n'est plus une question de rétrocompatibilité : c'est un incident d'exploitation. On le
   * journalise en nommant la variable en cause — comme le fait déjà M01 pour les secrets TOTP — et
   * on refuse de servir. Contrairement au TOTP, aucun repli n'est possible : un fichier n'a pas de
   * code de secours. Mieux vaut une panne visible qu'un fichier qui ment.
   */
  async read(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.isSafeKey(key)) {
      return null;
    }
    const row = await this.prisma.storedFile.findUnique({ where: { key } });
    if (!row) {
      return null;
    }
    const raw = Buffer.from(row.data);
    let buffer: Buffer;
    if (looksSealed(raw)) {
      try {
        buffer = openBuffer(raw);
      } catch (e) {
        this.logger.error(
          `Fichier chiffré illisible (clé ${key}) — SECRETBOX_KEY a-t-elle changé depuis le dépôt ? ` +
            `Les octets sont intacts en base : restaurer la bonne clé les rend lisibles. ${(e as Error).message}`,
        );
        // 500 assumé : la pièce EXISTE et n'est pas corrompue, c'est le serveur qui ne sait plus la
        // lire. Un 404 « introuvable » enverrait le déposant la redéposer pour rien.
        throw new InternalServerErrorException("Fichier illisible (incident de chiffrement côté serveur)");
      }
    } else {
      // Rétrocompatibilité : fichier écrit AVANT le chiffrement au repos — encore en clair.
      buffer = raw;
    }
    const ext = key.split(".").pop() ?? "";
    return { buffer, contentType: row.mime || CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream" };
  }

  async remove(key: string | null | undefined): Promise<void> {
    if (!key || !this.isSafeKey(key)) {
      return;
    }
    // `deleteMany` et non `delete` : supprimer une clé déjà absente ne doit pas jeter. Le nettoyage
    // best-effort des appelants s'exécute parfois sur un fichier qui n'a jamais été écrit.
    await this.prisma.storedFile.deleteMany({ where: { key } });
  }

  /** Anti-traversal : clé alphanumérique + _.- sans séparateur de chemin ni « .. ». */
  private isSafeKey(key: string): boolean {
    return /^[a-zA-Z0-9_.-]+$/.test(key) && !key.includes("..");
  }
}

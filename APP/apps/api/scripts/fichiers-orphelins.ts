/**
 * Fichiers stockés sans propriétaire — STRICTEMENT EN LECTURE. Chantier 51, 06/09/2026.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * Les fichiers vivent **en base** (`StoredFile`), chiffrés, et trois préfixes y cohabitent :
 * `av_` avatars (M01), `vd_` pièces justificatives (M03), `sm_` médias de session (M06).
 *
 * M01 et M03 nettoient derrière eux : l'ancien avatar est retiré au remplacement, et une pièce dont
 * le rattachement échoue est effacée dans la foulée.
 *
 * ⚠️ **M06 ne retire jamais rien.** `uploadMedia` stocke le fichier et rend sa clé ; c'est un
 * SECOND appel HTTP qui l'attache à un message. Entre les deux, tout peut s'arrêter — l'utilisateur
 * renonce, le réseau tombe, l'application est fermée. Le fichier reste alors **référencé par rien**,
 * et rien ne viendra jamais le chercher : aucun balayage, aucune purge, aucune durée de vie.
 *
 * Ce n'est pas seulement de la place perdue. Ce sont des **photos et des messages vocaux médicaux**
 * conservés sans propriétaire et sans règle de rétention, sur une plateforme de santé.
 *
 * ── Ce que ce script fait ─────────────────────────────────────────────────────────────────────
 *
 * Il compte, et il ne fait que compter. Aucune écriture, aucune suppression, NestJS n'est pas
 * démarré — donc aucun `@Cron`.
 *
 *   npx ts-node scripts/fichiers-orphelins.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

const mo = (octets: number): string => `${(octets / 1_048_576).toFixed(2)} Mo`;

async function main(): Promise<void> {
  console.log("FICHIERS STOCKÉS — lecture seule, aucune écriture.");

  const fichiers = await prisma.storedFile.findMany({ select: { key: true, sizeBytes: true, createdAt: true } });

  titre("1. Occupation par préfixe");
  const parPrefixe = new Map<string, { n: number; octets: number }>();
  for (const f of fichiers) {
    const p = f.key.slice(0, 2);
    const e = parPrefixe.get(p) ?? { n: 0, octets: 0 };
    e.n += 1;
    e.octets += f.sizeBytes;
    parPrefixe.set(p, e);
  }
  if (fichiers.length === 0) console.log("  Aucun fichier en base.");
  for (const [p, e] of [...parPrefixe].sort()) {
    const nom = p === "av" ? "avatars" : p === "vd" ? "pièces justificatives" : p === "sm" ? "médias de session" : p;
    console.log(`  ${nom.padEnd(24)} ${String(e.n).padStart(5)} fichier(s)  ${mo(e.octets).padStart(12)}`);
  }

  titre("2. Médias de session SANS message qui les référence");
  /*
    Un média est attaché soit par `fileKey` (photo seule, vocal, document), soit dans `mediaKeys`
    (album de plusieurs photos en une bulle). Les deux comptent : ne regarder que `fileKey`
    déclarerait orphelines toutes les photos d'album.

    ⚠️ Un message SUPPRIMÉ (`deletedAt`) référence encore son média — c'est une suppression douce,
    et le fichier a toujours un propriétaire. On ne les compte donc pas comme orphelins.
  */
  const messages = await prisma.sessionMessage.findMany({ select: { fileKey: true, mediaKeys: true } });
  const referencees = new Set<string>();
  for (const m of messages) {
    if (m.fileKey) referencees.add(m.fileKey);
    for (const k of m.mediaKeys) referencees.add(k);
  }

  const medias = fichiers.filter((f) => f.key.startsWith("sm_"));
  const orphelins = medias.filter((f) => !referencees.has(f.key));

  console.log(`  ${medias.length} média(s) de session, ${referencees.size} clé(s) référencée(s) par un message.`);
  if (orphelins.length === 0) {
    console.log("  Aucun orphelin. Le défaut ne s'est pas encore produit en production.");
  } else {
    const octets = orphelins.reduce((s, f) => s + f.sizeBytes, 0);
    console.log(`  ⚠️ ${orphelins.length} fichier(s) sans propriétaire — ${mo(octets)} :`);
    for (const f of orphelins.slice(0, 20)) {
      console.log(`    ${f.key}  ${mo(f.sizeBytes).padStart(10)}  déposé le ${f.createdAt.toISOString()}`);
    }
    if (orphelins.length > 20) console.log(`    … et ${orphelins.length - 20} autre(s).`);
  }

  titre("3. Pièces justificatives sans dossier (contrôle : M03 nettoie, on vérifie)");
  const docs = await prisma.supportingDocument.findMany({ select: { fileKey: true } });
  const clesDocs = new Set(docs.map((d) => d.fileKey));
  const vdOrphelins = fichiers.filter((f) => f.key.startsWith("vd_") && !clesDocs.has(f.key));
  console.log(`  ${vdOrphelins.length} orphelin(s) sur ${fichiers.filter((f) => f.key.startsWith("vd_")).length}.`);
}

main()
  .catch((e) => {
    console.error("\nÉCHEC :", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

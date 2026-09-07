/**
 * État des signalements — STRICTEMENT EN LECTURE. Chantier 60, 07/09/2026.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * Le chantier 59 vient d'ouvrir la porte d'entrée du signalement côté patient. Avant d'outiller
 * l'autre bout — l'écran qui INSTRUIT ces signalements — il faut savoir ce qu'il y a dedans.
 *
 * ⚠️ La question précise : **l'équipe de modération peut-elle savoir de quoi on lui parle ?**
 * `listReports` ne renvoie que `targetType` et `targetId`, et l'écran d'administration n'affiche
 * que les huit premiers caractères de l'identifiant. Pour un `PROFILE`, on peut encore retrouver le
 * compte à la main. Pour un `SESSION_MESSAGE`, on lit « SESSION_MESSAGE · A3F91C2B » — et il n'y a
 * aucun moyen, nulle part, de lire le message ni de savoir qui l'a écrit.
 *
 * ── Ce que ce script mesure ───────────────────────────────────────────────────────────────────
 *
 *   1. combien de signalements, par statut et par type de cible ;
 *   2. combien de cibles sont encore RÉSOLVABLES — un compte qui existe, un message qui existe —
 *      parce qu'un signalement dont la cible a disparu ne s'instruit pas non plus ;
 *   3. depuis combien de temps les plus anciens attendent, comparé au délai cible PM-23.
 *
 * Aucune écriture, aucune migration, NestJS n'est pas démarré — donc aucun `@Cron`.
 *
 *   npx ts-node scripts/etat-signalements.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

const jours = (d: Date): string => `${((Date.now() - d.getTime()) / 86_400_000).toFixed(1)} j`;

async function main(): Promise<void> {
  console.log("ÉTAT DES SIGNALEMENTS — lecture seule, aucune écriture.");

  const total = await prisma.userReport.count();
  console.log(`\n${total} signalement(s) en base.`);
  if (total === 0) {
    console.log("\nLa file est VIDE — c'est le bon moment pour l'outiller : rien à rattraper.");
  }

  titre("1. Par statut");
  for (const s of await prisma.userReport.groupBy({ by: ["status"], _count: { _all: true } })) {
    console.log(`  ${String(s.status).padEnd(14)} ${String(s._count._all).padStart(4)}`);
  }

  titre("2. Par type de cible");
  for (const s of await prisma.userReport.groupBy({ by: ["targetType"], _count: { _all: true } })) {
    console.log(`  ${String(s.targetType).padEnd(16)} ${String(s._count._all).padStart(4)}`);
  }

  titre("3. Par motif");
  for (const s of await prisma.userReport.groupBy({ by: ["reasonCode"], _count: { _all: true } })) {
    console.log(`  ${String(s.reasonCode).padEnd(24)} ${String(s._count._all).padStart(4)}`);
  }

  titre("4. La cible est-elle encore RÉSOLVABLE ?");
  /*
    C'est LA mesure de ce script. Un signalement dont on ne peut pas atteindre la cible ne
    s'instruit pas — quel que soit le soin apporté à l'écran qui l'affiche.
  */
  const tous = await prisma.userReport.findMany({
    select: { id: true, targetType: true, targetId: true, reasonCode: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  let resolvables = 0;
  let perdus = 0;
  for (const r of tous) {
    let trouve = false;
    if (r.targetType === "PROFILE") {
      trouve = (await prisma.account.count({ where: { id: r.targetId } })) > 0;
    } else if (r.targetType === "SESSION_MESSAGE") {
      trouve = (await prisma.sessionMessage.count({ where: { id: r.targetId } })) > 0;
    } else if (r.targetType === "FACILITY") {
      trouve = (await prisma.facility.count({ where: { id: r.targetId } })) > 0;
    }
    if (trouve) {
      resolvables++;
    } else {
      perdus++;
      console.log(`  ⚠️ cible introuvable : ${r.targetType} ${r.targetId.slice(0, 8)}… (signalement ${r.id.slice(0, 8)}…)`);
    }
  }
  console.log(`  ${resolvables} résolvable(s) · ${perdus} sans cible atteignable.`);

  titre("5. Les plus anciens encore OUVERTS, face au délai cible PM-23");
  const pm23 = await prisma.platformParameter.findUnique({ where: { key: "PM-23" } });
  console.log(`  PM-23 (délai cible, heures) = ${pm23?.value ?? "(non semé)"}`);
  const ouverts = tous.filter((r) => r.status === "OPEN").slice(0, 10);
  if (ouverts.length === 0) {
    console.log("  Aucun signalement ouvert.");
  }
  for (const r of ouverts) {
    console.log(`  ${r.createdAt.toISOString()}  ${jours(r.createdAt).padStart(8)}  ${r.targetType.padEnd(16)} ${r.reasonCode}`);
  }

  titre("6. Décisions déjà rendues");
  const decisions = await prisma.moderationDecision.groupBy({ by: ["decision"], _count: { _all: true } });
  if (decisions.length === 0) {
    console.log("  Aucune — personne n'a encore instruit de signalement.");
  }
  for (const d of decisions) {
    console.log(`  ${String(d.decision).padEnd(18)} ${String(d._count._all).padStart(4)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

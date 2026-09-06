/**
 * État des retraits — STRICTEMENT EN LECTURE. Chantier 50, 06/09/2026.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * `confirmWithdrawal` (M13) procède en trois temps :
 *
 *   1. **TX 1** — revendication (`aggregatorRef` posé), **débit du solde**, mouvement, audit ;
 *   2. **appel réseau** à l'agrégateur Mobile Money, hors transaction (RM-13-03, et c'est juste :
 *      on ne tient pas une transaction ouverte pendant un appel réseau) ;
 *   3. **TX 2** — issue : `EXECUTED`, ou `FAILED` avec re-crédit intégral.
 *
 * ⚠️ **Si le processus meurt entre 1 et 3, l'argent est débité et rien ne le sait.** Le retrait
 * reste `PENDING` avec un `aggregatorRef` posé, et :
 *
 *   • l'utilisateur ne peut pas réessayer — la revendication exige `aggregatorRef: null`, il reçoit
 *     « ce retrait est déjà en cours de traitement », pour toujours ;
 *   • la réconciliation quotidienne ne le voit pas — elle ne lit que les retraits `EXECUTED` ;
 *   • aucune route d'administration ne peut le débloquer ;
 *   • et il **empêche la clôture du compte** : `m01.service.ts` compte les retraits `PENDING`
 *     parmi les prérequis.
 *
 * Le plan gratuit de Render met le service en veille après ~15 min et le redémarre à la demande ;
 * un déploiement, un redémarrage ou un délai d'agrégateur qui survit au processus suffisent.
 *
 * ── Ce que ce script fait ─────────────────────────────────────────────────────────────────────
 *
 * Il compte, et il ne fait que compter. La SIGNATURE du défaut est précise :
 * `status = PENDING` **et** `aggregatorRef IS NOT NULL` — TX 1 a été validée, TX 2 jamais.
 * Un `PENDING` sans `aggregatorRef` est normal : c'est un retrait lancé, pas encore confirmé.
 *
 * Aucune écriture, aucune migration, NestJS n'est pas démarré — donc aucun `@Cron`.
 *
 *   npx ts-node scripts/etat-retraits.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

const xaf = (n: number): string => new Intl.NumberFormat("fr-FR").format(n) + " XAF";

async function main(): Promise<void> {
  console.log("ÉTAT DES RETRAITS — lecture seule, aucune écriture.");

  titre("1. Répartition par statut");
  const parStatut = await prisma.withdrawal.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amountXaf: true },
  });
  if (parStatut.length === 0) {
    console.log("  Aucun retrait en base.");
  }
  for (const s of parStatut) {
    console.log(`  ${String(s.status).padEnd(10)} ${String(s._count._all).padStart(4)}  ${xaf(s._sum.amountXaf ?? 0)}`);
  }

  titre("2. Retraits ORPHELINS — débités, sans issue");
  /*
    La signature exacte : revendiqué (donc débité en TX 1) et jamais soldé (TX 2 absente).
    C'est de l'argent retiré d'un solde sans virement correspondant.
  */
  const orphelins = await prisma.withdrawal.findMany({
    where: { status: "PENDING", aggregatorRef: { not: null } },
    select: { id: true, amountXaf: true, requestedAt: true, operator: true, accountId: true },
    orderBy: { requestedAt: "asc" },
  });
  if (orphelins.length === 0) {
    console.log("  Aucun. Le défaut ne s'est pas encore produit en production.");
  } else {
    console.log(`  ⚠️ ${orphelins.length} retrait(s) débité(s) sans virement ni re-crédit :`);
    for (const w of orphelins) {
      console.log(`    ${w.id}  ${xaf(w.amountXaf).padStart(16)}  ${w.operator}  ${w.requestedAt.toISOString()}`);
    }
  }

  titre("3. Retraits en attente NORMALE (lancés, pas encore confirmés)");
  const enAttente = await prisma.withdrawal.count({ where: { status: "PENDING", aggregatorRef: null } });
  console.log(`  ${enAttente} — ceux-là n'ont rien débité, ils attendent le mot de passe et l'OTP.`);

  titre("4. Soldes de gains");
  const comptes = await prisma.earningsAccount.findMany({
    select: { holderType: true, holderId: true, availableXaf: true },
  });
  console.log(`  ${comptes.length} compte(s) de gains.`);
  for (const c of comptes) {
    console.log(`    ${c.holderType.padEnd(13)} ${c.holderId}  dispo ${xaf(c.availableXaf)}`);
  }
}

main()
  .catch((e) => {
    console.error("\nÉCHEC :", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

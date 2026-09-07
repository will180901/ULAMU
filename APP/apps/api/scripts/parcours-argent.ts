/**
 * Le parcours de l'argent, de bout en bout — STRICTEMENT EN LECTURE. Chantier 64, 07/09/2026.
 *
 * ── Pourquoi cette sonde existe ────────────────────────────────────────────────────────────────
 *
 * Six relectures de modules n'ont rien trouvé de comparable à ce qu'ont trouvé trois mesures de
 * bout en bout. Le défaut ne vit pas dans un module : il vit dans l'enchaînement de morceaux qui
 * sont chacun corrects.
 *
 * Cette sonde suit donc l'argent — poignée de main → paiement → session → gains → retrait — et
 * éprouve les PROMESSES que la plateforme écrit à l'écran, une par une :
 *
 *   1. « Aucun franc n'est débité tant que le soignant n'a pas confirmé »  (écran fiche soignant)
 *   2. « Remboursement automatique en cas de défaillance »                  (même écran)
 *   3. Les gains affichés sont ceux qu'on peut retirer                      (invariant n° 3)
 *   4. Un retrait interrompu ne laisse d'argent nulle part                  (chantier 50)
 *
 * ⚠️ Aucune écriture, aucune migration, NestJS n'est pas démarré — donc aucun `@Cron`.
 *
 *   npx ts-node scripts/parcours-argent.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

const xaf = (n: number): string => new Intl.NumberFormat("fr-FR").format(n) + " XAF";
const jours = (d: Date): string => `${((Date.now() - d.getTime()) / 86_400_000).toFixed(1)} j`;

/** Ce qui compte : le nombre d'écarts trouvés. Zéro partout = la chaîne tient. */
let ecarts = 0;
function ecart(quoi: string): void {
  ecarts++;
  console.log(`  ⚠️ ${quoi}`);
}

async function main(): Promise<void> {
  console.log("LE PARCOURS DE L'ARGENT — lecture seule, aucune écriture.");

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("0. Le volume — de quoi on parle");
  const [handshakes, sessions, paiements, comptes, retraits] = await Promise.all([
    prisma.handshake.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.careSession.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountXaf: true } }),
    prisma.earningsAccount.count(),
    prisma.withdrawal.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountXaf: true } }),
  ]);
  console.log("  Poignées de main : " + (handshakes.map((h) => `${h.status} ${h._count._all}`).join(" · ") || "aucune"));
  console.log("  Sessions         : " + (sessions.map((s) => `${s.status} ${s._count._all}`).join(" · ") || "aucune"));
  console.log(
    "  Paiements        : " +
      (paiements.map((p) => `${p.status} ${p._count._all} (${xaf(p._sum.amountXaf ?? 0)})`).join(" · ") || "aucun"),
  );
  console.log(`  Comptes de gains : ${comptes}`);
  console.log(
    "  Retraits         : " +
      (retraits.map((w) => `${w.status} ${w._count._all} (${xaf(w._sum.amountXaf ?? 0)})`).join(" · ") || "aucun"),
  );

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("1. « Aucun franc n'est débité tant que le soignant n'a pas confirmé »");
  /*
    L'invariant n° 1 de la liste rouge : JAMAIS de paiement sans confirmation valide (RM-06-01).
    Une session existe ⇒ un paiement a réussi ⇒ la poignée de main devait être CONFIRMÉE avant.
  */
  const toutesSessions = await prisma.careSession.findMany({
    select: { id: true, orderRef: true, handshakeId: true, paidAt: true, status: true, professionalId: true },
  });
  const handshakesDesSessions = await prisma.handshake.findMany({
    where: { id: { in: toutesSessions.map((s) => s.handshakeId) } },
    select: { id: true, status: true, confirmedAt: true, confirmExpiresAt: true },
  });
  const parId = new Map(handshakesDesSessions.map((h) => [h.id, h]));

  for (const s of toutesSessions) {
    const h = parId.get(s.handshakeId);
    if (!h) {
      ecart(`session ${s.id.slice(0, 8)} sans poignée de main — le paiement n'a rien confirmé`);
      continue;
    }
    if (h.confirmedAt === null) {
      ecart(`session ${s.id.slice(0, 8)} payée alors que la poignée de main n'a JAMAIS été confirmée`);
      continue;
    }
    // La confirmation doit précéder le paiement, pas le suivre.
    if (h.confirmedAt.getTime() > s.paidAt.getTime()) {
      ecart(`session ${s.id.slice(0, 8)} payée AVANT la confirmation (${h.confirmedAt.toISOString()} > ${s.paidAt.toISOString()})`);
    }
  }
  console.log(`  ${toutesSessions.length} session(s) vérifiée(s) contre leur poignée de main.`);

  // Le pendant : un paiement réussi sans session derrière.
  const paiementsOk = await prisma.payment.findMany({
    where: { status: "SUCCEEDED" },
    select: { id: true, orderRef: true, amountXaf: true, createdAt: true, payerId: true },
  });
  const refsDeSession = new Set(toutesSessions.map((s) => s.orderRef));
  for (const p of paiementsOk) {
    if (!refsDeSession.has(p.orderRef)) {
      ecart(`paiement ${p.orderRef} réussi (${xaf(p.amountXaf)}) sans session correspondante`);
    }
  }
  console.log(`  ${paiementsOk.length} paiement(s) réussi(s) rattaché(s) à une session.`);

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("2. « Remboursement automatique en cas de défaillance »");
  const sessionsRemboursees = toutesSessions.filter((s) => s.status === "REFUNDED");
  console.log(`  ${sessionsRemboursees.length} session(s) au statut REFUNDED.`);
  for (const s of sessionsRemboursees) {
    const p = await prisma.payment.findUnique({
      where: { orderRef: s.orderRef },
      select: { status: true, refundedAt: true, split: { select: { reversedAt: true, capturedAt: true, netXaf: true } } },
    });
    if (!p) {
      ecart(`session remboursée ${s.id.slice(0, 8)} sans paiement — rien à rembourser ?`);
      continue;
    }
    if (p.status !== "REFUNDED" || p.refundedAt === null) {
      ecart(`session ${s.id.slice(0, 8)} marquée REFUNDED mais le PAIEMENT ne l'est pas (statut ${p.status})`);
    }
    // Si les gains avaient été crédités, ils doivent avoir été contre-passés.
    if (p.split?.capturedAt && !p.split.reversedAt) {
      ecart(`session ${s.id.slice(0, 8)} remboursée au patient mais les gains du soignant N'ONT PAS été repris`);
    }
  }

  /*
    L'autre moitié, et la plus intéressante : ce qui AURAIT dû être remboursé et ne l'a pas été.
    Une session qui n'a jamais démarré ou qui traîne bien au-delà de sa durée est le signe qu'une
    défaillance n'a pas été rattrapée.
  */
  const enCours = toutesSessions.filter((s) => s.status === "PREPARING" || s.status === "ACTIVE");
  const detailEnCours = await prisma.careSession.findMany({
    where: { id: { in: enCours.map((s) => s.id) } },
    select: { id: true, status: true, paidAt: true, durationMin: true, startedAt: true, endsAt: true },
  });
  for (const s of detailEnCours) {
    const ageJours = (Date.now() - s.paidAt.getTime()) / 86_400_000;
    if (ageJours > 1) {
      ecart(
        `session ${s.id.slice(0, 8)} encore ${s.status} depuis ${jours(s.paidAt)} — payée, jamais close, jamais remboursée`,
      );
    }
  }
  console.log(`  ${detailEnCours.length} session(s) encore en cours.`);

  // Poignées de main confirmées et jamais payées : de l'attente, pas de l'argent perdu — mais on compte.
  const confirmeesSansSuite = await prisma.handshake.count({ where: { status: "CONFIRMED" } });
  console.log(`  ${confirmeesSansSuite} poignée(s) de main confirmée(s) en attente de paiement.`);

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("3. Invariant n° 3 : le solde affiché est la somme des mouvements");
  /*
    C'est l'invariant que le modèle lui-même déclare (`sum(amountXaf) == availableXaf`). S'il est
    faux, le soignant voit un solde qu'il ne peut pas retirer — ou retire de l'argent qui n'existe
    pas.
  */
  const tousComptes = await prisma.earningsAccount.findMany({
    select: { id: true, holderType: true, holderId: true, availableXaf: true },
  });
  for (const c of tousComptes) {
    const somme = await prisma.earningsEntry.aggregate({ where: { accountId: c.id }, _sum: { amountXaf: true } });
    const calcule = somme._sum.amountXaf ?? 0;
    if (calcule !== c.availableXaf) {
      ecart(
        `compte ${c.holderId.slice(0, 8)} : solde affiché ${xaf(c.availableXaf)} ≠ somme des mouvements ${xaf(calcule)}`,
      );
    }
    if (c.availableXaf < 0) {
      ecart(`compte ${c.holderId.slice(0, 8)} : solde NÉGATIF (${xaf(c.availableXaf)})`);
    }
  }
  console.log(`  ${tousComptes.length} compte(s) de gains vérifié(s).`);

  // Chaque split capturé doit avoir crédité exactement une fois.
  const splitsCaptures = await prisma.paymentSplit.findMany({
    where: { capturedAt: { not: null }, reversedAt: null },
    select: { paymentId: true, netXaf: true, holderId: true, holderType: true },
  });
  for (const sp of splitsCaptures) {
    const paiement = await prisma.payment.findUnique({ where: { id: sp.paymentId }, select: { orderRef: true } });
    if (!paiement) continue;
    const credits = await prisma.earningsEntry.findMany({
      where: { reference: paiement.orderRef, type: "CREDIT" },
      select: { amountXaf: true },
    });
    if (credits.length === 0) {
      ecart(`split capturé pour ${paiement.orderRef} (${xaf(sp.netXaf)}) sans aucun crédit au compte de gains`);
    } else if (credits.length > 1) {
      ecart(`split capturé pour ${paiement.orderRef} crédité ${credits.length} FOIS`);
    } else if (credits[0].amountXaf !== sp.netXaf) {
      ecart(`split ${paiement.orderRef} : net ${xaf(sp.netXaf)} mais crédit ${xaf(credits[0].amountXaf)}`);
    }
  }
  console.log(`  ${splitsCaptures.length} part(s) de soignant capturée(s) vérifiée(s).`);

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("4. Les retraits — argent sorti d'un solde");
  const orphelins = await prisma.withdrawal.findMany({
    where: { status: "PENDING", aggregatorRef: { not: null } },
    select: { id: true, amountXaf: true, requestedAt: true, operator: true },
  });
  for (const w of orphelins) {
    ecart(`retrait ${w.id.slice(0, 8)} débité (${xaf(w.amountXaf)}) sans virement ni re-crédit — depuis ${jours(w.requestedAt)}`);
  }
  console.log(`  ${orphelins.length} retrait(s) orphelin(s).`);

  // Un retrait EXÉCUTÉ doit avoir son mouvement de débit, et un seul.
  const executes = await prisma.withdrawal.findMany({
    where: { status: "EXECUTED" },
    select: { id: true, amountXaf: true, accountId: true },
  });
  for (const w of executes) {
    const debits = await prisma.earningsEntry.findMany({
      where: { accountId: w.accountId, type: "WITHDRAWAL", reference: { contains: w.id } },
      select: { amountXaf: true },
    });
    if (debits.length === 0) {
      ecart(`retrait ${w.id.slice(0, 8)} EXÉCUTÉ (${xaf(w.amountXaf)}) sans mouvement de débit — argent viré, solde intact`);
    } else if (debits.length > 1) {
      ecart(`retrait ${w.id.slice(0, 8)} débité ${debits.length} FOIS`);
    }
  }
  console.log(`  ${executes.length} retrait(s) exécuté(s) vérifié(s).`);

  // Un retrait ÉCHOUÉ doit avoir été re-crédité s'il avait été débité.
  const echoues = await prisma.withdrawal.findMany({
    where: { status: "FAILED" },
    select: { id: true, amountXaf: true, accountId: true },
  });
  for (const w of echoues) {
    const mouvements = await prisma.earningsEntry.findMany({
      where: { accountId: w.accountId, reference: { contains: w.id } },
      select: { amountXaf: true, type: true },
    });
    const net = mouvements.reduce((t, m) => t + m.amountXaf, 0);
    if (mouvements.length > 0 && net !== 0) {
      ecart(`retrait ${w.id.slice(0, 8)} ÉCHOUÉ mais le solde reste amputé de ${xaf(-net)}`);
    }
  }
  console.log(`  ${echoues.length} retrait(s) échoué(s) vérifié(s).`);

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("VERDICT");
  console.log(ecarts === 0 ? "  Aucun écart. La chaîne de l'argent tient." : `  ${ecarts} écart(s) — détaillés ci-dessus.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

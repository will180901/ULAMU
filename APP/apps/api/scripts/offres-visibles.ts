/**
 * Ce que le PATIENT peut réellement choisir, soignant par soignant — LECTURE SEULE. Chantier 120.
 *
 * ── Pourquoi cette sonde existe ────────────────────────────────────────────────────────────────
 *
 * Le téléphone ouvre désormais le choix de l'offre au patient (chantier 120) : il affiche toutes les
 * offres de CONSULTATION actives et le laisse cocher la sienne. Une question se pose aussitôt, et
 * elle ne se répond pas depuis le code : **y a-t-il, en vrai, plus d'une offre à choisir ?**
 *
 * Un sélecteur qui n'a jamais qu'une ligne est un sélecteur mort, et l'écran doit alors se comporter
 * comme avant (une seule ligne, pas de case à cocher — ce qu'il fait). Un sélecteur qui en a
 * plusieurs, à l'inverse, se vérifie sur un vrai profil avant d'être livré.
 *
 * ⚠️ Elle dit aussi ce que la CARTE de l'annuaire affiche comme prix d'appel : `cheapestOffer` est
 * calculée **tous types confondus**, donc un soignant dont le suivi est moins cher que sa
 * consultation affiche le prix du SUIVI dans la liste — le défaut exact que le chantier 65 avait
 * corrigé sur la fiche, resté sur la liste.
 *
 * ── Ce qu'elle ne fait pas ────────────────────────────────────────────────────────────────────
 *
 * Aucune écriture, aucune transaction, aucun `@Cron` : un `PrismaClient` nu, trois `findMany`, et
 * on referme. Elle peut tourner contre la production sans rien y toucher.
 *
 * Lancer : `npx ts-node scripts/offres-visibles.ts` (dossier `apps/api`).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function xaf(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " XAF";
}

async function main(): Promise<void> {
  const pros = await prisma.professionalProfile.findMany({
    select: { accountId: true, displayName: true, category: true },
    orderBy: { displayName: "asc" },
  });

  const offers = await prisma.careOffer.findMany({
    where: { professionalId: { in: pros.map((p) => p.accountId) } },
    orderBy: { priceXaf: "asc" },
  });

  console.log(`\n${pros.length} profil(s) professionnel(s) — ce que le patient voit sur la fiche\n`);

  let avecChoix = 0;
  let sansRien = 0;
  const prixDAppelTrompeur: string[] = [];

  for (const pro of pros) {
    const siennes = offers.filter((o) => o.professionalId === pro.accountId);
    const actives = siennes.filter((o) => o.active);
    const consultations = actives.filter((o) => o.kind === "STANDARD");
    const suivis = actives.filter((o) => o.kind === "FOLLOW_UP");

    if (consultations.length > 1) avecChoix += 1;
    if (consultations.length === 0) sansRien += 1;

    // Le prix d'appel de la LISTE : la moins chère tous types confondus (m05.directory.service).
    const appel = actives[0] ?? null;
    if (appel && appel.kind === "FOLLOW_UP" && consultations.length > 0) {
      prixDAppelTrompeur.push(`${pro.displayName} — liste : ${xaf(appel.priceXaf)} (suivi) / fiche : ${xaf(consultations[0].priceXaf)}`);
    }

    console.log(`── ${pro.displayName} (${pro.category})`);
    console.log(`   offres au total : ${siennes.length}  ·  actives : ${actives.length}`);
    if (consultations.length === 0) {
      console.log(`   ⚠️  AUCUNE consultation active — rien à vendre, la fiche le dit et propose la cloche`);
    } else {
      console.log(`   CHOIX DU PATIENT (${consultations.length} offre${consultations.length > 1 ? "s" : ""}) :`);
      for (const [i, o] of consultations.entries()) {
        console.log(`     ${i === 0 ? "●" : "○"} ${o.label} — ${o.durationMin} min — ${xaf(o.priceXaf)}${i === 0 ? "   ← coché par défaut" : ""}`);
      }
    }
    for (const o of suivis) {
      console.log(`   (hors choix) suivi : ${o.label} — ${o.durationMin} min — ${xaf(o.priceXaf)}`);
    }
    const eteintes = siennes.filter((o) => !o.active);
    for (const o of eteintes) {
      console.log(`   (éteinte)   ${o.kind} · ${o.label} — ${xaf(o.priceXaf)}`);
    }
    console.log("");
  }

  console.log("── Ce qu'il faut en retenir ───────────────────────────────────────────────");
  console.log(`   soignants offrant un VRAI choix (≥ 2 consultations actives) : ${avecChoix}`);
  console.log(`   soignants sans aucune consultation active                   : ${sansRien}`);
  if (prixDAppelTrompeur.length > 0) {
    console.log(`\n   ⚠️  Prix d'appel de la LISTE tiré d'une offre de SUIVI (${prixDAppelTrompeur.length}) :`);
    for (const l of prixDAppelTrompeur) console.log(`      ${l}`);
  } else {
    console.log(`   aucun prix d'appel de liste tiré d'une offre de suivi aujourd'hui`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

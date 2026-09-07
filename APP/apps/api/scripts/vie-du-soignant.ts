/**
 * La vie d'un soignant, de l'inscription à la première consultation — LECTURE SEULE. Chantier 65.
 *
 * ── Pourquoi cette sonde existe ────────────────────────────────────────────────────────────────
 *
 * C'est le côté OFFRE de la plateforme, et le seul parcours jamais mesuré de bout en bout. Six
 * relectures ont examiné chaque morceau ; personne n'a suivi la chaîne entière. Or un soignant qui
 * n'arrive pas à devenir visible ne peut pas travailler — et alors rien d'autre ne compte.
 *
 * ── Les conditions RÉELLES pour apparaître dans l'annuaire ────────────────────────────────────
 *
 * Lues dans `m05.directory.service.ts`, et elles sont TROIS :
 *
 *   1. le compte est `ACTIVE` (RM-05-05) ;
 *   2. le dossier de vérification est `VERIFIED` (RM-05-01) ;
 *   3. le contrat a **au moins une version signée ET aucune version non signée**.
 *
 * ⚠️ La troisième est la plus surprenante : une NOUVELLE version de contrat non encore signée fait
 * **disparaître le soignant de l'annuaire**, même s'il avait signé toutes les précédentes. Une
 * révision du contrat retirerait donc d'un coup toute l'offre de la plateforme, jusqu'à ce que
 * chacun re-signe.
 *
 * Cette sonde compte donc l'entonnoir, et dit pour chaque soignant invisible **quelle est la
 * première condition qui bloque** — un entonnoir sans le motif de chaque perte ne sert à rien.
 *
 * Aucune écriture, aucune migration, NestJS n'est pas démarré — donc aucun `@Cron`.
 *
 *   npx ts-node scripts/vie-du-soignant.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

const xaf = (n: number): string => new Intl.NumberFormat("fr-FR").format(n) + " XAF";
const jours = (d: Date): string => `${((Date.now() - d.getTime()) / 86_400_000).toFixed(1)} j`;

async function main(): Promise<void> {
  console.log("LA VIE D'UN SOIGNANT — lecture seule, aucune écriture.");

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("1. Les comptes soignants");
  const comptes = await prisma.account.findMany({
    where: { type: "PROFESSIONAL" },
    select: { id: true, status: true, createdAt: true, professionalProfile: { select: { firstName: true, lastName: true, category: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  ${comptes.length} compte(s) de type PROFESSIONAL.`);
  const parStatut = new Map<string, number>();
  for (const c of comptes) parStatut.set(c.status, (parStatut.get(c.status) ?? 0) + 1);
  for (const [s, n] of parStatut) console.log(`    ${s.padEnd(12)} ${n}`);
  const sansProfil = comptes.filter((c) => !c.professionalProfile);
  if (sansProfil.length > 0) {
    console.log(`  ⚠️ ${sansProfil.length} compte(s) sans fiche professionnelle — inscription interrompue ?`);
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("2. Les dossiers de vérification");
  const dossiers = await prisma.verificationCase.findMany({
    where: { professionalId: { not: null } },
    select: {
      id: true,
      professionalId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      documents: { select: { kind: true } },
      agreement: { select: { versions: { select: { version: true, signedAt: true, commissionPct: true } } } },
    },
  });
  console.log(`  ${dossiers.length} dossier(s) pour ${comptes.length} compte(s).`);
  const parEtat = new Map<string, number>();
  for (const d of dossiers) parEtat.set(d.status, (parEtat.get(d.status) ?? 0) + 1);
  for (const [s, n] of parEtat) console.log(`    ${s.padEnd(12)} ${n}`);

  const sansDossier = comptes.filter((c) => !dossiers.some((d) => d.professionalId === c.id));
  if (sansDossier.length > 0) {
    console.log(`  ⚠️ ${sansDossier.length} soignant(s) SANS dossier de vérification :`);
    for (const c of sansDossier) {
      console.log(`      ${c.id.slice(0, 8)} inscrit depuis ${jours(c.createdAt)} · ${c.professionalProfile?.lastName ?? "(sans profil)"}`);
    }
  }

  // Dossiers en attente d'une décision humaine : combien de temps attendent-ils ?
  const enAttente = dossiers.filter((d) => d.status === "SUBMITTED" || d.status === "IN_REVIEW");
  if (enAttente.length > 0) {
    console.log(`  ${enAttente.length} dossier(s) en attente d'examen :`);
    for (const d of enAttente) {
      console.log(`      ${d.id.slice(0, 8)} ${d.status} depuis ${jours(d.updatedAt)} · ${d.documents.length} pièce(s)`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("3. Les contrats");
  const avecContrat = dossiers.filter((d) => d.agreement !== null);
  console.log(`  ${avecContrat.length} dossier(s) avec un contrat généré.`);
  for (const d of avecContrat) {
    const v = d.agreement!.versions;
    const signees = v.filter((x) => x.signedAt !== null).length;
    const nonSignees = v.filter((x) => x.signedAt === null).length;
    const etat = nonSignees > 0 ? "⚠️ une version NON signée" : signees > 0 ? "toutes signées" : "aucune version";
    console.log(
      `      ${d.professionalId?.slice(0, 8)} · ${v.length} version(s) · ${signees} signée(s) · ${etat}` +
        (v.length > 0 ? ` · commission ${v[v.length - 1].commissionPct} %` : ""),
    );
  }
  const verifiesSansContrat = dossiers.filter((d) => d.status === "VERIFIED" && d.agreement === null);
  if (verifiesSansContrat.length > 0) {
    console.log(`  ⚠️ ${verifiesSansContrat.length} dossier(s) VÉRIFIÉ(s) sans contrat généré — impasse.`);
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("4. L'ENTONNOIR : qui apparaît dans l'annuaire, et pourquoi les autres n'y sont pas");
  /*
    On rejoue ici, une par une, les trois conditions du service d'annuaire — et on nomme la PREMIÈRE
    qui bloque. Un entonnoir sans motif de perte ne dit pas quoi corriger.
  */
  let visibles = 0;
  const motifs = new Map<string, number>();
  for (const c of comptes) {
    const d = dossiers.find((x) => x.professionalId === c.id);
    let motif: string | null = null;
    if (!c.professionalProfile) motif = "pas de fiche professionnelle";
    else if (c.status !== "ACTIVE") motif = `compte ${c.status}`;
    else if (!d) motif = "aucun dossier de vérification";
    else if (d.status !== "VERIFIED") motif = `dossier ${d.status}`;
    else if (!d.agreement) motif = "aucun contrat généré";
    else if (d.agreement.versions.length === 0) motif = "contrat sans version";
    else if (d.agreement.versions.some((v) => v.signedAt === null)) motif = "une version de contrat NON SIGNÉE";
    else if (!d.agreement.versions.some((v) => v.signedAt !== null)) motif = "aucune version signée";

    if (motif === null) visibles++;
    else motifs.set(motif, (motifs.get(motif) ?? 0) + 1);
  }
  console.log(`  VISIBLES dans l'annuaire : ${visibles} / ${comptes.length}`);
  if (motifs.size > 0) {
    console.log("  Motifs d'invisibilité :");
    for (const [m, n] of [...motifs].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)} × ${m}`);
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("5. Être visible ne suffit pas : encore faut-il une offre");
  const offres = await prisma.careOffer.groupBy({ by: ["professionalId", "kind", "active"], _count: { _all: true } });
  const avecOffreActive = new Set(offres.filter((o) => o.active && o.kind === "STANDARD").map((o) => o.professionalId));
  console.log(`  ${avecOffreActive.size} soignant(s) avec une offre STANDARD active.`);
  const details = await prisma.careOffer.findMany({
    select: { professionalId: true, label: true, priceXaf: true, durationMin: true, kind: true, active: true },
  });
  for (const o of details) {
    console.log(`      ${o.professionalId.slice(0, 8)} · ${o.kind} · ${o.label} · ${xaf(o.priceXaf)} · ${o.durationMin} min · ${o.active ? "active" : "INACTIVE"}`);
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  titre("6. Et au bout : a-t-il consulté, et a-t-il été payé ?");
  const sessionsParPro = await prisma.careSession.groupBy({ by: ["professionalId"], _count: { _all: true } });
  console.log(`  ${sessionsParPro.length} soignant(s) ayant tenu au moins une session.`);
  const comptesGains = await prisma.earningsAccount.findMany({
    where: { holderType: "PROFESSIONAL" },
    select: { holderId: true, availableXaf: true },
  });
  console.log(`  ${comptesGains.length} compte(s) de gains ouvert(s).`);
  for (const g of comptesGains) console.log(`      ${g.holderId.slice(0, 8)} · ${xaf(g.availableXaf)}`);

  titre("LECTURE DE L'ENTONNOIR");
  console.log(`  inscrits ${comptes.length} → dossiers ${dossiers.length} → vérifiés ${parEtat.get("VERIFIED") ?? 0}` +
    ` → visibles ${visibles} → avec offre ${avecOffreActive.size} → ont consulté ${sessionsParPro.length} → payés ${comptesGains.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

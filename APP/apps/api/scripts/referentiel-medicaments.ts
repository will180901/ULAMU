/**
 * Charge le référentiel médicaments dans la base — et RIEN d'autre.
 *
 * ── Pourquoi ce script, et pas le seed ─────────────────────────────────────────────────────────
 *
 * Le référentiel passe de 6 à 64 entrées (option B, validée par le porteur le 25/08). C'est la
 * **seule écriture en base** de toute la reconstruction du web.
 *
 * Elle ne peut pas passer par le déploiement : Render exécute `prisma migrate deploy && node …`,
 * jamais le seed. Un `git push` ne mettrait donc aucun médicament dans la base — l'écran C7
 * chercherait dans six entrées, exactement comme aujourd'hui.
 *
 * Et elle ne peut pas passer par `npm run prisma:seed` non plus : ce seed crée les comptes de
 * démonstration (`dr.nouveau`, `dr.solange`, `dr.firmin`, `pharma.demo`…) que le porteur a
 * **supprimés le 28/08** pour ne garder que `patient.demo` et le vrai `dr.armel`. Le relancer les
 * ferait tous revenir dans l'annuaire, et ruinerait le ménage.
 *
 * D'où ce script : il ne touche QUE la table `Medicament`.
 *
 * ── Emploi ────────────────────────────────────────────────────────────────────────────────────
 *
 *   npx ts-node scripts/referentiel-medicaments.ts              → INVENTAIRE seul, n'écrit rien
 *   npx ts-node scripts/referentiel-medicaments.ts --appliquer  → insère ce qui manque
 *
 * ⚠️ La base Neon est UNIQUE : elle sert le développement ET le site en ligne. Ce script agit donc
 * sur la production. L'inventaire est imprimé avant toute écriture, et rien n'est écrit sans
 * `--appliquer`.
 *
 * ── Ce qu'il ne fait pas ──────────────────────────────────────────────────────────────────────
 *
 * Il ne supprime rien et ne remplace rien. L'identité d'une entrée est le couple (DCI, dosage) — le
 * même que celui du seed. Une entrée déjà présente garde ses noms commerciaux : un médicament peut
 * avoir été corrigé à la main, et ce script n'a pas à défaire le travail de quelqu'un d'autre.
 *
 * **Une seule exception, et c'est une question de sécurité :** les étiquettes de classe du garde-fou
 * allergies (« pénicilline ») sont AJOUTÉES aux entrées qui ne les portent pas. La ligne
 * « Amoxicilline 500 mg » existait déjà, créée par l'ancien seed sans cette étiquette : sans la
 * réparation, une allergie déclarée « pénicilline » au Carnet ne déclenchait AUCUNE alerte sur le
 * cas d'école. On ajoute, on ne retire jamais.
 *
 * Il est rejouable sans risque.
 */
import { PrismaClient } from "@prisma/client";
import { REFERENTIEL_MEDICAMENTS } from "../prisma/referentiel-medicaments";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const appliquer = process.argv.includes("--appliquer");

  const existants = await prisma.medicament.findMany({
    select: { id: true, dci: true, dosage: true, commercialNames: true, active: true },
    orderBy: { dci: "asc" },
  });
  const cle = (dci: string, dosage: string | null) => `${dci}|||${dosage ?? ""}`;
  const dejaLa = new Set(existants.map((m) => cle(m.dci, m.dosage)));

  const aInserer = REFERENTIEL_MEDICAMENTS.filter((m) => !dejaLa.has(cle(m.dci, m.dosage)));

  console.log(`\n══ ÉTAT DE LA BASE ══`);
  console.log(`  déjà présents ......... ${existants.length}`);
  console.log(`  dans le référentiel ... ${REFERENTIEL_MEDICAMENTS.length}`);
  console.log(`  à insérer ............. ${aInserer.length}`);

  if (existants.length > 0) {
    console.log(`\n══ DÉJÀ EN BASE ══`);
    for (const m of existants) {
      const inactif = m.active ? "" : "  [INACTIF]";
      console.log(`  = ${m.dci} ${m.dosage ?? ""}${inactif}`);
    }
  }

  if (aInserer.length > 0) {
    console.log(`\n══ À INSÉRER ══`);
    for (const m of aInserer) {
      const noms = m.commercialNames.length > 0 ? ` (${m.commercialNames.join(", ")})` : "";
      console.log(`  + ${m.dci} ${m.dosage} · ${m.form}${noms}`);
    }
  }

  // Le garde-fou allergies (EF-09-03) lit la DCI ET les noms commerciaux. Le porteur doit voir
  // quelles entrées portent l'étiquette de classe « pénicilline » — sans elle, une allergie
  // déclarée « pénicilline » ne déclenche aucune alerte sur l'Amoxicilline.
  const marquees = REFERENTIEL_MEDICAMENTS.filter((m) =>
    m.commercialNames.some((n) => n.toLowerCase() === "pénicilline"),
  );
  console.log(`\n══ GARDE-FOU ALLERGIES ══`);
  console.log(`  ${marquees.length} entrée(s) portent l'étiquette de classe « pénicilline » :`);
  for (const m of marquees) console.log(`    · ${m.dci} ${m.dosage}`);
  console.log(`  Une allergie déclarée « pénicilline » au Carnet les fera toutes alerter.`);

  if (!appliquer) {
    console.log(`\n▶ INVENTAIRE SEUL — rien n'a été écrit.`);
    console.log(`  Pour appliquer : npx ts-node scripts/referentiel-medicaments.ts --appliquer\n`);
    return;
  }

  console.log(`\n▶ ÉCRITURE EN COURS…`);
  if (aInserer.length === 0) console.log(`  (rien à insérer — le référentiel est déjà complet)`);

  // `createMany` d'un coup : ces lignes n'ont aucune dépendance, et la base est à Francfort —
  // 64 allers-retours coûteraient plus cher que l'écriture elle-même.
  const { count } =
    aInserer.length === 0
      ? { count: 0 }
      : await prisma.medicament.createMany({
          data: aInserer.map((m) => ({
            dci: m.dci,
            commercialNames: m.commercialNames,
            form: m.form,
            dosage: m.dosage,
          })),
        });

  const reparees = await reparerEtiquettesDeClasse(existants);

  const total = await prisma.medicament.count();
  console.log(
    `\n✔ Terminé. ${count} médicament(s) inséré(s), ${reparees} étiquette(s) de classe ajoutée(s). ` +
      `Le référentiel en compte ${total}.\n`,
  );
}

/**
 * Ajoute aux entrées DÉJÀ en base les étiquettes que le référentiel leur donne et qu'elles n'ont
 * pas. Union stricte : rien n'est retiré, rien n'est remplacé.
 *
 * Sans cela, une entrée créée par l'ancien seed reste aveugle au garde-fou (EF-09-03) — et c'est
 * précisément sur « Amoxicilline » que se joue le cas d'école « allergie à la pénicilline ».
 */
async function reparerEtiquettesDeClasse(
  existants: Array<{ id: string; dci: string; dosage: string | null; commercialNames: string[] }>,
): Promise<number> {
  const attendu = new Map(REFERENTIEL_MEDICAMENTS.map((m) => [`${m.dci}|||${m.dosage}`, m.commercialNames]));
  let reparees = 0;
  for (const ligne of existants) {
    const noms = attendu.get(`${ligne.dci}|||${ligne.dosage ?? ""}`);
    if (!noms) continue;
    const manquants = noms.filter((n) => !ligne.commercialNames.some((c) => c.toLowerCase() === n.toLowerCase()));
    if (manquants.length === 0) continue;
    await prisma.medicament.update({
      where: { id: ligne.id },
      data: { commercialNames: [...ligne.commercialNames, ...manquants] },
    });
    console.log(`  ↻ ${ligne.dci} ${ligne.dosage ?? ""} ← ${manquants.join(", ")}`);
    reparees += 1;
  }
  return reparees;
}

main()
  .catch((e) => {
    console.error("\n✗ ÉCHEC :\n", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

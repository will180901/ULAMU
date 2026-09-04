/**
 * Recalcul complet des indicateurs publics d'un professionnel — dette n°24, 04/09/2026.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * `ProfessionalStats` est alimenté PAR ÉVÉNEMENTS (`m05.stats.service.ts`) : chaque sollicitation,
 * chaque confirmation, chaque note incrémente un compteur. Le fichier le dit lui-même en en-tête :
 *
 *   « idempotence APPROCHÉE : un événement rejoué peut sur-compter à la marge […] le recalcul
 *     périodique complet (spec §5 « recalcul quotidien ») viendra avec M16/cron »
 *
 * **Ce recalcul n'a jamais été construit.** Deux conséquences, l'une constatée, l'autre latente :
 *
 * 1. **Constatée (dette n°24)** : `prisma/seed.ts` écrit ces compteurs DIRECTEMENT, sans passer par
 *    les événements. `dr.armel` porte ainsi 242 sollicitations, 234 confirmations et 215 avis quand
 *    ses tables réelles en contiennent 2, 1 et 1. Ces chiffres fabriqués sont montrés **aux
 *    patients** dans l'annuaire public (EF-05-01) : un patient choisit son médecin là-dessus.
 * 2. **Latente** : sans recalcul, aucune dérive d'événement n'est jamais rattrapable.
 *
 * ── Comment la vérité est reconstruite ─────────────────────────────────────────────────────────
 *
 * Chaque compteur est dérivé de la table que l'événement accompagnait, **avec la règle exacte du
 * site d'émission** — jamais une règle recopiée de mémoire :
 *
 *   initiationsTotal  ← `m06.handshake.initiated`, émis à la création de CHAQUE Handshake
 *                       (`m06.handshake.service.ts:214`)          → count(Handshake)
 *   confirmedTotal    ← `m06.handshake.confirmed`, émis quand `confirmedAt` est posé
 *                                                                 → count(confirmedAt != null)
 *   confirmDelaySumS  ← `delayS = max(0, round((now − initiatedAt)/1000))` au moment de la
 *                       confirmation (`m06.handshake.service.ts:286`) → Σ sur confirmedAt
 *   ratingSum/Count   ← `m06.session.rated` { score }, **ignoré hors échelle PM-13**
 *                       (`m05.stats.service.ts:61`)               → SessionRating dans l'échelle
 *   incidentsTotal    ← `m06.session.refunded`, émis au passage ENDED → REFUNDED
 *                       (`m06.session.service.ts:307`)            → count(status REFUNDED)
 *   refusedTotal      ← `m06.handshake.refused`, émis au passage INITIATED → REFUSED
 *                       (`m06.handshake.service.ts`, dette n°23)  → count(Handshake REFUSED)
 *
 * L'échelle PM-13 est **lue en base**, comme le fait le serveur : un script qui écrirait « 1,5 » en
 * dur deviendrait faux le jour où le paramètre change.
 *
 * ── Ce que ce script fait, et ce qu'il ne fait pas ────────────────────────────────────────────
 *
 * • Sans `--appliquer` : **aucune écriture**. Il imprime le comparatif et s'arrête.
 * • Avec `--appliquer` : il écrit les valeurs vraies, **après avoir sauvegardé les anciennes** dans
 *   `scripts/.sauvegarde-indicateurs-<horodatage>.json`. Le geste est donc défaisable.
 * • Il ne démarre pas NestJS — donc ni `SchedulerService` ni `@Cron` n'écrivent pendant son passage.
 * • Il ne supprime jamais une ligne : un professionnel sans aucune activité est remis à zéro, pas
 *   effacé (l'annuaire lit la ligne ; l'absence de ligne et un zéro ne se lisent pas pareil).
 *
 * ⚠️ Il agit sur la base de PRODUCTION, celle du site en ligne — c'est la seule où la question se
 * pose. D'où l'inventaire imprimé avant toute écriture.
 *
 *   npx ts-node scripts/recalcul-indicateurs.ts             → comparatif seul, n'écrit rien
 *   npx ts-node scripts/recalcul-indicateurs.ts --appliquer → corrige, après sauvegarde
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Les sept compteurs de `ProfessionalStats`, dans l'ordre du modèle. */
interface Compteurs {
  initiationsTotal: number;
  confirmedTotal: number;
  confirmDelaySumS: number;
  ratingSum: number;
  ratingCount: number;
  incidentsTotal: number;
  /** Refus motivés — hors du dénominateur du taux depuis la dette n°23 (04/09/2026). */
  refusedTotal: number;
}

const ZERO: Compteurs = {
  initiationsTotal: 0,
  confirmedTotal: 0,
  confirmDelaySumS: 0,
  ratingSum: 0,
  ratingCount: 0,
  incidentsTotal: 0,
  refusedTotal: 0,
};

const CHAMPS = Object.keys(ZERO) as (keyof Compteurs)[];

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

/** L'échelle de notation, lue en base comme le serveur la lit (PM-13). */
async function echellePM13(): Promise<[number, number]> {
  const row = await prisma.platformParameter.findUnique({ where: { key: "PM-13" } });
  if (!row) throw new Error("PM-13 absent de la base : impossible de savoir quelles notes comptent.");
  const [min, max] = row.value.split(",").map((s) => Number(s.trim()));
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error(`PM-13 illisible : « ${row.value} »`);
  return [min, max];
}

/**
 * Reconstruit les sept compteurs d'un professionnel depuis ses tables réelles.
 * `min`/`max` viennent de PM-13 : une note hors échelle est ignorée, exactement comme le fait
 * `StatsService.onSessionRated`.
 */
async function verite(professionalId: string, min: number, max: number): Promise<Compteurs> {
  const [handshakes, sessionsRemboursees, notes] = await Promise.all([
    prisma.handshake.findMany({
      where: { professionalId },
      select: { initiatedAt: true, confirmedAt: true, status: true },
    }),
    prisma.careSession.count({ where: { professionalId, status: "REFUNDED" } }),
    prisma.sessionRating.findMany({
      where: { session: { professionalId } },
      select: { score: true },
    }),
  ]);

  const confirmes = handshakes.filter((h) => h.confirmedAt !== null);
  const dansEchelle = notes.filter((n) => n.score >= min && n.score <= max);

  return {
    initiationsTotal: handshakes.length,
    confirmedTotal: confirmes.length,
    confirmDelaySumS: confirmes.reduce(
      (somme, h) =>
        somme + Math.max(0, Math.round((h.confirmedAt!.getTime() - h.initiatedAt.getTime()) / 1000)),
      0,
    ),
    ratingSum: dansEchelle.reduce((somme, n) => somme + n.score, 0),
    ratingCount: dansEchelle.length,
    incidentsTotal: sessionsRemboursees,
    /*
      Le refus est un état FINAL de la poignée de main : une demande refusée ne repart pas. Compter
      les lignes REFUSED reconstruit donc exactement la suite des événements `m06.handshake.refused`.
    */
    refusedTotal: handshakes.filter((h) => h.status === "REFUSED").length,
  };
}

/** « 242 → 2 » quand ça change, « 2 » quand c'est déjà juste. */
function ecart(avant: number, apres: number): string {
  return avant === apres ? String(apres) : `${avant} → ${apres}`;
}

async function main(): Promise<void> {
  const appliquer = process.argv.includes("--appliquer");

  console.log(
    appliquer
      ? "RECALCUL DES INDICATEURS — mode APPLIQUER : la base sera écrite après sauvegarde."
      : "RECALCUL DES INDICATEURS — lecture seule. Ajoutez --appliquer pour corriger.",
  );

  const [min, max] = await echellePM13();
  console.log(`Échelle de notation lue en base (PM-13) : ${min} à ${max}.`);

  /*
    Le périmètre est l'UNION de trois ensembles, et pas seulement les lignes existantes : un
    professionnel peut avoir une ligne fabriquée sans activité (le cas du seed), ou une activité
    sans ligne (un événement perdu). Les deux sont des écarts, et les deux doivent apparaître.
  */
  const [lignes, comptes, viaHandshake] = await Promise.all([
    prisma.professionalStats.findMany(),
    prisma.account.findMany({
      where: { type: "PROFESSIONAL" },
      select: { id: true, username: true },
    }),
    prisma.handshake.findMany({ select: { professionalId: true }, distinct: ["professionalId"] }),
  ]);

  const nomDe = new Map(comptes.map((c) => [c.id, c.username]));
  const ids = [
    ...new Set([...lignes.map((l) => l.professionalId), ...comptes.map((c) => c.id), ...viaHandshake.map((h) => h.professionalId)]),
  ].sort();

  const actuelDe = new Map(lignes.map((l) => [l.professionalId, l as unknown as Compteurs]));

  titre(`1. Comparatif — ${ids.length} professionnel(s)`);

  const aCorriger: { id: string; avant: Compteurs; apres: Compteurs }[] = [];

  for (const id of ids) {
    const avant = actuelDe.get(id) ?? ZERO;
    const apres = await verite(id, min, max);
    const change = CHAMPS.some((c) => avant[c] !== apres[c]);
    const absente = !actuelDe.has(id);

    const nom = nomDe.get(id) ?? "(compte introuvable)";
    console.log(`\n  ${nom}  ${id}${absente ? "   ⚠️ aucune ligne d'indicateurs" : ""}`);
    for (const c of CHAMPS) console.log(`    ${c.padEnd(17)} ${ecart(avant[c], apres[c])}`);

    /*
      Le taux de confirmation tel que l'annuaire le calcule — c'est le chiffre que le PATIENT lit,
      et donc le seul qui dise vraiment ce que cette correction change pour lui.
    */
    const taux = (c: Compteurs) => {
      // Même définition que `confirmRate` (M05) : les refus motivés sortent du dénominateur (n°23).
      const base = c.initiationsTotal - c.refusedTotal;
      return base > 0 ? Math.round((c.confirmedTotal / base) * 1000) / 10 : null;
    };
    const tauxAvant = taux(avant);
    const tauxApres = taux(apres);
    const noteAvant = avant.ratingCount > 0 ? Math.round((avant.ratingSum / avant.ratingCount) * 10) / 10 : null;
    const noteApres = apres.ratingCount > 0 ? Math.round((apres.ratingSum / apres.ratingCount) * 10) / 10 : null;
    console.log(
      `    ${"→ vu du patient".padEnd(17)} taux ${tauxAvant === null ? "—" : `${tauxAvant} %`} → ${tauxApres === null ? "—" : `${tauxApres} %`}` +
        `  ·  note ${noteAvant === null ? "—" : `${noteAvant}/5 sur ${avant.ratingCount}`} → ${noteApres === null ? "—" : `${noteApres}/5 sur ${apres.ratingCount}`}`,
    );

    if (change || absente) aCorriger.push({ id, avant, apres });
  }

  titre("2. Bilan");
  if (aCorriger.length === 0) {
    console.log("  Aucun écart : les indicateurs servis correspondent aux tables réelles.");
    return;
  }
  console.log(`  ${aCorriger.length} professionnel(s) à corriger sur ${ids.length}.`);

  if (!appliquer) {
    console.log("\n  Rien n'a été écrit. Relancez avec --appliquer pour corriger.");
    return;
  }

  // ── Sauvegarde AVANT écriture : le geste doit rester défaisable ────────────────────────────
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const fichier = join(__dirname, `.sauvegarde-indicateurs-${horodatage}.json`);
  writeFileSync(
    fichier,
    JSON.stringify(
      { faitLe: new Date().toISOString(), lignesAvant: lignes, correction: randomUUID() },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\n  Valeurs d'avant sauvegardées dans ${fichier}`);

  titre("3. Écriture");
  for (const { id, apres } of aCorriger) {
    await prisma.professionalStats.upsert({
      where: { professionalId: id },
      create: { professionalId: id, ...apres },
      update: apres,
    });
    console.log(`  ✔ ${nomDe.get(id) ?? id}`);
  }
  console.log(`\n  ${aCorriger.length} ligne(s) corrigée(s). Les indicateurs servis sont désormais ceux des tables réelles.`);
}

main()
  .catch((e) => {
    console.error("\nÉCHEC :", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

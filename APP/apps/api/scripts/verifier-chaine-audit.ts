/**
 * Vérification de la chaîne d'audit — STRICTEMENT EN LECTURE. Chantier 54, 06/09/2026.
 *
 * ── Pourquoi ce script existe, et pourquoi il ne passe PAS par la route ────────────────────────
 *
 * `GET /v1/admin/audit/integrity` fait le travail, mais **écrit une entrée d'audit à chaque appel**
 * (`m04.integrity.checked`, RM-04-02 : consulter le journal se journalise). Pour un constat, on ne
 * veut rien ajouter à ce qu'on est en train de mesurer.
 *
 * Ce script réutilise les MÊMES fonctions que le serveur — `chainEvent` et `findChainBreak` — et
 * ne fait que lire. Aucune règle n'est recopiée : une vérification qui recalculerait les empreintes
 * « à sa façon » ne prouverait rien du tout.
 *
 * ── Ce qu'il cherche ──────────────────────────────────────────────────────────────────────────
 *
 * Deux choses, et la seconde a été découverte en écrivant la première :
 *
 *  1. **La chaîne est-elle intacte ?** hash(n) = sha256(prevHash | événement) — toute altération,
 *     insertion ou suppression casse le maillon suivant (EF-04-02, RM-04-01).
 *  2. **Le premier maillon part-il de l'origine ?** `seq` est un auto-incrément : s'il ne commence
 *     pas à 1, des entrées ont été SUPPRIMÉES du journal — ce qu'un journal en insertion seule
 *     interdit. La chaîne restante peut alors être parfaitement cohérente **et pourtant amputée**.
 *
 *   npx ts-node scripts/verifier-chaine-audit.ts
 */
import { PrismaClient } from "@prisma/client";
import { findChainBreak, GENESIS_HASH, StoredEvent } from "../src/common/crypto/hash-chain";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

async function main(): Promise<void> {
  console.log("CHAÎNE D'AUDIT — lecture seule, aucune écriture.");

  const rows = await prisma.auditEvent.findMany({ orderBy: { seq: "asc" } });
  if (rows.length === 0) {
    console.log("\nJournal vide.");
    return;
  }

  titre("1. Étendue du journal");
  const premier = rows[0]!;
  const dernier = rows[rows.length - 1]!;
  console.log(`  ${rows.length} entrée(s), du seq ${premier.seq} au seq ${dernier.seq}`);
  console.log(`  du ${premier.createdAt.toISOString()} au ${dernier.createdAt.toISOString()}`);

  titre("2. Le journal commence-t-il à son origine ?");
  /*
    `seq` est un auto-incrément PostgreSQL : il ne saute pas tout seul depuis 1. Un premier seq
    supérieur à 1 signifie que des entrées ont été SUPPRIMÉES — or RM-04-01 dit « ni update ni
    delete ». La chaîne restante peut être parfaitement cohérente et pourtant amputée : c'est un
    trou que la vérification d'intégrité seule ne montre pas.
  */
  if (premier.seq === 1n) {
    console.log("  ✔ Oui — le premier maillon est le seq 1.");
  } else {
    console.log(`  ⚠️ NON — le journal commence au seq ${premier.seq}.`);
    console.log(`     ${premier.seq - 1n} entrée(s) manquent avant lui : elles ont existé, puis ont disparu.`);
    console.log("     Un journal en insertion seule (RM-04-01) ne devrait jamais en perdre.");
  }

  titre("3. La chaîne restante est-elle cohérente ?");
  const stored: StoredEvent[] = rows.map((r) => ({
    actorId: r.actorId,
    actorType: r.actorType,
    action: r.action,
    resource: r.resource,
    context: r.context ?? null,
    createdAtIso: r.createdAt.toISOString(),
    prevHash: r.prevHash,
    hash: r.hash,
  }));

  /*
    Deux lectures, et il faut les distinguer :
      • depuis GENESIS — ce que fait la route sans `fromSeq`. Si le journal a perdu son début, elle
        casse au PREMIER maillon, et le message « rupture à l'entrée N » désigne alors une amputation
        ancienne, pas une altération récente ;
      • depuis le prevHash RÉELLEMENT enregistré du premier maillon survivant — cela répond à
        l'autre question : « ce qui reste a-t-il été touché depuis ? »
  */
  const depuisGenese = findChainBreak(stored, GENESIS_HASH);
  console.log(
    depuisGenese === -1
      ? "  ✔ Depuis l'origine : intacte."
      : `  ⚠️ Depuis l'origine : rupture au seq ${rows[depuisGenese]!.seq} (${depuisGenese + 1}ᵉ maillon lu).`,
  );

  const depuisSurvivant = findChainBreak(stored, premier.prevHash);
  console.log(
    depuisSurvivant === -1
      ? "  ✔ Depuis le premier maillon survivant : intacte — rien n'a été altéré depuis."
      : `  ⚠️ Depuis le premier maillon survivant : rupture au seq ${rows[depuisSurvivant]!.seq}.`,
  );

  titre("4. Ce qu'un administrateur voit à l'écran");
  /*
    ⚠️ Cette section disait l'ANCIEN écran jusqu'au 06/09/2026 — celui qui s'arrêtait à « chaîne
    intacte ». Le chantier 54 lui a ajouté l'avertissement d'amputation ; un script de constat qui
    montre moins que l'écran qu'il décrit dit, à sa façon, la même demi-vérité.
  */
  if (depuisGenese !== -1) {
    console.log(`  « Rupture détectée à l'entrée ${rows[depuisGenese]!.seq}. Le journal a été altéré. »`);
  } else {
    console.log(`  « Chaîne intacte : les ${rows.length} entrées vérifiées se succèdent sans rupture. »`);
    if (premier.seq !== 1n) {
      console.log(`  « Le journal ne commence pas à son origine. Sa première entrée porte le numéro`);
      console.log(`     ${premier.seq} : les entrées antérieures ont disparu. Ce qui reste est intact ;`);
      console.log(`     ce n'est pas la même chose que complet. »`);
    }
  }
}

main()
  .catch((e) => {
    console.error("\nÉCHEC :", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

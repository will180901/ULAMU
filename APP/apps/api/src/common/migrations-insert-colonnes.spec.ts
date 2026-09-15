/**
 * Une migration qui INSÈRE doit nommer toutes les colonnes obligatoires — chantier 119, 15/09/2026.
 *
 * ── Pourquoi ce filet existe ──────────────────────────────────────────────────────────────────
 *
 * ⚠️ **La plateforme est restée hors service trois heures** dans la nuit du 14 au 15/09. La cause
 * tient en une ligne : la migration du chantier 117 insérait le paramètre PM-41 ainsi —
 *
 *     INSERT INTO "PlatformParameter" ("key", "value", "description") VALUES (…)
 *
 * — sans `updatedAt`, qui est `NOT NULL` **et sans valeur par défaut**. La contrainte a sauté, la
 * transaction a été annulée, la migration s'est inscrite `failed`, et **P3009 a alors bloqué toutes
 * les migrations suivantes** : le chantier 118 n'est jamais passé et l'API n'a plus démarré.
 *
 * 📌 **La faute est mécanique, donc elle se refera.** `@updatedAt` est tenu par le CLIENT Prisma, pas
 * par la base : tout le code applicatif — le seed compris — remplit cette colonne sans y penser, et
 * seul du SQL écrit à la main s'en aperçoit. *Une colonne qu'un outil remplit toujours pour vous
 * finit par passer pour une colonne qui se remplit toute seule.*
 *
 * > Et c'est le genre de faute qu'aucune suite de tests ne voit : elle ne casse rien en local, où
 * > personne ne rejoue les migrations à la main. Elle ne se manifeste qu'**au démarrage, en
 * > production**, quand il est déjà trop tard.
 *
 * ── Ce que ce test vérifie ────────────────────────────────────────────────────────────────────
 *
 * Il lit **le SQL des migrations, pas le schéma Prisma** — c'est le SQL qui fait foi dans la base.
 * Il reconstitue, table par table, les colonnes `NOT NULL` dépourvues de `DEFAULT` (créations ET
 * ajouts ultérieurs), puis vérifie que chaque `INSERT INTO … (colonnes)` les nomme toutes.
 *
 * Il ne remplace pas une vraie base de test. Il attrape exactement la faute qui a coûté la nuit.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DOSSIER = join(__dirname, "..", "..", "prisma", "migrations");

/** Le SQL de chaque migration, dans l'ordre où la base les applique (le nom porte l'horodatage). */
function migrations(): Array<{ nom: string; sql: string }> {
  return readdirSync(DOSSIER, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((nom) => ({ nom, sql: readFileSync(join(DOSSIER, nom, "migration.sql"), "utf8") }));
}

/** Les commentaires `--` portent des exemples de SQL : les lire comme du code créerait de faux défauts. */
function sansCommentaires(sql: string): string {
  return sql
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

/**
 * Les colonnes qu'un INSERT est OBLIGÉ de nommer : `NOT NULL` et sans `DEFAULT`.
 *
 * ⚠️ Une colonne ajoutée plus tard compte autant qu'une colonne d'origine — c'est même le cas le
 * plus traître, puisque les insertions écrites avant elle continuent de passer les relectures.
 */
function colonnesObligatoires(): Map<string, Set<string>> {
  const parTable = new Map<string, Set<string>>();

  for (const { sql } of migrations()) {
    const propre = sansCommentaires(sql);

    // CREATE TABLE "X" ( … );
    for (const m of propre.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"\s*\(([\s\S]*?)\n\);/g)) {
      const [, table, corps] = m;
      const obligatoires = parTable.get(table) ?? new Set<string>();
      for (const ligne of corps.split("\n")) {
        const col = /^\s*"([^"]+)"\s+(.+?),?\s*$/.exec(ligne);
        if (!col) continue;
        const [, nom, reste] = col;
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(nom)) continue;
        if (/\bNOT NULL\b/i.test(reste) && !/\bDEFAULT\b/i.test(reste)) obligatoires.add(nom);
      }
      parTable.set(table, obligatoires);
    }

    // ALTER TABLE "X" ADD COLUMN "c" … NOT NULL [DEFAULT …];
    for (const m of propre.matchAll(/ALTER TABLE\s+"([^"]+)"\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"([^"]+)"\s+([^;]+);/g)) {
      const [, table, colonne, reste] = m;
      if (!/\bNOT NULL\b/i.test(reste) || /\bDEFAULT\b/i.test(reste)) continue;
      const obligatoires = parTable.get(table) ?? new Set<string>();
      obligatoires.add(colonne);
      parTable.set(table, obligatoires);
    }

    // DROP COLUMN : ce qui n'existe plus ne s'exige plus.
    for (const m of propre.matchAll(/ALTER TABLE\s+"([^"]+)"\s+DROP COLUMN\s+(?:IF EXISTS\s+)?"([^"]+)"/g)) {
      parTable.get(m[1])?.delete(m[2]);
    }
  }

  return parTable;
}

describe("Les migrations qui insèrent des lignes", () => {
  const obligatoiresParTable = colonnesObligatoires();

  /*
    Le garde-fou du garde-fou : si la lecture du SQL cessait de reconnaître les CREATE TABLE, la
    table serait vide et TOUS les cas passeraient — un filet muet est pire qu'une absence de filet.
  */
  it("l’analyse du SQL reconnaît bien les tables et leurs colonnes obligatoires", () => {
    expect(obligatoiresParTable.size).toBeGreaterThan(20);
    expect(obligatoiresParTable.get("PlatformParameter")).toContain("updatedAt");
  });

  /*
    ⚠️ LE test de ce filet — la faute exacte du 14/09, qui a mis la plateforme à terre.
  */
  it("nomment TOUTES les colonnes NOT NULL sans valeur par défaut", () => {
    const manquants: string[] = [];

    for (const { nom, sql } of migrations()) {
      for (const m of sansCommentaires(sql).matchAll(/INSERT INTO\s+"([^"]+)"\s*\(([^)]*)\)/g)) {
        const [, table, liste] = m;
        const nommees = new Set([...liste.matchAll(/"([^"]+)"/g)].map((c) => c[1]));
        for (const requise of obligatoiresParTable.get(table) ?? []) {
          if (!nommees.has(requise)) {
            manquants.push(`${nom} → INSERT INTO "${table}" ne fournit pas "${requise}" (NOT NULL, sans DEFAULT)`);
          }
        }
      }
    }

    expect(manquants).toEqual([]);
  });
});

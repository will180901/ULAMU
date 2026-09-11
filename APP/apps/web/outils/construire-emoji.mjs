/**
 * Génère la table des emoji d'ULAMU — chantier 78, 11/09/2026.
 *
 * ── Pourquoi un générateur plutôt qu'une dépendance ────────────────────────────────────────────
 *
 * CMS-SARIS importe `@emoji-mart/data/sets/15/apple.json` **à l'exécution** : 478 Ko de JSON qui
 * partent dans le paquet du navigateur. Or ce fichier porte, pour chacun des 1 867 emoji, son nom,
 * ses mots-clés, ses variantes de teinte et ses traductions.
 *
 * **Nous n'avons besoin que de deux choses** : où se trouve chaque emoji dans l'image, et dans
 * quelle catégorie le ranger. Le reste est du poids pur sur une connexion mobile congolaise.
 *
 * Ce script réduit donc la table à l'essentiel — mesuré : **478 Ko → ~60 Ko**. Le résultat est
 * COMMITÉ (`src/modules/consultation/emoji-donnees.ts`) : aucune dépendance n'est ajoutée au
 * projet, ni en production ni en développement.
 *
 * ── Comment le relancer ───────────────────────────────────────────────────────────────────────
 *
 *   node outils/construire-emoji.mjs <chemin vers apple.json>
 *
 * Le fichier source vient du paquet `@emoji-mart/data` (jeu 15, style Apple). Il n'est pas dans ce
 * dépôt : on ne garde que ce qu'on utilise.
 *
 * ⚠️ Le sprite `public/emoji/apple-64.png`, lui, EST dans le dépôt (4,4 Mo) — c'est le prix du
 * rendu identique sur tous les appareils, décidé par le porteur le 11/09. Sans lui, chaque
 * téléphone affiche ses propres dessins.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const source = process.argv[2]
if (!source) {
  console.error('Usage : node outils/construire-emoji.mjs <chemin vers apple.json>')
  process.exit(1)
}

const brut = JSON.parse(readFileSync(source, 'utf8'))

/** Les huit catégories du jeu, dans l'ordre où un sélecteur les présente. */
const NOMS = {
  people: 'Visages et personnes',
  nature: 'Animaux et nature',
  foods: 'Boire et manger',
  activity: 'Activités',
  places: 'Voyages et lieux',
  objects: 'Objets',
  symbols: 'Symboles',
  flags: 'Drapeaux',
}

/** native → [colonne, ligne] dans la feuille. Une seule teinte par emoji : la teinte neutre. */
const positions = {}
const categories = []

for (const cat of brut.categories) {
  const nom = NOMS[cat.id]
  if (!nom) continue
  const liste = []
  for (const id of cat.emojis) {
    const def = brut.emojis[id]
    // On ne garde que la PREMIÈRE peau : les six teintes triplent la table pour un usage marginal
    // dans un échange de soin, et le sélecteur reste lisible sans elles.
    const peau = def?.skins?.[0]
    if (!peau?.native || typeof peau.x !== 'number') continue
    positions[peau.native] = [peau.x, peau.y]
    liste.push(peau.native)
  }
  if (liste.length > 0) categories.push({ id: cat.id, nom, emojis: liste })
}

const sortie = `/**
 * La table des emoji — FICHIER GÉNÉRÉ, ne pas modifier à la main.
 *
 * Produit par \`outils/construire-emoji.mjs\` à partir du jeu Apple de \`@emoji-mart/data\`.
 * Réduit à ce dont l'écran se sert : la position de chaque emoji dans le sprite, et son rangement.
 *
 * Pourquoi il est commité plutôt qu'installé : le fichier d'origine fait 478 Ko et porte les noms,
 * mots-clés et traductions de 1 867 emoji. Celui-ci en fait ${Math.round(JSON.stringify(positions).length / 1024)} Ko environ, et
 * n'ajoute AUCUNE dépendance au projet.
 */

/** Dimensions de la feuille \`public/emoji/apple-64.png\`, en nombre de cases. */
export const SPRITE_COLONNES = ${brut.sheet.cols}
export const SPRITE_LIGNES = ${brut.sheet.rows}

/** Le caractère d'un emoji → sa case [colonne, ligne] dans la feuille. */
export const EMOJI_POSITION: Readonly<Record<string, readonly [number, number]>> = ${JSON.stringify(positions)}

/** Les catégories du sélecteur, dans l'ordre d'affichage. */
export const EMOJI_CATEGORIES: ReadonlyArray<{ id: string; nom: string; emojis: readonly string[] }> = ${JSON.stringify(categories)}
`

const cible = 'src/modules/consultation/emoji-donnees.ts'
writeFileSync(cible, sortie, 'utf8')

const octets = Buffer.byteLength(sortie, 'utf8')
console.log(`${cible} écrit`)
console.log(`  ${Object.keys(positions).length} emoji · ${categories.length} catégories`)
console.log(`  ${Math.round(octets / 1024)} Ko (source : ${Math.round(readFileSync(source).length / 1024)} Ko)`)

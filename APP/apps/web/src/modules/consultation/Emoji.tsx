/**
 * Le rendu des emoji en IMAGES — chantier 78, 11/09/2026.
 *
 * ── Pourquoi des images plutôt que la police du système ────────────────────────────────────────
 *
 * Un emoji écrit en texte est dessiné par l'APPAREIL : le même 🙏 n'a pas la même forme sur un
 * Android d'entrée de gamme, un iPhone et un poste Windows — et certains manquent purement. Dans
 * une consultation, un patient qui envoie 😟 et un soignant qui voit un carré vide, c'est un
 * malentendu.
 *
 * On sert donc **une seule feuille d'images**, la même pour tout le monde (décision du porteur,
 * 11/09 : « le rendu Apple identique partout, comme WhatsApp »).
 *
 * ── Ce que ça coûte, dit franchement ──────────────────────────────────────────────────────────
 *
 * `public/emoji/apple-64.png` pèse **4,4 Mo**. Il est chargé **une fois** par le navigateur puis
 * gardé en cache. C'est le prix du rendu identique : il n'existe pas de version légère de cette
 * garantie. La table des positions, elle, a été réduite de 467 Ko à 48 Ko
 * (`outils/construire-emoji.mjs`).
 *
 * ⚠️ **Le sprite n'est jamais chargé tant qu'aucun emoji n'est affiché** : le navigateur ne
 * télécharge une image de fond que lorsqu'un élément l'utilise. Une consultation sans emoji ne
 * paie donc rien.
 */
import { EMOJI_POSITION, SPRITE_COLONNES, SPRITE_LIGNES } from './emoji-donnees'

/** Chemin de la feuille, servie par le site lui-même — aucun CDN, et donc aucune fuite d'usage. */
const SPRITE = `${import.meta.env.BASE_URL}emoji/apple-64.png`

/**
 * Un emoji, rendu depuis la feuille.
 *
 * La taille est donnée en pixels ; la feuille est mise à l'échelle en conséquence. `aria-label`
 * porte le caractère lui-même : un lecteur d'écran annonce alors l'emoji comme il l'aurait fait
 * pour du texte, et la copie du message conserve le caractère.
 */
export function Emoji({ natif, taille = 18 }: { natif: string; taille?: number }) {
  const position = EMOJI_POSITION[natif]
  // Un emoji absent de la table — un drapeau récent, un caractère exotique — se rend en TEXTE.
  // Il vaut mieux un dessin du système qu'un carré vide ou un trou dans la phrase.
  if (!position) return <span>{natif}</span>

  const [colonne, ligne] = position
  return (
    <span
      role="img"
      aria-label={natif}
      style={{
        display: 'inline-block',
        width: taille,
        height: taille,
        verticalAlign: '-0.18em',
        backgroundImage: `url(${SPRITE})`,
        // La feuille fait 61 × 61 cases : à une case de `taille` pixels, l'image entière en fait 61 fois plus.
        backgroundSize: `${SPRITE_COLONNES * 100}% ${SPRITE_LIGNES * 100}%`,
        backgroundPosition: `${(colonne / (SPRITE_COLONNES - 1)) * 100}% ${(ligne / (SPRITE_LIGNES - 1)) * 100}%`,
      }}
    />
  )
}

/**
 * Découpe une chaîne en graphèmes — un emoji composé (famille, teinte, drapeau) compte pour UN.
 *
 * `Intl.Segmenter` fait ce travail correctement ; le repli `[...texte]` découpe en points de code
 * et casserait un emoji composé en morceaux. Il ne sert que sur un navigateur trop ancien, où un
 * emoji mal découpé reste préférable à une page blanche.
 */
export function graphemes(texte: string): string[] {
  try {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      return [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(texte)].map((s) => s.segment)
    }
  } catch {
    /* repli ci-dessous */
  }
  return [...texte]
}

/**
 * Un message ne contenant QUE des emoji, et pas plus de huit.
 *
 * C'est la convention de toutes les messageries : un « 👍 » seul se rend en grand, parce qu'il
 * tient lieu de phrase. Au-delà de huit, ce n'est plus une réaction mais un texte, et le grand
 * format le rendrait illisible.
 */
export function seulementDesEmoji(texte: string): boolean {
  const t = (texte || '').trim()
  if (!t) return false
  // On retire les liants (sélecteur de variante, jointure sans chasse) et les espaces avant de juger.
  const net = t.replace(/[\s️‍]/gu, '')
  if (!net) return false
  // Une seule lettre ou un seul chiffre, et ce n'est plus un message d'emoji.
  if (/[\p{L}\p{N}]/u.test(net)) return false
  if (!/\p{Extended_Pictographic}/u.test(net)) return false
  const n = graphemes(net).length
  return n > 0 && n <= 8
}

/**
 * Rend un texte en remplaçant ses emoji par leurs images.
 *
 * ⚠️ Le texte NON-emoji est rendu tel quel, jamais interprété : pas de balises, pas de liens
 * automatiques. Le corps d'un message de consultation porte des données de santé — on l'affiche,
 * on ne le transforme pas.
 */
export function texteAvecEmoji(texte: string, taille = 18): React.ReactNode[] {
  const morceaux: React.ReactNode[] = []
  let tampon = ''

  graphemes(texte).forEach((g, i) => {
    if (EMOJI_POSITION[g]) {
      if (tampon) {
        morceaux.push(tampon)
        tampon = ''
      }
      morceaux.push(<Emoji key={`e${i}`} natif={g} taille={taille} />)
    } else {
      tampon += g
    }
  })
  if (tampon) morceaux.push(tampon)
  return morceaux
}

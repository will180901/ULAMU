/**
 * Un texte mis en forme, rendu — chantiers 86 et 87.
 *
 * Deux couches, dans cet ordre : la **mise en forme** découpe le texte en fragments stylés, puis
 * chaque fragment passe par le rendu des **emoji** (chantier 78, images d'une feuille servie par
 * le site, pour que le même 🙏 ait la même forme partout).
 *
 * ⚠️ **Il ne sert plus qu'aux messages.** Depuis que la bulle s'attache à toute zone de saisie
 * (chantier 87), les mêmes marqueurs peuvent apparaître dans un compte-rendu, un motif, un
 * signalement. Partout où l'un de ces textes est RELU, c'est ce composant qui doit le rendre —
 * sinon le lecteur voit des astérisques là où l'auteur croyait avoir insisté.
 *
 * Il vit donc dans la boîte commune, et non dans le module de la consultation.
 *
 * ⚠️ **Rien n'est INTERPRÉTÉ.** Cette fonction remplace cinq marqueurs symétriques par du style, et
 * les emoji par leurs images. Elle ne fabrique aucun lien, ne lit aucune balise : un patient qui
 * écrit `<b>` doit lire `<b>`. Le corps d'un message de consultation porte des données de santé —
 * on l'affiche, on ne le transforme pas.
 */
import { texteAvecEmoji } from '@/modules/consultation/Emoji'
import { analyserTexteRiche, type StyleTexte } from '@/modules/consultation/texte-riche'

/**
 * Le style d'un fragment, en valeurs plutôt qu'en classes.
 *
 * `<strong>` et `<em>` porteraient le sens ; on préfère ici des valeurs explicites, parce que le
 * « grand » et le « souligné » n'ont pas de balise qui les dise, et qu'un seul mécanisme vaut mieux
 * que deux à moitié.
 *
 * ⚠️ `1.18em` et non une taille absolue : le grand doit rester proportionnel au contexte — un
 * message géant d'emoji, une citation en réponse et une bulle ordinaire n'ont pas la même base.
 */
function styleDe(s: StyleTexte): React.CSSProperties | undefined {
  const decorations = [s.souligne ? 'underline' : '', s.barre ? 'line-through' : ''].filter(Boolean)
  if (!s.gras && !s.italique && !s.grand && decorations.length === 0) return undefined
  return {
    fontWeight: s.gras ? 600 : undefined,
    fontStyle: s.italique ? 'italic' : undefined,
    fontSize: s.grand ? '1.18em' : undefined,
    textDecorationLine: decorations.length > 0 ? decorations.join(' ') : undefined,
  }
}

/**
 * `taille` est celle des emoji, en pixels — 34 pour un message qui n'est QUE des emoji, 18 sinon.
 * Elle ne concerne pas le texte, dont la taille vient de la bulle qui le contient.
 */
export function TexteMisEnForme({ texte, taille = 18 }: { texte: string; taille?: number }) {
  const fragments = analyserTexteRiche(texte)
  return (
    <>
      {fragments.map((f, i) => {
        const style = styleDe(f.style)
        const contenu = texteAvecEmoji(f.texte, taille)
        // Sans style, pas de balise : un fragment ordinaire ne mérite pas un `<span>` de plus.
        return style ? (
          <span key={i} style={style}>
            {contenu}
          </span>
        ) : (
          <span key={i}>{contenu}</span>
        )
      })}
    </>
  )
}

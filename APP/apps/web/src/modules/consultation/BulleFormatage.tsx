/**
 * La bulle de mise en forme — chantier 86, 11/09/2026.
 *
 * ── Ce que le porteur a demandé ───────────────────────────────────────────────────────────────
 *
 * *« Une fonctionnalité qui apparaît partout où on sélectionne un texte dans un champ de saisie
 * actif, au-dessus du texte sélectionné uniquement, comme une bulle, à l'intérieur les boutons
 * icônes : gras, italique, barré, souligné, taille du texte, et la possibilité de transformer en
 * liste le texte sélectionné. »*
 *
 * ── Pourquoi au-dessus de la SÉLECTION, et pas une barre d'outils fixe ────────────────────────
 *
 * Une barre d'outils fixe occupe de la place en permanence pour un geste rare, et elle éloigne la
 * commande de son objet : on regarde son texte, on lève les yeux, on redescend. La bulle vient
 * **à l'endroit où l'on regarde déjà**, et disparaît dès qu'on ne sélectionne plus rien.
 *
 * ── Ce que le champ montre pendant la frappe ──────────────────────────────────────────────────
 *
 * Le champ reste un vrai champ de texte : il affiche `*important*`, et le gras apparaît dans le
 * message envoyé. C'est le comportement de WhatsApp, et ce n'est pas un renoncement — un champ qui
 * stylise en direct manipule du HTML, et le corps d'un message de consultation porte des données
 * de santé. **Ce qui est stocké est exactement ce qui a été tapé**, sans balise à nettoyer, sans
 * collage à désinfecter.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, List, ListOrdered, Strikethrough, Type, Underline } from 'lucide-react'
import { basculerListe, basculerMarqueur, type StyleTexte } from './texte-riche'

/** Hauteur réservée au-dessus de la sélection : la bulle, plus un souffle. */
const ECART = 44

interface Outil {
  cle: string
  libelle: string
  icone: typeof Bold
  /** Ce que le bouton fait au texte, quelle que soit sa nature (marqueur ou liste). */
  appliquer: (texte: string, debut: number, fin: number) => { texte: string; debut: number; fin: number }
}

const marqueur = (cle: keyof StyleTexte, libelle: string, icone: typeof Bold): Outil => ({
  cle,
  libelle,
  icone,
  appliquer: (t, d, f) => basculerMarqueur(t, d, f, cle),
})

const OUTILS: readonly Outil[] = [
  marqueur('gras', 'Gras', Bold),
  marqueur('italique', 'Italique', Italic),
  marqueur('barre', 'Barré', Strikethrough),
  marqueur('souligne', 'Souligné', Underline),
  marqueur('grand', 'Agrandir', Type),
  { cle: 'puce', libelle: 'Liste à puces', icone: List, appliquer: (t, d, f) => basculerListe(t, d, f, 'puce') },
  { cle: 'numero', libelle: 'Liste numérotée', icone: ListOrdered, appliquer: (t, d, f) => basculerListe(t, d, f, 'numero') },
]

/**
 * Où tombe le début de la sélection, en pixels d'écran.
 *
 * Un `<textarea>` ne contient aucun nœud de texte : on ne peut pas lui demander la position d'une
 * sélection. On reconstruit donc un MIROIR — une boîte invisible qui porte exactement les mêmes
 * réglages de police, de largeur et de marge — et on mesure dedans.
 *
 * ⚠️ Sous jsdom, toutes les mesures valent zéro : la bulle s'affiche alors en haut à gauche. Ce
 * n'est pas un défaut à corriger, c'est une limite de l'environnement de test — et c'est pourquoi
 * aucun test ne porte sur la POSITION. Le placement se vérifie à l'œil, comme la poignée du
 * chantier 82.
 */
function positionDeLaSelection(champ: HTMLTextAreaElement): { x: number; y: number } | null {
  const debut = champ.selectionStart
  const fin = champ.selectionEnd
  if (debut === null || fin === null || debut === fin) return null

  const reglages = window.getComputedStyle(champ)
  const miroir = document.createElement('div')
  const s = miroir.style
  s.position = 'absolute'
  s.visibility = 'hidden'
  s.whiteSpace = 'pre-wrap'
  s.overflowWrap = 'break-word'
  s.top = '0'
  s.left = '-9999px'
  for (const nom of [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'textTransform', 'wordSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing',
  ] as const) {
    s[nom] = reglages[nom]
  }
  s.width = `${champ.clientWidth}px`

  miroir.textContent = champ.value.slice(0, debut)
  const repere = document.createElement('span')
  // Un contenu vide n'a pas de rectangle : on met le texte sélectionné, sinon un point.
  repere.textContent = champ.value.slice(debut, fin) || '.'
  miroir.appendChild(repere)

  document.body.appendChild(miroir)
  const rSel = repere.getBoundingClientRect()
  const rMiroir = miroir.getBoundingClientRect()
  document.body.removeChild(miroir)

  const rChamp = champ.getBoundingClientRect()
  return {
    x: rChamp.left + (rSel.left - rMiroir.left) + rSel.width / 2 - champ.scrollLeft,
    y: rChamp.top + (rSel.top - rMiroir.top) - champ.scrollTop,
  }
}

export function BulleFormatage({
  champ,
  valeur,
  onChanger,
}: {
  champ: React.RefObject<HTMLTextAreaElement | null>
  valeur: string
  /** Rend le nouveau texte ET la sélection à restaurer — sinon le curseur saute à la fin. */
  onChanger: (texte: string, debut: number, fin: number) => void
}) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const bulle = useRef<HTMLDivElement | null>(null)
  /** La sélection à rendre au champ après un rendu — posée par le clic, consommée par l'effet. */
  const aRestaurer = useRef<{ debut: number; fin: number } | null>(null)

  const relire = useCallback(() => {
    const el = champ.current
    if (!el || document.activeElement !== el) {
      setPosition(null)
      return
    }
    setPosition(positionDeLaSelection(el))
  }, [champ])

  useEffect(() => {
    const el = champ.current
    if (!el) return
    /*
      `selectionchange` sur le DOCUMENT plutôt que `select` sur le champ : `select` ne se déclenche
      pas quand la sélection se RÉDUIT au clavier, et la bulle restait affichée sur rien.
    */
    document.addEventListener('selectionchange', relire)
    el.addEventListener('blur', relire)
    window.addEventListener('resize', relire)
    // La capture : un défilement de n'importe quel parent déplace le champ sous la bulle.
    window.addEventListener('scroll', relire, true)
    return () => {
      document.removeEventListener('selectionchange', relire)
      el.removeEventListener('blur', relire)
      window.removeEventListener('resize', relire)
      window.removeEventListener('scroll', relire, true)
    }
  }, [champ, relire])

  /*
    Rendre la sélection APRÈS que React a réécrit la valeur du champ. Sans cela, le navigateur
    replace le curseur à la fin et l'utilisateur perd ce qu'il venait de sélectionner — il faudrait
    re-sélectionner entre chaque bouton, et on ne pourrait pas mettre un mot en gras ET en italique.
  */
  useLayoutEffect(() => {
    const cible = aRestaurer.current
    const el = champ.current
    if (!cible || !el) return
    aRestaurer.current = null
    el.focus()
    el.setSelectionRange(cible.debut, cible.fin)
    setPosition(positionDeLaSelection(el))
  }, [valeur, champ])

  const agir = (outil: Outil) => {
    const el = champ.current
    if (!el) return
    const r = outil.appliquer(valeur, el.selectionStart ?? 0, el.selectionEnd ?? 0)
    aRestaurer.current = { debut: r.debut, fin: r.fin }
    onChanger(r.texte, r.debut, r.fin)
  }

  if (!position) return null

  return createPortal(
    <div
      ref={bulle}
      role="toolbar"
      aria-label="Mise en forme du texte"
      /*
        `onMouseDown` neutralisé : sans cela le champ perd le focus au clic, la sélection s'efface,
        et le bouton agirait sur un curseur vide. C'est LA subtilité de toute barre flottante.
      */
      onMouseDown={(e) => e.preventDefault()}
      className={
        'fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 ' +
        'shadow-[0_4px_14px_rgba(15,23,42,.16)]'
      }
      style={{ left: position.x, top: Math.max(4, position.y - ECART), transform: 'translateX(-50%)' }}
    >
      {OUTILS.map((o) => (
        <button
          key={o.cle}
          type="button"
          aria-label={o.libelle}
          title={o.libelle}
          onClick={() => agir(o)}
          className={
            'flex size-7 items-center justify-center rounded-md text-[var(--texte-secondaire)] ' +
            'transition-colors hover:bg-secondary hover:text-foreground ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
          }
        >
          <o.icone size={14} strokeWidth={1.9} aria-hidden="true" />
        </button>
      ))}
    </div>,
    document.body,
  )
}

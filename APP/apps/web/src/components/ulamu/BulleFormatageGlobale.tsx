/**
 * La bulle de mise en forme — PARTOUT — chantier 87, 11/09/2026.
 *
 * ── Ce qui change par rapport au chantier 86 ──────────────────────────────────────────────────
 *
 * Le porteur l'a essayée sur le compte-rendu, elle n'y était pas : *« il faut ce type de sélection
 * partout dans les interfaces où il y a des champs de saisie texte »*. J'avais restreint la bulle
 * au seul composeur de la consultation, et j'avais tort de décider pour lui.
 *
 * Elle est donc **montée une seule fois dans la coquille** et s'attache d'elle-même à **toute**
 * zone de saisie multiligne de l'application — les vingt-trois, sans câblage écran par écran.
 *
 * ⚠️ **Pourquoi une seule bulle globale et non une par champ.** Deux chemins pour la même
 * fonction finissent toujours par diverger — c'est la leçon du chantier 84, où deux endroits
 * calculaient la même échéance. Ici, il y a un seul composant, une seule grammaire, un seul
 * raccourci clavier. Le champ du composeur n'a plus de traitement particulier.
 *
 * ── Comment elle écrit dans un champ qu'elle ne connaît pas ───────────────────────────────────
 *
 * Ces champs sont *contrôlés* par React : écrire `champ.value = …` ne suffirait pas, React
 * réécrirait l'ancienne valeur au rendu suivant. On passe donc par le **setter natif** puis on
 * émet un vrai événement `input` — exactement ce que fait un vrai clavier. React le reçoit, appelle
 * le `onChange` de l'écran, et l'état part par le chemin normal. **Aucun écran n'a à savoir que
 * cette bulle existe.**
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, List, ListOrdered, Strikethrough, Type, Underline } from 'lucide-react'

import {
  basculerListe,
  basculerMarqueur,
  continuerListe,
  type StyleTexte,
} from '@/modules/consultation/texte-riche'

/** Hauteur réservée au-dessus de la sélection : la bulle, plus un souffle. */
const ECART = 44

/**
 * Un champ peut REFUSER la mise en forme avec `data-sans-formatage`.
 *
 * Il n'y en a pas aujourd'hui, et c'est volontaire : le porteur a demandé « partout ». Mais
 * l'échappatoire existe pour le jour où un champ portera un contenu qui ne se met pas en forme —
 * une clé, un identifiant, un contenu relu par un tiers qui ne connaîtrait pas cette grammaire.
 */
const accepte = (el: Element | null): el is HTMLTextAreaElement =>
  el instanceof HTMLTextAreaElement && !el.disabled && !el.readOnly && el.dataset.sansFormatage === undefined

interface Outil {
  cle: string
  libelle: string
  icone: typeof Bold
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
 * Écrit dans un champ contrôlé par React, comme le ferait un clavier.
 *
 * Le `setter` natif contourne l'interception de React sur la propriété `value` ; l'événement
 * `input` qui suit déclenche le `onChange` de l'écran. Sans ces deux gestes ensemble, la valeur
 * serait rétablie au rendu suivant et le clic n'aurait servi à rien.
 */
function ecrireDansLeChamp(champ: HTMLTextAreaElement, texte: string, debut: number, fin: number): void {
  const proprio = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
  proprio?.set?.call(champ, texte)
  champ.dispatchEvent(new Event('input', { bubbles: true }))
  // Après coup : React vient de reposer la valeur, le curseur serait sinon renvoyé à la fin.
  champ.setSelectionRange(debut, fin)
}

/**
 * Où tombe le début de la sélection, en pixels d'écran.
 *
 * Un `<textarea>` ne contient aucun nœud de texte : on ne peut pas lui demander la position d'une
 * sélection. On reconstruit donc un MIROIR — une boîte invisible portant les mêmes réglages de
 * police, de largeur et de marge — et on mesure dedans.
 *
 * ⚠️ Sous jsdom, toutes les mesures valent zéro : la bulle s'affiche alors en haut à gauche. C'est
 * une limite de l'environnement de test, pas un défaut — et c'est pourquoi aucun test ne porte sur
 * la POSITION. Elle se vérifie à l'œil, comme la poignée du chantier 82.
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

export function BulleFormatageGlobale() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  /** Le champ visé, gardé hors de l'état : le relire à chaque clic vaudrait pour un autre champ. */
  const champ = useRef<HTMLTextAreaElement | null>(null)

  const relire = useCallback(() => {
    const el = document.activeElement
    if (!accepte(el)) {
      champ.current = null
      setPosition(null)
      return
    }
    champ.current = el
    setPosition(positionDeLaSelection(el))
  }, [])

  useEffect(() => {
    /*
      `selectionchange` sur le DOCUMENT : c'est le seul événement qui se déclenche aussi quand la
      sélection se RÉDUIT au clavier. Avec `select` sur le champ, la bulle restait affichée sur rien.
    */
    document.addEventListener('selectionchange', relire)
    window.addEventListener('resize', relire)
    // En capture : un défilement de n'importe quel parent déplace le champ sous la bulle.
    window.addEventListener('scroll', relire, true)
    document.addEventListener('focusout', relire)
    return () => {
      document.removeEventListener('selectionchange', relire)
      window.removeEventListener('resize', relire)
      window.removeEventListener('scroll', relire, true)
      document.removeEventListener('focusout', relire)
    }
  }, [relire])

  /*
    ── Ctrl+Entrée : la suite logique de la liste, dans TOUS les champs ─────────────────────────

    Écouté ici plutôt que sur chaque champ, pour la même raison que la bulle : un seul chemin.

    ⚠️ En CAPTURE, donc avant les gestionnaires des écrans. Sans cela, le composeur de la
    consultation — où « Entrée » envoie — partirait avant nous : Ctrl+Entrée n'a pas la touche Maj
    et ressemble à un envoi. On préempte, on annule l'événement, l'écran ne le voit jamais.
  */
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return
      const el = document.activeElement
      if (!accepte(el)) return
      e.preventDefault()
      e.stopPropagation()
      const r = continuerListe(el.value, el.selectionStart ?? el.value.length)
      ecrireDansLeChamp(el, r.texte, r.curseur, r.curseur)
    }
    document.addEventListener('keydown', auClavier, true)
    return () => document.removeEventListener('keydown', auClavier, true)
  }, [])

  const agir = (outil: Outil) => {
    const el = champ.current
    if (!el) return
    const r = outil.appliquer(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0)
    ecrireDansLeChamp(el, r.texte, r.debut, r.fin)
    el.focus()
    setPosition(positionDeLaSelection(el))
  }

  if (!position) return null

  return createPortal(
    <div
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

/**
 * FeuilleImpression — le gabarit A4 commun à TOUS les documents imprimables d'ULAMU.
 * Chantier 134 (refonte), chantier 141 (pagination mesurée). Ordonnance · Reçu · Carnet · Contrat.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **ULAMU n'imprimait RIEN** : pas un `window.print`, pas un `@media print` dans tout le projet.
 * L'ordonnance se présente pourtant en pharmacie, le reçu sert à un remboursement, le carnet suit
 * un patient qui change de médecin, et le contrat signé se téléchargeait en `.txt`.
 *
 * > **Un document qu'on ne peut pas sortir de l'écran n'est pas un document : c'est un affichage.**
 *
 * ── ⚠️ La feuille ne connaissait pas la notion de PAGE — chantier 141, 16/09/2026 ─────────────
 *
 * **Mesuré en ligne sur le contrat d'Armel Konaté** : le document fait **452 mm de haut**, une page
 * A4 en fait **297**. Il dépassait donc de **155 mm — plus d'une demi-page**. Et l'aperçu ne le
 * montrait même pas : la feuille restait bloquée à 297 mm et **écrasait** le reste.
 *
 * > **Un aperçu qui ment sur ce qui va sortir est pire qu'une absence d'aperçu.**
 *
 * Le gabarit rend donc le corps **une première fois, invisible**, à la largeur exacte d'une page ;
 * il mesure chaque bloc, puis les répartit dans autant de feuilles A4 que nécessaire — chacune avec
 * son en-tête, son pied et **« Page 2 sur 4 »**.
 *
 * 📌 **La largeur ne bouge jamais** (210 mm), et c'est ce qui rend la mesure fiable : *une page web
 * se re-mesure à chaque redimensionnement, une feuille A4 non.* On mesure une fois, puis à nouveau
 * quand les polices sont chargées — *une ligne mesurée avant sa police est mesurée dans une autre.*
 *
 * 📌 **L'écran devient identique au papier.** C'est le vrai correctif : la plainte ne portait pas
 * sur le tirage, elle portait sur l'aperçu.
 *
 * 📌 **En-tête complet sur chaque page** — décision du porteur du 16/09, prise en connaissance du
 * coût : environ 6 cm de texte utile en moins par page à partir de la deuxième. *Une page qui se
 * présente seule vaut le papier qu'elle coûte.*
 *
 * ⚠️ **La limite qui reste, écrite plutôt que tue** : la répartition se fait au BLOC — un article,
 * un paragraphe, un tableau. Un bloc plus haut qu'une page prend sa page à lui seul et déborde
 * plutôt que de disparaître. *Un débordement se voit et se corrige ; une disparition, non.* Le jour
 * où une ordonnance de trente lignes le produira, c'est le TABLEAU qu'il faudra apprendre à couper,
 * pas cette répartition qu'il faudra changer.
 *
 * ── Les deux décisions de construction, inchangées ────────────────────────────────────────────
 *
 * 📌 **Zéro dépendance** : CSS `@media print` + PDF natif du navigateur, le choix de CMS-SARIS.
 * *Sur une connexion congolaise, faire télécharger une bibliothèque de génération PDF avant
 * d'imprimer une ordonnance est une mauvaise affaire.* La pagination ci-dessous ne coûte rien de
 * plus : c'est une addition de hauteurs.
 *
 * 📌 **UNE feuille pour les quatre documents** — quatre gabarits séparés divergeraient en trois mois.
 *
 * ⚠️ **Écarté de CMS** : ses cadres « signature et cachet ». Personne ne signe ces feuilles à la
 * main — la preuve est électronique. *Un cadre vide sur un document médical invite à le remplir
 * après coup.*
 */
import { Children, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { LogoMark } from '@/components/ulamu/Logo'
/*
  La répartition vit à part : c'est de l'arithmétique pure, sans React ni DOM, et c'est ce qui la
  rend éprouvable. *On éprouve ce qui se calcule, et on ancre ce qui se mesure.*
*/
import { repartirEnPages } from '@/lib/pagination-a4'

/* ── Palette DOCUMENT ───────────────────────────────────────────────────────────────────────────
   Pensée pour le papier, pas pour l'écran, et volontairement indépendante du thème : un document
   imprimé en thème sombre serait illisible et viderait la cartouche d'une imprimante d'officine. */
const ENCRE = '#151C25'
const GRIS = '#5A6572'
const ACCENT = '#1E4A8F' // bleu ULAMU assombri pour le papier — il doit tenir en niveaux de gris
const DOUX = '#F2F5F9'
const FILET = '#D9E0E9'

/* ── Typographie ───────────────────────────────────────────────────────────────────────────────
   Le corps en SERIF : sur papier, elle se lit plus vite sur de longs blocs, et c'est la convention
   de tout acte écrit. Georgia est présente sur Windows, macOS et Android ; les replis couvrent le
   reste. *Une police absente qui retombe sur du sans-serif ferait deux documents différents selon
   le poste qui imprime.* */
const TITRAGE = "'Plus Jakarta Sans Variable', 'Segoe UI', system-ui, sans-serif"
const CORPS = "Georgia, 'Times New Roman', 'Liberation Serif', serif"
const CHIFFRES = "'JetBrains Mono Variable', 'Consolas', monospace"

/** A4 en pixels à 96 ppp, et la marge d'un acte. */
const LARGEUR = 210 * 3.7795
const HAUTEUR = 297 * 3.7795
const MARGE = 22 * 3.7795

/**
 * La marge de sécurité retirée de chaque page — 6 mm.
 *
 * ⚠️ Un écran et une imprimante ne rendent pas exactement la même hauteur de ligne : arrondis de
 * sous-pixel, police substituée, zone non imprimable du matériel. *Remplir une page au millimètre
 * près, c'est parier que deux appareils sont d'accord sur ce qu'est un millimètre.*
 */
const SECURITE = 6 * 3.7795

export interface FeuilleImpressionProps {
  /** Le nom du document, en haut à droite : « Ordonnance », « Reçu de paiement »… */
  document: string
  /** La référence qui permet de retrouver la pièce — en en-tête et en pied. */
  reference: string
  /** Deux blocs d'identité côte à côte (patient / soignant, payeur / opération…). */
  blocs: Array<{ titre: string; lignes: Array<[string, string]> }>
  /** Ce que le pied rappelle, en plus de la référence. */
  mention?: string
  children: React.ReactNode
  onFermer: () => void
}

/**
 * Le style d'impression, posé le temps du tirage puis retiré.
 *
 * ⚠️ `visibility` et non `display` : masquer par `display:none` fait perdre au navigateur la
 * hauteur des ancêtres, et la feuille commence alors à la deuxième page.
 */
function imprimer(idRacine: string): void {
  const style = window.document.createElement('style')
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #${idRacine}, #${idRacine} * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #${idRacine} {
        position: absolute !important;
        left: 0 !important; top: 0 !important;
        margin: 0 !important; gap: 0 !important;
      }
      /* Chaque feuille occupe UNE page, et la dernière n'en ouvre pas une de plus. */
      #${idRacine} [data-page] {
        width: 210mm !important; height: 297mm !important;
        margin: 0 !important; box-shadow: none !important; border-radius: 0 !important;
        break-after: page;
      }
      #${idRacine} [data-page]:last-of-type { break-after: auto; }
      /* La barre d'actions n'a rien à faire sur le papier. */
      #${idRacine} [data-hors-impression] { display: none !important; }
      /* Un titre ne reste jamais seul en bas d'une page, un tableau ne se coupe pas au milieu. */
      #${idRacine} h1, #${idRacine} h2, #${idRacine} [data-titre] { break-after: avoid; }
      #${idRacine} [data-insecable] { break-inside: avoid; }
      @page { size: A4; margin: 0; }
    }`
  window.document.head.appendChild(style)
  window.print()
  // Retiré après coup : laissé en place, il masquerait l'application au prochain Ctrl+P.
  window.setTimeout(() => style.remove(), 2000)
}

export function FeuilleImpression({ document: nomDocument, reference, blocs, mention, children, onFermer }: FeuilleImpressionProps) {
  const idRacine = useRef(`feuille-${Math.random().toString(36).slice(2, 9)}`).current
  const refMesure = useRef<HTMLDivElement>(null)
  const enfants = useMemo(() => Children.toArray(children), [children])
  const [pages, setPages] = useState<number[][] | null>(null)

  /* Échap ferme l'aperçu : sur un document qui recouvre l'écran, ne pas trouver la sortie donne
     l'impression d'être bloqué. */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onFermer])

  /*
    ── La mesure ────────────────────────────────────────────────────────────────────────────────

    Deux choses sont mesurées : l'**habillage** d'une page (en-tête, blocs d'identité, pied, marges
    verticales du corps) et la **hauteur de chaque bloc** du corps. Le premier se soustrait de la
    hauteur A4 pour donner la place utile ; les seconds alimentent la répartition.

    ⚠️ On mesure DEUX fois : tout de suite, puis quand les polices sont chargées. *Une ligne mesurée
    avant sa police est mesurée dans une autre* — et le document sortirait décalé.
  */
  // Le contenu a changé : la répartition précédente ne vaut plus rien, on remesure.
  useLayoutEffect(() => {
    setPages(null)
  }, [enfants])

  useLayoutEffect(() => {
    if (pages !== null) return
    const c = refMesure.current
    const habillage = c?.querySelector('[data-mesure-habillage]') ?? null
    const mesures = c ? [...c.querySelectorAll('[data-mesure-bloc]')] : []
    const utile = habillage ? HAUTEUR - habillage.getBoundingClientRect().height - SECURITE : 0

    /*
      ⚠️ **Sans mesure exploitable, tout tient sur une feuille — jamais rien.** jsdom rend toutes
      les hauteurs à zéro, et un navigateur peut refuser une mesure sur un onglet en arrière-plan.
      *Un aperçu vide par prudence est un aperçu cassé : il vaut mieux une page trop longue qu'une
      page blanche.*
    */
    if (!habillage || utile <= 0 || mesures.length !== enfants.length) {
      setPages([enfants.map((_, i) => i)])
      return
    }
    setPages(repartirEnPages(mesures.map((e) => e.getBoundingClientRect().height), utile))
  }, [pages, enfants])

  /**
   * Les pages, une fois mesurées. `null` = la mesure n'a pas encore eu lieu.
   *
   * ⚠️ **Rien n'est rendu pendant ce temps**, et c'est voulu : rendre le document « en attendant »
   * le ferait exister DEUX fois dans la page — une fois sur le banc de mesure, une fois à l'écran.
   * *Un document qui figure deux fois dans une page est lu deux fois par un lecteur d'écran, et
   * trouvé deux fois par tout ce qui cherche du texte.* La mesure se fait avant le premier
   * affichage : personne ne voit ce vide.
   */
  const feuilles = pages

  const enTete = (
    <div style={{ padding: `${MARGE}px ${MARGE}px 0` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <LogoMark size={36} />
          <div>
            <p style={{ margin: 0, fontFamily: TITRAGE, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ULAMU
            </p>
            <p style={{ margin: '3px 0 0', fontFamily: TITRAGE, fontSize: 8.5, color: GRIS, letterSpacing: '0.04em' }}>
              Plateforme de télémédecine · République du Congo
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p
            data-titre
            style={{
              margin: 0,
              fontFamily: TITRAGE,
              fontSize: 12,
              fontWeight: 700,
              color: ACCENT,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            {nomDocument}
          </p>
          <p style={{ margin: '4px 0 0', fontFamily: CHIFFRES, fontSize: 8.5, color: GRIS, letterSpacing: '0.02em' }}>
            {reference}
          </p>
        </div>
      </div>
      <div style={{ height: 2.5, background: ACCENT }} />
      <div style={{ height: 1, background: FILET, marginTop: 1.5 }} />
    </div>
  )

  /* ── BLOCS D'IDENTITÉ ────────────────────────────────────────────────────────────────────────
     Encadrés et alignés sur une grille : ce sont les « parties » de l'acte, et elles se lisent d'un
     coup d'œil, avant le corps. Répétés sur CHAQUE page — décision du porteur du 16/09. */
  const identite =
    blocs.length > 0 ? (
      <div
        data-insecable
        style={{
          margin: `18px ${MARGE}px 0`,
          border: `1px solid ${FILET}`,
          background: DOUX,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(blocs.length, 2)}, 1fr)`,
        }}
      >
        {blocs.map((b, i) => (
          <div key={b.titre} style={{ padding: '13px 16px', borderLeft: i > 0 ? `1px solid ${FILET}` : undefined }}>
            <p
              style={{
                margin: '0 0 8px',
                fontFamily: TITRAGE,
                fontSize: 8,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: ACCENT,
              }}
            >
              {b.titre}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {b.lignes.map(([cle, valeur]) => (
                  <tr key={cle}>
                    <td style={{ padding: '2.5px 0', color: GRIS, width: '42%', verticalAlign: 'top', fontFamily: TITRAGE, fontSize: 8.5 }}>
                      {cle}
                    </td>
                    <td style={{ padding: '2.5px 0 2.5px 10px', fontWeight: 700, verticalAlign: 'top', fontSize: 10.5 }}>{valeur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    ) : null

  /* ── PIED ─────────────────────────────────────────────────────────────────────────────────────
     La pagination n'est pas décorative : un contrat de deux pages dont la seconde se perd ne se
     remarque pas ; numéroté, si. */
  const pied = (numero: number, total: number) => (
    <div style={{ padding: `0 ${MARGE}px ${MARGE}px` }}>
      <div style={{ height: 1, background: FILET }} />
      <div style={{ paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <p style={{ margin: 0, fontFamily: TITRAGE, fontSize: 7.5, color: GRIS, letterSpacing: '0.03em' }}>
          {mention ?? 'ULAMU · Document confidentiel'}
        </p>
        <p style={{ margin: 0, fontFamily: CHIFFRES, fontSize: 7.5, color: GRIS, display: 'flex', gap: 10 }}>
          <span>{reference}</span>
          <span>{`Page ${numero} sur ${total}`}</span>
        </p>
      </div>
    </div>
  )

  const feuille = (contenu: React.ReactNode, numero: number, total: number, mesure = false) => (
    <div
      data-page={mesure ? undefined : numero}
      data-mesure-habillage={mesure ? '' : undefined}
      style={{
        width: LARGEUR,
        height: mesure ? undefined : HAUTEUR,
        background: '#FFFFFF',
        color: ENCRE,
        fontFamily: CORPS,
        display: 'flex',
        flexDirection: 'column',
        flex: 'none',
        overflow: 'hidden',
        boxShadow: mesure ? undefined : '0 10px 40px rgba(15,23,42,0.22)',
      }}
    >
      {enTete}
      {identite}
      <div style={{ flex: mesure ? 'none' : 1, padding: `20px ${MARGE}px 26px` }}>{contenu}</div>
      {pied(numero, total)}
    </div>
  )

  return createPortal(
    <>
      <div onClick={onFermer} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '18px 16px 40px' }}>
        <div data-hors-impression style={{ display: 'flex', gap: 8, marginBottom: 14, position: 'sticky', top: 0, zIndex: 2 }}>
          <button
            type="button"
            onClick={() => imprimer(idRacine)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontFamily: TITRAGE, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Printer size={15} aria-hidden="true" />
            Imprimer ou enregistrer en PDF
          </button>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer l’aperçu"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: `1px solid ${FILET}`, background: '#fff', color: ENCRE, cursor: 'pointer' }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Les feuilles, empilées : à l'écran comme sur le papier, une page est une page. */}
        <div id={idRacine} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          {(feuilles ?? []).map((indices, i) => (
            <div key={i} style={{ display: 'contents' }}>
              {feuille(
                indices.map((j) => enfants[j]),
                i + 1,
                (feuilles ?? []).length,
              )}
            </div>
          ))}
        </div>
      </div>

      {/*
        ⚠️ **Le banc de mesure vit HORS de `#idRacine`**, et ce n'est pas un détail : la règle
        d'impression rend visible tout ce qui se trouve DANS la racine. À l'intérieur, ce banc
        invisible serait imprimé — et le document sortirait en double.

        ⚠️ **Et il est démonté dès la mesure faite.** Le garder en place laisserait le document
        exister deux fois dans la page : lu deux fois par un lecteur d'écran, trouvé deux fois par
        tout ce qui cherche du texte. *Un instrument de mesure qu'on oublie de ranger devient une
        pièce du bâtiment.*
      */}
      {pages === null ? (
        <div
          ref={refMesure}
          aria-hidden="true"
          style={{ position: 'fixed', left: -99999, top: 0, width: LARGEUR, visibility: 'hidden', pointerEvents: 'none' }}
        >
          {feuille(null, 1, 1, true)}
          <div style={{ width: LARGEUR - 2 * MARGE, fontFamily: CORPS, color: ENCRE }}>
            {enfants.map((e, i) => (
              <div key={i} data-mesure-bloc="">
                {e}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>,
    window.document.body,
  )
}

/** Un titre de section DANS le corps d'un document — en titrage, jamais en serif. */
export function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-titre
      style={{
        margin: '0 0 9px',
        fontFamily: TITRAGE,
        fontSize: 8.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: ACCENT,
      }}
    >
      {children}
    </p>
  )
}

/**
 * Un ARTICLE d'acte : son numéro, son titre, son texte justifié.
 *
 * ⚠️ **Le texte est justifié**, et c'est ce qui distingue un acte d'une page web : les deux bords
 * alignés donnent le bloc régulier qu'on attend d'un contrat. L'interlignage est large — *un texte
 * juridique se relit, et un texte qu'on relit a besoin d'air entre ses lignes.*
 *
 * 📌 Un article est **un seul bloc** aux yeux de la pagination : son titre ne peut donc pas rester
 * seul en bas d'une page, et son texte ne se coupe pas en deux.
 */
export function ArticleImprime({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div data-insecable style={{ marginBottom: 13 }}>
      {/*
        ⚠️ Le titre est rendu **tel qu'il est écrit dans le texte signé** — capitales comprises. Le
        styliser (graisse, couleur, espacement) ne touche à aucun caractère ; le *recomposer*, si.
        *Une empreinte ne voit pas la différence entre une faute de frappe et une jolie mise en
        forme : elle ne voit que des octets qui ont changé.*
      */}
      <p data-titre style={{ margin: '0 0 4px', fontFamily: TITRAGE, fontSize: 10, fontWeight: 700, letterSpacing: '0.02em', color: ACCENT }}>
        {titre}
      </p>
      <div style={{ fontSize: 10, lineHeight: 1.72, textAlign: 'justify', hyphens: 'auto' }}>{children}</div>
    </div>
  )
}

/** Réexports pour les corps de documents — une seule palette, une seule typographie, jamais recopiées. */
export const IMPRESSION_ENCRE = ENCRE
export const IMPRESSION_GRIS = GRIS
export const IMPRESSION_ACCENT = ACCENT
export const IMPRESSION_DOUX = DOUX
export const IMPRESSION_FILET = FILET
export const IMPRESSION_TITRAGE = TITRAGE
export const IMPRESSION_CORPS = CORPS
export const IMPRESSION_CHIFFRES = CHIFFRES

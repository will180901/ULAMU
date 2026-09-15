/**
 * FeuilleImpression — le gabarit A4 commun à TOUS les documents imprimables d'ULAMU.
 * Chantier 134, 15/09/2026 (refonte). Ordonnance · Reçu · Carnet · Contrat.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **ULAMU n'imprimait RIEN** : pas un `window.print`, pas un `@media print` dans tout le projet.
 * L'ordonnance se présente pourtant en pharmacie, le reçu sert à un remboursement, le carnet suit
 * un patient qui change de médecin, et le contrat signé se téléchargeait en `.txt`.
 *
 * > **Un document qu'on ne peut pas sortir de l'écran n'est pas un document : c'est un affichage.**
 *
 * ── La refonte du 15/09, et ce qui la motive ──────────────────────────────────────────────────
 *
 * Le premier gabarit fonctionnait, mais il imprimait comme une page web : marges de 10 mm, une
 * seule police, texte au fil de l'eau, aucune pagination. *Un document officiel se reconnaît avant
 * d'être lu — à ses marges, à sa typographie, à sa numérotation.* Le porteur l'a dit : « ça doit
 * ressembler à un modèle digne d'une grande entreprise ».
 *
 * 📌 **Marges de 22 mm**, et non 10 : c'est la marge d'un acte, elle laisse la place à une reliure,
 * à un tampon, à une annotation. *Un texte qui touche le bord de la feuille se lit comme un tract.*
 *
 * 📌 **Deux familles, deux rôles.** Titres et intitulés en sans-serif de marque ; **le corps des
 * documents en SERIF**. Ce n'est pas une préférence : sur du papier, une serif se lit plus vite sur
 * de longs blocs, et c'est la convention de tout acte écrit — *une police dit à quel genre de
 * document on a affaire avant qu'on en ait lu un mot.*
 *
 * 📌 **Un pied porteur** : sous un filet, la mention du document et sa référence.
 *
 * ⚠️ **Ce pied ne numérote PAS les pages, et il ne paraît que sur la dernière.** C'est une
 * limite, et elle est écrite ici plutôt que tue. Numéroter « Page 1 sur N » demande soit les boîtes
 * de marge `@page`, que les navigateurs d'entrée de gamme n'ont pas, soit une bibliothèque de
 * pagination — que la règle « zéro dépendance » écarte, et pour cause : *faire télécharger un moteur
 * de pagination avant d'imprimer une ordonnance, sur une connexion congolaise, est une mauvaise
 * affaire.*
 *
 * *Un commentaire qui annonce une pagination inexistante est plus dangereux que l'absence de
 * pagination : il empêche de la remarquer.*
 *
 * ── Les deux décisions de construction, inchangées ────────────────────────────────────────────
 *
 * 📌 **Zéro dépendance** : CSS `@media print` + PDF natif du navigateur, le choix de CMS-SARIS.
 * *Sur une connexion congolaise, faire télécharger une bibliothèque de génération PDF avant
 * d'imprimer une ordonnance est une mauvaise affaire.*
 *
 * 📌 **UNE feuille pour les quatre documents** — quatre gabarits séparés divergeraient en trois mois.
 *
 * ⚠️ **Écarté de CMS** : ses cadres « signature et cachet ». Personne ne signe ces feuilles à la
 * main — la preuve est électronique. *Un cadre vide sur un document médical invite à le remplir
 * après coup.*
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { LogoMark } from '@/components/ulamu/Logo'

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
        width: 210mm !important; min-height: 297mm !important;
        margin: 0 !important; box-shadow: none !important; border-radius: 0 !important;
      }
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

export function FeuilleImpression({ document, reference, blocs, mention, children, onFermer }: FeuilleImpressionProps) {
  const idRacine = useRef(`feuille-${Math.random().toString(36).slice(2, 9)}`).current

  /* Échap ferme l'aperçu : sur un document qui recouvre l'écran, ne pas trouver la sortie donne
     l'impression d'être bloqué. */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onFermer])

  const feuille = (
    <div
      id={idRacine}
      style={{
        width: LARGEUR,
        minHeight: HAUTEUR,
        background: '#FFFFFF',
        color: ENCRE,
        fontFamily: CORPS,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(15,23,42,0.22)',
      }}
    >
      {/* ── EN-TÊTE ─────────────────────────────────────────────────────────────────────────
          Un filet fin sous un filet épais : la marque des papiers à en-tête institutionnels. Il
          sépare sans peser, là où une bande pleine aurait mangé le haut de la page. */}
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
              {document}
            </p>
            <p style={{ margin: '4px 0 0', fontFamily: CHIFFRES, fontSize: 8.5, color: GRIS, letterSpacing: '0.02em' }}>
              {reference}
            </p>
          </div>
        </div>
        <div style={{ height: 2.5, background: ACCENT }} />
        <div style={{ height: 1, background: FILET, marginTop: 1.5 }} />
      </div>

      {/* ── BLOCS D'IDENTITÉ ────────────────────────────────────────────────────────────────
          Encadrés et alignés sur une grille : ce sont les « parties » de l'acte, et elles se
          lisent d'un coup d'œil, avant le corps. */}
      {blocs.length > 0 ? (
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
      ) : null}

      {/* ── CORPS ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: `20px ${MARGE}px 26px` }}>{children}</div>

      {/* ── PIED ─────────────────────────────────────────────────────────────────────────────
          La pagination n'est pas décorative : un contrat de deux pages dont la seconde se perd ne
          se remarque pas ; numéroté, si. */}
      <div style={{ padding: `0 ${MARGE}px ${MARGE}px` }}>
        <div style={{ height: 1, background: FILET }} />
        <div style={{ paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <p style={{ margin: 0, fontFamily: TITRAGE, fontSize: 7.5, color: GRIS, letterSpacing: '0.03em' }}>
            {mention ?? 'ULAMU · Document confidentiel'}
          </p>
          <p style={{ margin: 0, fontFamily: CHIFFRES, fontSize: 7.5, color: GRIS }}>{reference}</p>
        </div>
      </div>
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
        {feuille}
      </div>
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

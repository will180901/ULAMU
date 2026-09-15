/**
 * FeuilleImpression — le gabarit A4 commun à TOUS les documents imprimables d'ULAMU.
 * Chantier 131, 15/09/2026. Ordonnance · Reçu · Carnet · Contrat.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **ULAMU n'imprimait RIEN.** Mesuré le 15/09 : pas un `window.print`, pas un `@media print`,
 * pas un `@page` dans tout le projet web. Conséquences, dans un pays où le papier reste le support
 * qui ne tombe pas en panne :
 *
 *   • l'**ordonnance** ne s'imprime pas — or elle se présente EN PHARMACIE, et le QR vit dans un
 *     téléphone dont la batterie se vide ;
 *   • le **reçu** ne s'imprime pas — aucun justificatif pour un employeur ou une mutuelle ;
 *   • le **carnet** ne s'imprime pas — un patient qui change de médecin n'emporte rien ;
 *   • le **contrat signé** se téléchargeait en `.txt`. Un document juridique, en texte brut.
 *
 * > **Un document qu'on ne peut pas sortir de l'écran n'est pas un document : c'est un affichage.**
 *
 * ── Les deux décisions de construction ────────────────────────────────────────────────────────
 *
 * 📌 **Zéro dépendance : CSS `@media print` et le PDF natif du navigateur.** C'est le choix de
 * CMS-SARIS, éprouvé, et c'est le bon ici pour une raison de terrain : *sur une connexion
 * congolaise, faire télécharger une bibliothèque de génération PDF avant de pouvoir imprimer une
 * ordonnance est une mauvaise affaire.* Le navigateur sait déjà faire, et il sait aussi
 * « enregistrer en PDF ».
 *
 * 📌 **UNE feuille pour les quatre documents**, le corps passé en `children`. Quatre gabarits
 * séparés divergeraient en trois mois — c'est la leçon que ce projet a déjà payée sur les règles
 * recopiées.
 *
 * ── Ce qui n'est PAS repris de CMS, et pourquoi ───────────────────────────────────────────────
 *
 * CMS imprime pour un cabinet : deux cadres de signature manuscrite, un cachet d'établissement.
 * ULAMU est une plateforme à distance — **personne ne signe sur le papier**. La preuve est
 * électronique, et c'est elle qu'on imprime : QR de délivrance, empreinte de signature, référence.
 * *Un cadre « signature et cachet » sur un document qu'aucune main ne signera invite à le remplir
 * après coup.*
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { LogoMark } from '@/components/ulamu/Logo'

/* Palette DOCUMENT — pensée pour le papier, pas pour l'écran.
   Elle ne suit pas le thème : un document imprimé en thème sombre serait illisible, et gaspillerait
   l'encre d'une imprimante de pharmacie. */
const ENCRE = '#1B2430'
const GRIS = '#5B6672'
const ACCENT = '#2756A6' // le bleu ULAMU, lisible sur blanc
const DOUX = '#EDF1F6'
const FILET = '#DCE2EA'

/** A4 en pixels à 96 ppp — la feuille se compose à sa taille réelle, pas à celle de la fenêtre. */
const LARGEUR = 210 * 3.7795
const HAUTEUR = 297 * 3.7795

export interface FeuilleImpressionProps {
  /** Le nom du document, en haut à droite : « Ordonnance », « Reçu de paiement »… */
  document: string
  /** La référence qui permet de retrouver la pièce — imprimée en pied. */
  reference: string
  /** Deux blocs d'identité côte à côte (patient / soignant, payeur / séance…). */
  blocs: Array<{ titre: string; lignes: Array<[string, string]> }>
  /** Ce que le pied doit rappeler en plus de la référence (mention légale, avertissement). */
  mention?: string
  children: React.ReactNode
  onFermer: () => void
}

/**
 * Le style d'impression, posé le temps du tirage puis retiré.
 *
 * ⚠️ `visibility` et non `display` : masquer par `display:none` fait perdre au navigateur la
 * hauteur des ancêtres, et la feuille se retrouve décalée d'une page. On rend tout invisible, on
 * rend la feuille visible, et on la sort du flux pour qu'elle commence en haut de la page.
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
      @page { size: A4; margin: 0; }
    }`
  window.document.head.appendChild(style)
  window.print()
  // Retiré après coup : laissé en place, il masquerait l'application au prochain Ctrl+P de l'utilisateur.
  window.setTimeout(() => style.remove(), 2000)
}

export function FeuilleImpression({ document, reference, blocs, mention, children, onFermer }: FeuilleImpressionProps) {
  const idRacine = useRef(`feuille-${Math.random().toString(36).slice(2, 9)}`).current

  /*
    Échap ferme l'aperçu. Sans cela, le seul chemin de sortie est une croix de 28 px — et sur un
    document qui recouvre l'écran, ne pas trouver la sortie donne l'impression d'être bloqué.
  */
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
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(15,23,42,0.25)',
      }}
    >
      {/* EN-TÊTE */}
      <div style={{ borderBottom: `2px solid ${ACCENT}`, padding: '22px 40px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark size={34} />
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>ULAMU</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, color: GRIS }}>Télémédecine · République du Congo</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{document}</p>
          <p style={{ margin: '3px 0 0', fontSize: 9, color: GRIS, fontFamily: 'monospace' }}>{reference}</p>
        </div>
      </div>

      {/* BLOCS D'IDENTITÉ */}
      {blocs.length > 0 ? (
        <div style={{ background: DOUX, padding: '14px 40px', display: 'grid', gridTemplateColumns: `repeat(${Math.min(blocs.length, 2)}, 1fr)`, gap: 28 }}>
          {blocs.map((b) => (
            <div key={b.titre}>
              <p style={{ margin: '0 0 6px', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT }}>{b.titre}</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                <tbody>
                  {b.lignes.map(([cle, valeur]) => (
                    <tr key={cle}>
                      <td style={{ padding: '2px 0', color: GRIS, width: '44%', verticalAlign: 'top', fontSize: 9.5 }}>{cle}</td>
                      <td style={{ padding: '2px 0 2px 8px', fontWeight: 600, verticalAlign: 'top' }}>{valeur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : null}

      {/* CORPS — propre à chaque document */}
      <div style={{ flex: 1, padding: '20px 40px 24px' }}>{children}</div>

      {/* PIED */}
      <div style={{ borderTop: `2px solid ${ACCENT}`, padding: '9px 40px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 8, color: GRIS }}>{mention ?? 'ULAMU · Document confidentiel'}</p>
        <p style={{ margin: 0, fontSize: 8, color: GRIS, fontFamily: 'monospace' }}>{reference}</p>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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

/** Un titre de section DANS le corps d'un document. */
export function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT }}>{children}</p>
  )
}

/** Réexports pour les corps de documents — une seule palette, jamais recopiée. */
export const IMPRESSION_ENCRE = ENCRE
export const IMPRESSION_GRIS = GRIS
export const IMPRESSION_ACCENT = ACCENT
export const IMPRESSION_DOUX = DOUX
export const IMPRESSION_FILET = FILET

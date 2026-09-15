/**
 * Le contrat de partenariat, sur papier — chantier 132, 15/09/2026 (M03, CU-03-03).
 *
 * ── Pourquoi ce document ─────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Il se téléchargeait en `.txt`.** Un contrat signé électroniquement, livré en texte brut :
 * sans en-tête, sans date de signature visible, sans l'empreinte qui prouve qu'il s'agit bien du
 * texte signé — et sans rien qui permette de le présenter à une banque, à un comptable ou à un
 * tribunal.
 *
 * > **Un contrat qu'on ne peut pas présenter n'engage personne à vos yeux, même s'il vous engage
 * > en droit.**
 *
 * ── Ce que ce document porte, et que le `.txt` ne portait pas ─────────────────────────────────
 *
 * 📌 **L'empreinte du texte signé** (`bodyHash`), imprimée en toutes lettres. C'est elle qui relie
 * cette feuille à ce qui a été accepté : *une copie de contrat sans empreinte ne se distingue pas
 * d'une version réécrite après coup.* Elle existait déjà en base ; personne ne la montrait.
 *
 * 📌 **La date et l'heure de signature**, et le nom du signataire. Le `.txt` ne portait que le
 * corps.
 *
 * 📌 **La commission**, en chiffre, en tête. C'est la seule clause que le soignant relira, et c'est
 * celle qui décide de ce qu'il gagne.
 *
 * ⚠️ **Le corps est rendu tel quel, jamais reformaté.** C'est un texte juridique : *reformater un
 * contrat, c'est en changer la lecture, et l'empreinte imprimée à côté ne correspondrait plus à ce
 * qu'on lit.*
 */
import {
  FeuilleImpression,
  IMPRESSION_DOUX,
  IMPRESSION_FILET,
  IMPRESSION_GRIS,
  TitreSection,
} from './FeuilleImpression'

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) +
  ' à ' +
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export interface ContratImprimableProps {
  version: number
  commissionPct: number
  bodyHash: string
  corps: string
  signePar: string
  signeLe: string | null
  effectifLe: string | null
  onFermer: () => void
}

export function ContratImprimable({
  version,
  commissionPct,
  bodyHash,
  corps,
  signePar,
  signeLe,
  effectifLe,
  onFermer,
}: ContratImprimableProps) {
  return (
    <FeuilleImpression
      document="Contrat de partenariat"
      reference={`CTR-V${version}`}
      mention="ULAMU · Contrat signé électroniquement — l’empreinte ci-dessous en atteste"
      blocs={[
        {
          titre: 'Soignant partenaire',
          lignes: [
            ['Signataire', signePar],
            ['Signé le', signeLe ? dateHeureFr(signeLe) : 'Non signé'],
          ],
        },
        {
          titre: 'Contrat',
          lignes: [
            ['Version', `v${version}`],
            ['En vigueur depuis', effectifLe ? dateHeureFr(effectifLe) : '—'],
          ],
        },
      ]}
      onFermer={onFermer}
    >
      {/*
        ⚠️ **La commission d'abord.** C'est la seule clause que le soignant relira, et celle qui
        décide de ce qu'il gagne. L'enfouir dans le corps la rendrait introuvable sur une feuille
        dense. *Ce qu'on relit doit se trouver sans être cherché.*
      */}
      <div style={{ background: IMPRESSION_DOUX, borderRadius: 6, padding: '12px 16px', marginBottom: 18 }}>
        <TitreSection>Ce que la plateforme retient</TitreSection>
        <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{commissionPct} %</span>
          <span style={{ fontSize: 10.5, color: IMPRESSION_GRIS }}>
            sur les honoraires · vos gains sont retirables à tout moment, sans montant minimum
          </span>
        </p>
      </div>

      <TitreSection>Texte du contrat</TitreSection>
      {/*
        `pre-wrap` et non un rendu enrichi : c'est un texte juridique, il s'imprime tel qu'il a été
        signé. Reformater un contrat, c'est en changer la lecture — et l'empreinte imprimée plus
        bas ne correspondrait plus à ce qu'on lit.
      */}
      <p style={{ margin: 0, fontSize: 10, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{corps}</p>

      {/*
        L'EMPREINTE — ce qui relie cette feuille au texte accepté. Sans elle, une copie de contrat
        ne se distingue pas d'une version réécrite après coup.
      */}
      <div style={{ marginTop: 22, border: `1px solid ${IMPRESSION_FILET}`, borderRadius: 6, padding: 13, pageBreakInside: 'avoid' }}>
        <TitreSection>Preuve de signature</TitreSection>
        <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.55 }}>
          Signé électroniquement par <strong>{signePar}</strong>
          {signeLe ? (
            <>
              {' '}
              le <strong>{dateHeureFr(signeLe)}</strong>
            </>
          ) : null}
          , par mot de passe et code à usage unique.
        </p>
        <p style={{ margin: '7px 0 0', fontSize: 9, color: IMPRESSION_GRIS }}>
          Empreinte du texte signé (SHA-256) — elle change au moindre caractère modifié :
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 9.5, fontFamily: 'monospace', wordBreak: 'break-all' }}>{bodyHash}</p>
      </div>
    </FeuilleImpression>
  )
}

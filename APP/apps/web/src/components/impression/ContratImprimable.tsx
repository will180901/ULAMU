/**
 * Le contrat de partenariat, sur papier — chantier 134, 15/09/2026 (M03, CU-03-03).
 *
 * ── Pourquoi ce document ─────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Il se téléchargeait en `.txt`.** Un contrat signé électroniquement, livré en texte brut :
 * sans en-tête, sans date de signature visible, **sans l'empreinte qui prouve qu'il s'agit bien du
 * texte accepté** — et sans rien qui permette de le présenter à une banque, à un comptable ou à un
 * tribunal.
 *
 * > **Un contrat qu'on ne peut pas présenter n'engage personne à vos yeux, même s'il vous engage
 * > en droit.**
 *
 * ── Ce que la mise en page fait au texte, et ce qu'elle NE lui fait pas ───────────────────────
 *
 * Le texte arrive en lignes brutes, coupées à largeur fixe par la fonction qui le génère. Rendues
 * telles quelles, elles donnaient un bloc en escalier — *une page web imprimée, pas un acte.*
 *
 * 📌 Les lignes d'un même alinéa sont donc **réunies en paragraphes**, et les paragraphes sont
 * **justifiés**. C'est de la PRÉSENTATION : les mots, leur ordre et leur orthographe ne changent
 * pas d'un caractère. Le découpage vit dans `lib/contrat.ts` depuis le chantier 135 — *l'écran de
 * signature et la feuille imprimée lisent désormais le contrat de la même façon, donc le même filet
 * les garde tous les deux.*
 *
 * ── ⚠️ Un contrat NON SIGNÉ ne s'imprime pas comme un contrat signé — chantier 135 ────────────
 *
 * Le praticien peut désormais sortir le contrat **avant** de s'engager, pour le lire au calme ou le
 * montrer à un juriste. Ce tirage-là ne doit surtout pas ressembler au tirage d'un acte conclu : la
 * mention de pied, le nom du document et le bloc de preuve changent, et un bandeau le dit en tête.
 *
 * > **Un projet de contrat qui s'imprime comme un contrat signé est un faux que personne n'a voulu
 * > fabriquer.**
 *
 * C'est la discipline de l'ordonnance annulée : *ce qui invalide un document doit se lire avant son
 * contenu, pas après.*
 *
 * ── Ce qu'il porte, et que le `.txt` ne portait pas ───────────────────────────────────────────
 *
 * 📌 **L'empreinte entière** — une empreinte tronquée ne prouve rien.
 * 📌 **La date et l'heure de signature**, et le nom du signataire.
 * 📌 **La commission en tête** : la seule clause que le praticien relira. *Ce qu'on relit doit se
 * trouver sans être cherché.*
 */
import { decouperContrat, enParagraphes } from '@/lib/contrat'
import {
  ArticleImprime,
  FeuilleImpression,
  IMPRESSION_ACCENT,
  IMPRESSION_CHIFFRES,
  IMPRESSION_FILET,
  IMPRESSION_GRIS,
  IMPRESSION_TITRAGE,
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
  const { preambule, articles, cloture } = decouperContrat(corps)
  const signe = signeLe !== null

  return (
    <FeuilleImpression
      document={signe ? 'Contrat de partenariat' : 'Projet de contrat'}
      reference={`CTR-V${version}`}
      mention={
        signe
          ? 'ULAMU · Contrat signé électroniquement — l’empreinte ci-dessous en atteste'
          : 'ULAMU · Projet de contrat — non signé, sans valeur d’engagement'
      }
      blocs={[
        {
          titre: signe ? 'Praticien signataire' : 'Praticien destinataire',
          lignes: [
            ['Nom', signePar],
            ['Signé le', signe ? dateHeureFr(signeLe) : 'Non signé'],
          ],
        },
        {
          titre: 'Contrat',
          lignes: [
            ['Version', `v${version}`],
            signe
              ? ['En vigueur depuis', effectifLe ? dateHeureFr(effectifLe) : '—']
              : ['Entrée en vigueur', 'À la signature'],
          ],
        },
      ]}
      onFermer={onFermer}
    >
      {/*
        ⚠️ **Ce qui invalide un document se lit AVANT son contenu.** Un projet de contrat tiré sur
        la même feuille qu'un contrat conclu se présenterait comme un engagement — devant une banque,
        devant un employeur, devant qui voudra bien le croire.
      */}
      {signe ? null : (
        <div
          data-insecable
          style={{
            border: '2px solid #8A6D1F',
            background: '#FBF5E4',
            padding: '11px 15px',
            marginBottom: 18,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: IMPRESSION_TITRAGE,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#6B5417',
            }}
          >
            PROJET DE CONTRAT — NON SIGNÉ
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 10, lineHeight: 1.55, color: '#6B5417' }}>
            Ce texte est celui qui vous est proposé. Tant qu’il n’est pas signé depuis votre espace
            ULAMU, il n’engage ni vous ni la plateforme.
          </p>
        </div>
      )}

      {/*
        ⚠️ **La commission d'abord.** C'est la seule clause que le praticien relira, et celle qui
        décide de ce qu'il gagne. Enfouie dans le corps, elle serait introuvable sur une feuille
        dense. *Ce qu'on relit doit se trouver sans être cherché.*
      */}
      <div
        data-insecable
        style={{ border: `1px solid ${IMPRESSION_FILET}`, borderLeft: `3px solid ${IMPRESSION_ACCENT}`, padding: '12px 16px', marginBottom: 20 }}
      >
        <TitreSection>Ce que la plateforme retient</TitreSection>
        <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 11 }}>
          <span style={{ fontFamily: IMPRESSION_TITRAGE, fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {commissionPct} %
          </span>
          <span style={{ fontSize: 10, color: IMPRESSION_GRIS, lineHeight: 1.5 }}>
            sur les honoraires · gains retirables à tout moment, sans montant minimum
          </span>
        </p>
      </div>

      {/* Le préambule : le titre de l'acte et les parties. C'est ce qui ouvre un contrat. */}
      {preambule.length > 0 ? (
        <div data-insecable style={{ marginBottom: 18, fontSize: 10, lineHeight: 1.72, textAlign: 'justify' }}>
          {enParagraphes(preambule).map((p, i) => (
            <p
              key={i}
              style={{
                margin: i === 0 ? '0 0 10px' : '0 0 7px',
                fontFamily: i === 0 ? IMPRESSION_TITRAGE : undefined,
                fontSize: i === 0 ? 13 : undefined,
                fontWeight: i === 0 ? 700 : undefined,
                letterSpacing: i === 0 ? '0.02em' : undefined,
                textAlign: i === 0 ? 'left' : 'justify',
              }}
            >
              {p}
            </p>
          ))}
        </div>
      ) : null}

      {articles.map((a, i) => (
        <ArticleImprime key={i} titre={a.entete}>
          {enParagraphes(a.alineas).map((p, j) => (
            <p key={j} style={{ margin: j === 0 ? 0 : '6px 0 0' }}>
              {p}
            </p>
          ))}
        </ArticleImprime>
      ))}

      {cloture.length > 0 ? (
        <p style={{ margin: '4px 0 0', fontSize: 9.5, color: IMPRESSION_GRIS, fontStyle: 'italic' }}>{cloture.join(' ')}</p>
      ) : null}

      {/*
        L'EMPREINTE — ce qui relie cette feuille au texte accepté. Sans elle, une copie de contrat
        ne se distingue pas d'une version réécrite après coup. Elle figure sur les DEUX tirages :
        sur le projet, elle permet de vérifier que le texte signé plus tard est bien celui qu'on a
        lu — *une preuve ne sert pas qu'après coup, elle sert aussi à comparer avant.*
      */}
      <div data-insecable style={{ marginTop: 22, border: `1px solid ${IMPRESSION_FILET}`, padding: 14 }}>
        <TitreSection>{signe ? 'Preuve de signature' : 'Ce qui reste à faire'}</TitreSection>
        {signe ? (
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6 }}>
            Signé électroniquement par <strong>{signePar}</strong> le <strong>{dateHeureFr(signeLe)}</strong>, par
            mot de passe et code à usage unique.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6 }}>
            Ce texte n’est pas signé. La signature se fait depuis votre espace ULAMU, à la page
            « Ma vérification », par mot de passe et code à usage unique.
          </p>
        )}
        <p style={{ margin: '8px 0 0', fontFamily: IMPRESSION_TITRAGE, fontSize: 8, color: IMPRESSION_GRIS, letterSpacing: '0.04em' }}>
          {signe
            ? 'EMPREINTE DU TEXTE SIGNÉ (SHA-256) — ELLE CHANGE AU MOINDRE CARACTÈRE MODIFIÉ'
            : 'EMPREINTE DU TEXTE PROPOSÉ (SHA-256) — ELLE CHANGE AU MOINDRE CARACTÈRE MODIFIÉ'}
        </p>
        <p style={{ margin: '3px 0 0', fontFamily: IMPRESSION_CHIFFRES, fontSize: 9, wordBreak: 'break-all', letterSpacing: '0.02em' }}>
          {bodyHash}
        </p>
      </div>
    </FeuilleImpression>
  )
}

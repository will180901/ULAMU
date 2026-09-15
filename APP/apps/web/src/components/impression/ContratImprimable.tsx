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
 * pas d'un caractère. *Lire le même texte dans une autre police ne le réécrit pas ; réunir deux
 * lignes qu'un retour forcé avait séparées non plus.*
 *
 * ⚠️ **Et c'est exactement la limite à ne pas franchir.** Le texte est scellé par une empreinte :
 * ajouter, retirer ou déplacer un seul mot le trahirait. Le filet ne vérifie donc plus « aucun
 * `replace` » — il vérifie ce qui compte vraiment : **que la suite des mots rendus soit identique,
 * mot pour mot, à celle du texte signé.**
 *
 * ── Ce qu'il porte, et que le `.txt` ne portait pas ───────────────────────────────────────────
 *
 * 📌 **L'empreinte entière** — une empreinte tronquée ne prouve rien.
 * 📌 **La date et l'heure de signature**, et le nom du signataire.
 * 📌 **La commission en tête** : la seule clause que le praticien relira. *Ce qu'on relit doit se
 * trouver sans être cherché.*
 */
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

interface Article {
  /**
   * La ligne d'en-tête, **telle quelle** — « ARTICLE 1 — OBJET », capitales comprises.
   *
   * ⚠️ Le premier jet la recomposait en « Article 1 » + « OBJET ». C'est une transformation de
   * CASSE sur un texte scellé : le mot « ARTICLE » devenait « Article ». *Une empreinte ne fait pas
   * la différence entre une faute de frappe et une jolie mise en forme : elle ne voit que des
   * octets qui ont changé.* On met en page ce qui se présente, on ne réécrit pas ce qui se lit.
   */
  entete: string
  alineas: string[]
}

/**
 * Découpe le texte signé en préambule, articles et clôture.
 *
 * ⚠️ **Rien n'est retiré.** Ce qui n'entre dans aucun article reste dans le préambule ou la
 * clôture : *un analyseur qui jette ce qu'il ne reconnaît pas fait disparaître des clauses.*
 *
 * Les deux modèles de rédaction sont couverts — « ARTICLE 1 — OBJET » (2026-09) et
 * « Article 1 — Objet » (origine) —, car un contrat d'archive doit rester présentable.
 */
export function decouperContrat(texte: string): { preambule: string[]; articles: Article[]; cloture: string[] } {
  const lignes = texte.split('\n')
  const preambule: string[] = []
  const articles: Article[] = []
  const cloture: string[] = []

  const enTete = /^(ARTICLE|Article)\s+(\d+)\s*[—-]\s*(.+)$/
  let courant: Article | null = null

  for (const ligne of lignes) {
    if (enTete.test(ligne.trim())) {
      courant = { entete: ligne.trim(), alineas: [] }
      articles.push(courant)
      continue
    }
    if (ligne.trim() === '') {
      // Une ligne vide ferme l'alinéa en cours sans fermer l'article : l'article suivant a son titre.
      if (courant) courant.alineas.push('')
      else if (preambule.length > 0) preambule.push('')
      continue
    }
    if (courant) courant.alineas.push(ligne.trim())
    else preambule.push(ligne.trim())
  }

  // La ligne de clôture (« Signataire : … ») appartient au dernier article par construction :
  // on la lui retire pour la rendre à part, en pied de texte.
  const dernier = articles.at(-1)
  if (dernier) {
    while (dernier.alineas.length > 0 && dernier.alineas.at(-1) === '') dernier.alineas.pop()
    const queue = dernier.alineas.at(-1)
    if (queue && /^Signataire\s*:/.test(queue)) {
      cloture.push(dernier.alineas.pop() as string)
      while (dernier.alineas.length > 0 && dernier.alineas.at(-1) === '') dernier.alineas.pop()
    }
  }

  return { preambule, articles, cloture }
}

/** Réunit les lignes d'un même alinéa — les lignes vides séparent les alinéas. */
function enParagraphes(alineas: string[]): string[] {
  const out: string[] = []
  let courant: string[] = []
  for (const l of alineas) {
    if (l === '') {
      if (courant.length > 0) out.push(courant.join(' '))
      courant = []
    } else courant.push(l)
  }
  if (courant.length > 0) out.push(courant.join(' '))
  return out
}

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

  return (
    <FeuilleImpression
      document="Contrat de partenariat"
      reference={`CTR-V${version}`}
      mention="ULAMU · Contrat signé électroniquement — l’empreinte ci-dessous en atteste"
      blocs={[
        {
          titre: 'Praticien partenaire',
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
        ne se distingue pas d'une version réécrite après coup.
      */}
      <div data-insecable style={{ marginTop: 22, border: `1px solid ${IMPRESSION_FILET}`, padding: 14 }}>
        <TitreSection>Preuve de signature</TitreSection>
        <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6 }}>
          Signé électroniquement par <strong>{signePar}</strong>
          {signeLe ? (
            <>
              {' '}
              le <strong>{dateHeureFr(signeLe)}</strong>
            </>
          ) : null}
          , par mot de passe et code à usage unique.
        </p>
        <p style={{ margin: '8px 0 0', fontFamily: IMPRESSION_TITRAGE, fontSize: 8, color: IMPRESSION_GRIS, letterSpacing: '0.04em' }}>
          EMPREINTE DU TEXTE SIGNÉ (SHA-256) — ELLE CHANGE AU MOINDRE CARACTÈRE MODIFIÉ
        </p>
        <p style={{ margin: '3px 0 0', fontFamily: IMPRESSION_CHIFFRES, fontSize: 9, wordBreak: 'break-all', letterSpacing: '0.02em' }}>
          {bodyHash}
        </p>
      </div>
    </FeuilleImpression>
  )
}

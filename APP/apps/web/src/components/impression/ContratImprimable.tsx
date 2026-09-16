/**
 * Le contrat de partenariat, sur papier — chantier 134, refondu au chantier 145 (16/09/2026).
 *
 * ── Pourquoi ce document ─────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Il se téléchargeait en `.txt`.** Un contrat signé électroniquement, livré en texte brut :
 * sans en-tête, sans date de signature visible, **sans l'empreinte qui prouve qu'il s'agit bien du
 * texte accepté** — et sans rien qui permette de le présenter à une banque ou à un tribunal.
 *
 * > **Un contrat qu'on ne peut pas présenter n'engage personne à vos yeux, même s'il vous engage
 * > en droit.**
 *
 * ── ⚠️ « Ça ressemble à du travail d'IA » — chantier 145, 16/09/2026 ──────────────────────────
 *
 * **Constat du porteur, et il avait raison.** Quatre choses trahissaient la machine :
 *
 * 📌 **Un chiffre en vitrine.** « CE QUE LA PLATEFORME RETIENT · 10 % » en 27 px dans un encadré :
 * *c'est un tableau de bord, pas un acte.* Retiré — la commission est à l'article 5, à sa place.
 *
 * 📌 **L'information dite deux fois.** Les cases « Praticien / Nom / Signé le » et « Contrat /
 * Version » répétaient ce que le préambule dit déjà en toutes lettres. *Un acte ne pose pas une
 * fiche technique au-dessus de son propre préambule.* Retirées.
 *
 * 📌 **Une référence de machine en haut à droite** — « CTR-V2 ». Descendue en pied.
 *
 * 📌 **Rien à la fin.** Un acte se termine par sa date et sa signature ; celui-ci se terminait sur
 * un encadré « Preuve de signature » posé au milieu de nulle part.
 *
 * ── ⚠️ Ce que je n'écris PAS, et pourquoi ────────────────────────────────────────────────────
 *
 * **Pas de « Fait à Brazzaville ».** La formule est celle d'un acte signé de la main, en un lieu.
 * Ici la signature est électronique : le praticien signe d'où il veut, et le siège d'ULAMU n'est
 * établi nulle part dans ce projet. *Écrire un lieu qu'on ne connaît pas sur un acte, c'est inventer
 * une mention que quelqu'un opposera un jour.* La clôture porte donc ce qui est vrai : le procédé et
 * la date.
 *
 * **Pas de case « Pour la Plateforme ».** Personne n'y appose rien — la plateforme émet le contrat,
 * le praticien le signe. *Une case de signature vide pour une partie qui ne signe pas fabrique une
 * apparence.*
 *
 * ── Ce que la mise en page fait au texte, et ce qu'elle NE lui fait pas ───────────────────────
 *
 * Le texte arrive en lignes coupées à largeur fixe. Rendues telles quelles, elles donnent un bloc en
 * escalier — *une page web imprimée, pas un acte.* Les lignes d'un même alinéa sont donc réunies en
 * paragraphes justifiés. C'est de la PRÉSENTATION : les mots, leur ordre et leur orthographe ne
 * changent pas d'un caractère, et le filet le vérifie **mot pour mot**.
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
  /**
   * ⚠️ **`commissionPct` a été RETIRÉ au chantier 145**, et son absence est la règle elle-même.
   *
   * Le taux était affiché hors du texte, en 27 px dans un encadré « ce que la plateforme retient ».
   * Le porteur l'a dit : *la rémunération doit rentrer dans des articles.* Elle y est — article 5.
   *
   * Ne plus RECEVOIR le taux est plus sûr que renoncer à l'afficher : *une donnée qu'un composant
   * ne reçoit pas est une donnée qu'il ne peut pas remettre en vitrine six mois plus tard.*
   */
  bodyHash: string
  corps: string
  signePar: string
  signeLe: string | null
  effectifLe: string | null
  onFermer: () => void
}

export function ContratImprimable({
  version,
  bodyHash,
  corps,
  signePar,
  signeLe,
  effectifLe,
  onFermer,
}: ContratImprimableProps) {
  const { preambule, articles, cloture } = decouperContrat(corps)
  const paragraphes = enParagraphes(preambule)
  const signe = signeLe !== null

  return (
    <FeuilleImpression
      document={signe ? 'Contrat de partenariat' : 'Projet de contrat'}
      reference={`CTR-V${version}`}
      /*
        ⚠️ Le filigrane marque CHAQUE page : *une page 2 photocopiée seule ne dit plus qu'elle vient
        d'un projet.* La mention encadrée, elle, s'adresse à qui lit la première.
      */
      filigrane={signe ? undefined : 'PROJET'}
      mention={
        signe
          ? 'ULAMU · Contrat signé électroniquement — l’empreinte en pied de contrat en atteste'
          : 'ULAMU · Projet de contrat — non signé, sans valeur d’engagement'
      }
      /*
        Aucune case d'identité : le préambule du contrat nomme déjà les parties, en toutes lettres.
        *Un acte ne pose pas une fiche technique au-dessus de son propre préambule.*
      */
      blocs={[]}
      onFermer={onFermer}
    >
      {/*
        ⚠️ **Ce qui invalide un document se lit AVANT son contenu.** Un projet tiré sur la même
        feuille qu'un contrat conclu se présenterait comme un engagement — devant une banque, devant
        qui voudra bien le croire.
      */}
      {signe ? null : (
        <div data-insecable style={{ border: `1px solid ${IMPRESSION_ACCENT}`, padding: '10px 14px', marginBottom: 20 }}>
          <p
            style={{
              margin: 0,
              fontFamily: IMPRESSION_TITRAGE,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: IMPRESSION_ACCENT,
            }}
          >
            Projet — non signé
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 9.5, lineHeight: 1.55, color: IMPRESSION_GRIS }}>
            Ce texte est celui qui est proposé au praticien. Tant qu’il n’est pas signé depuis son
            espace ULAMU, il n’engage ni lui ni la plateforme.
          </p>
        </div>
      )}

      {/*
        Le préambule ouvre l'acte : son titre centré, puis les parties, puis la formule qui articule
        l'un à l'autre. C'est la forme de tout acte écrit.
      */}
      {paragraphes.length > 0 ? (
        <div data-insecable style={{ marginBottom: 20 }}>
          <p
            data-titre
            style={{
              margin: '0 0 16px',
              fontFamily: IMPRESSION_TITRAGE,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            {paragraphes[0]}
          </p>
          {paragraphes.slice(1).map((p, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : '7px 0 0', fontSize: 10, lineHeight: 1.72, textAlign: 'justify' }}>
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
        <p style={{ margin: '10px 0 0', fontSize: 10, lineHeight: 1.72, textAlign: 'justify' }}>{cloture.join(' ')}</p>
      ) : null}

      {/*
        ── LA CLÔTURE ────────────────────────────────────────────────────────────────────────────

        Un acte se termine par sa date et sa signature. Celui-ci se terminait sur un encadré posé au
        milieu de nulle part — le porteur l'a relevé : « à la fin du document on doit voir la date à
        laquelle le contrat a été signé ».

        📌 L'empreinte reste ici, ENTIÈRE : *une empreinte tronquée ne prouve rien.* Elle figure aussi
        sur un projet — *une preuve ne sert pas qu'après coup, elle sert aussi à comparer avant.*
      */}
      <div data-insecable style={{ marginTop: 26, borderTop: `1px solid ${IMPRESSION_FILET}`, paddingTop: 14 }}>
        <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.6 }}>
          {signe ? (
            <>
              Contrat conclu par <strong>signature électronique</strong> le{' '}
              <strong>{dateHeureFr(signeLe)}</strong>
              {effectifLe && effectifLe !== signeLe ? <> , en vigueur depuis le {dateHeureFr(effectifLe)}</> : null}.
            </>
          ) : (
            <>Ce contrat n’est pas encore signé. Il prendra effet à sa signature électronique.</>
          )}
        </p>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 240 }}>
            <p
              style={{
                margin: 0,
                fontFamily: IMPRESSION_TITRAGE,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: IMPRESSION_ACCENT,
              }}
            >
              Le praticien
            </p>
            <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 700 }}>{signePar}</p>
            <p style={{ margin: '3px 0 0', fontSize: 9.5, lineHeight: 1.5, color: IMPRESSION_GRIS }}>
              {signe
                ? 'Signé par mot de passe et code à usage unique.'
                : 'Signature attendue, par mot de passe et code à usage unique.'}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <TitreSection>{signe ? 'Empreinte du texte signé' : 'Empreinte du texte proposé'}</TitreSection>
          <p style={{ margin: 0, fontSize: 9, lineHeight: 1.5, color: IMPRESSION_GRIS }}>
            Calculée en SHA-256. Elle change au moindre caractère modifié : elle permet de vérifier
            que ce document porte bien le texte {signe ? 'qui a été signé' : 'qui sera signé'}.
          </p>
          <p style={{ margin: '4px 0 0', fontFamily: IMPRESSION_CHIFFRES, fontSize: 9, wordBreak: 'break-all', letterSpacing: '0.02em' }}>
            {bodyHash}
          </p>
        </div>
      </div>
    </FeuilleImpression>
  )
}

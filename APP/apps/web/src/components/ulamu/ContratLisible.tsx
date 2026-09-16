/**
 * Le contrat de partenariat, à l'écran — chantier 135, refondu au chantier 144 (16/09/2026).
 *
 * ── Ce qu'on demandait de signer, et comment on le montrait ───────────────────────────────────
 *
 * ⚠️ Le texte s'affichait dans un `<pre>` gris de **11 px**, replié derrière un bouton — et la
 * signature s'activait **que la boîte ait été ouverte ou non**. On pouvait signer onze articles sans
 * en avoir vu un seul (chantier 135).
 *
 * ⚠️ **Puis l'inverse a posé son propre problème** : tout déplié, la carte faisait **2 230 px** de
 * haut. « Tellement ça défile, ce n'est pas l'idéal » — le porteur, 16/09.
 *
 * ── Pourquoi une zone de lecture, et PAS des articles pliables ────────────────────────────────
 *
 * Replier les onze articles réglerait le défilement. Mais cela permettrait de cocher « lu et
 * approuvé » sans avoir ouvert un seul tiroir — c'est-à-dire exactement la boîte repliée que le
 * chantier 135 avait retirée, sous un autre nom.
 *
 * > **Un contrat qu'on replie pour le confort du lecteur redevient un contrat qu'on ne lit pas.**
 *
 * 📌 **Une zone à hauteur fixe, avec son propre défilement**, règle les deux d'un seul geste : la
 * page ne défile plus sans fin, et **arriver en bas devient la preuve de lecture** qui déverrouille
 * la mention. *Le confort et la preuve tirent enfin dans le même sens.*
 *
 * 📌 **Une barre de progression et « Article 5 sur 11 »**, à la place du sommaire que le porteur a
 * écarté : *un sommaire dit où l'on POURRAIT aller, une position dit où l'on EST* — et c'est la
 * seconde qui manque quand on lit un texte long dans une fenêtre courte.
 *
 * ── ⚠️ Pourquoi PAS de serif ici, alors que la feuille imprimée en a une ─────────────────────
 *
 * **CG-02 §01 ferme le référentiel à trois familles** — « aucune police utilisée dans l'interface ne
 * doit être hors de ce référentiel ». La serif est une police de PAPIER ; elle ne monte pas dans
 * l'interface. *La rigueur d'un acte ne tient pas à sa police : elle tient à ses articles numérotés,
 * à ses paragraphes justifiés et à l'air entre ses lignes.*
 *
 * ── Ce que ce composant n'a PAS le droit de faire ─────────────────────────────────────────────
 *
 * ⚠️ Le texte est scellé par une empreinte. Le découpage vient de `lib/contrat.ts`, partagé avec la
 * feuille imprimée, et le filet vérifie que **la suite des mots rendus est identique, mot pour mot,
 * à celle du texte signé**. Mettre en page : oui. Réécrire, même une majuscule : jamais.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { articleCourant, decouperContrat, enParagraphes } from '@/lib/contrat'
import { Progress } from '@/components/ui/progress'

/** Ce qu'il reste à parcourir pour qu'on considère le texte lu, en pixels. */
const RESTE_TOLERE = 8

export interface ContratLisibleProps {
  corps: string
  /**
   * Appelé quand le lecteur a atteint le bas du texte.
   *
   * ⚠️ Appelé AUSSI lorsque le texte tient sans défilement : *exiger un défilement impossible
   * enfermerait dehors celui qui a le plus grand écran.*
   */
  onLectureTerminee?: () => void
}

export function ContratLisible({ corps, onLectureTerminee }: ContratLisibleProps) {
  const { preambule, articles, cloture } = decouperContrat(corps)
  const paragraphesPreambule = enParagraphes(preambule)
  const zone = useRef<HTMLDivElement>(null)
  const [avance, setAvance] = useState(0)
  const [courant, setCourant] = useState(0)

  const suivre = useCallback(() => {
    const z = zone.current
    if (!z) return
    const aParcourir = z.scrollHeight - z.clientHeight
    // Un texte qui tient sans défilement est lu dès qu'il s'affiche.
    const part = aParcourir <= RESTE_TOLERE ? 1 : Math.min(1, z.scrollTop / aParcourir)
    setAvance(part)

    const debuts = [...z.querySelectorAll<HTMLElement>('[data-article]')].map((s) => s.offsetTop)
    setCourant(articleCourant(debuts, z.scrollTop, z.clientHeight))

    if (z.scrollTop + z.clientHeight >= z.scrollHeight - RESTE_TOLERE) onLectureTerminee?.()
  }, [onLectureTerminee])

  // Au premier rendu : un contrat court est déjà lu, et la position doit être juste avant tout geste.
  useEffect(() => {
    suivre()
  }, [suivre, corps])

  return (
    <div className="flex flex-col gap-2">
      {/*
        La progression remplace le sommaire : *un sommaire dit où l'on pourrait aller, une position
        dit où l'on est.* Elle est muette pour les lecteurs d'écran — le texte à côté, lui, parle.
      */}
      <div className="flex items-center gap-3">
        <Progress value={Math.round(avance * 100)} className="h-1 min-w-0 flex-1" aria-hidden="true" />
        <span className="ul-aide shrink-0 tabular-nums" role="status">
          {articles.length > 0 && courant > 0
            ? `Article ${courant} sur ${articles.length}`
            : `${Math.round(avance * 100)} % lu`}
        </span>
      </div>

      <div
        ref={zone}
        onScroll={suivre}
        lang="fr"
        tabIndex={0}
        role="region"
        aria-label="Texte du contrat"
        className="relative flex max-h-[58vh] flex-col gap-4 overflow-y-auto rounded-md border border-border bg-card px-4 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ap-600)] sm:px-6"
      >
        {/*
          Le préambule ouvre l'acte : son titre, puis les parties. La première ligne est le titre du
          contrat — elle se lit comme un titre, pas comme une phrase de plus.
        */}
        {paragraphesPreambule.length > 0 ? (
          <header className="flex flex-col gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-[16px] leading-[1.3] font-bold tracking-[-0.01em] text-foreground">
              {paragraphesPreambule[0]}
            </h3>
            {paragraphesPreambule.slice(1).map((p, i) => (
              <p key={i} className="text-justify text-[13px] leading-[1.75] hyphens-auto text-[var(--texte-secondaire)]">
                {p}
              </p>
            ))}
          </header>
        ) : null}

        {articles.map((a, i) => (
          <section key={i} data-article={i + 1}>
            {/*
              ⚠️ L'intitulé est rendu **tel qu'il est écrit dans le texte signé** — capitales
              comprises. Le styliser ne touche à aucun caractère ; le recomposer, si.
            */}
            <h4 className="font-[family-name:var(--font-display)] text-[13px] leading-[1.35] font-bold tracking-[0.01em] text-[var(--ap-700)]">
              {a.entete}
            </h4>
            <div className="mt-1 flex flex-col gap-1.5">
              {enParagraphes(a.alineas).map((p, j) => (
                <p key={j} className="text-justify text-[13px] leading-[1.75] hyphens-auto text-[var(--texte-secondaire)]">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        {cloture.length > 0 ? (
          <p className="border-t border-border pt-3 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)] italic">
            {cloture.join(' ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

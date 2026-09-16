/**
 * Le contrat de partenariat, à l'écran — chantier 135, 16/09/2026 (M03, CU-03-03).
 *
 * ── Ce qu'on demandait de signer, et comment on le montrait ───────────────────────────────────
 *
 * ⚠️ Le texte s'affichait dans un `<pre>` gris de **11 px**, haut de **288 px**, qu'il fallait
 * dérouler — et le bouton de signature s'activait **que la boîte ait été ouverte ou non**. On
 * pouvait donc signer un contrat de onze articles sans l'avoir vu une seule fois.
 *
 * > **Un texte qu'on présente en petit, en gris et replié n'est pas présenté : il est rangé.**
 *
 * 📌 **Quand le contrat n'est pas signé, il est DÉPLOYÉ**, et la signature se trouve en bas de ce
 * qu'on vient de lire. Pas de case « j'ai lu », pas de détection de défilement : *la preuve qu'on a
 * lu, c'est qu'on a dû passer devant.* Une fois signé, il se replie — *un contrat qu'on doit signer
 * se déplie, un contrat signé se range.*
 *
 * ── ⚠️ Pourquoi PAS de serif ici, alors que la feuille imprimée en a une ─────────────────────
 *
 * La demande du porteur (« le texte doit avoir une police différente ») portait sur le modèle
 * imprimé, et elle y est tenue : Georgia sur le papier. À l'écran, **CG-02 §01 ferme le référentiel
 * à trois familles** — « aucune police utilisée dans l'interface ne doit être hors de ce
 * référentiel ». La serif est une police de PAPIER ; elle ne monte pas dans l'interface.
 *
 * *La rigueur d'un acte ne tient pas à sa police : elle tient à ses articles numérotés, à son
 * sommaire, à ses paragraphes justifiés et à l'air entre ses lignes.* C'est ce qui est fait ici,
 * avec les trois familles de la charte.
 *
 * ── Ce que ce composant n'a PAS le droit de faire ─────────────────────────────────────────────
 *
 * ⚠️ Le texte est scellé par une empreinte. Le découpage vient de `lib/contrat.ts`, partagé avec la
 * feuille imprimée, et le filet vérifie que **la suite des mots rendus est identique, mot pour mot,
 * à celle du texte signé**. Mettre en page : oui. Réécrire, même une majuscule : jamais.
 */
import { decouperContrat, enParagraphes } from '@/lib/contrat'

/**
 * Le sommaire n'apparaît qu'à partir de quatre articles.
 *
 * *Un sommaire de deux lignes est du décor : il occupe la place de ce qu'il devrait aider à
 * trouver.* Le contrat 2026-09 en compte onze — là, il sert.
 */
const SOMMAIRE_A_PARTIR_DE = 4

export function ContratLisible({ corps }: { corps: string }) {
  const { preambule, articles, cloture } = decouperContrat(corps)
  const paragraphesPreambule = enParagraphes(preambule)

  return (
    <div lang="fr" className="flex flex-col gap-4 rounded-md border border-border bg-card px-4 py-5 sm:px-6 sm:py-6">
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

      {/*
        📌 **Le sommaire.** Onze articles sans table des matières se parcourent en faisant défiler au
        jugé. *Ce qu'on relira — la commission, la résiliation, la responsabilité — doit se trouver
        sans être cherché.* Les intitulés y figurent TELS QU'ILS SONT ÉCRITS dans le texte scellé.
      */}
      {articles.length >= SOMMAIRE_A_PARTIR_DE ? (
        <nav aria-label="Sommaire du contrat" className="rounded-md border border-border bg-secondary p-3">
          <p className="ul-surtitre mb-2">Sommaire</p>
          <ol className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {articles.map((a, i) => (
              <li key={i}>
                <a
                  href={`#contrat-article-${i + 1}`}
                  className="text-[12px] leading-[1.45] text-[var(--texte-secondaire)] underline-offset-2 hover:text-[var(--ap-700)] hover:underline"
                >
                  {a.entete}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4">
        {articles.map((a, i) => (
          <section key={i} id={`contrat-article-${i + 1}`} className="scroll-mt-20">
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
      </div>

      {cloture.length > 0 ? (
        <p className="border-t border-border pt-3 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)] italic">
          {cloture.join(' ')}
        </p>
      ) : null}
    </div>
  )
}

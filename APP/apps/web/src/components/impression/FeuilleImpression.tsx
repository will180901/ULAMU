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
import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

/**
 * Une suite de lignes qui partagent un en-tête — chantier 143, 16/09/2026.
 *
 * ── ⚠️ Le trou que le porteur a désigné ───────────────────────────────────────
 *
 * « Est-ce réellement dynamique pour tout type de document ? » — la réponse était **non**. La
 * répartition se faisait au bloc, et le tableau des médicaments d'une ordonnance était **un seul
 * bloc** : quinze lignes dépassaient une page et se faisaient couper en silence.
 *
 * 📌 Un groupe donne à la feuille le droit de couper **entre deux lignes**, et l'obligation de
 * **réimprimer l'en-tête** en haut de la page où le groupe reprend : *une colonne de chiffres sans
 * son titre n'est plus une colonne, c'est une liste de nombres.*
 *
 * ⚠️ **C'est un marqueur, pas un composant** : il ne rend jamais rien lui-même. La feuille le lit
 * parmi ses enfants et décide. *Un composant qui se rendrait tout seul empêcherait justement ce
 * qu'on lui demande : être coupé.*
 */
export interface GroupeImprimableProps {
  /** L'en-tête, réimprimé en haut de chaque page où le groupe se poursuit. */
  entete?: React.ReactNode
  /** Les lignes — chacune se pagine indépendamment. */
  lignes: React.ReactNode[]
  /** Comment assembler en-tête et lignes : un `<table>`, une `<ul>`… */
  contenant: (entete: React.ReactNode | null, lignes: React.ReactNode[]) => React.ReactNode
}

export function GroupeImprimable(_props: GroupeImprimableProps): null {
  return null
}

/** Un bloc à paginer : soit un enfant ordinaire, soit une ligne appartenant à un groupe. */
interface BlocAPaginer {
  noeud: React.ReactNode
  groupe: number | null
}

export interface FeuilleImpressionProps {
  /** Le nom du document, en haut à droite : « Ordonnance », « Reçu de paiement »… */
  document: string
  /** La référence qui permet de retrouver la pièce — en en-tête et en pied. */
  reference: string
  /** Deux blocs d'identité côte à côte (patient / soignant, payeur / opération…). */
  blocs: Array<{ titre: string; lignes: Array<[string, string]> }>
  /** Ce que le pied rappelle, en plus de la référence. */
  mention?: string
  /**
   * Un filigrane en travers de CHAQUE page — « PROJET » sur un contrat non signé.
   *
   * 📌 Sur chaque page, et pas seulement la première : *une page 2 photocopiée seule ne dit plus
   * d'où elle vient.* C'est ainsi qu'un acte non signé se marque depuis toujours.
   *
   * 📌 **La marque ULAMU accompagne le mot** — demande du porteur, chantier 147. Un filigrane
   * porte deux choses : *ce que vaut la feuille* (un projet) et *de qui elle vient*. Le mot seul
   * disait la première ; la marque dit la seconde, et c'est elle qu'on reconnaît de loin sur une
   * photocopie.
   */
  filigrane?: string
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

export function FeuilleImpression({
  document: nomDocument,
  reference,
  blocs,
  mention,
  filigrane,
  children,
  onFermer,
}: FeuilleImpressionProps) {
  const idRacine = useRef(`feuille-${Math.random().toString(36).slice(2, 9)}`).current
  const refMesure = useRef<HTMLDivElement>(null)
  /*
    Les enfants sont dépliés en BLOCS : un groupe donne autant de blocs que de lignes, et la feuille
    retrouve ensuite son en-tête pour le réimprimer. *Ce qu'on veut pouvoir couper doit se
    présenter déjà coupé à celui qui compte.*
  */
  const { blocs: aPaginer, groupes } = useMemo(() => {
    const blocs: BlocAPaginer[] = []
    const groupes: GroupeImprimableProps[] = []
    for (const enfant of Children.toArray(children)) {
      if (isValidElement(enfant) && enfant.type === GroupeImprimable) {
        const props = enfant.props as GroupeImprimableProps
        const g = groupes.length
        groupes.push(props)
        for (const ligne of props.lignes) blocs.push({ noeud: ligne, groupe: g })
        continue
      }
      blocs.push({ noeud: enfant, groupe: null })
    }
    return { blocs, groupes }
  }, [children])
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
  }, [aPaginer])

  useLayoutEffect(() => {
    if (pages !== null) return
    const c = refMesure.current
    const habillage = c?.querySelector('[data-mesure-habillage]') ?? null
    const mesures = c ? [...c.querySelectorAll('[data-mesure-bloc]')] : []
    const utile = habillage ? HAUTEUR - habillage.getBoundingClientRect().height - SECURITE : 0

    // Ce que coûte l'en-tête de chaque groupe, à payer à chaque page où il repart.
    const hauteursEntetes: Record<number, number> = {}
    for (const e of c?.querySelectorAll('[data-mesure-entete]') ?? []) {
      hauteursEntetes[Number(e.getAttribute('data-mesure-entete'))] = e.getBoundingClientRect().height
    }

    /*
      ⚠️ **Sans mesure exploitable, tout tient sur une feuille — jamais rien.** jsdom rend toutes
      les hauteurs à zéro, et un navigateur peut refuser une mesure sur un onglet en arrière-plan.
      *Un aperçu vide par prudence est un aperçu cassé : il vaut mieux une page trop longue qu'une
      page blanche.*
    */
    if (!habillage || utile <= 0 || mesures.length !== aPaginer.length) {
      setPages([aPaginer.map((_, i) => i)])
      return
    }
    setPages(
      repartirEnPages(
        mesures.map((e) => e.getBoundingClientRect().height),
        utile,
        aPaginer.map((b) => b.groupe),
        hauteursEntetes,
      ),
    )
  }, [pages, aPaginer])

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

  /*
    Les lignes consécutives d'un même groupe sont remises dans leur contenant, avec l'en-tête.
    C'est ici que le tableau se reforme, page par page.
  */
  const contenuDePage = (indices: number[]): React.ReactNode[] => {
    const out: React.ReactNode[] = []
    let i = 0
    while (i < indices.length) {
      const g = aPaginer[indices[i]].groupe
      if (g === null) {
        out.push(<Fragment key={indices[i]}>{aPaginer[indices[i]].noeud}</Fragment>)
        i += 1
        continue
      }
      const debut = indices[i]
      const lignes: React.ReactNode[] = []
      while (i < indices.length && aPaginer[indices[i]].groupe === g) {
        lignes.push(aPaginer[indices[i]].noeud)
        i += 1
      }
      out.push(<Fragment key={`g${g}-${debut}`}>{groupes[g].contenant(groupes[g].entete ?? null, lignes)}</Fragment>)
    }
    return out
  }

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
          {/*
            ⚠️ **La référence a quitté l'en-tête** — chantier 145. « CTR-V2 » en haut à droite d'un
            contrat, c'est un numéro de série à la place d'un titre : *un acte ne s'ouvre pas sur sa
            référence de machine.* Elle est en pied, où l'on va la chercher quand on en a besoin.
          */}
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
        position: 'relative',
        boxShadow: mesure ? undefined : '0 10px 40px rgba(15,23,42,0.22)',
      }}
    >
      {/*
        Le filigrane, DERRIÈRE le texte et sans le gêner : très pâle, non sélectionnable, invisible
        pour les lecteurs d'écran — la mention encadrée en tête, elle, leur parle.
      */}
      {filigrane && !mesure ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            transform: 'rotate(-32deg)',
            /*
              L'opacité est portée par le CONTENANT, pas par une couleur : la marque et le mot pâlissent
              ensemble, du même degré. *Deux pâleurs réglées séparément finissent par se désaccorder.*
            */
            opacity: 0.08,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <LogoMark size={150} />
          <span
            style={{
              fontFamily: TITRAGE,
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: '0.18em',
              color: ACCENT,
              whiteSpace: 'nowrap',
            }}
          >
            {filigrane}
          </span>
        </span>
      ) : null}
      {enTete}
      {identite}
      {/*
        `minHeight: 0` : un élément flexible refuse par défaut de descendre sous la hauteur de son
        contenu. Sans cela, un corps trop plein POUSSE la feuille au lieu d'être contenu par elle —
        et le débordement se produit en silence, sous le `overflow: hidden` de la page.
      */}
      <div style={{ flex: mesure ? 'none' : 1, minHeight: 0, position: 'relative', padding: `20px ${MARGE}px 26px` }}>
        {contenu}
      </div>
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
              {feuille(contenuDePage(indices), i + 1, (feuilles ?? []).length)}
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
            {aPaginer.map((b, i) => (
              /*
                ⚠️ **`flow-root`, et ce n'est pas un détail de style** — chantier 142, 16/09/2026.

                `getBoundingClientRect()` rend la hauteur d'un élément SANS ses marges. Or un article
                porte 13 px de marge basse, et c'est de la place sur la feuille comme le reste.
                Mesuré en ligne le 16/09 : la répartition budgétait 185 mm de blocs, ces blocs en
                occupaient **224** — et **32 mm de texte étaient coupés en bas de la première page**,
                sans que rien ne le signale.

                > **Mesurer un bloc sans l'espace qu'il pousse devant lui, c'est mesurer un meuble
                > sans compter qu'on doit ouvrir sa porte.**

                `display: flow-root` enferme les marges de l'enfant dans ce conteneur : sa hauteur
                devient enfin la place réellement occupée.
              */
              <div key={i} data-mesure-bloc="" style={{ display: 'flow-root' }}>
                {b.groupe === null ? b.noeud : groupes[b.groupe].contenant(null, [b.noeud])}
              </div>
            ))}
            {/*
              L'en-tête de chaque groupe est mesuré à part : c'est ce qu'il coûtera à chaque fois que
              le groupe reprendra en haut d'une page.
            */}
            {groupes.map((g, i) => (
              <div key={`entete-${i}`} data-mesure-entete={i} style={{ display: 'flow-root' }}>
                {g.contenant(g.entete ?? null, [])}
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

/**
 * La courbe des six derniers mois — chantier 35, 03/09/2026.
 *
 * ── Pourquoi elle remplace des barres ─────────────────────────────────────────────────────────
 *
 * La maquette B2 montre une **courbe avec aire dégradée** ; l'écran affichait des **barres**. Le
 * comparatif du chantier 9 avait pourtant inscrit ce bloc « conforme » — il ne l'était pas, et
 * personne ne l'a relu depuis. La règle du projet est explicite : *la maquette décide de la forme,
 * le cahier décide des faits*. Ici la forme n'avait pas été suivie.
 *
 * Ce n'est pas qu'esthétique. Une courbe dit une **évolution** — la pente se lit d'un regard ; des
 * barres disent des **quantités**, qu'on compare une à une. Sur six mois d'activité, c'est bien
 * l'évolution qu'un soignant regarde.
 *
 * ── Ce qui est repris de la maquette, au pixel ────────────────────────────────────────────────
 *
 * Relevé dans `B2 - Tableau de bord.dc.html` : `viewBox="0 0 620 190"`, tracé de x=30 à x=614,
 * base à y=168 et sommet à y=6, ligne de 2 px, points de rayon 2,4, aire en dégradé de 0,18 à 0.
 * Les intitulés de mois en Inter 10 px sous la base, l'échelle en JetBrains Mono 9 px à gauche.
 *
 * ── La seule adaptation, et elle est nécessaire ───────────────────────────────────────────────
 *
 * La maquette écrit sa couleur en dur (`#2756A6`) : elle a un fichier par thème, elle peut se le
 * permettre. **L'application n'a qu'un écran pour les deux thèmes** — la couleur vient donc de
 * `--ap-400`, comme les barres qu'elle remplace. Sans cela, la courbe resterait bleu foncé sur fond
 * sombre.
 *
 * ── L'échelle, qui est le seul endroit où l'on pourrait mentir ────────────────────────────────
 *
 * La maquette gradue 0 · 25 · 50 · 75 · 100 parce que ses données de démonstration vont jusqu'à 92.
 * Recopier ces graduations écraserait toute activité réelle en bas du cadre : un soignant à trois
 * consultations verrait une courbe collée au sol.
 *
 * L'échelle est donc **calculée sur les données**, par `echelleMois` — qui vit dans
 * `lib/echelle-graphique.ts` et se teste seule. C'est la seule règle de ce dessin : le tracé se
 * relit, une échelle se démontre, et une échelle fausse déforme la pente — le seul mensonge qu'un
 * graphique puisse commettre en silence.
 */

import { echelleMois } from '@/lib/echelle-graphique'

/** Le point d'un mois, tel que le serveur le sert. */
export interface PointMois {
  month: string
  sessions: number
}

/** Les graduations, du bas vers le haut — toutes entières, par construction. */
function graduations({ sommet, pas }: { sommet: number; pas: number }): number[] {
  const valeurs: number[] = []
  for (let v = 0; v <= sommet; v += pas) valeurs.push(v)
  return valeurs
}

const X0 = 30
const X1 = 614
const Y_BASE = 168
const Y_SOMMET = 6

/** « 2026-04 » → « avr. » — trois lettres, comme la maquette. */
function nomDuMois(iso: string): string {
  const [a, m] = iso.split('-')
  const d = new Date(Number(a), Number(m) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'short' })
}

export function CourbeMois({ mois }: { mois: PointMois[] }) {
  if (mois.length === 0) return null

  const echelle = echelleMois(Math.max(...mois.map((m) => m.sessions)))
  const { sommet } = echelle
  const pasX = mois.length > 1 ? (X1 - X0) / (mois.length - 1) : 0
  const y = (v: number) => Y_BASE - (v / sommet) * (Y_BASE - Y_SOMMET)
  const points = mois.map((m, i) => ({ x: X0 + i * pasX, y: y(m.sessions), m }))
  const trace = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="p-4">
      <svg
        viewBox={`0 0 620 190`}
        style={{ width: '100%', height: 190, display: 'block' }}
        /*
          `aria-hidden` et non `role="img"` avec une étiquette : le tableau `sr-only` juste à côté
          donne DÉJÀ chaque valeur, mois par mois. Annoncer en plus « Évolution » ferait entendre
          une image sans contenu avant un tableau qui, lui, dit tout — deux annonces pour une seule
          information, dont la première n'apprend rien.
        */
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ul-aire-mois" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ap-400)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--ap-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {graduations(echelle).map((v) => (
          <g key={v}>
            {/* `--bordure-legere` : la même que `border-border` de Tailwind, à quoi se réfèrent
                toutes les séparations de l'application. Les lignes de fond d'un graphique ne sont
                pas une décoration à part, ce sont des séparations comme les autres. */}
            <line x1={X0} y1={y(v)} x2={X1} y2={y(v)} stroke="var(--bordure-legere)" strokeWidth="1" opacity="0.6" />
            <text
              x={X0 - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontFamily="var(--font-mono), monospace"
              fontSize="9"
              fill="var(--texte-tertiaire)"
            >
              {v}
            </text>
          </g>
        ))}

        <polygon points={`${X0},${Y_BASE} ${trace} ${X1},${Y_BASE}`} fill="url(#ul-aire-mois)" />
        <polyline points={trace} fill="none" stroke="var(--ap-400)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.m.month} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.4" fill="var(--ap-400)" />
        ))}

        {points.map((p) => (
          <text
            key={`n-${p.m.month}`}
            x={p.x.toFixed(1)}
            y="185"
            textAnchor="middle"
            fontFamily="var(--font-sans), sans-serif"
            fontSize="10"
            fill="var(--texte-tertiaire)"
          >
            {nomDuMois(p.m.month)}
          </text>
        ))}
      </svg>
    </div>
  )
}

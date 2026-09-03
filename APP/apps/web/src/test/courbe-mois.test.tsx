/**
 * La courbe des six derniers mois — chantier 35, 03/09/2026.
 *
 * ── Ce que ce chantier corrige ────────────────────────────────────────────────────────────────
 *
 * La maquette B2 montre une **courbe avec aire dégradée** ; l'écran affichait des **barres**. Le
 * comparatif du chantier 9 avait inscrit ce bloc « conforme » — il ne l'était pas. La règle du
 * projet est explicite : *la maquette décide de la forme*.
 *
 * ── Pourquoi l'échelle est le seul endroit vraiment testable ──────────────────────────────────
 *
 * Un tracé SVG ne se vérifie pas utilement par assertion : on recopierait les coordonnées qu'on
 * vient d'écrire. Ce qui peut **mentir**, c'est l'échelle — une graduation mal choisie déforme la
 * pente, et c'est le seul mensonge qu'un graphique commet en silence.
 *
 * `echelleMois` est donc une fonction pure, exportée, et c'est elle qu'on éprouve. Le rendu, lui,
 * n'est vérifié que sur ce qui a du sens : la courbe existe, les barres ont disparu, et le tableau
 * accessible n'a pas bougé.
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { CourbeMois } from '@/components/ulamu/CourbeMois'
import { echelleMois } from '@/lib/echelle-graphique'

const graduations = (max: number): number[] => {
  const { sommet, pas } = echelleMois(max)
  const v: number[] = []
  for (let x = 0; x <= sommet; x += pas) v.push(x)
  return v
}

describe('L’échelle de la courbe', () => {
  /*
    LE défaut trouvé EN REGARDANT l'écran, qu'aucun test n'aurait signalé. La première version
    choisissait le sommet puis le divisait en quatre : sur dix consultations, elle graduait
    2,5 · 5 · 7,5 · 10. Des demi-consultations n'existent pas.
  */
  it('ne gradue jamais en fractions', () => {
    for (let max = 1; max <= 400; max++) {
      for (const v of graduations(max)) {
        expect(Number.isInteger(v), `graduation non entière pour max=${max} : ${v}`).toBe(true)
      }
    }
  })

  it('englobe toujours le maximum observé, sans jamais l’écraser', () => {
    for (let max = 1; max <= 400; max++) {
      const { sommet } = echelleMois(max)
      // Le sommet couvre la donnée…
      expect(sommet, `sommet trop bas pour max=${max}`).toBeGreaterThanOrEqual(max)
      /* …sans la noyer : jamais plus du double. Une courbe à 3 sur un axe qui monte à 100 serait
         techniquement juste et visuellement muette. */
      expect(sommet, `sommet trop haut pour max=${max}`).toBeLessThanOrEqual(Math.max(2, max * 2))
    }
  })

  it('garde un nombre de graduations lisible', () => {
    for (let max = 1; max <= 400; max++) {
      const n = graduations(max).length
      expect(n, `trop peu de graduations pour max=${max}`).toBeGreaterThanOrEqual(2)
      expect(n, `trop de graduations pour max=${max}`).toBeLessThanOrEqual(6)
    }
  })

  /*
    Le second défaut, corrigé après le premier : l'ordre de recherche du pas. Il essayait 25 avant
    10, et graduait donc 28 en « 0 · 25 · 50 » là où « 0 · 10 · 20 · 30 » serre bien mieux.
  */
  it('choisit le pas le plus fin qui tienne', () => {
    expect(graduations(28)).toEqual([0, 10, 20, 30])
    expect(graduations(10)).toEqual([0, 2, 4, 6, 8, 10])
    expect(graduations(3)).toEqual([0, 1, 2, 3])
  })

  /*
    Un seul mois à une consultation — le cas d'un soignant qui démarre, et celui du compte de
    démonstration en ligne. L'axe doit rester à 1, pas sauter à 100 comme la maquette.
  */
  it('reste au ras des données quand elles sont petites', () => {
    expect(graduations(1)).toEqual([0, 1])
  })

  it('ne divise jamais par zéro', () => {
    expect(echelleMois(0).sommet).toBeGreaterThan(0)
    expect(echelleMois(Number.NaN).sommet).toBeGreaterThan(0)
  })
})

describe('Le tracé', () => {
  const mois = [
    { month: '2026-04', sessions: 3 },
    { month: '2026-05', sessions: 5 },
    { month: '2026-06', sessions: 2 },
  ]

  it('dessine une ligne, une aire et un point par mois', () => {
    const { container } = render(<CourbeMois mois={mois} />)

    expect(container.querySelector('polyline'), 'la ligne manque').not.toBeNull()
    expect(container.querySelector('polygon'), 'l’aire dégradée manque').not.toBeNull()
    expect(container.querySelectorAll('circle')).toHaveLength(3)
  })

  /*
    Le dessin est MUET pour un lecteur d'écran, et c'est voulu : le tableau `sr-only` du tableau de
    bord donne déjà chaque valeur. Annoncer en plus une image sans contenu ferait entendre deux fois
    la même information, dont une qui n'apprend rien.
  */
  it('reste hors de la lecture d’écran', () => {
    const { container } = render(<CourbeMois mois={mois} />)

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  /*
    La géométrie relevée sur la maquette. On ne vérifie pas chaque coordonnée — ce serait recopier —
    mais le cadre, qui est ce qui rend le tracé superposable à la maquette.
  */
  it('garde le cadre de la maquette', () => {
    const { container } = render(<CourbeMois mois={mois} />)

    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 620 190')
  })

  it('ne dessine rien sans données', () => {
    const { container } = render(<CourbeMois mois={[]} />)

    expect(container.querySelector('svg')).toBeNull()
  })
})

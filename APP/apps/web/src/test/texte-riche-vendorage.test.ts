/**
 * Les trois copies de la grammaire doivent rester IDENTIQUES — chantier 86.
 *
 * ── Pourquoi ce test existe ───────────────────────────────────────────────────────────────────
 *
 * Le projet vendore : `packages/shared/src/…` est la source, chaque application en garde une copie
 * (c'est la convention établie pour `api-client`, `auth`, `validation`). Jusqu'ici, **rien ne
 * vérifiait que les copies ne divergeaient pas** — seulement un commentaire en tête qui le
 * demandait poliment.
 *
 * Pour cette grammaire-ci, une divergence ne serait pas une gêne de développeur : **le patient
 * verrait autre chose que ce que le soignant a écrit.** Des astérisques d'un côté, du gras de
 * l'autre, sur un écran où l'on décide de soins.
 *
 * C'est exactement la leçon du chantier 84 — *deux endroits qui calculent la même chose finissent
 * toujours par ne plus dire la même chose* — avec, cette fois, le garde-fou posé le jour même.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

/** Les chemins sont relatifs à `apps/web`, d'où vitest est lancé. */
const COPIES = {
  source: '../../packages/shared/src/texte-riche.ts',
  web: 'src/modules/consultation/texte-riche.ts',
  mobile: '../mobile/src/lib/texte-riche.ts',
} as const

const empreinte = (chemin: string): string =>
  createHash('sha256').update(readFileSync(chemin)).digest('hex').slice(0, 16)

describe('La grammaire de mise en forme — vendorage', () => {
  it('les trois copies sont identiques à l’octet près', () => {
    const source = empreinte(COPIES.source)

    /*
      Le message d'échec nomme le geste à faire. Un test qui dit seulement « ça a changé » laisse
      celui qui le lit chercher quoi faire — et il finit par aligner la source sur la copie, dans
      le mauvais sens.
    */
    expect(empreinte(COPIES.web), `apps/web a dérivé. Recopier packages/shared/src/texte-riche.ts vers ${COPIES.web}`).toBe(source)
    expect(empreinte(COPIES.mobile), `apps/mobile a dérivé. Recopier packages/shared/src/texte-riche.ts vers ${COPIES.mobile}`).toBe(source)
  })

  /*
    ⚠️ Et la source doit rester la SOURCE. Sans cette assertion, on pourrait satisfaire le test
    ci-dessus en recopiant une copie modifiée vers `packages/shared` — donc en laissant une
    application décider pour les deux autres. Le fichier dit d'où il vient ; on vérifie qu'il le dit.
  */
  it('et chaque copie annonce d’où elle vient', () => {
    for (const [nom, chemin] of Object.entries(COPIES)) {
      const contenu = readFileSync(chemin, 'utf8')
      expect(contenu, `${nom} ne nomme plus sa source`).toContain('VENDORÉ')
      expect(contenu, `${nom} ne nomme plus sa source`).toContain('packages/shared/src/texte-riche.ts')
    }
  })
})

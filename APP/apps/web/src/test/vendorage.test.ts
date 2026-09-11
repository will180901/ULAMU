/**
 * Les copies vendorées doivent rester IDENTIQUES — chantier 86, étendu au chantier 96.
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

/**
 * Les modules vendorés, et leurs trois copies. Les chemins sont relatifs à `apps/web`, d'où vitest
 * est lancé.
 *
 * ⚠️ **Chaque nouveau fichier vendoré s'ajoute ICI**, en trois lignes. Le premier jet de ce test ne
 * couvrait qu'un module et portait son nom : le second fichier vendoré aurait été recopié sans
 * garde-fou, ou aurait fait naître un second test jumeau. *Un garde-fou écrit pour un seul cas
 * n'est pas un garde-fou : c'est une exception qui a eu de la chance.*
 */
const MODULES = {
  'la grammaire de mise en forme': {
    source: '../../packages/shared/src/texte-riche.ts',
    web: 'src/modules/consultation/texte-riche.ts',
    mobile: '../mobile/src/lib/texte-riche.ts',
  },
  /*
    L'onde d'une note vocale. La divergence y serait tout aussi visible : la MÊME note n'aurait pas
    le même dessin chez le patient et chez le soignant, et la première remarque serait « ce n'est
    pas la même application ».
  */
  "la géométrie de l'onde vocale": {
    source: '../../packages/shared/src/onde-vocale.ts',
    web: 'src/modules/consultation/onde-vocale.ts',
    mobile: '../mobile/src/lib/onde-vocale.ts',
  },
} as const

const empreinte = (chemin: string): string =>
  createHash('sha256').update(readFileSync(chemin)).digest('hex').slice(0, 16)

describe.each(Object.entries(MODULES))('%s — vendorage', (nom, COPIES) => {
  const fichier = COPIES.source.split('/').pop() as string

  it('les trois copies sont identiques à l’octet près', () => {
    const source = empreinte(COPIES.source)

    /*
      Le message d'échec nomme le geste à faire. Un test qui dit seulement « ça a changé » laisse
      celui qui le lit chercher quoi faire — et il finit par aligner la source sur la copie, dans
      le mauvais sens.
    */
    expect(empreinte(COPIES.web), `apps/web a dérivé. Recopier ${COPIES.source} vers ${COPIES.web}`).toBe(source)
    expect(empreinte(COPIES.mobile), `apps/mobile a dérivé. Recopier ${COPIES.source} vers ${COPIES.mobile}`).toBe(source)
  })

  /*
    ⚠️ Et la source doit rester la SOURCE. Sans cette assertion, on pourrait satisfaire le test
    ci-dessus en recopiant une copie modifiée vers `packages/shared` — donc en laissant une
    application décider pour les deux autres. Le fichier dit d'où il vient ; on vérifie qu'il le dit.
  */
  it('et chaque copie annonce d’où elle vient', () => {
    for (const [role, chemin] of Object.entries(COPIES)) {
      const contenu = readFileSync(chemin, 'utf8')
      expect(contenu, `${nom} : ${role} ne nomme plus sa source`).toContain('VENDORÉ')
      expect(contenu, `${nom} : ${role} ne nomme plus sa source`).toContain(`packages/shared/src/${fichier}`)
    }
  })
})

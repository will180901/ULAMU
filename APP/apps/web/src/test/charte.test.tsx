/**
 * Conformité à la charte — interdictions absolues de CG-06 §07 et CG-09 §05.
 *
 * ⚠️ **État transitoire (09/08/2026).** Cinq de ces règles portaient sur la coquille applicative —
 * barre latérale, topbar, menus, navigation — retirée par la refonte shadcn. Elles ne sont pas
 * abandonnées : elles sont suspendues en `it.todo`, ce qui les fait apparaître à chaque exécution
 * comme une dette visible plutôt que de disparaître silencieusement du dépôt. Chacune doit redevenir
 * une assertion réelle quand la coquille correspondante est reconstruite.
 *
 * Ce qui reste vérifié ici ne dépend d'aucun composant : ce sont des propriétés des JETONS, donc
 * vraies quelle que soit l'implémentation qui les consomme.
 *
 * **Pourquoi ces règles existent.** Le système de design du web est un port de CMS-SARIS, qui
 * désactive toutes les ombres en thème sombre — au motif, juste, qu'une ombre portée ne se voit
 * presque pas sur un fond déjà sombre : pour une CARTE posée sur la page, la hiérarchie passe alors
 * par la bordure. Mais un MENU n'est pas une carte : il flotte au-dessus du contenu. En sombre, il
 * devenait donc strictement plat — ce que CG-06 §07 range parmi les interdictions absolues
 * (« jamais plat »). D'où le token `--ombre-flottante`, défini séparément dans les deux thèmes.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CSS = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8')

/** Extrait la valeur d'un token dans un bloc donné (`:root` ou `.dark`). */
function token(bloc: ':root' | '.dark', nom: string): string | null {
  const debut = CSS.indexOf(`${bloc} {`)
  if (debut < 0) return null
  const fin = CSS.indexOf('\n}', debut)
  const corps = CSS.slice(debut, fin)
  const m = corps.match(new RegExp(`${nom}\\s*:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}

describe('CG-06 §07 — interdictions absolues', () => {
  it('les surfaces flottantes ont une élévation dans les DEUX thèmes (« menu jamais plat »)', () => {
    const clair = token(':root', '--ombre-flottante')
    const sombre = token('.dark', '--ombre-flottante')

    expect(clair, '--ombre-flottante manquant en thème clair').toBeTruthy()
    expect(sombre, '--ombre-flottante manquant en thème sombre').toBeTruthy()
    // C'est précisément le piège : en sombre, --ombre-4 vaut `none`. Un menu qui s'y raccrocherait
    // serait plat. Le token doit donc survivre à la refonte — les composants shadcn s'y brancheront.
    expect(sombre).not.toBe('none')
    expect(clair).not.toBe('none')
  })

  // ── Suspendues avec la coquille supprimée — à réactiver sur l'implémentation shadcn ────────────
  it.todo('les surfaces flottantes (menu, palette, infobulle, barre latérale) utilisent --ombre-flottante et jamais --ombre-4')
  it.todo('la barre latérale porte le verre dépoli (« sidebar sans glassmorphism » interdit)')
  it.todo('la topbar reste sticky et porte le grain (deux interdictions explicites)')
  it.todo('les libellés de groupe de navigation sont en monospace majuscule')
  it.todo('l’item de navigation actif a un FOND et une COULEUR, pas seulement l’un des deux')
})

describe('CG-09 §05 — mouvement', () => {
  it('aucune transition d’interaction courante ne dépasse le plafond de 400 ms', () => {
    const durees = [...CSS.matchAll(/--dur-[a-z]+:\s*(\d+)ms/g)].map((m) => Number(m[1]))
    expect(durees.length).toBeGreaterThan(0)
    expect(Math.max(...durees)).toBeLessThanOrEqual(400)
  })

  it('prefers-reduced-motion est implémenté (obligation explicite)', () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  CONTRASTE — le seul endroit où « c'est joli » se démontre au lieu de se discuter
  ══════════════════════════════════════════════════════════════════════════════════════════════

  Ajouté le 09/09/2026, après que le même défaut soit apparu DEUX fois en une journée :

  1. Chantier 69 — le texte tertiaire du thème SOMBRE donnait 3,80:1. Le défaut avait été trouvé et
     corrigé dans le thème CLAIR le 20/08, et le sombre n'avait jamais été re-mesuré.
  2. Chantier 70 — le bandeau des six mois donnait 4,30:1 en thème CLAIR. J'avais vérifié le sombre,
     pas le clair. **La faute exactement symétrique, une heure après avoir écrit la leçon.**

  D'où ce test : il n'attend plus que quelqu'un pense à regarder l'autre palette. Il lit les jetons
  et calcule, pour LES DEUX thèmes à la fois.

  ⚠️ Il porte sur les paires que le système emploie réellement — une encre sur une SURFACE. Il ne
  peut pas remplacer un regard sur l'écran : il ne voit ni les fonds semi-transparents, ni les
  couleurs écrites dans un composant. Ce qu'il garantit, c'est qu'aucune retouche de palette ne
  pourra plus faire passer une encre sous le seuil sans que rien ne proteste.
*/

/** Luminance relative d'un `#rrggbb`, formule WCAG 2.1. */
function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const canaux = [n.slice(0, 2), n.slice(2, 4), n.slice(4, 6)].map((p) => {
    const v = parseInt(p, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2]
}

/** Rapport de contraste entre deux couleurs, arrondi au centième. */
function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100
}

/** Le seuil AA pour du texte courant. Les grandes tailles ont droit à 3:1 — on ne s'en sert pas. */
const SEUIL_AA = 4.5

describe('WCAG AA — les trois encres restent lisibles sur les surfaces, dans les DEUX thèmes', () => {
  const themes: Array<':root' | '.dark'> = [':root', '.dark']

  for (const bloc of themes) {
    const nomTheme = bloc === ':root' ? 'clair' : 'sombre'

    for (const encre of ['--texte-primaire', '--texte-secondaire', '--texte-tertiaire']) {
      for (const surface of ['--fond-page', '--fond-surface']) {
        it(`${nomTheme} : ${encre} sur ${surface}`, () => {
          const couleurEncre = token(bloc, encre)
          const couleurFond = token(bloc, surface)
          expect(couleurEncre, `${encre} absent de ${bloc}`).toBeTruthy()
          expect(couleurFond, `${surface} absent de ${bloc}`).toBeTruthy()

          const mesure = contraste(couleurEncre as string, couleurFond as string)
          expect(
            mesure,
            `${nomTheme} : ${encre} (${couleurEncre}) sur ${surface} (${couleurFond}) donne ${mesure}:1, il faut ${SEUIL_AA}`,
          ).toBeGreaterThanOrEqual(SEUIL_AA)
        })
      }
    }
  }

  /*
    ── ⚠️ La pastille de compteur — chantier 128, 15/09/2026 ────────────────────────────────────

    Elle empruntait `--erreur-accent`. **Mesuré sur le site en ligne** : en thème SOMBRE, le chiffre
    blanc y tombait à **4,36** pour un seuil de 4,5. C'était le dernier écart de contraste connu du
    produit, signalé dès le 09/09 et rangé « au chantier de la coque ».

    ⚠️ **La note de la passation se trompait sur le remède** : elle annonçait « agrandir la pastille
    (15 → 16 px) ». Le seuil ne s'assouplit qu'à partir de 24 px, ou 18,7 px en gras — à 9 px il
    reste 4,5 quelle que soit la taille. *Un seuil qu'on croit franchir en grossissant ne bouge pas
    d'un pouce.*

    Et on ne pouvait pas assombrir `--erreur-accent` : il sert aussi aux BORDURES des champs en
    erreur, que l'assombrir rendrait moins visibles sur fond sombre. *Deux usages qui demandent des
    directions opposées ont besoin de deux jetons.*
  */
  for (const bloc of themes) {
    const nomTheme = bloc === ':root' ? 'clair' : 'sombre'
    it(`${nomTheme} : le chiffre blanc de la pastille de compteur reste lisible`, () => {
      const fond = token(bloc, '--pastille-compteur')
      expect(fond, `--pastille-compteur absent de ${bloc}`).toBeTruthy()

      const mesure = contraste('#FFFFFF', fond as string)
      expect(
        mesure,
        `${nomTheme} : blanc sur --pastille-compteur (${fond}) donne ${mesure}:1, il faut ${SEUIL_AA}`,
      ).toBeGreaterThanOrEqual(SEUIL_AA)
    })
  }

  /*
    ⚠️ Le piège nommé, pour qu'il ne se retrouve pas dans un écran par accident.

    `--fond-surface-2` est la surface la plus CLAIRE du thème clair (#E4E6E9) : l'encre tertiaire y
    tombe à 4,30:1, alors qu'elle tient à 4,87:1 sur la même surface en sombre. C'est exactement le
    piège du chantier 70 — une paire qui passe dans un thème et pas dans l'autre.

    Ce test ne demande PAS de corriger la palette : `--fond-surface-2` sert de teinte d'alternance
    et d'en-tête de panneau, où elle apparaît mélangée (donc plus claire) et où la mesure passe.
    Il fige le fait, pour que la prochaine personne qui pose de l'encre tertiaire sur cette surface
    PLEINE sache ce qu'elle fait.
  */
  it('mémo : l’encre tertiaire sur --fond-surface-2 PLEIN ne passe pas en clair (piège connu)', () => {
    const mesure = contraste(token(':root', '--texte-tertiaire') as string, token(':root', '--fond-surface-2') as string)
    expect(mesure).toBeLessThan(SEUIL_AA)
    // Si un jour la palette est retouchée et que cette paire devient sûre, ce test tombe : le
    // supprimer sera alors une bonne nouvelle, à écrire au journal.
  })
})

/*
  ── ⚠️ L'intitulé d'une ligne doit dominer son aide — chantier 129, 15/09/2026 ──────────────────

  **Mesuré sur le site en ligne**, dans « Mes paramètres » : l'intitulé de ce qu'on règle
  (« Thème », « Densité », « Sons de l'interface ») s'écrivait à **13 px**, et l'explication juste
  en dessous à **12 px**. **Un pixel d'écart.** Sur cet écran, 21 textes partageaient exactement la
  même taille — le sous-titre de la page, les six onglets, et chaque intitulé de réglage.

  > **Un intitulé qui a la taille de son explication ne s'annonce plus : il se confond avec elle.**

  C'est très précisément ce que le porteur décrivait en disant « sans vie » : l'œil n'a aucun point
  d'entrée dans la page.

  📌 Ce test ne fige pas des pixels — il fige un ÉCART. La fondation peut resserrer toute l'échelle
  pour l'administration (elle le fait), mais le rang doit tenir dans les deux zones : *ce qui doit
  rester vrai n'est pas la taille, c'est l'ordre.*
*/
describe('CG-02 — l’intitulé d’une ligne se lit avant son aide (chantier 129)', () => {
  const paliers: Record<string, number> = {
    '--fs-display-xl': 32,
    '--fs-display-lg': 24,
    '--fs-display-md': 20,
    '--fs-display-sm': 18,
    '--fs-text-xl': 18,
    '--fs-text-lg': 16,
    '--fs-text-md': 15,
    '--fs-text-sm': 13,
    '--fs-text-xs': 12,
    '--fs-caption': 11,
  }

  /** La taille en pixels d'une voix, résolue à travers le palier qu'elle désigne. */
  function taille(bloc: ':root' | '.dark' | '[data-zone=\'administration\']', voix: string): number {
    const brut = token(bloc as ':root', voix)
    expect(brut, `${voix} absent de ${bloc}`).toBeTruthy()
    const palier = /var\((--[a-z0-9-]+)\)/.exec(brut as string)
    expect(palier, `${voix} ne désigne aucun palier : ${brut}`).toBeTruthy()
    const px = paliers[(palier as RegExpExecArray)[1]]
    expect(px, `palier inconnu : ${(palier as RegExpExecArray)[1]}`).toBeTruthy()
    return px
  }

  it('la zone « soin » les sépare vraiment', () => {
    const intitule = taille(':root', '--voix-intitule')
    const aide = taille(':root', '--voix-aide')

    expect(intitule).toBeGreaterThan(aide)
    // Un seul pixel d'écart, c'est ce qu'il y avait avant : le rang doit se VOIR.
    expect(intitule - aide).toBeGreaterThanOrEqual(3)
  })

  it('le rôle existe et porte les trois marques à la fois', () => {
    const regle = /\.ul-intitule\s*\{([^}]*)\}/.exec(CSS)
    expect(regle, '.ul-intitule absent de la feuille').toBeTruthy()

    const corps = (regle as RegExpExecArray)[1]
    // La taille seule ne suffisait pas : à 1 px d'écart, ni la graisse ni l'encre ne rattrapaient.
    expect(corps).toContain('var(--voix-intitule)')
    expect(corps).toMatch(/font-weight:\s*600/)
    expect(corps).toContain('var(--texte-primaire)')
  })

  /*
    L'administration resserre toute l'échelle — c'est voulu (on y balaye des files). Mais resserrer
    ne doit pas remettre l'intitulé au niveau de son aide : *une densité qui efface une hiérarchie
    n'est plus une densité, c'est une bouillie.*
  */
  it('l’administration resserre sans écraser le rang', () => {
    const zone = "[data-zone='administration']" as const
    const intitule = taille(zone, '--voix-intitule')
    const aide = taille(zone, '--voix-aide')

    expect(intitule).toBeGreaterThan(aide)
  })
})

/*
  ── ⚠️ Un rôle que personne n'emploie ne corrige rien — chantier 129 ───────────────────────────

  L'injection de fautes du 15/09 l'a montré : on pouvait remettre `text-[13px] font-medium` dans le
  composant partagé `Reglage` **sans qu'un seul test tombe**. La charte vérifiait que le rôle
  EXISTE ; personne ne vérifiait qu'on s'en sert.

  *Une voix qu'on définit et que les écrans continuent d'ignorer est une décision qui n'a pas eu
  lieu.* C'est exactement ce que le chantier 69 avait corrigé en remplaçant 83 recopies par cinq
  voix — et ce qui recommence dès qu'un écran réinvente sa taille.

  📌 **L'administration est hors de ce filet, et c'est délibéré** : elle porte encore 13 recopies,
  et sa passe de refonte n'a pas commencé. Les y interdire aujourd'hui casserait 7 écrans que
  personne n'a encore repris. La ligne est donc posée là où la passe est passée — *un filet qu'on
  tend trop large se coupe pour passer, et ne retient plus rien.*
*/
describe('CG-02 — les écrans du soignant emploient le rôle, au lieu de le réinventer', () => {
  const RECOPIE = 'text-[13px] font-medium text-foreground'

  const lire = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8')

  it('la ligne de réglage partagée porte `ul-intitule`', () => {
    const source = lire('components/ulamu/parts.tsx')

    expect(source).toContain('block ul-intitule')
    expect(source.includes(RECOPIE), `parts.tsx réinvente la taille au lieu d'employer le rôle`).toBe(false)
  })

  it('aucune section de « Mes paramètres » ne réinvente la taille d’un intitulé', () => {
    const dossier = resolve(__dirname, '..', 'modules/settings/sections')
    const coupables: string[] = []

    for (const nom of readdirSync(dossier)) {
      if (!nom.endsWith('.tsx')) continue
      if (readFileSync(resolve(dossier, nom), 'utf8').includes(RECOPIE)) coupables.push(nom)
    }

    expect(coupables).toEqual([])
  })
})

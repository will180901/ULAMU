/**
 * Les saisies de code à 6 chiffres — chantier 140, 16/09/2026.
 *
 * ── ⚠️ Ce qu'on a trouvé ──────────────────────────────────────────────────────────────────────
 *
 * **Demande du porteur** : « je veux aussi que les champs du code soient en cases, comme pour les
 * applications des pros. » En allant regarder, ce n'était pas une nouveauté à inventer :
 *
 *   • la connexion, l'inscription, le mot de passe oublié, l'activation TOTP et le recours
 *     affichaient DÉJÀ six cases séparées ;
 *   • la signature du contrat, le changement d'adresse, le changement de numéro, le retrait
 *     d'argent, la clôture de compte et la vérification Mobile Money saisissaient le même code dans
 *     une boîte de texte ordinaire.
 *
 * > **Ce n'était pas une nouveauté à inventer : c'était une incohérence à l'intérieur du produit.**
 *
 * Le composant existait, le paquet était installé, cinq écrans s'en servaient. *Une capacité qui
 * n'est branchée qu'à la moitié des écrans se lit, depuis l'autre moitié, comme une capacité
 * absente.* — c'est la treizième fois que ce motif revient dans ce projet.
 *
 * ── Pourquoi un fichier de filets pour une question d'apparence ───────────────────────────────
 *
 * Parce que ce n'en est pas une. Six cases **disent combien de chiffres sont attendus**, **montrent
 * où l'on en est**, et **recadrent un code collé depuis un email**. Et surtout : sans filet, treize
 * écrans finiront par diverger à nouveau — c'est précisément ce qui vient de se passer.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')

/** Tous les fichiers de `src/`, à l'exception du champ commun et du composant qu'il enveloppe. */
function fichiers(dossier: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = resolve(dossier, e.name)
    if (e.isDirectory()) fichiers(chemin, acc)
    else if (/\.tsx?$/.test(e.name)) acc.push(chemin)
  }
  return acc
}

const AUTORISES = ['components/ui/input-otp', 'components/ulamu/ChampCode']
const CORPS = fichiers(SRC)
  .filter((f) => !f.includes(`${'test'}${'/'}`) && !f.includes('\\test\\'))
  .filter((f) => !AUTORISES.some((a) => f.replace(/\\/g, '/').includes(a)))
  .map((f) => ({ f: f.replace(/\\/g, '/').split('/src/')[1], src: readFileSync(f, 'utf8') }))

describe('Un code à 6 chiffres se saisit en cases, partout', () => {
  /*
    ⚠️ LE filet de ce chantier. `maxLength={6}` sur une boîte ordinaire, c'est exactement la forme
    qu'avaient les huit saisies restées en arrière. Elle ne doit plus exister hors du champ commun.
  */
  it('aucun écran ne saisit un code dans une boîte ordinaire', () => {
    const fautifs = CORPS.filter((x) => /maxLength=\{6\}/.test(x.src)).map((x) => x.f)

    expect(fautifs).toEqual([])
  })

  /*
    Et personne ne recopie le bloc de six cases : cinq écrans le faisaient, à l'identique, et c'est
    ainsi qu'une treizième variante finit par apparaître. *Une valeur recopiée est une valeur qui
    dérive ; un bloc recopié, c'est la même chose en plus grand.*
  */
  it('personne ne recopie le bloc de cases : il n’existe qu’à un endroit', () => {
    const fautifs = CORPS.filter((x) => /<InputOTPSlot/.test(x.src)).map((x) => x.f)

    expect(fautifs).toEqual([])
  })

  /*
    ⚠️ **Le filet qui protège autre chose que l'apparence.**

    `onComplete` valide dès le sixième chiffre. Sur une connexion ou une inscription, c'est un clic
    gagné — et si l'on se trompe, on recommence. Sur une signature de contrat, un retrait d'argent ou
    une clôture de compte, cela retire la seconde pendant laquelle on se ravise.

    > **Un geste qu'on ne peut pas défaire ne se déclenche pas à la sixième frappe.**
  */
  it('ne valide jamais tout seul un geste qu’on ne peut pas défaire', () => {
    const COUTEUX = [
      'modules/verification/pages/VerificationPage.tsx', // signer un contrat
      'modules/gains/pages/GainsPage.tsx', // retirer de l'argent
      'modules/settings/sections/SectionSessions.tsx', // clôturer un compte
      'modules/settings/sections/SectionMobileMoney.tsx', // le numéro qui reçoit l'argent
    ]

    for (const chemin of COUTEUX) {
      const page = CORPS.find((x) => x.f === chemin)
      // Si le fichier est renommé, le cas doit TOMBER — pas passer sur une liste vide.
      expect(page, chemin).toBeDefined()
      /*
        ⚠️ `onComplete=\u007b` et non `onComplete` : la première écriture attrapait le COMMENTAIRE qui
        explique pourquoi il n'y en a pas. *Un filet qui lit la prose comme du code accuse celui
        qui a pris la peine d'expliquer.*
      */
      expect((page as { src: string }).src, chemin).not.toMatch(/onComplete=\{/)
    }
  })

  /*
    Six cases nues ne disent pas de quel code il s'agit. Chaque champ porte donc soit un `id` que son
    intitulé désigne, soit un `aria-label` — *un champ qu'un lecteur d'écran ne sait pas nommer n'est
    pas un champ, c'est un obstacle.*
  */
  it('chaque champ de code est nommé', () => {
    const anonymes = CORPS.filter((x) => /<ChampCode\b/.test(x.src))
      .flatMap((x) => [...x.src.matchAll(/<ChampCode\b[\s\S]{0,320}?\/>/g)].map((m) => ({ f: x.f, bloc: m[0] })))
      .filter((x) => !/\bid=/.test(x.bloc) && !/aria-label=/.test(x.bloc))
      .map((x) => x.f)

    expect(anonymes).toEqual([])
  })
})

/**
 * La grammaire de mise en forme d'un message — chantier 86.
 *
 * Ces tests portent sur le fichier VENDORÉ de `apps/web`, mais ils valent pour les trois copies :
 * un autre test vérifie qu'elles sont identiques à l'octet près. Si celui-ci tombe, c'est la
 * source `packages/shared/src/texte-riche.ts` qu'on corrige, jamais la copie.
 */
import { describe, expect, it } from 'vitest'

import {
  analyserTexteRiche,
  basculerListe,
  basculerMarqueur,
  continuerListe,
  lireLigneListe,
} from '@/modules/consultation/texte-riche'

/** Le texte rendu, à plat — pour vérifier qu'on n'a RIEN perdu ni ajouté en chemin. */
const aPlat = (t: string) => analyserTexteRiche(t).map((f) => f.texte).join('')

describe('La grammaire — ce qu’elle reconnaît', () => {
  it('rend le gras, l’italique, le barré, le souligné et le grand', () => {
    expect(analyserTexteRiche('*important*')).toEqual([{ texte: 'important', style: { gras: true } }])
    expect(analyserTexteRiche('_doucement_')).toEqual([{ texte: 'doucement', style: { italique: true } }])
    expect(analyserTexteRiche('~annulé~')).toEqual([{ texte: 'annulé', style: { barre: true } }])
    expect(analyserTexteRiche('__noté__')).toEqual([{ texte: 'noté', style: { souligne: true } }])
    expect(analyserTexteRiche('##titre##')).toEqual([{ texte: 'titre', style: { grand: true } }])
  })

  /*
    `__` avant `_` : sans cet ordre, « __noté__ » serait lu comme un italique vide suivi d'un
    italique vide, et le soulignement n'existerait jamais. L'ordre des marqueurs n'est pas un
    détail d'implémentation, c'est la grammaire elle-même.
  */
  it('ne confond pas le souligné et l’italique', () => {
    expect(analyserTexteRiche('__a__')).toEqual([{ texte: 'a', style: { souligne: true } }])
    expect(analyserTexteRiche('_a_')).toEqual([{ texte: 'a', style: { italique: true } }])
  })

  it('cumule les styles imbriqués', () => {
    expect(analyserTexteRiche('*_les deux_*')).toEqual([
      { texte: 'les deux', style: { gras: true, italique: true } },
    ])
  })

  it('garde le texte autour des marqueurs, dans l’ordre', () => {
    expect(analyserTexteRiche('avant *milieu* après').map((f) => f.texte)).toEqual(['avant ', 'milieu', ' après'])
  })
})

describe('La grammaire — les deux règles qui évitent les faux positifs', () => {
  /*
    ⚠️ Celui-ci protège des POSOLOGIES. « 2 * 3 * 4 » dans un message de soin doit rester une
    multiplication ; le transformer en gras changerait un chiffre en emphase, et personne ne verrait
    l'astérisque disparaître.
  */
  it('un marqueur collé à un espace n’en est pas un', () => {
    expect(aPlat('2 * 3 * 4')).toBe('2 * 3 * 4')
    expect(analyserTexteRiche('2 * 3 * 4')).toHaveLength(1)
    expect(analyserTexteRiche('2 * 3 * 4')[0]?.style).toEqual({})
  })

  it('et un marqueur ne traverse pas une ligne', () => {
    const deuxLignes = 'début *ouvert\nligne suivante* fin'
    expect(aPlat(deuxLignes)).toBe(deuxLignes)
    expect(analyserTexteRiche(deuxLignes).every((f) => !f.style.gras)).toBe(true)
  })

  it('un marqueur non refermé s’affiche tel quel — on ne devine pas l’intention', () => {
    expect(aPlat('*jamais refermé')).toBe('*jamais refermé')
    expect(analyserTexteRiche('*jamais refermé')[0]?.style).toEqual({})
  })

  it('des marqueurs vides ne créent rien', () => {
    expect(aPlat('**')).toBe('**')
    expect(aPlat('* *')).toBe('* *')
  })
})

describe('La grammaire — ce qu’elle n’interprète JAMAIS', () => {
  /*
    ⚠️ La frontière entre AFFICHER et INTERPRÉTER. Le corps d'un message de consultation porte des
    données de santé : un patient qui écrit `<b>` doit lire `<b>`. Ce test est plus important qu'il
    n'en a l'air — c'est lui qui interdit, un jour, d'ajouter « juste un petit rendu HTML ».
  */
  it('une balise reste une balise', () => {
    expect(aPlat('<b>gras ?</b>')).toBe('<b>gras ?</b>')
    expect(analyserTexteRiche('<b>gras ?</b>').every((f) => !f.style.gras)).toBe(true)
  })

  it('un lien reste du texte', () => {
    const url = 'Voir https://exemple.cg/page?a=1'
    expect(aPlat(url)).toBe(url)
  })

  /*
    Le texte ressort toujours intact : la mise en forme ne retire QUE ses propres marqueurs, et
    n'ajoute jamais rien. Les cas sont écrits À LA MAIN — une première version calculait l'attendu
    avec une expression régulière, qui oubliait deux marqueurs et faisait tomber le test sur sa
    propre erreur. *Un attendu calculé est un second programme, avec ses propres bugs.*
  */
  it.each([
    ['', ''],
    ['simple', 'simple'],
    ['*a* _b_ ~c~ __d__ ##e##', 'a b c d e'],
    ['a\nb\nc', 'a\nb\nc'],
    ['<b>x</b>', '<b>x</b>'],
  ])('rien n’est perdu ni ajouté : %j', (entree, attendu) => {
    expect(aPlat(entree)).toBe(attendu)
  })

  /*
    ── La règle qui protège le vocabulaire du soin ──────────────────────────────────────────────

    Un marqueur n'ouvre qu'en DÉBUT de mot et ne ferme qu'en FIN de mot. Sans elle,
    `nom_de_famille` deviendrait « nomdefamille » avec « de » en italique — et le nom d'un fichier,
    d'une molécule ou d'un identifiant se ferait manger ses tirets bas sans que personne le voie.

    WhatsApp ne pose pas cette règle. Nous si : ici, le texte est un dossier.
  */
  it.each([
    'nom_de_famille',
    'DOSSIER_2026_08',
    'para*cetamol*ine',
    'a~b~c',
  ])('un marqueur au milieu d’un mot n’en est pas un : %j', (entree) => {
    expect(aPlat(entree)).toBe(entree)
    expect(analyserTexteRiche(entree).every((f) => Object.keys(f.style).length === 0)).toBe(true)
  })

  /*
    ── Trou trouvé PAR L'INJECTION, pas en écrivant les tests ────────────────────────────────────

    La règle 3 a deux moitiés : on n'OUVRE qu'en début de mot, on ne FERME qu'en fin de mot. Les
    quatre cas ci-dessus semblaient les couvrir toutes les deux — ils ne couvraient que la seconde.
    Retirer la moitié « ouverture » ne réveillait aucun d'eux : dans `nom_de_famille` comme dans
    `para*cetamol*ine`, c'est déjà la fermeture qui bloque.

    Il fallait un cas où la fermeture est VALIDE (le marqueur est suivi d'un espace) et où seule
    l'ouverture s'y oppose. Le voici.

    *Quand une règle a deux moitiés, il faut un cas par moitié — sinon on teste deux fois la même,
    et l'autre part sans bruit le jour où quelqu'un la simplifie.*
  */
  it.each([
    'a*b* c',
    'fin_de_ligne_ ok',
    'x~y~ suite',
  ])('et il n’ouvre pas au milieu d’un mot, même si la fermeture serait valide : %j', (entree) => {
    expect(aPlat(entree)).toBe(entree)
    expect(analyserTexteRiche(entree).every((f) => Object.keys(f.style).length === 0)).toBe(true)
  })

  /*
    Et le cas symétrique : l'OUVERTURE est valide (le marqueur suit un espace), seule la FERMETURE
    s'y oppose. Sans ces trois lignes, retirer la moitié « fermeture » ne réveillait rien — les
    quatre premiers cas sont déjà bloqués par l'ouverture.

    Les deux moitiés se couvraient donc mutuellement : chacune suffisait à protéger les exemples de
    l'autre, et **on pouvait en supprimer une sans qu'un seul test bronche.** Il a fallu poser la
    faute pour le voir.
  */
  it.each([
    '*deux*comprimés',
    '_tension_artérielle',
    '~un~deux',
  ])('et il ne ferme pas au milieu d’un mot, même si l’ouverture était valide : %j', (entree) => {
    expect(aPlat(entree)).toBe(entree)
    expect(analyserTexteRiche(entree).every((f) => Object.keys(f.style).length === 0)).toBe(true)
  })

  /* Mais il ouvre après une ponctuation ouvrante, et ferme devant une ponctuation fermante. */
  it('sauf aux frontières naturelles d’un mot', () => {
    expect(analyserTexteRiche('(*urgent*)')[1]).toEqual({ texte: 'urgent', style: { gras: true } })
    expect(analyserTexteRiche('*urgent*, puis repos')[0]).toEqual({ texte: 'urgent', style: { gras: true } })
  })

  /*
    ⚠️ **Ce que la grammaire ne promet PAS, fixé pour que ce soit un choix et non une surprise.**

    Une suite de marqueurs sans texte autour se combine d'une façon qu'on ne devinerait pas. C'est
    le lot de toute grammaire légère. On préfère ce reste à la solution radicale — n'autoriser la
    mise en forme que sur des mots entiers — qui interdirait d'insister sur une partie de mot.

    Aucun texte de soin réaliste ne ressemble à ceci. Ces deux lignes sont là pour qu'on le SACHE,
    et pour qu'un changement de grammaire les réveille.
  */
  it.each([
    ['### ###', '# #'],
    ['_*__~', '*_~'],
  ])('la soupe de marqueurs se combine, et c’est assumé : %j', (entree, attendu) => {
    expect(aPlat(entree)).toBe(attendu)
  })
})

describe('Les listes — la suite logique', () => {
  it('reconnaît une puce et un numéro', () => {
    expect(lireLigneListe('• du repos')?.numero).toBeNull()
    expect(lireLigneListe('2. puis marcher')?.numero).toBe(2)
    expect(lireLigneListe('pas une liste')).toBeNull()
  })

  it('Ctrl+Entrée reprend la puce', () => {
    const r = continuerListe('• du repos', 10)
    expect(r.texte).toBe('• du repos\n• ')
    expect(r.curseur).toBe(r.texte.length)
  })

  it('et incrémente le numéro', () => {
    expect(continuerListe('1. du repos', 11).texte).toBe('1. du repos\n2. ')
    expect(continuerListe('9. neuf', 7).texte).toBe('9. neuf\n10. ')
  })

  /*
    ── La demande exacte du porteur ─────────────────────────────────────────────────────────────

    *« La possibilité d'annuler une suite logique de la liste : il suffirait de supprimer la ligne
    courante de la liste, ça annule la suite logique automatique. »*

    Une ligne de liste vidée de son contenu, et le geste suivant EFFACE la puce au lieu d'en poser
    une de plus. Sans cela, on ne sortirait jamais d'une liste qu'en effaçant à la main.
  */
  it('sur un élément VIDE, il sort de la liste au lieu de l’allonger', () => {
    const r = continuerListe('• du repos\n• ', 13)
    expect(r.texte).toBe('• du repos\n')
    expect(r.curseur).toBe(11)
  })

  it('hors d’une liste, il passe simplement à la ligne', () => {
    expect(continuerListe('bonjour', 7).texte).toBe('bonjour\n')
  })

  it('transforme une sélection en liste, et la retransforme en texte', () => {
    const texte = 'du repos\nde l’eau'
    const pose = basculerListe(texte, 0, texte.length, 'puce')
    expect(pose.texte).toBe('• du repos\n• de l’eau')

    const retire = basculerListe(pose.texte, pose.debut, pose.fin, 'puce')
    expect(retire.texte).toBe(texte)
  })

  it('numérote de 1 à n quand il POSE la liste', () => {
    expect(basculerListe('a\nb', 0, 3, 'numero').texte).toBe('1. a\n2. b')
  })

  /*
    ⚠️ **Une limite, écrite plutôt que subie.** Le bouton est une BASCULE : sur des lignes déjà
    numérotées, il retire la numérotation — même si elle est fausse (« 7. » puis « 3. »). Il faut
    alors deux clics pour la remettre d'aplomb : un pour retirer, un pour reposer de 1 à n.

    On aurait pu faire renuméroter le bouton quand les numéros sont incohérents. On ne l'a pas
    fait : ce serait **deux comportements pour un même bouton**, et l'utilisateur ne saurait pas
    lequel il déclenche avant de cliquer. Un geste prévisible vaut mieux qu'un geste malin.
  */
  it('sur des lignes déjà numérotées, il RETIRE — c’est une bascule, pas un correcteur', () => {
    expect(basculerListe('7. a\n3. b', 0, 9, 'numero').texte).toBe('a\nb')
  })

  /* Passer d'une puce à un numéro n'empile pas les deux : on remplace. */
  it('passe d’une puce à un numéro sans empiler', () => {
    expect(basculerListe('• a\n• b', 0, 7, 'numero').texte).toBe('1. a\n2. b')
  })
})

describe('La bascule d’un marqueur', () => {
  it('pose le marqueur et garde la sélection SUR LE TEXTE', () => {
    const r = basculerMarqueur('du repos', 3, 8, 'gras')
    expect(r.texte).toBe('du *repos*')
    expect(r.texte.slice(r.debut, r.fin)).toBe('repos')
  })

  /*
    Une bascule, pas un ajout. Sans cela, re-cliquer produirait « **repos** » — deux marqueurs
    imbriqués qui ne changent rien à l'œil, et que l'utilisateur ne saurait pas défaire.
  */
  it('retire le marqueur quand la sélection le porte déjà', () => {
    expect(basculerMarqueur('du *repos*', 3, 10, 'gras').texte).toBe('du repos')
  })

  it('le retire aussi quand la sélection est À L’INTÉRIEUR des marqueurs', () => {
    const r = basculerMarqueur('du *repos*', 4, 9, 'gras')
    expect(r.texte).toBe('du repos')
    expect(r.texte.slice(r.debut, r.fin)).toBe('repos')
  })

  it('sélection vide : il pose les deux marqueurs et place le curseur entre eux', () => {
    const r = basculerMarqueur('ab', 1, 1, 'gras')
    expect(r.texte).toBe('a**b')
    expect(r.debut).toBe(2)
    expect(r.fin).toBe(2)
  })
})

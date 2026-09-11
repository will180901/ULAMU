/**
 * Ce que l'application PROMET — chantier 27, 02/09/2026.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * Le 02/09, la chaîne du médicament est sortie du produit (D-052) : M11 Stocks, M12 Recherche &
 * dévoilement et la délivrance de M09 ont été retirés. Le code a été nettoyé, les trois suites sont
 * passées, et la vérification en ligne a montré que les routes retirées répondaient bien 404.
 *
 * **Six phrases avaient survécu au nettoyage, et elles ont été poussées en production.** Aucun test
 * ne pouvait les attraper : elles ne sont pas du code, ce sont des promesses.
 *
 *   • le carrousel des écrans d'entrée — « Réservez vos médicaments tout près » et « Retirez-les en
 *     pharmacie en toute confiance » — sur le PREMIER écran, celui qui décide si quelqu'un s'inscrit ;
 *   • le QR de l'ordonnance, des deux côtés — « Le patient présente ce code en pharmacie » côté
 *     médecin, « Le pharmacien scanne ce code » côté patient — au moment du soin.
 *
 * ── Ce que ce test verrouille, et ce qu'il se garde de verrouiller ────────────────────────────
 *
 * Il interdit les FAITS, jamais le vocabulaire. « Pharmacie » reste un mot légitime : l'ordonnance
 * dit désormais « montrez-la à votre pharmacien », et c'est exactement ce qu'il faut dire.
 *
 * C'est la leçon du chantier 16, payée une fois déjà : une assertion qui refusait le mot « médian »
 * avait échoué sur la phrase qui expliquait pourquoi la médiane n'était PAS mesurée. **Un test qui
 * interdit des mots finit par interdire les explications.**
 *
 * On lit donc la source — comme `responsive.test.ts` lit celle des cinq tableaux — et on cherche
 * les tournures qui annoncent un SERVICE : réserver, retirer, scanner.
 *
 * ── Ce que le chantier 28 y a ajouté, le lendemain de rien du tout ────────────────────────────
 *
 * En vérifiant EN LIGNE le chantier 27, l'écran de connexion disait encore, en toutes lettres :
 * « Connectez-vous à votre compte ULAMU — professionnels, **structures** et administration. »
 *
 * Le chantier 25 avait pourtant traité ce fichier — il en avait corrigé le COMMENTAIRE d'en-tête.
 * La phrase AFFICHÉE, trois lignes plus bas, était restée. **Une phrase visible avait survécu à
 * trois chantiers de nettoyage**, parce que chercher `FACILITY_MEMBER` ne trouve pas le mot
 * « structures » écrit en français dans une `prop`.
 *
 * D'où le second bloc : il ne lit plus des identifiants, il lit ce que les écrans DISENT du
 * périmètre.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8')

/** Le texte réellement affiché, débarrassé des commentaires — qui, eux, CITENT les phrases retirées. */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

describe('L’application ne promet pas la chaîne du médicament (D-052)', () => {
  /*
    Le carrousel d'entrée. Deux de ses cinq diapositives annonçaient un service retiré ; il en reste
    trois, toutes vraies. On vérifie le compte ET l'absence : sans le compte, une diapositive
    ajoutée demain passerait inaperçue ; sans l'absence, les deux retirées pourraient revenir.
  */
  it('le carrousel d’entrée ne propose plus de réserver ni de retirer des médicaments', () => {
    const s = sansCommentaires(source('components/layout/AuthCarousel.tsx'))

    expect(s).not.toMatch(/Réservez vos médicaments/i)
    expect(s).not.toMatch(/Retirez-les en pharmacie/i)
    expect((s.match(/\{ image: slide/g) ?? []).length).toBe(3)
  })

  /*
    Le sceau de l'ordonnance, côté médecin (C7). Ce qu'on interdit n'est pas le mot « pharmacie » —
    la phrase corrigée en parle — mais l'idée que le code SERVE à quelque chose au comptoir.
  */
  it('C7 ne dit plus que le patient présente le code en pharmacie', () => {
    const s = sansCommentaires(source('modules/ordonnance/PanneauOrdonnance.tsx'))

    expect(s).not.toMatch(/présente ce code en pharmacie/i)
    expect(s).not.toMatch(/à scanner en pharmacie/i)
    // Et il dit ce que le code EST : la contrepartie de ce qu'on lui retire.
    expect(s).toMatch(/scelle l'ordonnance|sceau/i)
  })

  /*
    Le pendant serveur : plus aucune route ne lit ce jeton. Si quelqu'un rétablit un jour la
    délivrance, ce test tombe — et c'est le bon moment pour relire les phrases ci-dessus.
  */
  it('aucune route de délivrance ne subsiste côté client', () => {
    const s = source('lib/api.ts')

    expect(s).not.toMatch(/prescriptions\/scan/i)
    expect(s).not.toMatch(/\/v1\/disclosures/i)
    expect(s).not.toMatch(/\/v1\/stocks/i)
  })
})

describe('Les écrans disent le bon périmètre : soignant et administration', () => {
  /*
    L'écran de connexion est le seul qui énumère les publics servis. Il l'a fait faux pendant trois
    chantiers — le test lit donc la `prop` affichée, pas le commentaire au-dessus.
  */
  it('la connexion n’annonce plus les « structures »', () => {
    const s = sansCommentaires(source('modules/auth/pages/LoginPage.tsx'))

    expect(s).toMatch(/subtitle="[^"]*soignants et administration/)
    expect(s).not.toMatch(/subtitle="[^"]*structures/i)
  })

  /*
    E6 expliquait l'anonymat du signaleur par un exemple devenu impossible — « un praticien, une
    officine ». On ne peut plus signaler une officine : il n'y en a plus dans le produit. Un exemple
    faux dans une phrase vraie affaiblit la phrase entière.
  */
  it('E6 n’illustre plus l’anonymat par une officine', () => {
    const s = sansCommentaires(source('modules/admin/pages/SignalementsPage.tsx'))

    expect(s).not.toMatch(/une officine/i)
    expect(s).toMatch(/qu'on retournera voir/)
  })

  /*
    Le pendant : ce test NE DOIT PAS interdire « Structure » dans E1. La file de vérification sert
    ce que la base contient, et un dossier hérité doit s'afficher pour ce qu'il est. On vérifie donc
    qu'il est toujours là — l'inverse d'une interdiction.
  */
  it('E1 sait encore nommer un dossier de structure hérité', () => {
    const s = source('modules/admin/pages/FileVerificationPage.tsx')

    expect(s).toMatch(/subjectKind === 'PROFESSIONAL' \? 'Soignant' : 'Structure'/)
  })
})

/**
 * Les RÉGLAGES qui ne règlent rien — chantier 29, 02/09/2026.
 *
 * Deux cases de « Mes paramètres » proposaient encore quelque chose d'impossible. Elles avaient
 * survécu aux chantiers 25 à 28 pour la même raison que le sous-titre de la connexion : ce sont des
 * chaînes de caractères en français, dans un tableau d'options, que nulle recherche d'identifiant
 * ne trouve.
 *
 * La règle qu'elles enfreignaient est celle du chantier 10, qui avait fait retirer le sélecteur de
 * langue : **un interrupteur qui ne change rien est pire qu'un interrupteur absent, parce qu'on lui
 * fait confiance.**
 */
describe('Les réglages ne proposent que ce qui existe', () => {
  /*
    B3 « Aide » offrait le sujet « Ma structure · Titulaire injoignable ». Depuis D-051, personne
    n'administre de structure — et la procédure qui l'aurait traitée est elle aussi retirée des
    choix d'E7. Une case qui mène à une file morte promet une réponse qu'on ne tiendra pas.
  */
  it('B3 n’offre plus de déposer une demande « Ma structure »', () => {
    const s = sansCommentaires(source('modules/settings/sections/SectionAide.tsx'))

    expect(s).not.toMatch(/OWNER_UNREACHABLE/)
    expect(s).not.toMatch(/Ma structure/)
    // Les trois sujets qui restent sont réels — le compte les verrouille.
    expect((s.match(/\{ cle: '/g) ?? []).length).toBe(3)
  })

  /*
    B3 « Préférences » proposait de couper les « Rappels — échéances de vérification, réservations
    qui expirent ». Les réservations sont sorties avec D-052 ; et la catégorie `reminder` ne porte
    AUCUN modèle de notification — vérifié dans `m14.templates.ts` : care 19, system 12, critical 10,
    money 7, reminder zéro. L'interrupteur ne coupait rien, et ne l'a jamais fait.
  */
  it('B3 ne propose plus de couper une catégorie de notification vide', () => {
    const s = sansCommentaires(source('modules/settings/sections/SectionPreferences.tsx'))

    expect(s).not.toMatch(/cle: 'reminder'/)
    expect(s).not.toMatch(/réservations qui expirent/)
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  LE FILET DE LA REFONTE — chantier 68, 07/09/2026
  ══════════════════════════════════════════════════════════════════════════════════════════════

  ── Pourquoi ce bloc existe ────────────────────────────────────────────────────────────────────

  Le porteur veut refondre le design de toute la plateforme soignant et administration. Sa crainte,
  dite en toutes lettres : *« il ne faut pas qu'on régresse, qu'on retire les choses essentielles »*.

  Elle est fondée, et ce fichier en est la preuve : six phrases avaient déjà survécu à un nettoyage
  et étaient parties en production (chantier 27), et une septième avait survécu à TROIS chantiers
  (chantier 28). Une refonte réécrit les écrans — c'est le moment exact où les phrases durement
  gagnées disparaissent, sans qu'aucun test ne tombe, parce qu'elles ne sont pas du code.

  Les blocs ci-dessus interdisent des promesses FAUSSES. Celui-ci exige la présence de promesses
  VRAIES : les garanties qu'on doit à quelqu'un, et les limites qu'on refuse de cacher.

  ── Comment le lire quand il casse ─────────────────────────────────────────────────────────────

  Un échec ici ne veut pas dire « le code est faux ». Il dit : **une phrase que quelqu'un avait jugée
  indispensable vient de disparaître de cet écran.** Trois réponses possibles, dans cet ordre :

    1. la refonte l'a perdue par accident → la remettre ;
    2. la refonte l'a REFORMULÉE → mettre à jour le motif ici, en vérifiant que la nouvelle
       formulation dit bien le même fait ;
    3. le produit a changé et la phrase est devenue fausse → la retirer des deux côtés, et l'écrire
       au journal comme une décision.

  Ce qu'il ne faut jamais faire : supprimer la ligne pour faire passer la suite.

  ── Ce que ces motifs verrouillent, et ce qu'ils laissent libre ───────────────────────────────

  Ils ancrent **deux mots-clés séparés par du texte libre**, jamais une phrase entière. Réécrire
  autour reste possible ; supprimer l'idée ne l'est pas. C'est le pendant de la leçon du chantier 16,
  citée plus haut : *un test qui interdit des mots finit par interdire les explications* — et un test
  qui EXIGE une phrase mot pour mot finit par interdire de mieux la dire.
*/

/** Une garantie qu'un écran doit continuer d'énoncer, et la raison pour laquelle elle compte. */
interface Promesse {
  /** Ce que la phrase garantit, en une ligne — c'est ce qu'on lit quand le test casse. */
  quoi: string
  motif: RegExp
}

const FILET: Array<{ ecran: string; fichier: string; promesses: Promesse[] }> = [
  {
    ecran: 'E6 · Signalements',
    fichier: 'modules/admin/pages/SignalementsPage.tsx',
    promesses: [
      {
        quoi: "l'identité du signaleur n'est pas transmise, et ne peut pas l'être (RM-04-04)",
        motif: /identité du signaleur[\s\S]{0,120}pas transmise/,
      },
      {
        quoi: 'sans cette garantie, on ne signale pas quelqu’un dont on dépend',
        motif: /signaler quelqu'un dont on dépend/,
      },
      {
        quoi: 'le texte du message signalé n’est jamais affiché — il est chiffré (RM-06-06)',
        motif: /texte du message n'est pas affiché[\s\S]{0,200}chiffré/,
      },
    ],
  },
  {
    ecran: 'E7 · Comptes',
    fichier: 'modules/admin/pages/ComptesPage.tsx',
    promesses: [
      {
        quoi: '« Bannir » ne bannit pas : cela DEMANDE, et un second admin doit approuver (EF-16-07)',
        motif: /n'applique pas le bannissement[\s\S]{0,160}demande/,
      },
      {
        quoi: 'un bannissement est définitif, une suspension se lève',
        motif: /bannissement[\s\S]{0,120}définitif/,
      },
      {
        quoi: 'on ne parcourt pas les comptes, on en cherche un (RM-16-02)',
        motif: /comptes ne se parcourent pas/,
      },
      {
        quoi: 'ce qu’un administrateur écrit en clôturant une procédure devient une trace signée',
        motif: /horodaté, signé de votre nom/,
      },
    ],
  },
  {
    ecran: 'E-finance',
    fichier: 'modules/admin/pages/FinancePage.tsx',
    promesses: [
      {
        quoi: 'personne ne valide sa propre demande de remboursement (RM-13-06)',
        motif: /valider une demande qu'il a lui-même initiée/,
      },
      {
        quoi: 'un rapport de rapprochement vide ne veut pas dire « aucun écart »',
        motif: /écran vide ne veut donc pas dire/,
      },
      {
        quoi: "l'argent gelé n'est ni versé ni rendu, et AUCUNE règle ne dit encore quoi en faire",
        motif: /aucune règle[\s\S]{0,60}pour trancher/,
      },
      {
        quoi: 'un échec de lecture se distingue d’une liste vide — sur de l’argent, c’est vital',
        motif: /n'a pas pu être lue[\s\S]{0,120}ne fait que lire/,
      },
    ],
  },
  {
    ecran: 'E-pilotage',
    fichier: 'modules/admin/pages/PilotagePage.tsx',
    promesses: [
      {
        quoi: 'aucune donnée individuelle ne sort de cet écran (RM-16-05)',
        motif: /Aucune donnée individuelle ne sort/,
      },
      {
        quoi: 'les délais médians ne sont mesurés par AUCUN indicateur — on ne les invente pas',
        motif: /médians[\s\S]{0,80}ne sont mesurés par aucun indicateur/,
      },
    ],
  },
  {
    ecran: 'E-vérification',
    fichier: 'modules/admin/pages/FileVerificationPage.tsx',
    promesses: [
      {
        quoi: 'un refus prive le soignant de tout patient, et il n’a pas de recours dans l’application',
        motif: /pas de recours dans l'application/,
      },
      {
        quoi: 'décider sans avoir ouvert les pièces engage le compte de l’administrateur',
        motif: /décider sans avoir tout ouvert engage votre compte/,
      },
    ],
  },
  {
    ecran: 'Ma vitrine (soignant)',
    fichier: 'modules/vitrine/pages/VitrinePage.tsx',
    promesses: [
      {
        /*
          ⚠️ Motif rendu insensible à la casse au chantier 71, et c'est une DÉCISION, pas un
          contournement. La phrase n'a pas changé d'un mot : elle a quitté un sous-titre pour
          devenir le titre du bandeau d'état, donc sa première lettre a pris une majuscule.

          C'est exactement le cas prévu par le chantier 68 — « mettre à jour le motif si la refonte
          l'a REFORMULÉE, en vérifiant que la nouvelle formulation dit le même fait ». Ici le fait
          est identique et il est même dit PLUS fort qu'avant.

          Le filet ne perd rien : les sept mots doivent toujours être là, dans cet ordre.
        */
        quoi: 'sans offre active, AUCUN patient ne peut solliciter — même vérifié et sous contrat',
        motif: /aucun patient ne peut vous solliciter/i,
      },
      {
        quoi: 'la visibilité est INCONNUE quand le dossier n’a pas pu être lu — jamais « invisible »',
        motif: /Visibilité inconnue/,
      },
      {
        quoi: 'le taux de réactivité baisse aussi quand on ne répond pas — un refus vaut mieux',
        motif: /même une réponse négative vaut mieux/,
      },
    ],
  },
  {
    ecran: 'Mes gains (soignant)',
    fichier: 'modules/gains/pages/GainsPage.tsx',
    promesses: [
      {
        quoi: 'les retraits partent sur le numéro du compte — il n’y a pas de compte de versement séparé',
        motif: /pas de compte de versement séparé/,
      },
      {
        quoi: 'une demande refusée ou expirée ne produit aucun gain',
        motif: /refusée ou expirée n'en produit aucun/,
      },
      /*
        Ajoutée au chantier 72. L'écran promettait, pour TOUTE somme en attente, qu'elle « devient
        retirable dès leur dépôt ». Faux passé l'échéance : le serveur refuse alors le dépôt et les
        gains sont gelés (CU-06-03). Sans cette phrase, un soignant attend indéfiniment un versement
        qu'aucun geste de sa part ne déclenchera — pendant que l'écran d'administration sait déjà
        que cet argent est immobilisé.
      */
      {
        quoi: 'passé le délai, un compte-rendu déposé ne débloque plus les gains gelés',
        /*
          ⚠️ `\s+` entre « le » et « délai » : dans le fichier, la phrase est COUPÉE par un retour
          à la ligne au milieu. C'est la leçon du chantier 71, réapprise le lendemain — chercher une
          phrase dans un source, c'est chercher une phrase MISE EN FORME. Le premier motif écrit ici
          exigeait l'espace simple et ne trouvait rien.
        */
        motif: /dépassé le\s+délai de dépôt[\s\S]{0,200}ne les débloquera plus/,
      },
    ],
  },
  {
    ecran: 'Mes demandes (soignant)',
    fichier: 'modules/demandes/pages/DemandesPage.tsx',
    promesses: [
      {
        quoi: 'le soignant ne voit rien du dossier tant que la consultation n’est pas payée',
        motif: /tant que la consultation n'est pas payée/,
      },
      /*
        Ajoutée au chantier 74. Le panneau du décompte disait « Cette demande est close » pour les
        quatre issues à la fois : exact, et sans valeur. « Expirée » et « payée » n'appellent pas le
        même geste, et l'une des deux coûte un point de taux de confirmation — un taux que les
        patients lisent avant de choisir. C'est le COÛT qui devait être dit.
      */
      {
        quoi: 'une demande expirée compte comme une non-réponse dans le taux de confirmation',
        motif: /expiré sans réponse[\s\S]{0,120}non-réponse dans votre taux/,
      },
    ],
  },
  {
    ecran: 'Mon dossier (vérification)',
    fichier: 'modules/verification/pages/VerificationPage.tsx',
    promesses: [
      {
        quoi: 'un dossier révoqué retire de l’annuaire et coupe toute demande',
        motif: /n'apparaissez plus dans l'annuaire/,
      },
      {
        quoi: 'ULAMU n’a pas de messagerie interne — les échanges n’existent qu’en consultation',
        motif: /pas de messagerie interne/,
      },
    ],
  },
  {
    ecran: 'Réglages · sécurité',
    fichier: 'modules/settings/sections/SectionSecurite.tsx',
    promesses: [
      {
        quoi: 'les retraits partent sur le numéro du compte : le changer engage l’argent',
        motif: /gains sont virés sur ce numéro/,
      },
      {
        quoi: 'changer de numéro exige un code sur l’ANCIEN et sur le nouveau (parade T-01)',
        motif: /sans preuve sur l'ancien numéro/,
      },
      {
        quoi: 'les codes de secours ne seront plus jamais réaffichés',
        motif: /ne seront plus jamais affichés/,
      },
      {
        quoi: 'un compte sans adresse email ne pourrait pas être récupéré',
        motif: /pas d'adresse email[\s\S]{0,120}aucun code ne pourrait/,
      },
    ],
  },
  {
    ecran: 'Réglages · sessions',
    fichier: 'modules/settings/sections/SectionSessions.tsx',
    promesses: [
      {
        quoi: 'la clôture de compte ne peut pas être annulée',
        motif: /ne peut pas être annulée/,
      },
    ],
  },
  {
    ecran: 'Réglages · aide',
    fichier: 'modules/settings/sections/SectionAide.tsx',
    promesses: [
      {
        quoi: 'l’administration ne demande JAMAIS un mot de passe ni un code',
        motif: /ne vous les demandera jamais/,
      },
      {
        quoi: 'la réponse arrive sur cette page — ULAMU n’envoie pas de courriel de support',
        motif: /n['’]envoie pas de courriel de support/,
      },
    ],
  },
  {
    ecran: 'Recours (compte bloqué)',
    fichier: 'modules/auth/pages/RecoursPage.tsx',
    promesses: [
      {
        quoi: 'le code prouve l’identité — aucune connexion n’est ouverte pour autant',
        motif: /Aucune\s+connexion n['’]est ouverte/,
      },
      {
        quoi: 'la réponse arrivera par email, puisqu’on ne peut pas se connecter',
        motif: /envoyée par email/,
      },
    ],
  },
  {
    ecran: 'Configuration TOTP',
    fichier: 'modules/auth/pages/TotpSetupPage.tsx',
    promesses: [
      {
        quoi: 'le secret ne part vers aucun service tiers — le QR est généré sur le poste',
        motif: /ne part vers aucun service tiers/,
      },
      {
        quoi: 'sans authentificateur ni code de secours, il ne reste que la récupération par email',
        motif: /ni code de secours/,
      },
    ],
  },
  {
    ecran: 'Consultation (soignant)',
    fichier: 'modules/consultation/pages/ConsultationPage.tsx',
    promesses: [
      /*
        Ajoutée au chantier 76. C'est le seul endroit où la garantie de chiffrement se dit DANS le
        fil — le sous-titre du panneau la dit aussi, mais on ne le relit pas en défilant. Sur un
        écran où passent des données de santé, cette phrase est la contrepartie visible d'une
        promesse technique (RM-06-06).
      */
      {
        quoi: 'le fil rappelle, à son ouverture, que l’échange est chiffré de bout en bout',
        motif: /Consultation ouverte[\s\S]{0,40}chiffré de bout en bout/,
      },
      {
        quoi: 'passé le délai, le dépôt du compte-rendu est REFUSÉ et les gains sont gelés (CU-06-03)',
        motif: /Passé ce délai[\s\S]{0,80}refusé/,
      },
      {
        quoi: 'le délai ne court qu’à la fin de la séance — donc on rédige pendant',
        motif: /ne commence à courir qu'à la fin/,
      },
      {
        quoi: 'délai dépassé : déposer quand même, le serveur tranche — on ne décourage pas',
        motif: /Déposez tout de même/,
      },
    ],
  },
  {
    ecran: 'Tableau de bord (soignant)',
    fichier: 'modules/dashboard/pages/DashboardPage.tsx',
    promesses: [
      {
        quoi: 'laisser expirer une demande compte comme une non-réponse aux yeux des patients',
        motif: /laissée expirer compte comme une non-réponse/,
      },
      /*
        Ajoutée au chantier 70. L'écran promettait « elles arrivent ici dès qu'un patient vous
        sollicite » alors que, sans offre active, personne ne PEUT solliciter — vérifié sur le
        compte du porteur, en production, le 09/09. « Ma vitrine » le disait déjà ; ce tableau de
        bord faisait patienter devant une porte que rien n'ouvrirait.
      */
      {
        quoi: 'sans offre active, aucune demande ne peut arriver — et l’écran le dit',
        motif: /Aucun patient ne peut vous solliciter[\s\S]{0,140}offre active/,
      },
    ],
  },
  {
    ecran: 'E-administrateurs',
    fichier: 'modules/admin/pages/AdministrateursPage.tsx',
    promesses: [
      {
        quoi: 'un mot de passe provisoire se transmet de vive voix, jamais par cet écran',
        motif: /vive voix ou par un canal qui n'est pas cet écran/,
      },
      {
        quoi: 'une habilitation sans motif est ingérable six mois plus tard',
        motif: /sans raison est ingérable/,
      },
    ],
  },
  {
    ecran: 'Connexion',
    fichier: 'modules/auth/pages/LoginPage.tsx',
    promesses: [
      {
        quoi: 'un compte bloqué garde un chemin : écrire à l’administration (chantier 63)',
        motif: /Écrire à l['’]administration/,
      },
    ],
  },
  {
    /*
      Deux écrans manquaient à ce filet, et ils portent des phrases qui VALENT PREUVE : ce sont les
      seules de la liste dont la disparition aurait une portée légale (EF-01-08, loi n° 29-2019).
    */
    ecran: 'Inscription',
    fichier: 'modules/auth/pages/RegisterPage.tsx',
    promesses: [
      {
        quoi: 'la case nomme les DEUX documents qu’elle fait accepter (EF-01-08)',
        motif: /conditions générales[\s\S]{0,200}politique de confidentialité/,
      },
      {
        quoi: 'on peut LIRE les documents avant de les accepter (chantier 62)',
        motif: /Lire les deux documents/,
      },
    ],
  },
  {
    ecran: 'Réglages · langue & mentions légales',
    fichier: 'modules/settings/sections/SectionLegal.tsx',
    promesses: [
      {
        quoi: 'l’hébergement RÉEL est nommé — la phrase disait « au Congo-Brazzaville » jusqu’au 24/08/2026',
        motif: /Hébergement des données[\s\S]{0,120}Allemagne/,
      },
      {
        quoi: 'la version acceptée et sa date sont produites — une preuve qu’on ne peut pas produire ne prouve rien',
        motif: /Version \{[\s\S]{0,120}acceptée le/,
      },
    ],
  },
]

describe('Le filet de la refonte — les promesses que chaque écran doit tenir', () => {
  for (const { ecran, fichier, promesses } of FILET) {
    for (const { quoi, motif } of promesses) {
      it(`${ecran} — ${quoi}`, () => {
        // On lit le texte AFFICHÉ : les commentaires citent souvent ces phrases, et les compter
        // ferait passer un écran qui ne les dit plus qu'à ses relecteurs.
        expect(sansCommentaires(source(fichier))).toMatch(motif)
      })
    }
  }
})

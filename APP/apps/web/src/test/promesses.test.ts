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

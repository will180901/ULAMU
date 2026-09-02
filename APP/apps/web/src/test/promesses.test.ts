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

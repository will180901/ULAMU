/**
 * L'accord en nombre — chantier 36, 03/09/2026.
 *
 * ── Ce qui l'a rendu nécessaire ───────────────────────────────────────────────────────────────
 *
 * Le tableau de bord affichait, EN LIGNE : « **1 consultations au total** ». Un balayage a montré
 * que douze chaînes de l'application écrivaient un nombre suivi d'un mot invariablement au pluriel.
 *
 * Le bon motif existait pourtant déjà dans le dépôt — `${n} code${n > 1 ? 's' : ''}` — mais recopié
 * à la main, donc appliqué de façon inégale. Une règle qu'on recopie est une règle qu'on oublie.
 *
 * ── Le piège que ce fichier existe pour verrouiller ───────────────────────────────────────────
 *
 * **En français, zéro prend le SINGULIER.** « 0 consultation », jamais « 0 consultations ».
 *
 * C'est là que la bascule se joue : un anglophone, ou une bibliothèque d'internationalisation
 * réglée par défaut, écrit `n === 1 ? '' : 's'` — correct en anglais (« 0 items »), faux ici. Le
 * jour où quelqu'un « corrigera » ce seuil en croyant bien faire, ce test tombera.
 */
import { describe, expect, it } from 'vitest'
import { accord } from '@/lib/accord'

describe('L’accord en nombre', () => {
  /*
    LE test de ce fichier. Il n'est pas là pour vérifier une évidence : il est là parce que la règle
    française et la règle anglaise divergent précisément sur zéro.
  */
  it('met zéro au SINGULIER — c’est la règle française, pas l’anglaise', () => {
    expect(accord(0, 'consultation')).toBe('consultation')
  })

  it('met un au singulier', () => {
    expect(accord(1, 'consultation')).toBe('consultation')
  })

  it('met deux et au-delà au pluriel', () => {
    expect(accord(2, 'consultation')).toBe('consultations')
    expect(accord(97, 'consultation')).toBe('consultations')
  })

  /*
    Le tableau de bord affiche des tendances négatives (« −1 par rapport au mois dernier »). C'est la
    quantité qui accorde, pas le signe : « −1 consultation », « −3 consultations ».
  */
  it('accorde sur la quantité, pas sur le signe', () => {
    expect(accord(-1, 'consultation')).toBe('consultation')
    expect(accord(-3, 'consultation')).toBe('consultations')
  })

  /*
    Les montants ne sont pas toujours entiers. 0,5 reste au singulier — « 0,5 heure » — et 1,5 aussi,
    l'usage voulant le singulier sous 2.
  */
  it('traite les décimales comme la langue les traite', () => {
    expect(accord(0.5, 'heure')).toBe('heure')
    expect(accord(1.5, 'heure')).toBe('heure')
    expect(accord(2.5, 'heure')).toBe('heures')
  })

  /*
    Le pluriel explicite : aucun cas irrégulier dans l'application aujourd'hui, mais la porte est
    ouverte pour qu'on n'ait pas à contourner la fonction le jour où il y en aura un.
  */
  it('accepte un pluriel irrégulier', () => {
    expect(accord(3, 'cheval', 'chevaux')).toBe('chevaux')
    expect(accord(1, 'cheval', 'chevaux')).toBe('cheval')
  })
})

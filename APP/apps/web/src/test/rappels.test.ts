/**
 * Les rappels refermables — chantier 110.
 *
 * Demande du porteur : *« une petite croix pour fermer, mais la notification revient pour rappel
 * dans une période si le problème notifié n'est pas encore résolu. »*
 *
 * Ce qui se vérifie ici est la règle, pas le dessin : **une tâche revient, un fait se ferme pour de
 * bon**, et le retour se resserre à mesure que l'échéance approche.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { delaiDeRetour, masquerRappel, oublierRappel, rappelMasque } from '@/lib/rappels'

const T0 = Date.UTC(2026, 8, 14, 9, 0, 0)

afterEach(() => {
  localStorage.clear()
})

describe('Un rappel qu’on ferme', () => {
  it('n’est pas masqué tant qu’on ne l’a pas fermé', () => {
    expect(rappelMasque('x', T0)).toBe(false)
  })

  /* Un FAIT : « cette consultation a été remboursée » ne se re-constate pas. */
  it('⚠️ fermé sans délai, il ne revient jamais', () => {
    masquerRappel('fait', undefined, T0)

    expect(rappelMasque('fait', T0)).toBe(true)
    expect(rappelMasque('fait', T0 + 10 * 365 * 24 * 3600_000)).toBe(true)
  })

  /* Une TÂCHE : « compte-rendu à déposer » revient tant qu'il n'est pas déposé. */
  it('⚠️ fermé avec un délai, il revient à l’heure dite — pas avant, pas jamais', () => {
    masquerRappel('tache', 3600, T0)

    expect(rappelMasque('tache', T0)).toBe(true)
    expect(rappelMasque('tache', T0 + 3599_000)).toBe(true)
    expect(rappelMasque('tache', T0 + 3600_000)).toBe(false)
  })

  it('et on peut le remettre à zéro quand la tâche est faite', () => {
    masquerRappel('tache', 3600, T0)
    oublierRappel('tache')

    expect(rappelMasque('tache', T0)).toBe(false)
  })

  /*
    ⚠️ **Une valeur illisible ne doit pas taire l'alerte.** Stockage trafiqué, ancienne version du
    format, extension curieuse : *entre oublier une alerte et la répéter, on répète.*
  */
  it('⚠️ une valeur abîmée en stock ne masque rien', () => {
    localStorage.setItem('ulamu.rappel.casse', 'n’importe quoi')

    expect(rappelMasque('casse', T0)).toBe(false)
  })
})

describe('Le délai de retour se resserre avec l’échéance', () => {
  /*
    Un rappel qui revient toutes les heures est une nuisance à vingt heures de l'échéance et une
    négligence à une heure. La moitié du temps restant règle les deux d'un coup.
  */
  it('⚠️ c’est la moitié du temps restant', () => {
    expect(delaiDeRetour(3 * 3600)).toBe(5400)
    expect(delaiDeRetour(2 * 3600)).toBe(3600)
    expect(delaiDeRetour(20 * 60)).toBe(600)
  })

  it('jamais moins d’une minute — sinon la croix ne servirait à rien', () => {
    expect(delaiDeRetour(30)).toBe(60)
    expect(delaiDeRetour(0)).toBe(60)
    expect(delaiDeRetour(-500)).toBe(60)
    expect(delaiDeRetour(Number.NaN)).toBe(60)
  })

  it('jamais plus de deux heures — au-delà, on l’aurait oublié pour de bon', () => {
    expect(delaiDeRetour(24 * 3600)).toBe(7200)
  })
})

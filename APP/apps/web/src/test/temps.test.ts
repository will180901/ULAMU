/**
 * Le temps écoulé — chantier 37, 03/09/2026.
 *
 * Les deux cas qui justifient le fichier : **le futur** (une horloge de poste en avance ne doit
 * jamais produire « il y a -1 min ») et **la bascule de minuit** (23 h peuvent enjamber la nuit,
 * auquel cas « hier » est juste et « il y a 1 jour » ne l'est pas).
 */
import { describe, expect, it } from 'vitest'
import { dateComplete, depuis } from '@/lib/temps'

/** Un instant fixe, pour que rien ne dépende de l'heure à laquelle le test tourne. */
const MAINTENANT = new Date(2026, 8, 3, 14, 30, 0) // 3 septembre 2026, 14 h 30, heure locale

/** Une date décalée de N millisecondes AVANT l'instant de référence. */
function ilYa(ms: number): string {
  return new Date(MAINTENANT.getTime() - ms).toISOString()
}

describe('Le temps écoulé', () => {
  it('dit « à l’instant » sous la minute', () => {
    expect(depuis(ilYa(0), MAINTENANT)).toBe('à l’instant')
    expect(depuis(ilYa(59_000), MAINTENANT)).toBe('à l’instant')
  })

  /*
    LE cas de sûreté. L'horloge du poste n'est pas celle du serveur : une notification peut arriver
    datée de trois secondes dans le futur. « il y a -1 min » ferait douter de tout l'écran.
  */
  it('ne montre jamais un délai négatif quand l’horloge du poste avance', () => {
    const futur = new Date(MAINTENANT.getTime() + 3_000).toISOString()
    expect(depuis(futur, MAINTENANT)).toBe('à l’instant')
  })

  it('compte en minutes sous l’heure, puis en heures sous la journée', () => {
    expect(depuis(ilYa(7 * 60_000), MAINTENANT)).toBe('il y a 7 min')
    expect(depuis(ilYa(59 * 60_000), MAINTENANT)).toBe('il y a 59 min')
    expect(depuis(ilYa(3 * 3_600_000), MAINTENANT)).toBe('il y a 3 h')
  })

  /*
    LA question tranchée par ce test — et il l'a d'abord tranchée CONTRE la première version écrite.

    20 h en arrière depuis 14 h 30, c'est la veille à 18 h 30. Deux règles se défendaient : dire
    « hier » parce que la date du calendrier a changé, ou dire « il y a 20 h » parce que c'est le
    délai réel. **C'est le délai qui gagne, et pour une raison métier** : une demande de consultation
    de vingt heures est perdue, celle de trois heures peut-être pas. « Hier » efface cette
    différence ; il oblige à regarder l'heure pour la retrouver.

    Le seuil est donc bien 24 h, et non minuit.
  */
  it('compte les heures jusqu’à 24 h, même quand la date du calendrier a changé', () => {
    expect(depuis(ilYa(20 * 3_600_000), MAINTENANT)).toBe('il y a 20 h')
  })

  it('dit « hier » au-delà de 24 h, tant qu’on est sur la veille', () => {
    expect(depuis(ilYa(30 * 3_600_000), MAINTENANT)).toBe('hier')
  })

  /*
    Le revers du même choix, à l'autre bout de la nuit. À 0 h 30, une notification de 23 h la veille
    n'a qu'une heure et demie : elle doit se lire « il y a 1 h ». Une règle fondée sur la date du
    calendrier dirait « hier » — techniquement vrai, et trompeur au point d'être inutile.
  */
  it('ne dit pas « hier » pour quelque chose reçu il y a une heure, passé minuit', () => {
    const nuit = new Date(2026, 8, 3, 0, 30, 0)
    const hierSoir = new Date(2026, 8, 2, 23, 0, 0).toISOString()
    expect(depuis(hierSoir, nuit)).toBe('il y a 1 h')
  })

  it('accorde les jours — et n’écrit donc jamais « 1 jours »', () => {
    expect(depuis(ilYa(2 * 86_400_000), MAINTENANT)).toBe('il y a 2 jours')
    expect(depuis(ilYa(6 * 86_400_000), MAINTENANT)).toBe('il y a 6 jours')
  })

  /*
    Au-delà d'une semaine, un décompte de jours n'aide plus : on veut la date. L'année n'apparaît
    que si ce n'est pas l'année en cours — la répéter alourdit sans rien apprendre.
  */
  it('bascule sur la date au-delà d’une semaine, sans l’année de l’année en cours', () => {
    expect(depuis(new Date(2026, 7, 12, 9, 0).toISOString(), MAINTENANT)).toBe('12 août')
    expect(depuis(new Date(2025, 10, 3, 9, 0).toISOString(), MAINTENANT)).toBe('3 novembre 2025')
  })

  /*
    Une date illisible n'affiche RIEN, jamais « Invalid Date » : c'est la règle du projet — une
    lecture qui échoue ne s'invente pas de valeur.
  */
  it('renvoie une chaîne vide sur une date illisible', () => {
    expect(depuis('pas-une-date', MAINTENANT)).toBe('')
    expect(dateComplete('pas-une-date')).toBe('')
  })

  it('donne la date complète pour l’infobulle', () => {
    expect(dateComplete(new Date(2026, 8, 3, 14, 7).toISOString())).toContain('3 septembre 2026')
  })
})

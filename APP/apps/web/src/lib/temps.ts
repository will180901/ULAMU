/**
 * Le temps écoulé, en français — chantier 37, 03/09/2026.
 *
 * ── Ce que ce fichier existe pour éviter ──────────────────────────────────────────────────────
 *
 * Une notification datée « 3 septembre 2026 à 14:07 » ne dit rien. Ce qu'un soignant lit, c'est
 * **l'ancienneté** : une demande de consultation d'il y a deux minutes et une d'il y a six heures
 * n'appellent pas le même geste — la seconde est probablement perdue.
 *
 * Le dépôt formatait déjà des dates, mais **à la main, une fonction par page** — sept copies de
 * `new Date(iso).toLocaleDateString('fr-FR', …)`. C'est le motif que le chantier 36 a condamné sur
 * les pluriels : une règle recopiée est une règle qui dérive. Celle-ci est écrite une fois.
 *
 * ── Les seuils, et pourquoi ceux-là ───────────────────────────────────────────────────────────
 *
 * • sous 1 min  → « à l'instant » — la seconde près n'apporte rien et fait clignoter l'écran ;
 * • sous 1 h    → « il y a 7 min » ;
 * • sous 24 h   → « il y a 3 h » ;
 * • hier        → « hier » — nommé, parce que « il y a 26 h » oblige à calculer ;
 *
 * **Le seuil est 24 h, et non minuit** — et c'est le test qui l'a tranché contre la première version.
 * À 14 h 30, une notification de la veille à 18 h 30 se lit « il y a 20 h » et non « hier » : pour un
 * soignant, une demande de vingt heures est perdue, celle de trois heures peut-être pas. Et à 0 h 30,
 * une notification de 23 h la veille n'a qu'une heure et demie — la dire « hier » serait exact et
 * inutile.
 * • sous 7 j    → « il y a 4 jours » ;
 * • au-delà     → la date en toutes lettres, avec l'année si elle n'est pas l'année en cours.
 *
 * ── Deux pièges de langue, verrouillés par le test ────────────────────────────────────────────
 *
 * **Le futur.** L'horloge d'un poste peut avancer sur celle du serveur ; une date « dans 3 s »
 * afficherait alors « il y a -1 min ». On rabat donc tout futur sur « à l'instant » : mieux vaut
 * une imprécision d'une minute qu'un nombre négatif qui donne l'air d'un logiciel cassé.
 *
 * **L'accord.** « il y a 1 jour », « il y a 2 jours » — même règle qu'ailleurs, donc `accord()`,
 * et surtout pas un `s` codé en dur de plus.
 */
import { accord } from '@/lib/accord'

const MINUTE = 60_000
const HEURE = 60 * MINUTE
const JOUR = 24 * HEURE

/** Minuit du jour de cette date, dans le fuseau du poste — pour distinguer « hier » de « il y a 20 h ». */
function minuit(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * L'ancienneté d'une date ISO, telle qu'on la lit à voix haute.
 *
 * `maintenant` est un paramètre pour que le test soit reproductible — jamais passé en production.
 * Une date illisible renvoie une chaîne vide : l'appelant n'affiche alors rien, plutôt qu'un
 * « Invalid Date » qui ferait douter de tout le reste de l'écran.
 */
export function depuis(iso: string, maintenant: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const ecart = maintenant.getTime() - d.getTime()
  // Horloge du poste en avance sur celle du serveur : on ne montre jamais un délai négatif.
  if (ecart < MINUTE) return 'à l’instant'

  if (ecart < HEURE) {
    const min = Math.floor(ecart / MINUTE)
    return `il y a ${min} min`
  }

  if (ecart < JOUR) {
    const h = Math.floor(ecart / HEURE)
    return `il y a ${h} h`
  }

  // Au-delà de 24 h, on raisonne en JOURS DE CALENDRIER : 23 h peuvent enjamber minuit, et
  // « il y a 1 jour » pour quelque chose reçu ce matin serait faux.
  const jours = Math.round((minuit(maintenant) - minuit(d)) / JOUR)
  if (jours <= 1) return 'hier'
  if (jours < 7) return `il y a ${jours} ${accord(jours, 'jour')}`

  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    // L'année n'apparaît que si elle n'est pas l'année en cours : la répéter alourdit sans informer.
    ...(d.getFullYear() === maintenant.getFullYear() ? {} : { year: 'numeric' }),
  })
}

/** La date complète, pour l'attribut `title` : l'ancienneté se lit d'un coup d'œil, la date se vérifie. */
export function dateComplete(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

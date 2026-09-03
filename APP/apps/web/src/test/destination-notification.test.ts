/**
 * Où mène une notification — chantier 37, 03/09/2026.
 *
 * Ce que ce fichier défend, dans l'ordre d'importance :
 *   1. qu'aucun lien ne mène un soignant vers un écran d'administration (ni l'inverse) ;
 *   2. que les deux familles qui se ressemblent — `m03.case.*`, `m13.*` — ne soient pas confondues ;
 *   3. que ce qui s'adresse au patient reste SANS lien, plutôt qu'avec un lien inventé ;
 *   4. que toute destination soit un écran réellement déclaré dans la navigation.
 */
import { describe, expect, it } from 'vitest'
import { destinationNotification } from '@/lib/destination-notification'
import { NAV_GROUPS } from '@/config/navigation.config'

/** Les modèles du catalogue serveur qui atteignent réellement un utilisateur du web. */
const MODELES_SOIGNANT = [
  'm06.handshake.initiated',
  'm06.handshake.confirmed',
  'm06.handshake.refused',
  'm06.handshake.expired',
  'm06.session.started',
  'm06.session.cancelled',
  'm06.message.received',
  'm06.report.reminder',
  'm06.report.overdue',
  'm06.followup.offered',
  'm13.earnings.credited',
  'm13.withdrawal.failed',
  'm13.receipt',
  'm03.agreement.reissued',
  'm03.case.decided',
]

describe('La destination d’une notification', () => {
  it('mène les demandes vers /demandes et les séances vers /consultations', () => {
    expect(destinationNotification('m06.handshake.initiated')?.href).toBe('/demandes')
    expect(destinationNotification('m06.session.started')?.href).toBe('/consultations')
    expect(destinationNotification('m06.message.received')?.href).toBe('/consultations')
    expect(destinationNotification('m06.report.overdue')?.href).toBe('/consultations')
  })

  it('mène l’argent du soignant vers ses gains', () => {
    expect(destinationNotification('m13.earnings.credited')?.href).toBe('/gains')
    expect(destinationNotification('m13.withdrawal.failed')?.href).toBe('/gains')
  })

  /*
    LE piège de ce fichier. Deux clés voisines, deux destinataires opposés :
      • « votre dossier a été décidé » part au SOIGNANT → sa page de vérification ;
      • « un dossier a été déposé » part à l'ADMINISTRATION → la file de vérification.
    Un préfixe `m03.` seul enverrait un médecin sur la file d'instruction de la plateforme.
  */
  it('ne confond pas le dossier DU soignant avec la file de l’administration', () => {
    expect(destinationNotification('m03.case.decided')?.href).toBe('/verification')
    expect(destinationNotification('m03.agreement.reissued')?.href).toBe('/verification')
    expect(destinationNotification('m03.case.submitted')?.href).toBe('/admin/verification')
  })

  /* Même piège côté argent : l'écart de rapprochement est un sujet de finance, pas de gains. */
  it('ne confond pas les gains d’un soignant avec le rapprochement de la plateforme', () => {
    expect(destinationNotification('m13.reconciliation.gap')?.href).toBe('/admin/finance')
  })

  /*
    Le cloisonnement, éprouvé en capacités et non en chemins : une destination d'administration ne
    doit JAMAIS être ouverte par `professional`, et réciproquement.
  */
  it('n’ouvre jamais un écran d’administration à un soignant', () => {
    for (const modele of MODELES_SOIGNANT) {
      const d = destinationNotification(modele)
      expect(d, modele).not.toBeNull()
      expect(d?.capabilities, modele).toContain('professional')
      expect(d?.href.startsWith('/admin/'), modele).toBe(false)
    }
  })

  it('n’ouvre jamais un écran de soignant à un administrateur', () => {
    for (const modele of ['m03.case.submitted', 'm13.reconciliation.gap', 'm04.report.resolved']) {
      const d = destinationNotification(modele)
      expect(d?.capabilities, modele).not.toContain('professional')
    }
  })

  /*
    Les signalements sont ouverts par la navigation à `admin:verification` ET au super-admin. La
    première version de la carte recopiait cette liste à la main, et l'avait réduite au seul
    super-admin : un administrateur de vérification aurait reçu une notification sans lien vers un
    écran qui lui est pourtant ouvert. Les capacités sont désormais LUES dans la navigation.
  */
  it('emprunte ses capacités à la navigation, sans les recopier', () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === '/admin/signalements')
    expect(destinationNotification('m04.report.resolved')?.capabilities).toEqual([...item!.capabilities])
  })

  /*
    Ce qui s'adresse au patient n'a pas d'écran ici — le patient vit sur mobile (D-039/D-044).
    `null` est la bonne réponse : un lien inventé vaudrait moins que pas de lien du tout.
  */
  it('ne fabrique aucun lien pour ce qui s’adresse au patient', () => {
    for (const modele of [
      'm05.pro.available',
      'm07.entry.added',
      'm07.record.transferred.to',
      'm09.prescription.sealed',
      'm09.prescription.expired',
    ]) {
      expect(destinationNotification(modele), modele).toBeNull()
    }
  })

  /* Trois cas sans destination pour des raisons propres — voir l'en-tête du fichier. */
  it('laisse sans lien ce qui n’a nulle part où mener', () => {
    expect(destinationNotification('m16.account.suspended')).toBeNull()
    expect(destinationNotification('m16.account.banned')).toBeNull()
    expect(destinationNotification('m06.report.overdue.admin')).toBeNull()
    expect(destinationNotification('m02.member.suspended')).toBeNull()
  })

  it('reste muette sur un modèle inconnu plutôt que de deviner', () => {
    expect(destinationNotification('m99.inconnu')).toBeNull()
    expect(destinationNotification('')).toBeNull()
  })

  /*
    L'invariant de fond : toute destination produite doit être un écran RÉELLEMENT déclaré dans la
    navigation. Le jour où une route est renommée, ce test tombe — et non l'utilisateur.
  */
  it('ne mène que vers des écrans déclarés dans la navigation', () => {
    const connus = new Set(NAV_GROUPS.flatMap((g) => g.items).map((i) => i.href))
    for (const modele of [...MODELES_SOIGNANT, 'm03.case.submitted', 'm13.reconciliation.gap', 'm04.report.resolved']) {
      const d = destinationNotification(modele)
      expect(connus.has(d!.href), `${modele} → ${d!.href}`).toBe(true)
    }
  })
})

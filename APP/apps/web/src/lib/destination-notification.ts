/**
 * Où mène une notification — chantier 37, 03/09/2026.
 *
 * ── Le manque que ce fichier comble ───────────────────────────────────────────────────────────
 *
 * Une notification qui dit « Nouvelle demande de consultation » sans y mener oblige le lecteur à
 * refaire le chemin de tête, puis à chercher la ligne dans la page. C'est exactement le geste qu'on
 * lui promettait d'éviter en le prévenant.
 *
 * Le serveur sert déjà, avec chaque notification, la clé de son modèle (`m06.handshake.initiated`,
 * `m13.withdrawal.failed`…). Cette clé DIT le sujet. Ce fichier la traduit en écran.
 *
 * ── Les capacités ne sont PAS écrites ici, elles sont lues ────────────────────────────────────
 *
 * Première version de ce fichier : chaque destination portait sa liste de capacités, recopiée à la
 * main. Le test l'a prise en défaut avant même d'être écrit — `/admin/signalements` y était réservé
 * au super-administrateur, alors que la navigation l'ouvre aussi à `admin:verification`. Un
 * administrateur de vérification aurait reçu une notification muette vers un écran qui lui est
 * pourtant ouvert.
 *
 * La règle du chantier 36 s'applique telle quelle : **une règle recopiée est une règle qui dérive.**
 * `NAV_GROUPS` sait déjà qui a le droit d'ouvrir quoi ; on l'interroge, on ne le redit pas.
 *
 * Conséquence voulue : **un écran absent de la navigation n'est jamais lié.** Si personne ne peut
 * l'atteindre par le menu, une notification ne doit pas y mener non plus.
 *
 * ── Pourquoi tant de modèles n'ont AUCUNE destination, et que c'est juste ─────────────────────
 *
 * Sur les 49 modèles du catalogue, une bonne moitié s'adresse au PATIENT (`m05.pro.available`,
 * `m07.*` — son dossier, `m09.prescription.*` — ses ordonnances). Le patient vit sur mobile
 * (D-039/D-044) : ces écrans n'existent pas dans le web, et **inventer un lien vaudrait moins que
 * n'en pas mettre**. La notification reste lisible, elle n'est simplement pas cliquable.
 *
 * Trois autres cas restent volontairement sans lien :
 *   • `m16.account.suspended` / `.banned` — un compte suspendu ne se connecte plus ; le lien serait
 *     mort par construction ;
 *   • `m06.report.overdue.admin` — l'administration n'a pas d'écran de sessions ; la notification
 *     l'informe sans avoir où l'emmener ;
 *   • `m02.*` — les structures sont sorties du produit le 02/09 (chantier 25).
 */
import { NAV_GROUPS } from '@/config/navigation.config'
import type { Capability } from '@/hooks/useCapabilities'

export interface DestinationNotification {
  href: string
  /** Lues dans `NAV_GROUPS` : le lien ne s'affiche que si l'utilisateur a l'une d'elles. */
  capabilities: Capability[]
}

/**
 * Clés explicitement SANS destination, examinées en tout premier.
 *
 * Cette liste n'est pas une commodité : sans elle, `m06.report.overdue.admin` tombe dans le préfixe
 * `m06.report.` et emmène vers les consultations d'un soignant. C'est précisément la faute que la
 * réécriture de ce fichier a réintroduite, et que le test a rattrapée.
 *
 * La règle : **une exception nommée passe avant toute règle générale.**
 */
const SANS_LIEN = new Set([
  // Pendant « supervision » du retard de compte-rendu : l'administration n'a pas d'écran de sessions.
  'm06.report.overdue.admin',
])

/**
 * Clés EXACTES, examinées avant les préfixes.
 *
 * `m03.case.submitted` part à l'administration (« un dossier vous attend ») alors que le reste de
 * la famille `m03.case.*` part au soignant (« votre dossier a été décidé ») : un préfixe seul les
 * confondrait, et enverrait un médecin sur la file de vérification.
 */
const EXACTES: Record<string, string> = {
  'm03.case.submitted': '/admin/verification',
  'm13.reconciliation.gap': '/admin/finance',
}

/**
 * Préfixes, du plus précis au plus général — le PREMIER qui correspond gagne.
 *
 * L'ordre compte : `m06.report.` est lu avant un éventuel `m06.` général, si un jour ils divergent.
 */
const PREFIXES: Array<[string, string]> = [
  // M06 — les demandes d'un côté, les consultations de l'autre : ce ne sont pas les mêmes écrans.
  ['m06.handshake.', '/demandes'],
  ['m06.session.', '/consultations'],
  ['m06.message.', '/consultations'],
  ['m06.report.', '/consultations'],
  ['m06.followup.', '/consultations'],
  ['m06.payment.', '/consultations'],
  // M13 — l'argent du soignant : reçus, gains crédités, retraits.
  ['m13.', '/gains'],
  // M03 — le dossier de vérification du soignant, et son contrat d'adhésion.
  ['m03.', '/verification'],
  // M04 — modération : uniquement l'administration.
  ['m04.', '/admin/signalements'],
]

/** Les capacités que la navigation exige pour cet écran — `null` si l'écran n'y figure pas. */
function capacitesDeLaNavigation(href: string): Capability[] | null {
  for (const groupe of NAV_GROUPS) {
    const item = groupe.items.find((i) => i.href === href)
    if (item) return [...item.capabilities]
  }
  return null
}

/**
 * L'écran que cette notification concerne — ou `null` s'il n'en existe aucun dans le web.
 *
 * `null` n'est pas un échec : c'est la réponse juste pour tout ce qui s'adresse au patient.
 */
export function destinationNotification(template: string): DestinationNotification | null {
  if (SANS_LIEN.has(template)) return null

  const href =
    EXACTES[template] ?? PREFIXES.find(([prefixe]) => template.startsWith(prefixe))?.[1] ?? null
  if (!href) return null

  const capabilities = capacitesDeLaNavigation(href)
  // Un écran hors navigation n'est atteignable par personne : on ne fabrique pas de lien vers lui.
  return capabilities ? { href, capabilities } : null
}

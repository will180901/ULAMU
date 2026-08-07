/**
 * Initiales d'un compte, pour les avatars.
 *
 * Dans un fichier à part et non à côté du composant `Avatar` : mélanger un export de fonction et un
 * export de composant casse le rafraîchissement à chaud de Vite (le module entier est rechargé au
 * lieu du seul composant). Le linter le signale, et il a raison.
 */

/** Deux lettres au maximum : « Amara Konaté » → AK, « pharma.demo » → PH. */
export function initialsOf(firstName?: string | null, lastName?: string | null, username?: string | null): string {
  const f = firstName?.trim()
  const l = lastName?.trim()
  if (f || l) return ((f?.[0] ?? '') + (l?.[0] ?? '')).toUpperCase() || '·'
  // Repli sur le nom d'utilisateur : un compte de structure n'a pas toujours d'état civil renseigné,
  // et afficher « ? » à quelqu'un qui s'est bien inscrit est un aveu de bogue, pas une information.
  const u = username?.trim().replace(/[^a-zA-Z0-9]/g, '')
  return u ? u.slice(0, 2).toUpperCase() : '·'
}

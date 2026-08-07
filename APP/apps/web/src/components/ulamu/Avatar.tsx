/**
 * Avatar à initiales — CG-06 §01/§02 (bloc utilisateur de la barre latérale, avatar 30px de la topbar).
 *
 * Les initiales sont dérivées du prénom + nom, avec repli sur le nom d'utilisateur : un compte de
 * structure n'a pas toujours d'état civil renseigné, et afficher « ? » à quelqu'un qui s'est bien
 * inscrit est un aveu de bogue, pas une information.
 */
import { ROLE_META } from '@/config/navigation.config'
import { initialsOf } from '@/lib/initials'

export interface AvatarProps {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  /** Colore le pastillage selon le rôle (tons CG-01). Sans lui, gris neutre. */
  accountType?: string | null
  size?: number
  className?: string
}

export function Avatar({ firstName, lastName, username, accountType, size = 32, className }: AvatarProps) {
  const meta = accountType ? ROLE_META[accountType] : undefined
  return (
    <span
      className={['ul-avatar', className].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: size,
        // Taille de police proportionnelle : une initiale doit occuper ~40 % du cercle quelle que
        // soit la taille demandée, sinon elle flotte ou déborde.
        fontSize: Math.round(size * 0.4),
        background: meta?.bg,
        color: meta?.text,
      }}
      aria-hidden="true"
    >
      {initialsOf(firstName, lastName, username)}
    </span>
  )
}

/**
 * États d'écran — chargement, lenteur, erreur, hors-ligne, vide. CG-08 §05/§06 et CG-11.
 *
 * Trois règles de la charte gouvernent ce fichier, et aucune n'est décorative :
 *
 *  1. **« Spinner sans arrêt — toujours une durée maximale définie »** (CG-08 §06). Un rond qui tourne
 *     indéfiniment n'informe de rien et fait désinstaller les applications. Ici, passé un seuil, le
 *     message change de lui-même et propose une sortie. C'est d'autant plus nécessaire qu'ULAMU est
 *     hébergé sur une offre qui **met le serveur en veille** : le premier appel après un moment
 *     d'inactivité prend jusqu'à une minute. L'app mobile résout déjà ce problème avec
 *     `useSlowRequest` ; le web doit dire la même chose à l'utilisateur, sinon les deux plateformes
 *     mentent différemment.
 *
 *  2. **« Empty state sans action — toujours proposer une sortie »** (CG-08 §06). L'action est donc
 *     un paramètre requis, pas optionnel : le type interdit d'oublier.
 *
 *  3. **« Alert inline sans icône — couleur seule insuffisante pour l'accessibilité »** (CG-08 §06,
 *     et CG-11). Chaque état porte une icône ET un texte, jamais une teinte seule.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Loader2, WifiOff } from 'lucide-react'
import { Button } from './Button'

/** Seuil au-delà duquel on cesse de faire tourner un rond en silence (CG-08 §06). */
const SLOW_AFTER_MS = 4000

export function LoadingState({ label = 'Chargement…', onRetry }: { label?: string; onRetry?: () => void }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="ul-state" role="status" aria-live="polite">
      <Loader2 size={22} className="ul-state__spin" aria-hidden="true" />
      <p className="ul-state__title">{slow ? 'C’est plus long que d’habitude' : label}</p>
      {slow ? (
        <>
          <p className="ul-state__desc">
            Le serveur se réveille — cela peut prendre jusqu’à une minute après une période d’inactivité.
          </p>
          {onRetry ? (
            <Button variant="ghost" onClick={onRetry}>
              Réessayer maintenant
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = 'Impossible d’afficher cette page',
  description = 'Une erreur est survenue. Vos données ne sont pas perdues.',
  onRetry,
}: {
  title?: string
  description?: ReactNode
  onRetry?: () => void
}) {
  return (
    <div className="ul-state ul-state--error" role="alert">
      <AlertTriangle size={22} aria-hidden="true" />
      <p className="ul-state__title">{title}</p>
      <p className="ul-state__desc">{description}</p>
      {onRetry ? <Button onClick={onRetry}>Réessayer</Button> : null}
    </div>
  )
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="ul-state" role="alert">
      <WifiOff size={22} aria-hidden="true" />
      <p className="ul-state__title">Vous êtes hors ligne</p>
      <p className="ul-state__desc">
        Cette application a besoin du réseau : les dossiers médicaux ne sont jamais conservés sur ce poste.
      </p>
      {onRetry ? <Button onClick={onRetry}>Réessayer</Button> : null}
    </div>
  )
}

/**
 * État vide. `action` est **requis** — CG-08 interdit un état vide sans sortie, et le rendre
 * optionnel reviendrait à autoriser l'oubli au premier moment de fatigue.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  bordered = true,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action: ReactNode
  bordered?: boolean
}) {
  return (
    <div className={['ul-state', bordered ? 'ul-state--bordered' : ''].filter(Boolean).join(' ')}>
      {icon ? <div className="ul-state__tile">{icon}</div> : null}
      <p className="ul-state__title">{title}</p>
      {description ? <p className="ul-state__desc">{description}</p> : null}
      {action}
    </div>
  )
}

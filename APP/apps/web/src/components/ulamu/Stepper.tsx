/**
 * Indicateur d'étapes — cercles reliés, remplis pour ce qui est franchi.
 *
 * Ajout par rapport à la version précédente : l'**accessibilité**. Le composant n'annonçait rien —
 * un lecteur d'écran voyait des chiffres et des traits sans savoir qu'il s'agissait d'une
 * progression, ni où l'on en était. Une inscription professionnelle en cinq étapes devient alors
 * impossible à suivre sans voir l'écran. On expose donc une liste ordonnée, l'étape courante via
 * `aria-current`, et un résumé lisible « Étape 3 sur 5 : Sécurité ».
 */
import { Check } from 'lucide-react'

export function Stepper({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  const courante = steps[currentIndex]

  return (
    <div className="ul-steps">
      {/* Résumé textuel réservé aux lecteurs d'écran : les cercles sont un raccourci VISUEL, ils ne
          remplacent pas l'information. */}
      <p className="sr-only" role="status">
        Étape {currentIndex + 1} sur {steps.length}
        {courante ? ` : ${courante}` : ''}
      </p>

      <ol className="ul-steps__row" aria-hidden="true">
        {steps.map((label, i) => {
          const atteinte = i <= currentIndex
          const faite = i < currentIndex
          return (
            <li className="ul-steps__cell" key={label}>
              <span className={['ul-steps__dot', atteinte ? 'is-reached' : ''].filter(Boolean).join(' ')}>
                {faite ? <Check size={13} /> : i + 1}
              </span>
              <span
                className={[
                  'ul-steps__bar',
                  faite ? 'is-done' : '',
                  i === steps.length - 1 ? 'is-last' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            </li>
          )
        })}
      </ol>

      <div className="ul-steps__labels" aria-hidden="true">
        {steps.map((label, i) => (
          <span
            key={label}
            className={[
              'ul-steps__label',
              i <= currentIndex ? 'is-reached' : '',
              i === currentIndex ? 'is-current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

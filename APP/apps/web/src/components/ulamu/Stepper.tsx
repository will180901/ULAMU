/** Indicateur d'étape — cercles reliés par un trait, rempli d'accent pour l'étape faite/active. */
import { Check } from 'lucide-react'

type StepState = 'done' | 'active' | 'upcoming'

function circleStyle(state: StepState): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    background: state === 'upcoming' ? 'var(--fond-surface-2)' : 'var(--ap-400)',
    color: state === 'upcoming' ? 'var(--texte-tertiaire)' : '#FFFFFF',
    border: state === 'upcoming' ? '1px solid var(--bordure-normale)' : 'none',
    transition: 'background 0.2s ease, color 0.2s ease',
  }
}

export function Stepper({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div style={{ marginBottom: 'var(--espace-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((_, i) => {
          const state: StepState = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming'
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={circleStyle(state)}>{state === 'done' ? <Check size={13} /> : i + 1}</div>
              <div
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  marginInline: 4,
                  background: i < steps.length - 1 ? (i < currentIndex ? 'var(--ap-400)' : 'var(--bordure-normale)') : 'transparent',
                  transition: 'background 0.2s ease',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {steps.map((label, i) => (
          <div
            key={label}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 'var(--font-size-caption)',
              fontWeight: i === currentIndex ? 700 : 500,
              color: i <= currentIndex ? 'var(--texte-primaire)' : 'var(--texte-tertiaire)',
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

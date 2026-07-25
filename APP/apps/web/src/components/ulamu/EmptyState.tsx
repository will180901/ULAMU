/** État vide — icône (tuile 48px) + titre + description + action, §7.8. 2 variantes : encadrée (par défaut) ou nue. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  bordered = true,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  bordered?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--espace-3)',
        padding: 'var(--espace-10)',
        borderRadius: 'var(--radius-xl)',
        border: bordered ? '1px dashed var(--bordure-normale)' : 'none',
        background: bordered ? 'var(--fond-surface-2)' : 'transparent',
      }}
    >
      {icon ? (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--fond-surface)',
            color: 'var(--texte-tertiaire)',
          }}
        >
          {icon}
        </div>
      ) : null}
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-h4)', fontWeight: 600, color: 'var(--texte-primaire)' }}>{title}</div>
      {description ? (
        <div style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)', maxWidth: 400 }}>{description}</div>
      ) : null}
      {action}
    </div>
  )
}

/** En-tête de page — icône dans une tuile teintée + titre + sous-titre + action. */
export function PageHeader({
  icon,
  tone = 'bleu',
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode
  tone?: 'rose' | 'violet' | 'bleu' | 'emeraude' | 'cyan' | 'ambre'
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--espace-4)', marginBottom: 'var(--espace-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)' }}>
        {icon ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `var(--ton-${tone}-fond)`,
              border: `1px solid var(--ton-${tone}-bordure)`,
              color: `var(--ton-${tone}-icone)`,
            }}
          >
            {icon}
          </div>
        ) : null}
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', color: 'var(--texte-primaire)', margin: 0 }}>{title}</h1>
          {subtitle ? <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)', margin: '2px 0 0' }}>{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

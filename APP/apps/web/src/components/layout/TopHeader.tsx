/** Barre du haut — verre dépoli, horloge temps réel, badge chiffré (cohérence avec le chat mobile). */
import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'

export function TopHeader({ title }: { title: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="saris-grain-fine"
      style={{
        height: 'var(--layout-topbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 'var(--espace-5)',
        background: 'var(--glass-header-bg)',
        backdropFilter: 'blur(var(--glass-header-blur))',
        borderBottom: '1px solid var(--glass-bordure)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--font-size-h2)', color: 'var(--texte-primaire)', margin: 0 }}>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)' }}>
          <Lock size={11} /> chiffré
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-caption)', color: 'var(--texte-secondaire)' }}>
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </header>
  )
}

/**
 * Coquille des pages d'authentification (connexion/inscription/mot de passe oublié) — UNE carte
 * centrée horizontale+verticale, largeur moyenne, hauteur raisonnable. Zone gauche : le carrousel de
 * l'app mobile, repris à l'identique (cf. AuthCarousel — mêmes images, mêmes trajectoires, mêmes
 * textes), en remplacement de l'ancienne « fumée » propre au web. Zone droite : mot "ULAMU" seul
 * (sans icône) + sous-texte + le formulaire de la page.
 */
import { AuthCarousel } from '@/components/layout/AuthCarousel'
import { Logo } from '@/components/ulamu/Logo'

export function AuthLayout({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div
      className="saris-grain-strong"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--fond-page)',
        padding: 'var(--espace-5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 880,
          maxWidth: '100%',
          height: 580,
          maxHeight: '90vh',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--ombre-3)',
          border: '1px solid var(--bordure-legere)',
        }}
      >
        {/* Zone gauche — le carrousel de l'app mobile, à l'identique (mesh gradient + illustrations) */}
        <div style={{ position: 'relative', width: '42%', flexShrink: 0, overflow: 'hidden' }}>
          <AuthCarousel />
        </div>

        {/* Zone droite — ULAMU + formulaire */}
        <div
          style={{
            width: '58%',
            background: 'var(--fond-surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'var(--espace-8)',
            overflowY: 'auto',
          }}
        >
          <Logo size={34} />
          <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)', margin: '6px 0 var(--espace-6)' }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

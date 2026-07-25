/**
 * Coquille des pages d'authentification (connexion/inscription/mot de passe oublié) — UNE carte
 * centrée horizontale+verticale, largeur moyenne, hauteur raisonnable. Zone gauche : fumée animée
 * en boucle (formes pleines floutées, zéro dégradé CSS) + voile verre dépoli + grain, pour un effet
 * de profondeur. Zone droite : mot "ULAMU" seul (sans icône) + sous-texte + le formulaire de la page.
 */
type Blob = { size: number; top: string; left: string; color: string; opacity: number; blur: number; anim: string; duration: string; delay: string }

// 3 couches de profondeur bien différenciées : LOINTAIN = grand + très flou + pâle + un peu plus lent ;
// MOYEN = intermédiaire ; PROCHE = petit + net + vif + plus rapide. Étalées sur toute la zone (haut/
// milieu/bas, bords coupés). Vitesses resserrées (10-18s, 4 trajectoires à 4 arrêts chacune, cf. CSS) pour
// un mouvement "dans tous les sens" clairement perceptible à travers le rideau transparent, pas un simple
// aller-retour lent. Palette : bleu dominant (ap-400/500 + ton bleu) + touches violet/cyan — familles
// froides adjacentes sur le cercle chromatique, cohérentes avec l'accent, jamais gris-ardoise (ap-100/200).
const SMOKE_BLOBS: Blob[] = [
  // Lointain
  { size: 430, top: '-18%', left: '-28%', color: 'var(--ap-500)', opacity: 0.22, blur: 78, anim: 'ulamu-smoke-drift-c', duration: '18s', delay: '0s' },
  { size: 400, top: '62%', left: '48%', color: 'var(--ton-bleu-icone)', opacity: 0.20, blur: 74, anim: 'ulamu-smoke-drift-d', duration: '17s', delay: '-9s' },
  // Moyen
  { size: 280, top: '18%', left: '42%', color: 'var(--ton-violet-icone)', opacity: 0.30, blur: 48, anim: 'ulamu-smoke-drift-b', duration: '15s', delay: '-5s' },
  { size: 300, top: '76%', left: '-16%', color: 'var(--ap-500)', opacity: 0.32, blur: 50, anim: 'ulamu-smoke-drift-a', duration: '14s', delay: '-11s' },
  // Proche
  { size: 190, top: '42%', left: '2%', color: 'var(--ap-400)', opacity: 0.48, blur: 26, anim: 'ulamu-smoke-drift-c', duration: '11s', delay: '-3s' },
  { size: 170, top: '2%', left: '50%', color: 'var(--ton-cyan-icone)', opacity: 0.44, blur: 24, anim: 'ulamu-smoke-drift-b', duration: '10s', delay: '-6s' },
]

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
        {/* Zone gauche — fumée + verre + grain */}
        <div style={{ position: 'relative', width: '42%', flexShrink: 0, overflow: 'hidden', background: 'var(--fond-surface-2)' }}>
          {SMOKE_BLOBS.map((b, i) => (
            <div
              key={i}
              className="ulamu-smoke-blob"
              style={{
                position: 'absolute',
                width: b.size,
                height: b.size,
                top: b.top,
                left: b.left,
                borderRadius: '50%',
                background: b.color,
                opacity: b.opacity,
                filter: `blur(${b.blur}px)`,
                animation: `${b.anim} ${b.duration} ease-in-out ${b.delay} infinite`,
              }}
            />
          ))}
          <div
            className="saris-grain"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--glass-auth-bg)',
              backdropFilter: 'blur(var(--glass-auth-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-auth-blur))',
            }}
          />
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
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--texte-primaire)' }}>
            ULAMU
          </div>
          <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)', margin: '6px 0 var(--espace-6)' }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

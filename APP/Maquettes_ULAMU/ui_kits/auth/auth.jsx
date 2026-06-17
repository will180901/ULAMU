/* ULAMU — Authentification (M01). Expérience unifiée role-aware :
   panneau de marque immersif + sélection d'espace + formulaires adaptatifs.
   Sans mot de passe en priorité (téléphone/OTP), 2FA pour l'équipe ULAMU. */
const UA = window.ULAMUDesignSystem_d14300;
const { Button: AB, IconButton: AIB, Badge: ABD, Avatar: AAV, Input: AIN, Card: AC, Icon: AIcn, Banner: ABN, Switch: ASW, VerifiedBadge: AVB } = UA;

/* Logo ulamu (goutte + base) */
function AuthLogo({ size = 30, light }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: size, height: size, borderRadius: 'var(--radius-md)', background: light ? 'rgba(255,255,255,0.16)' : 'var(--accent-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: light ? '1px solid rgba(255,255,255,0.22)' : 'none' }}>
        <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: light ? 0.18 : 'var(--grain-btn)' }} />
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".94" /><rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".74" /></svg>
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.62, letterSpacing: '-0.5px', color: light ? '#fff' : 'var(--text-primary)' }}>ulamu</span>
    </span>
  );
}

/* ── Panneau de marque (gauche) — cobalt immersif, photo illustrative + preuves rotatives ── */
const IMG_HERO_D = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=1100&q=80&auto=format&fit=crop';
const PROOFS = [
  { icon: 'shield-check', big: 'Payez après la poignée de main', small: 'Aucun débit sans accord mutuel.' },
  { icon: 'file-medical', big: 'Votre dossier de santé, à vie', small: 'Consultations, ordonnances et résultats, à vous pour toujours.' },
  { icon: 'stethoscope', big: 'Des soignants vérifiés un à un', small: 'Diplômes contrôlés avant le badge bleu.' },
];

function BrandPanel() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % PROOFS.length), 4200);
    return () => clearInterval(t);
  }, []);
  const p = PROOFS[i];
  return (
    <div style={{ width: 496, flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'var(--accent-600)', display: 'flex', flexDirection: 'column', padding: '34px 40px 32px' }}>
      {/* Grain + halo */}
      <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.12, pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', top: -160, right: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: -200, left: -140, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.22), transparent 66%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ position: 'relative', flexShrink: 0 }}><AuthLogo size={30} light /></div>

      {/* Photo illustrative (l'utilisateur dépose son image) */}
      <div style={{ position: 'relative', marginTop: 26, flexShrink: 0 }}>
        <div style={{ position: 'relative', height: 212, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 12px 32px rgba(0,0,0,0.32)' }}>
          <image-slot id="ulamu-auth-hero" shape="rect" src={IMG_HERO_D} placeholder="Déposez une photo" style={{ display: 'block', width: '100%', height: '100%' }}></image-slot>
          {/* Voile cobalt pour lisibilité des puces */}
          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,40,90,0.55), transparent 52%)', pointerEvents: 'none' }} />
          {/* Puce flottante haut-gauche : consultation en cours */}
          <span style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 11px 6px 7px', borderRadius: 'var(--radius-full)', background: 'rgba(17,17,19,0.46)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-dot)', boxShadow: '0 0 8px var(--success-dot)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#fff' }}>Consultation en cours</span>
          </span>
          {/* Puce flottante bas-droite : soignant vérifié */}
          <span style={{ position: 'absolute', bottom: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.94)', boxShadow: 'var(--shadow-md)' }}>
            <AVB size="sm" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-600)' }}>Dr A. Konaté</span>
          </span>
        </div>
      </div>

      {/* Preuve rotative */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        <div key={i} style={{ animation: 'ulamu-fade-up var(--dur-slow) var(--ease-out)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 29, lineHeight: 1.12, letterSpacing: '-0.9px', color: '#fff', margin: 0, maxWidth: 360 }}>{p.big}</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.82)', marginTop: 12, maxWidth: 340 }}>{p.small}</p>
        </div>
        {/* Indicateur */}
        <div style={{ display: 'flex', gap: 7, marginTop: 18 }}>
          {PROOFS.map((_, k) => (
            <span key={k} style={{ width: k === i ? 24 : 7, height: 7, borderRadius: 4, background: k === i ? '#fff' : 'rgba(255,255,255,0.32)', transition: 'width var(--dur-base) ease-out' }} />
          ))}
        </div>
      </div>

      {/* Bandeau de confiance bas */}
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 18, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.16)' }}>
        {[['153', 'soignants vérifiés'], ['12 480', 'dossiers ouverts'], ['4,9★', 'satisfaction']].map(([v, l], k) => (
          <React.Fragment key={l}>
            {k > 0 && <span style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.16)' }} />}
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: '#fff', letterSpacing: '-0.4px' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.66)', marginTop: 1 }}>{l}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Fil d'étapes (style app pro) ── */
const STEPS = ['Rôle', 'Identité', 'Vérification', 'Accès'];
function AuthStepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step, current = n === step;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: done || current ? 'var(--accent-500)' : 'var(--bg-muted)',
                border: current ? '3px solid rgba(39,86,166,0.22)' : (done ? 'none' : '1px solid var(--border-default)'),
                color: done || current ? '#fff' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, transition: 'background var(--dur-base) linear' }}>
                {done ? <AIcn name="check" size={13} /> : n}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: current ? 600 : 500, color: current ? 'var(--text-primary)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span style={{ flex: 1, height: 2, margin: '0 6px', marginBottom: 18, borderRadius: 1, background: n < step ? 'var(--accent-500)' : 'var(--border-default)', transition: 'background var(--dur-base) linear' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Coquille de droite : en-tête (retour + thème) + fil d'étapes + contenu centré ── */
function FormShell({ onBack, children, footnote, step }) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* En-tête */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 28px', height: 64 }}>
        {onBack
          ? <button onClick={onBack} className="uha" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px 7px 9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-subtle)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              <AIcn name="arrow-left" size={15} />Retour
            </button>
          : <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Plateforme de soin ULAMU</span>}
        <span style={{ flex: 1 }} />
      </div>

      {/* Fil d'étapes */}
      {step != null && (
        <div style={{ flexShrink: 0, padding: '4px 56px 8px' }}>
          <div style={{ maxWidth: 392, margin: '0 auto' }}><AuthStepper step={step} /></div>
        </div>
      )}

      {/* Contenu */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 56px 24px' }}>
        <div style={{ width: '100%', maxWidth: 392, margin: '0 auto' }}>{children}</div>
      </div>

      {/* Pied */}
      <div style={{ flexShrink: 0, padding: '0 56px 22px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          <AIcn name="lock" size={12} />{footnote || 'Connexion chiffrée de bout en bout'}
        </div>
      </div>
    </div>
  );
}

/* ── Sélection de rôle ── */
const ROLES = [
  { id: 'patient', icon: 'user', label: 'Je suis patient', sub: 'Me soigner, suivre mon dossier médical', dest: 'App patient' },
  { id: 'soignant', icon: 'stethoscope', label: 'Je suis soignant', sub: 'Médecin, infirmier — mon cockpit de soin', dest: 'Cockpit professionnel' },
  { id: 'structure', icon: 'hospital', label: 'Une structure', sub: 'Pharmacie, laboratoire, clinique', dest: 'Espace structure' },
  { id: 'ulamu', icon: 'shield-check', label: 'Équipe ULAMU', sub: 'Supervision, vérification, litiges', dest: 'Back-office' },
];

function RoleCard({ r, onPick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={() => onPick(r.id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} className="uha"
      style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-lg)',
        border: `1px solid ${hov ? 'var(--accent-400)' : 'var(--border-default)'}`, background: hov ? 'var(--bg-subtle)' : 'var(--bg-base)',
        transform: hov ? 'translateY(-1px)' : 'none', boxShadow: hov ? 'var(--shadow-md)' : 'none', boxSizing: 'border-box', width: '100%' }}>
      <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? 'var(--accent-500)' : 'rgba(39,86,166,0.14)', color: hov ? '#fff' : 'var(--accent-300)', transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear', position: 'relative', overflow: 'hidden' }}>
        {hov && <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />}
        <AIcn name={r.icon} size={21} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.2px', color: 'var(--text-primary)' }}>{r.label}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{r.sub}</span>
      </span>
      <span style={{ color: hov ? 'var(--accent-400)' : 'var(--text-disabled)', display: 'inline-flex', flexShrink: 0, transform: hov ? 'translateX(2px)' : 'none', transition: 'transform var(--dur-fast) ease-out' }}>
        <AIcn name="chevron-right" size={18} />
      </span>
    </button>
  );
}

function RoleSelect({ onPick }) {
  return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-300)', marginBottom: 10 }}>Bienvenue</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 27, letterSpacing: '-0.7px', color: 'var(--text-primary)', margin: 0 }}>Accédez à votre espace</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 6 }}>Choisissez qui vous êtes — nous adaptons la suite.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ROLES.map(r => <RoleCard key={r.id} r={r} onPick={onPick} />)}
      </div>
    </div>
  );
}

/* ── Panneau illustration (droite) — carousel d'étapes du cœur métier ULAMU ── */
const D_JOURNEY = [
  { slug: 'communication', t: 'Trouvez un soignant vérifié', s: 'Diplômes contrôlés un à un avant le badge bleu.' },
  { slug: 'video-call', t: 'Consultez à distance', s: 'Au tarif annoncé, après la poignée de main.' },
  { slug: 'taking-notes', t: 'Recevez votre ordonnance', s: 'Signée, avec un QR de délivrance sécurisé.' },
  { slug: 'customer-support', t: 'Réservez vos médicaments', s: 'Trouvés et gardés dans une pharmacie proche.' },
  { slug: 'success', t: 'Votre dossier de santé, à vie', s: 'Gratuit et chiffré — rien que pour vous.' },
];
function IllustrationPanel() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % D_JOURNEY.length), 5000); return () => clearInterval(t); }, []);
  const s = D_JOURNEY[i];
  return (
    <div style={{ width: 540, flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'var(--bg-subtle)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', padding: '34px 44px 38px' }}>
      <span style={{ position: 'absolute', top: -140, right: -120, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(39,86,166,0.12), transparent 68%)', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: -160, left: -120, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(39,86,166,0.08), transparent 66%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AuthLogo size={24} />
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' }}><AIcn name="shield-check" size={13} />Le soin, simplement</span>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, padding: '14px 0' }}>
        <img key={s.slug} src={`https://illustrations.popsy.co/blue/${s.slug}.svg`} alt="" style={{ width: '84%', maxHeight: '100%', objectFit: 'contain', animation: 'ulamu-fade var(--dur-slow) ease-out' }} />
      </div>
      <div key={i} style={{ position: 'relative', minHeight: 86, animation: 'ulamu-fade-up var(--dur-moderate) ease-out' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0 }}>{s.t}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 7, lineHeight: 1.55, maxWidth: 360 }}>{s.s}</p>
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 7, marginTop: 20 }}>
        {D_JOURNEY.map((_, k) => (
          <span key={k} style={{ width: k === i ? 8 : 6, height: k === i ? 8 : 6, borderRadius: '50%', background: k === i ? 'var(--accent-500)' : 'var(--border-default)', transition: 'width var(--dur-base) ease-out, height var(--dur-base) ease-out, background var(--dur-base) linear' }} />
        ))}
      </div>
    </div>
  );
}

window.AuthLogo = AuthLogo;
window.AuthIllustrationPanel = IllustrationPanel;
window.AuthFormShell = FormShell;
window.AuthRoleSelect = RoleSelect;
window.AUTH_ROLES = ROLES;

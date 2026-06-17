/* ULAMU — Authentification mobile (M01). En-tête cobalt illustré + carte
   flottante. Role-aware léger (Patient sans mot de passe / Professionnel),
   OTP, inscription patient, mot de passe oublié, succès. Thème clair/sombre. */
const AM = window.ULAMUDesignSystem_d14300;
const { Button: MB, Input: MIN, Badge: MBD, Icon: MI, Banner: MBN, Switch: MSW, VerifiedBadge: MVB, Card: MC } = AM;

/* ── Cadre téléphone ── */
function StatusBar({ dark }) {
  const c = dark ? '#fff' : 'var(--text-primary)';
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', pointerEvents: 'none' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: c }}>09:41</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: c }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><rect x="0" y="6" width="3" height="5" rx="1" fill="currentColor"/><rect x="4.5" y="3.5" width="3" height="7.5" rx="1" fill="currentColor"/><rect x="9" y="1.5" width="3" height="9.5" rx="1" fill="currentColor" fillOpacity=".5"/><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" fillOpacity=".5"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><path d="M7.5 2.5c2 0 3.8.8 5.1 2.1l1-1.1A9 9 0 0 0 1.4 3.5l1 1.1A7 7 0 0 1 7.5 2.5z" fill="currentColor"/><path d="M7.5 6c1 0 2 .4 2.7 1.1l1-1.1a5.5 5.5 0 0 0-7.4 0l1 1.1A3.8 3.8 0 0 1 7.5 6z" fill="currentColor"/><circle cx="7.5" cy="9.3" r="1.4" fill="currentColor"/></svg>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ width: 22, height: 11, borderRadius: 3, border: `1px solid ${dark ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)'}`, padding: 1.5, display: 'inline-flex' }}><span style={{ flex: 1, background: c, borderRadius: 1 }} /></span>
          <span style={{ width: 1.5, height: 4, background: c, borderRadius: 1, opacity: 0.6 }} />
        </span>
      </span>
    </div>
  );
}

function MobileFrame({ statusDark, children }) {
  return (
    <div style={{ width: 412, height: 892, borderRadius: 44, overflow: 'hidden', background: '#000', border: '11px solid #0a0a0c', boxShadow: '0 40px 90px rgba(0,0,0,0.4)', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <StatusBar dark={statusDark} />
        <div className="noscroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>{children}</div>
        {/* Indicateur home */}
        <div style={{ position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)', width: 132, height: 5, borderRadius: 3, background: 'var(--text-primary)', opacity: 0.32, zIndex: 6 }} />
      </div>
    </div>
  );
}

/* Logo */
function MLogo({ light }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: light ? 'rgba(255,255,255,0.18)' : 'var(--accent-500)', border: light ? '1px solid rgba(255,255,255,0.24)' : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.16 }} />
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".94" /><rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".74" /></svg>
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px', color: light ? '#fff' : 'var(--text-primary)' }}>ulamu</span>
    </span>
  );
}

/* En-tête cobalt (bleed haut, coins bas arrondis) */
function CobaltHeader({ onBack, children, pb = 30 }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--accent-600)', borderRadius: '0 0 30px 30px', padding: `38px 22px ${pb}px`, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.12, pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', top: -120, right: -90, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {onBack
            ? <button onClick={onBack} className="uha" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><MI name="arrow-left" size={17} /></button>
            : <MLogo light />}
        </div>
        {children}
      </div>
    </div>
  );
}

/* Carte flottante (chevauche l'en-tête) */
function FloatCard({ children, mt = -22 }) {
  return (
    <div style={{ flex: 1, position: 'relative', zIndex: 2, marginTop: mt, background: 'var(--bg-base)', borderRadius: '26px 26px 0 0', boxShadow: '0 -8px 28px rgba(0,0,0,0.12)', padding: '24px 22px 30px', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

/* Étiquette de champ */
function FLabel({ children, hint, onHint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{children}</span>
      {hint && <button onClick={onHint} style={{ all: 'unset', marginLeft: 'auto', cursor: 'pointer', fontSize: 12, color: 'var(--text-accent)', fontWeight: 500 }}>{hint}</button>}
    </div>
  );
}

/* Champ mot de passe (œil) */
function PwdField({ value, onChange, onEnter }) {
  const [show, setShow] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 13, color: 'var(--text-tertiary)', display: 'inline-flex', pointerEvents: 'none' }}><MI name="lock" size={16} /></span>
      <input type={show ? 'text' : 'password'} value={value} placeholder="Votre mot de passe"
        onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{ width: '100%', height: 48, boxSizing: 'border-box', borderRadius: 'var(--radius-md)', border: `1px solid ${focus ? 'var(--accent-500)' : 'var(--border-default)'}`, background: 'var(--bg-base)', padding: '0 44px 0 36px', fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-primary)', outline: 'none', boxShadow: focus ? '0 0 0 3px rgba(39,86,166,0.18)' : 'none', transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear' }} />
      <button onClick={() => setShow(s => !s)} aria-label={show ? 'Masquer' : 'Afficher'} style={{ all: 'unset', position: 'absolute', right: 13, cursor: 'pointer', color: 'var(--text-tertiary)', display: 'inline-flex' }}><MI name={show ? 'eye-off' : 'eye'} size={16} /></button>
    </div>
  );
}

/* Champ générique 48px */
function Field({ icon, ...rest }) {
  return <MIN leftIcon={icon} style={{ height: 48, fontSize: 14.5 }} {...rest} />;
}

/* OTP 6 cases */
function OtpInput({ value, onChange, autofill }) {
  const refs = React.useRef([]);
  React.useEffect(() => {
    if (!autofill) return;
    onChange('');
    const code = '481902'.split('');
    const ids = code.map((d, i) => setTimeout(() => onChange(v => (v + d).slice(0, 6)), 850 + i * 300));
    return () => ids.forEach(clearTimeout);
  }, [autofill]);
  const setAt = (i, d) => { const a = value.split(''); a[i] = d; onChange(a.join('').slice(0, 6)); };
  const onKey = (i, e) => {
    if (e.key === 'Backspace') { e.preventDefault(); if (value[i]) setAt(i, ''); else if (i > 0) { setAt(i - 1, ''); refs.current[i - 1]?.focus(); } }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); setAt(i, e.key); if (i < 5) refs.current[i + 1]?.focus(); }
    else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e) => { e.preventDefault(); const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (d) { onChange(d); refs.current[Math.min(d.length, 5)]?.focus(); } };
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }} onPaste={onPaste}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const filled = !!value[i];
        return <input key={i} ref={el => refs.current[i] = el} inputMode="numeric" maxLength={1} value={value[i] || ''} onChange={() => {}} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()}
          style={{ width: 48, height: 58, textAlign: 'center', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${filled ? 'var(--accent-500)' : 'var(--border-default)'}`, background: 'var(--bg-base)', fontFamily: 'var(--font-mono)', fontSize: 23, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', boxShadow: filled ? '0 0 0 3px rgba(39,86,166,0.14)' : 'none', transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear' }} />;
      })}
    </div>
  );
}

/* Segmenté Patient / Professionnel */
function RoleToggle({ role, onChange }) {
  const opts = [['patient', 'Patient', 'user'], ['pro', 'Professionnel', 'stethoscope']];
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', marginBottom: 18 }}>
      {opts.map(([id, label, ic]) => {
        const on = role === id;
        return (
          <button key={id} onClick={() => onChange(id)} className="uha" style={{ all: 'unset', cursor: 'pointer', flex: 1, height: 38, borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, background: on ? 'var(--bg-base)' : 'transparent', color: on ? 'var(--accent-600)' : 'var(--text-tertiary)', boxShadow: on ? 'var(--shadow-sm)' : 'none', transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear' }}>
            <MI name={ic} size={15} />{label}
          </button>
        );
      })}
    </div>
  );
}

/* Illustrations plates — Popsy (libres, attribution popsy.co ; l'utilisateur peut déposer la sienne) */
const IMG_HERO = 'https://illustrations.popsy.co/white/video-call.svg';
const IMG_REG = 'https://illustrations.popsy.co/white/communication.svg';

/* Illustration en-tête. bare = sans cadre, plein-largeur, fondu bas vers le cobalt */
function HeaderArt({ id, h = 150, placeholder, chip, src, bare, fit = 'cover' }) {
  if (bare) {
    return (
      <div style={{ position: 'relative', height: h, margin: '2px -22px 0' }}>
        <image-slot id={id} shape="rect" src={src} fit={fit} placeholder={placeholder} style={{ display: 'block', width: '100%', height: '100%', WebkitMaskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)' }}></image-slot>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', marginTop: 4 }}>
      <div style={{ position: 'relative', height: h, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 10px 26px rgba(0,0,0,0.26)' }}>
        <image-slot id={id} shape="rect" src={src} placeholder={placeholder} style={{ display: 'block', width: '100%', height: '100%' }}></image-slot>
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,40,90,0.5), transparent 56%)', pointerEvents: 'none' }} />
        {chip && (
          <span style={{ position: 'absolute', bottom: 11, left: 11, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.94)', boxShadow: 'var(--shadow-md)' }}>
            <MVB size="sm" /><span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-600)' }}>{chip}</span>
          </span>
        )}
      </div>
    </div>
  );
}

const fadeUp = { animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' };

/* ── Carousel d'étapes (mini-vidéo du cœur métier ULAMU) ── */
const JOURNEY = [
  { slug: 'communication', t: 'Trouvez un soignant vérifié' },
  { slug: 'video-call', t: 'Consultez à distance, au tarif annoncé' },
  { slug: 'taking-notes', t: 'Recevez votre ordonnance signée' },
  { slug: 'customer-support', t: 'Réservez vos médicaments tout près' },
  { slug: 'success', t: 'Votre dossier de santé, à vie' },
];
function StepCarousel({ color = 'white', h = 230 }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % JOURNEY.length), 5000); return () => clearInterval(t); }, []);
  const s = JOURNEY[i];
  return (
    <div>
      <div style={{ position: 'relative', height: h, margin: '0 -22px' }}>
        <img key={s.slug} src={`https://illustrations.popsy.co/${color}/${s.slug}.svg`} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', WebkitMaskImage: 'linear-gradient(to bottom, #000 56%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 56%, transparent 100%)', animation: 'ulamu-fade var(--dur-slow) ease-out' }} />
      </div>
      <h1 key={i} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, lineHeight: 1.2, letterSpacing: '-0.6px', color: '#fff', margin: '2px 0 0', minHeight: 56, animation: 'ulamu-fade-up var(--dur-moderate) ease-out' }}>{s.t}</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 14 }}>
        {JOURNEY.map((_, k) => (
          <span key={k} style={{ width: k === i ? 8 : 6, height: k === i ? 8 : 6, borderRadius: '50%', background: k === i ? '#fff' : 'rgba(255,255,255,0.36)', transition: 'width var(--dur-base) ease-out, height var(--dur-base) ease-out, background var(--dur-base) linear' }} />
        ))}
      </div>
    </div>
  );
}

/* ── Écran : Connexion ── */
function WelcomeScreen({ theme, onTheme, onSubmit, onForgot, onRegister, onPasswordless }) {
  const [role, setRole] = React.useState('patient');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const isPatient = role === 'patient';
  const ready = isPatient ? phone.replace(/\D/g, '').length >= 9 : (email.includes('@') && pwd.length >= 4);

  return (
    <>
      <CobaltHeader pb={28}>
        <StepCarousel color="white" h={236} />
      </CobaltHeader>

      <FloatCard>
        <div style={fadeUp}>
          <RoleToggle role={role} onChange={setRole} />
          {isPatient ? (
            <div>
              <FLabel>Numéro de téléphone</FLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 13px', height: 48, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--text-secondary)', flexShrink: 0 }}><MI name="phone" size={14} />+242</span>
                <Field placeholder="06 612 45 90" value={phone} type="tel" onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ready) onSubmit({ method: 'sms', dest: 'App patient' }); }} />
              </div>
              <div style={{ marginTop: 16 }}><MB variant="primary" fullWidth size="lg" iconLeft="send" disabled={!ready} onClick={() => onSubmit({ method: 'sms', dest: 'App patient' })}>Recevoir mon code</MB></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><FLabel>E-mail</FLabel><Field icon="mail" placeholder="nom@structure.cg" value={email} type="email" onChange={(e) => setEmail(e.target.value)} /></div>
              <div><FLabel hint="Oublié ?" onHint={onForgot}>Mot de passe</FLabel><PwdField value={pwd} onChange={setPwd} onEnter={() => ready && onSubmit({ method: 'pwd', dest: 'Cockpit professionnel' })} /></div>
              <MB variant="primary" fullWidth size="lg" iconLeft="arrow-right" disabled={!ready} onClick={() => onSubmit({ method: 'pwd', dest: 'Cockpit professionnel' })}>Se connecter</MB>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} /><span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ou</span><span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
              <button onClick={() => onPasswordless('Cockpit professionnel')} className="uha" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48, boxSizing: 'border-box', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-subtle)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}><MI name="send" size={15} />Recevoir un code à usage unique</button>
            </div>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', marginTop: 22 }}>
          {isPatient ? 'Nouveau sur ULAMU ? ' : 'Structure non référencée ? '}
          <button onClick={onRegister} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-accent)', fontWeight: 700 }}>{isPatient ? 'Créer un compte' : 'Demander un accès'}</button>
        </p>
      </FloatCard>
    </>
  );
}

/* ── Écran : OTP ── */
function OtpScreen({ theme, onTheme, flow, onBack, onVerify }) {
  const [otp, setOtp] = React.useState('');
  const [secs, setSecs] = React.useState(45);
  const is2fa = flow.method === '2fa';
  React.useEffect(() => { if (secs <= 0) return; const t = setTimeout(() => setSecs(s => s - 1), 1000); return () => clearTimeout(t); }, [secs]);
  const ready = otp.length === 6;
  React.useEffect(() => { if (ready) { const t = setTimeout(() => onVerify(flow), 420); return () => clearTimeout(t); } }, [ready]);
  return (
    <>
      <CobaltHeader theme={theme} onTheme={onTheme} onBack={onBack} pb={32}>
        <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}><MI name={is2fa ? 'shield-check' : 'message'} size={22} /></span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, letterSpacing: '-0.5px', color: '#fff', margin: '14px 0 0' }}>{is2fa ? 'Double authentification' : 'Entrez le code reçu'}</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 5 }}>{is2fa ? 'Code de votre application d\'authentification.' : 'Envoyé par SMS au +242 06 612 45 90'}</p>
      </CobaltHeader>
      <FloatCard>
        <div style={fadeUp}>
          <OtpInput value={otp} onChange={setOtp} autofill={!is2fa} />
          <div style={{ textAlign: 'center', margin: '18px 0 4px' }}>
            {!ready ? (is2fa ? <MBD tone="neutral" size="sm" icon="lock">En attente de votre saisie</MBD> : <MBD tone="neutral" dot size="sm">Réception du code en cours…</MBD>) : <MBD tone="success" size="sm" icon="check-circle">Code complet — vérification…</MBD>}
          </div>
          <div style={{ textAlign: 'center' }}>
            {secs > 0 ? <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Renvoyer dans <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{secs}s</span></span> : <button onClick={() => setSecs(45)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-accent)', fontWeight: 600 }}>Renvoyer le code</button>}
          </div>
        </div>
      </FloatCard>
    </>
  );
}

/* ── Écran : Inscription patient ── */
function RegisterScreen({ theme, onTheme, onBack, onSubmit, onLogin }) {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [agree, setAgree] = React.useState(true);
  const ready = name.trim() && phone.replace(/\D/g, '').length >= 9 && agree;
  return (
    <>
      <CobaltHeader theme={theme} onTheme={onTheme} onBack={onBack} pb={32}>
        <HeaderArt id="ulamu-authm-reg" bare fit="contain" h={170} src={IMG_REG} placeholder="Déposez une illustration" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.6px', color: '#fff', margin: '4px 0 0' }}>Créer mon compte</h1>
      </CobaltHeader>
      <FloatCard>
        <div style={{ ...fadeUp, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><FLabel>Prénom et nom</FLabel><Field icon="user" placeholder="Mireille Nkounkou" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <FLabel>Numéro de téléphone</FLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 13px', height: 48, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--text-secondary)', flexShrink: 0 }}><MI name="phone" size={14} />+242</span>
              <Field placeholder="06 612 45 90" value={phone} type="tel" onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ marginTop: 1 }}><MSW checked={agree} onChange={() => setAgree(a => !a)} /></span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>J'accepte que mes données de santé soient chiffrées et accessibles aux seuls soignants que je consulte.</span>
          </label>
          <MB variant="primary" fullWidth size="lg" iconLeft="send" disabled={!ready} onClick={() => onSubmit({ method: 'sms', dest: 'App patient' })}>Créer mon compte</MB>
        </div>
        <span style={{ flex: 1 }} />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', marginTop: 22 }}>Déjà membre ? <button onClick={onLogin} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-accent)', fontWeight: 700 }}>Se connecter</button></p>
      </FloatCard>
    </>
  );
}

/* ── Écran : Mot de passe oublié ── */
function ForgotScreen({ theme, onTheme, onBack }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  return (
    <>
      <CobaltHeader theme={theme} onTheme={onTheme} onBack={onBack} pb={32}>
        <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}><MI name={sent ? 'mail' : 'lock'} size={22} /></span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, letterSpacing: '-0.5px', color: '#fff', margin: '14px 0 0' }}>{sent ? 'Lien envoyé' : 'Mot de passe oublié'}</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 1.5 }}>{sent ? `Si un compte existe, un lien vient d'être envoyé à ${email}.` : 'Recevez un lien sécurisé pour en choisir un nouveau.'}</p>
      </CobaltHeader>
      <FloatCard>
        {sent ? (
          <div style={{ ...fadeUp }}>
            <MBN tone="success" title="Vérifiez votre boîte mail">Le lien expire dans 30 minutes.</MBN>
            <div style={{ marginTop: 16 }}><MB variant="secondary" fullWidth size="lg" iconLeft="arrow-left" onClick={onBack}>Revenir à la connexion</MB></div>
          </div>
        ) : (
          <div style={fadeUp}>
            <FLabel>Adresse e-mail</FLabel>
            <Field icon="mail" placeholder="nom@structure.cg" value={email} type="email" onChange={(e) => setEmail(e.target.value)} />
            <div style={{ marginTop: 16 }}><MB variant="primary" fullWidth size="lg" iconLeft="send" disabled={!email.includes('@')} onClick={() => setSent(true)}>Envoyer le lien</MB></div>
          </div>
        )}
      </FloatCard>
    </>
  );
}

/* ── Écran : Succès ── */
const M_DEST_ICON = { 'App patient': 'user', 'Cockpit professionnel': 'stethoscope' };
function SuccessScreen({ flow, onReplay, theme, onTheme }) {
  return (
    <>
      <CobaltHeader theme={theme} onTheme={onTheme} pb={40}>
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <span style={{ display: 'inline-flex', width: 66, height: 66, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', alignItems: 'center', justifyContent: 'center', animation: 'ulamu-pop var(--dur-slow) var(--ease-spring)' }}><MI name="check-circle" size={34} /></span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.6px', color: '#fff', margin: '16px 0 0' }}>Connexion réussie</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 5 }}>Bienvenue sur ULAMU.</p>
        </div>
      </CobaltHeader>
      <FloatCard>
        <div style={fadeUp}>
          <MC padding="14px 16px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', flexShrink: 0, background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><MI name={M_DEST_ICON[flow.dest] || 'arrow-right'} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Vous accédez à</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{flow.dest}</span><MVB size="sm" /></div>
              </div>
              <MBD tone="success" dot size="sm">Sécurisé</MBD>
            </div>
          </MC>
          <div style={{ marginTop: 16 }}><MB variant="primary" fullWidth size="lg" iconRight="arrow-right" onClick={onReplay}>Accéder à mon espace</MB></div>
          <button onClick={onReplay} style={{ all: 'unset', display: 'block', margin: '14px auto 0', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-tertiary)', textAlign: 'center', width: '100%' }}>Rejouer la démo</button>
        </div>
      </FloatCard>
    </>
  );
}

/* ── Contrôleur ── */
function AuthMobileApp() {
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [screen, setScreen] = React.useState('welcome');
  const [flow, setFlow] = React.useState({ method: 'sms', dest: 'App patient' });
  const toggleTheme = () => setThemeState(t => { const n = t === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('ulamu-theme', n); } catch (e) {} return n; });
  const common = { theme, onTheme: toggleTheme };

  let body;
  if (screen === 'welcome') body = <WelcomeScreen {...common}
    onSubmit={(f) => { setFlow(f); setScreen(f.method === 'pwd' ? 'success' : 'otp'); }}
    onPasswordless={(dest) => { setFlow({ method: 'sms', dest }); setScreen('otp'); }}
    onForgot={() => setScreen('forgot')} onRegister={() => setScreen('register')} />;
  else if (screen === 'otp') body = <OtpScreen {...common} flow={flow} onBack={() => setScreen('welcome')} onVerify={(f) => { setFlow(f); setScreen('success'); }} />;
  else if (screen === 'register') body = <RegisterScreen {...common} onBack={() => setScreen('welcome')} onSubmit={(f) => { setFlow(f); setScreen('otp'); }} onLogin={() => setScreen('welcome')} />;
  else if (screen === 'forgot') body = <ForgotScreen {...common} onBack={() => setScreen('welcome')} />;
  else body = <SuccessScreen {...common} flow={flow} onReplay={() => setScreen('welcome')} />;

  return <MobileFrame statusDark>{body}</MobileFrame>;
}

window.AuthMobileApp = AuthMobileApp;

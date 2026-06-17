/* ULAMU — Authentification (suite) : OTP, identifiants adaptatifs,
   mot de passe oublié, demande d'accès structure, succès + contrôleur racine. */
const UA2 = window.ULAMUDesignSystem_d14300;
const { Button: A2B, IconButton: A2IB, Badge: A2BD, Input: A2IN, Card: A2C, Icon: A2I, Banner: A2BN, Switch: A2SW, VerifiedBadge: A2VB } = UA2;
const A2_ROLES = window.AUTH_ROLES;

/* Titre de section réutilisable */
function Lead({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {kicker && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-300)', marginBottom: 10 }}>{kicker}</div>}
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.6px', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

/* Étiquette de champ */
function FieldLabel({ children, hint, onHint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{children}</span>
      {hint && <button onClick={onHint} style={{ all: 'unset', marginLeft: 'auto', cursor: 'pointer', fontSize: 12, color: 'var(--text-accent)', fontWeight: 500 }}>{hint}</button>}
    </div>
  );
}

/* ── OTP : 6 cases, collage, auto-avance, auto-réception démo ── */
function OtpInput({ value, onChange, autofill }) {
  const refs = React.useRef([]);
  React.useEffect(() => {
    if (!autofill) return;
    onChange('');
    const code = '481902'.split('');
    const ids = code.map((d, i) => setTimeout(() => onChange(v => (v + d).slice(0, 6)), 900 + i * 320));
    return () => ids.forEach(clearTimeout);
  }, [autofill]);

  const setAt = (i, d) => {
    const arr = value.split('');
    arr[i] = d;
    onChange(arr.join('').slice(0, 6));
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[i]) setAt(i, '');
      else if (i > 0) { setAt(i - 1, ''); refs.current[i - 1]?.focus(); }
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setAt(i, e.key);
      if (i < 5) refs.current[i + 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e) => {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (digits) { onChange(digits); refs.current[Math.min(digits.length, 5)]?.focus(); }
  };
  return (
    <div style={{ display: 'flex', gap: 9, justifyContent: 'space-between' }} onPaste={onPaste}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const filled = !!value[i];
        return (
          <input key={i} ref={el => refs.current[i] = el} inputMode="numeric" maxLength={1} value={value[i] || ''}
            onChange={() => {}} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()}
            style={{ width: 50, height: 60, textAlign: 'center', borderRadius: 'var(--radius-lg)',
              border: `1.5px solid ${filled ? 'var(--accent-500)' : 'var(--border-default)'}`,
              background: 'var(--bg-base)', fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)',
              outline: 'none', boxShadow: filled ? '0 0 0 3px rgba(39,86,166,0.14)' : 'none',
              transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear' }} />
        );
      })}
    </div>
  );
}

/* ── Champ mot de passe avec affichage + alerte Maj ── */
function PasswordField({ value, onChange, onEnter }) {
  const [show, setShow] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const [caps, setCaps] = React.useState(false);
  const border = focus ? 'var(--accent-500)' : 'var(--border-default)';
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 12, display: 'inline-flex', color: 'var(--text-tertiary)', pointerEvents: 'none' }}><A2I name="lock" size={16} /></span>
        <input type={show ? 'text' : 'password'} value={value} placeholder="Votre mot de passe"
          onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); setCaps(false); }}
          onKeyUp={(e) => setCaps(e.getModifierState && e.getModifierState('CapsLock'))}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
          style={{ width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 'var(--radius-md)', border: `1px solid ${border}`,
            background: 'var(--bg-base)', padding: '0 42px 0 34px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)',
            outline: 'none', boxShadow: focus ? '0 0 0 3px rgba(39,86,166,0.18)' : 'none', transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear' }} />
        <button onClick={() => setShow(s => !s)} aria-label={show ? 'Masquer' : 'Afficher'} style={{ all: 'unset', position: 'absolute', right: 12, cursor: 'pointer', color: 'var(--text-tertiary)', display: 'inline-flex' }}>
          <A2I name={show ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>
      {caps && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 11.5, color: 'var(--warning-text)' }}><A2I name="alert-triangle" size={12} />Verrouillage majuscules activé</div>}
    </div>
  );
}

/* Bouton pleine largeur 44px (cohérent avec les champs) */
function BigBtn({ children, onClick, disabled, variant = 'primary', iconLeft, iconRight }) {
  return <A2B variant={variant} fullWidth size="lg" disabled={disabled} onClick={onClick} iconLeft={iconLeft} iconRight={iconRight}>{children}</A2B>;
}

/* ── Identifiants adaptatifs ── */
function Credentials({ role, onSubmit, onForgot, onRequest, onPasswordless }) {
  const cfg = A2_ROLES.find(r => r.id === role);
  const isPhone = role === 'patient';
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [remember, setRemember] = React.useState(true);

  if (isPhone) {
    const ready = phone.replace(/\D/g, '').length >= 9;
    return (
      <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' }}>
        <Lead kicker="Espace patient" title="Votre numéro de téléphone" sub="Un code par SMS, pas de mot de passe." />
        <FieldLabel>Numéro de téléphone</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 13px', height: 44, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0 }}>
            <A2I name="phone" size={14} />+242
          </span>
          <A2IN placeholder="06 612 45 90" value={phone} type="tel" onChange={(e) => setPhone(e.target.value)} style={{ height: 44, fontSize: 14 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && ready) onSubmit({ method: 'sms', dest: cfg.dest }); }} />
        </div>
        <BigBtn iconLeft="send" disabled={!ready} onClick={() => onSubmit({ method: 'sms', dest: cfg.dest })}>Recevoir mon code</BigBtn>
        <A2BN tone="info" style={{ marginTop: 16 }}>Nouveau sur ULAMU ? Votre dossier médical gratuit s'ouvre dès la première connexion.</A2BN>
      </div>
    );
  }

  /* Soignant / structure / ULAMU : email + mot de passe (+ 2FA pour ULAMU) */
  const ready = email.includes('@') && pwd.length >= 4;
  const is2fa = role === 'ulamu';
  return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' }}>
      <Lead kicker={cfg.dest} title="Connexion à votre compte" sub={is2fa ? 'Accès supervisé · double authentification.' : 'Accédez à votre espace professionnel.'} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FieldLabel>Adresse e-mail professionnelle</FieldLabel>
          <A2IN leftIcon="mail" placeholder="nom@structure.cg" value={email} type="email" onChange={(e) => setEmail(e.target.value)} style={{ height: 44, fontSize: 14 }} />
        </div>
        <div>
          <FieldLabel hint="Mot de passe oublié ?" onHint={onForgot}>Mot de passe</FieldLabel>
          <PasswordField value={pwd} onChange={setPwd} onEnter={() => ready && onSubmit({ method: is2fa ? '2fa' : 'pwd', dest: cfg.dest })} />
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
          <A2SW checked={remember} onChange={() => setRemember(r => !r)} />
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Se souvenir de cet appareil 30 jours</span>
        </label>
        <BigBtn iconLeft={is2fa ? 'shield-check' : 'arrow-right'} disabled={!ready} onClick={() => onSubmit({ method: is2fa ? '2fa' : 'pwd', dest: cfg.dest })}>
          {is2fa ? 'Continuer vers la double authentification' : 'Se connecter'}
        </BigBtn>
      </div>

      {/* Sans mot de passe */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ou</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      </div>
      <button onClick={() => onPasswordless(cfg.dest)} className="uha" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-subtle)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
        <A2I name="send" size={15} />Recevoir un code à usage unique
      </button>

      {role === 'structure' && (
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 18 }}>
          Votre structure n'est pas encore référencée ?{' '}
          <button onClick={onRequest} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-accent)', fontWeight: 600 }}>Demander un accès</button>
        </p>
      )}
    </div>
  );
}

/* ── Vérification OTP ── */
function OtpVerify({ flow, onVerify, onBack }) {
  const [otp, setOtp] = React.useState('');
  const [secs, setSecs] = React.useState(45);
  React.useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const is2fa = flow.method === '2fa';
  const ready = otp.length === 6;
  React.useEffect(() => { if (ready) { const t = setTimeout(() => onVerify(flow), 420); return () => clearTimeout(t); } }, [ready]);

  return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' }}>
      <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <A2I name={is2fa ? 'shield-check' : 'message'} size={22} />
      </span>
      <Lead title={is2fa ? 'Double authentification' : 'Entrez le code reçu'}
        sub={is2fa ? 'Saisissez le code à 6 chiffres de votre application d\'authentification.' : 'Code à 6 chiffres envoyé par SMS au +242 06 612 45 90.'} />
      <OtpInput value={otp} onChange={setOtp} autofill={!is2fa} />
      <div style={{ textAlign: 'center', margin: '18px 0 4px' }}>
        {!ready
          ? (is2fa ? <A2BD tone="neutral" size="sm" icon="lock">En attente de votre saisie</A2BD> : <A2BD tone="neutral" dot size="sm">Réception du code en cours…</A2BD>)
          : <A2BD tone="success" size="sm" icon="check-circle">Code complet — vérification…</A2BD>}
      </div>
      <div style={{ textAlign: 'center' }}>
        {secs > 0
          ? <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Renvoyer le code dans <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{secs}s</span></span>
          : <button onClick={() => setSecs(45)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-accent)', fontWeight: 600 }}>Renvoyer le code</button>}
      </div>
    </div>
  );
}

/* ── Mot de passe oublié ── */
function Forgot({ onBack }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  if (sent) return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-dot)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><A2I name="mail" size={26} /></span>
      <Lead title="Lien envoyé" sub={`Si un compte existe pour ${email}, un lien de réinitialisation vient d'y être envoyé.`} />
      <BigBtn iconLeft="arrow-left" variant="secondary" onClick={onBack}>Revenir à la connexion</BigBtn>
    </div>
  );
  return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' }}>
      <Lead kicker="Récupération" title="Mot de passe oublié" sub="Indiquez votre e-mail : nous vous envoyons un lien sécurisé pour en choisir un nouveau." />
      <FieldLabel>Adresse e-mail</FieldLabel>
      <A2IN leftIcon="mail" placeholder="nom@structure.cg" value={email} type="email" onChange={(e) => setEmail(e.target.value)} style={{ height: 44, fontSize: 14 }} wrapperStyle={{ marginBottom: 14 }} />
      <BigBtn iconLeft="send" disabled={!email.includes('@')} onClick={() => setSent(true)}>Envoyer le lien</BigBtn>
    </div>
  );
}

/* ── Demande d'accès structure ── */
function RequestAccess({ onBack }) {
  const [f, setF] = React.useState({ struct: '', name: '', email: '' });
  const [doc, setDoc] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const ready = f.struct && f.name && f.email.includes('@') && doc;
  if (sent) return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><A2I name="shield-check" size={26} /></span>
      <Lead title="Demande envoyée" sub="L'équipe ULAMU vérifie vos documents sous 48 h. Vous recevrez vos accès par e-mail une fois la structure validée." />
      <A2BD tone="warning" icon="lock" style={{ marginBottom: 18 }}>En cours de vérification</A2BD>
      <BigBtn iconLeft="arrow-left" variant="secondary" onClick={onBack}>Revenir à la connexion</BigBtn>
    </div>
  );
  return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)' }}>
      <Lead kicker="Nouvelle structure" title="Demander un accès" sub="Pharmacie, laboratoire ou clinique — chaque structure est vérifiée avant activation." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div><FieldLabel>Nom de la structure</FieldLabel><A2IN leftIcon="hospital" placeholder="Pharmacie du Marché" value={f.struct} onChange={(e) => setF({ ...f, struct: e.target.value })} style={{ height: 44, fontSize: 14 }} /></div>
        <div><FieldLabel>Responsable (titulaire)</FieldLabel><A2IN leftIcon="user" placeholder="Prénom et nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ height: 44, fontSize: 14 }} /></div>
        <div><FieldLabel>E-mail professionnel</FieldLabel><A2IN leftIcon="mail" placeholder="nom@structure.cg" value={f.email} type="email" onChange={(e) => setF({ ...f, email: e.target.value })} style={{ height: 44, fontSize: 14 }} /></div>
        <button onClick={() => setDoc(true)} className="uha" style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: `1px dashed ${doc ? 'var(--success-border)' : 'var(--border-default)'}`, background: doc ? 'var(--success-bg)' : 'var(--bg-subtle)', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: doc ? 'var(--success-dot)' : 'var(--bg-muted)', color: doc ? '#fff' : 'var(--text-tertiary)' }}><A2I name={doc ? 'check' : 'upload'} size={16} /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{doc ? 'agrement_pharmacie.pdf' : 'Joindre l\'agrément / licence'}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{doc ? 'Document ajouté · 1,2 Mo' : 'PDF ou photo — vérifié par ULAMU'}</span>
          </span>
        </button>
        <BigBtn iconLeft="send" disabled={!ready} onClick={() => setSent(true)}>Envoyer ma demande</BigBtn>
      </div>
    </div>
  );
}

/* ── Succès ── */
const DEST_ICON = { 'App patient': 'user', 'Cockpit professionnel': 'stethoscope', 'Espace structure': 'hospital', 'Back-office': 'shield-check' };
function Success({ flow, onReplay }) {
  return (
    <div style={{ animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)', textAlign: 'center' }}>
      <style>{'@keyframes ulamu-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}'}</style>
      <span style={{ display: 'inline-flex', width: 68, height: 68, borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-dot)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, animation: 'ulamu-pop var(--dur-slow) var(--ease-spring)' }}>
        <A2I name="check-circle" size={34} />
      </span>
      <Lead title="Connexion réussie" sub="Vous êtes authentifié. Bienvenue sur ULAMU." />
      <A2C padding="14px 16px" style={{ textAlign: 'left', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0, background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><A2I name={DEST_ICON[flow.dest] || 'arrow-right'} size={19} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Vous accédez à</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{flow.dest}</span>
              <A2VB size="sm" />
            </div>
          </div>
          <A2BD tone="success" dot size="sm">Sécurisé</A2BD>
        </div>
      </A2C>
      <BigBtn iconRight="arrow-right" onClick={onReplay}>Accéder à mon espace</BigBtn>
      <button onClick={onReplay} style={{ all: 'unset', display: 'block', margin: '14px auto 0', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-tertiary)' }}>Rejouer la démo de connexion</button>
    </div>
  );
}

/* ── Contrôleur racine ── */
function AuthApp() {
  const [screen, setScreen] = React.useState('role'); // role | creds | otp | success | forgot | request
  const [role, setRole] = React.useState(null);
  const [flow, setFlow] = React.useState({ method: 'pwd', dest: '' });

  const reset = () => { setScreen('role'); setRole(null); };

  const STEP = { role: 1, creds: 2, otp: 3, success: 4 };
  let body, onBack = null, footnote, step = STEP[screen] != null ? STEP[screen] : null;
  if (screen === 'role') {
    body = <window.AuthRoleSelect onPick={(id) => { setRole(id); setScreen('creds'); }} />;
    footnote = 'Connexion chiffrée de bout en bout';
  } else if (screen === 'creds') {
    onBack = reset;
    body = <Credentials role={role}
      onSubmit={(f) => { setFlow(f); setScreen(f.method === 'pwd' ? 'success' : 'otp'); }}
      onPasswordless={(dest) => { setFlow({ method: 'sms', dest }); setScreen('otp'); }}
      onForgot={() => setScreen('forgot')}
      onRequest={() => setScreen('request')} />;
    footnote = role === 'patient' ? 'Votre téléphone est votre seul identifiant' : 'Connexion chiffrée de bout en bout';
  } else if (screen === 'otp') {
    onBack = () => setScreen('creds');
    body = <OtpVerify flow={flow} onVerify={(f) => { setFlow(f); setScreen('success'); }} onBack={() => setScreen('creds')} />;
    footnote = 'Code à usage unique — valable 10 minutes';
  } else if (screen === 'forgot') {
    onBack = () => setScreen('creds');
    body = <Forgot onBack={() => setScreen('creds')} />;
    footnote = 'Lien de réinitialisation sécurisé';
  } else if (screen === 'request') {
    onBack = () => setScreen('creds');
    body = <RequestAccess onBack={() => setScreen('creds')} />;
    footnote = 'Chaque structure est vérifiée avant activation';
  } else {
    body = <Success flow={flow} onReplay={reset} />;
    footnote = 'Session sécurisée';
  }

  return (
    <div className="app">
      <window.AuthFormShell onBack={onBack} footnote={footnote} step={step}>
        {body}
      </window.AuthFormShell>
      <window.AuthIllustrationPanel />
    </div>
  );
}

window.AuthApp = AuthApp;

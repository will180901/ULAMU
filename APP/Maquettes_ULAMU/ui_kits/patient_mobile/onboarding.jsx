/* ULAMU — App patient : onboarding (M01). Bienvenue → téléphone → OTP →
   profil. Icônes + textes courts : pensé pour la faible littératie. */
const U5 = window.ULAMUDesignSystem_d14300;
const { Button: B5, IconButton: IB5, Badge: BD5, Input: IN5, Card: C5, Icon: IC5, Banner: BN5 } = U5;
const LM5 = window.PatientLogoMark;

function StepDots({ step, total = 4 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i <= step ? 'var(--accent-500)' : 'var(--bg-muted)', border: i > step ? '1px solid var(--border-default)' : 'none', transition: 'width var(--dur-base) ease-out' }} />
      ))}
    </span>
  );
}

function OnbShell({ step, onBack, children, footer }) {
  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        {onBack ? <IB5 icon="arrow-left" label="Retour" onClick={onBack} /> : <LM5 />}
        <span style={{ flex: 1 }} />
        <StepDots step={step} />
      </div>
      <div className="pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      <div style={{ padding: 16, borderTop: '1px solid var(--glass-border)' }}>{footer}</div>
    </div>
  );
}

function OtpBoxes({ value }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[0, 1, 2, 3].map(i => (
        <span key={i} style={{
          width: 52, height: 60, borderRadius: 'var(--radius-lg)',
          border: `1.5px solid ${value[i] ? 'var(--accent-500)' : 'var(--border-default)'}`,
          background: 'var(--bg-elevated)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)',
          boxShadow: value[i] ? '0 0 0 3px rgba(39,86,166,0.14)' : 'none',
        }}>{value[i] || ''}</span>
      ))}
    </div>
  );
}

function Onboarding({ onDone }) {
  const [step, setStep] = React.useState(0);
  const [phone, setPhone] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [name, setName] = React.useState('');

  /* Démo : le code OTP « arrive » tout seul */
  React.useEffect(() => {
    if (step !== 2) return;
    setOtp('');
    const digits = '4 7 1 9'.split(' ');
    const ids = digits.map((d, i) => setTimeout(() => setOtp(v => v + d), 700 + i * 380));
    return () => ids.forEach(clearTimeout);
  }, [step]);

  if (step === 0) return (
    <OnbShell step={0} footer={<B5 variant="primary" fullWidth size="lg" iconRight="arrow-right" onClick={() => setStep(1)}>Commencer</B5>}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><LM5 size={56} /></div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.7px', color: 'var(--text-primary)' }}>Bienvenue sur ulamu</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.55 }}>Se soigner, sans file d'attente,<br />sans carnet perdu, sans mauvaise surprise.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['file-medical', 'Dossier médical gratuit, à vie', 'Chaque soin enrichit votre mémoire médicale'], ['shield-check', 'Payez après la poignée de main', 'Jamais un franc sans l\'accord du soignant'], ['pill', 'Médicaments trouvés et réservés', 'Fini la tournée des pharmacies']].map(([ic, t, s]) => (
            <C5 key={t} padding="13px">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC5 name={ic} size={18} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{t}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{s}</div>
                </div>
              </div>
            </C5>
          ))}
        </div>
      </div>
    </OnbShell>
  );

  if (step === 1) return (
    <OnbShell step={1} onBack={() => setStep(0)}
      footer={<B5 variant="primary" fullWidth size="lg" iconLeft="send" disabled={phone.replace(/\D/g, '').length < 9} onClick={() => setStep(2)}>Recevoir mon code</B5>}>
      <div style={{ paddingTop: 18 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Votre numéro de téléphone</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 5, lineHeight: 1.5 }}>C'est votre seul identifiant. Un code à 4 chiffres vous sera envoyé par SMS.</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>+242</span>
        <IN5 leftIcon="phone" placeholder="06 612 45 90" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
      </div>
      <BN5 tone="info">Aucun mot de passe à retenir — votre téléphone suffit.</BN5>
    </OnbShell>
  );

  if (step === 2) return (
    <OnbShell step={2} onBack={() => setStep(1)}
      footer={<B5 variant="primary" fullWidth size="lg" iconLeft="check" disabled={otp.length < 4} onClick={() => setStep(3)}>Vérifier</B5>}>
      <div style={{ paddingTop: 18, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Entrez le code reçu</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 5 }}>Envoyé au <span style={{ fontFamily: 'var(--font-mono)' }}>+242 {phone || '06 612 45 90'}</span></div>
      </div>
      <div style={{ paddingTop: 10 }}><OtpBoxes value={otp} /></div>
      <div style={{ textAlign: 'center' }}>
        {otp.length < 4
          ? <BD5 tone="neutral" dot size="sm">Code en cours de réception…</BD5>
          : <BD5 tone="success" icon="check-circle" size="sm">Code reçu automatiquement</BD5>}
      </div>
      <button className="uha" style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 12.5, color: 'var(--text-accent)', fontWeight: 500 }}>Renvoyer le code (45 s)</button>
    </OnbShell>
  );

  return (
    <OnbShell step={3} onBack={() => setStep(2)}
      footer={<B5 variant="primary" fullWidth size="lg" iconRight="arrow-right" disabled={!name.trim()} onClick={onDone}>C'est parti</B5>}>
      <div style={{ paddingTop: 18 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Comment vous appelez-vous ?</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 5, lineHeight: 1.5 }}>Votre nom ouvre votre dossier médical — gratuit, à vie.</div>
      </div>
      <IN5 leftIcon="user" placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} />
      <C5 padding="13px">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ color: 'var(--success-dot)', display: 'inline-flex' }}><IC5 name="shield-check" size={18} /></span>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Vos données de santé sont chiffrées. Seuls les soignants que <strong style={{ color: 'var(--text-primary)' }}>vous</strong> consultez y accèdent.</div>
        </div>
      </C5>
    </OnbShell>
  );
}

window.PatientOnboarding = Onboarding;

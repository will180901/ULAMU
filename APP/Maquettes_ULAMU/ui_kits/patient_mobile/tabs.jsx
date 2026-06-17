/* ULAMU — App patient : onglets Consultations / Mon espace, barre d'onglets,
   bouton Urgence (modale) et contrôleur racine PatientApp. */
const U3 = window.ULAMUDesignSystem_d14300;
const { Button: B3, IconButton: IB3, Badge: BD3, Avatar: AV3, Card: C3, Icon: IC3, Modal: MD3, Banner: BN3 } = U3;
const GH3 = window.PatientGlassHeader;
const SL3 = window.PatientSectionLabel;

/* ── Consultations : chronologie groupée ── */
function ConsultTab({ onResume, onOpenQR, onOpenDossier }) {
  const groups = [
    ['Aujourd\'hui', [
      { ic: 'message', t: 'Dr Armel Konaté', s: 'Session en cours · répond en ~3 min', b: ['accent', 'En cours'], live: true },
    ]],
    ['Mars 2026', [
      { ic: 'ordonnance', t: 'Ordonnance ORD-2026-00412', s: 'Amlodipine 5 mg · Ramipril 10 mg', b: ['success', 'Réservée'] },
      { ic: 'consultation', t: 'Dr Armel Konaté', s: 'Compte-rendu reçu · 12 mars', b: ['neutral', 'Terminée'] },
    ]],
    ['Février 2026', [
      { ic: 'activity', t: 'Triage — Nadège Loemba', s: 'Tension 13/8 · versé au dossier', b: ['neutral', 'Archivé'] },
      { ic: 'pill', t: 'Délivrance — Pharmacie du Marché', s: '2 médicaments · scan QR', b: ['neutral', 'Délivrée'] },
    ]],
  ];
  return (
    <div className="scr">
      <GH3>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Consultations</span>
        <IB3 icon="filter" variant="solid" label="Filtrer" />
      </GH3>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(([label, items]) => (
          <React.Fragment key={label}>
            <SL3>{label}</SL3>
            {items.map((it, i) => (
              <button key={i} className="uha" onClick={it.live ? onResume : (it.ic === 'ordonnance' ? onOpenQR : onOpenDossier)} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
                <C3 padding="13px" interactive style={{ borderColor: it.live ? 'rgba(111,146,218,0.4)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IC3 name={it.ic} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{it.t}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{it.s}</div>
                    </div>
                    <BD3 tone={it.b[0]} size="sm" dot={it.live}>{it.b[1]}</BD3>
                  </div>
                </C3>
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Mon espace ── */
function SpaceTab({ onAction, theme, onTheme }) {
  const TILES = [
    ['file-medical', 'Dossier médical', 'Gratuit, à vie', 'dossier'],
    ['users', 'Carnet familial', '2 proches', 'dossier'],
    ['pill', 'Mes rappels', '1 actif', 'notif'],
    ['credit-card', 'Mes paiements', 'MTN MoMo', 'payments'],
  ];
  return (
    <div className="scr">
      <GH3>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Mon espace</span>
        <window.PatientThemeToggle theme={theme} onTheme={onTheme} />
        <IB3 icon="settings" variant="solid" label="Réglages" />
      </GH3>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <C3 padding="16px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <AV3 name="Mireille Nkounkou" size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Mireille Nkounkou</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>PAT-2026-08317</div>
            </div>
            <IC3 name="chevron-right" size={16} color="var(--text-tertiary)" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 13, paddingTop: 13, borderTop: '1px solid var(--border-subtle)' }}>
            {[['7', 'consultations'], ['3', 'ordonnances'], ['12', 'mois d\'historique']].map(([v, l], i) => (
              <div key={l} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{l}</div>
              </div>
            ))}
          </div>
        </C3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {TILES.map(([ic, t, s, act]) => (
            <button key={t} className="uha" onClick={() => onAction(act)} style={{ all: 'unset', cursor: 'pointer' }}>
              <C3 padding="14px" interactive>
                <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <IC3 name={ic} size={17} />
                </span>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s}</div>
              </C3>
            </button>
          ))}
        </div>

        <button className="uha" onClick={() => onAction('dossier')} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
        <C3 padding="13px" interactive>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ color: 'var(--success-dot)', display: 'inline-flex' }}><IC3 name="shield-check" size={18} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Confidentialité</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>Chiffré · jamais de contenu médical sur l'écran verrouillé</div>
            </div>
            <IC3 name="chevron-right" size={15} color="var(--text-tertiary)" />
          </div>
        </C3>
        </button>
        <B3 variant="ghost" fullWidth iconLeft="log-out" onClick={() => onAction('logout')}>Se déconnecter</B3>
      </div>
    </div>
  );
}

/* ── Barre d'onglets ── */
function TabBar({ tab, setTab }) {
  const tabs = [['accueil', 'home', 'Accueil'], ['consult', 'message', 'Consultations'], ['espace', 'user', 'Mon espace']];
  return (
    <div style={{ display: 'flex', background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '1px solid var(--glass-border)' }}>
      {tabs.map(([id, ic, l]) => {
        const on = tab === id;
        return (
          <button key={id} className="uha" onClick={() => setTab(id)} style={{ all: 'unset', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0 10px', position: 'relative' }}>
            <span style={{ width: 44, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? 'rgba(39,86,166,0.22)' : 'transparent', color: on ? 'var(--accent-300)' : 'var(--text-tertiary)',
              transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear' }}>
              <IC3 name={ic} size={18} strokeWidth={on ? 1.7 : 1.5} />
            </span>
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500, fontFamily: 'var(--font-body)', color: on ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{l}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Historique des paiements ── */
function PaymentsScreen({ onBack }) {
  const ROWS = [
    ['stethoscope', 'Consultation — Dr Armel Konaté', '11 juin 2026 · MTN MoMo', '-5 000 F'],
    ['eye', 'Dévoilement — Pharmacie du Marché', '11 juin 2026 · MTN MoMo', '-500 F'],
    ['activity', 'Triage à domicile — Nadège L.', '8 mars 2026 · Airtel Money', '-2 000 F'],
    ['refresh', 'Remboursement automatique', '2 févr. 2026 · session non honorée', '+5 000 F'],
  ];
  return (
    <div className="scr">
      <GH3>
        <IB3 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Mes paiements</span>
        <BD3 tone="neutral" size="sm" icon="credit-card">MTN MoMo</BD3>
      </GH3>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <C3 padding="4px 14px">
          {ROWS.map(([ic, t, s, amt], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC3 name={ic} size={15} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{s}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: amt.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>{amt}</span>
            </div>
          ))}
        </C3>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <IC3 name="shield-check" size={12} color="var(--success-dot)" />Reçu systématique · jamais un franc de plus que le prix affiché
        </div>
      </div>
    </div>
  );
}

/* ── Racine ── */
function PatientApp() {
  const [tab, setTab] = React.useState('accueil');
  const [stack, setStack] = React.useState([]);
  const [urgence, setUrgence] = React.useState(false);
  const [onboarded, setOnboarded] = React.useState(() => {
    try { return localStorage.getItem('ulamu-onboarded') === '1'; } catch (e) { return true; }
  });
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('ulamu-theme', n); } catch (e) {}
    return n;
  });
  const top = stack[stack.length - 1];
  const push = (v) => setStack(s => [...s, v]);
  const pop = () => setStack(s => s.slice(0, -1));
  const reset = () => setStack([]);
  const go = (k) => {
    if (k === 'logout') {
      try { localStorage.setItem('ulamu-onboarded', '0'); } catch (e) {}
      setStack([]); setTab('accueil'); setOnboarded(false);
      return;
    }
    push({ k });
  };
  const finishOnboarding = () => {
    try { localStorage.setItem('ulamu-onboarded', '1'); } catch (e) {}
    setOnboarded(true);
  };
  const armel = window.PATIENT_DOCTORS[0];

  if (!onboarded) {
    return (
      <window.AndroidDevice dark={theme === 'dark'}>
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
          <window.PatientOnboarding onDone={finishOnboarding} />
        </div>
      </window.AndroidDevice>
    );
  }

  let body;
  if (top) {
    if (top.k === 'doctor') body = <window.PatientDoctor d={top.d} onBack={pop} onInitiate={() => push({ k: 'handshake', d: top.d })} />;
    else if (top.k === 'handshake') body = <window.PatientHandshake d={top.d} onBack={pop} onConfirmed={() => push({ k: 'pay', d: top.d })} />;
    else if (top.k === 'pay') body = <window.PatientPay d={top.d} onBack={pop} onPaid={() => push({ k: 'session', d: top.d })} />;
    else if (top.k === 'session') body = <window.PatientSession d={top.d} onBack={pop} onEnd={reset} onShowQR={() => go('qr')} onReserve={() => go('meds')} />;
    else if (top.k === 'meds') body = <window.PatientMeds onBack={pop} onShowQR={() => go('qr')} />;
    else if (top.k === 'qr') body = <window.PatientQR onBack={pop} />;
    else if (top.k === 'dossier') body = <window.PatientDossier onBack={pop} />;
    else if (top.k === 'notif') body = <window.PatientNotifs onBack={pop} />;
    else if (top.k === 'payments') body = <PaymentsScreen onBack={pop} />;
  } else if (tab === 'accueil') body = <window.PatientHome onPick={(d) => push({ k: 'doctor', d })} onAction={go} theme={theme} onTheme={toggleTheme} />;
  else if (tab === 'consult') body = <ConsultTab onResume={() => push({ k: 'session', d: armel })} onOpenQR={() => go('qr')} onOpenDossier={() => go('dossier')} />;
  else body = <SpaceTab onAction={go} theme={theme} onTheme={toggleTheme} />;

  const inFlow = !!top;
  return (
    <window.AndroidDevice dark={theme === 'dark'}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>{body}</div>
        {!inFlow && (
          <button className="uha" title="Urgence" onClick={() => setUrgence(true)} style={{ position: 'absolute', right: 14, bottom: 76, height: 46, padding: '0 16px 0 13px', borderRadius: 23, border: 'none', cursor: 'pointer', background: '#C44040', color: '#fff', display: 'flex', alignItems: 'center', gap: 7, boxShadow: 'var(--shadow-xl)', zIndex: 30, overflow: 'hidden' }}>
            <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
            <IC3 name="phone" size={17} strokeWidth={1.8} />
            <span style={{ position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>Urgence</span>
          </button>
        )}
        {!inFlow && <TabBar tab={tab} setTab={setTab} />}
        {urgence && (
          <MD3 title="Urgence médicale" onClose={() => setUrgence(false)} width={330} style={{ margin: '0 12px' }}
            footer={<>
              <B3 variant="secondary" onClick={() => setUrgence(false)}>Annuler</B3>
              <B3 variant="danger" iconLeft="phone">Appeler le service de garde</B3>
            </>}>
            <BN3 tone="error" title="Si la vie est en danger">
              Appelez immédiatement — l'appel est gratuit et prioritaire, même sans crédit.
            </BN3>
            <p style={{ margin: '12px 0 6px', fontSize: 13 }}>Votre position approximative (Talangaï) sera partagée avec le service de garde.</p>
          </MD3>
        )}
      </div>
    </window.AndroidDevice>
  );
}

window.PatientApp = PatientApp;

/* ULAMU — Espace structure : Stock (lots, fraîcheur), Délivrances,
   Gains, Membres + contrôleur racine PharmaApp. */
const PH2 = window.ULAMUDesignSystem_d14300;
const { Button: SB, IconButton: SIB, Badge: SBD, Avatar: SAV, Input: SIN, Card: SC, Icon: SIC, Banner: SBN, Switch: SSW } = PH2;
const SSL = window.PharmaSectionLabel;

function SRow({ children, last }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>{children}</div>;
}

function Shell({ title, sub, actions, children }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.6px', color: 'var(--text-primary)' }}>{title}</h1>
          {sub && <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Stock vivant par lots (M11, règle de fraîcheur anti-R-03) ── */
function StockPage({ delivered }) {
  const [visible, setVisible] = React.useState(true);
  const LOTS = [
    ['Amlodipine 5 mg', 'AML-0925', '09/2027', delivered ? 23 : 24, 'ok'],
    ['Ramipril 10 mg', 'RAM-1124', '11/2026', delivered ? 11 : 12, 'ok'],
    ['Paracétamol 1 g', 'PAR-0326', '03/2026', 86, 'soon'],
    ['Métronidazole 500 mg', 'MET-0825', '08/2026', 40, 'ok'],
    ['Amoxicilline 500 mg', 'AMX-0126', '01/2026', 0, 'out'],
  ];
  const TONE = { ok: ['success', 'En stock'], soon: ['warning', 'Péremption proche'], out: ['error', 'Épuisé'] };
  return (
    <Shell title="Stock" sub="Stock vivant par lots — mis à jour à chaque délivrance, visible dans les recherches anonymes"
      actions={<><SB variant="ghost" iconLeft="upload">Importer</SB><SB variant="primary" iconLeft="plus">Ajouter un lot</SB></>}>
      <SC padding="14px 16px" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SSW checked={visible} onChange={() => setVisible(!visible)} label="Visible dans les recherches des patients" />
          <span style={{ flex: 1 }} />
          <SBD tone={visible ? 'success' : 'warning'} dot>{visible ? 'Stock à jour il y a 3 h' : 'Masqué'}</SBD>
        </div>
        {!visible && <SBN tone="warning" style={{ marginTop: 12 }} title="Votre pharmacie n'apparaît plus dans les recherches">Règle de fraîcheur : un stock non mis à jour depuis 48 h est automatiquement masqué.</SBN>}
      </SC>
      <SC padding="4px 18px">
        {LOTS.map(([m, lot, per, q, st], i) => (
          <SRow key={lot} last={i === LOTS.length - 1}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SIC name="pill" size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{m}</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>lot {lot} · pér. {per}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: q === 0 ? 'var(--error-text)' : 'var(--text-primary)', width: 70, textAlign: 'right' }}>{q} boîtes</span>
            <SBD tone={TONE[st][0]} size="sm" dot>{TONE[st][1]}</SBD>
            <SIB icon="edit" size="sm" label="Modifier" />
          </SRow>
        ))}
      </SC>
    </Shell>
  );
}

/* ── Délivrances ── */
function DelivPage({ delivered }) {
  const ROWS = [
    ...(delivered ? [['RSV-2210', 'ORD-2026-00412', 'Amlodipine · Ramipril', '19:58', '5 500 F']] : []),
    ['RSV-2188', 'ORD-2026-00391', 'Paracétamol 1 g', '17:24', '1 200 F'],
    ['RSV-2185', 'ORD-2026-00388', 'Métronidazole · ORS', '16:02', '4 800 F'],
    ['RSV-2179', 'ORD-2026-00375', 'Amoxicilline 500 mg', '11:48', '3 600 F'],
  ];
  return (
    <Shell title="Délivrances" sub="Chaque scan QR clôt la réservation, décrémente le stock et alimente le dossier patient">
      <SC padding="4px 18px">
        {ROWS.map(([rsv, ord, meds, h, amt], i) => (
          <SRow key={rsv} last={i === ROWS.length - 1}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-dot)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SIC name="check-circle" size={15} /></span>
            <div style={{ width: 170, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' }}>{rsv}</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>{ord}</div>
            </div>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meds}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{h}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{amt}</span>
          </SRow>
        ))}
      </SC>
    </Shell>
  );
}

/* ── Gains ── */
function PharmaGains() {
  return (
    <Shell title="Gains" sub="Dévoilements et ventes réservées — crédités automatiquement"
      actions={<SB variant="primary" iconLeft="credit-card">Retirer vers MoMo</SB>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)', background: 'var(--accent-500)', padding: 20, boxShadow: 'var(--shadow-md)' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.1 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)' }}>Solde disponible</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-1px', color: '#fff', margin: '6px 0 10px' }}>52 300 F</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>
              <SIC name="eye" size={13} />500 F par dévoilement · ventes encaissées en caisse
            </div>
          </div>
        </div>
        <SC padding="4px 18px">
          {[['Dévoilement — Talangaï', '19:32', '+500 F'], ['Dévoilement — Talangaï', '18:05', '+500 F'], ['Retrait Airtel Money', '9 juin', '-40 000 F'], ['Dévoilement — Poto-Poto', '8 juin', '+500 F']].map(([t, w, a], i, arr) => (
            <SRow key={i} last={i === arr.length - 1}>
              <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: a.startsWith('+') ? 'var(--success-bg)' : 'rgba(39,86,166,0.14)', color: a.startsWith('+') ? 'var(--success-dot)' : 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SIC name={a.startsWith('+') ? 'eye' : 'credit-card'} size={14} /></span>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{w}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: a.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)' }}>{a}</span>
            </SRow>
          ))}
        </SC>
      </div>
    </Shell>
  );
}

/* ── Membres (M02 : titulaire + membres) ── */
function MembresPage() {
  const ROWS = [
    ['Destin Malonga', 'Titulaire', 'Tous les droits · signature des contrats', 'accent', 'online'],
    ['Chancelle Ngoma', 'Membre', 'Délivrances · mise à jour du stock', 'neutral', 'online'],
    ['Rodrigue Itoua', 'Membre', 'Délivrances uniquement', 'neutral', undefined],
    ['Bénédicte Samba', 'Membre', 'Stock uniquement', 'neutral', 'away'],
  ];
  return (
    <Shell title="Membres" sub="Espace structure : un titulaire responsable, des membres aux droits limités (M02)"
      actions={<SB variant="primary" iconLeft="plus">Inviter un membre</SB>}>
      <SC padding="4px 18px">
        {ROWS.map(([n, role, rights, tone, st], i) => (
          <SRow key={n} last={i === ROWS.length - 1}>
            <SAV name={n} size="md" status={st} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{n}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{rights}</div>
            </div>
            <SBD tone={tone} size="sm">{role}</SBD>
            <SIB icon="more-vertical" label="Options" />
          </SRow>
        ))}
      </SC>
      <SBN tone="info" style={{ marginTop: 16 }} title="Le titulaire reste responsable">Les actions des membres sont tracées dans le journal inaltérable (M04).</SBN>
    </Shell>
  );
}

/* ── Racine ── */
function PharmaApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [scan, setScan] = React.useState(false);
  const [delivered, setDelivered] = React.useState(false);
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('ulamu-theme', n); } catch (e) {}
    return n;
  });
  const NAMES = { dashboard: 'Tableau de bord', clock: 'Réservations', database: 'Stock', 'qr-code': 'Délivrances', 'credit-card': 'Gains', users: 'Membres' };
  let main;
  if (nav === 'database') main = <StockPage delivered={delivered} />;
  else if (nav === 'qr-code') main = <DelivPage delivered={delivered} />;
  else if (nav === 'credit-card') main = <PharmaGains />;
  else if (nav === 'users') main = <MembresPage />;
  else main = <window.PharmaDashboard onScan={() => setScan(true)} delivered={delivered} />;
  return (
    <div className="app">
      <window.PharmaSidebar nav={nav === 'clock' ? 'dashboard' : nav} setNav={(n) => setNav(n === 'clock' ? 'dashboard' : n)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <window.PharmaTopbar crumb={NAMES[nav]} theme={theme} onTheme={toggleTheme} freshHours={3} />
        {main}
      </div>
      {scan && <window.PharmaScanModal onClose={() => setScan(false)} onDelivered={() => setDelivered(true)} />}
    </div>
  );
}

window.PharmaApp = PharmaApp;

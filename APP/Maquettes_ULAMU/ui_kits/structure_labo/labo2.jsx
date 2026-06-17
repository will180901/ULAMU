/* ULAMU — Espace laboratoire : Résultats (saisie + validation biologiste),
   Catalogue, Gains, Membres + contrôleur racine LaboApp. */
const LB2 = window.ULAMUDesignSystem_d14300;
const { Button: LBB, IconButton: LIB, Badge: LBD, Avatar: LAV, Input: LIN, Card: LC, Icon: LICn, Banner: LBN, Switch: LSW } = LB2;
const LSL = window.LaboSectionLabel;

function LRow({ children, last }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>{children}</div>;
}

function LShell({ title, sub, actions, children }) {
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

/* ── Résultats : saisie + validation par le biologiste ── */
const ANALYTES = [
  { name: 'Glycémie à jeun', val: '1,26', unit: 'g/L', ref: '0,70 – 1,10', flag: 'high' },
  { name: 'Créatininémie', val: '11', unit: 'mg/L', ref: '6 – 12', flag: 'ok' },
  { name: 'Cholestérol total', val: '2,38', unit: 'g/L', ref: '< 2,00', flag: 'high' },
  { name: 'Hémoglobine (NFS)', val: '12,8', unit: 'g/dL', ref: '12 – 16', flag: 'ok' },
];

function ResultatsPage({ onValidated, validated }) {
  const [open, setOpen] = React.useState(true);
  const pending = [
    ['EX-2026-0087', 'Papa Gaston Bemba', 'Créatininémie · Ionogramme', 'saisie en cours'],
  ];
  return (
    <LShell title="Résultats" sub="Saisis par le technicien, validés par le biologiste, puis versés au dossier patient"
      actions={<LBB variant="ghost" iconLeft="filter">Filtrer</LBB>}>
      {validated && <LBN tone="success" title="EX-2026-0089 versé au dossier de Mireille N." style={{ marginBottom: 16 }}>Le prescripteur Dr Armel Konaté est notifié · 2 valeurs hors normes signalées.</LBN>}

      {!validated && (
        <LC padding="0" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 18px', border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left' }}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-dot)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LICn name="activity" size={16} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-accent)' }}>EX-2026-0089</span>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Mireille Nkounkou</span>
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Bilan cardiaque · 4 analytes saisis · prescrit par Dr Armel Konaté</span>
            </span>
            <LBD tone="warning" dot size="sm">À valider</LBD>
            <LICn name={open ? 'chevron-up' : 'chevron-down'} size={15} color="var(--text-tertiary)" />
          </button>
          {open && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 18px 16px' }}>
              {ANALYTES.map((a, i) => (
                <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < ANALYTES.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{a.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: a.flag === 'high' ? 'var(--warning-text)' : 'var(--text-primary)', width: 70, textAlign: 'right' }}>{a.val} <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>{a.unit}</span></span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', width: 110, textAlign: 'right' }}>réf. {a.ref}</span>
                  <span style={{ width: 96, display: 'flex', justifyContent: 'flex-end' }}>
                    {a.flag === 'high'
                      ? <LBD tone="warning" size="sm" icon="trending-up">Élevé</LBD>
                      : <LBD tone="success" size="sm" dot>Normal</LBD>}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  <LICn name="shield-check" size={13} color="var(--success-dot)" />Signature électronique du biologiste requise
                </span>
                <span style={{ flex: 1 }} />
                <LBB variant="ghost" size="sm" iconLeft="edit">Corriger la saisie</LBB>
                <LBB variant="primary" size="sm" iconLeft="check-circle" onClick={onValidated}>Valider & verser au dossier</LBB>
              </div>
            </div>
          )}
        </LC>
      )}

      <LSL>En cours de saisie</LSL>
      <LC padding="4px 18px">
        {pending.map(([id, n, ex, st], i) => (
          <LRow key={id} last={i === pending.length - 1}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LICn name="syringe" size={16} /></span>
            <div style={{ width: 150, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' }}>{id}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{n}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{ex}</div>
            </div>
            <LBD tone="neutral" size="sm" dot>{st}</LBD>
            <LIB icon="chevron-right" label="Ouvrir" />
          </LRow>
        ))}
      </LC>
    </LShell>
  );
}

/* ── Catalogue d'examens ── */
function CataloguePage() {
  const [visible, setVisible] = React.useState(true);
  const ROWS = [
    ['NFS (Numération formule sanguine)', 'Hématologie', '4 h', '5 000 F', true],
    ['Glycémie à jeun', 'Biochimie', '2 h', '2 500 F', true],
    ['Bilan lipidique', 'Biochimie', '4 h', '6 000 F', true],
    ['Créatininémie', 'Biochimie', '2 h', '3 000 F', true],
    ['Test paludisme (TDR)', 'Parasitologie', '30 min', '2 000 F', true],
    ['ECBU', 'Bactériologie', '48 h', '7 500 F', false],
  ];
  return (
    <LShell title="Catalogue" sub="Vos examens, délais et tarifs — visibles par les prescripteurs au moment de la demande"
      actions={<LBB variant="primary" iconLeft="plus">Ajouter un examen</LBB>}>
      <LC padding="14px 16px" style={{ marginBottom: 16 }}>
        <LSW checked={visible} onChange={() => setVisible(!visible)} label="Visible dans les demandes des prescripteurs" />
      </LC>
      <LC padding="4px 18px">
        {ROWS.map(([n, fam, delai, prix, on], i) => (
          <LRow key={n} last={i === ROWS.length - 1}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LICn name="activity" size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: on ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{n}</span>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{fam}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}><LICn name="clock" size={12} />{delai}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: on ? 'var(--text-primary)' : 'var(--text-disabled)', width: 70, textAlign: 'right' }}>{prix}</span>
            <LBD tone={on ? 'success' : 'neutral'} size="sm" dot>{on ? 'Proposé' : 'Suspendu'}</LBD>
            <LIB icon="edit" size="sm" label="Modifier" />
          </LRow>
        ))}
      </LC>
    </LShell>
  );
}

/* ── Gains ── */
function LaboGains() {
  return (
    <LShell title="Gains" sub="Examens payés via ULAMU — crédités à la validation des résultats"
      actions={<LBB variant="primary" iconLeft="credit-card">Retirer vers MoMo</LBB>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)', background: 'var(--accent-500)', padding: 20, boxShadow: 'var(--shadow-md)' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.1 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)' }}>Solde disponible</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-1px', color: '#fff', margin: '6px 0 10px' }}>241 500 F</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>
              <LICn name="shield-check" size={13} />Crédité à la validation · commission contractuelle incluse
            </div>
          </div>
        </div>
        <LC padding="4px 18px">
          {[['Bilan cardiaque — Mireille N.', 'EX-2026-0089 · en attente de validation', '18 500 F', false], ['Ionogramme — Papa Gaston B.', 'EX-2026-0087 · 11 juin', '+9 000 F', true], ['TDR + NFS — Clarisse M.', 'EX-2026-0085 · 11 juin', '+7 500 F', true], ['Retrait MTN MoMo', '8 juin', '-120 000 F', true]].map(([t, s, a, done], i, arr) => (
            <LRow key={i} last={i === arr.length - 1}>
              <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: a.startsWith('+') ? 'var(--success-bg)' : 'rgba(39,86,166,0.14)', color: a.startsWith('+') ? 'var(--success-dot)' : 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LICn name={a.startsWith('-') ? 'credit-card' : 'activity'} size={14} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t}</span>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{s}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: !done ? 'var(--text-disabled)' : a.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)' }}>{a}</span>
            </LRow>
          ))}
        </LC>
      </div>
    </LShell>
  );
}

/* ── Membres ── */
function LaboMembres() {
  const ROWS = [
    ['Honorine Samba', 'Titulaire · Biologiste', 'Validation des résultats · signature', 'accent', 'online'],
    ['Trésor Mabiala', 'Membre · Technicien', 'Prélèvements · saisie des résultats', 'neutral', 'online'],
    ['Grâce Okandzi', 'Membre · Accueil', 'Accueil patients · scan des demandes', 'neutral', undefined],
  ];
  return (
    <LShell title="Membres" sub="Un titulaire biologiste responsable, des membres aux droits limités (M02)"
      actions={<LBB variant="primary" iconLeft="plus">Inviter un membre</LBB>}>
      <LC padding="4px 18px">
        {ROWS.map(([n, role, rights, tone, st], i) => (
          <LRow key={n} last={i === ROWS.length - 1}>
            <LAV name={n} size="md" status={st} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{n}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{rights}</div>
            </div>
            <LBD tone={tone} size="sm">{role}</LBD>
            <LIB icon="more-vertical" label="Options" />
          </LRow>
        ))}
      </LC>
      <LBN tone="info" style={{ marginTop: 16 }} title="Seul le biologiste valide">Un résultat saisi par un technicien n'est versé au dossier qu'après signature du titulaire — tracée au journal inaltérable (M04).</LBN>
    </LShell>
  );
}

/* ── Racine ── */
function LaboApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [scan, setScan] = React.useState(false);
  const [sampled, setSampled] = React.useState(false);
  const [validated, setValidated] = React.useState(false);
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('ulamu-theme', n); } catch (e) {}
    return n;
  });
  const NAMES = { dashboard: 'Tableau de bord', syringe: 'Demandes', activity: 'Résultats', 'file-medical': 'Catalogue', 'credit-card': 'Gains', users: 'Membres' };
  let main;
  if (nav === 'activity') main = <ResultatsPage validated={validated} onValidated={() => setValidated(true)} />;
  else if (nav === 'file-medical') main = <CataloguePage />;
  else if (nav === 'credit-card') main = <LaboGains />;
  else if (nav === 'users') main = <LaboMembres />;
  else main = <window.LaboDashboard sampled={sampled} onScan={() => setScan(true)} onResults={() => setNav('activity')} />;
  return (
    <div className="app">
      <window.LaboSidebar nav={nav === 'syringe' ? 'dashboard' : nav} setNav={(n) => setNav(n === 'syringe' ? 'dashboard' : n)} theme={theme} onTheme={toggleTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <window.LaboTopbar crumb={NAMES[nav]} />
        {main}
      </div>
      {scan && <window.LaboScanModal onClose={() => setScan(false)} onDone={() => setSampled(true)} />}
    </div>
  );
}

window.LaboApp = LaboApp;

/* ULAMU — App professionnel (desktop). Cockpit soignant : sidebar glass,
   topbar contextuelle, tableau de bord (KPIs, poignées de main, gains en
   area chart — seul dégradé autorisé), session de consultation complète. */
const D = window.ULAMUDesignSystem_d14300;
const { Button, IconButton, Badge, Avatar, Input, Card, SessionTimer, VerifiedBadge, Icon, Banner, NavItem, Tabs, Switch } = D;

const REQUESTS = [
  { id: 1, name: 'Mireille Nkounkou', age: 32, motif: 'Douleurs thoraciques le soir, fatigue inhabituelle', zone: 'Talangaï', price: 5000, wait: '2 min', tags: ['Hypertension traitée', 'Triage versé'] },
  { id: 2, name: 'Prisca Bahounga', age: 22, motif: 'Question de santé intime — discrétion demandée', zone: 'Centre-ville', price: 5000, wait: '6 min', tags: ['Première consultation'] },
];
const AGENDA = [
  { h: '18:30', t: 'Session — Papa Gaston', s: 'Suivi hypertension · tarif réduit', state: 'done' },
  { h: '19:42', t: 'Session — Mireille Nkounkou', s: 'Consultation 30 min', state: 'now' },
  { h: '20:30', t: 'Session — Prisca Bahounga', s: 'Consultation 30 min', state: 'next' },
  { h: '21:00', t: 'Fin de disponibilité', s: 'Passage hors ligne automatique', state: 'next' },
];
const GAINS = [12, 22, 16, 30, 24, 38, 34]; // milliers F, Lun→Dim
const fmtF = (n) => n.toLocaleString('fr-FR') + ' F';

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      {right}
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({ nav, setNav, theme, onTheme }) {
  const main = [['dashboard', 'Tableau de bord', null], ['consultation', 'Consultations', '2'], ['patient', 'Patients', null], ['rendez-vous', 'Agenda', null]];
  const gestion = [['ordonnance', 'Ordonnances', null], ['credit-card', 'Gains', null], ['users', 'Annuaire', null]];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hovItem, setHovItem] = React.useState(null);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);
  const itemStyle = (id, danger) => ({
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 34, padding: '0 10px',
    border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', textAlign: 'left',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    background: hovItem === id ? (danger ? 'var(--error-bg)' : 'var(--bg-subtle)') : 'transparent',
    color: danger ? 'var(--error-text)' : 'var(--text-primary)',
    transition: 'background var(--dur-fast) linear',
  });
  return (
    <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRight: '1px solid var(--glass-border)' }}>

      {/* ── Entête ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--accent-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".92" /><rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".72" /></svg>
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>ulamu</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--accent-300)', border: '1px solid rgba(111,146,218,0.3)', background: 'rgba(39,86,166,0.16)', borderRadius: 4, padding: '2px 5px' }}>PRO</span>
      </div>

      {/* ── Corps (défilable) ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', padding: '2px 12px 6px' }}>Activité</div>
        {main.map(([ic, l, b]) => <NavItem key={ic} icon={ic} label={l} badge={b} active={nav === ic} onClick={() => setNav(ic)} />)}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', padding: '14px 12px 6px' }}>Gestion</div>
        {gestion.map(([ic, l, b]) => <NavItem key={ic} icon={ic} label={l} badge={b} active={nav === ic} onClick={() => setNav(ic)} />)}
        {/* Gains du jour — mini-résumé */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: 'var(--accent-500)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)', marginTop: 14 }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.1 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)' }}>Gains du jour</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 3 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.4px', color: '#fff' }}>34 000 F</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                <Icon name="trending-up" size={11} />+12 %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pied : menu utilisateur ── */}
      <div ref={menuRef} style={{ flexShrink: 0, position: 'relative', padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        {menuOpen && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 12, right: 12, zIndex: 50,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)', padding: 6, animation: 'ulamu-menu-in var(--dur-base) var(--ease-spring)' }}>
            <style>{'@keyframes ulamu-menu-in{from{transform:translateY(6px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}'}</style>
            {/* Identité */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 10px' }}>
              <Avatar name="Armel Konaté" size="md" status="online" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr Armel Konaté</span>
                  <VerifiedBadge size="sm" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>Médecin généraliste · Rôle : prescripteur</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 4px 6px' }} />
            {/* Thème — bouton bascule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, padding: '0 10px' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15} /></span>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Thème sombre</span>
              <Switch checked={theme === 'dark'} onChange={onTheme} />
            </div>
            <button style={itemStyle('settings')} onMouseEnter={() => setHovItem('settings')} onMouseLeave={() => setHovItem(null)}>
              <span style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name="settings" size={15} /></span>Paramètres
            </button>
            <button style={itemStyle('profile')} onMouseEnter={() => setHovItem('profile')} onMouseLeave={() => setHovItem(null)}>
              <span style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name="user" size={15} /></span>Mon profil public
            </button>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 4px' }} />
            <button style={itemStyle('logout', true)} onMouseEnter={() => setHovItem('logout')} onMouseLeave={() => setHovItem(null)}>
              <span style={{ display: 'inline-flex' }}><Icon name="log-out" size={15} /></span>Se déconnecter
            </button>
          </div>
        )}
        <button onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px',
          border: '1px solid transparent', cursor: 'pointer', borderRadius: 'var(--radius-md)', textAlign: 'left',
          background: menuOpen ? 'var(--bg-subtle)' : 'transparent',
          borderColor: menuOpen ? 'var(--border-default)' : 'transparent',
          transition: 'background var(--dur-fast) linear',
        }}>
          <Avatar name="Armel Konaté" size="sm" status="online" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr Armel Konaté</span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-tertiary)' }}>Prescripteur</span>
          </span>
          <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><Icon name={menuOpen ? 'chevron-down' : 'chevron-up'} size={14} /></span>
        </button>
      </div>
    </aside>
  );
}

/* Bascule de thème — SVG inline (soleil/lune, style charte) */
function ProThemeToggle({ theme, onTheme }) {
  const dark = theme === 'dark';
  return (
    <button onClick={onTheme} title={dark ? 'Passer en clair' : 'Passer en sombre'} aria-label="Changer de thème"
      style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {dark
          ? <g><circle cx="8" cy="8" r="3.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" /></g>
          : <path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z" />}
      </svg>
    </button>
  );
}

/* ── Topbar ── */
function Topbar({ crumb, online, setOnline, session, theme, onTheme }) {
  return (
    <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px',
      background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-tertiary)' }}>
        {crumb.map((c, i) => (
          <React.Fragment key={c}>
            {i > 0 && <Icon name="chevron-right" size={12} />}
            <span style={{ color: i === crumb.length - 1 ? 'var(--text-primary)' : undefined, fontWeight: i === crumb.length - 1 ? 500 : 400 }}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ flex: 1, maxWidth: 360, marginLeft: 'auto' }}>
        <Input leftIcon="search" placeholder="Patient, ordonnance, dossier…" style={{ height: 32, fontSize: 13 }} />
      </div>
      {session != null && <SessionTimer seconds={session} warnBelow={120} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
        <Switch checked={online} onChange={() => setOnline(!online)} label={online ? 'En ligne' : 'Hors ligne'} />
      </div>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton icon="bell" variant="solid" label="Notifications" />
        <span style={{ position: 'absolute', top: 4, right: 5, width: 8, height: 8, borderRadius: '50%', background: 'var(--error-dot)', border: '2px solid var(--bg-base)' }} />
      </span>
    </div>
  );
}

/* ── Area chart (seul dégradé autorisé de la charte) ── */
function GainsChart() {
  const W = 560, H = 150, P = 8;
  const max = 40;
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const pts = GAINS.map((v, i) => [P + i * ((W - 2 * P) / 6), H - P - (v / max) * (H - 2 * P)]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="ggains" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2756A6" stopOpacity=".18" />
            <stop offset="100%" stopColor="#2756A6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={P} x2={W - P} y1={H - P - f * (H - 2 * P)} y2={H - P - f * (H - 2 * P)} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--border-default)" strokeWidth="1" />
        <polygon points={area} fill="url(#ggains)" />
        <polyline points={line} fill="none" stroke="var(--accent-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => i === 5
          ? <g key={i}><circle cx={p[0]} cy={p[1]} r="7" fill="var(--accent-500)" opacity=".22" /><circle cx={p[0]} cy={p[1]} r="3" fill="var(--accent-400)" /></g>
          : <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="var(--accent-400)" opacity=".55" />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 2px 0' }}>
        {days.map(d => <span key={d} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)' }}>{d}</span>)}
      </div>
    </div>
  );
}

/* ── Tableau de bord ── */
function Dashboard({ onOpen, online }) {
  const kpis = [
    ['Sessions du jour', '7', 'consultation', '+2 vs hier', 'success'],
    ['Gains de la semaine', '176 000 F', 'trending-up', '+12 % vs S-1', 'success'],
    ['Note moyenne', '4,8', 'star', '214 avis', 'neutral'],
    ['Comptes-rendus', '6/7', 'file-medical', '1 à rédiger', 'warning'],
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-300)', marginBottom: 6 }}>Jeudi 11 juin 2026 · 19:40</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 27, letterSpacing: '-0.7px', color: 'var(--text-primary)' }}>Bonsoir, Dr Konaté</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>Tarif affiché : 30 min / 5 000 F · commission contractuelle incluse</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" iconLeft="settings">Mes tarifs</Button>
          <Button variant="primary" iconLeft="rendez-vous">Mes disponibilités</Button>
        </div>
      </div>

      {!online && <Banner tone="warning" title="Vous êtes hors ligne" style={{ marginBottom: 18 }}>Les patients ne peuvent pas initier de poignée de main. Réactivez votre présence en haut à droite.</Banner>}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 26 }}>
        {kpis.map(([l, v, ic, d, tone]) => (
          <Card key={l} padding="15px 16px" grain interactive>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{l}</span>
              <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={14} /></span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.6px', color: 'var(--text-primary)', lineHeight: 1, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ marginTop: 8 }}><Badge tone={tone} size="sm" dot>{d}</Badge></div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div>
            <SectionLabel right={<Badge tone="accent" dot>{REQUESTS.length} en attente</Badge>}>Poignées de main à confirmer</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {REQUESTS.map(r => (
                <Card key={r.id} padding="16px" interactive>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <Avatar name={r.name} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.age} ans · {r.zone}</span>
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--warning-text)' }}>
                          <Icon name="clock" size={12} />attend {r.wait}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '5px 0 9px', lineHeight: 1.5 }}>{r.motif}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {r.tags.map(t => <Badge key={t} tone="neutral" size="sm">{t}</Badge>)}
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{fmtF(r.price)}</span>
                          <Button variant="ghost" size="sm">Plus tard</Button>
                          <Button variant="primary" size="sm" iconLeft="stethoscope" onClick={() => onOpen(r)}>Confirmer</Button>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>en milliers de F</span>}>Gains de la semaine</SectionLabel>
            <Card padding="18px 18px 12px">
              <GainsChart />
            </Card>
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div>
            <SectionLabel>Agenda de ce soir</SectionLabel>
            <Card padding="6px 16px">
              {AGENDA.map((a, i) => (
                <div key={a.h} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: a.state === 'now' ? 'var(--accent-300)' : 'var(--text-tertiary)', width: 38, flexShrink: 0, paddingTop: 1 }}>{a.h}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.state === 'now' ? 'var(--accent-400)' : a.state === 'done' ? 'var(--success-dot)' : 'var(--bg-muted)', border: a.state === 'next' ? '1px solid var(--border-strong)' : 'none' }} />
                    {i < AGENDA.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 18, background: 'var(--border-subtle)', marginTop: 4 }} />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: a.state === 'next' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{a.t}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{a.s}</span>
                  </span>
                  {a.state === 'now' && <Badge tone="accent" dot size="sm" style={{ marginLeft: 'auto', alignSelf: 'center' }}>Maintenant</Badge>}
                </div>
              ))}
            </Card>
          </div>

          <div>
            <SectionLabel>Avis récents</SectionLabel>
            <Card padding="6px 16px">
              {[['Mireille N.', 'Réponses claires, je recommande.', '5,0'], ['Gaston B.', 'Très patient avec moi, merci docteur.', '4,5']].map(([n, t, note], i) => (
                <div key={n} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>{n}</span>
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <Icon name="star" size={11} color="var(--warning-dot)" />{note}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.5 }}>{t}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ProSidebar = Sidebar;
window.ProTopbar = Topbar;
window.ProDashboard = Dashboard;
window.ProGainsChart = GainsChart;
window.ProSectionLabel = SectionLabel;
window.PRO_REQUESTS = REQUESTS;
window.proFmtF = fmtF;

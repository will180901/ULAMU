/* ULAMU — Espace structure : Pharmacie du Marché (Poto-Poto).
   Sidebar, topbar, tableau de bord (réservations 24 h issues des
   dévoilements) et flux de délivrance par scan QR (M09/M11). */
const PH = window.ULAMUDesignSystem_d14300;
const { Button, IconButton, Badge, Avatar, Input, Card, Icon, Banner, NavItem, Modal, Switch, VerifiedBadge } = PH;

const RESAS = [
  { id: 'RSV-2210', ord: 'ORD-2026-00412', meds: ['Amlodipine 5 mg', 'Ramipril 10 mg'], total: '5 500 F', left: '22 h 10', fresh: true },
  { id: 'RSV-2207', ord: 'ORD-2026-00405', meds: ['Paracétamol 1 g'], total: '1 200 F', left: '6 h 02', fresh: false },
  { id: 'RSV-2199', ord: 'ORD-2026-00398', meds: ['Métronidazole 500 mg', 'ORS sachets'], total: '4 800 F', left: '14 h 45', fresh: true },
];

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      {right}
    </div>
  );
}

function ThemeToggle({ theme, onTheme }) {
  const dark = theme === 'dark';
  return (
    <button onClick={onTheme} aria-label="Changer de thème" title={dark ? 'Passer en clair' : 'Passer en sombre'}
      style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {dark
          ? <g><circle cx="8" cy="8" r="3.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" /></g>
          : <path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z" />}
      </svg>
    </button>
  );
}

function Sidebar({ nav, setNav }) {
  const items = [['dashboard', 'Tableau de bord', null], ['clock', 'Réservations', '3'], ['database', 'Stock', null], ['qr-code', 'Délivrances', null], ['credit-card', 'Gains', null], ['users', 'Membres', null]];
  return (
    <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: 3,
      background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRight: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 14px' }}>
        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--accent-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".92" /><rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".72" /></svg>
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>ulamu</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--accent-300)', border: '1px solid rgba(111,146,218,0.3)', background: 'rgba(39,86,166,0.16)', borderRadius: 4, padding: '2px 5px' }}>STRUCTURE</span>
      </div>
      <Card padding="11px 12px" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="hospital" size={16} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Pharmacie du Marché</span>
              <VerifiedBadge size="sm" />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Poto-Poto, Brazzaville</div>
          </div>
        </div>
      </Card>
      {items.map(([ic, l, b]) => <NavItem key={ic} icon={ic} label={l} badge={b} active={nav === ic} onClick={() => setNav(ic)} />)}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />
        <NavItem icon="settings" label="Réglages" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 8px 0' }}>
          <Avatar name="Destin Malonga" size="sm" status="online" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>M. Destin Malonga</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Titulaire</div>
          </div>
          <IconButton icon="log-out" size="sm" label="Déconnexion" />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumb, theme, onTheme, freshHours }) {
  const stale = freshHours >= 48;
  return (
    <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px',
      background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{crumb}</div>
      <div style={{ flex: 1, maxWidth: 340, marginLeft: 'auto' }}>
        <Input leftIcon="search" placeholder="Médicament, lot, réservation…" style={{ height: 32, fontSize: 13 }} />
      </div>
      <Badge tone={stale ? 'warning' : 'success'} dot>{stale ? 'Stock périmé — invisible' : `Stock à jour il y a ${freshHours} h`}</Badge>
      <ThemeToggle theme={theme} onTheme={onTheme} />
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton icon="bell" variant="solid" label="Notifications" />
        <span style={{ position: 'absolute', top: 4, right: 5, width: 8, height: 8, borderRadius: '50%', background: 'var(--error-dot)', border: '2px solid var(--bg-base)' }} />
      </span>
    </div>
  );
}

/* ── Flux de délivrance : scan → vérification → délivré ── */
function ScanModal({ onClose, onDelivered }) {
  const [phase, setPhase] = React.useState('scan'); // scan → found → done
  React.useEffect(() => {
    if (phase !== 'scan') return;
    const t = setTimeout(() => setPhase('found'), 2200);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <Modal title={phase === 'done' ? 'Délivrance confirmée' : 'Scanner une ordonnance'} onClose={onClose} width={440}
      footer={phase === 'found'
        ? <>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" iconLeft="check" onClick={() => setPhase('done')}>Confirmer la délivrance · 5 500 F</Button>
          </>
        : phase === 'done'
          ? <Button variant="primary" iconLeft="check-circle" onClick={() => { onDelivered(); onClose(); }}>Terminer</Button>
          : <Button variant="secondary" onClick={onClose}>Annuler</Button>}>
      {phase === 'scan' && (
        <div style={{ textAlign: 'center', padding: '14px 0 18px' }}>
          <style>{'@keyframes uscan{0%,100%{transform:translateY(-44px)}50%{transform:translateY(44px)}}'}</style>
          <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 14px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--accent-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
            <Icon name="qr-code" size={56} strokeWidth={1.2} color="var(--text-disabled)" />
            <span style={{ position: 'absolute', left: 10, right: 10, height: 2, borderRadius: 1, background: 'var(--accent-400)', boxShadow: '0 0 12px rgba(39,86,166,0.8)', animation: 'uscan 1.6s ease-in-out infinite' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Présentez le QR du patient</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>Recherche de l'ordonnance en cours…</div>
        </div>
      )}
      {phase === 'found' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 6 }}>
          <Banner tone="success" title="Ordonnance authentique — ORD-2026-00412">Signée par Dr Armel Konaté · 11 juin 2026 · jamais délivrée.</Banner>
          {[['Amlodipine 5 mg', 'lot AML-0925 · 1 boîte', '2 400 F'], ['Ramipril 10 mg', 'lot RAM-1124 · 1 boîte', '3 100 F']].map(([m, lot, p]) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--accent-300)', display: 'inline-flex' }}><Icon name="pill" size={15} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>{m}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>{lot}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-primary)' }}>{p}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
            <Icon name="database" size={13} />Le stock sera décrémenté automatiquement à la confirmation.
          </div>
        </div>
      )}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '14px 0 16px' }}>
          <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-dot)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="check-circle" size={28} />
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>2 médicaments délivrés</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>Stock décrémenté · versé au dossier du patient<br />Réservation RSV-2210 clôturée</div>
        </div>
      )}
    </Modal>
  );
}

/* ── Tableau de bord ── */
function Dashboard({ onScan, delivered }) {
  const kpis = [
    ['Réservations actives', delivered ? '2' : '3', 'clock', 'expirent sous 24 h'],
    ['Délivrances du jour', delivered ? '9' : '8', 'qr-code', 'scan QR'],
    ['Gains dévoilements', '4 000 F', 'eye', '8 dévoilements'],
    ['Lignes de stock', '142', 'database', '3 lots à surveiller'],
  ];
  const list = delivered ? RESAS.slice(1) : RESAS;
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-300)', marginBottom: 6 }}>Jeudi 11 juin 2026 · 19:55</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.7px', color: 'var(--text-primary)' }}>Pharmacie du Marché</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>Les réservations vous amènent des clients sûrs — le produit est déjà bloqué.</p>
        </div>
        <Button variant="primary" size="lg" iconLeft="qr-code" onClick={onScan}>Scanner une ordonnance</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 26 }}>
        {kpis.map(([l, v, ic, d]) => (
          <Card key={l} padding="15px 16px" grain>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{l}</span>
              <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={14} /></span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.6px', color: 'var(--text-primary)', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 8 }}>{d}</div>
          </Card>
        ))}
      </div>

      <SectionLabel right={<Badge tone="accent" dot>{list.length} actives</Badge>}>Réservations 24 h — issues des dévoilements</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {delivered && <Banner tone="success" title="RSV-2210 délivrée et clôturée">2 médicaments remis · stock décrémenté automatiquement.</Banner>}
        {list.map(r => (
          <Card key={r.id} padding="16px" interactive>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="clock" size={18} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-accent)' }}>{r.id}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{r.ord}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{r.meds.join(' · ')}</div>
              </div>
              <Badge tone={parseInt(r.left) < 8 ? 'warning' : 'neutral'} size="sm" icon="clock">expire dans {r.left}</Badge>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.total}</span>
              <Button variant="secondary" size="sm" iconLeft="qr-code" onClick={onScan}>Délivrer</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

window.PharmaSidebar = Sidebar;
window.PharmaTopbar = Topbar;
window.PharmaDashboard = Dashboard;
window.PharmaScanModal = ScanModal;
window.PharmaSectionLabel = SectionLabel;

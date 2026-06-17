/* ULAMU — Back-office (M16) : pilotage du réseau, file de vérification
   des soignants (badge vérifié M03), sidebar admin + topbar. */
const AD = window.ULAMUDesignSystem_d14300;
const { Button, IconButton, Badge, Avatar, Input, Card, Icon, Banner, NavItem, Modal, Switch, VerifiedBadge } = AD;

const VERIFS = [
  { id: 'VER-0241', name: 'Dr Olga Ndinga', spec: 'Pédiatre · Brazzaville', docs: ['Diplôme d\'État', 'Ordre des médecins', 'Pièce d\'identité'], since: 'il y a 2 h', risk: null },
  { id: 'VER-0240', name: 'Brice Elenga', spec: 'Infirmier · Dolisie', docs: ['Diplôme d\'État', 'Pièce d\'identité'], since: 'il y a 5 h', risk: null },
  { id: 'VER-0238', name: '« Dr » Sosthène M.', spec: 'Généraliste · Brazzaville', docs: ['Diplôme illisible', 'Pièce d\'identité'], since: 'hier', risk: 'Numéro d\'ordre introuvable' },
];

function ASectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      {right}
    </div>
  );
}

/* ── Sidebar admin (entête / corps / pied menu utilisateur) ── */
function AdminSidebar({ nav, setNav, theme, onTheme }) {
  const items = [['dashboard', 'Pilotage', null], ['shield-check', 'Vérifications', '3'], ['alert-triangle', 'Litiges', '2'], ['hospital', 'Structures', null], ['database', 'Journal', null]];
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
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--accent-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".92" /><rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".72" /></svg>
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>ulamu</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--warning-text)', border: '1px solid var(--warning-border)', background: 'var(--warning-bg)', borderRadius: 4, padding: '2px 5px' }}>ADMIN</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', padding: '2px 12px 6px' }}>Réseau de soin</div>
        {items.map(([ic, l, b]) => <NavItem key={ic} icon={ic} label={l} badge={b} active={nav === ic} onClick={() => setNav(ic)} />)}
        <Banner tone="warning" title="Pilote Brazzaville" style={{ marginTop: 14 }}>Semaine 9 / 24 — objectif : 500 consultations / semaine.</Banner>
      </div>
      <div ref={menuRef} style={{ flexShrink: 0, position: 'relative', padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        {menuOpen && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 12, right: 12, zIndex: 50,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)', padding: 6, animation: 'ulamu-menu-in3 var(--dur-base) var(--ease-spring)' }}>
            <style>{'@keyframes ulamu-menu-in3{from{transform:translateY(6px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}'}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 10px' }}>
              <Avatar name="Lydie Bouanga" size="md" status="online" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Lydie Bouanga</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>Opérations · Rôle : superviseure</span>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 4px 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, padding: '0 10px' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15} /></span>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Thème sombre</span>
              <Switch checked={theme === 'dark'} onChange={onTheme} />
            </div>
            <button style={itemStyle('settings')} onMouseEnter={() => setHovItem('settings')} onMouseLeave={() => setHovItem(null)}>
              <span style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name="settings" size={15} /></span>Paramètres
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
          <Avatar name="Lydie Bouanga" size="sm" status="online" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>Lydie Bouanga</span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-tertiary)' }}>Superviseure</span>
          </span>
          <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><Icon name={menuOpen ? 'chevron-down' : 'chevron-up'} size={14} /></span>
        </button>
      </div>
    </aside>
  );
}

function AdminTopbar({ crumb }) {
  return (
    <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px',
      background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{crumb}</div>
      <div style={{ flex: 1, maxWidth: 340, marginLeft: 'auto' }}>
        <Input leftIcon="search" placeholder="Soignant, structure, litige…" style={{ height: 32, fontSize: 13 }} />
      </div>
      <Badge tone="success" dot>Réseau opérationnel</Badge>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton icon="bell" variant="solid" label="Notifications" />
        <span style={{ position: 'absolute', top: 4, right: 5, width: 8, height: 8, borderRadius: '50%', background: 'var(--error-dot)', border: '2px solid var(--bg-base)' }} />
      </span>
    </div>
  );
}

/* ── Modale d'examen d'un dossier de vérification ── */
function VerifModal({ v, onClose, onDecide }) {
  const [rejecting, setRejecting] = React.useState(false);
  return (
    <Modal title={`Dossier ${v.id}`} onClose={onClose} width={480}
      footer={rejecting
        ? <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>Retour</Button>
            <Button variant="danger" iconLeft="x" onClick={() => onDecide(v.id, 'reject')}>Confirmer le rejet</Button>
          </>
        : <>
            <Button variant="ghost" iconLeft="x" onClick={() => setRejecting(true)}>Rejeter</Button>
            <Button variant="primary" iconLeft="shield-check" onClick={() => onDecide(v.id, 'approve')}>Accorder le badge vérifié</Button>
          </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={v.name.replace(/[«»]/g, '')} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{v.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{v.spec} · déposé {v.since}</div>
          </div>
        </div>
        {v.risk && <Banner tone="error" title="Signal de risque">{v.risk} — vérifier auprès de l'ordre avant toute décision.</Banner>}
        {rejecting ? (
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Motif du rejet (transmis au demandeur)</div>
            <Input placeholder="Ex. : numéro d'ordre invérifiable…" defaultValue={v.risk || ''} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {v.docs.map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="file-medical" size={15} /></span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>{d}</span>
                <Button variant="ghost" size="sm" iconLeft="eye">Examiner</Button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
              <Icon name="lock" size={12} />Décision tracée au journal inaltérable (M04), avec votre identité.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

window.AdminSidebar = AdminSidebar;
window.AdminTopbar = AdminTopbar;
window.AdminVerifModal = VerifModal;
window.AdminSectionLabel = ASectionLabel;
window.ADMIN_VERIFS = VERIFS;

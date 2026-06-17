/* ULAMU — Espace structure : Laboratoire Avenir (Moungali).
   Demandes d'examens prescrites via ULAMU, accueil patient par scan QR,
   résultats saisis puis validés par le biologiste, versés au dossier. */
const LB = window.ULAMUDesignSystem_d14300;
const { Button, IconButton, Badge, Avatar, Input, Card, Icon, Banner, NavItem, Modal, Switch, VerifiedBadge } = LB;

const DEMANDES = [
  { id: 'EX-2026-0089', patient: 'Mireille Nkounkou', age: 32, prescripteur: 'Dr Armel Konaté', exams: ['NFS', 'Glycémie à jeun', 'Bilan lipidique', 'Créatininémie'], total: '18 500 F', state: 'attendu', when: 'aujourd\'hui' },
  { id: 'EX-2026-0087', patient: 'Papa Gaston Bemba', age: 58, prescripteur: 'Dr Armel Konaté', exams: ['Créatininémie', 'Ionogramme'], total: '9 000 F', state: 'preleve', when: '11:20' },
  { id: 'EX-2026-0085', patient: 'Clarisse Moukala', age: 41, prescripteur: 'Dr Solange Mbemba', exams: ['Test paludisme (TDR)', 'NFS'], total: '7 500 F', state: 'preleve', when: '09:48' },
];
const STATES = {
  attendu: ['info', 'Patient attendu'],
  preleve: ['warning', 'En analyse'],
  valider: ['warning', 'À valider'],
  verse: ['success', 'Versé au dossier'],
};

function LSectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      {right}
    </div>
  );
}

/* ── Sidebar shadcn : entête / corps / pied avec menu utilisateur ── */
function LaboSidebar({ nav, setNav, theme, onTheme }) {
  const items = [['dashboard', 'Tableau de bord', null], ['syringe', 'Demandes', '3'], ['activity', 'Résultats', '2'], ['file-medical', 'Catalogue', null], ['credit-card', 'Gains', null], ['users', 'Membres', null]];
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
      {/* Entête */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--accent-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".92" /><rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".72" /></svg>
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>ulamu</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--accent-300)', border: '1px solid rgba(111,146,218,0.3)', background: 'rgba(39,86,166,0.16)', borderRadius: 4, padding: '2px 5px' }}>LABO</span>
      </div>
      {/* Corps */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card padding="11px 12px" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="syringe" size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Laboratoire Avenir</span>
                <VerifiedBadge size="sm" />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Moungali, Brazzaville</div>
            </div>
          </div>
        </Card>
        {items.map(([ic, l, b]) => <NavItem key={ic} icon={ic} label={l} badge={b} active={nav === ic} onClick={() => setNav(ic)} />)}
      </div>
      {/* Pied : menu utilisateur */}
      <div ref={menuRef} style={{ flexShrink: 0, position: 'relative', padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        {menuOpen && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 12, right: 12, zIndex: 50,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)', padding: 6, animation: 'ulamu-menu-in2 var(--dur-base) var(--ease-spring)' }}>
            <style>{'@keyframes ulamu-menu-in2{from{transform:translateY(6px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}'}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 10px' }}>
              <Avatar name="Honorine Samba" size="md" status="online" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr Honorine Samba</span>
                  <VerifiedBadge size="sm" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>Biologiste · Rôle : titulaire</div>
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
          <Avatar name="Honorine Samba" size="sm" status="online" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr Honorine Samba</span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-tertiary)' }}>Titulaire · Biologiste</span>
          </span>
          <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><Icon name={menuOpen ? 'chevron-down' : 'chevron-up'} size={14} /></span>
        </button>
      </div>
    </aside>
  );
}

function LaboTopbar({ crumb }) {
  return (
    <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px',
      background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{crumb}</div>
      <div style={{ flex: 1, maxWidth: 340, marginLeft: 'auto' }}>
        <Input leftIcon="search" placeholder="Demande, patient, examen…" style={{ height: 32, fontSize: 13 }} />
      </div>
      <Badge tone="success" dot>Résultats sous 6 h en moyenne</Badge>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton icon="bell" variant="solid" label="Notifications" />
        <span style={{ position: 'absolute', top: 4, right: 5, width: 8, height: 8, borderRadius: '50%', background: 'var(--error-dot)', border: '2px solid var(--bg-base)' }} />
      </span>
    </div>
  );
}

/* ── Accueil patient : scan du QR de la demande ── */
function LaboScanModal({ onClose, onDone }) {
  const [phase, setPhase] = React.useState('scan');
  React.useEffect(() => {
    if (phase !== 'scan') return;
    const t = setTimeout(() => setPhase('found'), 2200);
    return () => clearTimeout(t);
  }, [phase]);
  const d = DEMANDES[0];
  return (
    <Modal title={phase === 'done' ? 'Prélèvement enregistré' : 'Accueillir un patient'} onClose={onClose} width={460}
      footer={phase === 'found'
        ? <>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" iconLeft="syringe" onClick={() => setPhase('done')}>Enregistrer le prélèvement</Button>
          </>
        : phase === 'done'
          ? <Button variant="primary" iconLeft="check-circle" onClick={() => { onDone(); onClose(); }}>Terminer</Button>
          : <Button variant="secondary" onClick={onClose}>Annuler</Button>}>
      {phase === 'scan' && (
        <div style={{ textAlign: 'center', padding: '14px 0 18px' }}>
          <style>{'@keyframes lscan{0%,100%{transform:translateY(-44px)}50%{transform:translateY(44px)}}'}</style>
          <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 14px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--accent-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
            <Icon name="qr-code" size={56} strokeWidth={1.2} color="var(--text-disabled)" />
            <span style={{ position: 'absolute', left: 10, right: 10, height: 2, borderRadius: 1, background: 'var(--accent-400)', boxShadow: '0 0 12px rgba(39,86,166,0.8)', animation: 'lscan 1.6s ease-in-out infinite' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Présentez le QR de la demande d'examens</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>Recherche de la demande en cours…</div>
        </div>
      )}
      {phase === 'found' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 6 }}>
          <Banner tone="success" title={`Demande authentique — ${d.id}`}>Prescrite par {d.prescripteur} · 11 juin 2026 · payée via ULAMU.</Banner>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
            <Avatar name={d.patient} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>{d.patient}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>PAT-2026-08317 · {d.age} ans</div>
            </div>
            <Badge tone="accent" size="sm" icon="shield-check">Identité confirmée</Badge>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.exams.map(x => <Badge key={x} tone="neutral" icon="activity">{x}</Badge>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
            <Icon name="info" size={13} />4 tubes à étiqueter — les codes s'impriment à l'enregistrement.
          </div>
        </div>
      )}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '14px 0 16px' }}>
          <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-dot)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="check-circle" size={28} />
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Prélèvement de {d.patient.split(' ')[0]} enregistré</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>4 tubes étiquetés · le prescripteur est notifié<br />Résultats attendus sous 6 h</div>
        </div>
      )}
    </Modal>
  );
}

/* ── Tableau de bord ── */
function LaboDashboard({ onScan, onResults, sampled }) {
  const kpis = [
    ['Demandes du jour', sampled ? '13' : '12', 'syringe', '3 en attente'],
    ['Résultats à valider', '2', 'activity', 'biologiste requis'],
    ['Délai moyen', '4 h 10', 'clock', 'prélèvement → résultat'],
    ['Gains du jour', '86 000 F', 'trending-up', '+9 % vs hier'],
  ];
  const list = sampled ? [{ ...DEMANDES[0], state: 'preleve', when: 'à l\'instant' }, ...DEMANDES.slice(1)] : DEMANDES;
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-300)', marginBottom: 6 }}>Jeudi 11 juin 2026 · 20:05</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.7px', color: 'var(--text-primary)' }}>Laboratoire Avenir</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>Chaque résultat validé est versé au dossier du patient et notifié au prescripteur.</p>
        </div>
        <Button variant="primary" size="lg" iconLeft="qr-code" onClick={onScan}>Accueillir un patient</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 26 }}>
        {kpis.map(([l, v, ic, d]) => (
          <Card key={l} padding="15px 16px" grain>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{l}</span>
              <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={14} /></span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.6px', color: 'var(--text-primary)', lineHeight: 1, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 8 }}>{d}</div>
          </Card>
        ))}
      </div>

      <LSectionLabel right={<Badge tone="accent" dot>{list.length} demandes</Badge>}>Demandes d'examens — prescrites via ULAMU</LSectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sampled && <Banner tone="success" title="Prélèvement de Mireille N. enregistré">4 tubes étiquetés · prescripteur notifié · résultats attendus sous 6 h.</Banner>}
        {list.map(d => {
          const [tone, label] = STATES[d.state];
          return (
            <Card key={d.id} padding="16px" interactive>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={d.patient} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-accent)' }}>{d.id}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{d.patient}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{d.age} ans · {d.when}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>{d.exams.join(' · ')}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 3 }}>Prescrit par {d.prescripteur}</div>
                </div>
                <Badge tone={tone} size="sm" dot>{label}</Badge>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{d.total}</span>
                {d.state === 'attendu'
                  ? <Button variant="secondary" size="sm" iconLeft="qr-code" onClick={onScan}>Accueillir</Button>
                  : <Button variant="ghost" size="sm" iconLeft="activity" onClick={onResults}>Résultats</Button>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

window.LaboSidebar = LaboSidebar;
window.LaboTopbar = LaboTopbar;
window.LaboScanModal = LaboScanModal;
window.LaboDashboard = LaboDashboard;
window.LaboSectionLabel = LSectionLabel;
window.LABO_DEMANDES = DEMANDES;

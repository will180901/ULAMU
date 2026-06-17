/* ULAMU — Back-office : Pilotage (KPIs réseau + courbe), Vérifications,
   Litiges, Structures, Journal inaltérable + racine AdminApp. */
const AD2 = window.ULAMUDesignSystem_d14300;
const { Button: AB, IconButton: AIB, Badge: ABD, Avatar: AAV, Card: AC, Icon: AIC, Banner: ABN, VerifiedBadge: AVB } = AD2;
const ASL = window.AdminSectionLabel;

function ARow({ children, last }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>{children}</div>;
}
function AShell({ title, sub, actions, children }) {
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

/* Courbe des consultations (dégradé autorisé : area chart uniquement) */
function NetChart() {
  const W = 560, H = 150, P = 8, max = 80;
  const vals = [22, 34, 31, 46, 52, 64, 71];
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const pts = vals.map((v, i) => [P + i * ((W - 2 * P) / 6), H - P - (v / max) * (H - 2 * P)]);
  const line = pts.map(p => p.join(',')).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gnet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2756A6" stopOpacity=".18" />
            <stop offset="100%" stopColor="#2756A6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={P} x2={W - P} y1={H - P - f * (H - 2 * P)} y2={H - P - f * (H - 2 * P)} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--border-default)" strokeWidth="1" />
        <polygon points={`${P},${H - P} ${line} ${W - P},${H - P}`} fill="url(#gnet)" />
        <polyline points={line} fill="none" stroke="var(--accent-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => i === 6
          ? <g key={i}><circle cx={p[0]} cy={p[1]} r="7" fill="var(--accent-500)" opacity=".22" /><circle cx={p[0]} cy={p[1]} r="3" fill="var(--accent-400)" /></g>
          : <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="var(--accent-400)" opacity=".55" />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 2px 0' }}>
        {days.map(d => <span key={d} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)' }}>{d}</span>)}
      </div>
    </div>
  );
}

/* ── Pilotage ── */
function Pilotage({ onVerifs }) {
  const kpis = [
    ['Patients inscrits', '12 480', 'users', '+340 cette semaine', 'success'],
    ['Consultations / jour', '71', 'consultation', 'record du pilote', 'success'],
    ['Volume semaine', '2,4 M F', 'trending-up', '+18 % vs S-1', 'success'],
    ['Taux de litiges', '0,8 %', 'alert-triangle', '2 ouverts', 'warning'],
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-300)', marginBottom: 6 }}>Jeudi 11 juin 2026 · 20:10 · pilote Brazzaville S9/24</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.7px', color: 'var(--text-primary)' }}>Pilotage du réseau</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>153 soignants vérifiés · 28 pharmacies · 6 laboratoires · 2 arrondissements couverts</p>
        </div>
        <AB variant="primary" iconLeft="shield-check" onClick={onVerifs}>File de vérification · 3</AB>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 26 }}>
        {kpis.map(([l, v, ic, d, tone]) => (
          <AC key={l} padding="15px 16px" grain>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{l}</span>
              <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><AIC name={ic} size={14} /></span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.6px', color: 'var(--text-primary)', lineHeight: 1, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ marginTop: 8 }}><ABD tone={tone} size="sm" dot>{d}</ABD></div>
          </AC>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24, alignItems: 'start' }}>
        <div>
          <ASL right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>consultations / jour</span>}>Activité de la semaine</ASL>
          <AC padding="18px 18px 12px"><NetChart /></AC>
        </div>
        <div>
          <ASL>Alertes opérationnelles</ASL>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ABN tone="error" title="Litige LIT-0034 — session non honorée">Remboursement automatique effectué · arbitrage du compte pro en attente.</ABN>
            <ABN tone="warning" title="Pharmacie Mavré — stock gelé">Aucune mise à jour depuis 52 h : masquée des recherches (règle de fraîcheur).</ABN>
            <ABN tone="info" title="Pic d'usage 19h–21h">82 % des consultations ont lieu le soir — prévoir la garde des médecins.</ABN>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vérifications ── */
function VerifsPage({ decided, onOpen }) {
  const rows = window.ADMIN_VERIFS.filter(v => !decided[v.id]);
  return (
    <AShell title="Vérifications" sub="Le badge vérifié est l'actif de confiance du réseau — chaque décision est tracée"
      actions={<AB variant="ghost" iconLeft="filter">Filtrer</AB>}>
      {Object.entries(decided).map(([id, d]) => (
        <ABN key={id} tone={d === 'approve' ? 'success' : 'error'} style={{ marginBottom: 12 }}
          title={d === 'approve' ? `${id} — badge vérifié accordé` : `${id} — dossier rejeté`}>
          {d === 'approve' ? 'Le soignant est désormais visible des patients avec son badge.' : 'Motif transmis au demandeur · signalement conservé.'}
        </ABN>
      ))}
      <AC padding="4px 18px">
        {rows.map((v, i) => (
          <ARow key={v.id} last={i === rows.length - 1}>
            <AAV name={v.name.replace(/[«»]/g, '')} size="md" />
            <div style={{ width: 90, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' }}>{v.id}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{v.name}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v.spec} · {v.docs.length} documents · {v.since}</div>
            </div>
            {v.risk ? <ABD tone="error" size="sm" dot>Signal de risque</ABD> : <ABD tone="neutral" size="sm" dot>À examiner</ABD>}
            <AB variant="primary" size="sm" iconLeft="eye" onClick={() => onOpen(v)}>Examiner</AB>
          </ARow>
        ))}
        {rows.length === 0 && <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>File vide — toutes les demandes sont traitées.</div>}
      </AC>
    </AShell>
  );
}

/* ── Litiges ── */
function LitigesPage() {
  const ROWS = [
    ['LIT-0034', 'Session non honorée', 'Patient remboursé auto · Dr F. Okemba (3ᵉ récidive)', 'Suspendre le compte ?', 'error'],
    ['LIT-0033', 'Réservation non tenue', 'Pharmacie Mavré · stock annoncé absent · 500 F remboursés', 'Avertissement envoyé', 'warning'],
    ['LIT-0029', 'Contestation de compte-rendu', 'Résolu en conciliation · clôturé hier', 'Clôturé', 'neutral'],
  ];
  return (
    <AShell title="Litiges" sub="Le remboursement est automatique — l'arbitrage humain ne porte que sur les comptes">
      <AC padding="4px 18px">
        {ROWS.map(([id, t, s, action, tone], i) => (
          <ARow key={id} last={i === ROWS.length - 1}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: tone === 'error' ? 'var(--error-bg)' : tone === 'warning' ? 'var(--warning-bg)' : 'var(--bg-muted)', border: '1px solid var(--border-subtle)', color: tone === 'error' ? 'var(--error-dot)' : tone === 'warning' ? 'var(--warning-dot)' : 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AIC name="alert-triangle" size={15} /></span>
            <div style={{ width: 86, flexShrink: 0 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' }}>{id}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{t}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s}</div>
            </div>
            <ABD tone={tone} size="sm" dot>{action}</ABD>
            <AIB icon="chevron-right" label="Ouvrir" />
          </ARow>
        ))}
      </AC>
    </AShell>
  );
}

/* ── Structures ── */
function StructuresPage() {
  const ROWS = [
    ['Pharmacie du Marché', 'Poto-Poto · 142 lignes de stock', 'À jour il y a 3 h', 'success'],
    ['Laboratoire Avenir', 'Moungali · 14 examens au catalogue', 'Résultats sous 6 h', 'success'],
    ['Pharmacie Mavré', 'Talangaï · 89 lignes de stock', 'Gelée — 52 h sans mise à jour', 'warning'],
    ['Clinique Espérance', 'Centre-ville · 8 soignants', 'Vérifiée', 'success'],
  ];
  return (
    <AShell title="Structures" sub="Pharmacies, laboratoires et cliniques du réseau"
      actions={<AB variant="primary" iconLeft="plus">Inviter une structure</AB>}>
      <AC padding="4px 18px">
        {ROWS.map(([n, meta, st, tone], i) => (
          <ARow key={n} last={i === ROWS.length - 1}>
            <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AIC name="hospital" size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{n}</span>
                <AVB size="sm" />
              </span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{meta}</div>
            </div>
            <ABD tone={tone} size="sm" dot>{st}</ABD>
            <AIB icon="chevron-right" label="Ouvrir" />
          </ARow>
        ))}
      </AC>
    </AShell>
  );
}

/* ── Journal inaltérable (M04) ── */
function JournalPage() {
  const ROWS = [
    ['20:08:41', 'verification.decision', 'VER-0239 approuvé · par L. Bouanga', 'a3f9…c21e'],
    ['20:02:17', 'litige.remboursement', 'LIT-0034 · 5 000 F → PAT-2026-04412 (auto)', '8be0…77d4'],
    ['19:58:03', 'ordonnance.signature', 'ORD-2026-00412 · Dr A. Konaté', 'f1c2…09ab'],
    ['19:51:44', 'session.cloture', 'SES-2026-18230 · compte-rendu versé', '57aa…e3f8'],
    ['19:42:09', 'paiement.capture', '5 000 F · MTN MoMo · poignée de main confirmée', 'c09d…41b2'],
  ];
  return (
    <AShell title="Journal" sub="Journal inaltérable (M04) — chaque écriture est chaînée par empreinte, rien ne s'efface">
      <AC padding="4px 18px">
        {ROWS.map(([h, type, detail, hash], i) => (
          <ARow key={i} last={i === ROWS.length - 1}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)', width: 58, flexShrink: 0 }}>{h}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-accent)', width: 180, flexShrink: 0 }}>{type}</span>
            <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-disabled)' }}><AIC name="lock" size={11} />{hash}</span>
          </ARow>
        ))}
      </AC>
      <ABN tone="info" style={{ marginTop: 16 }} title="Lecture seule">Le journal se consulte mais ne s'édite pas — y compris pour l'équipe ULAMU.</ABN>
    </AShell>
  );
}

/* ── Racine ── */
function AdminApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [openVerif, setOpenVerif] = React.useState(null);
  const [decided, setDecided] = React.useState({});
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('ulamu-theme', n); } catch (e) {}
    return n;
  });
  const NAMES = { dashboard: 'Pilotage', 'shield-check': 'Vérifications', 'alert-triangle': 'Litiges', hospital: 'Structures', database: 'Journal' };
  let main;
  if (nav === 'shield-check') main = <VerifsPage decided={decided} onOpen={setOpenVerif} />;
  else if (nav === 'alert-triangle') main = <LitigesPage />;
  else if (nav === 'hospital') main = <StructuresPage />;
  else if (nav === 'database') main = <JournalPage />;
  else main = <Pilotage onVerifs={() => setNav('shield-check')} />;
  return (
    <div className="app">
      <window.AdminSidebar nav={nav} setNav={setNav} theme={theme} onTheme={toggleTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <window.AdminTopbar crumb={NAMES[nav]} />
        {main}
      </div>
      {openVerif && (
        <window.AdminVerifModal v={openVerif} onClose={() => setOpenVerif(null)}
          onDecide={(id, d) => { setDecided(s => ({ ...s, [id]: d })); setOpenVerif(null); }} />
      )}
    </div>
  );
}

window.AdminApp = AdminApp;

/* ULAMU — App patient (mobile) · Accueil + Profil médecin.
   Design dense et hiérarchisé : héro rappel grainé, actions rapides,
   chips de filtres, cartes médecin premium. Icônes SVG uniquement. */
const U = window.ULAMUDesignSystem_d14300;
const { Button, IconButton, Badge, Avatar, Input, Card, Icon, Banner, VerifiedBadge } = U;

const DOCTORS = [
  { id: 'armel', name: 'Dr Armel Konaté', spec: 'Médecin généraliste', cat: 'general', price: 5000, follow: 2500, dur: 30, online: true, rating: '4,8', reviews: 214, zone: 'Moungali', resp: '~3 min', exp: '12 ans', patients: 460, bio: "Écoute d'abord, prescrit ensuite. Spécialiste du suivi hypertension et diabète." },
  { id: 'solange', name: 'Dr Solange Mbemba', spec: 'Gynécologue', cat: 'gyneco', price: 12000, follow: 6000, dur: 30, online: true, rating: '4,9', reviews: 96, zone: 'Centre-ville', resp: '~10 min', premium: true, exp: '15 ans', patients: 312, bio: 'Santé féminine en toute discrétion. Répond aussi aux questions intimes par messagerie.' },
  { id: 'firmin', name: 'Dr Firmin Okemba', spec: 'Dentiste', cat: 'dentiste', price: 7000, follow: 3500, dur: 20, online: false, rating: '4,6', reviews: 58, zone: 'Pointe-Noire', resp: '—', exp: '8 ans', patients: 190, bio: 'Urgences dentaires et conseils de prévention. Cabinet à Pointe-Noire centre.' },
  { id: 'nadege', name: 'Nadège Loemba', spec: 'Infirmière · triage à domicile', cat: 'infirmier', price: 2000, follow: 2000, dur: 15, online: true, rating: '4,7', reviews: 120, zone: 'Madingou', resp: '~5 min', exp: '10 ans', patients: 540, bio: 'Je me déplace chez vous : constantes, pansements, suivi des traitements.' },
];
const fmtF = (n) => n.toLocaleString('fr-FR') + ' F';

/* Micro-label de section (pattern charte : mono uppercase + filet) */
function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 2px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      {count != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-300)' }}>{count}</span>}
    </div>
  );
}

function GlassHeader({ children }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--glass-border)' }}>{children}</div>
  );
}

function LogoMark({ size = 28 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 'var(--radius-md)', background: 'var(--accent-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 16 16" fill="none">
        <path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill="#fff" fillOpacity=".92" />
        <rect x="5.5" y="12.5" width="5" height="1.5" rx=".75" fill="#fff" fillOpacity=".72" />
      </svg>
    </span>
  );
}

/* Pastille de notification sur une icône */
function BellWithDot({ onClick }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <IconButton icon="bell" variant="solid" label="Notifications" onClick={onClick} />
      <span style={{ position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--error-dot)', border: '2px solid var(--bg-base)' }} />
    </span>
  );
}

/* Carte médecin — flux social : bannière, grand avatar, bio, stats, CTA */
function DoctorRow({ d, onClick }) {
  const initials = d.name.replace('Dr ', '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <button className="uha" onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
      <Card padding="0" interactive style={{ overflow: 'hidden' }}>
        {/* Bannière — surface accent grainée avec motif médical en filigrane */}
        <div style={{ position: 'relative', height: 64, background: d.online ? 'var(--accent-500)' : 'var(--bg-muted)', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.12 }} />
          <span style={{ position: 'absolute', right: -8, top: -14, color: d.online ? 'rgba(255,255,255,0.13)' : 'rgba(127,127,127,0.13)' }}>
            <Icon name={d.cat === 'gyneco' ? 'heart-pulse' : d.cat === 'dentiste' ? 'hospital' : d.cat === 'infirmier' ? 'activity' : 'stethoscope'} size={88} strokeWidth={1} />
          </span>
          {/* Statut — sur la bannière */}
          <span style={{ position: 'absolute', top: 10, left: 14 }}>
            <Badge tone={d.online ? 'success' : 'neutral'} dot size="sm" style={{ background: 'var(--bg-elevated)' }}>{d.online ? 'Disponible maintenant' : 'Hors ligne'}</Badge>
          </span>
          {d.online && (
            <span style={{ position: 'absolute', top: 10, right: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-full)', padding: '3px 9px' }}>
              <Icon name="send" size={10} />répond en {d.resp}
            </span>
          )}
        </div>

        {/* Avatar XL à cheval sur la bannière */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -26 }}>
            <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
              <span style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--accent-600)', border: '3px solid var(--bg-elevated)', boxShadow: 'var(--shadow-md)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: '#fff' }}>{initials}</span>
              {d.online && <span style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--success-dot)', border: '2.5px solid var(--bg-elevated)' }} />}
            </span>
            {d.premium && <Badge tone="warning" size="sm" icon="star" style={{ marginBottom: 6 }}>Très demandée</Badge>}
          </div>

          {/* Identité */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16.5, letterSpacing: '-0.3px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{d.name}</span>
            <VerifiedBadge size="sm" />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-accent)', fontWeight: 600, marginTop: 2 }}>{d.spec} · {d.zone}</div>

          {/* Bio */}
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 7 }}>{d.bio}</div>

          {/* Stats sociales */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '12px 0 0', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
            {[[d.rating, `${d.reviews} avis`, 'star'], [`${d.patients}+`, 'patients', 'users'], [d.exp, 'expertise', 'shield-check']].map(([v, l, ic], i) => (
              <span key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, borderLeft: i ? '1px solid var(--border-subtle)' : 'none', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  <Icon name={ic} size={12} color={ic === 'star' ? 'var(--warning-dot)' : 'var(--accent-300)'} />{v}
                </span>
                <span style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{l}</span>
              </span>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 8, padding: '2px 0 14px' }}>
            <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, borderRadius: 'var(--radius-md)', background: d.online ? 'var(--accent-500)' : 'var(--bg-muted)', color: d.online ? '#fff' : 'var(--text-tertiary)', border: d.online ? 'none' : '1px solid var(--border-default)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, position: 'relative', overflow: 'hidden' }}>
              {d.online && <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />}
              <Icon name="stethoscope" size={14} /><span style={{ position: 'relative' }}>Voir le profil</span>
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="share" size={14} />
            </span>
          </div>
        </div>
      </Card>
    </button>
  );
}

/* ── ACCUEIL ── */
function HomeView({ onPick, onAction, theme, onTheme }) {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('tous');
  const [taken, setTaken] = React.useState(false);
  const CHIPS = [['tous', 'Tous'], ['general', 'Généraliste'], ['gyneco', 'Gynécologie'], ['dentiste', 'Dentaire'], ['infirmier', 'Triage']];
  const list = DOCTORS.filter(d => (cat === 'tous' || d.cat === cat) && (d.name + d.spec).toLowerCase().includes(q.toLowerCase()));
  const QUICK = [
    ['stethoscope', 'Consulter', 'un médecin', () => { const el = document.getElementById('search-medecin'); if (el) { el.focus(); } }],
    ['pill', 'Médicaments', 'trouver & réserver', () => onAction('meds')],
    ['activity', 'Triage', 'à domicile', () => onPick(DOCTORS[3])],
    ['file-medical', 'Mon dossier', 'à vie, gratuit', () => onAction('dossier')],
  ];
  return (
    <div className="scr">
      <GlassHeader>
        <LogoMark />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>ulamu</span>
        <window.PatientThemeToggle theme={theme} onTheme={onTheme} />
        <BellWithDot onClick={() => onAction('notif')} />
        <Avatar name="Mireille Nkounkou" size="sm" />
      </GlassHeader>

      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Salutation */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Bonsoir,</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.6px', color: 'var(--text-primary)', lineHeight: 1.15 }}>Mireille Nkounkou</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
            <Icon name="map-pin" size={12} />Talangaï, Brazzaville
          </div>
        </div>

        {/* Héro rappel — surface accent grainée */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)', background: taken ? 'var(--bg-elevated)' : 'var(--accent-500)', border: taken ? '1px solid var(--success-border)' : 'none', padding: 16, boxShadow: 'var(--shadow-md)', transition: 'background var(--dur-moderate) linear' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: taken ? 0.04 : 0.1, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: 'var(--radius-lg)', background: taken ? 'var(--success-bg)' : 'rgba(255,255,255,0.16)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: taken ? 'var(--success-dot)' : '#fff' }}>
              <Icon name={taken ? 'check-circle' : 'pill'} size={20} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: taken ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.66)' }}>Rappel de médicament</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, color: taken ? 'var(--text-primary)' : '#fff', marginTop: 2 }}>Amlodipine 5 mg</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: taken ? 'var(--success-text)' : 'rgba(255,255,255,0.82)', marginTop: 2 }}>
                <Icon name={taken ? 'check' : 'clock'} size={12} />{taken ? 'Pris ce soir — prochain rappel demain 20:00' : 'Ce soir, 20:00'}
              </div>
            </div>
            {!taken && (
              <button className="uha" onClick={() => setTaken(true)} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 'var(--radius-md)', padding: '7px 11px', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12 }}>
                <Icon name="check" size={12} strokeWidth={2.2} />Pris
              </button>
            )}
          </div>
        </div>

        {/* Actions rapides */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {QUICK.map(([ic, t, s, fn]) => (
            <button key={t} className="uha" onClick={fn} style={{ all: 'unset', cursor: 'pointer' }}>
              <Card padding="11px 6px" interactive style={{ textAlign: 'center' }}>
                <span style={{ width: 34, height: 34, margin: '0 auto 7px', borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={ic} size={17} />
                </span>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11.5, color: 'var(--text-primary)' }}>{t}</div>
                <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{s}</div>
              </Card>
            </button>
          ))}
        </div>

        {/* Recherche + filtres */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input id="search-medecin" leftIcon="search" placeholder="Spécialité, nom du médecin…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginRight: -16 }} className="chips">
            {CHIPS.map(([id, l]) => {
              const on = cat === id;
              return (
                <button key={id} className="uha" onClick={() => setCat(id)} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0,
                  padding: '6px 13px', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: on ? 600 : 500,
                  background: on ? 'var(--accent-500)' : 'var(--bg-muted)', color: on ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${on ? 'var(--accent-500)' : 'var(--border-default)'}`,
                  transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear' }}>{l}</button>
              );
            })}
          </div>
        </div>

        {/* Liste */}
        <SectionLabel count={list.length}>Disponibles maintenant</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
          {list.map(d => <DoctorRow key={d.id} d={d} onClick={() => onPick(d)} />)}
          {list.length === 0 && (
            <Card padding="26px" style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon name="search" size={24} strokeWidth={1.4} /></span>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aucun soignant ne correspond.</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PROFIL MÉDECIN ── */
function DoctorView({ d, onBack, onInitiate }) {
  return (
    <div className="scr">
      <GlassHeader>
        <IconButton icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Profil du soignant</span>
        <IconButton icon="share" label="Partager" />
      </GlassHeader>

      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 90 }}>
        {/* Identité */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar name={d.name} status={d.online ? 'online' : undefined} size="xl" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              <VerifiedBadge />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{d.spec}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Badge tone={d.online ? 'success' : 'neutral'} dot size="sm">{d.online ? 'En ligne' : 'Hors ligne'}</Badge>
              <Badge tone="neutral" size="sm" icon="map-pin">{d.zone}</Badge>
            </div>
          </div>
        </div>

        {/* Stats segmentées */}
        <Card padding="0">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[['star', d.rating, `${d.reviews} avis`], ['clock', `${d.dur} min`, 'par session'], ['send', d.resp, 'réponse']].map(([ic, v, l], i) => (
              <div key={l} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ color: 'var(--accent-300)', display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon name={ic} size={15} /></span>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>{v}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tarifs */}
        <SectionLabel>Tarifs</SectionLabel>
        <Card padding="4px 14px">
          {[['stethoscope', 'Consultation', `${d.dur} min · messagerie`, fmtF(d.price)], ['refresh', 'Session de suivi', 'tarif réduit', fmtF(d.follow)], ['ordonnance', 'Ordonnance signée', 'incluse', 'Gratuit']].map(([ic, t, s, p], i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><Icon name={ic} size={16} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{s}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: p === 'Gratuit' ? 'var(--success-text)' : 'var(--text-primary)' }}>{p}</span>
            </div>
          ))}
        </Card>

        {/* Pré-consultation */}
        <SectionLabel>Avant la session</SectionLabel>
        <Card padding="14px">
          <div style={{ display: 'flex', gap: 11 }}>
            <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="file-medical" size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>Pré-consultation gratuite</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 3 }}>Décrivez votre motif en quelques questions. {d.name.split(' ').slice(0, 2).join(' ')} le lira dès la poignée de main.</div>
            </div>
          </div>
        </Card>

        <Banner tone="info" title="Poignée de main avant paiement">
          Aucun franc n'est débité tant que le soignant n'a pas confirmé être prêt. Remboursement automatique en cas de défaillance.
        </Banner>
      </div>

      {/* Footer collant */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>{fmtF(d.price)}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>débité après la poignée de main</div>
        </div>
        <Button variant="primary" iconLeft="stethoscope" disabled={!d.online} onClick={onInitiate}>
          {d.online ? 'Initier la consultation' : 'Hors ligne'}
        </Button>
      </div>
    </div>
  );
}

window.PatientGlassHeader = GlassHeader;
window.PatientSectionLabel = SectionLabel;
window.PatientLogoMark = LogoMark;
window.PatientHome = HomeView;
window.PatientDoctor = DoctorView;
window.PATIENT_DOCTORS = DOCTORS;
window.patientFmtF = fmtF;

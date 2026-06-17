/* ULAMU — App professionnel : vues de navigation (Consultations, Patients,
   Agenda, Ordonnances, Gains, Annuaire). Compactes, données réalistes. */
const P = window.ULAMUDesignSystem_d14300;
const { Button: PB, IconButton: PIB, Badge: PBD, Avatar: PAV, Input: PIN, Card: PC, Icon: PIC, Banner: PBN, Tabs: PTB, Switch: PSW, VerifiedBadge: PVB } = P;
const PSL = window.ProSectionLabel;
const pF = window.proFmtF;

function PageShell({ title, sub, actions, children }) {
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

function Row({ children, last }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>{children}</div>;
}

/* ── Consultations ── */
function ConsultationsPage({ onOpen }) {
  const [f, setF] = React.useState('attente');
  const DONE = [
    ['Papa Gaston Bemba', 'Suivi hypertension', '18:30 · 15 min', 2500, 'Terminée'],
    ['Clarisse Moukala', 'Migraines récurrentes', 'hier · 30 min', 5000, 'Terminée'],
    ['Prisca Bahounga', 'Consultation', '9 juin · 30 min', 5000, 'Compte-rendu manquant'],
  ];
  return (
    <PageShell title="Consultations" sub="Poignées de main, sessions en cours et historique"
      actions={<PB variant="ghost" iconLeft="filter">Filtrer</PB>}>
      <PTB value={f} onChange={setF} items={[
        { id: 'attente', label: 'En attente', badge: '2' },
        { id: 'historique', label: 'Historique', icon: 'consultation' },
      ]} style={{ marginBottom: 18 }} />
      {f === 'attente' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {window.PRO_REQUESTS.map(r => (
            <PC key={r.id} padding="16px" interactive>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <PAV name={r.name} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>{r.name}</span>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{r.motif}</div>
                </div>
                <PBD tone="warning" dot size="sm">attend {r.wait}</PBD>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{pF(r.price)}</span>
                <PB variant="primary" size="sm" iconLeft="stethoscope" onClick={() => onOpen(r)}>Confirmer</PB>
              </div>
            </PC>
          ))}
        </div>
      ) : (
        <PC padding="4px 18px">
          {DONE.map(([n, m, when, price, st], i) => (
            <Row key={n} last={i === DONE.length - 1}>
              <PAV name={n} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{n}</span>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{m}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{when}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', width: 64, textAlign: 'right' }}>{pF(price)}</span>
              <PBD tone={st === 'Terminée' ? 'success' : 'warning'} size="sm" dot>{st}</PBD>
            </Row>
          ))}
        </PC>
      )}
    </PageShell>
  );
}

/* ── Patients ── */
function PatientsPage() {
  const ROWS = [
    ['Mireille Nkounkou', '32 ans · Talangaï', '3 sessions', 'Allergie pénicilline', 'error'],
    ['Papa Gaston Bemba', '58 ans · Pointe-Noire', '8 sessions', 'Hypertension', 'warning'],
    ['Prisca Bahounga', '22 ans · Centre-ville', '1 session', 'RAS', 'neutral'],
    ['Clarisse Moukala', '41 ans · Moungali', '2 sessions', 'RAS', 'neutral'],
  ];
  return (
    <PageShell title="Patients" sub="Patients rencontrés en session — accès dossier limité au cadre de soin"
      actions={<PIN leftIcon="search" placeholder="Rechercher un patient…" wrapperStyle={{ width: 260 }} />}>
      <PC padding="4px 18px">
        {ROWS.map(([n, meta, s, tag, tone], i) => (
          <Row key={n} last={i === ROWS.length - 1}>
            <PAV name={n} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{n}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{meta}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{s}</span>
            <PBD tone={tone} size="sm" dot={tone !== 'neutral'}>{tag}</PBD>
            <PIB icon="chevron-right" label="Ouvrir" />
          </Row>
        ))}
      </PC>
    </PageShell>
  );
}

/* ── Agenda ── */
function AgendaPage() {
  const SLOTS = [
    ['17:00', 'Disponibilité ouverte', 'créneau libre', 'free'],
    ['18:30', 'Papa Gaston Bemba', 'Suivi hypertension · 2 500 F', 'done'],
    ['19:42', 'Mireille Nkounkou', 'Consultation 30 min · 5 000 F', 'now'],
    ['20:30', 'Prisca Bahounga', 'Consultation 30 min · 5 000 F', 'next'],
    ['21:00', 'Fin de disponibilité', 'passage hors ligne automatique', 'off'],
  ];
  const C = { done: 'var(--success-dot)', now: 'var(--accent-400)', next: 'var(--bg-muted)', free: 'var(--bg-muted)', off: 'var(--bg-muted)' };
  return (
    <PageShell title="Agenda" sub="Jeudi 11 juin 2026 — vos créneaux de disponibilité"
      actions={<PB variant="primary" iconLeft="plus">Ajouter un créneau</PB>}>
      <PC padding="6px 18px">
        {SLOTS.map(([h, t, s, st], i) => (
          <div key={h} style={{ display: 'flex', gap: 14, padding: '13px 0', borderBottom: i < SLOTS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: st === 'now' ? 'var(--accent-300)' : 'var(--text-tertiary)', width: 42, flexShrink: 0, paddingTop: 1 }}>{h}</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C[st], border: st === 'next' || st === 'free' || st === 'off' ? '1px solid var(--border-strong)' : 'none', marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: st === 'off' || st === 'free' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{t}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{s}</div>
            </div>
            {st === 'now' && <PBD tone="accent" dot size="sm">En cours</PBD>}
            {st === 'free' && <PB variant="ghost" size="sm">Fermer le créneau</PB>}
          </div>
        ))}
      </PC>
    </PageShell>
  );
}

/* ── Ordonnances ── */
function OrdonnancesPage() {
  const ROWS = [
    ['ORD-2026-00412', 'Mireille Nkounkou', 'Amlodipine · Ramipril', '11 juin', 'Réservée', 'accent'],
    ['ORD-2026-00398', 'Papa Gaston Bemba', 'Ramipril 10 mg', '4 juin', 'Délivrée', 'success'],
    ['ORD-2026-00371', 'Clarisse Moukala', 'Paracétamol · Sumatriptan', '28 mai', 'Délivrée', 'success'],
    ['ORD-2026-00342', 'Prisca Bahounga', 'Contraceptif oral', '12 mai', 'Expirée', 'neutral'],
  ];
  return (
    <PageShell title="Ordonnances" sub="Signées numériquement · QR vérifiable en pharmacie · garde-fou allergies"
      actions={<PB variant="ghost" iconLeft="download">Exporter</PB>}>
      <PC padding="4px 18px">
        {ROWS.map(([code, n, meds, dte, st, tone], i) => (
          <Row key={code} last={i === ROWS.length - 1}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PIC name="ordonnance" size={16} /></span>
            <div style={{ width: 150, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' }}>{code}</span>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{dte} 2026</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{n}</span>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meds}</div>
            </div>
            <PBD tone={tone} size="sm" dot>{st}</PBD>
            <PIB icon="qr-code" label="Voir le QR" />
          </Row>
        ))}
      </PC>
    </PageShell>
  );
}

/* ── Gains ── */
function GainsPage() {
  const TX = [
    ['Consultation — Mireille N.', '11 juin · 19:42', '+4 500 F', 'Commission 500 F'],
    ['Suivi — Papa Gaston B.', '11 juin · 18:30', '+2 250 F', 'Commission 250 F'],
    ['Retrait MTN MoMo', '10 juin', '-150 000 F', 'Vers 06 612 45 90'],
    ['Consultation — Clarisse M.', '10 juin', '+4 500 F', 'Commission 500 F'],
  ];
  return (
    <PageShell title="Gains" sub="L'argent aveugle : crédité après chaque acte, retirable à tout moment"
      actions={<PB variant="primary" iconLeft="credit-card">Retirer vers MoMo</PB>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)', background: 'var(--accent-500)', padding: 20, boxShadow: 'var(--shadow-md)' }}>
            <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 0.1 }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)' }}>Solde disponible</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-1px', color: '#fff', margin: '6px 0 10px' }}>86 750 F</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>
                <PIC name="shield-check" size={13} />Commission contractuelle : 10 % · jamais modifiée sans préavis
              </div>
            </div>
          </div>
          <PC padding="18px 18px 12px">
            <PSL right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>milliers de F</span>}>Semaine</PSL>
            <window.ProGainsChart />
          </PC>
        </div>
        <PC padding="4px 18px">
          {TX.map(([t, when, amt, note], i) => (
            <Row key={i} last={i === TX.length - 1}>
              <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: amt.startsWith('+') ? 'var(--success-bg)' : 'rgba(39,86,166,0.14)', color: amt.startsWith('+') ? 'var(--success-dot)' : 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PIC name={amt.startsWith('+') ? 'trending-up' : 'credit-card'} size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t}</span>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{when} · {note}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: amt.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)' }}>{amt}</span>
            </Row>
          ))}
        </PC>
      </div>
    </PageShell>
  );
}

/* ── Annuaire (vitrine publique M05) ── */
function AnnuairePage() {
  const [online, setOnline] = React.useState(true);
  return (
    <PageShell title="Annuaire" sub="Votre vitrine publique — ce que les patients voient avant la poignée de main">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <PC padding="20px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <PAV name="Armel Konaté" size="xl" status={online ? 'online' : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Dr Armel Konaté</span>
                <PVB />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>Médecin généraliste · Brazzaville</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <PBD tone={online ? 'success' : 'neutral'} dot size="sm">{online ? 'En ligne' : 'Hors ligne'}</PBD>
                <PBD tone="neutral" size="sm" icon="star">4,8 · 214 avis</PBD>
              </div>
            </div>
          </div>
          <PSW checked={online} onChange={() => setOnline(!online)} label="Visible dans les recherches des patients" />
          <PBN tone="info" style={{ marginTop: 14 }} title="Badge vérifié actif">Votre dossier de vérification (diplôme + ordre des médecins) est validé — il protège votre réputation contre les usurpateurs.</PBN>
        </PC>
        <PC padding="6px 18px">
          {[['stethoscope', 'Consultation messagerie', '30 min', '5 000 F', true], ['refresh', 'Session de suivi', '15 min', '2 500 F', true], ['video', 'Téléconsultation vidéo', '—', 'V1', false]].map(([ic, t, dur, p, on], i) => (
            <Row key={t} last={i === 2}>
              <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.14)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PIC name={ic} size={16} /></span>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: on ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{t}</span>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{dur}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: on ? 'var(--text-primary)' : 'var(--text-disabled)' }}>{p}</span>
              <PIB icon="edit" label="Modifier" size="sm" />
            </Row>
          ))}
        </PC>
      </div>
    </PageShell>
  );
}

window.ProPages = {
  consultation: ConsultationsPage,
  patient: PatientsPage,
  'rendez-vous': AgendaPage,
  ordonnance: OrdonnancesPage,
  'credit-card': GainsPage,
  users: AnnuairePage,
};

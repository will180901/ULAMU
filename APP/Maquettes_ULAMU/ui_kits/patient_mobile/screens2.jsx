/* ULAMU — App patient : écrans secondaires. Dévoilement-réservation
   (signature), QR d'ordonnance, dossier médical, notifications, thème. */
const U4 = window.ULAMUDesignSystem_d14300;
const { Button: B4, IconButton: IB4, Badge: BD4, Avatar: AV4, Input: IN4, Card: C4, Icon: IC4, Banner: BN4 } = U4;
const GH4 = window.PatientGlassHeader;
const SL4 = window.PatientSectionLabel;

/* Bascule de thème — SVG inline (soleil/lune, style charte) */
function ThemeToggle({ theme, onTheme }) {
  const dark = theme === 'dark';
  return (
    <button className="uha" onClick={onTheme} title={dark ? 'Passer en clair' : 'Passer en sombre'} aria-label="Changer de thème"
      style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 'var(--radius-md)',
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

/* ── Dévoilement-réservation (modèle signature D-009) ── */
function MedsScreen({ onBack, onShowQR }) {
  const [state, setState] = React.useState('anonymous'); // anonymous → revealed
  return (
    <div className="scr">
      <GH4>
        <IB4 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Trouver un médicament</span>
      </GH4>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Recherche par ordonnance */}
        <button className="uha" onClick={onShowQR} style={{ all: 'unset', cursor: 'pointer' }}>
          <C4 padding="13px" interactive style={{ borderColor: 'rgba(111,146,218,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC4 name="ordonnance" size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>Rechercher avec mon ordonnance</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>ORD-2026-00412 · 2 médicaments</div>
              </div>
              <IC4 name="chevron-right" size={15} color="var(--text-tertiary)" />
            </div>
          </C4>
        </button>
        <IN4 leftIcon="search" placeholder="Ou taper un médicament…" defaultValue="Amlodipine 5 mg" />

        {/* Résultat anonyme — gratuit */}
        <SL4>Disponibilité — Talangaï</SL4>
        <C4 padding="15px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', color: 'var(--success-dot)', border: '1px solid var(--success-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC4 name="pill" size={18} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>3 pharmacies ont vos 2 médicaments</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Information anonyme et gratuite · arrondissement Talangaï</div>
            </div>
          </div>
          {state === 'anonymous' ? (
            <>
              {/* Pharmacies masquées */}
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', color: 'var(--text-disabled)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC4 name="lock" size={13} /></span>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', height: 9, width: 110 + i * 14, borderRadius: 4, background: 'var(--bg-muted)' }} />
                    <span style={{ display: 'block', height: 7, width: 70 + i * 8, borderRadius: 4, background: 'var(--bg-muted)', marginTop: 5, opacity: 0.7 }} />
                  </div>
                  <BD4 tone="neutral" size="sm">En stock</BD4>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <B4 variant="primary" fullWidth iconLeft="eye" onClick={() => setState('revealed')}>Dévoiler & réserver · 500 F</B4>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <IC4 name="shield-check" size={12} color="var(--success-dot)" />Disponibilité garantie ou remboursé
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Dévoilé + réservé */}
              <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC4 name="hospital" size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Pharmacie du Marché</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      <IC4 name="map-pin" size={11} />Av. de la Paix, Poto-Poto · à 12 min
                    </div>
                  </div>
                  <BD4 tone="success" dot>Réservé</BD4>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[['Amlodipine 5 mg', '2 400 F'], ['Ramipril 10 mg', '3 100 F']].map(([m, p]) => (
                    <span key={m} style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{m}</span>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{p}</span>
                    </span>
                  ))}
                </div>
              </div>
              <BN4 tone="info" title="Réservation valable 23 h 54">Présentez le QR de votre ordonnance à la pharmacie. Le stock est bloqué pour vous.</BN4>
              <div style={{ marginTop: 12 }}>
                <B4 variant="primary" fullWidth iconLeft="qr-code" onClick={onShowQR}>Afficher le QR de délivrance</B4>
              </div>
            </>
          )}
        </C4>
      </div>
    </div>
  );
}

/* ── QR d'ordonnance — lisible en plein soleil : fond blanc forcé ── */
function QRScreen({ onBack }) {
  return (
    <div className="scr">
      <GH4>
        <IB4 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Ordonnance</span>
        <IB4 icon="download" label="Télécharger" />
      </GH4>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Zone QR : toujours blanche, contraste maximal (M09 §8) */}
        <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-xl)', padding: '26px 20px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
          <svg width="148" height="148" viewBox="0 0 16 16" fill="none" stroke="#111112" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto', display: 'block' }}>
            <rect x="1.5" y="1.5" width="5" height="5" rx="1" /><rect x="9.5" y="1.5" width="5" height="5" rx="1" /><rect x="1.5" y="9.5" width="5" height="5" rx="1" />
            <path d="M9.5 9.5h2v2M14.5 9.5v5M11.5 13.5h3" />
            <rect x="3.2" y="3.2" width="1.6" height="1.6" fill="#111112" stroke="none" /><rect x="11.2" y="3.2" width="1.6" height="1.6" fill="#111112" stroke="none" /><rect x="3.2" y="11.2" width="1.6" height="1.6" fill="#111112" stroke="none" />
          </svg>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#111112', marginTop: 14, letterSpacing: '0.04em' }}>ORD-2026-00412</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#71717A', marginTop: 3 }}>À présenter en pharmacie · luminosité au maximum</div>
        </div>

        <C4 padding="4px 14px">
          {[['pill', 'Amlodipine 5 mg', '1 cp / jour, le matin · 30 jours'], ['pill', 'Ramipril 10 mg', '1 cp / jour, le soir · 30 jours']].map(([ic, m, p], i) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ color: 'var(--accent-300)', display: 'inline-flex' }}><IC4 name={ic} size={16} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{m}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{p}</div>
              </div>
            </div>
          ))}
        </C4>

        <C4 padding="13px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AV4 name="Armel Konaté" size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Signée par Dr Armel Konaté</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>11 juin 2026 · valable 30 jours</div>
            </div>
            <BD4 tone="accent" icon="shield-check">Authentique</BD4>
          </div>
        </C4>
      </div>
    </div>
  );
}

/* ── Dossier médical à vie ── */
function DossierScreen({ onBack }) {
  const ENTRIES = [
    ['consultation', 'Consultation — Dr Armel Konaté', 'Douleurs thoraciques · compte-rendu versé', '11 juin 2026'],
    ['ordonnance', 'Ordonnance ORD-2026-00412', 'Amlodipine · Ramipril', '11 juin 2026'],
    ['activity', 'Triage — Nadège Loemba', 'Tension 13/8 · pouls 78', '8 mars 2026'],
    ['pill', 'Délivrance — Pharmacie du Marché', '2 médicaments · scan QR', '14 mars 2026'],
    ['file-medical', 'Ouverture du dossier', 'Gratuit, à vie', '2 juin 2025'],
  ];
  return (
    <div className="scr">
      <GH4>
        <IB4 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Dossier médical</span>
        <BD4 tone="success" icon="lock" size="sm">Chiffré</BD4>
      </GH4>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <BN4 tone="error" title="Allergie : pénicilline">Visible par tout soignant en session — garde-fou actif à la prescription.</BN4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['activity', '13/8', 'tension'], ['heart-pulse', '78', 'bpm'], ['users', 'O+', 'groupe']].map(([ic, v, l]) => (
            <C4 key={l} padding="10px 6px" style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--accent-300)', display: 'flex', justifyContent: 'center', marginBottom: 4 }}><IC4 name={ic} size={14} /></span>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{v}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{l}</div>
            </C4>
          ))}
        </div>
        <SL4>Historique</SL4>
        <C4 padding="4px 14px">
          {ENTRIES.map(([ic, t, s, dte], i) => (
            <div key={t} style={{ display: 'flex', gap: 11, padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IC4 name={ic} size={13} /></span>
                {i < ENTRIES.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 10, background: 'var(--border-subtle)', marginTop: 4 }} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{s}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-disabled)', marginTop: 3 }}>{dte}</div>
              </div>
            </div>
          ))}
        </C4>
      </div>
    </div>
  );
}

/* ── Notifications ── */
function NotifScreen({ onBack }) {
  const ITEMS = [
    ['stethoscope', 'Dr Armel Konaté a confirmé', 'Votre poignée de main est acceptée — vous pouvez régler.', 'il y a 2 min', true],
    ['pill', 'Rappel — Amlodipine 5 mg', 'À prendre ce soir à 20:00.', 'il y a 1 h', true],
    ['clock', 'Réservation bientôt expirée', 'Pharmacie du Marché · plus que 6 h pour retirer.', 'il y a 3 h', false],
    ['ordonnance', 'Ordonnance disponible', 'ORD-2026-00412 signée et versée au dossier.', 'hier', false],
  ];
  return (
    <div className="scr">
      <GH4>
        <IB4 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Notifications</span>
        <B4 variant="ghost" size="sm">Tout lire</B4>
      </GH4>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ITEMS.map(([ic, t, s, when, unread], i) => (
          <C4 key={i} padding="13px" interactive style={{ borderColor: unread ? 'rgba(111,146,218,0.3)' : undefined }}>
            <div style={{ display: 'flex', gap: 11 }}>
              <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IC4 name={ic} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{t}</span>
                  {unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-400)', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 2 }}>{s}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-disabled)', marginTop: 4 }}>{when}</div>
              </div>
            </div>
          </C4>
        ))}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <IC4 name="lock" size={11} />Jamais de contenu médical sur l'écran verrouillé
        </div>
      </div>
    </div>
  );
}

window.PatientThemeToggle = ThemeToggle;
window.PatientMeds = MedsScreen;
window.PatientQR = QRScreen;
window.PatientDossier = DossierScreen;
window.PatientNotifs = NotifScreen;

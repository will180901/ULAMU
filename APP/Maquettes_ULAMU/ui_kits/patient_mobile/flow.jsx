/* ULAMU — App patient : flux consultation (poignée de main → paiement →
   session), onglets Consultations / Mon espace, Urgence. Icônes SVG only. */
const U2 = window.ULAMUDesignSystem_d14300;
const { Button: B2, IconButton: IB2, Badge: BD2, Avatar: AV2, Input: IN2, Card: C2, SessionTimer: ST2, Icon: IC2, Banner: BN2, Modal: MD2 } = U2;
const GH = window.PatientGlassHeader;
const SL = window.PatientSectionLabel;
const fmtF2 = window.patientFmtF;

/* Indicateur d'étapes du parcours */
function StepBar({ step }) {
  const steps = ['Poignée de main', 'Paiement', 'Session'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px 2px' }}>
      {steps.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'on' : 'off';
        return (
          <React.Fragment key={s}>
            {i > 0 && <span style={{ flex: 1, height: 2, borderRadius: 1, background: i <= step ? 'var(--accent-500)' : 'var(--border-default)' }} />}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: state === 'off' ? 'var(--bg-muted)' : 'var(--accent-500)',
                border: `1px solid ${state === 'off' ? 'var(--border-default)' : 'var(--accent-500)'}`,
                color: state === 'off' ? 'var(--text-tertiary)' : '#fff' }}>
                {state === 'done'
                  ? <IC2 name="check" size={11} strokeWidth={2.4} />
                  : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 }}>{i + 1}</span>}
              </span>
              {state === 'on' && <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s}</span>}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── ÉTAPE 1 · Poignée de main ── */
function HandshakeView({ d, onBack, onConfirmed }) {
  const [confirmed, setConfirmed] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setConfirmed(true), 2800); return () => clearTimeout(t); }, []);
  return (
    <div className="scr">
      <GH>
        <IB2 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Consultation</span>
        <BD2 tone="neutral" size="sm" icon="lock">Sécurisé</BD2>
      </GH>
      <StepBar step={0} />
      <style>{`
        @keyframes upulse { 0% { transform: scale(.9); opacity: .55 } 100% { transform: scale(1.65); opacity: 0 } }
        @keyframes upop { 0% { transform: scale(.6); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
      `}</style>
      <div className="pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!confirmed && [0, 1].map(i => (
            <span key={i} style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '1.5px solid var(--accent-400)', animation: `upulse 1.8s ${i * 0.9}s ease-out infinite` }} />
          ))}
          <AV2 name={d.name} size="xl" />
          {confirmed && (
            <span style={{ position: 'absolute', bottom: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'var(--success-dot)', border: '3px solid var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', animation: 'upop var(--dur-moderate) var(--ease-spring)' }}>
              <IC2 name="check" size={14} strokeWidth={2.6} />
            </span>
          )}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
            {confirmed ? `${d.name} est prêt` : 'Poignée de main en cours…'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 5, maxWidth: 270, lineHeight: 1.55 }}>
            {confirmed
              ? 'Il a lu votre pré-consultation. Vous pouvez régler en toute confiance.'
              : 'Le soignant confirme sa disponibilité. Rien ne sera débité sans son accord.'}
          </div>
        </div>
        <C2 padding="12px 14px" style={{ width: '100%' }}>
          {[['file-medical', 'Pré-consultation', confirmed ? 'Lue par le soignant' : 'Transmise', confirmed], ['clock', 'Temps de session', `${d.dur} minutes`, true], ['credit-card', 'Montant bloqué', fmtF2(d.price), true]].map(([ic, t, v, ok], i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><IC2 name={ic} size={15} /></span>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>{t}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: ok ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{v}</span>
            </div>
          ))}
        </C2>
      </div>
      <div style={{ padding: 14, borderTop: '1px solid var(--glass-border)' }}>
        <B2 variant="primary" fullWidth size="lg" iconLeft="credit-card" disabled={!confirmed} onClick={onConfirmed}>
          {confirmed ? `Régler ${fmtF2(d.price)}` : 'En attente de confirmation…'}
        </B2>
      </div>
    </div>
  );
}

/* ── ÉTAPE 2 · Paiement MoMo ── */
function PayView({ d, onBack, onPaid }) {
  const [op, setOp] = React.useState('mtn');
  return (
    <div className="scr">
      <GH>
        <IB2 icon="arrow-left" label="Retour" onClick={onBack} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', flex: 1 }}>Paiement</span>
        <BD2 tone="neutral" size="sm" icon="lock">Sécurisé</BD2>
      </GH>
      <StepBar step={1} />
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Reçu détaillé */}
        <C2 padding="16px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px dashed var(--border-default)' }}>
            <AV2 name={d.name} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{d.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{d.spec}</div>
            </div>
            <BD2 tone="success" dot size="sm">Prêt</BD2>
          </div>
          {[['Consultation · ' + d.dur + ' min', fmtF2(d.price)], ['Commission ULAMU', 'incluse'], ['Frais cachés', 'aucun']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: v === fmtF2(d.price) ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>Total à payer</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.6px', color: 'var(--text-primary)' }}>{fmtF2(d.price)}</span>
          </div>
        </C2>

        <SL>Opérateur Mobile Money</SL>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['mtn', 'MTN MoMo', '06 612 45 90'], ['airtel', 'Airtel Money', '05 540 12 33']].map(([id, l, num]) => {
            const on = op === id;
            return (
              <button key={id} className="uha" onClick={() => setOp(id)} style={{ all: 'unset', cursor: 'pointer', flex: 1 }}>
                <C2 padding="13px" style={{ borderColor: on ? 'var(--accent-500)' : 'var(--border-subtle)', boxShadow: on ? '0 0 0 3px rgba(39,86,166,0.18)' : 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: on ? 'var(--accent-300)' : 'var(--text-tertiary)', display: 'inline-flex' }}><IC2 name="credit-card" size={18} /></span>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${on ? 'var(--accent-500)' : 'var(--border-strong)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-500)' }} />}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{l}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{num}</div>
                </C2>
              </button>
            );
          })}
        </div>

        <BN2 tone="info" title="Confirmez sur votre téléphone">
          Une demande {op === 'mtn' ? 'MTN MoMo' : 'Airtel Money'} s'affichera. Validez avec votre code secret — jamais dans l'app.
        </BN2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          <IC2 name="shield-check" size={13} color="var(--success-dot)" />Remboursement automatique si le soignant ne répond pas
        </div>
      </div>
      <div style={{ padding: 14, borderTop: '1px solid var(--glass-border)' }}>
        <B2 variant="primary" fullWidth size="lg" iconLeft="lock" onClick={onPaid}>Payer {fmtF2(d.price)}</B2>
      </div>
    </div>
  );
}

window.PatientStepBar = StepBar;
window.PatientHandshake = HandshakeView;
window.PatientPay = PayView;
// SessionView vit désormais dans chat.jsx (messagerie enrichie)

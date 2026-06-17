/* ULAMU — Session de consultation (mobile) : messagerie enrichie.
   Inspirée de la spec « messagerie interne » (doc 18) adaptée à ULAMU :
   accusés 3 états, citations, édition/suppression, notes vocales (onde,
   vitesse), albums médias, aperçu avant envoi, séparateur sticky, bouton
   descendre. Pas de groupes, pas de réactions emoji (charte). */
const UC = window.ULAMUDesignSystem_d14300;
const { IconButton: CIB, Badge: CBD, Avatar: CAV, Card: CC, Icon: CIC, SessionTimer: CST, Button: CB, Banner: CBN } = UC;

/* Icônes locales (dispo immédiate, dupliquées au catalogue icons.js) */
const CHAT_ICONS = {
  play: '<path d="M5.5 3.2l7.2 4.8-7.2 4.8V3.2z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/>',
  reply: '<path d="M6 10L2 6l4-4"/><path d="M2 6h8a4 4 0 0 1 4 4v3"/>',
  checkcheck: '<path d="M1.5 8.5l3 3 5.5-5.5"/><path d="M7.5 11l1 1L15 5.5"/>',
};
function LIc({ name, size = 14, strokeWidth = 1.5, color, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color || 'currentColor'}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block', ...style }} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: CHAT_ICONS[name] }} />
  );
}

const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const fmtMS = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const genWave = (n = 36) => Array.from({ length: n }, () => 0.18 + 0.82 * Math.pow(Math.random(), 0.55));

/* ── Accusé 3 états ── */
function Receipt({ status }) {
  if (!status || status === 'none') return null;
  if (status === 'pending') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: 'rgba(255,255,255,0.75)' }}><CIC name="clock" size={10} />envoi…</span>;
  if (status === 'sent') return <span style={{ color: 'rgba(255,255,255,0.75)', display: 'inline-flex' }}><CIC name="check" size={13} /></span>;
  return <span style={{ color: status === 'lu' ? '#9DE0FF' : 'rgba(255,255,255,0.75)', display: 'inline-flex' }}><LIc name="checkcheck" size={13} /></span>;
}

/* ── Lecteur de note vocale (onde 36 barres, seek, vitesse) ── */
const SPEEDS = [1, 1.5, 2];
function VoicePlayer({ wave, dur, mine }) {
  const [playing, setPlaying] = React.useState(false);
  const [prog, setProg] = React.useState(0);
  const [spd, setSpd] = React.useState(0);
  const waveRef = React.useRef(null);
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProg(p => {
        const n = p + (0.1 * SPEEDS[spd]) / dur;
        if (n >= 1) { setPlaying(false); return 0; }
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, spd, dur]);
  const seek = (e) => {
    const r = waveRef.current.getBoundingClientRect();
    setProg(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  const playedC = mine ? '#FFFFFF' : 'var(--accent-400)';
  const restC = mine ? 'rgba(255,255,255,0.42)' : 'var(--border-strong)';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9, width: 218, padding: '3px 2px' }}>
      <button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Écouter'} style={{
        width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: mine ? 'rgba(255,255,255,0.92)' : 'var(--accent-500)',
        color: mine ? 'var(--accent-600)' : '#fff',
      }}><LIc name={playing ? 'pause' : 'play'} size={15} /></button>
      <span ref={waveRef} onPointerDown={seek} style={{ flex: 1, height: 30, display: 'flex', alignItems: 'center', gap: 2, position: 'relative', cursor: 'pointer', touchAction: 'none' }}>
        {wave.map((a, i) => (
          <span key={i} style={{ flex: 1, maxWidth: 3, height: 3 + a * 21, borderRadius: 9999, background: (i / wave.length) <= prog ? playedC : restC }} />
        ))}
        <span style={{ position: 'absolute', top: '50%', left: `${prog * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: mine ? '#fff' : 'var(--accent-400)', boxShadow: '0 0 0 2px rgba(0,0,0,0.10)', pointerEvents: 'none' }} />
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontVariantNumeric: 'tabular-nums', color: mine ? 'rgba(255,255,255,0.85)' : 'var(--text-tertiary)', minWidth: 28, textAlign: 'right' }}>{fmtMS(dur)}</span>
      {playing && (
        <button onClick={() => setSpd(s => (s + 1) % 3)} style={{
          height: 21, padding: '0 7px', borderRadius: 9999, border: 'none', cursor: 'pointer', flexShrink: 0,
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          background: mine ? 'rgba(255,255,255,0.22)' : 'var(--bg-muted)',
          color: mine ? '#fff' : 'var(--text-accent)',
        }}>{String(SPEEDS[spd]).replace('.', ',')}×</button>
      )}
    </span>
  );
}

/* ── Enregistreur (44 barres, chrono, annuler / envoyer) ── */
function Recorder({ onSend, onCancel }) {
  const [sec, setSec] = React.useState(0);
  const [bars, setBars] = React.useState(Array(44).fill(0.06));
  React.useEffect(() => {
    const a = setInterval(() => setSec(s => s + 1), 1000);
    const b = setInterval(() => setBars(bs => [...bs.slice(1), 0.08 + 0.92 * Math.pow(Math.random(), 0.6)]), 80);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);
  React.useEffect(() => { if (sec >= 300) onSend(sec); }, [sec]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', minHeight: 38, flex: 1 }}>
      <style>{'@keyframes ulamu-rec{0%,100%{opacity:1}50%{opacity:.25}}'}</style>
      <button onClick={onCancel} aria-label="Annuler" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--error-dot)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <CIC name="trash" size={17} />
      </button>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--error-dot)', animation: 'ulamu-rec 1s infinite', flexShrink: 0 }} />
      <span style={{ flex: 1, height: 30, display: 'flex', alignItems: 'center', gap: 2 }}>
        {bars.map((a, i) => <span key={i} style={{ flex: 1, maxWidth: 4, height: 3 + a * 23, borderRadius: 9999, background: 'var(--accent-400)', transition: 'height 0.08s linear' }} />)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', minWidth: 36, textAlign: 'right' }}>{fmtMS(sec)}</span>
      <button onClick={() => onSend(sec)} aria-label="Envoyer la note vocale" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--accent-500)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
        <span style={{ position: 'relative', display: 'inline-flex' }}><CIC name="send" size={15} /></span>
      </button>
    </div>
  );
}

/* ── Album média (placeholder de démo) ── */
function MediaAlbum({ count, onOpen }) {
  const cols = count === 3 ? 3 : 2;
  const shown = Math.min(count, 4);
  return (
    <span onClick={onOpen} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2, width: 216, cursor: 'pointer' }}>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', overflow: 'hidden' }}>
          <CIC name="image" size={22} strokeWidth={1.3} />
          {i === 3 && count > 4 && (
            <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>+{count - 4}</span>
          )}
        </span>
      ))}
    </span>
  );
}

/* ── Lecteur plein-cadre (overlay local au fil) ── */
function MediaViewer({ onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <CIB icon="arrow-left" label="Fermer" onClick={onClose} />
        <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>photo-symptome.jpg</span>
        <CIB icon="download" variant="solid" label="Télécharger" />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div style={{ width: '100%', aspectRatio: '3/4', maxHeight: '100%', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-disabled)' }}>
          <CIC name="image" size={40} strokeWidth={1.2} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Aperçu — démo</span>
        </div>
      </div>
    </div>
  );
}

/* ── Aperçu avant envoi ── */
function PreviewOverlay({ onClose, onSend }) {
  const [caption, setCaption] = React.useState('');
  const [active, setActive] = React.useState(0);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <CIB icon="x" label="Annuler" onClick={onClose} />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>photo-{active + 1}.jpg</span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-tertiary)' }}>1,2 Mo · {active + 1}/3 fichiers</span>
        </span>
        <CBD tone="success" size="sm" icon="check">compressée · 4,1 → 1,2 Mo</CBD>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '88%', aspectRatio: '3/4', maxHeight: '100%', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-disabled)' }}>
          <CIC name="image" size={40} strokeWidth={1.2} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Aperçu — démo</span>
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: '10px 14px 14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend(caption)}
          placeholder="Ajouter une légende…" style={{
            height: 40, borderRadius: 9999, border: '1px solid var(--border-default)', background: 'var(--bg-subtle)',
            padding: '0 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
          }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setActive(i)} style={{ width: 52, height: 52, borderRadius: 10, cursor: 'pointer', border: `2.5px solid ${i === active ? 'var(--accent-400)' : 'var(--border-subtle)'}`, background: 'var(--bg-muted)', color: 'var(--text-disabled)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: i === active ? 'translateY(-2px)' : 'none', boxShadow: i === active ? 'var(--shadow-md)' : 'none', transition: 'transform var(--dur-fast) linear' }}>
              <CIC name="image" size={18} strokeWidth={1.3} />
            </button>
          ))}
          <button style={{ width: 52, height: 52, borderRadius: 10, cursor: 'pointer', border: '1.5px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <CIC name="plus" size={16} />
          </button>
          <span style={{ flex: 1 }} />
          <button onClick={() => onSend(caption)} aria-label="Envoyer" style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--accent-500)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
            <span style={{ position: 'relative', display: 'inline-flex' }}><CIC name="send" size={17} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Feuille d'actions (appui sur le chevron de bulle) ── */
function ActionSheet({ msg, step, onAction, onClose }) {
  const Row = ({ icon, local, label, danger, act }) => (
    <button onClick={() => onAction(act)} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 46, padding: '0 16px',
      border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, textAlign: 'left',
      color: danger ? 'var(--error-text)' : 'var(--text-primary)',
    }}>
      <span style={{ display: 'inline-flex', color: danger ? 'var(--error-dot)' : 'var(--text-secondary)' }}>
        {local ? <LIc name={icon} size={16} /> : <CIC name={icon} size={16} />}
      </span>{label}
    </button>
  );
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <style>{'@keyframes ulamu-sheet{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}'}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', borderRadius: '14px 14px 0 0', padding: '10px 8px calc(10px + env(safe-area-inset-bottom, 8px))', animation: 'ulamu-sheet var(--dur-moderate) var(--ease-spring)' }}>
        <span style={{ display: 'block', width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong)', margin: '0 auto 10px' }} />
        {step === 'delete' ? (
          <>
            <div style={{ padding: '4px 16px 10px', fontSize: 12.5, color: 'var(--text-tertiary)' }}>Supprimer ce message ?</div>
            <Row icon="eye-off" label="Supprimer pour moi" act="delete-me" />
            {msg.who === 'me' && <Row icon="trash" label="Supprimer pour tout le monde" danger act="delete-all" />}
            <Row icon="x" label="Annuler" act="close" />
          </>
        ) : (
          <>
            <Row icon="reply" local label="Répondre" act="reply" />
            <Row icon="copy" label="Copier" act="copy" />
            {msg.who === 'me' && msg.kind !== 'voice' && msg.kind !== 'album' && <Row icon="edit" label="Modifier" act="edit" />}
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 12px' }} />
            <Row icon="trash" label="Supprimer" danger act="delete" />
          </>
        )}
      </div>
    </div>
  );
}

window.UChatParts = { LIc, Receipt, VoicePlayer, Recorder, MediaAlbum, MediaViewer, PreviewOverlay, ActionSheet, nowHM, fmtMS, genWave };

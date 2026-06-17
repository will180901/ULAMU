/* ULAMU — SessionView (mobile) : fil de consultation chronométrée.
   Assemble les composants de chat.jsx. Remplace l'ancienne vue de flow.jsx. */
const US = window.ULAMUDesignSystem_d14300;
const { IconButton: SIB2, Badge: SBD2, Avatar: SAV2, Card: SC2, Icon: SIC2, SessionTimer: SST2, Button: SB2 } = US;
const { LIc: XLIc, Receipt: XReceipt, VoicePlayer: XVoice, Recorder: XRec, MediaAlbum: XAlbum, MediaViewer: XViewer, PreviewOverlay: XPreview, ActionSheet: XSheet, nowHM: xNow, fmtMS: xMS, genWave: xWave } = window.UChatParts;

let _mid = 100;
const SEED_MSGS = (d) => [
  { id: 1, who: 'doc', kind: 'text', t: 'Bonsoir Mireille, j\'ai lu votre pré-consultation. Depuis quand ressentez-vous ces douleurs ?', time: '19:42' },
  { id: 2, who: 'me', kind: 'text', t: 'Bonsoir docteur. Depuis trois semaines, surtout le soir après le marché.', time: '19:43', status: 'lu', readAt: '19:44' },
  { id: 3, who: 'doc', kind: 'voice', dur: 38, wave: xWave(36), time: '19:44' },
  { id: 4, who: 'me', kind: 'text', t: 'Non, pas de fièvre. Juste une fatigue inhabituelle.', time: '19:45', status: 'lu', readAt: '19:46', replyTo: { who: 'doc', name: d.name.split(' ').slice(0, 2).join(' '), text: 'Note vocale · 0:38' } },
  { id: 5, who: 'doc', kind: 'ordo', time: '19:51' },
];

function SessionView({ d, onBack, onEnd, onShowQR, onReserve }) {
  const docName = d.name.split(' ').slice(0, 2).join(' ');
  const [sec, setSec] = React.useState(d.dur * 60 - 64);
  const [msgs, setMsgs] = React.useState(() => SEED_MSGS(d));
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // {id, text}
  const [sheet, setSheet] = React.useState(null); // {id, step}
  const [recording, setRecording] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [viewer, setViewer] = React.useState(false);
  const [showDown, setShowDown] = React.useState(false);
  const boxRef = React.useRef(null);
  const refsMap = React.useRef({});
  const taRef = React.useRef(null);

  React.useEffect(() => { const id = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, []);
  const toBottom = () => { const b = boxRef.current; if (b) b.scrollTo({ top: b.scrollHeight }); };
  React.useEffect(() => { toBottom(); }, [msgs.length, typing]);

  const patch = (id, p) => setMsgs(ms => ms.map(m => m.id === id ? { ...m, ...p } : m));

  /* Cycle d'accusés simulé : pending → sent → remis → lu */
  const lifecycle = (id) => {
    setTimeout(() => patch(id, { status: 'sent' }), 450);
    setTimeout(() => patch(id, { status: 'remis' }), 1500);
    setTimeout(() => patch(id, { status: 'lu', readAt: xNow() }), 3200);
  };

  const pushMine = (m) => {
    const id = ++_mid;
    setMsgs(ms => [...ms, { id, who: 'me', time: xNow(), status: 'pending', ...m }]);
    lifecycle(id);
    return id;
  };

  const docReply = (text, delay = 1900) => {
    setTimeout(() => setTyping(true), delay - 1300);
    setTimeout(() => { setTyping(false); setMsgs(ms => [...ms, { id: ++_mid, who: 'doc', kind: 'text', t: text, time: xNow() }]); }, delay);
  };

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    if (editing) {
      patch(editing.id, { t, edited: true });
      setEditing(null); setDraft('');
      return;
    }
    pushMine({ kind: 'text', t, replyTo });
    setDraft(''); setReplyTo(null);
    if (taRef.current) taRef.current.style.height = '38px';
    docReply('Très bien, je note. Suivez la posologie et revoyons-nous dans 30 jours en session de suivi.');
  };

  const onSheetAction = (act) => {
    const m = msgs.find(x => x.id === sheet.id);
    if (act === 'close') return setSheet(null);
    if (act === 'delete') return setSheet({ ...sheet, step: 'delete' });
    if (act === 'delete-me') { setMsgs(ms => ms.filter(x => x.id !== m.id)); return setSheet(null); }
    if (act === 'delete-all') { patch(m.id, { deleted: true }); return setSheet(null); }
    if (act === 'reply') {
      setReplyTo({ who: m.who, name: m.who === 'me' ? 'Vous' : docName, text: m.kind === 'voice' ? `Note vocale · ${xMS(m.dur)}` : m.kind === 'album' ? 'Photos' : (m.t || '').slice(0, 120) });
      return setSheet(null);
    }
    if (act === 'copy') { try { navigator.clipboard && navigator.clipboard.writeText(m.t || ''); } catch (e) {} return setSheet(null); }
    if (act === 'edit') { setEditing({ id: m.id }); setDraft(m.t || ''); setReplyTo(null); return setSheet(null); }
  };

  const scrollToMsg = (mid) => {
    const el = refsMap.current[mid]; const b = boxRef.current;
    if (el && b) b.scrollTo({ top: Math.max(0, el.offsetTop - 70), behavior: 'smooth' });
  };

  const onScroll = () => {
    const b = boxRef.current; if (!b) return;
    setShowDown(b.scrollHeight - b.scrollTop - b.clientHeight > 220);
  };

  /* ── Rendu d'une bulle ── */
  const renderMsg = (m, i) => {
    const prev = msgs[i - 1];
    const grouped = prev && prev.who === m.who;
    const mine = m.who === 'me';
    const lastMine = mine && !msgs.slice(i + 1).some(x => x.who === 'me');

    if (m.deleted) return (
      <div key={m.id} ref={el => refsMap.current[m.id] = el} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, border: '1px dashed var(--border-default)', color: 'var(--text-disabled)', fontSize: 12, fontStyle: 'italic' }}>
          <SIC2 name="eye-off" size={12} />Message supprimé
        </span>
      </div>
    );

    if (m.kind === 'ordo') return (
      <div key={m.id} ref={el => refsMap.current[m.id] = el} style={{ display: 'flex', justifyContent: 'flex-start', marginTop: grouped ? 2 : 10 }}>
        <SC2 padding="13px" style={{ borderColor: 'rgba(111,146,218,0.35)', minWidth: 225, maxWidth: '84%' }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SIC2 name="ordonnance" size={19} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Ordonnance signée</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 1 }}>ORD-2026-00412 · 2 médicaments</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <SB2 variant="primary" size="sm" iconLeft="qr-code" style={{ flex: 1 }} onClick={onShowQR}>Voir le QR</SB2>
            <SB2 variant="ghost" size="sm" iconLeft="pill" style={{ flex: 1 }} onClick={onReserve}>Réserver</SB2>
          </div>
        </SC2>
      </div>
    );

    const bubbleBg = mine ? 'var(--accent-500)' : 'var(--bg-elevated)';
    return (
      <div key={m.id} ref={el => refsMap.current[m.id] = el} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 10 }}>
        <div style={{ position: 'relative', maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 3, opacity: m.status === 'pending' ? 0.75 : 1, transition: 'opacity var(--dur-base) linear' }}>
          <div style={{
            position: 'relative', padding: m.kind === 'album' ? '5px 5px 7px' : '8px 12px', borderRadius: 12,
            borderBottomRightRadius: mine ? 3 : 12, borderBottomLeftRadius: mine ? 12 : 3,
            background: bubbleBg, color: mine ? '#fff' : 'var(--text-primary)',
            border: mine ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: mine ? 'none' : '0 1px 1px rgba(0,0,0,0.04)',
          }}>
            {/* Citation */}
            {m.replyTo && (
              <button onClick={() => { const orig = msgs.find(x => (x.t || '').startsWith((m.replyTo.text || '').slice(0, 24)) && x.id !== m.id); if (orig) scrollToMsg(orig.id); }} style={{
                display: 'flex', alignItems: 'stretch', gap: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
                margin: '0 0 6px', padding: '5px 8px', borderRadius: 6, border: 'none',
                background: mine ? 'rgba(255,255,255,0.16)' : 'var(--bg-muted)',
              }}>
                <span style={{ width: 3, borderRadius: 2, background: mine ? 'rgba(255,255,255,0.6)' : 'var(--accent-400)', flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: mine ? '#fff' : 'var(--text-accent)' }}>{m.replyTo.name}</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, color: mine ? '#fff' : 'var(--text-secondary)' }}>{m.replyTo.text}</span>
                </span>
              </button>
            )}
            {/* Contenu */}
            {m.kind === 'voice'
              ? <XVoice wave={m.wave} dur={m.dur} mine={mine} />
              : m.kind === 'album'
                ? <>
                    <XAlbum count={m.count} onOpen={() => setViewer(true)} />
                    {m.t && <div style={{ fontSize: 13, lineHeight: 1.45, padding: '6px 6px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.t}</div>}
                  </>
                : <div style={{ fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.t}</div>}
            {/* Méta : heure + édité + accusés */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: 14, marginTop: 3, padding: m.kind === 'album' ? '0 6px' : 0 }}>
              {m.edited && <span style={{ fontSize: 9.5, fontStyle: 'italic', color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-disabled)' }}>modifié ·</span>}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-disabled)' }}>{m.time}</span>
              {mine && <XReceipt status={m.status} />}
            </div>
            {/* Chevron menu */}
            <button onClick={() => setSheet({ id: m.id, step: 'main' })} aria-label="Options du message" style={{
              position: 'absolute', top: 2, right: 4, width: 22, height: 18, border: 'none', cursor: 'pointer',
              borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: mine ? 'rgba(255,255,255,0.18)' : 'var(--bg-muted)',
              color: mine ? 'rgba(255,255,255,0.95)' : 'var(--text-secondary)', opacity: 0.85,
            }}><SIC2 name="chevron-down" size={12} /></button>
          </div>
          {/* Reçu récapitulatif sous le dernier message envoyé */}
          {lastMine && m.status && m.status !== 'pending' && (
            <span style={{ alignSelf: 'flex-end', fontSize: 9.5, color: m.status === 'lu' ? 'var(--text-accent)' : 'var(--text-tertiary)', paddingRight: 2 }}>
              {m.status === 'lu' ? `Lu à ${m.readAt || m.time}` : m.status === 'remis' ? 'Remis' : 'Envoyé'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="scr" style={{ position: 'relative', height: '100%', minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}>
      {/* En-tête */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--glass-border)' }}>
        <SIB2 icon="arrow-left" label="Retour" onClick={onBack} />
        <SAV2 name={d.name} size="sm" status="online" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5 }}>
            <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>● en ligne</span>
            <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><SIC2 name="lock" size={9} />chiffré</span>
          </div>
        </div>
        <SST2 seconds={sec} warnBelow={120} onExtend={() => setSec(s => s + 300)} />
      </div>

      {/* Fil */}
      <div ref={boxRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'sticky', top: 4, zIndex: 3, textAlign: 'center', margin: '2px 0 8px', pointerEvents: 'none' }}>
          <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', padding: '4px 12px', borderRadius: 9999, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>Aujourd'hui</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-disabled)', background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 9999, padding: '3px 10px' }}>Session ouverte · 19:42 · {d.dur} min</span>
        </div>
        {msgs.map(renderMsg)}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
            <span style={{ display: 'inline-flex', gap: 4, padding: '11px 14px', borderRadius: 12, borderBottomLeftRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <style>{'@keyframes udot2{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'}</style>
              {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)', animation: `udot2 1.1s ${i * 0.18}s infinite` }} />)}
            </span>
          </div>
        )}
      </div>

      {/* Bouton descendre */}
      {showDown && (
        <button onClick={toBottom} aria-label="Descendre" style={{
          position: 'absolute', right: 14, bottom: replyTo || editing ? 148 : 112, zIndex: 5,
          width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-default)', cursor: 'pointer',
          background: 'var(--bg-elevated)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-lg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><SIC2 name="chevron-down" size={16} /></button>
      )}

      {/* Barre de réponse / d'édition */}
      {(replyTo || editing) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-subtle)' }}>
          <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: 'var(--accent-400)', flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-accent)' }}>{editing ? 'Modifier le message' : `Répondre à ${replyTo.name}`}</span>
            {replyTo && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyTo.text}</span>}
          </span>
          <SIB2 icon="x" size="sm" label="Annuler" onClick={() => { setReplyTo(null); setEditing(null); setDraft(''); }} />
        </div>
      )}

      {/* Composeur */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '8px 10px', borderTop: replyTo || editing ? 'none' : '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', position: 'relative' }}>
        {recording ? (
          <XRec
            onCancel={() => setRecording(false)}
            onSend={(s) => { setRecording(false); pushMine({ kind: 'voice', dur: Math.max(1, s), wave: xWave(36) }); docReply('Bien reçu, votre note vocale est claire. Je vous prépare l\'ordonnance.', 2300); }} />
        ) : (
          <>
            <span style={{ position: 'relative' }}>
              <SIB2 icon="paperclip" variant="solid" label="Joindre" onClick={() => setAttachOpen(o => !o)} />
              {attachOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 50, width: 200, padding: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-xl)' }}>
                  {[['image', 'Photos et vidéos', () => { setAttachOpen(false); setPreview(true); }], ['file-medical', 'Document', () => { setAttachOpen(false); pushMine({ kind: 'text', t: 'analyses-cardio.pdf · 2,1 Mo' }); }]].map(([ic, l, fn]) => (
                    <button key={l} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: 7, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left' }}>
                      <span style={{ color: 'var(--accent-300)', display: 'inline-flex' }}><SIC2 name={ic} size={15} /></span>{l}
                    </button>
                  ))}
                </div>
              )}
            </span>
            <textarea ref={taRef} value={draft} rows={1} placeholder="Votre message…"
              onChange={(e) => { setDraft(e.target.value); const el = e.target; el.style.height = '38px'; el.style.height = Math.min(100, el.scrollHeight) + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              style={{
                flex: 1, minHeight: 38, height: 38, maxHeight: 100, resize: 'none',
                borderRadius: 20, border: '1px solid var(--border-default)', background: 'var(--bg-base)',
                padding: '9px 14px', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.4,
                color: 'var(--text-primary)', outline: 'none',
              }} />
            {draft.trim() ? (
              <button onClick={send} aria-label="Envoyer" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--accent-500)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
                <span style={{ position: 'relative', display: 'inline-flex' }}><SIC2 name={editing ? 'check' : 'send'} size={15} /></span>
              </button>
            ) : (
              <button onClick={() => setRecording(true)} aria-label="Note vocale" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SIC2 name="mic" size={19} />
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '0 12px 10px', background: 'transparent' }}>
        <SB2 variant="ghost" size="sm" fullWidth iconLeft="check-circle" onClick={onEnd}>Terminer la session · compte-rendu automatique</SB2>
      </div>

      {/* Overlays */}
      {preview && <XPreview onClose={() => setPreview(false)} onSend={(caption) => { setPreview(false); pushMine({ kind: 'album', count: 3, t: caption || undefined }); }} />}
      {viewer && <XViewer onClose={() => setViewer(false)} />}
      {sheet && <XSheet msg={msgs.find(x => x.id === sheet.id) || {}} step={sheet.step} onAction={onSheetAction} onClose={() => setSheet(null)} />}
    </div>
  );
}

window.PatientSession = SessionView;

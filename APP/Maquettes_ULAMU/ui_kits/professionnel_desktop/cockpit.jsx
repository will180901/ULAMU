/* ULAMU — App professionnel : cockpit de session (dossier patient +
   messagerie chiffrée + ordonnance) et contrôleur racine ProApp. */
const DK = window.ULAMUDesignSystem_d14300;
const { Button: KB, IconButton: KIB, Badge: KBD, Avatar: KAV, Input: KIN, Textarea: KTX, Card: KC, Icon: KIC, Banner: KBN, Tabs: KTB } = DK;
const kFmtF = window.proFmtF;
const { PLIc: KLIc, PReceipt: KRcpt, PVoicePlayer: KVoice, PRecorder: KRec, PBubbleMenu: KMenu, PAlbum: KAlbum, PViewer: KViewer, PPreview: KPreview, pNow: kNow, pMS: kMS, pWave: kWave } = window.ProChatParts;

let _kid = 100;
const COCKPIT_SEED = () => [
  { id: 1, who: 'me', kind: 'text', t: 'Bonsoir Mireille, j\'ai lu votre pré-consultation. Depuis quand ressentez-vous ces douleurs ?', time: '19:42', status: 'lu', readAt: '19:43' },
  { id: 2, who: 'pt', kind: 'text', t: 'Bonsoir docteur. Depuis trois semaines, surtout le soir après le marché.', time: '19:43' },
  { id: 3, who: 'pt', kind: 'voice', dur: 38, wave: kWave(36), time: '19:44' },
  { id: 4, who: 'me', kind: 'text', t: 'Merci, c\'est très clair. Avez-vous de la fièvre ou un essoufflement à l\'effort ?', time: '19:45', status: 'lu', readAt: '19:46', replyTo: { name: 'Mireille N.', text: 'Note vocale · 0:38' } },
];


function Cockpit({ r, sec, onClose }) {
  const [msgs, setMsgs] = React.useState(COCKPIT_SEED);
  const [draft, setDraft] = React.useState('');
  const [tab, setTab] = React.useState('dossier');
  const [signed, setSigned] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [menuFor, setMenuFor] = React.useState(null);
  const [hovId, setHovId] = React.useState(null);
  const [typing, setTyping] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [viewer, setViewer] = React.useState(false);
  const [showDown, setShowDown] = React.useState(false);
  const boxRef = React.useRef(null);
  const refsMap = React.useRef({});
  const taRef = React.useRef(null);
  const toBottom = () => { const b = boxRef.current; if (b) b.scrollTo({ top: b.scrollHeight }); };
  React.useEffect(() => { toBottom(); }, [msgs.length, typing]);
  React.useEffect(() => {
    if (menuFor == null && !attachOpen) return;
    const close = () => { setMenuFor(null); setAttachOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor, attachOpen]);

  const patch = (id, p) => setMsgs(ms => ms.map(m => m.id === id ? { ...m, ...p } : m));
  const lifecycle = (id) => {
    setTimeout(() => patch(id, { status: 'sent' }), 450);
    setTimeout(() => patch(id, { status: 'remis' }), 1400);
    setTimeout(() => patch(id, { status: 'lu', readAt: kNow() }), 3000);
  };
  const pushMine = (m) => {
    const id = ++_kid;
    setMsgs(ms => [...ms, { id, who: 'me', time: kNow(), status: 'pending', ...m }]);
    lifecycle(id);
  };
  const ptReply = (text, delay = 2100) => {
    setTimeout(() => setTyping(true), delay - 1300);
    setTimeout(() => { setTyping(false); setMsgs(ms => [...ms, { id: ++_kid, who: 'pt', kind: 'text', t: text, time: kNow() }]); }, delay);
  };
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    if (editing) { patch(editing.id, { t, edited: true }); setEditing(null); setDraft(''); return; }
    pushMine({ kind: 'text', t, replyTo });
    setDraft(''); setReplyTo(null);
    if (taRef.current) taRef.current.style.height = '38px';
    ptReply('D\'accord docteur, je comprends. Merci pour vos explications.');
  };
  const onMenuAction = (m, act) => {
    setMenuFor(null);
    if (act === 'reply') setReplyTo({ name: m.who === 'me' ? 'Vous' : 'Mireille N.', text: m.kind === 'voice' ? `Note vocale · ${kMS(m.dur)}` : m.kind === 'album' ? 'Photos' : (m.t || '').slice(0, 120) });
    else if (act === 'copy') { try { navigator.clipboard && navigator.clipboard.writeText(m.t || ''); } catch (e) {} }
    else if (act === 'edit') { setEditing({ id: m.id }); setDraft(m.t || ''); setReplyTo(null); }
    else if (act === 'delete-me') setMsgs(ms => ms.filter(x => x.id !== m.id));
    else if (act === 'delete-all') patch(m.id, { deleted: true });
  };
  const scrollToMsg = (mid) => {
    const el = refsMap.current[mid]; const b = boxRef.current;
    if (el && b) b.scrollTo({ top: Math.max(0, el.offsetTop - 80), behavior: 'smooth' });
  };
  const onScroll = () => {
    const b = boxRef.current; if (!b) return;
    setShowDown(b.scrollHeight - b.scrollTop - b.clientHeight > 220);
  };

  const renderMsg = (m, i) => {
    const prev = msgs[i - 1];
    const grouped = prev && prev.who === m.who;
    const mine = m.who === 'me';
    const lastMine = mine && !msgs.slice(i + 1).some(x => x.who === 'me');
    if (m.deleted) return (
      <div key={m.id} ref={el => refsMap.current[m.id] = el} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 12, border: '1px dashed var(--border-default)', color: 'var(--text-disabled)', fontSize: 12.5, fontStyle: 'italic' }}>
          <KIC name="eye-off" size={13} />Message supprimé
        </span>
      </div>
    );
    return (
      <div key={m.id} ref={el => refsMap.current[m.id] = el} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 10 }}>
        <div onMouseEnter={() => setHovId(m.id)} onMouseLeave={() => setHovId(h => h === m.id ? null : h)}
          style={{ position: 'relative', maxWidth: '68%', display: 'flex', flexDirection: 'column', gap: 3, opacity: m.status === 'pending' ? 0.75 : 1, transition: 'opacity var(--dur-base) linear' }}>
          <div style={{
            position: 'relative', padding: m.kind === 'album' ? '5px 5px 7px' : '9px 13px', borderRadius: 12,
            borderBottomRightRadius: mine ? 3 : 12, borderBottomLeftRadius: mine ? 12 : 3,
            background: mine ? 'var(--accent-500)' : 'var(--bg-elevated)', color: mine ? '#fff' : 'var(--text-primary)',
            border: mine ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: mine ? 'none' : '0 1px 1px rgba(0,0,0,0.04)',
          }}>
            {m.replyTo && (
              <button onClick={() => { const orig = msgs.find(x => (x.t || '').startsWith((m.replyTo.text || '').slice(0, 24)) && x.id !== m.id); if (orig) scrollToMsg(orig.id); }} style={{
                display: 'flex', alignItems: 'stretch', gap: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
                margin: '0 0 6px', padding: '5px 8px', borderRadius: 6, border: 'none',
                background: mine ? 'rgba(255,255,255,0.16)' : 'var(--bg-muted)',
              }}>
                <span style={{ width: 3, borderRadius: 2, background: mine ? 'rgba(255,255,255,0.6)' : 'var(--accent-400)', flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: mine ? '#fff' : 'var(--text-accent)' }}>{m.replyTo.name}</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260, color: mine ? '#fff' : 'var(--text-secondary)' }}>{m.replyTo.text}</span>
                </span>
              </button>
            )}
            {m.kind === 'voice'
              ? <KVoice wave={m.wave} dur={m.dur} mine={mine} />
              : m.kind === 'album'
                ? <>
                    <KAlbum count={m.count} onOpen={() => setViewer(true)} />
                    {m.t && <div style={{ fontSize: 13.5, lineHeight: 1.5, padding: '6px 6px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.t}</div>}
                  </>
                : <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.t}</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: 14, marginTop: 3, padding: m.kind === 'album' ? '0 6px' : 0 }}>
              {m.edited && <span style={{ fontSize: 9.5, fontStyle: 'italic', color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-disabled)' }}>modifié ·</span>}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-disabled)' }}>{m.time}</span>
              {mine && <KRcpt status={m.status} />}
            </div>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setMenuFor(f => f === m.id ? null : m.id)} aria-label="Options du message" style={{
              position: 'absolute', top: 2, right: 4, width: 22, height: 18, border: 'none', cursor: 'pointer',
              borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: mine ? 'rgba(255,255,255,0.18)' : 'var(--bg-muted)',
              color: mine ? 'rgba(255,255,255,0.95)' : 'var(--text-secondary)',
              opacity: hovId === m.id || menuFor === m.id ? 1 : 0, transition: 'opacity 0.12s linear',
            }}><KIC name="chevron-down" size={12} /></button>
            {menuFor === m.id && (
              <span onMouseDown={(e) => e.stopPropagation()}>
                <KMenu mine={mine} canEdit={mine && m.kind === 'text'} onAction={(act) => onMenuAction(m, act)} />
              </span>
            )}
          </div>
          {lastMine && m.status && m.status !== 'pending' && (
            <span style={{ alignSelf: 'flex-end', fontSize: 10, color: m.status === 'lu' ? 'var(--text-accent)' : 'var(--text-tertiary)', paddingRight: 2 }}>
              {m.status === 'lu' ? `Lu à ${m.readAt || m.time}` : m.status === 'remis' ? 'Remis' : 'Envoyé'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      {/* ── Panneau dossier ── */}
      <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', padding: 20, background: 'var(--bg-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <KAV name={r.name} size="lg" status="online" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>PAT-2026-08317 · {r.age} ans · {r.zone}</div>
          </div>
        </div>

        {/* Constantes en chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[['activity', '13/8', 'tension'], ['heart-pulse', '78', 'bpm'], ['clock', '36,8°', 'temp.']].map(([ic, v, l]) => (
            <KC key={l} padding="9px 6px" style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--accent-300)', display: 'flex', justifyContent: 'center', marginBottom: 4 }}><KIC name={ic} size={13} /></span>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{v}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{l}</div>
            </KC>
          ))}
        </div>

        <KTB value={tab} onChange={setTab} items={[{ id: 'dossier', label: 'Dossier', icon: 'file-medical' }, { id: 'ordo', label: 'Ordonnance', icon: 'ordonnance' }]} style={{ marginBottom: 14 }} />

        {tab === 'dossier' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KBN tone="error" title="Allergie connue : pénicilline">Garde-fou actif — toute prescription incompatible sera bloquée.</KBN>
            <KC padding="13px">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>Pré-consultation</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.motif}. Pas de fièvre déclarée. Fatigue inhabituelle depuis deux semaines.</div>
            </KC>
            <KC padding="13px">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>Antécédents</div>
              {[['Hypertension', 'traitée depuis 2019'], ['Amlodipine 5 mg', 'en cours'], ['Dernier triage', '8 mars · Nadège L.']].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{k}</span>
                  <span style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </KC>
            <KB variant="ghost" size="sm" fullWidth iconLeft="file-medical">Ouvrir le dossier complet</KB>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Amlodipine 5 mg', '1 cp / jour, le matin · 30 jours'], ['Ramipril 10 mg', '1 cp / jour, le soir · 30 jours']].map(([m, p]) => (
              <KC key={m} padding="12px 13px">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'rgba(39,86,166,0.16)', color: 'var(--accent-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><KIC name="pill" size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{p}</div>
                  </div>
                  <KIB icon="x" size="sm" label="Retirer" />
                </div>
              </KC>
            ))}
            <KB variant="ghost" size="sm" fullWidth iconLeft="plus">Ajouter un médicament</KB>
            <KBN tone="success" title="Vérification des allergies : aucun conflit" />
            {signed ? (
              <KC padding="14px" style={{ textAlign: 'center', borderColor: 'var(--success-border)' }}>
                <span style={{ color: 'var(--success-dot)', display: 'flex', justifyContent: 'center', marginBottom: 6 }}><KIC name="qr-code" size={26} strokeWidth={1.3} /></span>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>ORD-2026-00412 signée</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>QR transmis au patient · valable 30 jours</div>
              </KC>
            ) : (
              <KB variant="primary" fullWidth iconLeft="ordonnance" onClick={() => setSigned(true)}>Signer l'ordonnance (QR)</KB>
            )}
          </div>
        )}
      </div>

      {/* ── Messagerie ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <KIB icon="arrow-left" label="Quitter la session" onClick={onClose} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>Session avec {r.name.split(' ')[0]}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>● en ligne</span>
              <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><KIC name="lock" size={10} />chiffré de bout en bout · compte-rendu obligatoire en fin de session</span>
            </div>
          </div>
          <KBD tone="accent" icon="lock">Confidentiel</KBD>
          <KIB icon="more-vertical" label="Options" />
        </div>

        <div ref={boxRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 24px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'sticky', top: 4, zIndex: 3, textAlign: 'center', margin: '2px 0 8px', pointerEvents: 'none' }}>
            <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', padding: '4px 12px', borderRadius: 9999, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>Aujourd'hui</span>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-disabled)', background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)', padding: '3px 10px' }}>Session ouverte · 19:42 · 30 min</span>
          </div>
          {msgs.map(renderMsg)}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
              <span style={{ display: 'inline-flex', gap: 4, padding: '12px 14px', borderRadius: 12, borderBottomLeftRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <style>{'@keyframes kdot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'}</style>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)', animation: `kdot 1.1s ${i * 0.18}s infinite` }} />)}
              </span>
            </div>
          )}
        </div>

        {showDown && (
          <button onClick={toBottom} aria-label="Descendre" style={{
            position: 'absolute', right: 24, bottom: replyTo || editing ? 150 : 92, zIndex: 5,
            width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--border-default)', cursor: 'pointer',
            background: 'var(--bg-elevated)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-lg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><KIC name="chevron-down" size={17} /></button>
        )}

        {(replyTo || editing) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', flexShrink: 0 }}>
            <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: 'var(--accent-400)', flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-accent)' }}>{editing ? 'Modifier le message' : `Répondre à ${replyTo.name}`}</span>
              {replyTo && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyTo.text}</span>}
            </span>
            <KIB icon="x" size="sm" label="Annuler" onClick={() => { setReplyTo(null); setEditing(null); setDraft(''); }} />
          </div>
        )}

        <div style={{ padding: '10px 20px', borderTop: (replyTo || editing) ? 'none' : '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {recording ? (
            <KRec
              onCancel={() => setRecording(false)}
              onSend={(s) => { setRecording(false); pushMine({ kind: 'voice', dur: Math.max(1, s), wave: kWave(36) }); ptReply('Bien reçu docteur, je vous écoute.', 2400); }} />
          ) : (
            <>
              <span style={{ position: 'relative' }} onMouseDown={(e) => e.stopPropagation()}>
                <KIB icon="paperclip" variant="solid" label="Joindre" onClick={() => setAttachOpen(o => !o)} />
                {attachOpen && (
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 50, width: 210, padding: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-xl)' }}>
                    {[['image', 'Photos et vidéos', () => { setAttachOpen(false); setPreview(true); }], ['file-medical', 'Document', () => { setAttachOpen(false); pushMine({ kind: 'text', t: 'examens-prescrits.pdf · 1,4 Mo' }); }]].map(([ic, l, fn]) => (
                      <button key={l} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: 7, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left' }}>
                        <span style={{ color: 'var(--accent-300)', display: 'inline-flex' }}><KIC name={ic} size={15} /></span>{l}
                      </button>
                    ))}
                  </div>
                )}
              </span>
              <textarea ref={taRef} value={draft} rows={1} placeholder="Écrire au patient…"
                onChange={(e) => { setDraft(e.target.value); const el = e.target; el.style.height = '38px'; el.style.height = Math.min(120, el.scrollHeight) + 'px'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                style={{
                  flex: 1, minHeight: 38, height: 38, maxHeight: 120, resize: 'none',
                  borderRadius: 20, border: '1px solid var(--border-default)', background: 'var(--bg-base)',
                  padding: '9px 14px', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.4,
                  color: 'var(--text-primary)', outline: 'none',
                }} />
              {draft.trim() ? (
                <button onClick={send} aria-label="Envoyer" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--accent-500)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)' }} />
                  <span style={{ position: 'relative', display: 'inline-flex' }}><KIC name={editing ? 'check' : 'send'} size={15} /></span>
                </button>
              ) : (
                <button onClick={() => setRecording(true)} aria-label="Note vocale" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <KIC name="mic" size={19} />
                </button>
              )}
              <KB variant="secondary" iconLeft="file-medical">Compte-rendu</KB>
            </>
          )}
        </div>

        {preview && <KPreview onClose={() => setPreview(false)} onSend={(caption) => { setPreview(false); pushMine({ kind: 'album', count: 3, t: caption || undefined }); }} />}
        {viewer && <KViewer onClose={() => setViewer(false)} />}
      </div>
    </div>
  );
}

/* ── Racine ── */
function ProApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [online, setOnline] = React.useState(true);
  const [active, setActive] = React.useState(null);
  const [sec, setSec] = React.useState(30 * 60 - 95);
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('ulamu-theme', n); } catch (e) {}
    return n;
  });
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);
  const NAMES = { dashboard: 'Tableau de bord', consultation: 'Consultations', patient: 'Patients', 'rendez-vous': 'Agenda', ordonnance: 'Ordonnances', 'credit-card': 'Gains', users: 'Annuaire' };
  const Page = window.ProPages[nav];
  let main;
  if (active) main = <Cockpit r={active} sec={sec} onClose={() => setActive(null)} />;
  else if (nav === 'dashboard') main = <window.ProDashboard online={online} onOpen={(r) => { setActive(r); setSec(30 * 60 - 95); }} />;
  else if (Page) main = <Page onOpen={(r) => { setActive(r); setSec(30 * 60 - 95); }} />;
  return (
    <div className="app">
      <window.ProSidebar nav={nav} setNav={(n) => { setNav(n); setActive(null); }} theme={theme} onTheme={toggleTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <window.ProTopbar
          crumb={active ? [NAMES[nav] || 'Consultations', 'Session — ' + active.name] : [NAMES[nav]]}
          online={online} setOnline={setOnline} session={active ? sec : null}
          theme={theme} onTheme={toggleTheme} />
        {main}
      </div>
    </div>
  );
}

window.ProApp = ProApp;

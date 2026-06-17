import React from 'react';
import { Icon } from '../core/Icon.jsx';

function fmt(total) {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * SessionTimer — décompteur de session chronométrée (D-006), toujours visible.
 * Signature Ulamu : la consultation par messagerie est minutée. Devient warning
 * sous le seuil, propose une prolongation gratuite.
 */
export function SessionTimer({ seconds, warnBelow = 60, onExtend, label = 'Session', style = {} }) {
  const warn = seconds <= warnBelow;
  const tone = warn
    ? { bg: 'var(--warning-bg)', fg: 'var(--warning-text)', bd: 'var(--warning-border)', dot: 'var(--warning-dot)' }
    : { bg: 'rgba(39,86,166,0.12)', fg: 'var(--text-accent)', bd: 'rgba(39,86,166,0.28)', dot: 'var(--accent-500)' };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      background: tone.bg, border: `1px solid ${tone.bd}`, borderRadius: 'var(--radius-full)',
      padding: '5px 6px 5px 12px', ...style,
    }}>
      <span style={{ color: tone.dot, display: 'inline-flex' }}>
        <Icon name="clock" size={15} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: tone.fg, opacity: 0.75 }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: tone.fg, fontVariantNumeric: 'tabular-nums' }}>{fmt(seconds)}</span>
      </span>
      {onExtend && (
        <button type="button" onClick={onExtend} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer',
          background: 'var(--bg-elevated)', border: `1px solid ${tone.bd}`, borderRadius: 'var(--radius-full)',
          padding: '4px 9px', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: tone.fg,
        }}>
          <Icon name="plus" size={11} strokeWidth={2} />5 min
        </button>
      )}
    </div>
  );
}

import React from 'react';

/** Tooltip — infobulle au survol. Enveloppe un élément déclencheur. */
export function Tooltip({ content, placement = 'top', children, style = {} }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%',    left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left:   { right: '100%',  top: '50%',  transform: 'translateY(-50%)', marginRight: 8 },
    right:  { left: '100%',   top: '50%',  transform: 'translateY(-50%)', marginLeft: 8 },
  }[placement];
  return (
    <span style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <span role="tooltip" style={{
          position: 'absolute', zIndex: 300, ...pos,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '6px 10px',
          fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap', pointerEvents: 'none',
          animation: 'ulamu-fade var(--dur-fast) ease-out',
        }}>
          <style>{'@keyframes ulamu-fade{from{opacity:0}to{opacity:1}}'}</style>
          {content}
        </span>
      )}
    </span>
  );
}

import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Modal — boîte de dialogue centrée (scale-in spring + overlay). */
export function Modal({ open = true, title, children, footer, onClose, width = 460, style = {} }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-6)',
      animation: 'ulamu-overlay var(--dur-moderate) ease-out',
    }}>
      <style>{'@keyframes ulamu-overlay{from{opacity:0}to{opacity:1}}@keyframes ulamu-modal{from{transform:scale(0.91);opacity:0}to{transform:scale(1);opacity:1}}'}</style>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
        width: '100%', maxWidth: width, background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)', animation: 'ulamu-modal var(--dur-moderate) var(--ease-spring)',
        overflow: 'hidden', ...style,
      }}>
        {(title || onClose) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 'var(--sp-5) var(--sp-5) var(--sp-4)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px', color: 'var(--text-primary)' }}>{title}</h3>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Fermer" style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)',
                display: 'inline-flex', padding: 4, borderRadius: 'var(--radius-sm)',
              }}>
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: '0 var(--sp-5)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {children}
        </div>
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 'var(--sp-5)', marginTop: 'var(--sp-2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

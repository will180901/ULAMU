import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  neutral: { dot: 'var(--text-tertiary)', icon: null },
  info:    { dot: 'var(--info-dot)',    icon: 'info' },
  success: { dot: 'var(--success-dot)', icon: 'check-circle' },
  warning: { dot: 'var(--warning-dot)', icon: 'alert-triangle' },
  error:   { dot: 'var(--error-dot)',   icon: 'alert-circle' },
};

/**
 * Toast — notification éphémère glass (entrée spring depuis le haut).
 * Composant de présentation : gérez l'affichage/masquage côté appelant.
 */
export function Toast({ tone = 'neutral', icon, children, onClose, style = {} }) {
  const t = TONES[tone] || TONES.neutral;
  const ic = icon || t.icon;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', padding: '9px 14px',
      fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
      animation: 'ulamu-toast-in var(--dur-moderate) var(--ease-spring)',
      ...style,
    }}>
      <style>{'@keyframes ulamu-toast-in{from{transform:translateY(-44px);opacity:0}to{transform:translateY(0);opacity:1}}'}</style>
      {ic && <span style={{ color: t.dot, display: 'inline-flex' }}><Icon name={ic} size={16} /></span>}
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)',
          display: 'inline-flex', padding: 2, marginLeft: 4,
        }}>
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}

import React from 'react';
export interface ToastProps {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  /** Forcer une icône Ulamu (sinon déduite du ton). */
  icon?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
/** Notification éphémère sur surface glass (entrée spring depuis le haut). */
export function Toast(props: ToastProps): JSX.Element;

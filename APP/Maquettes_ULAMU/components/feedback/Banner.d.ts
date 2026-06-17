import React from 'react';
export interface BannerProps {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Bouton/zone d'action sous le message. */
  action?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
/**
 * Message contextuel en bloc (info, succès, alerte, erreur) avec icône sémantique.
 * @startingPoint section="Feedback" subtitle="Bannières sémantiques en bloc" viewport="700x200"
 */
export function Banner(props: BannerProps): JSX.Element;

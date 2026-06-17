import React from 'react';
export interface BadgeProps {
  /** Couleur sémantique. Défaut "neutral". */
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  /** Affiche un point coloré avant le texte. */
  dot?: boolean;
  /** Nom d'icône Ulamu avant le texte. */
  icon?: string;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/**
 * Étiquette de statut compacte (vérifié, en ligne, hors ligne, en attente…).
 * @startingPoint section="Composants" subtitle="Badges sémantiques + point de statut" viewport="700x140"
 */
export function Badge(props: BadgeProps): JSX.Element;

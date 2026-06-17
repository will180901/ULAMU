import React from 'react';
export interface TooltipProps {
  /** Contenu de l'infobulle. */
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Élément déclencheur. */
  children: React.ReactNode;
  style?: React.CSSProperties;
}
/** Infobulle au survol/focus, positionnable sur 4 côtés. */
export function Tooltip(props: TooltipProps): JSX.Element;

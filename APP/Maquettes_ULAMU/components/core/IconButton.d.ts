import React from 'react';
export interface IconButtonProps {
  /** Nom d'icône Ulamu. */
  icon: string;
  variant?: 'ghost' | 'solid' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Libellé accessible (aria-label + title). */
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
/** Bouton carré ne contenant qu'une icône Ulamu (topbar, toolbars, cartes). */
export function IconButton(props: IconButtonProps): JSX.Element;

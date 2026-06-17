import React from 'react';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** Hiérarchie visuelle. Défaut "primary". */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Taille. Défaut "md". */
  size?: 'sm' | 'md' | 'lg';
  /** Nom d'icône Ulamu placée avant le label. */
  iconLeft?: string;
  /** Nom d'icône Ulamu placée après le label. */
  iconRight?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Affiche un spinner et désactive le bouton. */
  loading?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Bouton principal d'Ulamu : 4 variantes (primary/secondary/ghost/danger),
 * 3 tailles, grain sérigraphié intégré, feedback au press (scale 0.97).
 *
 * @startingPoint section="Composants" subtitle="Boutons — 4 variantes, 3 tailles, grain" viewport="700x180"
 */
export function Button(props: ButtonProps): JSX.Element;

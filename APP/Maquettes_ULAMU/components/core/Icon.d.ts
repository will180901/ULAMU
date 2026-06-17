import React from 'react';

export interface IconProps {
  /** Nom de l'icône dans le catalogue Ulamu (ex. "stethoscope", "ordonnance"). */
  name: string;
  /** Taille en px (carré). Défaut 16 (icon-md). 12=xs, 14=sm, 20=lg, 24=xl. */
  size?: number;
  /** Épaisseur de trait. Défaut 1.5 ; 1.4 pour grandes tailles/nav ; 2 pour emphase. */
  strokeWidth?: number;
  /** Couleur du trait. Défaut currentColor (hérite du parent). */
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Si fourni, l'icône devient accessible (role=img + <title>). */
  title?: string;
}

/**
 * Icône SVG du système Ulamu (style Lucide, grille 16×16, currentColor).
 * Source unique des icônes — n'utilisez jamais d'emoji ni de caractère Unicode.
 */
export function Icon(props: IconProps): JSX.Element | null;

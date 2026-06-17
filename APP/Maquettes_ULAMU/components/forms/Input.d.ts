import React from 'react';
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  /** Nom d'icône Ulamu à gauche. */
  leftIcon?: string;
  /** Nom d'icône Ulamu à droite. */
  rightIcon?: string;
  /** État d'erreur (bord rouge + ring rouge). */
  invalid?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}
/**
 * Champ texte Ulamu (hauteur 36, rayon md, focus ring accent cobalt).
 * @startingPoint section="Formulaires" subtitle="Champs, focus ring, états" viewport="700x180"
 */
export function Input(props: InputProps): JSX.Element;

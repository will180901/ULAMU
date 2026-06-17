import React from 'react';
export interface TagProps {
  /** Nom d'icône Ulamu optionnelle. */
  icon?: string;
  /** Si fourni, affiche un bouton de suppression. */
  onRemove?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/** Étiquette de filtre/sélection, optionnellement supprimable. */
export function Tag(props: TagProps): JSX.Element;

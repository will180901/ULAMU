import React from 'react';
export interface NavItemProps {
  /** Nom d'icône Ulamu. */
  icon?: string;
  label: string;
  active?: boolean;
  /** Compteur affiché en pastille (nombre ou texte court). */
  badge?: React.ReactNode;
  /** Mode sidebar réduite (56px) : masque le label. */
  collapsed?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
/** Entrée de navigation latérale Ulamu (icône + label + pastille, état actif accent). */
export function NavItem(props: NavItemProps): JSX.Element;

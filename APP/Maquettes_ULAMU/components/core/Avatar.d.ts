import React from 'react';
export interface AvatarProps {
  /** Nom complet — sert aux initiales et à l'alt. */
  name?: string;
  /** URL d'image optionnelle. */
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Point de présence. */
  status?: 'online' | 'busy' | 'away';
  style?: React.CSSProperties;
}
/** Avatar circulaire (initiales sur fond accent ou image) avec présence optionnelle. */
export function Avatar(props: AvatarProps): JSX.Element;

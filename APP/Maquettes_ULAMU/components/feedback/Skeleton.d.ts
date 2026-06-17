import React from 'react';
export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  /** Forme cercle (utilise height comme diamètre). */
  circle?: boolean;
  style?: React.CSSProperties;
}
/** Bloc de chargement avec shimmer continu (placeholders de contenu). */
export function Skeleton(props: SkeletonProps): JSX.Element;

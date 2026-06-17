import React from 'react';
export interface CardProps {
  /** Padding interne. Défaut var(--sp-5) (20px). */
  padding?: string;
  /** Active le lift + ombre md au survol. */
  interactive?: boolean;
  /** Ajoute le grain sérigraphié subtil. */
  grain?: boolean;
  elevation?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}
/**
 * Surface élevée Ulamu (bord subtil, rayon lg, ombre, grain optionnel).
 * @startingPoint section="Composants" subtitle="Carte — surface élevée, grain, lift" viewport="700x200"
 */
export function Card(props: CardProps): JSX.Element;

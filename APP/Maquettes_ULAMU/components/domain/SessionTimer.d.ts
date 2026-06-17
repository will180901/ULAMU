import React from 'react';
export interface SessionTimerProps {
  /** Secondes restantes (contrôlé par l'appelant). */
  seconds: number;
  /** Seuil (s) sous lequel le décompteur passe en warning. Défaut 60. */
  warnBelow?: number;
  /** Si fourni, affiche un bouton de prolongation gratuite (+5 min). */
  onExtend?: () => void;
  label?: string;
  style?: React.CSSProperties;
}
/**
 * Décompteur de session chronométrée (D-006) — élément signature Ulamu,
 * toujours visible pendant une consultation par messagerie.
 * @startingPoint section="Domaine santé" subtitle="Décompteur de session chronométrée" viewport="700x140"
 */
export function SessionTimer(props: SessionTimerProps): JSX.Element;

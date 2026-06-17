import React from 'react';
export interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
  /** Libellé optionnel (ex. "Vérifié", "Médecin vérifié"). */
  label?: React.ReactNode;
  style?: React.CSSProperties;
}
/** Badge « vérifié » des professionnels Ulamu (M03) — pastille accent + coche. */
export function VerifiedBadge(props: VerifiedBadgeProps): JSX.Element;

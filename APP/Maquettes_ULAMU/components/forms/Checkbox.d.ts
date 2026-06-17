import React from 'react';
export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  /** Libellé à droite de la case. */
  label?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  style?: React.CSSProperties;
}
/** Case à cocher Ulamu (coche animée spring, état indéterminé). */
export function Checkbox(props: CheckboxProps): JSX.Element;

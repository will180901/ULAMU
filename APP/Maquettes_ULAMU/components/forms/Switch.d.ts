import React from 'react';
export interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  style?: React.CSSProperties;
}
/** Interrupteur Ulamu (pouce animé spring, piste accent à l'état actif). */
export function Switch(props: SwitchProps): JSX.Element;

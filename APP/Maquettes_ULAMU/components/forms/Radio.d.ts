import React from 'react';
export interface RadioProps {
  checked?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  style?: React.CSSProperties;
}
/** Bouton radio Ulamu (point central animé spring). */
export function Radio(props: RadioProps): JSX.Element;

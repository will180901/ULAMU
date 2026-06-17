import React from 'react';
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  invalid?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/** Liste déroulante native stylée Ulamu (chevron custom, focus ring accent). */
export function Select(props: SelectProps): JSX.Element;

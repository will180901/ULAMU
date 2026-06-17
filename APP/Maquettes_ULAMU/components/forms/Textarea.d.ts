import React from 'react';
export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> {
  invalid?: boolean;
  disabled?: boolean;
  rows?: number;
  style?: React.CSSProperties;
}
/** Zone de texte multi-lignes Ulamu (redimensionnable, focus ring accent). */
export function Textarea(props: TextareaProps): JSX.Element;

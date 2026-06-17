import React from 'react';
export interface FormFieldProps {
  label?: React.ReactNode;
  /** Texte d'aide sous le champ. */
  hint?: React.ReactNode;
  /** Message d'erreur (remplace l'indice, couleur rouge). */
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/** Enveloppe label + champ + indice/erreur autour de n'importe quel contrôle de formulaire. */
export function FormField(props: FormFieldProps): JSX.Element;

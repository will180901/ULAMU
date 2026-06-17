import React from 'react';
export interface ModalProps {
  open?: boolean;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Zone de boutons en pied (alignée à droite). */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** Largeur max en px. Défaut 460. */
  width?: number;
  style?: React.CSSProperties;
}
/** Boîte de dialogue centrée (scale-in spring + overlay assombri/flou). */
export function Modal(props: ModalProps): JSX.Element | null;

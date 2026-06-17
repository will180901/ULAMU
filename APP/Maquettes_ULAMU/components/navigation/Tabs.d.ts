import React from 'react';
export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Nom d'icône Ulamu optionnelle. */
  icon?: string;
  /** Pastille de comptage. */
  badge?: React.ReactNode;
}
export interface TabsProps {
  items: TabItem[];
  /** id de l'onglet actif. */
  value: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}
/** Onglets soulignés Ulamu (underline accent, icône + pastille optionnelles). */
export function Tabs(props: TabsProps): JSX.Element;

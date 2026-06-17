import React from 'react';
import { ICONS } from './icons.js';

/**
 * Icon — icône SVG du système Ulamu (style Lucide, viewBox 16×16).
 * `stroke: currentColor` : la couleur hérite du parent. Jamais d'emoji/ASCII.
 */
export function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  color,
  className = '',
  style = {},
  title,
  ...rest
}) {
  const inner = ICONS[name];
  if (!inner) {
    if (typeof console !== 'undefined') console.warn(`[ulamu] icône inconnue : "${name}"`);
    return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, display: 'block', ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + inner }}
      {...rest}
    />
  );
}

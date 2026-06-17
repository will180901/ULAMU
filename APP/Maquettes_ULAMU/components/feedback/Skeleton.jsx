import React from 'react';

/** Skeleton — bloc de chargement (shimmer continu). */
export function Skeleton({ width = '100%', height = 12, radius = 'var(--radius-sm)', circle = false, style = {} }) {
  return (
    <span style={{
      display: 'block',
      width: circle ? height : width,
      height,
      borderRadius: circle ? '50%' : radius,
      background: 'linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-subtle) 37%, var(--bg-muted) 63%)',
      backgroundSize: '400% 100%',
      animation: 'ulamu-shimmer 1400ms ease-in-out infinite',
      ...style,
    }}>
      <style>{'@keyframes ulamu-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}'}</style>
    </span>
  );
}

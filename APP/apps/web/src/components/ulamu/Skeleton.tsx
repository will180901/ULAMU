/** Squelette de chargement — pas d'animation shimmer dégradée (charte : zéro dégradé), pulsation d'opacité. */
export function Skeleton({ width = '100%', height = 16, radius = 'var(--radius-md)' }: { width?: number | string; height?: number | string; radius?: string }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'var(--fond-surface-2)',
      }}
    />
  )
}

/**
 * Squelette de chargement.
 *
 * Pulsation d'opacité et non balayage dégradé : la charte interdit les dégradés (CG-04), et le
 * « shimmer » habituel en est un. La décision venait de l'auteur d'origine, elle est juste, elle est
 * conservée — seule l'animation en classe Tailwind `animate-pulse` est remplacée par la nôtre, pour
 * que la durée vienne des tokens CG-09 et non d'une bibliothèque tierce.
 *
 * `aria-hidden` : un squelette n'a rien à annoncer. C'est l'état de chargement qui parle
 * (`LoadingState`, avec son `role="status"`), pas les rectangles gris.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
}: {
  width?: number | string
  height?: number | string
  radius?: string
}) {
  return <span className="ul-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

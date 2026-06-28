// apps/desktop/src/aether/ui/shell/page-transition.tsx
// Re-keys children on route change so the .ae-depth-enter animation replays.
// The living-language variant is tagged via data-ae-transition; reduced-motion
// downgrades .ae-depth-enter to a fade (see aether.css).
export function PageTransition({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  return (
    <div className="ae-depth-enter h-full min-h-0" data-ae-transition key={routeKey}>
      {children}
    </div>
  )
}

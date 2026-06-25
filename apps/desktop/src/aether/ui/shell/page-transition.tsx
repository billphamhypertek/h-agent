// apps/desktop/src/aether/ui/shell/page-transition.tsx
// Re-keys children on route change so the .ae-depth-enter animation replays.
export function PageTransition({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  return (
    <div className="ae-depth-enter h-full min-h-0" key={routeKey}>
      {children}
    </div>
  )
}

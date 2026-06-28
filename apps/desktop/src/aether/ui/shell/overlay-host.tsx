import { useStore } from '@nanostores/react'
import { useEffect } from 'react'
import { atom } from 'nanostores'

import { GlassSlab } from '@/aether/ui/components/glass-slab'

export type OverlayKind = 'summon' | 'result' | 'connection'

export interface OverlayState {
  kind: OverlayKind
  title?: string
  body?: React.ReactNode
}

// Shell-level host for the summon overlay, result modal, and connection/vital overlay.
// This is the canonical overlay render path for the AETHER shell (OVERLAY_VIEWS in
// routes.ts is the registry the per-screen migrations will consult later).
export const $overlay = atom<OverlayState | null>(null)

export function openOverlay(o: OverlayState): void { $overlay.set(o) }
export function closeOverlay(): void { $overlay.set(null) }

const DISMISSABLE: Record<OverlayKind, boolean> = { summon: true, result: true, connection: false }

export function OverlayHost() {
  const overlay = useStore($overlay)
  const dismissable = overlay ? DISMISSABLE[overlay.kind] : false

  useEffect(() => {
    if (!overlay || !dismissable) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeOverlay() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay, dismissable])

  if (!overlay) return null

  return (
    <div
      aria-modal="true"
      className="ae-overlay-host absolute inset-0 z-[60] grid place-items-center"
      data-kind={overlay.kind}
      data-testid="ae-overlay"
      onClick={dismissable ? closeOverlay : undefined}
      role="dialog"
      style={{ background: 'rgba(2,12,29,.45)', backdropFilter: 'blur(8px)' }}
    >
      <GlassSlab className="min-w-[280px] max-w-[70%]" size="lg">
        <div onClick={e => e.stopPropagation()}>
          {overlay.title && (
            <div className="mb-2 text-[length:var(--ae-text-base)] uppercase tracking-[var(--ae-tracking-wider)] text-[color:var(--ae-azure-soft)]">
              {overlay.title}
            </div>
          )}
          {overlay.body}
        </div>
      </GlassSlab>
    </div>
  )
}

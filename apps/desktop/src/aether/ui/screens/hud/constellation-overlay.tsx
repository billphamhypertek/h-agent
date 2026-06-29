import { useStore } from '@nanostores/react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { sessionRoute } from '@/app/routes'

import { $hudLifecycle } from './use-hud-graph'

// Mirror fallback.tsx's projection so DOM hit-targets track the SVG/GL constellation.
export function nodeViewPct(v: number): number {
  return 50 + v * 38
}

// DOM interaction + a11y layer over the (pointer-events:none) shared canvas. Real
// focusable buttons → keyboard + screen-reader reach the constellation; the GL/SVG
// render underneath is purely decorative. data-verb adds a subtle ambient pulse.
export function ConstellationOverlay({ spec }: { spec: GraphSpec }) {
  const navigate = useNavigate()
  const events = useStore($hudLifecycle)
  const verbById = useMemo(() => new Map(events.map(e => [e.sessionId, e.verb])), [events])

  if (spec.nodes.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <p className="text-[length:var(--ae-text-sm)] text-[color:var(--ae-dim)]">Chưa có phiên — bắt đầu trò chuyện</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      {spec.nodes.map(n => (
        <button
          aria-label={`Mở phiên: ${n.label}`}
          className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]"
          data-ae-hit
          data-verb={verbById.get(n.id) ?? undefined}
          key={n.id}
          onClick={() => navigate(sessionRoute(n.id))}
          style={{ left: `${nodeViewPct(n.x)}%`, top: `${nodeViewPct(n.y)}%` }}
          title={n.label}
          type="button"
        />
      ))}
    </div>
  )
}

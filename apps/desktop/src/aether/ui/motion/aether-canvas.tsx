// apps/desktop/src/aether/ui/motion/aether-canvas.tsx
import { useStore } from '@nanostores/react'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'

import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { $graphSpec } from '@/aether/domain/motion/graph-store'
import { $motionActive } from '@/aether/domain/motion/motion-store'
import { useTheme } from '@/themes/context'

import { AmbientField } from './ambient-field'
import { GraphView } from './graph/graph-view'
import { GraphLabels } from './graph/labels'

// Pure perf predicates (unit-tested).
export function pickDpr(devicePixelRatio: number): number {
  return Math.max(1, Math.min(1.75, devicePixelRatio))
}

export function shouldRenderFrame(hidden: boolean, idle: boolean): boolean {
  return !hidden && !idle
}

export function shouldRenderGraph(spec: GraphSpec | null): boolean {
  return spec != null && (spec.orbs.length > 0 || spec.nodes.length > 0)
}

// Shared, single Canvas at the shell root (z0, full-bleed). Returns null when the
// multi-layer gate is closed — the CSS orb / .ae-shell-bg path is the fallback.
export function AetherCanvas({ enabled }: { enabled: boolean }) {
  const graph = useStore($graphSpec)
  // Read the mode HERE (outside <Canvas>): react-three-fiber runs the canvas in a
  // separate reconciler that does NOT inherit React context, so in-canvas useTheme()
  // would always read the default. Pass the resolved mode down as a prop instead.
  const { renderedMode } = useTheme()
  const light = renderedMode === 'light'
  // Hooks must run before the early return; visibility drives the frameloop.
  const [visible, setVisible] = useState(!document.hidden)

  useEffect(() => {
    if (!enabled) {return}
    // Resync now: `enabled` resolves async (IPC), so the window may have gone hidden
    // between the initial useState read and this (re)enable — avoid a stale visible=true.
    setVisible(!document.hidden)
    $motionActive.set(true)
    // backgroundThrottling:false ⇒ we must self-pause: toggle visibility so the
    // frameloop runs continuously while shown and fully stops (~0 CPU) when hidden.
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      $motionActive.set(false)
    }
  }, [enabled])

  if (!enabled) {return null}

  return (
    <div aria-hidden className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={shouldRenderFrame(!visible, false) ? 'always' : 'never'}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      >
        <AmbientField light={light} />
        {/* No lone centred background orb in either mode — it floated behind every
            screen and glared through the cards. The constellation (real sessions,
            with its own core orb) is the living element that renders here instead. */}
        {shouldRenderGraph(graph) && graph && (
          <group position={[0, 0, 1.5]}>
            <GraphView spec={graph} />
            <GraphLabels light={light} nodes={graph.nodes} />
          </group>
        )}
      </Canvas>
    </div>
  )
}

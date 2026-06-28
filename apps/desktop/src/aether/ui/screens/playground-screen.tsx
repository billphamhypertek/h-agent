import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { HSG_TOTAL_MS, hsgFrame, hsgStandbyGraph } from '@/aether/domain/engine/demo-script'
import { $graphSpec, clearGraphSpec, setGraphSpec } from '@/aether/domain/motion/graph-store'
import { GraphFallback } from '@/aether/ui/motion/graph/fallback'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'

// Dev route that exercises the living engine: feeds the scripted HSG scene into the
// shared graph store. When the WebGL gate is open the shared AetherCanvas renders it;
// when closed we render the static fallback inline.
export function PlaygroundScreen() {
  const motionEnabled = useMotionEnabled()
  const spec = useStore($graphSpec)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    setGraphSpec(hsgStandbyGraph())

    return () => clearGraphSpec()
  }, [])

  useEffect(() => {
    if (!motionEnabled) {return}
    let raf = 0

    const tick = (t: number) => {
      if (startRef.current == null) {startRef.current = t}
      setGraphSpec(hsgFrame((t - startRef.current) % HSG_TOTAL_MS))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(raf)
  }, [motionEnabled])

  return (
    <div className="ae-screen-bare flex h-full flex-col gap-3">
      <h2 className="text-[length:var(--ae-text-md)] font-semibold">Playground — Sinh thể sống</h2>
      <div className="text-[length:var(--ae-text-sm)] text-[color:var(--ae-dim)]">
        {motionEnabled
          ? 'WebGL: chòm sao standby + vòng đời 6-verb (cảnh HSG).'
          : 'GPU-off / reduced-motion → bản tĩnh CSS/SVG.'}
      </div>
      <div className="relative min-h-0 flex-1">{!motionEnabled && spec && <GraphFallback spec={spec} />}</div>
    </div>
  )
}

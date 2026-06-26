// apps/desktop/src/aether/ui/motion/aether-canvas.tsx
import { useStore } from '@nanostores/react'
import { Canvas, invalidate } from '@react-three/fiber'
import { useEffect } from 'react'
import { $motionActive, $orbState } from '@/aether/domain/motion/motion-store'
import { AmbientField } from './ambient-field'
import { LivingOrbGL } from './living-orb-gl'

// Pure perf predicates (unit-tested).
export function pickDpr(devicePixelRatio: number): number {
  return Math.max(1, Math.min(1.75, devicePixelRatio))
}
export function shouldRenderFrame(hidden: boolean, idle: boolean): boolean {
  return !hidden && !idle
}

// Shared, single Canvas at the shell root (z0, full-bleed). Returns null when the
// multi-layer gate is closed — the CSS orb / .ae-bloom path is the fallback.
export function AetherCanvas({ enabled }: { enabled: boolean }) {
  const orbState = useStore($orbState)

  useEffect(() => {
    if (!enabled) return
    $motionActive.set(true)
    // backgroundThrottling:false ⇒ self-pause on hidden; invalidate to resume on demand.
    const onVisibility = () => { if (!document.hidden) invalidate() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      $motionActive.set(false)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="absolute inset-0 z-0" aria-hidden style={{ pointerEvents: 'none' }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        onCreated={() => invalidate()}
      >
        <AmbientField />
        <group position={[0, 0, 1.5]}>
          <LivingOrbGL state={orbState} size={0.6} />
        </group>
      </Canvas>
    </div>
  )
}

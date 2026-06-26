// apps/desktop/src/aether/ui/motion/aether-canvas.tsx
import { useStore } from '@nanostores/react'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
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
// multi-layer gate is closed — the CSS orb / .ae-shell-bg path is the fallback.
export function AetherCanvas({ enabled }: { enabled: boolean }) {
  const orbState = useStore($orbState)
  // Hooks must run before the early return; visibility drives the frameloop.
  const [visible, setVisible] = useState(!document.hidden)

  useEffect(() => {
    if (!enabled) return
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

  if (!enabled) return null

  return (
    <div className="absolute inset-0 z-0" aria-hidden style={{ pointerEvents: 'none' }}>
      <Canvas
        frameloop={shouldRenderFrame(!visible, false) ? 'always' : 'never'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      >
        <AmbientField />
        <group position={[0, 0, 1.5]}>
          <LivingOrbGL state={orbState} size={0.6} />
        </group>
      </Canvas>
    </div>
  )
}

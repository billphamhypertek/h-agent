// apps/desktop/src/aether/ui/motion/living-orb-gl.tsx
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three';
import { Color } from 'three'

import type { OrbState } from '@/aether/domain/motion/motion-store'

import { AETHER_ORB_FRAG, AETHER_ORB_VERT } from './shaders/orb'

export const STATE_VALUE: Record<OrbState, number> = {
  idle: 0,
  paused: 0.4,
  listening: 0.7,
  speaking: 0.9,
  thinking: 1,
}

export function LivingOrbGL({ state = 'idle', size = 1 }: { state?: OrbState; size?: number }) {
  const matRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uState: { value: STATE_VALUE.idle },
      uAzure: { value: new Color('#4aa3ff') },
      uAzureSoft: { value: new Color('#8fc0ff') },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (!matRef.current) {return}
    matRef.current.uniforms.uTime.value += delta
    matRef.current.uniforms.uState.value = STATE_VALUE[state]
  })

  return (
    <mesh scale={size}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial fragmentShader={AETHER_ORB_FRAG} ref={matRef} uniforms={uniforms} vertexShader={AETHER_ORB_VERT} />
    </mesh>
  )
}

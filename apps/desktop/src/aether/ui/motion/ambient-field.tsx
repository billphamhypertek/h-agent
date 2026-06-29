// apps/desktop/src/aether/ui/motion/ambient-field.tsx
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three';
import { Color } from 'three'

import { AETHER_AMBIENT_FRAG, AETHER_AMBIENT_VERT } from './shaders/ambient'

// `light` comes from AetherCanvas (outside the r3f reconciler) — context can't cross
// the Canvas boundary, so the mode must be passed in. The canvas is opaque
// (alpha:false), so this full-screen field IS the backdrop.
export function AmbientField({ light = false }: { light?: boolean }) {
  const matRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNavy: { value: new Color('#07397d') },
      uAzure: { value: new Color('#4aa3ff') },
      uLight: { value: 0 },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (!matRef.current) {return}
    matRef.current.uniforms.uTime.value += delta
    matRef.current.uniforms.uLight.value = light ? 1 : 0
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial depthWrite={false} fragmentShader={AETHER_AMBIENT_FRAG} ref={matRef} uniforms={uniforms} vertexShader={AETHER_AMBIENT_VERT} />
    </mesh>
  )
}

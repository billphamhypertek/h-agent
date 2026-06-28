// apps/desktop/src/aether/ui/motion/ambient-field.tsx
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three';
import { Color } from 'three'

import { AETHER_AMBIENT_FRAG, AETHER_AMBIENT_VERT } from './shaders/ambient'

export function AmbientField() {
  const matRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uNavy: { value: new Color('#07397d') }, uAzure: { value: new Color('#4aa3ff') } }),
    [],
  )

  useFrame((_, delta) => {
    if (matRef.current) {matRef.current.uniforms.uTime.value += delta}
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial depthWrite={false} fragmentShader={AETHER_AMBIENT_FRAG} ref={matRef} uniforms={uniforms} vertexShader={AETHER_AMBIENT_VERT} />
    </mesh>
  )
}

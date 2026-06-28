import { useMemo } from 'react'
import { BufferGeometry, Vector3 } from 'three'

import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { LivingOrbGL } from '@/aether/ui/motion/living-orb-gl'

import { linkPoints, nodeScale, stateColor } from './graph-geometry'

// Thin R3F view over a GraphSpec. The core orb reuses the SP-0 GLSL orb; nodes are
// emissive "bud" spheres; links are tendril line segments. Scale is small because
// AetherCanvas mounts this inside the shared shell Canvas group.
export function GraphView({ spec }: { spec: GraphSpec }) {
  const core = spec.orbs.find(o => o.kind === 'core')

  const linkGeoms = useMemo(() => {
    return spec.links
      .map(l => linkPoints(l, spec.nodes))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map(p => new BufferGeometry().setFromPoints([new Vector3(p.from.x, p.from.y, 0), new Vector3(p.to.x, p.to.y, 0)]))
  }, [spec.links, spec.nodes])

  return (
    <group>
      {core && (
        <group position={[core.x, core.y, 0]}>
          <LivingOrbGL size={0.28} state="thinking" />
        </group>
      )}
      {linkGeoms.map((geom, i) => (
         
        <lineSegments geometry={geom} key={i}>
          <lineBasicMaterial color={stateColor('online')} opacity={0.5} transparent />
        </lineSegments>
      ))}
      {spec.nodes.map(n => (
        <mesh key={n.id} position={[n.x, n.y, 0]} scale={nodeScale(n.state)}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={stateColor(n.state)} />
        </mesh>
      ))}
    </group>
  )
}

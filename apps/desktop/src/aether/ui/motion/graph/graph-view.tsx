import { useEffect, useMemo } from 'react'
import { BufferGeometry, Vector3 } from 'three'

import type { GraphSpec, LinkSpec } from '@/aether/domain/engine/graph-model'
import { LivingOrbGL } from '@/aether/ui/motion/living-orb-gl'

import { coreOrbState, linkColor, linkPoints, nodeOpacity, nodeScale, stateColor } from './graph-geometry'

// Thin R3F view over a GraphSpec. Core orb reuses the SP-0 GLSL orb; nodes are
// emissive "bud" spheres; links are tendril line segments. Scale is small because
// AetherCanvas mounts this inside the shared shell Canvas group.
export function GraphView({ spec }: { spec: GraphSpec }) {
  const core = spec.orbs.find(o => o.kind === 'core')

  const linkGeoms = useMemo(() => {
    return spec.links
      .map((l): { link: LinkSpec; geom: BufferGeometry } | null => {
        const p = linkPoints(l, spec.nodes)

        return p ? { link: l, geom: new BufferGeometry().setFromPoints([new Vector3(p.from.x, p.from.y, 0), new Vector3(p.to.x, p.to.y, 0)]) } : null
      })
      .filter((x): x is { link: LinkSpec; geom: BufferGeometry } => x != null)
  }, [spec.links, spec.nodes])

  // Dispose three.js geometries when links change or on unmount (carry-over #0 leak fix).
  useEffect(() => () => { linkGeoms.forEach(g => g.geom.dispose()) }, [linkGeoms])

  return (
    <group>
      {core && (
        <group position={[core.x, core.y, 0]}>
          <LivingOrbGL size={0.28} state={coreOrbState(core.state)} />
        </group>
      )}
      {linkGeoms.map(g => (
        <lineSegments geometry={g.geom} key={g.link.id}>
          <lineBasicMaterial color={linkColor(g.link, spec.nodes)} opacity={0.5} transparent />
        </lineSegments>
      ))}
      {spec.nodes.map(n => (
        <mesh key={n.id} position={[n.x, n.y, 0]} scale={nodeScale(n.state)}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={stateColor(n.state)} opacity={nodeOpacity(n)} transparent />
        </mesh>
      ))}
    </group>
  )
}

import { useEffect, useMemo } from 'react'
// @ts-expect-error troika ships runtime-only types
import { Text } from 'troika-three-text'

import type { NodeSpec } from '@/aether/domain/engine/graph-model'
import { AETHER } from '@/aether/ui/theme/tokens'

export function labelText(n: NodeSpec): string {
  return n.label
}

function NodeLabel({ node, light }: { node: NodeSpec; light: boolean }) {
  const text = useMemo(() => new Text(), [])
  // Near-white ink is invisible on the light "Arctic Glass" backdrop — flip to navy
  // ink. `light` is threaded from AetherCanvas (context can't cross the r3f Canvas).
  const ink = light ? AETHER.lightInk : AETHER.ink

  useEffect(() => {
    text.text = labelText(node)
    text.fontSize = 0.08
    text.color = ink
    text.anchorX = 'center'
    text.anchorY = 'middle'
    text.position.set(node.x, node.y - 0.16, 0)
    text.sync()

    return () => text.dispose()
  }, [text, node, ink])

  return <primitive object={text} />
}

// SDF text in GL so labels stay crisp. One troika Text per node.
export function GraphLabels({ nodes, light = false }: { nodes: NodeSpec[]; light?: boolean }) {
  return (
    <group>
      {nodes.map(n => (
        <NodeLabel key={n.id} light={light} node={n} />
      ))}
    </group>
  )
}

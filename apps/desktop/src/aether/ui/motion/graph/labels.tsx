import { useEffect, useMemo } from 'react'
// @ts-expect-error troika ships runtime-only types
import { Text } from 'troika-three-text'

import type { NodeSpec } from '@/aether/domain/engine/graph-model'
import { AETHER } from '@/aether/ui/theme/tokens'

export function labelText(n: NodeSpec): string {
  return n.label
}

function NodeLabel({ node }: { node: NodeSpec }) {
  const text = useMemo(() => new Text(), [])
  useEffect(() => {
    text.text = labelText(node)
    text.fontSize = 0.08
    text.color = AETHER.ink
    text.anchorX = 'center'
    text.anchorY = 'middle'
    text.position.set(node.x, node.y - 0.16, 0)
    text.sync()

    return () => text.dispose()
  }, [text, node])

  return <primitive object={text} />
}

// SDF text in GL so labels stay crisp. One troika Text per node.
export function GraphLabels({ nodes }: { nodes: NodeSpec[] }) {
  return (
    <group>
      {nodes.map(n => (
        <NodeLabel key={n.id} node={n} />
      ))}
    </group>
  )
}

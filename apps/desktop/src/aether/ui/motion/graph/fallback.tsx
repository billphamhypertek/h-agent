import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { LivingOrb } from '@/aether/ui/orb/living-orb'

import { linkPoints, stateColor } from './graph-geometry'

// Static constellation for the GPU-off / reduced-motion / probe-fail path.
// Maps the [-1,1] model space into a 0..100 SVG viewBox (center 50,50).
const toView = (v: number) => 50 + v * 38

export function GraphFallback({ spec }: { spec: GraphSpec }) {
  return (
    <div className="relative grid h-full w-full place-items-center" data-testid="ae-graph-fallback">
      <svg className="absolute inset-0 h-full w-full" fill="none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {spec.links.map(l => {
          const p = linkPoints(l, spec.nodes)
          if (!p) return null
          return (
            <line
              key={l.id}
              stroke="var(--ae-line)"
              strokeWidth={0.6}
              x1={toView(p.from.x)}
              x2={toView(p.to.x)}
              y1={toView(p.from.y)}
              y2={toView(p.to.y)}
            />
          )
        })}
        {spec.nodes.map(n => (
          <circle
            cx={toView(n.x)}
            cy={toView(n.y)}
            data-ae-node
            fill={stateColor(n.state)}
            key={n.id}
            r={n.state === 'dormant' ? 1.4 : 2}
          />
        ))}
      </svg>
      <LivingOrb size={120} />
    </div>
  )
}

import type { LifecyclePhase } from './lifecycle'

export type NodeState = 'online' | 'busy' | 'dormant'

export interface OrbSpec {
  id: string
  kind: 'core' | 'sub'
  state: NodeState
  x: number
  y: number
}

export interface NodeSpec {
  id: string
  label: string
  state: NodeState
  x: number
  y: number
  /** Just appeared this poll (drives mitosis-in). */
  enter?: boolean
  /** Pruning out this poll (drives fade-to-core). */
  exit?: boolean
}

export interface LinkSpec {
  id: string
  from: string
  to: string
  /** 0..1 — data-flow intensity rendered along the tendril. */
  flow: number
}

export interface GraphSpec {
  phase: LifecyclePhase
  orbs: OrbSpec[]
  nodes: NodeSpec[]
  links: LinkSpec[]
}

export function createGraph(p: Partial<GraphSpec> = {}): GraphSpec {
  return {
    phase: p.phase ?? 'breathe',
    orbs: p.orbs ?? [],
    nodes: p.nodes ?? [],
    links: p.links ?? [],
  }
}

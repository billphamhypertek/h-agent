import type { ToolActivity, TurnActivity } from '@/aether/domain/session/turn-activity'
import type { SubagentProgress } from '@/store/subagents'

import { createGraph, type GraphSpec, type LinkSpec, type NodeSpec, type NodeState } from './graph-model'

export const BUD_CAP = 6
const CORE_X = 0.6

// Deterministic fan to the RIGHT of the core (so the living nodes sit over the
// translucent right dock column). No RNG → identical turns produce identical
// coords → nodes never jitter between throttled recomputes.
export function dockLayout(count: number): { x: number; y: number }[] {
  if (count <= 0) {return []}

  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5 // -0.5..0.5

    return { x: 0.78 + (i % 2) * 0.09, y: t * 0.9 }
  })
}

function toolState(status: ToolActivity['status']): NodeState {
  if (status === 'running') {return 'busy'}

  return status === 'error' ? 'dormant' : 'online'
}

function subState(status: SubagentProgress['status']): NodeState {
  if (status === 'running' || status === 'queued') {return 'busy'}

  return status === 'completed' ? 'online' : 'dormant'
}

// Sub-orbs first (closest to the core), then tool buds, then a single "+k" overflow.
export function chatGraph(turn: TurnActivity, subagents: SubagentProgress[], opts: { budCap?: number } = {}): GraphSpec {
  const budCap = opts.budCap ?? BUD_CAP
  const subItems = subagents.map(s => ({ id: `sub:${s.id}`, label: s.goal, state: subState(s.status) }))
  const shownTools = turn.tools.slice(0, budCap)
  const overflow = turn.tools.length - shownTools.length
  const toolItems = shownTools.map(t => ({ id: `tool:${t.id}`, label: t.label, state: toolState(t.status) }))
  const overflowItem = overflow > 0 ? [{ id: 'more', label: `+${overflow}`, state: 'dormant' as NodeState }] : []

  const items = [...subItems, ...toolItems, ...overflowItem]
  const pts = dockLayout(items.length)

  const nodes: NodeSpec[] = items.map((it, i) => ({ id: it.id, label: it.label, state: it.state, x: pts[i].x, y: pts[i].y }))

  const links: LinkSpec[] = nodes
    .filter(n => n.id !== 'more')
    .map(n => ({ id: `l-${n.id}`, from: 'core', to: n.id, flow: n.state === 'busy' ? 1 : 0 }))

  return createGraph({
    phase: turn.phase,
    orbs: [{ id: 'core', kind: 'core', state: turn.busy ? 'busy' : 'online', x: CORE_X, y: 0 }],
    nodes,
    links,
  })
}

// Mirror of useHudGraph's reconcileGraph, keyed purely by node id (appearance =
// enter / lean-in; disappearance = one-cycle exit ghost → fade-to-core).
export function reconcileChatGraph(prev: GraphSpec | null, next: GraphSpec): GraphSpec {
  const prevIds = new Set((prev?.nodes ?? []).map(n => n.id))
  const nextIds = new Set(next.nodes.map(n => n.id))
  const nodes = next.nodes.map(n => (prevIds.has(n.id) ? n : { ...n, enter: true }))

  const ghosts = (prev?.nodes ?? [])
    .filter(n => !nextIds.has(n.id) && !n.exit)
    .map(n => ({ ...n, state: 'dormant' as const, exit: true }))

  return { ...next, nodes: [...nodes, ...ghosts] }
}

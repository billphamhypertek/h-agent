import type { LinkSpec, NodeSpec, NodeState } from '@/aether/domain/engine/graph-model'
import type { OrbState } from '@/aether/domain/motion/motion-store'
import { AETHER } from '@/aether/ui/theme/tokens'

export function stateColor(state: NodeState): string {
  if (state === 'busy') {return AETHER.stateBusy}

  if (state === 'dormant') {return AETHER.stateDormant}

  return AETHER.stateOnline
}

export function nodeScale(state: NodeState): number {
  if (state === 'busy') {return 0.09}

  if (state === 'dormant') {return 0.05}

  return 0.07
}

export function linkPoints(
  link: LinkSpec,
  nodes: NodeSpec[],
  core: { x: number; y: number } = { x: 0, y: 0 },
): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const find = (id: string) => (id === 'core' ? core : nodes.find(n => n.id === id) ?? null)
  const a = find(link.from)
  const b = find(link.to)

  return a && b ? { from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y } } : null
}

// Tendril color follows the real endpoint state (carry-over #0: was hardcoded 'online').
export function linkColor(link: LinkSpec, nodes: NodeSpec[]): string {
  const endId = link.from === 'core' ? link.to : link.from

  return stateColor(nodes.find(n => n.id === endId)?.state ?? 'online')
}

export function nodeOpacity(node: { state: NodeState; exit?: boolean }): number {
  if (node.exit) {return 0.18}

  return node.state === 'dormant' ? 0.45 : 1
}

// Core orb vital follows the constellation core state (carry-over #0: was fixed 'thinking').
export function coreOrbState(state: NodeState): OrbState {
  if (state === 'busy') {return 'thinking'}

  return state === 'dormant' ? 'paused' : 'idle'
}

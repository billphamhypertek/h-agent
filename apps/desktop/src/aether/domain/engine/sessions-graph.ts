import type { AgentSessionRow } from '@/aether/domain/agents/agents-view'

import { createGraph, type GraphSpec, type LinkSpec, type NodeSpec, type NodeState } from './graph-model'
import { constellationLayout } from './layout'

export const HUD_NODE_CAP = 12
// Recently-active-but-not-running window: <=15min → online, older → dormant.
export const ONLINE_WINDOW_MS = 15 * 60_000

// Active first, then most-recently-active, then id (stable tiebreak so identical
// snapshots produce identical order — no jitter between polls).
export function orderSessions(sessions: AgentSessionRow[]): AgentSessionRow[] {
  return [...sessions].sort((a, b) => {
    if (a.isActive !== b.isActive) {return a.isActive ? -1 : 1}

    if (b.lastActive !== a.lastActive) {return b.lastActive - a.lastActive}

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

export function sessionState(row: AgentSessionRow, now: number): NodeState {
  if (row.isActive) {return 'busy'}

  return now - row.lastActive <= ONLINE_WINDOW_MS ? 'online' : 'dormant'
}

export function sessionsToGraph(
  sessions: AgentSessionRow[],
  opts: { now?: number; cap?: number } = {},
): GraphSpec {
  const now = opts.now ?? Date.now()
  const cap = opts.cap ?? HUD_NODE_CAP
  const ordered = orderSessions(sessions).slice(0, cap)
  const pts = constellationLayout(ordered.length, 1)

  const nodes: NodeSpec[] = ordered.map((s, i) => ({
    id: s.id,
    label: s.title,
    state: sessionState(s, now),
    x: pts[i].x,
    y: pts[i].y,
  }))

  const links: LinkSpec[] = nodes.map(n => ({ id: `l-${n.id}`, from: 'core', to: n.id, flow: n.state === 'busy' ? 1 : 0 }))
  const anyActive = ordered.some(s => s.isActive)

  return createGraph({
    orbs: [{ id: 'core', kind: 'core', state: anyActive ? 'busy' : 'online', x: 0, y: 0 }],
    nodes,
    links,
  })
}

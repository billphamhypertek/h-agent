import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useEffect, useRef } from 'react'

import { $agents } from '@/aether/domain/agents/agents-store'
import type { AgentSessionRow } from '@/aether/domain/agents/agents-view'
import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { diffSessions, type SessionLifecycleEvent } from '@/aether/domain/engine/lifecycle-differ'
import { sessionsToGraph } from '@/aether/domain/engine/sessions-graph'
import { clearGraphSpec, setGraphSpec } from '@/aether/domain/motion/graph-store'

// Last poll's lifecycle events — ambient decoration surface read by the DOM overlay.
// Snapshot-derived only; never holds token/tool stream data (prompt-cache safe).
export const $hudLifecycle = atom<SessionLifecycleEvent[]>([])

// Mark just-appeared nodes (enter) and re-add just-pruned nodes for one cycle (exit),
// so the view can animate mitosis-in / fade-to-core instead of popping.
export function reconcileGraph(
  prevReal: GraphSpec | null,
  next: GraphSpec,
  events: SessionLifecycleEvent[],
): GraphSpec {
  const enterIds = new Set(events.filter(e => e.verb === 'mitosis').map(e => e.sessionId))
  const pruneIds = new Set(events.filter(e => e.verb === 'prune').map(e => e.sessionId))
  const nextIds = new Set(next.nodes.map(n => n.id))

  const nodes = next.nodes.map(n => (enterIds.has(n.id) ? { ...n, enter: true } : n))

  const ghosts = (prevReal?.nodes ?? [])
    .filter(n => pruneIds.has(n.id) && !nextIds.has(n.id))
    .map(n => ({ ...n, state: 'dormant' as const, exit: true }))

  return { ...next, nodes: [...nodes, ...ghosts] }
}

export function useHudGraph(): void {
  const view = useStore($agents)
  const prevSessions = useRef<AgentSessionRow[]>([])
  const prevReal = useRef<GraphSpec | null>(null)

  useEffect(() => {
    const sessions = view?.sessions ?? []
    const next = sessionsToGraph(sessions)
    const events = diffSessions(prevSessions.current, sessions)

    setGraphSpec(reconcileGraph(prevReal.current, next, events))
    $hudLifecycle.set(events)
    prevSessions.current = sessions
    prevReal.current = next
  }, [view])

  useEffect(() => () => { clearGraphSpec(); $hudLifecycle.set([]) }, [])
}

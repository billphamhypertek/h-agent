import type { AgentSessionRow } from '@/aether/domain/agents/agents-view'

// Coarse, snapshot-only verbs (no token/tool stream). Mapped from $agents diffs.
export type SessionVerb = 'mitosis' | 'flow' | 'inhale' | 'crystallize' | 'prune'

export interface SessionLifecycleEvent {
  sessionId: string
  verb: SessionVerb
}

export function diffSessions(prev: AgentSessionRow[], next: AgentSessionRow[]): SessionLifecycleEvent[] {
  const prevById = new Map(prev.map(s => [s.id, s]))
  const nextById = new Map(next.map(s => [s.id, s]))
  const events: SessionLifecycleEvent[] = []

  for (const s of next) {
    const before = prevById.get(s.id)

    if (!before) {
      events.push({ sessionId: s.id, verb: 'mitosis' })

      continue
    }

    if (before.isActive && !s.isActive) {
      events.push({ sessionId: s.id, verb: 'crystallize' })

      continue
    }

    if (s.messageCount > before.messageCount) {
      events.push({ sessionId: s.id, verb: 'inhale' })

      continue
    }

    if (s.isActive) { events.push({ sessionId: s.id, verb: 'flow' }) }
  }

  for (const s of prev) {
    if (!nextById.has(s.id)) { events.push({ sessionId: s.id, verb: 'prune' }) }
  }

  return events
}

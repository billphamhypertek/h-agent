import { atom } from 'nanostores'

import type { LifecyclePhase } from '@/aether/domain/engine/lifecycle'

// Coarse, snapshot-only turn state. NEVER fed by message.delta / reasoning.delta —
// the engine subscribes to this store INSTEAD of $messages, which is what keeps the
// prompt-cache intact (no recompute ~30×/s). See chat-graph.ts / use-chat-graph.ts.
export interface ToolActivity {
  id: string
  name: string
  label: string
  status: 'running' | 'ok' | 'error'
  filePath?: string
}

export interface TurnActivity {
  phase: LifecyclePhase
  busy: boolean
  tools: ToolActivity[]
}

export type TurnEvent =
  | { type: 'message.start' }
  | { type: 'message.complete' }
  | { type: 'tool.start'; id: string; name: string; label: string; filePath?: string }
  | { type: 'tool.complete'; id: string; ok: boolean }
  | { type: 'subagent.start' }
  | { type: 'ignored' }

export const EMPTY_TURN: TurnActivity = { phase: 'breathe', busy: false, tools: [] }

export function turnActivityReducer(state: TurnActivity, event: TurnEvent): TurnActivity {
  switch (event.type) {
    case 'message.start':
      return { phase: 'reach', busy: true, tools: [] }

    case 'subagent.start':
      return { ...state, phase: 'mitosis' }
    case 'tool.start': {
      const tool: ToolActivity = { id: event.id, name: event.name, label: event.label, status: 'running', filePath: event.filePath }

      const tools = state.tools.some(t => t.id === event.id)
        ? state.tools.map(t => (t.id === event.id ? tool : t))
        : [...state.tools, tool]

      return { ...state, phase: 'flow', tools }
    }

    case 'tool.complete': {
      const tools = state.tools.map(t => (t.id === event.id ? { ...t, status: event.ok ? 'ok' as const : 'error' as const } : t))

      return { ...state, phase: 'crystallize', tools }
    }

    case 'message.complete':
      return { ...state, phase: 'breathe', busy: false }

    case 'ignored':

    default:
      // Identity by reference — a per-token event must not even allocate a new object.
      return state
  }
}

export const $turnActivity = atom<TurnActivity>(EMPTY_TURN)

export function recordTurnEvent(event: TurnEvent): void {
  $turnActivity.set(turnActivityReducer($turnActivity.get(), event))
}

export function resetTurnActivity(): void {
  $turnActivity.set(EMPTY_TURN)
}

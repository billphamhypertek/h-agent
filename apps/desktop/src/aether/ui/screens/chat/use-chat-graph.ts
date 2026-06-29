import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { chatGraph, reconcileChatGraph } from '@/aether/domain/engine/chat-graph'
import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { clearGraphSpec, setGraphSpec } from '@/aether/domain/motion/graph-store'
import { $turnActivity } from '@/aether/domain/session/turn-activity'
import { $activeSessionId } from '@/store/session'
import { $subagentsBySession } from '@/store/subagents'

export const CHAT_THROTTLE_MS = 150

// Coarse-only engine driver for Chat — the ONLY screen that subscribes the live
// stream. Reads $turnActivity (NOT $messages) + the active session's subagents,
// maps to a dock GraphSpec, and pushes to the shared $graphSpec the shell-root
// AetherCanvas already renders. Leading-edge throttle coalesces tool bursts.
export function useChatGraph(): void {
  const turn = useStore($turnActivity)
  const bySession = useStore($subagentsBySession)
  const activeId = useStore($activeSessionId)
  const prevReal = useRef<GraphSpec | null>(null)
  const lastAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subagents = activeId ? (bySession[activeId] ?? []) : []

  useEffect(() => {
    const compute = () => {
      const next = chatGraph($turnActivity.get(), activeId ? ($subagentsBySession.get()[activeId] ?? []) : [])
      const reconciled = reconcileChatGraph(prevReal.current, next)
      setGraphSpec(reconciled)
      prevReal.current = next
      lastAt.current = Date.now()
    }

    const now = Date.now()
    const since = now - lastAt.current

    if (since >= CHAT_THROTTLE_MS) {
      compute()
    } else {
      if (timer.current) { clearTimeout(timer.current) }
      timer.current = setTimeout(compute, CHAT_THROTTLE_MS - since)
    }

    return () => { if (timer.current) { clearTimeout(timer.current) } }
    // Recompute whenever the coarse turn, the active subagents, or the active session change.
  }, [turn, subagents, activeId])

  // Reset the reconcile baseline on session switch so a new chat doesn't inherit ghosts.
  useEffect(() => { prevReal.current = null }, [activeId])

  // Leaving Chat must not leave a stale dock on the HUD's shared canvas.
  useEffect(() => () => { clearGraphSpec(); prevReal.current = null }, [])
}

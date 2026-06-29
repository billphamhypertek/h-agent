import { useEffect, useRef } from 'react'

import { $agentsStatus, loadAgents } from './agents-store'

export interface AgentsPollOptions {
  intervalMs?: number
  load?: () => Promise<void>
  isHidden?: () => boolean
}

// Read-only snapshot poller for non-chat screens. Refreshes $agents on an interval
// and pauses while the window is hidden (background throttling is off, so we self-gate).
// Stable single interval keyed on intervalMs; load/isHidden read via a ref.
export function useAgentsPoll(opts: AgentsPollOptions = {}): void {
  const intervalMs = opts.intervalMs ?? 5000
  const ref = useRef({ load: opts.load ?? loadAgents, isHidden: opts.isHidden ?? (() => document.hidden) })
  ref.current = { load: opts.load ?? loadAgents, isHidden: opts.isHidden ?? (() => document.hidden) }

  useEffect(() => {
    if ($agentsStatus.get() === 'idle') { void ref.current.load() }

    const id = setInterval(() => { if (!ref.current.isHidden()) { void ref.current.load() } }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMs])
}

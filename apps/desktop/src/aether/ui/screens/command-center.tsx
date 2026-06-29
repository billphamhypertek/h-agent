import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { useAgentsPoll } from '@/aether/domain/agents/use-agents-poll'
import { $briefing, $briefingStatus, loadBriefing } from '@/aether/domain/briefing/briefing-store'
import { $graphSpec } from '@/aether/domain/motion/graph-store'
import { GraphFallback } from '@/aether/ui/motion/graph/fallback'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'

import { ConstellationOverlay } from './hud/constellation-overlay'
import { FleetStatus } from './hud/fleet-status'
import { GreetingCard } from './hud/greeting-card'
import { PrioritiesPeek } from './hud/priorities-peek'
import { SystemVitalsCard } from './hud/system-vitals-card'
import { useHudGraph } from './hud/use-hud-graph'

// HUD = Light · L2 living constellation home. The shared shell-root AetherCanvas
// renders the GL constellation from $graphSpec (composed by useHudGraph); when the
// WebGL gate is closed we render the static GraphFallback inline. The DOM overlay +
// 4 ambient widgets stay on both paths. Non-chat: snapshot-only (prompt-cache safe).
export function CommandCenter() {
  const briefing = useStore($briefing)
  const spec = useStore($graphSpec)
  const motionEnabled = useMotionEnabled()

  useAgentsPoll()
  useHudGraph()

  useEffect(() => {
    if ($briefingStatus.get() === 'idle') { void loadBriefing() }
  }, [])

  return (
    <div className="ae-screen-bare relative h-full min-w-0" data-testid="ae-hud">
      {!motionEnabled && spec && <div className="absolute inset-0 z-0"><GraphFallback spec={spec} /></div>}
      {spec && <div className="absolute inset-0 z-[1]"><ConstellationOverlay spec={spec} /></div>}

      <div className="pointer-events-none absolute inset-0 z-[2]">
        <div className="pointer-events-auto absolute left-0 top-0 max-w-[320px]"><GreetingCard briefing={briefing} /></div>
        <div className="pointer-events-auto absolute right-0 top-0 max-w-[280px]"><SystemVitalsCard briefing={briefing} /></div>
        <div className="pointer-events-auto absolute bottom-0 left-0 max-w-[320px]"><PrioritiesPeek briefing={briefing} /></div>
        <div className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2"><FleetStatus /></div>
      </div>
    </div>
  )
}

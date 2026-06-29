import { useStore } from '@nanostores/react'

import { $agents } from '@/aether/domain/agents/agents-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function FleetStatus() {
  const view = useStore($agents)
  const running = view?.runningCount ?? 0

  return (
    <GlassSlab className="flex items-center gap-2 text-[length:var(--ae-text-sm)]" size="sm">
      <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--ae-energy)]" style={{ boxShadow: '0 0 8px var(--ae-energy)' }} />
      <span className="font-semibold tracking-[0.16em] text-[color:var(--ae-azure-soft)]">SẴN SÀNG</span>
      <span className="text-[color:var(--ae-dim)]">· {running} phiên đang chạy</span>
    </GlassSlab>
  )
}

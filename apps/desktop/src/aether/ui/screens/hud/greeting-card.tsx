import type { Briefing } from '@/aether/domain/briefing/briefing-schema'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function GreetingCard({ briefing }: { briefing: Briefing | null }) {
  const name = briefing?.greetingName ?? 'bạn'
  const priorities = briefing?.priorities.length ?? 0
  const warnServers = (briefing?.servers ?? []).filter(s => s.status !== 'ok').length

  return (
    <GlassSlab className="flex flex-col gap-1" size="md">
      <h2 className="text-[length:var(--ae-text-lg)] font-semibold text-[color:var(--ae-ink)]">Chào buổi sáng, {name}</h2>
      <p className="text-[length:var(--ae-text-sm)] text-[color:var(--ae-dim)]">
        {priorities} ưu tiên · {warnServers} server cảnh báo
      </p>
    </GlassSlab>
  )
}

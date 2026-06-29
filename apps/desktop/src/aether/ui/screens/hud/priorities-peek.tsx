import type { Briefing, Severity } from '@/aether/domain/briefing/briefing-schema'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

function dotColor(severity: Severity): string {
  if (severity === 'error') {return 'var(--ae-error)'}

  return severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)'
}

export function PrioritiesPeek({ briefing }: { briefing: Briefing | null }) {
  const items = (briefing?.priorities ?? []).slice(0, 3)

  return (
    <GlassSlab className="flex flex-col gap-2" size="md">
      <h3 className="text-[length:var(--ae-text-xs)] font-semibold tracking-[0.16em] text-[color:var(--ae-azure-soft)]">ƯU TIÊN HÔM NAY</h3>
      {items.map(p => (
        <div className="flex items-start gap-2 text-[length:var(--ae-text-sm)] text-[color:var(--ae-ink)]" key={p.id}>
          <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full" style={{ background: dotColor(p.severity), boxShadow: `0 0 8px ${dotColor(p.severity)}` }} />
          {p.title}
        </div>
      ))}
    </GlassSlab>
  )
}

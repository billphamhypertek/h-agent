import type { Briefing } from '@/aether/domain/briefing/briefing-schema'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Bar } from '@/aether/ui/components/micro-viz'

export function SystemVitalsCard({ briefing }: { briefing: Briefing | null }) {
  const vitals = briefing?.vitals ?? { cpu: 0, api: 0, memory: 0 }
  const worst = (briefing?.servers ?? []).find(s => s.status !== 'ok')

  const rows: ReadonlyArray<[string, number, boolean]> = [
    ['CPU', vitals.cpu, vitals.cpu >= 80],
    ['API', vitals.api, false],
    ['Bộ nhớ', vitals.memory, false],
  ]

  return (
    <GlassSlab className="flex flex-col gap-2" size="md">
      <h3 className="text-[length:var(--ae-text-xs)] font-semibold tracking-[0.16em] text-[color:var(--ae-azure-soft)]">SỨC KHOẺ HỆ THỐNG</h3>
      {rows.map(([label, value, warn]) => (
        <div className="flex flex-col gap-1" key={label}>
          <div className="flex justify-between text-[length:var(--ae-text-xs)] text-[color:var(--ae-dim)]">
            <span>{label}</span>
            <b className="text-[color:var(--ae-ink)]">{value}%</b>
          </div>
          <Bar value={value} warn={warn} />
        </div>
      ))}
      {worst && (
        <p className="text-[length:var(--ae-text-xs)] text-[color:var(--ae-warn)]">
          Server xấu nhất: {worst.name} {worst.cpu}%
        </p>
      )}
    </GlassSlab>
  )
}

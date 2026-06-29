import { useStore } from '@nanostores/react'
import { useMemo } from 'react'

import { openReaderFromMessages } from '@/aether/domain/chat/reader-store'
import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { $turnActivity, type ToolActivity } from '@/aether/domain/session/turn-activity'

// Same projection ConstellationOverlay uses, so DOM hit-targets track the full-bleed
// GL/SVG render underneath (the right dock GlassSlab is just a translucent backing).
export function dockNodePct(v: number): number {
  return 50 + v * 38
}

// Clicking a tool bud jumps to its inline record in the thread (Task 9 stamps the id).
export function scrollToTool(toolCallId: string): void {
  const el = document.getElementById(`ae-tool-${toolCallId}`)

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.setAttribute('data-ae-flash', '')
    window.setTimeout(() => el.removeAttribute('data-ae-flash'), 1200)
  }
}

const statusColor: Record<ToolActivity['status'], string> = {
  running: 'var(--ae-energy)',
  ok: 'var(--ae-state-online)',
  error: 'var(--ae-warn)',
}

const statusLabel: Record<ToolActivity['status'], string> = {
  running: 'đang chạy',
  ok: 'xong',
  error: 'lỗi',
}

export function LivingDock({ spec, slim, onToggle }: { spec: GraphSpec; slim: boolean; onToggle: () => void }) {
  const turn = useStore($turnActivity)
  const toolById = useMemo(() => new Map(turn.tools.map(t => [`tool:${t.id}`, t])), [turn.tools])
  const toolCount = turn.tools.length
  const subCount = spec.nodes.filter(n => n.id.startsWith('sub:')).length

  const handleNode = (id: string) => {
    const tool = toolById.get(id)

    if (!tool) {return}

    if (tool.name === 'read_file') { openReaderFromMessages(tool.id) }
    else { scrollToTool(tool.id) }
  }

  if (slim) {
    return (
      <div className="pointer-events-auto flex h-full w-[58px] flex-col items-center justify-between py-3" data-testid="ae-living-dock-slim">
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
          {spec.nodes.filter(n => !n.exit).map(n => (
            <span aria-hidden className="size-1.5 rounded-full" key={n.id} style={{ background: statusColor[toolById.get(n.id)?.status ?? 'ok'] }} />
          ))}
        </div>
        <span className="text-[length:var(--ae-text-xs)] tabular-nums text-[color:var(--ae-dim)]">{toolCount}·{subCount}</span>
        <button
          aria-label="Mở rộng dock"
          className="rounded-md px-1.5 py-1 text-[color:var(--ae-azure-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]"
          onClick={onToggle}
          type="button"
        >⟩</button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0" data-testid="ae-living-dock">
      {spec.nodes.filter(n => !n.exit).map(n => {
        const tool = toolById.get(n.id)
        const status = tool?.status ?? 'ok'

        return (
          <button
            aria-label={`${n.label} — ${tool ? statusLabel[status] : 'sub-agent'}`}
            className="pointer-events-auto absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]"
            data-ae-hit
            data-verb={n.enter ? 'mitosis' : undefined}
            key={n.id}
            onClick={() => handleNode(n.id)}
            style={{ left: `${dockNodePct(n.x)}%`, top: `${dockNodePct(n.y)}%`, boxShadow: `0 0 0 1px ${tool ? statusColor[status] : 'var(--ae-suborb)'}` }}
            title={n.label}
            type="button"
          />
        )
      })}
      <div className="pointer-events-auto absolute bottom-2 right-2 text-[length:var(--ae-text-xs)] uppercase tracking-[var(--ae-tracking-wider)] text-[color:var(--ae-dim)]">
        {toolCount} tool · {subCount} sub-agent
      </div>
    </div>
  )
}

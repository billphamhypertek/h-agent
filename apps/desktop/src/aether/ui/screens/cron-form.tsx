import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { $cronDeliveryTargets } from '@/aether/domain/cron/cron-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { CronJobCreatePayload } from '@/types/aether'

type CronScheduleKind = 'daily' | 'weekly' | 'custom'

function buildSchedule(kind: CronScheduleKind, hour: number, minute: number, weekday: number, expr: string): string {
  if (kind === 'custom') { return expr.trim() }
  const m = Math.max(0, Math.min(59, minute))
  const h = Math.max(0, Math.min(23, hour))

  if (kind === 'weekly') { return `${m} ${h} * * ${Math.max(0, Math.min(6, weekday))}` }

  return `${m} ${h} * * *`
}

export function CronForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (payload: CronJobCreatePayload) => void
}) {
  const targets = useStore($cronDeliveryTargets)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [kind, setKind] = useState<CronScheduleKind>('daily')
  const [hour, setHour] = useState(7)
  const [minute, setMinute] = useState(0)
  const [weekday, setWeekday] = useState(1)
  const [expr, setExpr] = useState('')
  const [deliver, setDeliver] = useState('local')

  const submit = () => {
    const schedule = buildSchedule(kind, hour, minute, weekday, expr)

    if (!prompt.trim() || !schedule) { return }
    onSubmit({ prompt: prompt.trim(), schedule, name: name.trim() || undefined, deliver })
  }

  return (
    <GlassSlab className="flex flex-col gap-3" size="md">
      <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
        Tên (tùy chọn)
        <input className="ae-field" onChange={e => setName(e.target.value)} value={name} />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
        Lời nhắc
        <textarea className="ae-field min-h-[64px]" onChange={e => setPrompt(e.target.value)} value={prompt} />
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
          Lịch
          <select className="ae-field" onChange={e => setKind(e.target.value as CronScheduleKind)} value={kind}>
            <option value="daily">Hằng ngày</option>
            <option value="weekly">Hằng tuần</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
        </label>
        {kind !== 'custom' && (
          <>
            <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
              Giờ
              <input className="ae-field w-[64px]" max={23} min={0} onChange={e => setHour(Number(e.target.value))} type="number" value={hour} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
              Phút
              <input className="ae-field w-[64px]" max={59} min={0} onChange={e => setMinute(Number(e.target.value))} type="number" value={minute} />
            </label>
          </>
        )}
        {kind === 'weekly' && (
          <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
            Thứ
            <select className="ae-field" onChange={e => setWeekday(Number(e.target.value))} value={weekday}>
              <option value={1}>Thứ 2</option>
              <option value={2}>Thứ 3</option>
              <option value={3}>Thứ 4</option>
              <option value={4}>Thứ 5</option>
              <option value={5}>Thứ 6</option>
              <option value={6}>Thứ 7</option>
              <option value={0}>Chủ nhật</option>
            </select>
          </label>
        )}
        {kind === 'custom' && (
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
            Biểu thức cron
            <input className="ae-field font-mono" onChange={e => setExpr(e.target.value)} placeholder="0 7 * * *" value={expr} />
          </label>
        )}
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
        Gửi tới
        <select className="ae-field" onChange={e => setDeliver(e.target.value)} value={deliver}>
          {targets.map(t => (
            <option key={t.id} value={t.id}>
              {t.id === 'local' ? 'Local' : t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex justify-end gap-2">
        <button className="rounded-[9px] px-3 py-1.5 text-[12px] text-[color:var(--ae-dim)]" onClick={onCancel} type="button">
          Hủy
        </button>
        <button
          className="rounded-[10px] border border-[color:var(--ae-azure-soft)] px-3 py-1.5 text-[12px] text-[color:var(--ae-azure-soft)]"
          onClick={submit}
          type="button"
        >
          Lưu
        </button>
      </div>
    </GlassSlab>
  )
}

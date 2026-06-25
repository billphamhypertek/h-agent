// apps/desktop/src/aether/ui/screens/boot-sequence.tsx
import { useStore } from '@nanostores/react'

import { $bootProgress, BOOT_STEPS, bootStepStatus } from '@/aether/domain/boot/boot-store'
import { LivingOrb } from '@/aether/ui/orb/living-orb'

export function BootSequence() {
  const progress = useStore($bootProgress)
  const pct = Math.max(0, Math.min(100, Math.round(progress?.progress ?? 0)))
  const hasError = Boolean(progress?.error)

  return (
    <div className="ae-screen grid h-full w-full place-items-center">
      <div className="ae-grid-floor" />
      <div className="ae-bloom" style={{ left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }} />
      <div className="ae-vignette" />

      {/* init checklist */}
      <div className="absolute left-12 top-1/2 z-[3] flex w-[230px] -translate-y-1/2 flex-col gap-[11px]">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[.22em] text-[color:var(--ae-azure-soft)] opacity-85">
          KHỞI ĐỘNG HỆ THỐNG
        </div>
        {BOOT_STEPS.map(step => {
          const status = bootStepStatus(progress, step.phase)

          return (
            <div className="flex items-center gap-[11px] font-mono text-[12.5px] text-[#D7ECFA]" key={step.phase}>
              <span
                className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[6px] text-[11px]"
                style={{
                  color: status === 'pending' ? 'var(--ae-dim)' : 'var(--ae-ok)',
                  background: status === 'pending' ? 'transparent' : 'linear-gradient(180deg,rgba(61,231,160,.22),rgba(61,231,160,.06))',
                  border: `1px solid ${status === 'pending' ? 'var(--ae-line)' : 'rgba(61,231,160,.4)'}`,
                }}
              >
                {status === 'pending' ? '·' : status === 'active' ? '…' : '✓'}
              </span>
              <span className="flex-1">{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* core orb + wordmark */}
      <div className="z-[2] flex flex-col items-center">
        <LivingOrb label="AETHER" size={300} state="thinking" />
        <div className="mt-7 font-[family-name:var(--ae-font-display)] text-[52px] font-bold tracking-[.22em] pl-[.22em]"
          style={{ background: 'linear-gradient(180deg,#fff,var(--ae-azure-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 30px rgba(74,163,255,.45)' }}>
          AETHER
        </div>
        <div className="mt-2 pl-[.42em] text-[11px] font-semibold uppercase tracking-[.42em] text-[color:var(--ae-azure-soft)] opacity-85">
          HYPERTEK - AGENT PLATFORM
        </div>
      </div>

      {/* loader / error */}
      <div className="absolute bottom-14 left-1/2 z-[3] flex w-[420px] -translate-x-1/2 flex-col gap-[9px]">
        {hasError ? (
          <div className="ae-slab px-4 py-3 text-center">
            <div className="text-sm font-semibold text-[color:var(--ae-error)]">Khởi động lỗi</div>
            <div className="mt-1 font-mono text-[11px] text-[color:var(--ae-dim)]">{progress?.error}</div>
            <button
              className="mt-2 text-[11px] text-[color:var(--ae-azure-soft)] underline"
              onClick={() => window.aetherDesktop?.revealLogs?.()}
              type="button"
            >
              Mở log
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[.08em] text-[color:var(--ae-dim)]">
              <span>{progress?.message ?? 'Đang khởi động…'}</span>
              <b className="text-white">{pct}%</b>
            </div>
            <div className="ae-bar"><i style={{ width: `${pct}%` }} /></div>
          </>
        )}
      </div>
    </div>
  )
}

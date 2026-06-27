import { LivingOrb } from '@/aether/ui/orb/living-orb'

// Readiness placeholder while the runtime check resolves (configured === null).
export function PreparingView() {
  return (
    <div className="grid place-items-center gap-2 py-6 text-center" role="status">
      <LivingOrb label="Đang chuẩn bị" size={48} state="thinking" />
      <p className="text-[12.5px] text-[color:var(--ae-dim)]">Đang kiểm tra môi trường…</p>
    </div>
  )
}

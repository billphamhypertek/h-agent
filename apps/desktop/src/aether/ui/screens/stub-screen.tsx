// apps/desktop/src/aether/ui/screens/stub-screen.tsx
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function StubScreen({ title }: { title: string }) {
  return (
    <div className="ae-screen-bare grid h-full place-items-center">
      <GlassSlab className="text-center" size="lg">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">{title}</div>
        <div className="mt-2 text-sm text-[color:var(--ae-dim)]">Sắp ra mắt trong bản cập nhật AETHER tiếp theo.</div>
      </GlassSlab>
    </div>
  )
}

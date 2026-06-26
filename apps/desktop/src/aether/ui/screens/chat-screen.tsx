// apps/desktop/src/aether/ui/screens/chat-screen.tsx
import { useStore } from '@nanostores/react'

import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { $busy } from '@/store/session'

// Hosts the reused @assistant-ui chat runtime untouched; only the frame is AETHER.
export function ChatScreen({ chatView }: { chatView: React.ReactNode }) {
  const busy = useStore($busy)

  return (
    <div className="ae-screen relative flex h-full min-h-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">{chatView}</div>
      {busy && (
        <div className="pointer-events-none absolute bottom-24 left-6 z-[3] flex items-center gap-3">
          <LivingOrb label="Agent đang xử lý" size={42} />
          <span className="text-[11px] tracking-[.18em] text-[color:var(--ae-azure-soft)]">ĐANG XỬ LÝ…</span>
        </div>
      )}
    </div>
  )
}

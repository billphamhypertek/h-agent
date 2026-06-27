// src/aether/ui/screens/voice-screen.tsx
import { useStore } from '@nanostores/react'

import { $orbState } from '@/aether/domain/motion/motion-store'
import { $voiceActive, $voiceSession, toggleVoiceActive } from '@/aether/domain/voice/voice-presence'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { chatMessageText } from '@/lib/chat-messages'
import { $messages } from '@/store/session'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Sẵn sàng',
  listening: 'Đang nghe…',
  transcribing: 'Đang phiên âm…',
  thinking: 'Đang xử lý…',
  speaking: 'Đang trả lời…',
}

export function VoiceScreen() {
  const orbState = useStore($orbState)
  const session = useStore($voiceSession)
  const active = useStore($voiceActive)
  const messages = useStore($messages)

  const spoken = messages.filter(m => (m.role === 'user' || m.role === 'assistant') && !m.hidden)

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col items-center gap-4">
      <div className="mt-2 grid place-items-center">
        <LivingOrb size={220} state={orbState} label="Voice" />
        <div className="mt-3 text-[12px] uppercase tracking-[.18em] text-[color:var(--ae-azure-soft)]">
          {STATUS_LABEL[session.status] ?? STATUS_LABEL.idle}
        </div>
      </div>

      <GlassSlab className="flex min-h-0 w-full max-w-[680px] flex-1 flex-col gap-2 overflow-auto" size="md">
        {spoken.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-[12.5px] text-[color:var(--ae-dim)]" data-testid="ae-voice-empty">
            Chưa có hội thoại — nhấn <b className="mx-1 text-white">Nghe</b> để bắt đầu.
          </div>
        ) : (
          spoken.map(m => (
            <div className="text-[13px]" data-testid="ae-voice-line" key={m.id}>
              <span className="mr-2 text-[10.5px] font-semibold uppercase tracking-[.12em] text-[color:var(--ae-azure-soft)]">
                {m.role === 'user' ? 'Bạn' : 'Agent'}
              </span>
              <span className="text-white">{chatMessageText(m)}</span>
            </div>
          ))
        )}
      </GlassSlab>

      <div className="flex items-center gap-3 pb-2">
        <button
          className="rounded-[12px] border border-[rgba(120,200,255,.35)] p-[9px_22px] text-[13px] font-semibold text-white"
          data-testid="ae-voice-toggle"
          onClick={() => toggleVoiceActive()}
          type="button"
        >
          {active ? 'Dừng' : 'Nghe'}
        </button>
        <div className="h-[6px] w-[120px] overflow-hidden rounded-full bg-[rgba(120,200,255,.16)]" data-testid="ae-voice-level">
          <div className="h-full bg-[color:var(--ae-azure)]" style={{ width: `${Math.round(Math.min(1, session.level) * 100)}%` }} />
        </div>
        <a className="text-[11.5px] text-[color:var(--ae-dim)] underline" href="/settings?tab=config:voice">
          Settings → Voice
        </a>
      </div>
    </div>
  )
}

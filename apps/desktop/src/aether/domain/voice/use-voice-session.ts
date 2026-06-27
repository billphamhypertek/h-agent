import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { useVoiceConversation } from '@/app/chat/composer/hooks/use-voice-conversation'
import { chatMessageText } from '@/lib/chat-messages'
import { $busy, $messages } from '@/store/session'

import { $voiceActive, setVoiceActive, setVoiceListening, setVoiceSession } from './voice-presence'

// App-level voice controller: runs the existing hands-free loop against the
// active Chat session (reuse, not re-implementation). Side-effects only — the
// Voice screen reads $voiceSession/$voiceListening/$orbState and toggles
// $voiceActive. Mounted once in desktop-controller (primary window).
export function useVoiceSession(deps: {
  submitText: (text: string) => Promise<boolean> | void
  transcribeVoiceAudio: (audio: Blob) => Promise<string>
}) {
  const busy = useStore($busy)
  const active = useStore($voiceActive)
  const lastSpokenIdRef = useRef<string | null>(null)

  // Mirror composer/index.tsx: speak the latest unseen assistant message of the
  // active session; track what we've already spoken so we don't repeat.
  const pendingResponse = () => {
    const last = $messages.get().findLast(m => m.role === 'assistant' && !m.hidden)

    if (!last || last.id === lastSpokenIdRef.current) {return null}
    const text = chatMessageText(last).trim()

    if (!text) {return null}

    return { id: last.id, pending: Boolean(last.pending), text }
  }

  const consumePendingResponse = () => {
    const last = $messages.get().findLast(m => m.role === 'assistant' && !m.hidden)

    if (last) {lastSpokenIdRef.current = last.id}
  }

  const conversation = useVoiceConversation({
    busy,
    consumePendingResponse,
    enabled: active,
    onFatalError: () => setVoiceActive(false),
    onSubmit: async text => {
      await deps.submitText(text)
    },
    onTranscribeAudio: deps.transcribeVoiceAudio,
    pendingResponse,
  })

  // Publish loop state so the presentation screen can render mic level / status.
  useEffect(() => {
    setVoiceListening(conversation.status === 'listening')
    setVoiceSession({ status: conversation.status, level: conversation.level, muted: conversation.muted })
  }, [conversation.status, conversation.level, conversation.muted])

  // Toggling off ends the in-flight turn (mirror composer toggle).
  useEffect(() => {
    if (!active) {void conversation.end()}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}

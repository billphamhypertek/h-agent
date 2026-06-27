import { atom } from 'nanostores'

// Local voice presence: true while the hands-free mic is open (set by the
// voice loop in Slice 2). Read by the orb state machine — never re-triggers an
// LLM; this is a UI-only signal.
export const $voiceListening = atom(false)

export function setVoiceListening(listening: boolean) {
  $voiceListening.set(listening)
}

// Enable flag for the hands-free loop, toggled by the Voice screen's Nghe/Dừng.
export const $voiceActive = atom(false)

export function setVoiceActive(active: boolean) {
  $voiceActive.set(active)
}

export function toggleVoiceActive() {
  $voiceActive.set(!$voiceActive.get())
}

export type VoiceSessionStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

export interface VoiceSessionView {
  status: VoiceSessionStatus
  level: number
  muted: boolean
}

// Published by useVoiceSession so the presentation screen can read mic level /
// status / mute without owning the loop.
export const $voiceSession = atom<VoiceSessionView>({ status: 'idle', level: 0, muted: false })

export function setVoiceSession(view: VoiceSessionView) {
  $voiceSession.set(view)
}

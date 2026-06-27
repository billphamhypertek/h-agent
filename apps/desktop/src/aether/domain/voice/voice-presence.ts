import { atom } from 'nanostores'

// Local voice presence: true while the hands-free mic is open (set by the
// voice loop in Slice 2). Read by the orb state machine — never re-triggers an
// LLM; this is a UI-only signal.
export const $voiceListening = atom(false)

export function setVoiceListening(listening: boolean) {
  $voiceListening.set(listening)
}

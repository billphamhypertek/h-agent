import { atom, computed } from 'nanostores'

import { $voiceListening } from '@/aether/domain/voice/voice-presence'
import { $busy, $gatewayState } from '@/store/session'
import { $voicePlayback } from '@/store/voice-playback'

export type OrbState = 'speaking' | 'listening' | 'thinking' | 'idle' | 'paused'

// Priority (SP-3 spec §5.3): speaking > listening > thinking > idle > paused.
// `gatewayState` is the raw ConnectionState string ('open' ⇒ online; the coarse
// useConnectionStatus() maps 'open'→'online').
export function deriveOrbState(
  busy: boolean,
  gatewayState: string,
  speaking: boolean,
  listening: boolean,
): OrbState {
  if (speaking) return 'speaking'
  if (listening) return 'listening'
  if (busy) return 'thinking'
  if (gatewayState === 'open') return 'idle'
  return 'paused'
}

export const $orbState = computed(
  [$busy, $gatewayState, $voicePlayback, $voiceListening],
  (busy, gatewayState, playback, listening) =>
    deriveOrbState(busy, gatewayState, playback.status === 'speaking', listening),
)

// Set true once the Canvas mounts (gate passed); read by the CSS-fallback path.
export const $motionActive = atom(false)

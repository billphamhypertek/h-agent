import { atom, computed } from 'nanostores'
import { $busy, $gatewayState } from '@/store/session'

export type OrbState = 'thinking' | 'idle' | 'paused'

// Mapping table (spec §5). NOTE: the raw $gatewayState atom value is the ConnectionState
// string 'open' (the coarse useConnectionStatus() maps 'open'→'online'); derive from 'open'.
export function deriveOrbState(busy: boolean, gatewayState: string): OrbState {
  if (busy) return 'thinking'
  if (gatewayState === 'open') return 'idle'
  return 'paused'
}

export const $orbState = computed([$busy, $gatewayState], (busy, gatewayState) =>
  deriveOrbState(busy, gatewayState),
)

// Set true once the Canvas mounts (gate passed); read by the CSS-fallback path.
export const $motionActive = atom(false)

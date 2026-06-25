// apps/desktop/src/aether/domain/connection/use-connection-status.ts
import { useStore } from '@nanostores/react'

import { $gatewayState } from '@/store/session'

// Maps the live gateway connection state to a coarse UI status for the online dot
// + "paused" overlay. $gatewayState (apps/desktop/src/store/session.ts) holds the
// ConnectionState string published by useGatewayBoot via reportPrimaryGatewayState
// → setGatewayState: 'idle' | 'connecting' | 'open' | 'closed' | 'error'.
export function useConnectionStatus(): 'connecting' | 'online' | 'paused' {
  const state = useStore($gatewayState)

  if (state === 'open') {
    return 'online'
  }

  if (state === 'connecting' || state === 'idle') {
    return 'connecting'
  }

  return 'paused'
}

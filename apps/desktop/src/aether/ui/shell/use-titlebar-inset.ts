import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { GEOMETRY } from '@/aether/ui/theme/geometry'
import { $connection } from '@/store/session'

// Pure: mac-ness = windowButtonPosition != null (NOT IS_MAC). macOS fullscreen hides the traffic
// lights but keeps windowButtonPosition non-null, so fullscreen also collapses the inset to 0.
export function titlebarInsetPx(opts: {
  windowButtonPosition: { x: number; y: number } | null
  isFullscreen: boolean
}): number {
  return opts.windowButtonPosition != null && !opts.isFullscreen ? GEOMETRY.titlebarInset : 0
}

// Live inset. Re-derives on connection change AND on window state change (enter/exit fullscreen
// at runtime) — does not read one-shot from $connection only.
export function useTitlebarInset(): number {
  const connection = useStore($connection)
  const [fullscreenOverride, setFullscreenOverride] = useState<boolean | null>(null)

  useEffect(() => {
    const off = window.aetherDesktop?.onWindowStateChanged?.((payload) => {
      setFullscreenOverride(Boolean((payload as { isFullscreen?: boolean })?.isFullscreen))
    })

    return () => off?.()
  }, [])

  const windowButtonPosition = connection?.windowButtonPosition ?? null
  const isFullscreen = fullscreenOverride ?? Boolean(connection?.isFullscreen)

  return titlebarInsetPx({ windowButtonPosition, isFullscreen })
}

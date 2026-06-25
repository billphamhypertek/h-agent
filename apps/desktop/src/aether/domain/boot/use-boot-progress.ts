import { useEffect } from 'react'

import { $bootDone, $bootProgress, type DesktopBootProgress } from './boot-store'

function isComplete(p: DesktopBootProgress): boolean {
  return !p.error && (p.phase === 'backend.ready' || (p.progress >= 94 && !p.running))
}

export function useBootProgress(): void {
  useEffect(() => {
    const desktop = window.hermesDesktop

    if (!desktop) {return}
    let cancelled = false

    const apply = (p: DesktopBootProgress | null) => {
      if (cancelled || !p) {return}
      $bootProgress.set(p)

      if (isComplete(p)) {$bootDone.set(true)}
    }

    void desktop.getBootProgress().then(apply)
    const off = desktop.onBootProgress(apply)

    return () => {
      cancelled = true
      off?.()
    }
  }, [])
}

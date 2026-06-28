import { useEffect, useState } from 'react'

export interface MotionGateInputs {
  reducedMotion: boolean
  remoteDisplayReason: string | null
  webglOk: boolean
}

// Pure gate: ALL three layers must be green. Remote display disables the GPU
// (main.cjs app.disableHardwareAcceleration), so reduced-motion alone is insufficient.
export function computeMotionEnabled(i: MotionGateInputs): boolean {
  return !i.reducedMotion && i.remoteDisplayReason == null && i.webglOk
}

export function probeWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')

    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    const evaluate = async () => {
      const remoteDisplayReason = (await window.aetherDesktop?.getRemoteDisplayReason?.()) ?? null

      if (cancelled) {return}
      setEnabled(
        computeMotionEnabled({ reducedMotion: mq.matches, remoteDisplayReason, webglOk: probeWebGL() }),
      )
    }

    void evaluate()
    mq.addEventListener('change', evaluate)

    return () => {
      cancelled = true
      mq.removeEventListener('change', evaluate)
    }
  }, [])

  return enabled
}

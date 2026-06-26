import { describe, expect, it, vi } from 'vitest'

import { applyAetherDefaultOnce } from './apply-aether-default'

function makeStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    has: (k: string) => map.has(k)
  }
}

describe('applyAetherDefaultOnce', () => {
  it('first run paints AETHER + light, then records the one-shot key', () => {
    const storage = makeStorage()
    const setTheme = vi.fn()
    const setMode = vi.fn()

    applyAetherDefaultOnce({ themeName: 'github', setTheme, setMode, storage })

    expect(setTheme).toHaveBeenCalledWith('aether')
    expect(setMode).toHaveBeenCalledWith('light')
    expect(storage.has('aether-default-applied')).toBe(true)
  })

  it('does nothing on a later run (key already present) — user choice is preserved', () => {
    const storage = makeStorage({ 'aether-default-applied': '1' })
    const setTheme = vi.fn()
    const setMode = vi.fn()

    applyAetherDefaultOnce({ themeName: 'dracula', setTheme, setMode, storage })

    expect(setTheme).not.toHaveBeenCalled()
    expect(setMode).not.toHaveBeenCalled()
  })

  it('records the key even when the theme is already AETHER (no redundant repaint)', () => {
    const storage = makeStorage()
    const setTheme = vi.fn()
    const setMode = vi.fn()

    applyAetherDefaultOnce({ themeName: 'aether', setTheme, setMode, storage })

    expect(setTheme).not.toHaveBeenCalled()
    expect(setMode).not.toHaveBeenCalled()
    expect(storage.has('aether-default-applied')).toBe(true)
  })
})

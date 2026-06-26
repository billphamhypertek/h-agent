import type { ThemeMode } from '@/themes/context'

const KEY = 'aether-default-applied'

export interface ApplyAetherDefaultOpts {
  themeName: string
  setTheme: (name: string) => void
  setMode: (mode: ThemeMode) => void
  // Injected so the first-run paint is unit-testable; defaults to localStorage.
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

// First run only: paint AETHER + the default LIGHT mode ("Arctic Glass"), then
// record a one-shot key so a later explicit user theme/mode choice is never
// overridden. SP-2 flips this default from Dark to Light.
export function applyAetherDefaultOnce({ themeName, setTheme, setMode, storage }: ApplyAetherDefaultOpts): void {
  const store = storage ?? localStorage

  if (store.getItem(KEY)) { return }

  if (themeName !== 'aether') {
    setTheme('aether')
    setMode('light')
  }

  store.setItem(KEY, '1')
}

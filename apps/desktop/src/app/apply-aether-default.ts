import type { ThemeMode } from '@/themes/context'

// Bumped from the original 'aether-default-applied' marker so the Light default
// re-applies exactly ONCE to existing users. The previous logic only set Light
// when the theme wasn't already 'aether' — but after the rebrand 'aether' is the
// theme for everyone, so the Light flip never actually ran for any real user.
// Carrying a new key lets that one-time flip reach users who already hold the old
// marker, without re-overriding a choice they make afterwards.
const KEY = 'aether-default-light-applied'

export interface ApplyAetherDefaultOpts {
  themeName: string
  setTheme: (name: string) => void
  setMode: (mode: ThemeMode) => void
  // Injected so the first-run paint is unit-testable; defaults to localStorage.
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

// One-shot: paint AETHER + the default LIGHT mode ("Arctic Glass"), then record a
// key so a later explicit user theme/mode choice is never overridden. Unlike the
// original, this sets Light even when the theme is already 'aether' (the common
// case) — that's the whole point of a Light default. The recorded key makes it a
// single override: run it once, then respect whatever the user picks next.
export function applyAetherDefaultOnce({ themeName, setTheme, setMode, storage }: ApplyAetherDefaultOpts): void {
  const store = storage ?? localStorage

  if (store.getItem(KEY)) { return }

  if (themeName !== 'aether') {
    setTheme('aether')
  }
  setMode('light')

  store.setItem(KEY, '1')
}

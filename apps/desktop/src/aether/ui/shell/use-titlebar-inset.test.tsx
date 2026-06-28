import { describe, expect, it } from 'vitest'

import { titlebarInsetPx } from './use-titlebar-inset'

describe('titlebarInsetPx (traffic-light regression)', () => {
  it('is 34 on macOS windowed (windowButtonPosition non-null, not fullscreen)', () => {
    expect(titlebarInsetPx({ windowButtonPosition: { x: 24, y: 12 }, isFullscreen: false })).toBe(34)
  })
  it('is 0 on Windows/Linux (windowButtonPosition null)', () => {
    expect(titlebarInsetPx({ windowButtonPosition: null, isFullscreen: false })).toBe(0)
  })
  it('is 0 when macOS fullscreen even though windowButtonPosition stays non-null', () => {
    expect(titlebarInsetPx({ windowButtonPosition: { x: 24, y: 12 }, isFullscreen: true })).toBe(0)
  })
})

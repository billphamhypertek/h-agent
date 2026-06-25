import { describe, expect, it } from 'vitest'

import { BUILTIN_THEMES } from '@/themes/presets'

import { AETHER } from './tokens'

describe('AETHER palette tokens', () => {
  it('uses HyperTek navy #07397d as the brand core', () => {
    expect(AETHER.navy).toBe('#07397d')
  })
  it('exposes azure glow + semantic colors verbatim from the spec', () => {
    expect(AETHER.azure).toBe('#4aa3ff')
    expect(AETHER.azureSoft).toBe('#8fc0ff')
    expect(AETHER.azureBright).toBe('#1659b5')
    expect(AETHER.ok).toBe('#3DE7A0')
    expect(AETHER.warn).toBe('#FFB020')
    expect(AETHER.error).toBe('#ff5d6c')
  })
})

describe('aether theme preset', () => {
  it('is registered and primary is navy in both light and dark', () => {
    const t = BUILTIN_THEMES.aether
    expect(t).toBeTruthy()
    expect(t.colors.primary).toBe('#07397d')
    expect(t.darkColors?.primary).toBe('#07397d')
  })
  it('ships a dark "Spatial Depth" palette and a Google fonts url', () => {
    expect(BUILTIN_THEMES.aether.darkColors?.background).toBe('#020c1d')
    expect(BUILTIN_THEMES.aether.typography?.fontUrl).toMatch(/Orbitron/)
    expect(BUILTIN_THEMES.aether.typography?.fontUrl).toMatch(/Be\+Vietnam\+Pro/)
  })
})

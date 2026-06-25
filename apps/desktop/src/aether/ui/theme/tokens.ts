// Single JS source of truth for the AETHER palette. CSS mirrors these in aether.css.
export const AETHER = {
  // brand core
  navy: '#07397d',
  // dark "Spatial Depth" surfaces
  bg950: '#020c1d',
  bg900: '#03152f',
  panel: '#082046',
  panelHi: '#0a2a5c',
  // holographic glow accents
  azure: '#4aa3ff',
  azureSoft: '#8fc0ff',
  azureBright: '#1659b5',
  // text
  ink: '#e9f1ff',
  dim: '#9fb6d6',
  hairline: 'rgba(120,180,255,.16)',
  // light "Arctic Glass"
  lightInk: '#0c2444',
  lightAccent: '#1659b5',
  // semantic
  ok: '#3DE7A0',
  warn: '#FFB020',
  error: '#ff5d6c',
} as const

export type AetherPalette = typeof AETHER

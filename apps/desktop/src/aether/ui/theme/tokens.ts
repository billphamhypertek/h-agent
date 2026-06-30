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
  // energy accent — "đang làm" state; semantically separate from `warn`
  energy: '#ff9e2c',
  // shared node/agent/vital states
  stateOnline: '#4aa3ff',
  stateBusy: '#ff9e2c',
  stateDormant: '#6f86ad',
  // sinh-thể (living engine) — particle nucleus / halo / sub-orb
  particle: '#bfe3ff',
  suborb: '#2fd6b6',
  halo: 'rgba(74,163,255,.35)',
} as const

export type AetherPalette = typeof AETHER

// Typography scale — kills literal text-[17px]/tracking-[.01em] across the shell.
// Sizes in px, tracking in em, leading unitless. CSS mirrors in aether.css.
// Bumped one notch up (base 13→14, md 15→16, lg 17→19, xl 22→24) so the desktop
// chrome reads larger/heavier — the "chữ to hơn + đậm hơn" feedback.
export const AETHER_TYPE = {
  text: { xs: 11, sm: 12, base: 14, md: 16, lg: 19, xl: 24 },
  tracking: { tight: 0.01, wide: 0.04, wider: 0.16, widest: 0.2 },
  leading: { tight: 1.2, snug: 1.35, normal: 1.5 },
} as const

// 6-verb lifecycle motion — durations in ms (used by the engine timeline) + a
// shared easing string. CSS mirrors as seconds in aether.css.
export const AETHER_MOTION = {
  breatheMs: 6000,
  reachMs: 900,
  mitosisMs: 1200,
  flowMs: 1400,
  inhaleMs: 1000,
  crystallizeMs: 700,
  ease: 'cubic-bezier(0.5,0.05,0.1,1)',
} as const

export type AetherType = typeof AETHER_TYPE
export type AetherMotion = typeof AETHER_MOTION

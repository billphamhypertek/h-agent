// Numeric source of truth for AETHER geometry. CSS --ae-* vars in aether.css mirror these;
// geometry.test.ts pins CSS == TS. Hardcoded constants (NOT getComputedStyle — jsdom is empty
// and --ae-* is skin-gated). Cross-source values are bridge-pinned to their owners.
import { TITLEBAR_HEIGHT } from '@/app/shell/titlebar'

export const GEOMETRY = {
  // bridge: titlebar.ts owns this number
  titlebarInset: TITLEBAR_HEIGHT, // 34
  // bridge: main.cjs owns the rail width (62)
  nav: { width: 62, item: 38, gap: 5 },
} as const

export type Geometry = typeof GEOMETRY

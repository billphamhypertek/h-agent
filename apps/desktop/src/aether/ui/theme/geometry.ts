// Numeric source of truth for AETHER geometry. CSS --ae-* vars in aether.css mirror these;
// geometry.test.ts pins CSS == TS. Hardcoded constants (NOT getComputedStyle — jsdom is empty
// and --ae-* is skin-gated). Cross-source values are bridge-pinned to their owners.
import { TITLEBAR_HEIGHT } from '@/app/shell/titlebar'

export const GEOMETRY = {
  // bridge: titlebar.ts owns this number
  titlebarInset: TITLEBAR_HEIGHT, // 34
  // bridge: main.cjs owns the collapsed rail width (62); 172 is the hover-expanded width
  nav: { width: 62, widthExpanded: 172, item: 38, gap: 5 },
  radius: { xs: 6, sm: 9, md: 11, lg: 14 },
  space: { 1: 4, 2: 6, 3: 8, 4: 11, 5: 13, 6: 18 },
  gap: { col: 13, grid: 18 },
  avatar: 34,
  control: 38,
  orb: { sm: 42, md: 170, lg: 300 },
  page: { x: 22, t: 16, b: 18 },
} as const

export type Geometry = typeof GEOMETRY

import { describe, expect, it } from 'vitest'

import { TITLEBAR_HEIGHT } from '@/app/shell/titlebar'

import { GEOMETRY } from './geometry'

describe('geometry source of truth', () => {
  it('pins the titlebar inset to titlebar.ts TITLEBAR_HEIGHT (bridge)', () => {
    expect(GEOMETRY.titlebarInset).toBe(TITLEBAR_HEIGHT)
    expect(GEOMETRY.titlebarInset).toBe(34)
  })
  it('exposes nav geometry as the single numeric source', () => {
    expect(GEOMETRY.nav).toEqual({ width: 62, widthExpanded: 172, item: 38, gap: 5 })
  })
  it('exposes the expanded nav-rail width (62 collapsed ↔ 172 expanded)', () => {
    expect(GEOMETRY.nav.width).toBe(62)
    expect(GEOMETRY.nav.widthExpanded).toBe(172)
  })
})

describe('geometry token scale', () => {
  it('splits column gap (13) from grid gap (18) — not merged', () => {
    expect(GEOMETRY.gap.col).toBe(13)
    expect(GEOMETRY.gap.grid).toBe(18)
    expect(GEOMETRY.gap.col).not.toBe(GEOMETRY.gap.grid)
  })
  it('exposes radius, orb, avatar/control, and page gutter groups', () => {
    expect(GEOMETRY.radius).toEqual({ xs: 6, sm: 9, md: 11, lg: 14 })
    expect(GEOMETRY.orb).toEqual({ sm: 42, md: 170, lg: 300 })
    expect(GEOMETRY.avatar).toBe(34)
    expect(GEOMETRY.control).toBe(38)
    expect(GEOMETRY.page).toEqual({ x: 22, t: 16, b: 18 })
  })
})

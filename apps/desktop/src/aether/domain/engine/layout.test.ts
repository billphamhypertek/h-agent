import { describe, expect, it } from 'vitest'

import { constellationLayout, summonLayout } from './layout'

describe('constellationLayout', () => {
  it('returns [] for non-positive counts', () => {
    expect(constellationLayout(0)).toEqual([])
    expect(constellationLayout(-3)).toEqual([])
  })
  it('places `count` points on the circle of the given radius', () => {
    const pts = constellationLayout(5, 2)
    expect(pts).toHaveLength(5)

    for (const p of pts) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(2, 5)
    }
  })
  it('starts at the top (−π/2) and is deterministic', () => {
    const [first] = constellationLayout(4, 1)
    expect(first.x).toBeCloseTo(0, 5)
    expect(first.y).toBeCloseTo(-1, 5)
    expect(constellationLayout(4, 1)).toEqual(constellationLayout(4, 1))
  })
  it('produces distinct points (no overlap)', () => {
    const keys = constellationLayout(8, 1).map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`)
    expect(new Set(keys).size).toBe(8)
  })
})

describe('summonLayout', () => {
  it('defaults to a tighter ring than the constellation', () => {
    const pts = summonLayout(3)
    expect(Math.hypot(pts[0].x, pts[0].y)).toBeCloseTo(0.6, 5)
  })
})

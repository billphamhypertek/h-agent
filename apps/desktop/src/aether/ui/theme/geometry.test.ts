import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './geometry'
import { TITLEBAR_HEIGHT } from '@/app/shell/titlebar'

describe('geometry source of truth', () => {
  it('pins the titlebar inset to titlebar.ts TITLEBAR_HEIGHT (bridge)', () => {
    expect(GEOMETRY.titlebarInset).toBe(TITLEBAR_HEIGHT)
    expect(GEOMETRY.titlebarInset).toBe(34)
  })
  it('exposes nav geometry as the single numeric source', () => {
    expect(GEOMETRY.nav).toEqual({ width: 62, item: 38, gap: 5 })
  })
})

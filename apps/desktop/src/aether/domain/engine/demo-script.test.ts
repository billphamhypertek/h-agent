import { describe, expect, it } from 'vitest'

import { HSG_TARGETS, hsgFrame, hsgStandbyGraph, phaseAt } from './demo-script'

describe('HSG demo script', () => {
  it('progresses through the 6 verbs at the scripted timestamps', () => {
    expect(phaseAt(0)).toBe('breathe')
    expect(phaseAt(1500)).toBe('reach')
    expect(phaseAt(3000)).toBe('mitosis')
    expect(phaseAt(4500)).toBe('flow')
    expect(phaseAt(7000)).toBe('inhale')
    expect(phaseAt(8500)).toBe('crystallize')
  })
  it('builds a standby constellation: 1 core orb + N nodes + N links', () => {
    const g = hsgStandbyGraph()
    expect(g.orbs).toHaveLength(1)
    expect(g.orbs[0].kind).toBe('core')
    expect(g.nodes).toHaveLength(HSG_TARGETS.length)
    expect(g.links).toHaveLength(HSG_TARGETS.length)
    expect(g.nodes.map(n => n.label)).toEqual(HSG_TARGETS)
  })
  it('hsgFrame stamps the standby graph with the time-derived phase', () => {
    expect(hsgFrame(0).phase).toBe('breathe')
    expect(hsgFrame(4500).phase).toBe('flow')
  })
})

import { describe, expect, it } from 'vitest'

import { AETHER_NAV_GROUPS, AETHER_NAV_ITEMS } from './nav-items'

describe('AETHER nav model', () => {
  it('declares the 5 spec groups in order', () => {
    expect(AETHER_NAV_GROUPS.map(g => g.id)).toEqual(['core', 'pillars', 'agentsys', 'channels', 'system'])
  })
  it('covers all 16 §5.1 destinations, each mapped to a known group', () => {
    expect(AETHER_NAV_ITEMS).toHaveLength(16)
    const groupIds = new Set(AETHER_NAV_GROUPS.map(g => g.id))

    for (const item of AETHER_NAV_ITEMS) {expect(groupIds.has(item.group)).toBe(true)}
    expect(AETHER_NAV_ITEMS.filter(i => i.group === 'core').map(i => i.id)).toEqual(['home', 'chat', 'brief'])
    expect(AETHER_NAV_ITEMS.filter(i => i.group === 'system').map(i => i.id)).toEqual(['profiles', 'settings'])
  })
  it('routes are unique', () => {
    const routes = AETHER_NAV_ITEMS.map(i => i.route)
    expect(new Set(routes).size).toBe(routes.length)
  })
  it('never translates "Agent" to "Đại lý"', () => {
    const labels = AETHER_NAV_ITEMS.map(i => i.label).join(' ')
    expect(labels).not.toMatch(/Đại lý/i)
    expect(AETHER_NAV_ITEMS.some(i => /Agent/.test(i.label))).toBe(true)
  })
})

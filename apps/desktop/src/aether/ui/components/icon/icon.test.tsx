import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AETHER_ICONS, Icon, type IconName } from './icon'

afterEach(cleanup)

const ALL: IconName[] = [
  'home', 'chat', 'brief', 'dev', 'inbox', 'content', 'ops', 'agents',
  'skills', 'memory', 'cron', 'messaging', 'artifacts', 'voice', 'profiles', 'settings',
]

describe('Icon set', () => {
  it('covers all 16 nav destinations with a non-empty path', () => {
    for (const name of ALL) {
      expect(typeof AETHER_ICONS[name]).toBe('string')
      expect(AETHER_ICONS[name].length).toBeGreaterThan(0)
    }

    expect(Object.keys(AETHER_ICONS)).toHaveLength(16)
  })
  it('renders an svg whose stroke inherits currentColor (token-driven)', () => {
    const { container } = render(<Icon name="home" />)
    const path = container.querySelector('path')
    expect(container.querySelector('svg')).toBeTruthy()
    expect(path?.getAttribute('stroke')).toBe('currentColor')
  })
})

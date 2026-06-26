import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GlassSlab } from './glass-slab'

afterEach(cleanup)

describe('GlassSlab size prop bakes padding', () => {
  it('defaults to md and sets the --ae-slab-pad var', () => {
    const { container } = render(<GlassSlab>x</GlassSlab>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('ae-slab')
    expect(el.style.getPropertyValue('--ae-slab-pad')).toBe('var(--ae-slab-pad-md)')
  })
  it('uses the requested size token', () => {
    const { container } = render(<GlassSlab size="sm">x</GlassSlab>)
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--ae-slab-pad')).toBe('var(--ae-slab-pad-sm)')
  })
})

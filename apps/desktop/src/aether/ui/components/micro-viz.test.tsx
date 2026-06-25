// apps/desktop/src/aether/ui/components/micro-viz.test.tsx
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Bar } from './micro-viz'

afterEach(cleanup)

describe('Bar', () => {
  it('clamps the fill width to 0-100%', () => {
    const { container, rerender } = render(<Bar value={150} />)
    expect((container.querySelector('.ae-bar > i') as HTMLElement).style.width).toBe('100%')
    rerender(<Bar value={-10} />)
    expect((container.querySelector('.ae-bar > i') as HTMLElement).style.width).toBe('0%')
  })
  it('adds the warn modifier when warn is set', () => {
    const { container } = render(<Bar value={82} warn />)
    expect(container.querySelector('.ae-bar')!.className).toContain('warn')
  })
})

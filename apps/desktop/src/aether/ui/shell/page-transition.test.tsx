import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PageTransition } from './page-transition'

afterEach(cleanup)

describe('PageTransition', () => {
  it('replays the depth-enter animation per route key and tags the variant', () => {
    const { rerender, container } = render(
      <PageTransition routeKey="/a"><div data-testid="c">A</div></PageTransition>,
    )

    const first = container.querySelector('[data-ae-transition]') as HTMLElement
    expect(first).toBeTruthy()
    expect(first.className).toContain('ae-depth-enter')
    rerender(<PageTransition routeKey="/b"><div data-testid="c">B</div></PageTransition>)
    expect(screen.getByTestId('c').textContent).toBe('B')
  })
})

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Intro } from './intro'

afterEach(cleanup)

describe('Intro (Light AETHER)', () => {
  it('shows the AETHER wordmark', () => {
    render(<Intro />)
    expect(screen.getAllByLabelText(/AETHER AGENT/).length).toBeGreaterThan(0)
  })
  it('renders a Vietnamese start prompt', () => {
    render(<Intro />)
    expect(screen.getByText(/Bắt đầu trò chuyện/)).toBeTruthy()
  })
})

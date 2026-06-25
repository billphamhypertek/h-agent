// apps/desktop/src/aether/ui/screens/chat-screen.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $busy } from '@/store/session'

import { ChatScreen } from './chat-screen'

beforeEach(() => $busy.set(false))
afterEach(cleanup)

describe('ChatScreen', () => {
  it('renders the injected chat element', () => {
    render(<ChatScreen chatView={<div data-testid="chat-runtime">runtime</div>} />)
    expect(screen.getByTestId('chat-runtime')).toBeTruthy()
  })
  it('shows the thinking orb only while busy', () => {
    const { rerender } = render(<ChatScreen chatView={<div />} />)
    expect(screen.queryByLabelText('Agent đang xử lý')).toBeNull()
    $busy.set(true)
    rerender(<ChatScreen chatView={<div />} />)
    expect(screen.getByLabelText('Agent đang xử lý')).toBeTruthy()
  })
})

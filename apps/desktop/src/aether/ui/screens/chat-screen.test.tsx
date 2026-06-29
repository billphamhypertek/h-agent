// apps/desktop/src/aether/ui/screens/chat-screen.test.tsx
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeReader, openReader } from '@/aether/domain/chat/reader-store'
import { $graphSpec, clearGraphSpec } from '@/aether/domain/motion/graph-store'
import { $busy } from '@/store/session'

import { ChatScreen } from './chat-screen'

beforeEach(() => {
  // jsdom has no matchMedia; ChatScreen's useMotionEnabled() probes prefers-reduced-motion.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  $busy.set(false); clearGraphSpec(); closeReader()
})
afterEach(cleanup)

describe('ChatScreen', () => {
  it('renders the injected chat element (the thread column)', () => {
    render(<ChatScreen chatView={<div data-testid="chat-runtime">runtime</div>} />)
    expect(screen.getByTestId('chat-runtime')).toBeTruthy()
  })
  it('no longer shows the old LivingOrb busy-badge while busy', () => {
    render(<ChatScreen chatView={<div />} />)
    $busy.set(true)
    expect(screen.queryByLabelText('Agent đang xử lý')).toBeNull()
  })
  it('mounts the reader panel when $readerPanel is open', () => {
    render(<ChatScreen chatView={<div />} />)
    act(() => openReader({ fileName: 'README.md', content: '# T' }))
    expect(screen.getByTestId('ae-reader-panel')).toBeTruthy()
  })
  it('clears $graphSpec on unmount (does not leave a stale dock on the HUD canvas)', () => {
    const { unmount } = render(<ChatScreen chatView={<div />} />)
    expect($graphSpec.get()).not.toBeNull()
    unmount()
    expect($graphSpec.get()).toBeNull()
  })
})

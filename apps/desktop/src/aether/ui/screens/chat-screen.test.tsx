// apps/desktop/src/aether/ui/screens/chat-screen.test.tsx
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeReader, openReader } from '@/aether/domain/chat/reader-store'
import { createGraph } from '@/aether/domain/engine/graph-model'
import { $graphSpec, clearGraphSpec, setGraphSpec } from '@/aether/domain/motion/graph-store'
import { $busy } from '@/store/session'

import { ChatScreen } from './chat-screen'

// ChatScreen mounts the History rail, which navigates via react-router — so every
// render needs a Router context.
function renderChat(chatView: ReactNode) {
  return render(<MemoryRouter><ChatScreen chatView={chatView} /></MemoryRouter>)
}

beforeEach(() => {
  // jsdom has no matchMedia; some descendants probe prefers-reduced-motion.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  $busy.set(false); clearGraphSpec(); closeReader()
})
afterEach(cleanup)

describe('ChatScreen', () => {
  it('renders the injected chat element (the thread column)', () => {
    renderChat(<div data-testid="chat-runtime">runtime</div>)
    expect(screen.getByTestId('chat-runtime')).toBeTruthy()
  })
  it('mounts the history rail beside the conversation', () => {
    renderChat(<div />)
    expect(screen.getByTestId('ae-history-rail')).toBeTruthy()
  })
  it('no longer mounts a right-side companion / living-orb pane', () => {
    renderChat(<div />)
    expect(screen.queryByTestId('ae-companion')).toBeNull()
    expect(screen.queryByLabelText('Agent đang xử lý')).toBeNull()
  })
  it('mounts the reader panel when $readerPanel is open, and steps the rail aside', () => {
    renderChat(<div />)
    act(() => openReader({ fileName: 'README.md', content: '# T' }))
    expect(screen.getByTestId('ae-reader-panel')).toBeTruthy()
    expect(screen.queryByTestId('ae-history-rail')).toBeNull()
  })
  it('keeps the shared engine canvas clear on Chat (no scattered GL graph)', () => {
    setGraphSpec(createGraph({ nodes: [{ id: 'tool:x', label: 'X', state: 'busy', x: 0.2, y: 0 }] }))
    const { unmount } = renderChat(<div />)
    expect($graphSpec.get()).toBeNull() // cleared on mount
    unmount()
    expect($graphSpec.get()).toBeNull()
  })
})

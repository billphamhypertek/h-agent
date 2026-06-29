// apps/desktop/src/aether/ui/screens/chat/reader-panel.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $readerPanel, closeReader, openReader } from '@/aether/domain/chat/reader-store'

import { ReaderPanel } from './reader-panel'

beforeEach(() => closeReader())
afterEach(cleanup)

describe('ReaderPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ReaderPanel />)
    expect(container.firstChild).toBeNull()
  })
  it('shows the file name + a format badge when open', () => {
    openReader({ fileName: 'README.md', content: '# Hello' })
    render(<ReaderPanel />)
    expect(screen.getByText('README.md')).toBeTruthy()
    expect(screen.getByText('MD')).toBeTruthy()
  })
  it('the ✕ button closes the panel', () => {
    openReader({ fileName: 'README.md', content: '# Hello' })
    render(<ReaderPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Đóng/ }))
    expect($readerPanel.get().open).toBe(false)
  })
})

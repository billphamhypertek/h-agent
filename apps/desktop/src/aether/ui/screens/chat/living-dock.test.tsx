import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { openReaderFromMessages } from '@/aether/domain/chat/reader-store'
import { createGraph } from '@/aether/domain/engine/graph-model'
import { $turnActivity, EMPTY_TURN } from '@/aether/domain/session/turn-activity'

import { dockNodePct, LivingDock } from './living-dock'

vi.mock('@/aether/domain/chat/reader-store', () => ({ openReaderFromMessages: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  $turnActivity.set(EMPTY_TURN)
})
afterEach(cleanup)

describe('dockNodePct', () => {
  it('maps model space [-1,1] into 0..100 around center 50', () => {
    expect(dockNodePct(0)).toBe(50)
    expect(dockNodePct(1)).toBe(88)
  })
})

describe('LivingDock', () => {
  const spec = createGraph({ nodes: [{ id: 'tool:tc1', label: 'Read File', state: 'busy', x: 0.8, y: 0 }] })

  it('renders the footer counts (N tool · M sub-agent)', () => {
    $turnActivity.set({ ...EMPTY_TURN, tools: [{ id: 'tc1', name: 'read_file', label: 'Read File', status: 'running' }] })
    render(<LivingDock onToggle={() => {}} slim={false} spec={spec} />)
    expect(screen.getByText(/1 tool/)).toBeTruthy()
  })
  it('a tool bud is a focusable button labelled in Vietnamese', () => {
    render(<LivingDock onToggle={() => {}} slim={false} spec={spec} />)
    expect(screen.getByRole('button', { name: /Read File/ })).toBeTruthy()
  })
  it('clicking a read_file bud opens the reader from $messages', () => {
    $turnActivity.set({ ...EMPTY_TURN, tools: [{ id: 'tc1', name: 'read_file', label: 'Read File', status: 'ok', filePath: 'A.md' }] })
    render(<LivingDock onToggle={() => {}} slim={false} spec={spec} />)
    fireEvent.click(screen.getByRole('button', { name: /Read File/ }))
    expect(openReaderFromMessages).toHaveBeenCalledWith('tc1')
  })
  it('skips a hit-target for an exit ghost', () => {
    const ghost = createGraph({ nodes: [{ id: 'tool:g', label: 'Gone', exit: true, state: 'dormant', x: 0.8, y: 0.2 }] })
    render(<LivingDock onToggle={() => {}} slim={false} spec={ghost} />)
    expect(screen.queryByRole('button', { name: /Gone/ })).toBeNull()
  })
  it('slim mode renders the expand control', () => {
    render(<LivingDock onToggle={() => {}} slim spec={spec} />)
    expect(screen.getByRole('button', { name: /Mở rộng/ })).toBeTruthy()
  })
})

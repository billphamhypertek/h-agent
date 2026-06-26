import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $computerUse, $computerUseStatus, $toolsets, $toolsetsStatus } from '@/aether/domain/settings/toolsets-store'

import { ToolsTab } from './tools-tab'

beforeEach(() => {
  $toolsetsStatus.set('ready')
  $toolsets.set([{ name: 'web', label: 'Web', description: 'Tìm kiếm web', enabled: false, configured: true, tools: ['search'] }])
  $computerUseStatus.set('ready')
  $computerUse.set({ platform: 'darwin', installed: true, ready: false, can_grant: true, checks: [], platform_supported: true, version: null, accessibility: false, screen_recording: false, screen_recording_capturable: true, source: null, error: null } as never)
})
afterEach(cleanup)

describe('ToolsTab', () => {
  it('lists toolsets with their label', () => {
    render(<ToolsTab />)
    expect(screen.getByText('Web')).toBeTruthy()
  })

  it('toggles a toolset', () => {
    const onToggle = vi.fn()
    render(<ToolsTab onToggle={onToggle} />)
    fireEvent.click(screen.getByTestId('ae-toolset-web'))
    expect(onToggle).toHaveBeenCalledWith('web', true)
  })

  it('shows a grant button when computer-use can_grant and not ready', () => {
    render(<ToolsTab />)
    expect(screen.getByRole('button', { name: /Cấp quyền/ })).toBeTruthy()
  })
})

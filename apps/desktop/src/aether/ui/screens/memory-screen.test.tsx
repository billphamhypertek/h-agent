import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryProviderConfig } from '@/aether-api'
import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryOAuth,
  $memoryProvider,
  type MemoryStatus
} from '@/aether/domain/memory/memory-store'
import * as store from '@/aether/domain/memory/memory-store'

import { MemoryScreen } from './memory-screen'

const STATUS: MemoryStatus = {
  active: 'mem0',
  providers: [
    { name: 'mem0', description: 'Mem0 hosted memory', configured: true },
    { name: 'zep', description: 'Zep memory', configured: false }
  ],
  builtin_files: { memory: 3, user: 1 }
}

const CONFIG: MemoryProviderConfig = {
  name: 'mem0',
  label: 'Mem0',
  fields: [
    {
      key: 'MEM0_API_KEY',
      label: 'API Key',
      description: 'Mem0 key',
      kind: 'secret',
      is_set: false,
      placeholder: 'mem0-...',
      options: [],
      value: ''
    }
  ]
}

// The OAuth probe effect runs on every mount and hits the real REST fn, which
// has no aetherDesktop bridge under jsdom. No-op it file-wide so it never
// throws an unhandled rejection or clobbers a pre-set $memoryOAuth fixture.
beforeEach(() => {
  vi.spyOn(store, 'loadMemoryOAuthStatus').mockResolvedValue()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $memoryOAuth.set(null)
})

describe('MemoryScreen — ready', () => {
  beforeEach(() => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(CONFIG)
    $memoryConfigStatus.set('ready')
  })

  it('renders the provider selector with every provider option', () => {
    render(<MemoryScreen />)
    const selector = screen.getByTestId('ae-memory-provider-select') as HTMLSelectElement
    expect(selector).toBeTruthy()
    const values = Array.from(selector.options).map(o => o.value)
    expect(values).toContain('mem0')
    expect(values).toContain('zep')
  })

  it('renders config fields by kind', () => {
    render(<MemoryScreen />)
    const field = screen.getByTestId('ae-memory-field-MEM0_API_KEY') as HTMLInputElement
    expect(field.type).toBe('password')
  })

  it('shows the read-only built-in file counts', () => {
    render(<MemoryScreen />)
    expect(screen.getByTestId('ae-memory-builtin')).toBeTruthy()
  })
})

describe('MemoryScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $memoryEntriesStatus.set('loading')
    render(<MemoryScreen />)
    expect(screen.getByTestId('ae-memory-skeleton')).toBeTruthy()
  })

  it('renders a Vietnamese empty state', () => {
    $memoryEntriesStatus.set('empty')
    render(<MemoryScreen />)
    expect(screen.getByText(/Chưa có/i)).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $memoryEntriesStatus.set('error')
    render(<MemoryScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('MemoryScreen — interactions', () => {
  beforeEach(() => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(CONFIG)
    $memoryConfigStatus.set('ready')
  })

  it('switches provider on select change', () => {
    const spy = vi.spyOn(store, 'switchMemoryProvider').mockResolvedValue()
    render(<MemoryScreen />)
    fireEvent.change(screen.getByTestId('ae-memory-provider-select'), { target: { value: 'zep' } })
    expect(spy).toHaveBeenCalledWith('zep')
    spy.mockRestore()
  })

  it('saves config field values on Save', () => {
    const spy = vi.spyOn(store, 'saveMemoryConfig').mockResolvedValue()
    render(<MemoryScreen />)
    fireEvent.change(screen.getByTestId('ae-memory-field-MEM0_API_KEY'), { target: { value: 'mem0-xyz' } })
    fireEvent.click(screen.getByTestId('ae-memory-save'))
    expect(spy).toHaveBeenCalledWith('mem0', { MEM0_API_KEY: 'mem0-xyz' })
    spy.mockRestore()
  })

  it('resets only after confirm', () => {
    const spy = vi.spyOn(store, 'resetMemory').mockResolvedValue()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryScreen />)
    fireEvent.click(screen.getByTestId('ae-memory-reset'))
    expect(spy).toHaveBeenCalledWith('all')
    confirmSpy.mockRestore()
    spy.mockRestore()
  })
})

describe('MemoryScreen — oauth panel', () => {
  beforeEach(() => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(CONFIG)
    $memoryConfigStatus.set('ready')
  })

  it('renders the OAuth panel only for oauth-typed providers', () => {
    $memoryOAuth.set({ auth: 'oauth', connected: false, detail: 'Chưa kết nối', state: 'idle' })
    render(<MemoryScreen />)
    expect(screen.getByText(/KẾT NỐI OAUTH/i)).toBeTruthy()
    expect(screen.getByTestId('ae-memory-oauth-start')).toBeTruthy()
  })

  it('hides the OAuth panel for apikey providers', () => {
    $memoryOAuth.set({ auth: 'apikey', connected: false, detail: '', state: 'idle' })
    render(<MemoryScreen />)
    expect(screen.queryByText(/KẾT NỐI OAUTH/i)).toBeNull()
  })

  it('starts OAuth on click', () => {
    $memoryOAuth.set({ auth: 'oauth', connected: false, detail: 'Chưa kết nối', state: 'idle' })
    const spy = vi.spyOn(store, 'startMemoryOAuth').mockResolvedValue()
    render(<MemoryScreen />)
    fireEvent.click(screen.getByTestId('ae-memory-oauth-start'))
    expect(spy).toHaveBeenCalledWith('mem0')
    spy.mockRestore()
  })
})

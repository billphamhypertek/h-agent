import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as store from '@/aether/domain/profiles/profiles-store'
import { $activeProfile, $profiles, $profileSoul, $profileSoulStatus, $profilesStatus } from '@/aether/domain/profiles/profiles-store'
import type { ProfileInfo } from '@/types/aether'

import { ProfilesScreen } from './profiles-screen'

const ROWS: ProfileInfo[] = [
  { name: 'default', path: '/h/default', is_default: true, has_env: true, model: 'sonnet', provider: 'anthropic', skill_count: 3 },
  { name: 'coder', path: '/h/coder', is_default: false, has_env: false, model: null, provider: null, skill_count: 0 }
]

beforeEach(() => {
  $profiles.set(ROWS)
  $profilesStatus.set('ready')
  $activeProfile.set('coder')
})
afterEach(cleanup)

describe('ProfilesScreen', () => {
  it('renders one card per profile', () => {
    render(<ProfilesScreen />)
    expect(screen.getAllByTestId('ae-profile-row')).toHaveLength(2)
    expect(screen.getByText('default')).toBeTruthy()
    expect(screen.getByText('coder')).toBeTruthy()
  })

  it('marks the active profile', () => {
    render(<ProfilesScreen />)
    const active = screen.getByTestId('ae-profile-row-coder')
    expect(active.getAttribute('data-active')).toBe('true')
    expect(screen.getByTestId('ae-profile-row-default').getAttribute('data-active')).toBe('false')
  })

  it('shows a Vietnamese empty state', () => {
    $profiles.set([])
    $profilesStatus.set('empty')
    render(<ProfilesScreen />)
    expect(screen.getByText(/Chưa có hồ sơ nào/)).toBeTruthy()
  })

  it('shows an error state with a retry control', () => {
    $profilesStatus.set('error')
    render(<ProfilesScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
  })
})

describe('ProfilesScreen mutations', () => {
  it('create flow calls createProfileAction with the typed name', async () => {
    const spy = vi.spyOn(store, 'createProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Tạo hồ sơ/ }))
    fireEvent.change(screen.getByTestId('ae-new-profile-name'), { target: { value: 'qa' } })
    fireEvent.click(screen.getByRole('button', { name: /^Tạo$/ }))
    expect(spy).toHaveBeenCalledWith('qa')
    spy.mockRestore()
  })

  it('rename flow calls renameProfileAction for the selected profile', () => {
    $activeProfile.set('coder')
    const spy = vi.spyOn(store, 'renameProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Đổi tên/ }))
    fireEvent.change(screen.getByTestId('ae-rename-profile-name'), { target: { value: 'coder2' } })
    fireEvent.click(screen.getByRole('button', { name: /^Lưu tên$/ }))
    expect(spy).toHaveBeenCalledWith('coder', 'coder2')
    spy.mockRestore()
  })

  it('delete flow calls deleteProfileAction for the selected profile', () => {
    const spy = vi.spyOn(store, 'deleteProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Xoá/ }))
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận xoá/ }))
    expect(spy).toHaveBeenCalledWith('coder')
    spy.mockRestore()
  })
})

describe('ProfilesScreen soul editor', () => {
  it('renders the soul content for the selected profile and saves edits', () => {
    $activeProfile.set('coder')
    $profileSoul.set({ content: 'Bạn là trợ lý.', exists: true })
    $profileSoulStatus.set('ready')
    // loadProfileSoul fires from the select effect; stub it so the real REST
    // call doesn't run (no mockApi here) and clobber the pre-set 'ready' status.
    const loadSpy = vi.spyOn(store, 'loadProfileSoul').mockResolvedValue()
    const spy = vi.spyOn(store, 'saveProfileSoul').mockResolvedValue()

    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))

    const textarea = screen.getByTestId('ae-soul-editor') as HTMLTextAreaElement
    expect(textarea.value).toBe('Bạn là trợ lý.')

    fireEvent.change(textarea, { target: { value: 'Bạn là kỹ sư.' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu soul/ }))

    expect(spy).toHaveBeenCalledWith('coder', 'Bạn là kỹ sư.')
    spy.mockRestore()
    loadSpy.mockRestore()
  })
})

import { $modelOptions, $profileSetup } from '@/aether/domain/profiles/profiles-store'
import type { ModelOptionsResponse, ProfileSetupCommand } from '@/types/aether'

describe('ProfilesScreen model + active + setup', () => {
  // The screen's mount/select effects call the REAL loadModelOptions /
  // loadProfileSetup / loadProfileSoul. With no mockApi here they would throw
  // and clobber the atoms we pre-set in beforeEach (setup→null, options→null),
  // failing the assertions below. Stub them so the pre-set atoms survive.
  // (Mirrors the soul-editor describe's loadProfileSoul stub.)
  let loadOptsSpy: ReturnType<typeof vi.spyOn>
  let loadSetupSpy: ReturnType<typeof vi.spyOn>
  let loadSoulSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    const opts: ModelOptionsResponse = { providers: [{ name: 'Anthropic', slug: 'anthropic', models: ['opus', 'sonnet'] }] }
    $modelOptions.set(opts)
    const setup: ProfileSetupCommand = { command: 'aether profile use coder' }
    $profileSetup.set(setup)
    loadOptsSpy = vi.spyOn(store, 'loadModelOptions').mockResolvedValue()
    loadSetupSpy = vi.spyOn(store, 'loadProfileSetup').mockResolvedValue()
    loadSoulSpy = vi.spyOn(store, 'loadProfileSoul').mockResolvedValue()
  })
  afterEach(() => {
    loadOptsSpy.mockRestore()
    loadSetupSpy.mockRestore()
    loadSoulSpy.mockRestore()
  })

  it('sets the per-profile model from the selector', () => {
    $activeProfile.set('coder')
    const spy = vi.spyOn(store, 'setProfileModelAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.change(screen.getByTestId('ae-model-select'), { target: { value: 'anthropic::opus' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu model/ }))
    expect(spy).toHaveBeenCalledWith('coder', 'anthropic', 'opus')
    spy.mockRestore()
  })

  it('marks a non-active profile and lets the user set it active', () => {
    $activeProfile.set('default')
    const spy = vi.spyOn(store, 'setActiveProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Đặt làm mặc định/ }))
    expect(spy).toHaveBeenCalledWith('coder')
    spy.mockRestore()
  })

  it('shows the setup command for the selected profile', () => {
    $activeProfile.set('coder')
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    expect(screen.getByText('aether profile use coder')).toBeTruthy()
  })
})

// PROMPT-CACHE GUARD (hard): Profiles is a non-chat REST screen. It must never
// subscribe to conversation deltas or append assistant text — doing so would
// re-trigger the LLM and break prompt caching. We assert the source contains no
// forbidden conversation-stream identifiers (source-level guard chosen because
// the screen has no event subscription to spy on — absence is the contract).
describe('ProfilesScreen prompt-cache safety', () => {
  it('has no conversation-delta / appendAssistantDelta usage in source', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const src = fs.readFileSync(
      path.resolve(__dirname, 'profiles-screen.tsx'),
      'utf8'
    )

    for (const forbidden of ['appendAssistantDelta', 'message.delta', 'reasoning.delta', 'thinking.']) {
      expect(src.includes(forbidden)).toBe(false)
    }
  })
})

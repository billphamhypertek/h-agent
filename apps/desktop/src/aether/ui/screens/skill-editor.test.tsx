import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $editorContent, $editorSkill, $editorStatus } from '@/aether/domain/skills/skills-content-store'

import { SkillEditor } from './skill-editor'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (window as { aetherDesktop?: unknown }).aetherDesktop
})

describe('SkillEditor', () => {
  beforeEach(() => {
    $editorSkill.set('deep-research')
    $editorContent.set('# Deep research')
    $editorStatus.set('ready')
  })

  it('shows the skill name and current content in a textarea', () => {
    render(<SkillEditor />)
    expect(screen.getByText(/deep-research/)).toBeTruthy()
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('# Deep research')
  })

  it('Save PUTs the edited content', async () => {
    const api = vi.fn().mockResolvedValue({ success: true })

    ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

    render(<SkillEditor />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '# Edited body' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu/ }))

    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/content',
      method: 'PUT',
      body: { name: 'deep-research', content: '# Edited body' },
    })
  })

  it('renders nothing when no skill is open', () => {
    $editorSkill.set(null)
    const { container } = render(<SkillEditor />)
    expect(container.firstChild).toBeNull()
  })

  // PROMPT-CACHE GUARD (HARD): a non-chat settings screen must never touch the
  // conversation stream. We assert by source inspection — the cheapest robust
  // signal — that the editor module subscribes to no conversation-delta event
  // and never calls appendAssistantDelta, so editing a skill cannot re-trigger
  // the LLM or invalidate the prompt cache.
  it('does not subscribe to conversation deltas or append assistant text', () => {
    const here = dirname(fileURLToPath(import.meta.url))

    const sources = [
      readFileSync(resolve(here, 'skill-editor.tsx'), 'utf8'),
      readFileSync(resolve(here, '../../domain/skills/skills-content-store.ts'), 'utf8'),
      readFileSync(resolve(here, '../../domain/skills/skills-hub-store.ts'), 'utf8'),
      readFileSync(resolve(here, '../../domain/skills/skills-store.ts'), 'utf8'),
    ].join('\n')

    expect(sources).not.toMatch(/appendAssistantDelta/)
    expect(sources).not.toMatch(/message\.delta/)
    expect(sources).not.toMatch(/reasoning\.delta/)
    expect(sources).not.toMatch(/thinking\./)
  })
})

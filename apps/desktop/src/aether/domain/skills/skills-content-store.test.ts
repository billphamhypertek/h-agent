import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AetherApiRequest } from '@/global'

import {
  $editorContent,
  $editorSkill,
  $editorStatus,
  closeEditor,
  openEditor,
  saveEditor,
} from './skills-content-store'
import type { SkillContent, SkillWriteResult } from './skills-types'

const CONTENT: SkillContent = {
  name: 'deep-research',
  content: '# Deep research\nNội dung skill.',
  path: '/skills/deep-research/SKILL.md',
}

beforeEach(() => {
  $editorSkill.set(null)
  $editorContent.set('')
  $editorStatus.set('idle')
})
afterEach(() => vi.restoreAllMocks())

describe('openEditor', () => {
  it('GETs /api/skills/content?name= and fills the editor', async () => {
    const api = vi.fn(async (_req: AetherApiRequest) => CONTENT as never)
    await openEditor('deep-research', { api })
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/content?name=deep-research',
    })
    expect($editorSkill.get()).toBe('deep-research')
    expect($editorContent.get()).toBe(CONTENT.content)
    expect($editorStatus.get()).toBe('ready')
  })

  it('sets error when the read fails', async () => {
    const api = vi.fn(async () => {
      throw new Error('404')
    })

    await openEditor('nope', { api })
    expect($editorStatus.get()).toBe('error')
  })
})

describe('saveEditor', () => {
  it('PUTs /api/skills/content with name + edited content', async () => {
    const written: SkillWriteResult = { success: true, path: CONTENT.path }
    const api = vi.fn(async (_req: AetherApiRequest) => written as never)
    $editorSkill.set('deep-research')
    $editorContent.set('# edited')
    const res = await saveEditor({ api })
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/content',
      method: 'PUT',
      body: { name: 'deep-research', content: '# edited' },
    })
    expect(res.success).toBe(true)
    expect($editorStatus.get()).toBe('ready')
  })
})

describe('closeEditor', () => {
  it('resets editor atoms', () => {
    $editorSkill.set('x')
    $editorContent.set('y')
    $editorStatus.set('ready')
    closeEditor()
    expect($editorSkill.get()).toBeNull()
    expect($editorContent.get()).toBe('')
    expect($editorStatus.get()).toBe('idle')
  })
})

// apps/desktop/src/aether/domain/skills/skills-content-store.ts
import { atom } from 'nanostores'

import type { SkillContent, SkillWriteResult } from './skills-types'

export type EditorStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

type ApiFn = typeof window.aetherDesktop.api

export const $editorSkill = atom<string | null>(null)
export const $editorContent = atom<string>('')
export const $editorStatus = atom<EditorStatus>('idle')

function resolveApi(deps: { api?: ApiFn }): ApiFn {
  return deps.api ?? window.aetherDesktop.api
}

export async function openEditor(name: string, deps: { api?: ApiFn } = {}): Promise<void> {
  const api = resolveApi(deps)
  $editorSkill.set(name)
  $editorContent.set('')
  $editorStatus.set('loading')

  try {
    const res = await api<SkillContent>({
      path: `/api/skills/content?name=${encodeURIComponent(name)}`,
    })

    $editorContent.set(res.content)
    $editorStatus.set('ready')
  } catch {
    $editorStatus.set('error')
  }
}

export function setEditorContent(value: string): void {
  $editorContent.set(value)
}

export function closeEditor(): void {
  $editorSkill.set(null)
  $editorContent.set('')
  $editorStatus.set('idle')
}

export async function saveEditor(deps: { api?: ApiFn } = {}): Promise<SkillWriteResult> {
  const api = resolveApi(deps)
  const name = $editorSkill.get()

  if (!name) {
    throw new Error('No skill open in the editor')
  }

  $editorStatus.set('saving')

  try {
    const res = await api<SkillWriteResult>({
      path: '/api/skills/content',
      method: 'PUT',
      body: { name, content: $editorContent.get() },
    })

    $editorStatus.set('ready')

    return res
  } catch (err) {
    $editorStatus.set('error')
    throw err
  }
}

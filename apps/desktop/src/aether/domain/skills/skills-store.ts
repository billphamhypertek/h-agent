// apps/desktop/src/aether/domain/skills/skills-store.ts
import { atom } from 'nanostores'

import { getSkills as apiGetSkills, toggleSkill as apiToggleSkill } from '@/aether-api'
import type { SkillInfo } from '@/types/aether'

export type SkillsStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export const $skills = atom<SkillInfo[] | null>(null)
export const $skillsStatus = atom<SkillsStatus>('idle')

export async function loadSkills(deps: { getSkills?: typeof apiGetSkills } = {}): Promise<void> {
  const getSkills = deps.getSkills ?? apiGetSkills
  $skillsStatus.set('loading')

  try {
    const skills = await getSkills()
    $skills.set(skills)
    $skillsStatus.set(skills.length > 0 ? 'ready' : 'empty')
  } catch {
    $skillsStatus.set('error')
  }
}

// REST-only mutation: write the toggle, then re-fetch so the atom reflects the
// backend's authoritative state (no socket subscription — prompt-cache safe).
export async function toggleSkillEnabled(
  name: string,
  enabled: boolean,
  deps: { toggleSkill?: typeof apiToggleSkill; getSkills?: typeof apiGetSkills } = {}
): Promise<void> {
  const toggleSkill = deps.toggleSkill ?? apiToggleSkill
  await toggleSkill(name, enabled)
  await loadSkills({ getSkills: deps.getSkills })
}

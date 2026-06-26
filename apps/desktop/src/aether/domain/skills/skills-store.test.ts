import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SkillInfo } from '@/types/aether'

import { $skills, $skillsStatus, loadSkills, toggleSkillEnabled } from './skills-store'

const SAMPLE: SkillInfo[] = [
  { name: 'deep-research', description: 'Nghiên cứu sâu', category: 'research', enabled: true },
  { name: 'code-review', description: 'Rà soát code', category: 'dev', enabled: false },
]

beforeEach(() => {
  $skills.set(null)
  $skillsStatus.set('idle')
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadSkills', () => {
  it('loading → ready and fills $skills on success', async () => {
    const getSkills = vi.fn(async () => SAMPLE)
    await loadSkills({ getSkills })
    expect(getSkills).toHaveBeenCalledTimes(1)
    expect($skills.get()).toEqual(SAMPLE)
    expect($skillsStatus.get()).toBe('ready')
  })

  it('sets empty when the backend returns no skills', async () => {
    const getSkills = vi.fn(async () => [] as SkillInfo[])
    await loadSkills({ getSkills })
    expect($skillsStatus.get()).toBe('empty')
    expect($skills.get()).toEqual([])
  })

  it('sets error when the fetch throws', async () => {
    const getSkills = vi.fn(async () => {
      throw new Error('boom')
    })
    await loadSkills({ getSkills })
    expect($skillsStatus.get()).toBe('error')
  })
})

describe('toggleSkillEnabled', () => {
  it('calls toggleSkill with name+enabled then re-fetches via getSkills', async () => {
    const toggleSkill = vi.fn(async () => ({ ok: true, name: 'code-review', enabled: true }))
    const getSkills = vi.fn(async () => SAMPLE)
    await toggleSkillEnabled('code-review', true, { toggleSkill, getSkills })
    expect(toggleSkill).toHaveBeenCalledWith('code-review', true)
    expect(getSkills).toHaveBeenCalledTimes(1)
    expect($skillsStatus.get()).toBe('ready')
  })
})

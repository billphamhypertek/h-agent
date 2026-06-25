import { atom } from 'nanostores'

import type { Briefing } from './briefing-schema'
import { readLatestBriefing } from './read-briefing'

export const $briefing = atom<Briefing | null>(null)
export const $briefingStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

export async function loadBriefing(): Promise<void> {
  $briefingStatus.set('loading')

  try {
    const briefing = await readLatestBriefing()

    if (briefing) {
      $briefing.set(briefing)
      $briefingStatus.set('ready')
    } else {
      $briefingStatus.set('empty')
    }
  } catch {
    $briefingStatus.set('error')
  }
}

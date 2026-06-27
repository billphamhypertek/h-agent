import { beforeEach, describe, expect, it } from 'vitest'

import { $voiceListening } from '@/aether/domain/voice/voice-presence'
import { $busy, $gatewayState } from '@/store/session'
import { $voicePlayback } from '@/store/voice-playback'

import { $orbState, deriveOrbState } from './motion-store'

describe('deriveOrbState (orb-state priority: speaking > listening > thinking > idle > paused)', () => {
  it('speaking wins over everything', () => {
    expect(deriveOrbState(true, 'open', true, true)).toBe('speaking')
    expect(deriveOrbState(false, 'closed', true, false)).toBe('speaking')
  })
  it('listening wins over thinking/idle/paused when not speaking', () => {
    expect(deriveOrbState(true, 'open', false, true)).toBe('listening')
    expect(deriveOrbState(false, 'closed', false, true)).toBe('listening')
  })
  it('busy ⇒ thinking when no voice activity', () => {
    expect(deriveOrbState(true, 'open', false, false)).toBe('thinking')
    expect(deriveOrbState(true, 'closed', false, false)).toBe('thinking')
  })
  it('not busy + gateway open ⇒ idle', () => {
    expect(deriveOrbState(false, 'open', false, false)).toBe('idle')
  })
  it('not busy + gateway not open ⇒ paused (dim)', () => {
    expect(deriveOrbState(false, 'closed', false, false)).toBe('paused')
    expect(deriveOrbState(false, 'error', false, false)).toBe('paused')
  })
})

describe('$orbState computed wiring', () => {
  beforeEach(() => {
    $busy.set(false)
    $gatewayState.set('open')
    $voiceListening.set(false)
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 0, source: null, status: 'idle' })
  })

  it('reflects $voicePlayback speaking as orb speaking', () => {
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 0, source: 'voice-conversation', status: 'speaking' })
    expect($orbState.get()).toBe('speaking')
  })
  it('reflects $voiceListening as orb listening', () => {
    $voiceListening.set(true)
    expect($orbState.get()).toBe('listening')
  })
  it('falls back to idle with no voice activity and gateway open', () => {
    expect($orbState.get()).toBe('idle')
  })
})

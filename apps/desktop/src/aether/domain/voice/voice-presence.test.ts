import { beforeEach, describe, expect, it } from 'vitest'

import {
  $voiceActive,
  $voiceListening,
  $voiceSession,
  setVoiceActive,
  setVoiceListening,
  setVoiceSession,
  toggleVoiceActive,
} from './voice-presence'

beforeEach(() => {
  $voiceListening.set(false)
})

describe('$voiceListening presence atom', () => {
  it('defaults to false (mic closed)', () => {
    expect($voiceListening.get()).toBe(false)
  })

  it('setVoiceListening flips the atom', () => {
    setVoiceListening(true)
    expect($voiceListening.get()).toBe(true)
    setVoiceListening(false)
    expect($voiceListening.get()).toBe(false)
  })
})

describe('$voiceActive enable flag', () => {
  beforeEach(() => $voiceActive.set(false))

  it('defaults to false and toggles', () => {
    expect($voiceActive.get()).toBe(false)
    toggleVoiceActive()
    expect($voiceActive.get()).toBe(true)
    setVoiceActive(false)
    expect($voiceActive.get()).toBe(false)
  })
})

describe('$voiceSession published view', () => {
  it('defaults to idle/0/unmuted', () => {
    expect($voiceSession.get()).toEqual({ status: 'idle', level: 0, muted: false })
  })
  it('setVoiceSession replaces the view', () => {
    setVoiceSession({ status: 'listening', level: 0.4, muted: false })
    expect($voiceSession.get().status).toBe('listening')
  })
})

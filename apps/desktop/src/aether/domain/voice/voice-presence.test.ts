import { beforeEach, describe, expect, it } from 'vitest'

import { $voiceListening, setVoiceListening } from './voice-presence'

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

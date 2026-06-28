import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $gatewayState } from '@/store/session'

import { VitalSign, vitalStatus } from './vital-sign'

afterEach(() => { cleanup(); $gatewayState.set('idle') })

describe('vitalStatus mapping', () => {
  it('maps coarse connection status → 3 vital states', () => {
    expect(vitalStatus('online')).toBe('online')
    expect(vitalStatus('connecting')).toBe('retrying')
    expect(vitalStatus('paused')).toBe('down')
  })
})

describe('VitalSign', () => {
  it('reflects the live gateway state via data-status', () => {
    $gatewayState.set('open')
    const { rerender } = render(<VitalSign />)
    expect(screen.getByTestId('ae-vital').getAttribute('data-status')).toBe('online')
    $gatewayState.set('error')
    rerender(<VitalSign />)
    expect(screen.getByTestId('ae-vital').getAttribute('data-status')).toBe('down')
  })
})

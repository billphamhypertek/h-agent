import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $activeProfile } from '@/aether/domain/profiles/profiles-store'

import { Avatar, profileInitial } from './avatar'

afterEach(() => { cleanup(); $activeProfile.set(null) })

describe('profileInitial', () => {
  it('upper-cases the first non-space char', () => {
    expect(profileInitial('binh')).toBe('B')
    expect(profileInitial('  ada')).toBe('A')
  })
  it('falls back to A for empty/null', () => {
    expect(profileInitial(null)).toBe('A')
    expect(profileInitial('')).toBe('A')
    expect(profileInitial('   ')).toBe('A')
  })
})

describe('Avatar', () => {
  it('renders the active profile initial (single source, no hardcoded "B")', () => {
    $activeProfile.set('khanh')
    render(<Avatar />)
    const el = screen.getByTestId('ae-avatar')
    expect(el.textContent).toBe('K')
  })
})

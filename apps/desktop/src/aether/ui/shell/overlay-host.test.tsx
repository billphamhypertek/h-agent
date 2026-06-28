import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $overlay, closeOverlay, openOverlay, OverlayHost } from './overlay-host'

afterEach(() => { cleanup(); closeOverlay() })

describe('OverlayHost', () => {
  it('renders nothing when no overlay is open', () => {
    const { container } = render(<OverlayHost />)
    expect(container.firstChild).toBeNull()
  })
  it('renders the open overlay with its kind + title', () => {
    openOverlay({ kind: 'result', title: 'Kết quả' })
    render(<OverlayHost />)
    const host = screen.getByTestId('ae-overlay')
    expect(host.getAttribute('data-kind')).toBe('result')
    expect(screen.getByText('Kết quả')).toBeTruthy()
  })
  it('closes a dismissable overlay on Escape', () => {
    openOverlay({ kind: 'result', title: 'Kết quả' })
    render(<OverlayHost />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect($overlay.get()).toBeNull()
  })
  it('does NOT close the non-dismissable connection overlay on Escape', () => {
    openOverlay({ kind: 'connection', title: 'Mất kết nối' })
    render(<OverlayHost />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect($overlay.get()).not.toBeNull()
  })
})

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContentSection } from '@/aether/domain/company-os/company-os-schema'
import { $content, $contentStatus } from '@/aether/domain/content/content-store'
import * as contentStore from '@/aether/domain/content/content-store'

import { ContentScreen } from './content-screen'

const CONTENT: ContentSection = {
  calendar: [{ id: 'c1', channel: 'facebook', title: 'Bài Q3', at: '09:00', status: 'scheduled' }],
  ideas: [{ id: 'i1', title: 'Reels giới thiệu sản phẩm', stage: 'idea' }]
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $content.set(null)
  $contentStatus.set('idle')
})

describe('ContentScreen — ready', () => {
  beforeEach(() => {
    $content.set(CONTENT)
    $contentStatus.set('ready')
  })

  it('renders calendar entries and ideas', () => {
    render(<ContentScreen />)
    expect(screen.getAllByTestId('ae-content-calendar-row')).toHaveLength(1)
    expect(screen.getAllByTestId('ae-content-idea-row')).toHaveLength(1)
    expect(screen.getByText(/Reels giới thiệu sản phẩm/)).toBeTruthy()
  })

  it('renders the per-section empty-state when only one section has data', () => {
    $content.set({ calendar: CONTENT.calendar, ideas: [] })
    render(<ContentScreen />)
    expect(screen.getByTestId('ae-content-ideas-empty')).toBeTruthy()
    expect(screen.getByText(/Chưa có nguồn nội dung/i)).toBeTruthy()
  })
})

describe('ContentScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $contentStatus.set('loading')
    render(<ContentScreen />)
    expect(screen.getByTestId('ae-content-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no content source', () => {
    $contentStatus.set('empty')
    render(<ContentScreen />)
    expect(screen.getByTestId('ae-content-empty')).toBeTruthy()
    expect(screen.getByText(/Chưa có nguồn nội dung/i)).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $contentStatus.set('error')
    render(<ContentScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('ContentScreen — interactions', () => {
  it('mounts idle → triggers loadContent once', () => {
    const spy = vi.spyOn(contentStore, 'loadContent').mockResolvedValue()
    $contentStatus.set('idle')
    render(<ContentScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(contentStore, 'loadContent').mockResolvedValue()
    $content.set(CONTENT)
    $contentStatus.set('ready')
    render(<ContentScreen />)
    fireEvent.click(screen.getByTestId('ae-content-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})

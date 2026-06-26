import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { DevSection } from '@/aether/domain/company-os/company-os-schema'
import { $dev, $devStatus } from '@/aether/domain/dev/dev-store'
import * as devStore from '@/aether/domain/dev/dev-store'

import { DevScreen } from './dev-screen'

const DEV = (companyOs as unknown as { dev: DevSection }).dev

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $dev.set(null)
  $devStatus.set('idle')
})

describe('DevScreen — ready', () => {
  beforeEach(() => {
    $dev.set(DEV)
    $devStatus.set('ready')
  })

  it('renders one row per server with its host name', () => {
    render(<DevScreen />)
    expect(screen.getAllByTestId('ae-dev-server-row')).toHaveLength(2)
    expect(screen.getByText('h-workspace')).toBeTruthy()
  })

  it('shows the latest deploy when present', () => {
    render(<DevScreen />)
    expect(screen.getByText(/aether-web/)).toBeTruthy()
  })
})

describe('DevScreen — empty deploys/incidents render honest empty-states', () => {
  it('renders the Vietnamese empty-state for an empty deploys list', () => {
    $dev.set({ servers: DEV.servers, deploys: [], incidents: [] })
    $devStatus.set('ready')
    render(<DevScreen />)
    expect(screen.getByTestId('ae-dev-deploys-empty')).toBeTruthy()
    expect(screen.getAllByText(/Chưa có/i).length).toBeGreaterThan(0)
  })
})

describe('DevScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $devStatus.set('loading')
    render(<DevScreen />)
    expect(screen.getByTestId('ae-dev-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no artifact', () => {
    $devStatus.set('empty')
    render(<DevScreen />)
    expect(screen.getByTestId('ae-dev-empty')).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $devStatus.set('error')
    render(<DevScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('DevScreen — interactions', () => {
  it('mounts idle → triggers loadDev once', () => {
    const spy = vi.spyOn(devStore, 'loadDev').mockResolvedValue()
    $devStatus.set('idle')
    render(<DevScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(devStore, 'loadDev').mockResolvedValue()
    $dev.set(DEV)
    $devStatus.set('ready')
    render(<DevScreen />)
    fireEvent.click(screen.getByTestId('ae-dev-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})

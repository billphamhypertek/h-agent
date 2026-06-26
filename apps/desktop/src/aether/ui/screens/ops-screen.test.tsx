import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { OpsSection } from '@/aether/domain/company-os/company-os-schema'
import { $ops, $opsStatus } from '@/aether/domain/ops/ops-store'
import * as opsStore from '@/aether/domain/ops/ops-store'

import { OpsScreen } from './ops-screen'

const OPS = (companyOs as unknown as { ops: OpsSection }).ops

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $ops.set(null)
  $opsStatus.set('idle')
})

describe('OpsScreen — ready', () => {
  beforeEach(() => {
    $ops.set(OPS)
    $opsStatus.set('ready')
  })

  it('renders calendar entries and tasks', () => {
    render(<OpsScreen />)
    expect(screen.getAllByTestId('ae-ops-calendar-row')).toHaveLength(1)
    expect(screen.getAllByTestId('ae-ops-task-row')).toHaveLength(1)
    expect(screen.getByText(/Gửi báo giá VinFast/)).toBeTruthy()
  })

  it('renders the finance empty-state (no finance source)', () => {
    render(<OpsScreen />)
    expect(screen.getByTestId('ae-ops-finance-empty')).toBeTruthy()
    expect(screen.getAllByText(/Chưa có nguồn tài chính/i)).toHaveLength(3)
  })
})

describe('OpsScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $opsStatus.set('loading')
    render(<OpsScreen />)
    expect(screen.getByTestId('ae-ops-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no artifact', () => {
    $opsStatus.set('empty')
    render(<OpsScreen />)
    expect(screen.getByTestId('ae-ops-empty')).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $opsStatus.set('error')
    render(<OpsScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('OpsScreen — interactions', () => {
  it('mounts idle → triggers loadOps once', () => {
    const spy = vi.spyOn(opsStore, 'loadOps').mockResolvedValue()
    $opsStatus.set('idle')
    render(<OpsScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(opsStore, 'loadOps').mockResolvedValue()
    $ops.set(OPS)
    $opsStatus.set('ready')
    render(<OpsScreen />)
    fireEvent.click(screen.getByTestId('ae-ops-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})

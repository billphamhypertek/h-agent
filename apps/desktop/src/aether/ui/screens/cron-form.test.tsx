import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $cronDeliveryTargets } from '@/aether/domain/cron/cron-store'

import { CronForm } from './cron-form'

afterEach(() => {
  cleanup()
  $cronDeliveryTargets.set([{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }])
})

describe('CronForm', () => {
  it('submits a CronJobCreatePayload with a built daily schedule', () => {
    const onSubmit = vi.fn()
    render(<CronForm onCancel={() => {}} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Lời nhắc'), { target: { value: 'Tóm tắt tin' } })
    fireEvent.change(screen.getByLabelText('Giờ'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Phút'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Tóm tắt tin', schedule: '0 7 * * *', deliver: 'local' }))
  })

  it('lists every delivery target in the selector', () => {
    $cronDeliveryTargets.set([
      { id: 'local', name: 'Local', home_target_set: true, home_env_var: null },
      { id: 'telegram', name: 'Telegram', home_target_set: true, home_env_var: 'TG' },
    ])
    render(<CronForm onCancel={() => {}} onSubmit={() => {}} />)
    expect(screen.getByRole('option', { name: 'Telegram' })).toBeTruthy()
  })
})

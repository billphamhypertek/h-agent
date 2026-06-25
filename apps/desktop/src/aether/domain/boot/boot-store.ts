import { atom } from 'nanostores'

export interface DesktopBootProgress {
  error: string | null
  fakeMode: boolean
  message: string
  phase: string
  progress: number
  running: boolean
  timestamp: number
}

export const $bootProgress = atom<DesktopBootProgress | null>(null)
export const $bootDone = atom<boolean>(false)

// Vietnamese checklist, ordered by the backend's emitted phase sequence.
export const BOOT_STEPS: { phase: string; label: string }[] = [
  { label: 'core agent', phase: 'backend.resolve' },
  { label: 'bộ nhớ', phase: 'backend.runtime' },
  { label: 'kỹ năng', phase: 'backend.spawn' },
  { label: 'kết nối kênh', phase: 'backend.port' },
  { label: 'mô hình ngôn ngữ', phase: 'backend.wait' },
  { label: 'sẵn sàng', phase: 'backend.ready' },
]

const ORDER = BOOT_STEPS.map(s => s.phase)

export function bootStepStatus(
  current: DesktopBootProgress | null,
  stepPhase: string,
): 'active' | 'done' | 'pending' {
  if (!current) {return 'pending'}
  const cur = ORDER.indexOf(current.phase)
  const step = ORDER.indexOf(stepPhase)

  if (cur < 0 || step < 0) {return 'pending'}

  if (step < cur) {return 'done'}

  if (step === cur) {return current.running ? 'active' : 'done'}

  return 'pending'
}

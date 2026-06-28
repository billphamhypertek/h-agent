// 6-verb lifecycle mapping the real agent-tree: thở(idle) → vươn nhánh(think) →
// phân bào(spawn) → node/flow(work) → hút(absorb) → kết tinh(crystallize→modal).
export const LIFECYCLE_PHASES = ['breathe', 'reach', 'mitosis', 'flow', 'inhale', 'crystallize'] as const

export type LifecyclePhase = (typeof LIFECYCLE_PHASES)[number]

export type LifecycleEvent = 'think' | 'spawn' | 'work' | 'absorb' | 'crystallize' | 'reset'

const NEXT: Record<LifecyclePhase, Partial<Record<LifecycleEvent, LifecyclePhase>>> = {
  breathe: { think: 'reach' },
  reach: { spawn: 'mitosis', work: 'flow' },
  mitosis: { work: 'flow' },
  flow: { absorb: 'inhale' },
  inhale: { crystallize: 'crystallize' },
  crystallize: {},
}

export function lifecycleReducer(phase: LifecyclePhase, event: LifecycleEvent): LifecyclePhase {
  if (event === 'reset') return 'breathe'
  return NEXT[phase][event] ?? phase
}

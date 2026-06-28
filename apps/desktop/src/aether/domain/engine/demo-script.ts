import { createGraph, type GraphSpec, type NodeSpec } from './graph-model'
import { constellationLayout } from './layout'
import { type LifecycleEvent, type LifecyclePhase, lifecycleReducer } from './lifecycle'

export interface ScriptStep {
  atMs: number
  event: LifecycleEvent
}

// Scripted "HSG" scene: standby → reach → mitosis → flow → inhale → crystallize.
export const HSG_SCRIPT: ScriptStep[] = [
  { atMs: 0, event: 'reset' },
  { atMs: 1500, event: 'think' },
  { atMs: 3000, event: 'spawn' },
  { atMs: 4500, event: 'work' },
  { atMs: 7000, event: 'absorb' },
  { atMs: 8500, event: 'crystallize' },
]

export const HSG_TOTAL_MS = 10000

export const HSG_TARGETS = ['Inbox', 'CRM', 'Dev', 'Vận hành', 'Content']

export function phaseAt(elapsedMs: number, script: ScriptStep[] = HSG_SCRIPT): LifecyclePhase {
  let phase: LifecyclePhase = 'breathe'

  for (const step of script) {
    if (elapsedMs >= step.atMs) {phase = lifecycleReducer(phase, step.event)}
  }

  return phase
}

export function hsgStandbyGraph(): GraphSpec {
  const pts = constellationLayout(HSG_TARGETS.length, 1)

  const nodes: NodeSpec[] = HSG_TARGETS.map((label, i) => ({
    id: `t${i}`,
    label,
    state: 'online',
    x: pts[i].x,
    y: pts[i].y,
  }))

  return createGraph({
    orbs: [{ id: 'core', kind: 'core', state: 'online', x: 0, y: 0 }],
    nodes,
    links: nodes.map(n => ({ id: `l-${n.id}`, from: 'core', to: n.id, flow: 0 })),
  })
}

export function hsgFrame(elapsedMs: number): GraphSpec {
  return { ...hsgStandbyGraph(), phase: phaseAt(elapsedMs) }
}

// apps/desktop/src/aether/ui/motion/aether-canvas.test.tsx
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AetherCanvas, pickDpr, shouldRenderFrame } from './aether-canvas'

afterEach(cleanup)

describe('AetherCanvas gating + perf predicates', () => {
  it('renders nothing when motion is disabled (gate false ⇒ no Canvas)', () => {
    const { container } = render(<AetherCanvas enabled={false} />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.firstChild).toBeNull()
  })
  it('caps DPR to [1, 1.75]', () => {
    expect(pickDpr(0.5)).toBe(1)
    expect(pickDpr(1)).toBe(1)
    expect(pickDpr(3)).toBe(1.75)
  })
  it('pauses the frameloop when hidden or idle', () => {
    expect(shouldRenderFrame(false, false)).toBe(true)
    expect(shouldRenderFrame(true, false)).toBe(false)
    expect(shouldRenderFrame(false, true)).toBe(false)
    expect(shouldRenderFrame(true, true)).toBe(false)
  })
  it('renders the graph only when a spec is present', async () => {
    const { shouldRenderGraph } = await import('./aether-canvas')
    const { hsgStandbyGraph } = await import('@/aether/domain/engine/demo-script')
    expect(shouldRenderGraph(null)).toBe(false)
    expect(shouldRenderGraph(hsgStandbyGraph())).toBe(true)
  })
})

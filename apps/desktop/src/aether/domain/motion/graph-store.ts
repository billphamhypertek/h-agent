import { atom } from 'nanostores'

import type { GraphSpec } from '@/aether/domain/engine/graph-model'

// The graph the shared AetherCanvas should render (constellation/summon). null =
// ambient orb only. Data-driven so non-chat screens stay prompt-cache safe.
export const $graphSpec = atom<GraphSpec | null>(null)

export function setGraphSpec(s: GraphSpec | null): void { $graphSpec.set(s) }
export function clearGraphSpec(): void { $graphSpec.set(null) }

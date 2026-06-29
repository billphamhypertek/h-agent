// apps/desktop/src/aether/ui/screens/chat-screen.tsx
import { useStore } from '@nanostores/react'

import { $readerPanel } from '@/aether/domain/chat/reader-store'
import { $graphSpec } from '@/aether/domain/motion/graph-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { GraphFallback } from '@/aether/ui/motion/graph/fallback'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'

import { LivingDock } from './chat/living-dock'
import { ReaderPanel } from './chat/reader-panel'
import { useChatGraph } from './chat/use-chat-graph'

// Chat = Light · C · Side companion living cockpit. The shared shell-root AetherCanvas
// renders the dock GL from $graphSpec (composed by useChatGraph from $turnActivity —
// the coarse, prompt-cache-safe stream). The thread column is the injected legacy
// runtime; the reader panel opens on demand and the dock co-slims while it's open.
export function ChatScreen({ chatView }: { chatView: React.ReactNode }) {
  const spec = useStore($graphSpec)
  const reader = useStore($readerPanel)
  const motionEnabled = useMotionEnabled()

  useChatGraph()

  const readerOpen = reader.open

  return (
    <div className="ae-screen-bare relative flex h-full min-h-0 min-w-0" data-testid="ae-chat">
      {/* GPU-off / reduced-motion / probe-fail → static SVG dock from the same spec. */}
      {!motionEnabled && spec && <div className="pointer-events-none absolute inset-0 z-0"><GraphFallback spec={spec} /></div>}

      {/* Thread column — narrows when the reader is open. */}
      <div className={readerOpen ? 'flex min-h-0 w-[268px] shrink-0 flex-col' : 'flex min-h-0 flex-1 flex-col'}>
        {chatView}
      </div>

      {/* Reader panel (middle) — only mounted while reading a file. */}
      {readerOpen && <ReaderPanel />}

      {/* Living dock (right) — full vs slim. The GL shows through the translucent slab. */}
      <div className={readerOpen ? 'relative ml-2 shrink-0' : 'relative ml-2 w-[228px] shrink-0'}>
        <GlassSlab className="h-full" size="sm">
          {spec && <LivingDock onToggle={() => { /* expand handled by closing the reader for MVP */ }} slim={readerOpen} spec={spec} />}
        </GlassSlab>
      </div>
    </div>
  )
}

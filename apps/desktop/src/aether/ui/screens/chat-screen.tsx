// apps/desktop/src/aether/ui/screens/chat-screen.tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $readerPanel } from '@/aether/domain/chat/reader-store'
import { clearGraphSpec } from '@/aether/domain/motion/graph-store'

import { HistoryRail } from './chat/history-rail'
import { ReaderPanel } from './chat/reader-panel'

// Chat = a calm two-pane reading cockpit:
//   • History rail (left)   — past conversations, search, new-chat.
//   • Conversation (center) — the injected legacy thread+composer runtime, on a
//                             white "paper" surface, taking the full width.
// Chat deliberately does NOT drive the shared living engine: scattering GL nodes
// across the conversation read as noise, so we clear the shared $graphSpec here
// (the reader still opens on demand and the rail steps aside to give it room).
export function ChatScreen({ chatView }: { chatView: React.ReactNode }) {
  const reader = useStore($readerPanel)
  const readerOpen = reader.open

  useEffect(() => {
    clearGraphSpec()

    return () => clearGraphSpec()
  }, [])

  return (
    <div className="ae-screen-bare relative flex h-full min-h-0 min-w-0 gap-6" data-testid="ae-chat">
      {/* History rail (left) — steps aside while the reader is open. */}
      {!readerOpen && <HistoryRail />}

      {/* Conversation thread (center) — a soft white "paper" card floating on the
          ambient wash (.ae-pane = large radius + soft lift). The override flips
          the legacy ChatView's own grey chrome background to --ae-surface too. */}
      <div
        className={readerOpen
          ? 'ae-pane relative z-[1] flex min-h-0 w-[320px] shrink-0 flex-col overflow-hidden'
          : 'ae-pane relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden'}
        style={{ background: 'var(--ae-surface)', ['--ui-chat-surface-background' as string]: 'var(--ae-surface)' }}
      >
        {chatView}
      </div>

      {/* Reader panel (right) — only mounted while reading a file. */}
      {readerOpen && <ReaderPanel />}
    </div>
  )
}

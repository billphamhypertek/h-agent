// apps/desktop/src/aether/ui/screens/chat/reader-panel.tsx
import { useStore } from '@nanostores/react'

import { $readerPanel, closeReader } from '@/aether/domain/chat/reader-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { MarkdownTextContent } from '@/components/assistant-ui/markdown-text'

// Manual-trigger file reader (MVP: .md). Static snapshot — never streams.
export function ReaderPanel() {
  const reader = useStore($readerPanel)

  if (!reader.open) {return null}

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col" data-testid="ae-reader-panel">
      <GlassSlab className="flex h-full min-h-0 flex-col" size="md">
        <div className="mb-2 flex items-center gap-2">
          <span className="truncate text-[length:var(--ae-text-md)] text-[color:var(--ae-ink)]">{reader.fileName}</span>
          <span className="rounded px-1.5 py-0.5 text-[length:var(--ae-text-xs)] uppercase tracking-[var(--ae-tracking-wider)] text-[color:var(--ae-azure-soft)]">
            {reader.format === 'md' ? 'MD' : 'Thô'}
          </span>
          <button
            aria-label="Đóng trình đọc"
            className="ml-auto rounded-md px-2 py-1 text-[color:var(--ae-dim)] hover:text-[color:var(--ae-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]"
            onClick={closeReader}
            type="button"
          >✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {reader.format === 'md' ? (
            <MarkdownTextContent isRunning={false} text={reader.content} />
          ) : (
            <pre className="whitespace-pre-wrap wrap-anywhere text-[length:var(--ae-text-base)] text-[color:var(--ae-dim)]">{reader.content}</pre>
          )}
        </div>
      </GlassSlab>
    </div>
  )
}

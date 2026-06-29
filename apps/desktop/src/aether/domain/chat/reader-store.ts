// apps/desktop/src/aether/domain/chat/reader-store.ts
import { atom } from 'nanostores'

import { $messages } from '@/store/session'

export type ReaderFormat = 'md' | 'other'

export interface ReaderState {
  open: boolean
  fileName: string
  format: ReaderFormat
  content: string
}

const CLOSED: ReaderState = { open: false, fileName: '', format: 'other', content: '' }

// Static snapshot only — the reader NEVER subscribes to the stream. Opening is a
// user action that reads $messages.get() once (not a subscription), so there is no
// per-token re-render and prompt-cache stays intact.
export const $readerPanel = atom<ReaderState>(CLOSED)

export function readerFormat(fileName: string): ReaderFormat {
  return /\.md$/i.test(fileName) ? 'md' : 'other'
}

export function readerTextFromResult(result: unknown): string {
  if (typeof result === 'string') {return result}

  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>

    for (const key of ['content', 'text', 'output'] as const) {
      if (typeof r[key] === 'string') {return r[key] as string}
    }
  }

  return JSON.stringify(result, null, 2)
}

export function openReader(input: { fileName: string; content: string }): void {
  $readerPanel.set({ open: true, fileName: input.fileName, format: readerFormat(input.fileName), content: input.content })
}

export function closeReader(): void {
  $readerPanel.set(CLOSED)
}

export function openReaderFromMessages(toolCallId: string): void {
  for (const message of $messages.get()) {
    for (const part of message.parts) {
      if (part.type === 'tool-call' && part.toolCallId === toolCallId) {
        const args = (part.args ?? {}) as Record<string, unknown>
        const fileName = String(args.path ?? args.file ?? args.filename ?? 'tệp')
        openReader({ fileName, content: readerTextFromResult(part.result) })

        return
      }
    }
  }
}

// apps/desktop/src/aether/domain/chat/reader-store.test.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { $messages } from '@/store/session'

import {
  $readerPanel,
  closeReader,
  openReader,
  openReaderFromMessages,
  readerFormat,
  readerTextFromResult,
} from './reader-store'

beforeEach(() => { closeReader(); $messages.set([]) })

describe('readerFormat', () => {
  it('detects .md (case-insensitive) and treats everything else as other', () => {
    expect(readerFormat('docs/X.md')).toBe('md')
    expect(readerFormat('R.MD')).toBe('md')
    expect(readerFormat('a.ts')).toBe('other')
  })
})

describe('readerTextFromResult', () => {
  it('passes a raw string through', () => {
    expect(readerTextFromResult('# Hi')).toBe('# Hi')
  })
  it('reads common object shapes (content / text / output)', () => {
    expect(readerTextFromResult({ content: '# c' })).toBe('# c')
    expect(readerTextFromResult({ text: 'tx' })).toBe('tx')
    expect(readerTextFromResult({ output: 'out' })).toBe('out')
  })
  it('falls back to JSON for anything else', () => {
    expect(readerTextFromResult({ a: 1 })).toBe('{\n  "a": 1\n}')
  })
})

describe('openReader / closeReader', () => {
  it('opens with derived format then closes', () => {
    openReader({ fileName: 'README.md', content: '# T' })
    expect($readerPanel.get()).toEqual({ open: true, fileName: 'README.md', format: 'md', content: '# T' })
    closeReader()
    expect($readerPanel.get().open).toBe(false)
  })
})

describe('openReaderFromMessages', () => {
  it('pulls the read_file tool result out of $messages by toolCallId (one-shot get, no subscribe)', () => {
    $messages.set([
      { id: 'm1', role: 'assistant', parts: [
        { type: 'tool-call', toolName: 'read_file', toolCallId: 'tc9', args: { path: 'GUIDE.md' }, result: '# Guide' },
      ] } as never,
    ])
    openReaderFromMessages('tc9')
    expect($readerPanel.get()).toMatchObject({ open: true, fileName: 'GUIDE.md', format: 'md', content: '# Guide' })
  })
  it('does nothing when the tool call is not found', () => {
    openReaderFromMessages('missing')
    expect($readerPanel.get().open).toBe(false)
  })
})

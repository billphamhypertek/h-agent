import { atom } from 'nanostores'

import { getSession, getSessionMessages, listSessions, searchSessions } from '@/aether-api'
import type { AetherReadDirEntry } from '@/global'
import type {
  PaginatedSessions,
  SessionInfo,
  SessionMessage,
  SessionMessagesResponse,
  SessionSearchResponse,
} from '@/types/aether'

export interface ArtifactsDeps {
  listSessions?: typeof listSessions
  searchSessions?: typeof searchSessions
  getSession?: typeof getSession
  getSessionMessages?: typeof getSessionMessages
  readDir?: (path: string) => Promise<{ entries: AetherReadDirEntry[]; error?: string }>
}

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error'

export const $artifacts = atom<SessionInfo[] | null>(null)
export const $artifactsStatus = atom<LibraryStatus>('idle')
export const $artifactQuery = atom<string>('')
export const $selectedArtifact = atom<SessionInfo | null>(null)
export const $selectedPreview = atom<SessionMessage[] | null>(null)
export const $previewStatus = atom<PreviewStatus>('idle')
export const $fileOutputs = atom<AetherReadDirEntry[] | null>(null)

const ARTIFACTS_LIST_LIMIT = 60
const ARTIFACTS_MIN_MESSAGES = 1

// A search hit is a thin row; project it onto SessionInfo so the library grid
// renders one card shape for both list and search. Unknown numeric/flag fields
// get inert defaults — this is a read-only view, nothing mutates them.
function searchResultToSession(result: SessionSearchResponse['results'][number]): SessionInfo {
  return {
    id: result.session_id,
    title: null,
    preview: result.snippet,
    archived: false,
    cwd: null,
    ended_at: null,
    input_tokens: 0,
    is_active: false,
    last_active: result.session_started ?? 0,
    message_count: 0,
    model: result.model,
    output_tokens: 0,
    source: result.source,
    started_at: result.session_started ?? 0,
    tool_call_count: 0,
  }
}

export async function loadArtifacts(deps: ArtifactsDeps = {}): Promise<void> {
  const list = deps.listSessions ?? listSessions
  $artifactsStatus.set('loading')

  try {
    const result: PaginatedSessions = await list(ARTIFACTS_LIST_LIMIT, ARTIFACTS_MIN_MESSAGES, 'exclude', 'recent')
    $artifacts.set(result.sessions)
    $artifactsStatus.set(result.sessions.length === 0 ? 'empty' : 'ready')
  } catch {
    $artifactsStatus.set('error')
  }
}

export async function searchArtifacts(query: string, deps: ArtifactsDeps = {}): Promise<void> {
  const trimmed = query.trim()
  $artifactQuery.set(trimmed)

  if (!trimmed) {
    await loadArtifacts(deps)

    return
  }

  const search = deps.searchSessions ?? searchSessions
  $artifactsStatus.set('loading')

  try {
    const response: SessionSearchResponse = await search(trimmed)
    const rows = response.results.map(searchResultToSession)
    $artifacts.set(rows)
    $artifactsStatus.set(rows.length === 0 ? 'empty' : 'ready')
  } catch {
    $artifactsStatus.set('error')
  }
}

export async function openArtifact(id: string, deps: ArtifactsDeps = {}): Promise<void> {
  const fetchSession = deps.getSession ?? getSession
  const fetchMessages = deps.getSessionMessages ?? getSessionMessages
  $previewStatus.set('loading')

  try {
    const info = await fetchSession(id)
    $selectedArtifact.set(info)
    // Static transcript fetch — a one-shot REST read of stored messages. This is
    // NOT a conversation stream: no ws subscription, no delta handler, no LLM
    // re-trigger. Preview is read-only by construction.
    const transcript: SessionMessagesResponse = await fetchMessages(id)
    $selectedPreview.set(transcript.messages)
    $previewStatus.set('ready')
  } catch {
    $previewStatus.set('error')
  }
}

export async function loadFileOutputs(dir: string, deps: ArtifactsDeps = {}): Promise<void> {
  const readDir = deps.readDir ?? ((path: string) => window.aetherDesktop.readDir(path))

  try {
    const result = await readDir(dir)
    $fileOutputs.set(result.error ? [] : result.entries.filter(e => !e.isDirectory))
  } catch {
    $fileOutputs.set([])
  }
}

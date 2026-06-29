import type { OAuthProvider } from '@/types/aether'

// Restyled provider ordering — mirrors the legacy overlay's PROVIDER_DISPLAY so
// Nous anchors the top of the list and the Anthropic paths sink to the bottom.
export const PROVIDER_DISPLAY: Record<string, { order: number; title: string }> = {
  nous: { order: 0, title: 'Nous Portal' },
  'openai-codex': { order: 1, title: 'OpenAI OAuth (ChatGPT)' },
  'minimax-oauth': { order: 2, title: 'MiniMax' },
  'qwen-oauth': { order: 3, title: 'Qwen Code' },
  'xai-oauth': { order: 4, title: 'xAI Grok' },
  anthropic: { order: 5, title: 'Anthropic API Key' },
  'claude-code': { order: 6, title: 'Anthropic OAuth: Required Extra Usage Credits to Use Subscription' },
}

export const FEATURED_ID = 'nous'

export const providerTitle = (p: OAuthProvider) => PROVIDER_DISPLAY[p.id]?.title ?? p.name
export const orderOf = (p: OAuthProvider) => PROVIDER_DISPLAY[p.id]?.order ?? 99

export const sortProviders = (providers: OAuthProvider[]) =>
  [...providers].sort((a, b) => orderOf(a) - orderOf(b) || a.name.localeCompare(b.name))

export const ROW_CLASS =
  'group flex w-full items-center justify-between gap-3 rounded-[10px] border border-[color:var(--ae-line)] bg-[var(--ae-fill)] p-[10px_14px] text-left transition-colors hover:bg-[var(--ae-fill-strong)]'

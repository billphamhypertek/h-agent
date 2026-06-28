import { useEffect, useMemo, useState } from 'react'

import { getGlobalModelOptions } from '@/aether-api'
import type { ModelOptionProvider } from '@/types/aether'

export interface ApiKeyOption {
  description?: string
  docsUrl: string
  envKey: string
  id: string
  name: string
  placeholder?: string
  short?: string
}

export const API_KEY_OPTIONS: ApiKeyOption[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    docsUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    docsUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    envKey: 'XAI_API_KEY',
    docsUrl: 'https://console.x.ai/'
  },
  {
    id: 'local',
    name: 'Local / custom endpoint',
    envKey: 'OPENAI_BASE_URL',
    docsUrl: 'https://github.com/NousResearch/hermes-agent#bring-your-own-endpoint',
    placeholder: 'http://127.0.0.1:8000/v1'
  }
]

// Build the FULL API-key provider catalog from the backend model options so the
// onboarding / Providers key form lists every `api_key` provider `aether model`
// knows about — not just the hand-curated five. Curated entries keep their
// richer copy + placeholders and float to the top (recommended defaults); every
// other api_key provider is appended with a generic "paste {KEY}" affordance.
// OAuth / external providers are intentionally excluded here — they go through
// the OAuth picker / sign-in flow, not a pasted key.
export function useApiKeyCatalog(): ApiKeyOption[] {
  const [rows, setRows] = useState<ModelOptionProvider[]>([])

  useEffect(() => {
    let cancelled = false

    // Best-effort — on failure the curated defaults still render. Wrapped in
    // Promise.resolve().then so a synchronous throw (e.g. no desktop bridge in
    // tests) is funneled into the same .catch instead of escaping.
    void Promise.resolve()
      .then(() => getGlobalModelOptions())
      .then(res => {
        if (!cancelled) {
          setRows(res.providers ?? [])
        }
      })
      .catch(() => {
        // Ignore — fall back to the curated API_KEY_OPTIONS only.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => {
    const curatedByEnv = new Map(API_KEY_OPTIONS.map(o => [o.envKey, o]))
    const derived: ApiKeyOption[] = []
    const seenEnv = new Set<string>(API_KEY_OPTIONS.map(o => o.envKey))

    for (const row of rows) {
      // Only api_key providers can be activated with a pasted key. Skip OAuth /
      // external / managed flows and anything missing an env var to write to.
      if (row.auth_type && row.auth_type !== 'api_key') {
        continue
      }

      const envKey = row.key_env

      if (!envKey || seenEnv.has(envKey)) {
        continue
      }

      seenEnv.add(envKey)
      derived.push({
        id: row.slug,
        name: row.name,
        envKey,
        description: `Direct API access to ${row.name}.`,
        docsUrl: ''
      })
    }

    // Curated first (recommended order), then the rest alphabetically so the
    // long tail is scannable.
    derived.sort((a, b) => a.name.localeCompare(b.name))

    return [...API_KEY_OPTIONS.filter(o => curatedByEnv.has(o.envKey)), ...derived]
  }, [rows])
}

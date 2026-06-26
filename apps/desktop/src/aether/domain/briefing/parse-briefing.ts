import type { Briefing } from './briefing-schema'

export function isBriefing(value: unknown): value is Briefing {
  if (!value || typeof value !== 'object') { return false }

  const v = value as Record<string, unknown>

  return (
    typeof v.generatedAt === 'string' &&
    Array.isArray(v.priorities) &&
    Array.isArray(v.servers) &&
    Array.isArray(v.feed) &&
    typeof v.bento === 'object' &&
    v.bento !== null &&
    typeof v.vitals === 'object' &&
    v.vitals !== null
  )
}

const FENCE = /```json\s*([\s\S]*?)```/i

export function extractJsonBlock(text: string): unknown | null {
  const fenced = FENCE.exec(text)
  const raw = fenced ? fenced[1] : text

  try {
    return JSON.parse(raw.trim())
  } catch {
    return null
  }
}

export function messageText(content: unknown): string {
  if (typeof content === 'string') { return content }

  if (Array.isArray(content)) {
    return content
      .map(part =>
        typeof part === 'string'
          ? part
          : typeof (part as { text?: string })?.text === 'string'
            ? (part as { text: string }).text
            : '',
      )
      .join('\n')
  }

  return ''
}

export function parseBriefingFromMessages(
  messages: { role: string; content?: unknown }[],
): Briefing | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'assistant') { continue }

    const parsed = extractJsonBlock(messageText(messages[i].content))

    if (isBriefing(parsed)) { return parsed }

    return null // newest assistant message had no valid artifact
  }

  return null
}

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell inbox route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports InboxScreen', () => {
    expect(src.includes('import { InboxScreen }')).toBe(true)
  })

  it('renders <InboxScreen /> on the inbox path', () => {
    expect(/<Route element=\{<InboxScreen \/>\} path=\{INBOX_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})

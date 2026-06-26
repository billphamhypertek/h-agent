import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell content route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports ContentScreen', () => {
    expect(src.includes('import { ContentScreen }')).toBe(true)
  })

  it('renders <ContentScreen /> on the content path', () => {
    expect(/<Route element=\{<ContentScreen \/>\} path=\{CONTENT_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})

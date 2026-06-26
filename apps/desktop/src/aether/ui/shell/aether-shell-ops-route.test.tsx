import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell ops route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports OpsScreen', () => {
    expect(src.includes('import { OpsScreen }')).toBe(true)
  })

  it('renders <OpsScreen /> on the ops path', () => {
    expect(/<Route element=\{<OpsScreen \/>\} path=\{OPS_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})

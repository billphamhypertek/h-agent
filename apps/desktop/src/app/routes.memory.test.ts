import { describe, expect, it } from 'vitest'

import { MEMORY_ROUTE } from './routes'

describe('MEMORY_ROUTE', () => {
  it('is the /memory path', () => {
    expect(MEMORY_ROUTE).toBe('/memory')
  })
})

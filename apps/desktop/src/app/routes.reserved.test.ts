import { describe, expect, it } from 'vitest'

import { APP_ROUTES, appViewForPath, BRIEF_ROUTE, HUD_ROUTE, MEMORY_ROUTE, routeSessionId } from './routes'

// Regression: the shell (aether-shell.tsx) registers /hud, /brief and /memory
// as full screens, but they were missing from APP_ROUTES/RESERVED_PATHS. That
// made routeSessionId('/brief') return the literal "brief" as a session id, so
// the chat view tried to open a session named "brief" → GET /api/sessions/brief
// 404'd ("Session not found") on a loop. Every shell route must be reserved so
// it is never mistaken for a session id.
describe('shell-registered routes are reserved (not session ids)', () => {
  for (const route of [HUD_ROUTE, BRIEF_ROUTE, MEMORY_ROUTE]) {
    it(`treats ${route} as a non-session app route`, () => {
      expect(routeSessionId(route)).toBeNull()
      expect(appViewForPath(route)).not.toBe('chat')
    })
  }

  it('still resolves a real session id under /', () => {
    expect(routeSessionId('/cron_job_123')).toBe('cron_job_123')
  })
})

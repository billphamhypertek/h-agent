// src/app/desktop-controller-onboarding-route.test.tsx
// Source-assertion test: the controller is awkward to mount in jsdom (many
// runtime stores), and the onboarding-gate swap is a one-line wiring change.
// Mirrors the readFileSync(join(__dirname, ...)) precedent used by the
// aether-shell-*-route.test.tsx source-assertion tests (use __dirname, not
// fileURLToPath(import.meta.url), which throws under this vitest config).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('desktop-controller onboarding gate', () => {
  const src = readFileSync(join(__dirname, 'desktop-controller.tsx'), 'utf8')

  it('imports AetherOnboarding from the AETHER onboarding screen', () => {
    expect(src.includes("import { AetherOnboarding } from '@/aether/ui/screens/onboarding-screen'")).toBe(true)
  })

  it('mounts <AetherOnboarding /> as the first-run gate', () => {
    expect(src.includes('<AetherOnboarding')).toBe(true)
  })

  it('no longer references the legacy DesktopOnboardingOverlay', () => {
    expect(src.includes('DesktopOnboardingOverlay')).toBe(false)
  })
})

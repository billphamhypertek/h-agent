import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// No hardcoded colors — every color must come through `--ae-*` tokens. Bans hex
// literals (#fff/#FFE6BE) and rgb()/rgba() literals across the HUD surface.
const HEX = /#[0-9a-fA-F]{3,8}\b/
const RGB = /\brgba?\(/

const FILES = [
  'src/aether/ui/screens/command-center.tsx',
  'src/aether/ui/screens/hud/greeting-card.tsx',
  'src/aether/ui/screens/hud/system-vitals-card.tsx',
  'src/aether/ui/screens/hud/priorities-peek.tsx',
  'src/aether/ui/screens/hud/fleet-status.tsx',
  'src/aether/ui/screens/hud/constellation-overlay.tsx',
]

describe('HUD color tokenization', () => {
  for (const rel of FILES) {
    it(`${rel} contains no hardcoded hex/rgb colors`, () => {
      const source = readFileSync(resolve(process.cwd(), rel), 'utf8')

      expect(HEX.test(source), `${rel} must not contain a hex color literal`).toBe(false)
      expect(RGB.test(source), `${rel} must not contain an rgb()/rgba() literal`).toBe(false)
    })
  }
})

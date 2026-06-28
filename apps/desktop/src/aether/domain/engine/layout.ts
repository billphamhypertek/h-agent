export interface Point {
  x: number
  y: number
}

// Radial constellation: evenly-spaced points starting at the top, going clockwise.
// Deterministic (no RNG) so layouts are stable across renders + testable.
export function constellationLayout(count: number, radius = 1): Point[] {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}

// Summon overlay uses the same radial distribution but tighter (grows from glyph).
export function summonLayout(count: number, radius = 0.6): Point[] {
  return constellationLayout(count, radius)
}

import { GEOMETRY } from '@/aether/ui/theme/geometry'

// Re-export the nav geometry from the single numeric source so call-sites read one place.
export const NAV_ITEM_H = GEOMETRY.nav.item // 38
export const NAV_GAP = GEOMETRY.nav.gap // 5

// Pure transform math for the sliding "focus pill". JS only sets the transform;
// the spring easing lives in CSS (.ae-nav-indicator). Returns translateY for the
// active item slot. Returns null when no item is active (hide the indicator).
export function navIndicatorTransform(
  activeIndex: number,
  itemHeight: number,
  gap: number,
): string | null {
  if (activeIndex < 0) {return null}

  return `translateY(${activeIndex * (itemHeight + gap)}px)`
}

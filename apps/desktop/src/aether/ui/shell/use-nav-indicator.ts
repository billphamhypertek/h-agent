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

/**
 * Dropdowns/popovers anchored near the bottom of the viewport (e.g. the last row of a
 * card grid) should open upward instead of pushing content past the fold. These
 * helpers measure the trigger element against the viewport and decide a direction —
 * used by every MUI Select (via getFlipMenuProps) and by the app's own hand-built
 * popovers (via shouldOpenUpward) so the behavior is consistent everywhere.
 */

export function shouldOpenUpward(anchorEl: HTMLElement | null, estimatedHeight = 220): boolean {
  if (!anchorEl) return false;
  const rect = anchorEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  return spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
}

export function getFlipMenuProps(anchorEl: HTMLElement | null, estimatedHeight = 220) {
  const flip = shouldOpenUpward(anchorEl, estimatedHeight);
  return flip
    ? {
        anchorOrigin: { vertical: "top" as const, horizontal: "left" as const },
        transformOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
      }
    : {
        anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
        transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
      };
}

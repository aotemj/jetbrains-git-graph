/**
 * Constants and utilities for the draggable split divider.
 */

export const DIVIDER_DEFAULTS = {
  defaultPercent: 40,
  minLeftPx: 150,
  minRightPx: 150,
  hitAreaPx: 4,
} as const;

/**
 * Computes clamped pane widths given a container width and drag position.
 *
 * - Left width is clamped between `minLeft` and `containerWidth - minRight`
 * - Right width = containerWidth - leftWidth (conservation invariant)
 *
 * @param containerWidth Total available width for both panes
 * @param dragX The horizontal drag position (pixels from container left edge)
 * @param minLeft Minimum allowed width for the left pane (px)
 * @param minRight Minimum allowed width for the right pane (px)
 * @returns Object with computed `leftWidth` and `rightWidth`
 */
export function computePaneWidths(
  containerWidth: number,
  dragX: number,
  minLeft: number,
  minRight: number,
): { leftWidth: number; rightWidth: number } {
  const maxLeft = containerWidth - minRight;
  const leftWidth = Math.max(minLeft, Math.min(dragX, maxLeft));
  const rightWidth = containerWidth - leftWidth;

  return { leftWidth, rightWidth };
}

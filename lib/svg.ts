/**
 * Rounds a computed SVG coordinate.
 *
 * Trigonometry produces doubles like 65.13911220792419, and the server and the
 * client do not always serialise those identically — React then reports a
 * hydration mismatch and throws the whole subtree away to re-render it. Two
 * decimal places is far below what any display can resolve, so rounding costs
 * nothing and removes the class of bug entirely.
 */
export function px(value: number): number {
  return Math.round(value * 100) / 100;
}

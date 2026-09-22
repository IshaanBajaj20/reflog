/**
 * Geometry for the iceberg: the one picture that only this product can honestly
 * draw, because it is the only one that measures the submerged part.
 *
 * The silhouette is derived from the developer's own monthly contribution
 * counts, so two people with the same totals still get different shapes. That
 * matters for sharing: the image has to be theirs, not a template with their
 * number typed into it.
 */

export type IcebergShape = {
  /** Closed polygon above the waterline, in viewBox units. */
  above: [number, number][];
  /** Closed polygon below the waterline. */
  below: [number, number][];
  /** y of the waterline in viewBox units. */
  waterline: number;
  /** Total viewBox height. */
  height: number;
  width: number;
  /** 0..1 — how much of the mass sits above water. */
  visibleShare: number;
};

export const ICEBERG_WIDTH = 400;
export const ICEBERG_HEIGHT = 620;

/**
 * Builds the silhouette.
 *
 * `monthly` drives the jitter on each side — the first half of the year shapes
 * the left contour, the second half the right — which is what makes the form
 * personal rather than decorative. The vertical split is the real ratio, with
 * floors at both ends: a developer who is 100% public still needs something
 * below the line to read as an iceberg, and one who is 100% private still needs
 * a visible tip or the picture says they did nothing.
 */
export function buildIceberg(
  monthly: number[],
  visibleShare: number,
  width = ICEBERG_WIDTH,
  height = ICEBERG_HEIGHT,
): IcebergShape {
  const share = clamp(visibleShare, 0.04, 0.55);

  // Waterline sits so the above/below split matches the real ratio, held inside
  // a band that keeps the composition readable at either extreme.
  const waterline = clamp(height * share * 1.5, height * 0.1, height * 0.42);

  const centre = width / 2;
  const jitter = normaliseJitter(monthly);

  // Half-width as a fraction of the total width. Capped below 0.5 so that the
  // widest point plus its jitter still lands inside the viewBox — without this
  // a lopsided year pushes the silhouette off the canvas and it renders clipped.
  const MAX_HALF = 0.47;
  const at = (fraction: number) =>
    Math.min(MAX_HALF, Math.max(0.02, fraction)) * width;

  // --- above water: a peak, narrowing to the tip -----------------------------
  const aboveRows = 5;
  const aboveLeft: [number, number][] = [];
  const aboveRight: [number, number][] = [];
  for (let i = 0; i <= aboveRows; i++) {
    const t = i / aboveRows; // 0 at tip, 1 at waterline
    const y = waterline - (1 - t) * waterline * 0.92;
    const base = 0.08 + Math.pow(t, 0.72) * 0.34;
    aboveLeft.push([centre - at(base * (1 + jitter(i) * 0.3)), y]);
    aboveRight.push([centre + at(base * (1 + jitter(11 - i) * 0.3)), y]);
  }

  // --- below water: widens, then tapers to a deep point ----------------------
  const belowRows = 11;
  const belowLeft: [number, number][] = [];
  const belowRight: [number, number][] = [];
  const depth = height - waterline;
  for (let i = 0; i <= belowRows; i++) {
    const t = i / belowRows; // 0 at waterline, 1 at the deepest point
    const y = waterline + t * depth;
    // Widest around a third of the way down, tapering to a point at the bottom.
    const base = 0.4 * bulge(t);
    belowLeft.push([centre - at(base * (1 + jitter(i) * 0.26)), y]);
    belowRight.push([centre + at(base * (1 + jitter(11 - i) * 0.26)), y]);
  }

  return {
    above: [...aboveLeft, ...aboveRight.reverse()],
    below: [...belowLeft, ...belowRight.reverse()],
    waterline,
    height,
    width,
    visibleShare: share,
  };
}

/**
 * Width profile below water: swells early, tapers to nothing at the bottom.
 * The small high-frequency term is what keeps the contour faceted — a pure sine
 * produces a smooth blob, and a blob does not read as ice.
 */
function bulge(t: number): number {
  if (t >= 1) return 0.02;
  const body = Math.sin(Math.pow(t, 0.62) * Math.PI * 0.92) * 0.96 + 0.06;
  const facets = Math.cos(t * Math.PI * 5.3) * 0.055;
  return Math.max(0.04, body + facets);
}

/**
 * Turns monthly counts into a stable -1..1 jitter per index.
 * A flat or empty year returns gentle variation rather than a perfect cone,
 * because a perfectly symmetrical iceberg reads as a graphic, not a place.
 */
function normaliseJitter(monthly: number[]): (index: number) => number {
  const values = monthly.length === 12 ? monthly : new Array(12).fill(0);
  const max = Math.max(...values, 1);
  const mean = values.reduce((a, b) => a + b, 0) / 12;
  const flat = values.every((v) => Math.abs(v - mean) < 1e-9);

  return (index: number) => {
    const i = ((index % 12) + 12) % 12;
    if (flat) return Math.sin(i * 2.4) * 0.35;
    return (values[i] / max) * 2 - 1;
  };
}

export function toPoints(polygon: [number, number][]): string {
  return polygon.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

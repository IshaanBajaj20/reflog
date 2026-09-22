export type TreemapInput = { key: string; value: number };
export type TreemapRect = {
  key: string;
  value: number;
  /** All in 0..1, relative to the container. */
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
 *
 * Chosen over a bar chart because byte share across a dozen languages is a
 * part-to-whole relationship, and bars force the eye to compare lengths against
 * a baseline while a treemap shows the whole at once. It also degrades far
 * better: a language at 0.4% is a visible sliver rather than a bar too short to
 * render, and there is no long tail of near-empty rows.
 *
 * "Squarified" means the algorithm greedily keeps rectangles close to square
 * rather than laying them out in strict order, because long thin slivers are
 * hard to compare by area and hard to label.
 */
export function squarify(items: TreemapInput[], aspect = 1): TreemapRect[] {
  const positive = items.filter((i) => i.value > 0);
  if (positive.length === 0) return [];

  const total = positive.reduce((sum, i) => sum + i.value, 0);
  // Work in a space whose width reflects the container's aspect ratio, so the
  // "squareness" the algorithm optimises for is squareness on screen.
  const width = aspect;
  const height = 1;
  const scaled = positive.map((i) => ({ ...i, area: (i.value / total) * width * height }));

  const out: TreemapRect[] = [];
  let x = 0;
  let y = 0;
  let remainingWidth = width;
  let remainingHeight = height;
  let row: typeof scaled = [];
  const queue = [...scaled];

  const shortestSide = () => Math.min(remainingWidth, remainingHeight);

  while (queue.length > 0) {
    const next = queue[0];
    const withNext = [...row, next];

    if (row.length === 0 || worst(withNext, shortestSide()) <= worst(row, shortestSide())) {
      row = withNext;
      queue.shift();
      continue;
    }
    ({ x, y, remainingWidth, remainingHeight } = layoutRow(
      row,
      x,
      y,
      remainingWidth,
      remainingHeight,
      out,
      aspect,
    ));
    row = [];
  }

  if (row.length > 0) {
    layoutRow(row, x, y, remainingWidth, remainingHeight, out, aspect);
  }

  return out;
}

/** Worst aspect ratio in a candidate row — the value squarify minimises. */
function worst(row: { area: number }[], side: number): number {
  if (row.length === 0 || side === 0) return Infinity;
  const sum = row.reduce((s, r) => s + r.area, 0);
  if (sum === 0) return Infinity;
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  const side2 = side * side;
  const sum2 = sum * sum;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

function layoutRow(
  row: { key: string; value: number; area: number }[],
  x: number,
  y: number,
  remainingWidth: number,
  remainingHeight: number,
  out: TreemapRect[],
  aspect: number,
) {
  const sum = row.reduce((s, r) => s + r.area, 0);
  const horizontal = remainingWidth >= remainingHeight;

  if (horizontal) {
    // Row runs down the left edge, occupying a vertical strip.
    const stripWidth = sum / remainingHeight;
    let cursor = y;
    for (const cell of row) {
      const cellHeight = cell.area / stripWidth;
      out.push({
        key: cell.key,
        value: cell.value,
        x: x / aspect,
        y: cursor,
        width: stripWidth / aspect,
        height: cellHeight,
      });
      cursor += cellHeight;
    }
    return {
      x: x + stripWidth,
      y,
      remainingWidth: remainingWidth - stripWidth,
      remainingHeight,
    };
  }

  const stripHeight = sum / remainingWidth;
  let cursor = x;
  for (const cell of row) {
    const cellWidth = cell.area / stripHeight;
    out.push({
      key: cell.key,
      value: cell.value,
      x: cursor / aspect,
      y,
      width: cellWidth / aspect,
      height: stripHeight,
    });
    cursor += cellWidth;
  }
  return {
    x,
    y: y + stripHeight,
    remainingWidth,
    remainingHeight: remainingHeight - stripHeight,
  };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { ICEBERG_HEIGHT, ICEBERG_WIDTH, buildIceberg } from "./iceberg.ts";

const BUSY_YEAR = [140, 210, 180, 90, 260, 300, 120, 80, 240, 310, 190, 160];

test("the shape stays inside its viewBox", () => {
  for (const share of [0, 0.02, 0.5, 0.98, 1]) {
    const shape = buildIceberg(BUSY_YEAR, share);
    for (const [x, y] of [...shape.above, ...shape.below]) {
      assert.ok(x >= 0 && x <= ICEBERG_WIDTH, `x ${x} outside at share ${share}`);
      assert.ok(y >= 0 && y <= ICEBERG_HEIGHT, `y ${y} outside at share ${share}`);
    }
  }
});

test("a fully private year still shows a visible tip", () => {
  // Otherwise the picture says the developer did nothing, which is the exact
  // misreading this whole product exists to correct.
  const shape = buildIceberg(BUSY_YEAR, 0);
  assert.ok(shape.waterline > 20, "there must be room above the water");
  assert.ok(shape.above.length >= 4);
  const tipHeight = shape.waterline - Math.min(...shape.above.map(([, y]) => y));
  assert.ok(tipHeight > 10, `tip was only ${tipHeight} tall`);
});

test("a fully public year still has mass below the line", () => {
  const shape = buildIceberg(BUSY_YEAR, 1);
  assert.ok(shape.waterline < ICEBERG_HEIGHT * 0.5, "most of it stays submerged");
  const deepest = Math.max(...shape.below.map(([, y]) => y));
  assert.ok(deepest > shape.waterline + 100, "there is real depth to see");
});

test("more private work pushes the waterline higher", () => {
  const mostlyPrivate = buildIceberg(BUSY_YEAR, 0.02);
  const mostlyPublic = buildIceberg(BUSY_YEAR, 0.5);
  assert.ok(
    mostlyPrivate.waterline < mostlyPublic.waterline,
    "a 2% visible year should sit lower in the water than a 50% one",
  );
});

test("two developers with the same totals get different silhouettes", () => {
  // The image has to be theirs, not a template with a number typed into it.
  const a = buildIceberg([300, 40, 190, 20, 260, 80, 310, 60, 150, 90, 240, 30], 0.02);
  const b = buildIceberg([40, 300, 20, 190, 80, 260, 60, 310, 90, 150, 30, 240], 0.02);
  assert.notDeepEqual(a.below, b.below);
  assert.notDeepEqual(a.above, b.above);
});

test("an empty or flat year still produces an asymmetric shape", () => {
  for (const monthly of [[], new Array(12).fill(0), new Array(12).fill(50)]) {
    const shape = buildIceberg(monthly, 0.1);
    const widths = shape.below.map(([x]) => x);
    assert.ok(new Set(widths.map((w) => Math.round(w))).size > 3, "not a flat cone");
    assert.ok(shape.below.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  }
});

test("the polygons are closed loops with both sides", () => {
  const shape = buildIceberg(BUSY_YEAR, 0.05);
  const centre = ICEBERG_WIDTH / 2;
  assert.ok(shape.below.some(([x]) => x < centre), "has a left contour");
  assert.ok(shape.below.some(([x]) => x > centre), "has a right contour");
  assert.ok(shape.below.length >= 8);
});

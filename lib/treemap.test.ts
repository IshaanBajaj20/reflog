import { test } from "node:test";
import assert from "node:assert/strict";
import { squarify } from "./treemap.ts";

const LANGUAGES = [
  { key: "Python", value: 4_600_000 },
  { key: "TypeScript", value: 2_400_000 },
  { key: "Go", value: 1_500_000 },
  { key: "SQL", value: 900_000 },
  { key: "HCL", value: 600_000 },
  { key: "Shell", value: 120_000 },
  { key: "Dockerfile", value: 40_000 },
];

test("every language gets a rectangle, none dropped", () => {
  const rects = squarify(LANGUAGES);
  assert.equal(rects.length, LANGUAGES.length);
  assert.deepEqual(
    rects.map((r) => r.key).sort(),
    LANGUAGES.map((l) => l.key).sort(),
  );
});

test("areas are proportional to value", () => {
  const rects = squarify(LANGUAGES);
  const total = LANGUAGES.reduce((s, l) => s + l.value, 0);
  for (const rect of rects) {
    const expected = rect.value / total;
    const actual = rect.width * rect.height;
    assert.ok(
      Math.abs(actual - expected) < 0.005,
      `${rect.key}: area ${actual.toFixed(4)} vs expected ${expected.toFixed(4)}`,
    );
  }
});

test("rectangles stay inside the unit square and do not overlap", () => {
  const rects = squarify(LANGUAGES);
  for (const r of rects) {
    assert.ok(r.x >= -1e-9 && r.y >= -1e-9, `${r.key} starts outside`);
    assert.ok(r.x + r.width <= 1 + 1e-6, `${r.key} overflows horizontally`);
    assert.ok(r.y + r.height <= 1 + 1e-6, `${r.key} overflows vertically`);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const overlaps =
        a.x < b.x + b.width - 1e-6 &&
        b.x < a.x + a.width - 1e-6 &&
        a.y < b.y + b.height - 1e-6 &&
        b.y < a.y + a.height - 1e-6;
      assert.ok(!overlaps, `${a.key} overlaps ${b.key}`);
    }
  }
});

test("the layout fills the whole area", () => {
  const covered = squarify(LANGUAGES).reduce((s, r) => s + r.width * r.height, 0);
  assert.ok(Math.abs(covered - 1) < 0.01, `covered ${covered}`);
});

test("cells stay reasonably square rather than becoming slivers", () => {
  // The point of squarifying: no cell should be wildly elongated.
  const rects = squarify(LANGUAGES, 1.6);
  const ratios = rects.map((r) => Math.max(r.width / r.height, r.height / r.width));
  const worst = Math.max(...ratios);
  assert.ok(worst < 12, `worst aspect ratio was ${worst.toFixed(1)}`);
});

test("a single language fills everything", () => {
  const rects = squarify([{ key: "Go", value: 500 }]);
  assert.equal(rects.length, 1);
  assert.ok(Math.abs(rects[0].width * rects[0].height - 1) < 1e-6);
});

test("zero and negative values are dropped rather than breaking the layout", () => {
  const rects = squarify([
    { key: "Go", value: 100 },
    { key: "Nothing", value: 0 },
    { key: "Broken", value: -5 },
  ]);
  assert.equal(rects.length, 1);
  assert.equal(rects[0].key, "Go");
});

test("an empty input returns an empty layout", () => {
  assert.deepEqual(squarify([]), []);
  assert.deepEqual(squarify([{ key: "a", value: 0 }]), []);
});

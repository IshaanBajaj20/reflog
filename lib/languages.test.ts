import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLanguages, computeLanguagesByRepoCount } from "./languages.ts";
import { makeRepo } from "./fixtures.ts";

/** A working web developer: many TypeScript repos of ordinary size. */
function typescriptCareer(count = 20, bytesEach = 100_000) {
  return Array.from({ length: count }, (_, i) =>
    makeRepo({ nameWithOwner: `dev/app-${i}`, languages: { TypeScript: bytesEach } }),
  );
}

test("the motivating case: one repo of bundled C++ does not make a web dev a C++ dev", () => {
  const repos = [
    ...typescriptCareer(),
    makeRepo({ nameWithOwner: "dev/native-wrapper", languages: { "C++": 8_000_000 } }),
  ];

  const stats = computeLanguages(repos);

  assert.equal(stats[0].language, "TypeScript", "TypeScript ranks first");
  const cpp = stats.find((s) => s.language === "C++")!;
  assert.equal(cpp.bytes, 8_000_000, "raw bytes preserved for display");
  assert.equal(cpp.inflated, true, "flagged so the UI can say what happened");
  assert.ok(cpp.adjustedBytes < cpp.bytes, "capped for ranking");
});

test("a single enormous repo is capped even when it is the only repo in that language", () => {
  // The exemption for single-repo languages was the bug: this IS the vendored case.
  const stats = computeLanguages([
    ...typescriptCareer(5),
    makeRepo({ nameWithOwner: "dev/vendored", languages: { "C++": 40_000_000 } }),
  ]);
  const cpp = stats.find((s) => s.language === "C++")!;
  assert.equal(cpp.repos, 1);
  assert.equal(cpp.inflated, true);
  assert.equal(cpp.adjustedBytes, 1_000_000, "capped at the 1 MB floor");
});

test("an ordinary large project is not treated as vendored", () => {
  // 800 KB of hand-written Go across a few repos is plausible and stays intact.
  const stats = computeLanguages([
    makeRepo({ nameWithOwner: "a/1", languages: { Go: 400_000 } }),
    makeRepo({ nameWithOwner: "a/2", languages: { Go: 250_000 } }),
    makeRepo({ nameWithOwner: "a/3", languages: { Go: 150_000 } }),
  ]);
  const go = stats[0];
  assert.equal(go.inflated, false);
  assert.equal(go.adjustedBytes, go.bytes, "nothing capped");
  assert.ok(go.concentration > 0.4, "still concentrated enough for the UI to note it");
});

test("a developer working in small repos is not over-corrected by the floor", () => {
  const stats = computeLanguages([
    ...Array.from({ length: 10 }, (_, i) =>
      makeRepo({ nameWithOwner: `a/${i}`, languages: { Lua: 5_000 } }),
    ),
    makeRepo({ nameWithOwner: "a/c-project", languages: { C: 300_000 } }),
  ]);
  const c = stats.find((s) => s.language === "C")!;
  assert.equal(c.inflated, false, "300 KB of C is plausible hand-written work");
  assert.equal(c.adjustedBytes, 300_000);
});

test("forks are excluded — a fork's bytes are somebody else's work", () => {
  const stats = computeLanguages([
    makeRepo({ nameWithOwner: "a/mine", languages: { Python: 10_000 } }),
    makeRepo({ nameWithOwner: "a/forked", isFork: true, languages: { Haskell: 5_000_000 } }),
  ]);

  assert.equal(stats.length, 1);
  assert.equal(stats[0].language, "Python");
});

test("shares sum to 1 and nothing reports NaN", () => {
  const stats = computeLanguages([
    makeRepo({ nameWithOwner: "a/1", languages: { Go: 100, Rust: 50 } }),
    makeRepo({ nameWithOwner: "a/2", languages: { Go: 80 } }),
  ]);
  const sum = stats.reduce((a, s) => a + s.share, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `shares summed to ${sum}`);
  assert.ok(stats.every((s) => Number.isFinite(s.share)));
});

test("no language data at all produces an empty, non-crashing result", () => {
  assert.deepEqual(computeLanguages([makeRepo({ languages: {} })]), []);
  assert.deepEqual(computeLanguages([]), []);
  assert.deepEqual(computeLanguagesByRepoCount([makeRepo({ primaryLanguage: null })]), []);
});

test("zero-byte language entries are ignored rather than dividing by zero", () => {
  const stats = computeLanguages([makeRepo({ languages: { Go: 0, Rust: 100 } })]);
  assert.equal(stats.length, 1);
  assert.equal(stats[0].language, "Rust");
});

test("repo-count breakdown ignores forks and unknown languages", () => {
  const counts = computeLanguagesByRepoCount([
    makeRepo({ nameWithOwner: "a/1", primaryLanguage: "Go" }),
    makeRepo({ nameWithOwner: "a/2", primaryLanguage: "Go" }),
    makeRepo({ nameWithOwner: "a/3", primaryLanguage: "Rust" }),
    makeRepo({ nameWithOwner: "a/4", primaryLanguage: "Rust", isFork: true }),
    makeRepo({ nameWithOwner: "a/5", primaryLanguage: null }),
  ]);
  assert.deepEqual(counts, [
    { language: "Go", repos: 2 },
    { language: "Rust", repos: 1 },
  ]);
});

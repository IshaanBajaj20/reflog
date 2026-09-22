import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCoverage, explainCoverage } from "./coverage.ts";
import { computeStats } from "./stats.ts";
import { makeBundle, makeContributions, makeRepo } from "./fixtures.ts";

function byRepo(entries: [string, boolean, number][]) {
  return entries.map(([nameWithOwner, isPrivate, totalCount]) => ({
    repository: {
      nameWithOwner,
      isPrivate,
      owner: { login: nameWithOwner.split("/")[0], __typename: "Organization" },
    },
    contributions: { totalCount },
  }));
}

test("the observed failure: 2,116 contributions but only 8 attributable commits", () => {
  // Reproduces a real account on 2026-09-22. GitHub reported the aggregate
  // private count but almost none of the repositories behind it.
  const coverage = computeCoverage(
    makeContributions({ commitContributionsByRepository: byRepo([["dev/site", true, 8]]) }),
    2116,
  );

  assert.equal(coverage.attributableCommits, 8);
  assert.equal(coverage.level, "aggregate-only");
  assert.equal(coverage.suppressRepoDetail, true);
  assert.ok(coverage.ratio < 0.01);
});

test("a featured repo is withheld entirely when coverage is aggregate-only", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        restrictedContributionsCount: 2075,
        contributionCalendar: { totalContributions: 2116, weeks: [] },
        commitContributionsByRepository: byRepo([["dev/personal-site", true, 8]]),
      }),
      repos: [makeRepo({ nameWithOwner: "dev/personal-site", isPrivate: true })],
    }),
  );

  assert.equal(
    stats.featured,
    null,
    "an 8-commit repo must not be presented as the year's most active work",
  );
  assert.equal(stats.contributions.total, 2116, "the headline total is still complete");
  assert.ok(
    stats.warnings.some((w) => w.includes("can't read in detail")),
    "the gap is explained rather than hidden",
  );
});

test("good coverage keeps the featured repo and adds no warning", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        contributionCalendar: { totalContributions: 1000, weeks: [] },
        commitContributionsByRepository: byRepo([
          ["acme/core", false, 700],
          ["acme/tools", false, 150],
        ]),
      }),
      repos: [makeRepo({ nameWithOwner: "acme/core", relation: "organization" })],
    }),
  );

  assert.equal(stats.coverage.level, "full");
  assert.equal(stats.featured?.name, "acme/core");
  assert.equal(explainCoverage(stats.coverage), null, "nothing to apologise for");
});

test("partial coverage keeps the detail but says it is incomplete", () => {
  const coverage = computeCoverage(
    makeContributions({ commitContributionsByRepository: byRepo([["a/b", true, 400]]) }),
    1000,
  );
  assert.equal(coverage.level, "partial");
  assert.equal(coverage.suppressRepoDetail, false);
  assert.ok(explainCoverage(coverage)?.includes("part of the picture"));
});

test("the coverage explanation never blames or judges the user", () => {
  for (const total of [10, 1000, 5000]) {
    const note = explainCoverage(
      computeCoverage(
        makeContributions({ commitContributionsByRepository: byRepo([["a/b", true, 1]]) }),
        total,
      ),
    );
    if (!note) continue;
    const lowered = note.toLowerCase();
    for (const banned of ["you failed", "your fault", "you should", "only", "just"]) {
      assert.ok(!lowered.includes(banned), `explanation must not contain "${banned}"`);
    }
  }
});

test("an empty year does not report zero coverage and suppress everything", () => {
  const coverage = computeCoverage(makeContributions({ commitContributionsByRepository: [] }), 0);
  assert.equal(coverage.ratio, 1, "no contributions means nothing is missing");
  assert.equal(coverage.level, "full");
  assert.equal(coverage.suppressRepoDetail, false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "./stats.ts";
import { resolveContributionTotals } from "./contributions.ts";
import { makeBundle, makeCalendar, makeContributions, makeRepo } from "./fixtures.ts";

const SEPT = new Date("2026-09-22T00:00:00Z");

function calendarOf(year: number, days: number, counts: number[]) {
  const all = makeCalendar(year, days, counts);
  const weeks = [];
  for (let i = 0; i < all.length; i += 7) weeks.push({ contributionDays: all.slice(i, i + 7) });
  return {
    totalContributions: all.reduce((a, d) => a + d.contributionCount, 0),
    weeks,
  };
}

/* -- the reconciliation that the whole app rests on ------------------------ */

test("restricted contributions are a SUBSET of the calendar total, never added", () => {
  // Verified against a real profile on 2026-09-22: calendar 2116, restricted 2075.
  // Summing them would have reported 4191 — nearly double the real year.
  const totals = resolveContributionTotals(
    makeContributions({
      restrictedContributionsCount: 2075,
      contributionCalendar: { totalContributions: 2116, weeks: [] },
    }),
  );
  assert.equal(totals.total, 2116);
  assert.equal(totals.private, 2075);
  assert.equal(totals.public, 41);
  assert.ok(Math.abs(totals.privateShare - 0.981) < 0.001);
});

test("a restricted count exceeding the calendar total cannot produce negative public work", () => {
  const totals = resolveContributionTotals(
    makeContributions({
      restrictedContributionsCount: 500,
      contributionCalendar: { totalContributions: 100, weeks: [] },
    }),
  );
  assert.equal(totals.public, 0, "clamped, never negative");
  assert.ok(totals.privateShare <= 1);
});

/* -- the edge cases named in the brief ------------------------------------- */

test("a zero-star developer with heavy private work is reported at full scale", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        restrictedContributionsCount: 2075,
        totalCommitContributions: 1800,
        contributionCalendar: calendarOf(2026, 265, [8, 9, 7, 10, 6, 0, 0]),
      }),
      repos: [
        ...Array.from({ length: 20 }, (_, i) =>
          makeRepo({ nameWithOwner: `dev/p-${i}`, stars: 0, languages: { TypeScript: 80_000 } }),
        ),
        ...Array.from({ length: 50 }, (_, i) =>
          makeRepo({
            nameWithOwner: `acme/svc-${i}`,
            relation: "organization",
            isPrivate: true,
            stars: 0,
            languages: { Go: 120_000 },
          }),
        ),
      ],
      organizations: [{ login: "acme" }, { login: "globex" }],
    }),
    SEPT,
  );

  assert.equal(stats.repos.stars, 0, "zero stars throughout");
  assert.equal(stats.repos.total, 70);
  assert.equal(stats.repos.organization, 50);
  assert.equal(stats.repos.private, 50);
  assert.ok(stats.contributions.total > 1500, "scale is reported, not suppressed");
  assert.ok(stats.contributions.perDay > 0 && Number.isFinite(stats.contributions.perDay));
  assert.ok(stats.languages.distinct >= 2);
  // Nothing in the output ranks or scores the developer against anyone.
  assert.ok(!("score" in stats.contributions));
});

test("a developer with no private repos at all is handled without special-casing", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        restrictedContributionsCount: 0,
        contributionCalendar: calendarOf(2026, 200, [3, 0]),
      }),
      repos: [makeRepo({ stars: 12, languages: { Ruby: 50_000 } })],
    }),
    SEPT,
  );

  assert.equal(stats.contributions.private, 0);
  assert.equal(stats.contributions.privateShare, 0);
  assert.equal(stats.contributions.public, stats.contributions.total);
  assert.equal(stats.repos.private, 0);
});

test("a brand-new account with no repos and no contributions produces finite numbers", () => {
  const stats = computeStats(
    makeBundle({
      viewer: {
        nodeId: "U_1",
        login: "new",
        name: null,
        avatarUrl: "",
        createdAt: "2026-09-01T00:00:00Z",
        followers: 0,
      },
      contributions: makeContributions({
        contributionCalendar: { totalContributions: 0, weeks: [] },
      }),
      repos: [],
    }),
    SEPT,
  );

  assert.equal(stats.contributions.total, 0);
  assert.ok(Number.isFinite(stats.contributions.perDay), "no division by zero");
  assert.equal(stats.contributions.perDay, 0);
  assert.equal(stats.languages.top, null);
  assert.equal(stats.featured, null);
  assert.equal(stats.breadth.score, 0);
  assert.equal(stats.identity.yearsOnGitHub, 1, "floored at one year, never zero");
});

/* -- privacy ---------------------------------------------------------------- */

test("a private repo is never named, even when it is the featured repo", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        commitContributionsByRepository: [
          {
            repository: {
              nameWithOwner: "acme/billing-core",
              isPrivate: true,
              owner: { login: "acme", __typename: "Organization" },
            },
            contributions: { totalCount: 900 },
          },
        ],
      }),
      repos: [
        makeRepo({
          nameWithOwner: "acme/billing-core",
          isPrivate: true,
          relation: "organization",
          languages: { Go: 300_000, SQL: 20_000 },
        }),
      ],
    }),
    SEPT,
  );

  assert.equal(stats.featured?.isPrivate, true);
  assert.equal(stats.featured?.name, null, "employer repo name never surfaces");
  assert.equal(stats.featured?.commits, 900, "the work is still reported");
  assert.deepEqual(stats.featured?.languages, ["Go", "SQL"], "stack badges survive");

  assert.ok(
    !JSON.stringify(stats).includes("billing-core"),
    "the name appears nowhere in the stats payload",
  );
});

test("a public featured repo keeps its name", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        commitContributionsByRepository: [
          {
            repository: {
              nameWithOwner: "dev/open-tool",
              isPrivate: false,
              owner: { login: "dev", __typename: "User" },
            },
            contributions: { totalCount: 40 },
          },
        ],
      }),
      repos: [makeRepo({ nameWithOwner: "dev/open-tool", stars: 7 })],
    }),
    SEPT,
  );
  assert.equal(stats.featured?.name, "dev/open-tool");
  assert.equal(stats.featured?.stars, 7);
});

/* -- derived signals -------------------------------------------------------- */

test("organisations counts those committed to, not merely those joined", () => {
  const stats = computeStats(
    makeBundle({
      organizations: [{ login: "acme" }, { login: "globex" }, { login: "dormant-org" }],
      contributions: makeContributions({
        commitContributionsByRepository: [
          {
            repository: { nameWithOwner: "acme/a", isPrivate: true, owner: { login: "acme", __typename: "Organization" } },
            contributions: { totalCount: 500 },
          },
          {
            repository: { nameWithOwner: "globex/b", isPrivate: true, owner: { login: "globex", __typename: "Organization" } },
            contributions: { totalCount: 300 },
          },
          {
            repository: { nameWithOwner: "dev/own", isPrivate: false, owner: { login: "dev", __typename: "User" } },
            contributions: { totalCount: 20 },
          },
        ],
      }),
    }),
    SEPT,
  );

  assert.equal(stats.organizations.memberOf, 3);
  assert.equal(stats.organizations.contributedTo, 2, "the dormant org does not count");
});

test("peak hour is withheld when too few commits were sampled to mean anything", () => {
  const thin = computeStats(
    makeBundle({
      commitHours: {
        hours: Object.assign(new Array(24).fill(0), { 3: 5 }),
        weekdays: new Array(7).fill(0),
        sampled: 5,
      },
    }),
    SEPT,
  );
  assert.equal(thin.clock.peakHour, null, "5 commits is noise, not a working pattern");

  const solid = computeStats(
    makeBundle({
      commitHours: {
        hours: Object.assign(new Array(24).fill(1), { 14: 200 }),
        weekdays: Object.assign(new Array(7).fill(1), { 2: 90 }),
        sampled: 400,
      },
    }),
    SEPT,
  );
  assert.equal(solid.clock.peakHour, 14);
  assert.equal(solid.clock.peakWeekday, 2);
});

test("per-day average divides by days elapsed, not by 365", () => {
  // 100 contributions over the first 100 days of the year, run on day 100.
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        contributionCalendar: calendarOf(2026, 365, [1]),
      }),
    }),
    new Date("2026-04-10T00:00:00Z"),
  );
  assert.equal(stats.cadence.totalDays, 100);
  assert.equal(stats.contributions.perDay, 3.7, "365 total over 100 elapsed days");
});

test("breadth needs real evidence before it claims a layer", () => {
  const oneDockerfile = computeStats(
    makeBundle({ repos: [makeRepo({ languages: { TypeScript: 500_000, Dockerfile: 400 } })] }),
    SEPT,
  );
  assert.ok(
    !oneDockerfile.breadth.layers.includes("infrastructure"),
    "a single Dockerfile is not an infrastructure career",
  );

  const realInfra = computeStats(
    makeBundle({
      repos: [
        makeRepo({ nameWithOwner: "a/terraform-modules", topics: ["terraform", "kubernetes"], languages: { HCL: 300_000 } }),
        makeRepo({ nameWithOwner: "a/k8s-platform", topics: ["kubernetes", "helm"], languages: { Go: 200_000, HCL: 90_000 } }),
      ],
    }),
    SEPT,
  );
  assert.ok(realInfra.breadth.layers.includes("infrastructure"));
  assert.ok(realInfra.breadth.score >= 1);
});

test("stats never contain a leaderboard score or a rank", () => {
  const stats = computeStats(makeBundle(), SEPT);
  const serialised = JSON.stringify(stats).toLowerCase();
  for (const banned of ["rank", "percentile", "leaderboard", "badge", "tier"]) {
    assert.ok(!serialised.includes(banned), `stats must not expose "${banned}"`);
  }
});

/* -- contribution calendar --------------------------------------------------- */

function weeksOf(counts: number[]) {
  const weeks = [];
  for (let i = 0; i < counts.length; i += 7) {
    weeks.push({
      contributionDays: counts.slice(i, i + 7).map((count, j) => ({
        date: new Date(Date.UTC(2026, 0, 1 + i + j)).toISOString().slice(0, 10),
        contributionCount: count,
      })),
    });
  }
  return weeks;
}

test("calendar intensity levels scale to the individual, not a fixed ceiling", () => {
  const heavy = computeStats(
    makeBundle({
      contributions: makeContributions({
        contributionCalendar: {
          totalContributions: 2116,
          weeks: weeksOf(Array.from({ length: 259 }, (_, i) => 3 + (i % 17))),
        },
      }),
    }),
    SEPT,
  );

  const light = computeStats(
    makeBundle({
      contributions: makeContributions({
        contributionCalendar: {
          totalContributions: 80,
          weeks: weeksOf(Array.from({ length: 42 }, (_, i) => (i % 3) + 1)),
        },
      }),
    }),
    SEPT,
  );

  assert.ok(
    heavy.calendar.levels[3] > light.calendar.levels[3],
    "a heavy year needs a higher top threshold than a light one",
  );
  // Both developers still get four usable shades — the graph must stay legible
  // for someone averaging two contributions a day and someone averaging forty.
  for (const stats of [heavy, light]) {
    const l = stats.calendar.levels;
    assert.ok(
      l.every((v, i) => i === 0 || v > l[i - 1]),
      `levels must be strictly increasing, got ${JSON.stringify(l)}`,
    );
  }
});

test("an empty year produces a valid, non-collapsing calendar", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        contributionCalendar: { totalContributions: 0, weeks: weeksOf(new Array(365).fill(0)) },
      }),
    }),
    SEPT,
  );
  assert.equal(stats.calendar.max, 0);
  assert.deepEqual(stats.calendar.levels, [1, 2, 3, 4]);
  assert.equal(stats.calendar.weeks.length, 53);
});

test("the calendar carries counts only — nothing identifying a repository", () => {
  const stats = computeStats(
    makeBundle({
      contributions: makeContributions({
        contributionCalendar: { totalContributions: 10, weeks: weeksOf([1, 2, 3, 4]) },
      }),
    }),
    SEPT,
  );
  const keys = new Set(stats.calendar.weeks.flat().flatMap((d) => Object.keys(d)));
  assert.deepEqual([...keys].sort(), ["count", "date"]);
});

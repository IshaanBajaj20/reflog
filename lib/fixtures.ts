import type { CollectedRepo, RawBundle } from "./collect.ts";
import type { ContributionYear } from "./github.ts";

/** Test-only builders. Keeps the test files about behaviour, not scaffolding. */

export function makeRepo(overrides: Partial<CollectedRepo> = {}): CollectedRepo {
  return {
    nodeId: "R_1",
    nameWithOwner: "someone/project",
    ownerLogin: "someone",
    relation: "personal",
    isPrivate: false,
    isFork: false,
    isArchived: false,
    stars: 0,
    forks: 0,
    topics: [],
    primaryLanguage: null,
    languages: {},
    createdAt: "2026-01-01T00:00:00Z",
    pushedAt: "2026-06-01T00:00:00Z",
    activeInYear: true,
    ...overrides,
  };
}

/** Builds a calendar of `days` days from Jan 1, using `counts` cyclically. */
export function makeCalendar(year: number, days: number, counts: number[]) {
  const out: { date: string; contributionCount: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.UTC(year, 0, 1 + i));
    out.push({
      date: date.toISOString().slice(0, 10),
      contributionCount: counts[i % counts.length],
    });
  }
  return out;
}

export function makeContributions(
  overrides: Partial<ContributionYear> = {},
): ContributionYear {
  const days = overrides.contributionCalendar?.weeks
    ? []
    : makeCalendar(2026, 28, [1]);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ contributionDays: days.slice(i, i + 7) });
  }
  return {
    totalCommitContributions: 0,
    totalIssueContributions: 0,
    totalPullRequestContributions: 0,
    totalPullRequestReviewContributions: 0,
    totalRepositoryContributions: 0,
    restrictedContributionsCount: 0,
    contributionCalendar: {
      totalContributions: days.reduce((a, d) => a + d.contributionCount, 0),
      weeks,
    },
    commitContributionsByRepository: [],
    ...overrides,
  };
}

export function makeBundle(overrides: Partial<RawBundle> = {}): RawBundle {
  return {
    year: 2026,
    fetchedAt: "2026-09-22T00:00:00Z",
    scopes: ["read:user", "repo"],
    viewer: {
      nodeId: "U_1",
      login: "dev",
      name: "Dev",
      avatarUrl: "https://example.test/a.png",
      createdAt: "2019-04-02T00:00:00Z",
      followers: 0,
    },
    contributions: makeContributions(),
    history: {},
    organizations: [],
    repos: [],
    commitHours: { hours: new Array(24).fill(0), weekdays: new Array(7).fill(0), sampled: 0 },
    warnings: [],
    ...overrides,
  };
}

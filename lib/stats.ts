import type { RawBundle, CollectedRepo } from "./collect.ts";
import { calendarDays, resolveContributionTotals } from "./contributions.ts";
import { computeCadence, type Cadence } from "./cadence.ts";
import {
  computeLanguages,
  computeLanguagesByRepoCount,
  type LanguageStat,
} from "./languages.ts";
import { computeBreadth, keywordsFromRepo, type Breadth } from "./layers.ts";
import { computeCoverage, explainCoverage, type Coverage } from "./coverage.ts";

/**
 * The shape every slide reads from, and the only shape the LLM ever sees.
 * Numbers only — no repo names, no descriptions, no organisation names.
 */
export type Stats = {
  year: number;
  generatedAt: string;

  identity: {
    login: string;
    name: string | null;
    avatarUrl: string;
    accountCreatedAt: string;
    yearsOnGitHub: number;
  };

  contributions: {
    total: number;
    public: number;
    private: number;
    privateShare: number;
    /** Divided by days elapsed, not 365, so a partial year reads honestly. */
    perDay: number;
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
  };

  cadence: Cadence;

  /**
   * The contribution calendar as GitHub returns it: weeks of up to seven days,
   * Sunday first. Counts only — no repository is identifiable from this, so it
   * is safe to cache and safe to render on a public share page.
   */
  calendar: {
    weeks: { date: string; count: number }[][];
    /** Thresholds for the four non-empty intensity levels. */
    levels: [number, number, number, number];
    max: number;
  };

  /** Commit-clock, null when too few commits were sampled to mean anything. */
  clock: {
    peakHour: number | null;
    peakWeekday: number | null;
    sampled: number;
  };

  repos: {
    total: number;
    public: number;
    private: number;
    personal: number;
    organization: number;
    collaborator: number;
    activeThisYear: number;
    createdThisYear: number;
    stars: number;
    /** Repo creation counts keyed by year. */
    createdByYear: Record<number, number>;
  };

  organizations: {
    memberOf: number;
    /** Distinct orgs the user actually committed to this year. */
    contributedTo: number;
  };

  languages: {
    byBytes: LanguageStat[];
    byRepoCount: { language: string; repos: number }[];
    top: string | null;
    distinct: number;
    /** Languages whose byte count was corrected for vendored-library inflation. */
    corrected: string[];
  };

  breadth: Breadth;

  /** How much of the year is visible at repository granularity. */
  coverage: Coverage;

  /**
   * Most-committed-to repo this year. Held separately from `Stats` above in
   * spirit: it carries a name, so it is never persisted and never sent to an
   * LLM. Private repos are reported unnamed.
   */
  featured: {
    /** Null when the repo is private — we show the stack, never the name. */
    name: string | null;
    isPrivate: boolean;
    commits: number;
    stars: number;
    languages: string[];
    relation: string;
  } | null;

  warnings: string[];
};

export function computeStats(bundle: RawBundle, now: Date = new Date()): Stats {
  const { contributions, repos, viewer, year } = bundle;

  const totals = resolveContributionTotals(contributions);
  const cadence = computeCadence(calendarDays(contributions), clampToYear(now, year));

  // Per-day over days elapsed, floored at 1 so a first-day account cannot
  // divide by zero and report Infinity.
  const perDay = totals.total / Math.max(1, cadence.totalDays);

  const nonFork = repos.filter((r) => !r.isFork);
  const byBytes = computeLanguages(repos);

  const breadth = computeBreadth({
    languageBytes: Object.fromEntries(byBytes.map((l) => [l.language, l.adjustedBytes])),
    repoSignals: nonFork.map((r) => ({
      keywords: keywordsFromRepo(r.nameWithOwner, r.topics),
      primaryLanguage: r.primaryLanguage,
    })),
  });

  const contributedOrgs = new Set(
    contributions.commitContributionsByRepository
      .filter((c) => c.repository.owner.login !== viewer.login)
      .map((c) => c.repository.owner.login),
  );

  const coverage = computeCoverage(contributions, totals.total);
  const coverageNote = explainCoverage(coverage);

  return {
    year,
    generatedAt: now.toISOString(),

    identity: {
      login: viewer.login,
      name: viewer.name,
      avatarUrl: viewer.avatarUrl,
      accountCreatedAt: viewer.createdAt,
      yearsOnGitHub: Math.max(
        1,
        year - new Date(viewer.createdAt).getUTCFullYear() + 1,
      ),
    },

    contributions: {
      total: totals.total,
      public: totals.public,
      private: totals.private,
      privateShare: totals.privateShare,
      perDay: Math.round(perDay * 10) / 10,
      commits: contributions.totalCommitContributions,
      pullRequests: contributions.totalPullRequestContributions,
      reviews: contributions.totalPullRequestReviewContributions,
      issues: contributions.totalIssueContributions,
    },

    cadence,

    calendar: buildCalendar(contributions),

    clock: resolveClock(bundle),

    repos: {
      total: repos.length,
      public: repos.filter((r) => !r.isPrivate).length,
      private: repos.filter((r) => r.isPrivate).length,
      personal: repos.filter((r) => r.relation === "personal").length,
      organization: repos.filter((r) => r.relation === "organization").length,
      collaborator: repos.filter((r) => r.relation === "collaborator").length,
      activeThisYear: repos.filter((r) => r.activeInYear).length,
      createdThisYear: repos.filter(
        (r) => new Date(r.createdAt).getUTCFullYear() === year,
      ).length,
      stars: repos.reduce((sum, r) => sum + r.stars, 0),
      createdByYear: repos.reduce<Record<number, number>>((acc, r) => {
        const y = new Date(r.createdAt).getUTCFullYear();
        acc[y] = (acc[y] ?? 0) + 1;
        return acc;
      }, {}),
    },

    organizations: {
      memberOf: bundle.organizations.length,
      contributedTo: contributedOrgs.size,
    },

    languages: {
      byBytes,
      byRepoCount: computeLanguagesByRepoCount(repos),
      top: byBytes[0]?.language ?? null,
      distinct: byBytes.length,
      corrected: byBytes.filter((l) => l.inflated).map((l) => l.language),
    },

    breadth,

    coverage,

    // Withheld rather than wrong: with only aggregate visibility, the "most
    // active repo" would be whichever tiny public repo happens to be readable.
    featured: coverage.suppressRepoDetail ? null : resolveFeatured(bundle),

    warnings: coverageNote ? [...bundle.warnings, coverageNote] : bundle.warnings,
  };
}

/** A wrapped for a past year is scored over the whole year, not up to today. */
function clampToYear(now: Date, year: number): Date {
  const endOfYear = new Date(Date.UTC(year, 11, 31));
  return now < endOfYear ? now : endOfYear;
}

/** Below this many sampled commits, a "peak hour" is noise dressed as insight. */
const MIN_CLOCK_SAMPLE = 30;

function resolveClock(bundle: RawBundle): Stats["clock"] {
  const { hours, weekdays, sampled } = bundle.commitHours;
  if (sampled < MIN_CLOCK_SAMPLE) {
    return { peakHour: null, peakWeekday: null, sampled };
  }
  return {
    peakHour: hours.indexOf(Math.max(...hours)),
    peakWeekday: weekdays.indexOf(Math.max(...weekdays)),
    sampled,
  };
}

function resolveFeatured(bundle: RawBundle): Stats["featured"] {
  const ranked = [...bundle.contributions.commitContributionsByRepository].sort(
    (a, b) => b.contributions.totalCount - a.contributions.totalCount,
  );
  const top = ranked[0];
  if (!top) return null;

  const repo: CollectedRepo | undefined = bundle.repos.find(
    (r) => r.nameWithOwner === top.repository.nameWithOwner,
  );

  const isPrivate = top.repository.isPrivate || (repo?.isPrivate ?? false);

  return {
    // A private repo's name is never shown, and never leaves the server.
    name: isPrivate ? null : top.repository.nameWithOwner,
    isPrivate,
    commits: top.contributions.totalCount,
    stars: repo?.stars ?? 0,
    languages: repo
      ? Object.entries(repo.languages)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([language]) => language)
      : [],
    relation: repo?.relation ?? "collaborator",
  };
}

/**
 * Reshapes the contribution calendar for rendering, and derives the four
 * intensity thresholds from the user's own distribution.
 *
 * GitHub scales its squares against the individual's own range, which is the
 * only way the graph stays legible for someone averaging two contributions a
 * day and someone averaging forty. Quartiles of the non-empty days do this
 * without needing a hard-coded ceiling, and they degrade sensibly: a user whose
 * busiest day is 3 still gets four distinct shades rather than one.
 */
function buildCalendar(collection: ContributionYearLike): Stats["calendar"] {
  const weeks = collection.contributionCalendar.weeks.map((week) =>
    week.contributionDays.map((day) => ({ date: day.date, count: day.contributionCount })),
  );

  const nonEmpty = weeks
    .flat()
    .map((d) => d.count)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);

  if (nonEmpty.length === 0) {
    return { weeks, levels: [1, 2, 3, 4], max: 0 };
  }

  const at = (q: number) => nonEmpty[Math.min(nonEmpty.length - 1, Math.floor(nonEmpty.length * q))];
  // Strictly increasing, so two levels can never collapse into one another.
  const raw = [1, at(0.25), at(0.5), at(0.75)];
  const levels = raw.map((v, i) => Math.max(v, i + 1)) as [number, number, number, number];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] <= levels[i - 1]) levels[i] = levels[i - 1] + 1;
  }

  return { weeks, levels, max: nonEmpty[nonEmpty.length - 1] };
}

type ContributionYearLike = Pick<
  Parameters<typeof resolveContributionTotals>[0],
  "contributionCalendar"
>;

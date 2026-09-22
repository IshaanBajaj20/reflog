import type { ContributionYear } from "./github.ts";

/**
 * Resolves the headline contribution total, and the public/private split.
 *
 * VERIFIED 2026-09-22 against a real account, rolling window 2025-09-22..2026-09-22:
 *
 *   contributionCalendar.totalContributions  2116
 *   restrictedContributionsCount             2075
 *   github.com profile page                  2138
 *
 * So `totalContributions` ALREADY CONTAINS the restricted count. Adding the two
 * would have reported 4191 — nearly double the real year. This is the single
 * most consequential number in the app, so it is derived in exactly one place.
 *
 * The 22 between 2116 and the profile's 2138 is a window artefact, not a
 * counting error: GitHub's graph renders whole weeks starting Sunday, so it
 * reaches back to Sun 2025-09-21, one day earlier than the query above.
 *
 * `restrictedContributionsCount` is the subset made in private repositories.
 * On the verified account that is 98.1% of the year — which is precisely why
 * public-only tools render this developer as having made 41 contributions.
 */
export function resolveContributionTotals(collection: ContributionYear) {
  const total = collection.contributionCalendar.totalContributions;
  const priv = Math.min(collection.restrictedContributionsCount, total);
  return {
    total,
    private: priv,
    public: Math.max(0, total - priv),
    /** 0..1. Guarded so an empty year does not divide by zero. */
    privateShare: total === 0 ? 0 : priv / total,
  };
}

/** Days actually covered by the calendar, for per-day averages. */
export function calendarDays(collection: ContributionYear) {
  return collection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
}

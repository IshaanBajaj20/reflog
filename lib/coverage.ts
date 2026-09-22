import type { ContributionYear } from "./github.ts";

/**
 * How much of a year we can actually see at repository granularity.
 *
 * GitHub reports private work at two very different resolutions. The aggregate
 * `restrictedContributionsCount` is almost always available. The per-repository
 * breakdown — which repo, how many commits, what languages — requires the token
 * to actually reach those repositories, and it frequently cannot:
 *
 *   - the org enabled OAuth App access restrictions and has not approved us
 *   - the work lives in an org the user is not a member of
 *   - the commits are not on the repo's default branch
 *   - the commit email is not linked to the account
 *
 * The gap matters because every repo-level claim degrades silently when it
 * opens. A developer with 2,075 private contributions whose repos we cannot
 * reach would otherwise be told their most active project had 8 commits, which
 * is the exact misrepresentation this whole app exists to avoid. So when
 * coverage is poor we withhold the repo-level slides rather than fill them with
 * numbers we know are wrong, and say plainly that a fuller picture is available.
 */
export type CoverageLevel = "full" | "partial" | "aggregate-only";

export type Coverage = {
  totalContributions: number;
  /** Commits we can attribute to a specific repository. */
  attributableCommits: number;
  /** Repositories we can see commits in. */
  visibleRepos: number;
  /** attributableCommits / totalContributions, 0..1. */
  ratio: number;
  level: CoverageLevel;
  /** True when repo-level slides should be withheld. */
  suppressRepoDetail: boolean;
};

const FULL_THRESHOLD = 0.7;
const PARTIAL_THRESHOLD = 0.25;

export function computeCoverage(
  collection: ContributionYear,
  totalContributions: number,
): Coverage {
  const byRepo = collection.commitContributionsByRepository;
  const attributableCommits = byRepo.reduce((sum, r) => sum + r.contributions.totalCount, 0);
  const ratio = totalContributions === 0 ? 1 : attributableCommits / totalContributions;

  const level: CoverageLevel =
    ratio >= FULL_THRESHOLD ? "full" : ratio >= PARTIAL_THRESHOLD ? "partial" : "aggregate-only";

  return {
    totalContributions,
    attributableCommits,
    visibleRepos: byRepo.length,
    ratio,
    level,
    suppressRepoDetail: level === "aggregate-only",
  };
}

/** Plain-language explanation, safe to show the user. Never blames them. */
export function explainCoverage(coverage: Coverage): string | null {
  if (coverage.level === "full") return null;
  if (coverage.level === "partial") {
    return "Some of this year's work is in repositories Reflog can't read in detail, so the repo-level numbers cover part of the picture.";
  }
  return "Most of this year's work is in repositories Reflog can't read in detail. The totals are complete; the per-repository breakdown isn't, so it's left out rather than shown wrong.";
}

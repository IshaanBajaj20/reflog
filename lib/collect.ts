import { mapWithConcurrency } from "./concurrency.ts";
import {
  type CommitHourSample,
  type ContributionYear,
  type Organization,
  type Repo,
  type YearTotals,
  fetchCommitHours,
  fetchContributionYears,
  fetchContributions,
  fetchOrgRepos,
  fetchOrganizations,
  fetchOwnRepos,
  fetchRepoLanguages,
  fetchViewer,
  restRateLimit,
} from "./github.ts";

/** How the user is connected to a repo. Drives personal-vs-org accounting. */
export type RepoRelation = "personal" | "organization" | "collaborator";

export type CollectedRepo = {
  nodeId: string;
  /** Kept server-side only. Never persisted, never sent to an LLM. */
  nameWithOwner: string;
  ownerLogin: string;
  relation: RepoRelation;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  stars: number;
  forks: number;
  topics: string[];
  primaryLanguage: string | null;
  /** Bytes per language. Empty when the languages endpoint was skipped. */
  languages: Record<string, number>;
  createdAt: string;
  pushedAt: string | null;
  /** Whether the repo was pushed to during the target year. */
  activeInYear: boolean;
};

export type RawBundle = {
  year: number;
  fetchedAt: string;
  scopes: string[];
  viewer: {
    nodeId: string;
    login: string;
    name: string | null;
    avatarUrl: string;
    createdAt: string;
    followers: number;
  };
  contributions: ContributionYear;
  /** Per-year totals for every year the account has existed. */
  history: Record<number, YearTotals>;
  organizations: { login: string }[];
  repos: CollectedRepo[];
  commitHours: CommitHourSample;
  /** Non-fatal degradations worth showing the user or logging. */
  warnings: string[];
};

const LANGUAGE_CONCURRENCY = 8;
/** Above this, language fetching is capped to protect the rate limit. */
const MAX_LANGUAGE_REPOS = 300;
/** Repos sampled for the commit-hour histogram. */
const MAX_COMMIT_HOUR_REPOS = 20;

export async function collectYear(
  token: string,
  year: number,
  scopes: string[] = [],
): Promise<RawBundle> {
  const warnings: string[] = [];
  const viewer = await fetchViewer(token);

  const [contributions, organizations, ownRepos] = await Promise.all([
    fetchContributions(token, viewer.login, year),
    fetchOrganizations(token).catch((): Organization[] => {
      warnings.push("Could not read organisation membership (read:org may be restricted).");
      return [];
    }),
    fetchOwnRepos(token),
  ]);

  // /user/repos only returns org repos the user is directly affiliated with.
  // Walking each org separately is what surfaces the rest of an employer's work.
  const orgRepoLists = await mapWithConcurrency(organizations, 4, async (org) => {
    try {
      return await fetchOrgRepos(token, org.login);
    } catch {
      warnings.push(`Could not list repos for ${org.login}.`);
      return [] as Repo[];
    }
  });

  const orgLogins = new Set(organizations.map((o) => o.login));
  const repos = dedupeRepos(viewer.login, orgLogins, [...ownRepos, ...orgRepoLists.flat()]);
  const byName = new Map(repos.map((r) => [r.nameWithOwner, r]));

  // A repo counts as active this year if it was pushed to during the year OR the
  // user committed to it. The second signal matters for org repos that many
  // people push to — `pushed_at` alone credits repos the user never touched.
  const committedTo = new Set(
    contributions.commitContributionsByRepository.map((c) => c.repository.nameWithOwner),
  );
  for (const repo of repos) {
    const pushedInYear = repo.pushedAt
      ? new Date(repo.pushedAt).getUTCFullYear() === year
      : false;
    repo.activeInYear = committedTo.has(repo.nameWithOwner) || pushedInYear;
  }

  // Language bytes, prioritising repos that were actually touched this year.
  const ranked = [...repos].sort((a, b) => {
    if (a.activeInYear !== b.activeInYear) return a.activeInYear ? -1 : 1;
    return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
  });
  const languageTargets = ranked.slice(0, MAX_LANGUAGE_REPOS);
  if (ranked.length > MAX_LANGUAGE_REPOS) {
    warnings.push(
      `Language bytes read for the ${MAX_LANGUAGE_REPOS} most recently active of ${ranked.length} repos.`,
    );
  }

  await mapWithConcurrency(languageTargets, LANGUAGE_CONCURRENCY, async (repo) => {
    if ((restRateLimit.current?.remaining ?? Infinity) < 200) return;
    repo.languages = await fetchRepoLanguages(token, languagesUrlFor(repo));
  });

  if ((restRateLimit.current?.remaining ?? Infinity) < 200) {
    warnings.push("Stopped reading language bytes early to stay inside the GitHub rate limit.");
  }

  // Multi-year history, for "years of history" and the timeline slide.
  const firstYear = new Date(viewer.createdAt).getUTCFullYear();
  const years = Array.from({ length: year - firstYear + 1 }, (_, i) => firstYear + i);
  const history = await fetchContributionYears(token, viewer.login, years).catch(() => {
    warnings.push("Could not read the full contribution history.");
    return {} as Record<number, YearTotals>;
  });

  // Commit hours, sampled from the repos the user actually committed to.
  const busiest = contributions.commitContributionsByRepository
    .slice()
    .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount)
    .map((entry) => byName.get(entry.repository.nameWithOwner))
    .filter((r): r is CollectedRepo => Boolean(r))
    .slice(0, MAX_COMMIT_HOUR_REPOS);

  const commitHours = await fetchCommitHours(
    token,
    viewer.id,
    busiest.map((r) => r.nodeId),
    year,
  ).catch(() => {
    warnings.push("Could not sample commit timestamps.");
    return { hours: new Array(24).fill(0), weekdays: new Array(7).fill(0), sampled: 0 };
  });

  if (!scopes.includes("repo")) {
    warnings.push("The repo scope was not granted, so private work is not fully visible.");
  }

  return {
    year,
    fetchedAt: new Date().toISOString(),
    scopes,
    viewer: {
      nodeId: viewer.id,
      login: viewer.login,
      name: viewer.name,
      avatarUrl: viewer.avatarUrl,
      createdAt: viewer.createdAt,
      followers: viewer.followers.totalCount,
    },
    contributions,
    history,
    organizations: organizations.map((o) => ({ login: o.login })),
    repos,
    commitHours,
    warnings,
  };
}

function languagesUrlFor(repo: CollectedRepo): string {
  return `https://api.github.com/repos/${repo.nameWithOwner}/languages`;
}

function dedupeRepos(
  viewerLogin: string,
  orgLogins: Set<string>,
  repos: Repo[],
): CollectedRepo[] {
  const byId = new Map<number, CollectedRepo>();
  for (const repo of repos) {
    if (byId.has(repo.id)) continue;
    byId.set(repo.id, {
      nodeId: repo.node_id,
      nameWithOwner: repo.full_name,
      ownerLogin: repo.owner.login,
      relation: relationFor(viewerLogin, orgLogins, repo),
      isPrivate: repo.private,
      isFork: repo.fork,
      isArchived: repo.archived,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics ?? [],
      primaryLanguage: repo.language,
      languages: {},
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      activeInYear: false,
    });
  }
  return [...byId.values()];
}

function relationFor(
  viewerLogin: string,
  orgLogins: Set<string>,
  repo: Repo,
): RepoRelation {
  if (repo.owner.login === viewerLogin) return "personal";
  if (repo.owner.type === "Organization" || orgLogins.has(repo.owner.login)) {
    return "organization";
  }
  return "collaborator";
}

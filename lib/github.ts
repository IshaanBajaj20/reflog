/**
 * Thin GitHub client. Two transports because the data we need lives in both:
 * GraphQL owns the contribution calendar (including private counts), REST owns
 * repository listings and per-language byte counts.
 */

const GRAPHQL_URL = "https://api.github.com/graphql";
const REST_URL = "https://api.github.com";

export type RateLimit = { remaining: number; limit: number; resetAt: number } | null;

function readRateLimit(res: Response): RateLimit {
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining === null) return null;
  return {
    remaining: Number(remaining),
    limit: Number(res.headers.get("x-ratelimit-limit") ?? 0),
    resetAt: Number(res.headers.get("x-ratelimit-reset") ?? 0) * 1000,
  };
}

/** Last seen REST rate-limit state, updated on every call. */
export const restRateLimit: { current: RateLimit } = { current: null };

export class GitHubError extends Error {
  // Plain fields rather than parameter properties, so the whole lib/ tree runs
  // under `node --experimental-strip-types` and tests need no build step.
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.detail = detail;
  }
}

type RestOptions = {
  /** Resolve to null instead of throwing on 404/403 — used for optional resources. */
  tolerate?: number[];
};

export async function githubRest<T>(
  token: string,
  path: string,
  options: RestOptions = {},
): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${REST_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "reflog",
    },
    cache: "no-store",
  });
  restRateLimit.current = readRateLimit(res);

  if (!res.ok) {
    if (options.tolerate?.includes(res.status)) return null;
    throw new GitHubError(
      `GitHub REST ${res.status} on ${path}`,
      res.status,
      await res.text().catch(() => undefined),
    );
  }
  return (await res.json()) as T;
}

/** Walks `Link: rel="next"` pagination and concatenates every page. */
export async function githubRestPaged<T>(
  token: string,
  path: string,
  options: RestOptions & { maxPages?: number } = {},
): Promise<T[]> {
  const maxPages = options.maxPages ?? 10;
  let url: string | null = path.startsWith("http")
    ? path
    : `${REST_URL}${path}${path.includes("?") ? "&" : "?"}per_page=100`;
  const collected: T[] = [];

  for (let page = 0; page < maxPages && url; page++) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "reflog",
      },
      cache: "no-store",
    });
    restRateLimit.current = readRateLimit(res);
    if (!res.ok) {
      if (options.tolerate?.includes(res.status)) break;
      throw new GitHubError(`GitHub REST ${res.status} on ${url}`, res.status);
    }
    collected.push(...((await res.json()) as T[]));
    url = nextLink(res.headers.get("link"));
  }
  return collected;
}

function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export async function githubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "reflog",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new GitHubError(
      `GitHub GraphQL ${res.status}`,
      res.status,
      await res.text().catch(() => undefined),
    );
  }

  const payload = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (payload.errors?.length) {
    throw new GitHubError(
      payload.errors.map((e) => e.message).join("; "),
      200,
      payload.errors,
    );
  }
  if (!payload.data) throw new GitHubError("GitHub GraphQL returned no data", 200);
  return payload.data;
}

/* -------------------------------------------------------------------------- */
/* Typed helpers                                                              */
/* -------------------------------------------------------------------------- */

export type Viewer = {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  createdAt: string;
  bio: string | null;
  followers: { totalCount: number };
};

export async function fetchViewer(token: string): Promise<Viewer> {
  const data = await githubGraphQL<{ viewer: Viewer }>(
    token,
    `query {
       viewer {
         id
         login
         name
         avatarUrl
         createdAt
         bio
         followers { totalCount }
       }
     }`,
  );
  return data.viewer;
}

export type ContributionYear = {
  totalCommitContributions: number;
  totalIssueContributions: number;
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
  totalRepositoryContributions: number;
  /** Private contributions the token cannot see individually, but that still count. */
  restrictedContributionsCount: number;
  contributionCalendar: {
    totalContributions: number;
    weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
  };
  commitContributionsByRepository: {
    repository: {
      nameWithOwner: string;
      isPrivate: boolean;
      owner: { login: string; __typename: string };
    };
    contributions: { totalCount: number };
  }[];
};

export async function fetchContributions(
  token: string,
  login: string,
  year: number,
): Promise<ContributionYear> {
  return fetchContributionWindow(
    token,
    login,
    new Date(Date.UTC(year, 0, 1)).toISOString(),
    new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString(),
  );
}

/**
 * Contributions over an arbitrary window. Exposed separately so we can query
 * the same rolling 12-month window GitHub's own profile page renders, which is
 * the only way to check our totals against a number the user can see.
 */
export async function fetchContributionWindow(
  token: string,
  login: string,
  from: string,
  to: string,
): Promise<ContributionYear> {
  const data = await githubGraphQL<{ user: { contributionsCollection: ContributionYear } }>(
    token,
    `query ($login: String!, $from: DateTime!, $to: DateTime!) {
       user(login: $login) {
         contributionsCollection(from: $from, to: $to) {
           totalCommitContributions
           totalIssueContributions
           totalPullRequestContributions
           totalPullRequestReviewContributions
           totalRepositoryContributions
           restrictedContributionsCount
           contributionCalendar {
             totalContributions
             weeks { contributionDays { date contributionCount } }
           }
           commitContributionsByRepository(maxRepositories: 100) {
             repository {
               nameWithOwner
               isPrivate
               owner { login __typename }
             }
             contributions { totalCount }
           }
         }
       }
     }`,
    { login, from, to },
  );
  return data.user.contributionsCollection;
}

export type Organization = {
  login: string;
  id: number;
  description: string | null;
};

export async function fetchOrganizations(token: string): Promise<Organization[]> {
  return githubRestPaged<Organization>(token, "/user/orgs", { tolerate: [403] });
}

export type Repo = {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  owner: { login: string; type: string };
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  topics?: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  languages_url: string;
};

/** Every repo the token can see on the user's own account, public and private. */
export async function fetchOwnRepos(token: string): Promise<Repo[]> {
  return githubRestPaged<Repo>(
    token,
    "/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed",
  );
}

/** Every repo owned by an organisation the user belongs to. */
export async function fetchOrgRepos(token: string, org: string): Promise<Repo[]> {
  return githubRestPaged<Repo>(token, `/orgs/${org}/repos?type=all&sort=pushed`, {
    // Orgs with OAuth App access restrictions return 403 until an owner approves.
    tolerate: [403, 404],
  });
}

/**
 * Byte counts per language for one repo. Bytes, not the single `language` field:
 * primary-language-only breakdowns erase everything but the biggest file type.
 */
export async function fetchRepoLanguages(
  token: string,
  languagesUrl: string,
): Promise<Record<string, number>> {
  const data = await githubRest<Record<string, number>>(token, languagesUrl, {
    tolerate: [403, 404, 451],
  });
  return data ?? {};
}

export type CommitHourSample = {
  /** 24 buckets of commit counts, local to the commit's own UTC offset. */
  hours: number[];
  /** 7 buckets, 0 = Sunday. */
  weekdays: number[];
  sampled: number;
};

/**
 * Samples commit timestamps authored by the user across their busiest repos.
 * Uses each commit's own UTC offset so the hour reflects the developer's clock,
 * not the server's. Batched into one query with aliases to stay cheap.
 */
export async function fetchCommitHours(
  token: string,
  authorId: string,
  repoNodeIds: string[],
  year: number,
  commitsPerRepo = 100,
): Promise<CommitHourSample> {
  const hours = new Array<number>(24).fill(0);
  const weekdays = new Array<number>(7).fill(0);
  let sampled = 0;
  if (repoNodeIds.length === 0) return { hours, weekdays, sampled };

  const since = new Date(Date.UTC(year, 0, 1)).toISOString();
  const until = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

  const fragment = (alias: string, index: number) => `
    ${alias}: node(id: $repo${index}) {
      ... on Repository {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: ${commitsPerRepo}, since: $since, until: $until, author: { id: $authorId }) {
                nodes { committedDate }
              }
            }
          }
        }
      }
    }`;

  // Batch in groups so a single bad node id cannot void the whole sample.
  const BATCH = 10;
  for (let offset = 0; offset < repoNodeIds.length; offset += BATCH) {
    const batch = repoNodeIds.slice(offset, offset + BATCH);
    const params = batch.map((_, i) => `$repo${i}: ID!`).join(", ");
    const query = `query ($authorId: ID!, $since: GitTimestamp!, $until: GitTimestamp!, ${params}) {
      ${batch.map((_, i) => fragment(`r${i}`, i)).join("\n")}
    }`;
    const variables: Record<string, unknown> = { authorId, since, until };
    batch.forEach((id, i) => (variables[`repo${i}`] = id));

    let data: Record<string, { defaultBranchRef?: { target?: { history?: { nodes: { committedDate: string }[] } } } } | null>;
    try {
      data = await githubGraphQL(token, query, variables);
    } catch {
      continue; // One failed batch should not lose the rest of the sample.
    }

    for (const node of Object.values(data)) {
      for (const commit of node?.defaultBranchRef?.target?.history?.nodes ?? []) {
        const parsed = parseCommitLocalTime(commit.committedDate);
        if (!parsed) continue;
        hours[parsed.hour] += 1;
        weekdays[parsed.weekday] += 1;
        sampled += 1;
      }
    }
  }

  return { hours, weekdays, sampled };
}

/**
 * Reads the wall-clock hour and weekday a commit was authored in.
 *
 * GraphQL returns `committedDate` as a GitTimestamp which — unlike DateTime —
 * is NOT normalised to UTC; it keeps the author's original offset, e.g.
 * 2026-03-04T23:10:05+05:30. The written fields are therefore already the
 * developer's local time, and the offset must NOT be applied on top. Applying
 * it turns an 11pm commit in IST into a 4am one and invents a night owl that
 * is not there. The offset is matched only to validate the shape.
 */
export function parseCommitLocalTime(
  iso: string,
): { hour: number; weekday: number } | null {
  const match = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match) return null;
  const [, year, month, day, hour] = match;

  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  const h = Number(hour);
  if (h > 23 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  // Date.UTC reads the fields as UTC, which is what we want here: it lets the
  // written wall clock be read back out with no timezone conversion at all.
  const asWritten = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(asWritten.getTime())) return null;

  // Date.UTC rolls overflow forward rather than failing — month 13 silently
  // becomes January of the next year, and Feb 30 becomes March. Round-tripping
  // the fields is what catches those.
  if (
    asWritten.getUTCFullYear() !== y ||
    asWritten.getUTCMonth() !== mo - 1 ||
    asWritten.getUTCDate() !== d
  ) {
    return null;
  }

  return { hour: h, weekday: asWritten.getUTCDay() };
}

export type YearTotals = {
  /** Raw `contributionCalendar.totalContributions` — see note in lib/collect.ts. */
  calendarTotal: number;
  /** Raw `restrictedContributionsCount`. */
  restricted: number;
  commits: number;
};

/**
 * Contribution totals for every year the account has existed.
 *
 * Returns the two raw numbers unsummed on purpose. Whether the calendar total
 * already contains the restricted count depends on the viewer's permissions and
 * the account's "include private contributions" setting, and getting it wrong
 * either halves or doubles the headline number. The reconciliation lives in one
 * place, `lib/collect.ts`, rather than being assumed here.
 */
export async function fetchContributionYears(
  token: string,
  login: string,
  years: number[],
): Promise<Record<number, YearTotals>> {
  if (years.length === 0) return {};
  const params = years.map((_, i) => `$from${i}: DateTime!, $to${i}: DateTime!`).join(", ");
  const body = years
    .map(
      (_, i) => `y${i}: contributionsCollection(from: $from${i}, to: $to${i}) {
        contributionCalendar { totalContributions }
        restrictedContributionsCount
        totalCommitContributions
      }`,
    )
    .join("\n");

  const variables: Record<string, unknown> = { login };
  years.forEach((year, i) => {
    variables[`from${i}`] = new Date(Date.UTC(year, 0, 1)).toISOString();
    variables[`to${i}`] = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
  });

  const data = await githubGraphQL<{ user: Record<string, {
    contributionCalendar: { totalContributions: number };
    restrictedContributionsCount: number;
    totalCommitContributions: number;
  }> }>(
    token,
    `query ($login: String!, ${params}) { user(login: $login) { ${body} } }`,
    variables,
  );

  const out: Record<number, YearTotals> = {};
  years.forEach((year, i) => {
    const slot = data.user[`y${i}`];
    if (!slot) return;
    out[year] = {
      calendarTotal: slot.contributionCalendar.totalContributions,
      restricted: slot.restrictedContributionsCount,
      commits: slot.totalCommitContributions,
    };
  });
  return out;
}

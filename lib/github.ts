/**
 * Thin GitHub client. Two transports because the data we need lives in both:
 * GraphQL owns the contribution calendar (including private counts), REST owns
 * repository listings and per-language byte counts.
 */

const GRAPHQL_URL = "https://api.github.com/graphql";
const REST_URL = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "GitHubError";
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
};

export async function fetchContributions(
  token: string,
  login: string,
  year: number,
): Promise<ContributionYear> {
  const from = new Date(Date.UTC(year, 0, 1)).toISOString();
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

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

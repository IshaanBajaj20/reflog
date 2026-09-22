import { redirect } from "next/navigation";
import Link from "next/link";
import { DEFAULT_YEAR } from "@/lib/config";
import {
  fetchContributions,
  fetchOrganizations,
  fetchOwnRepos,
  fetchViewer,
} from "@/lib/github";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Milestone 1 sanity check: proves OAuth works end to end and shows the raw
 * shapes the stats module will be built on. Not a user-facing page.
 */
export default async function DebugPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const token = session.accessToken;
  const year = DEFAULT_YEAR;

  const [viewer, contributions, orgs, repos] = await Promise.all([
    fetchViewer(token),
    fetchContributions(token, session.login, year),
    fetchOrganizations(token),
    fetchOwnRepos(token),
  ]);

  const calendarDays = contributions.contributionCalendar.weeks.flatMap(
    (w) => w.contributionDays,
  );

  const summary = {
    year,
    grantedScopes: session.scopes,
    viewer: {
      login: viewer.login,
      name: viewer.name,
      createdAt: viewer.createdAt,
      followers: viewer.followers.totalCount,
    },
    contributions: {
      calendarTotal: contributions.contributionCalendar.totalContributions,
      restrictedPrivate: contributions.restrictedContributionsCount,
      commits: contributions.totalCommitContributions,
      pullRequests: contributions.totalPullRequestContributions,
      reviews: contributions.totalPullRequestReviewContributions,
      issues: contributions.totalIssueContributions,
      newRepositories: contributions.totalRepositoryContributions,
      calendarDaysReturned: calendarDays.length,
      busiestDay: calendarDays.reduce(
        (best, day) => (day.contributionCount > best.contributionCount ? day : best),
        { date: "—", contributionCount: 0 },
      ),
    },
    organizations: orgs.map((o) => o.login),
    repos: {
      total: repos.length,
      private: repos.filter((r) => r.private).length,
      public: repos.filter((r) => !r.private).length,
      personal: repos.filter((r) => r.owner.login === viewer.login).length,
      orgOwned: repos.filter((r) => r.owner.type === "Organization").length,
      forks: repos.filter((r) => r.fork).length,
      totalStars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
      distinctPrimaryLanguages: [
        ...new Set(repos.map((r) => r.language).filter(Boolean)),
      ].sort(),
    },
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-sm uppercase tracking-[0.25em] text-muted">
          Raw fetch · milestone 1
        </h1>
        <Link href="/api/auth/logout" className="font-mono text-xs underline">
          sign out
        </Link>
      </div>

      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 font-mono text-[13px] leading-relaxed">
        {JSON.stringify(summary, null, 2)}
      </pre>

      <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <summary className="cursor-pointer font-mono text-sm">
          First 5 repos, raw ({repos.length} fetched)
        </summary>
        <pre className="mt-4 overflow-x-auto font-mono text-[12px] leading-relaxed">
          {JSON.stringify(repos.slice(0, 5), null, 2)}
        </pre>
      </details>
    </main>
  );
}

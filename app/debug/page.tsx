import { redirect } from "next/navigation";
import Link from "next/link";
import { DEFAULT_YEAR } from "@/lib/config";
import { collectYear } from "@/lib/collect";
import { computeStats } from "@/lib/stats";
import { LAYER_LABELS } from "@/lib/layers";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Milestone 2 check: the full data layer, before any stats are derived from it.
 * Development aid only — it prints repo names, so it goes before launch.
 */
export default async function DebugPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const started = Date.now();
  const bundle = await collectYear(session.accessToken, DEFAULT_YEAR, session.scopes);
  const stats = computeStats(bundle);
  const elapsed = Date.now() - started;

  const HOURS = (h: number | null) =>
    h === null ? "not enough commits sampled" : `${String(h).padStart(2, "0")}:00`;
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Why repo-level data may be missing. Each line is a distinct cause, so the
  // fix is identifiable rather than guessed at.
  const privateReposVisible = bundle.repos.filter((r) => r.isPrivate).length;
  const orgPrivateReposVisible = bundle.repos.filter(
    (r) => r.isPrivate && r.relation === "organization",
  ).length;

  const diagnosis = {
    grantedScopes: bundle.scopes,
    hasRepoScope: bundle.scopes.includes("repo"),

    privateContributionsReported: stats.contributions.private,
    commitsAttributableToARepo: stats.coverage.attributableCommits,
    reposWeCanSeeCommitsIn: stats.coverage.visibleRepos,
    coverageLevel: stats.coverage.level,

    orgsYouBelongTo: bundle.organizations.map((o) => o.login),
    orgsWeCouldEnumerateReposFor: [
      ...new Set(
        bundle.repos.filter((r) => r.relation === "organization").map((r) => r.ownerLogin),
      ),
    ],
    privateReposVisible,
    orgPrivateReposVisible,

    likelyCause:
      !bundle.scopes.includes("repo")
        ? "The repo scope was not granted."
        : bundle.organizations.length === 0
          ? "No organisation membership is visible — read:org may be restricted, or the work is in orgs you are not a member of."
          : orgPrivateReposVisible === 0 && stats.coverage.level === "aggregate-only"
            ? "Orgs are visible but none of their private repos are. This is the signature of OAuth App access restrictions: an org owner must approve the app."
            : stats.coverage.level === "aggregate-only"
              ? "Private repos are visible but commits are not attributed to them. Check that your commit email is linked to your GitHub account, and that the work is on each repo's default branch."
              : "Coverage looks reasonable.",
  };

  const readable = {
    fetchMs: elapsed,
    ACCESS_DIAGNOSIS: diagnosis,
    warnings: stats.warnings,

    headline: {
      year: stats.year,
      contributions: stats.contributions.total,
      private: `${stats.contributions.private} (${Math.round(stats.contributions.privateShare * 100)}%)`,
      public: stats.contributions.public,
      whatPublicOnlyToolsWouldShow: stats.contributions.public,
      perDayElapsed: stats.contributions.perDay,
    },

    cadence: {
      activeDays: `${stats.cadence.activeDays} of ${stats.cadence.totalDays} days elapsed`,
      weeklyConsistency: `${Math.round(stats.cadence.weeklyConsistency * 100)}% of weeks`,
      longestStreak: stats.cadence.longestStreak,
      currentStreak: stats.cadence.currentStreak.days,
      busiestDay: stats.cadence.busiestDay,
      byMonth: stats.cadence.byMonth,
    },

    clock: {
      peakHour: HOURS(stats.clock.peakHour),
      peakWeekday: stats.clock.peakWeekday === null ? "—" : DAYS[stats.clock.peakWeekday],
      commitsSampled: stats.clock.sampled,
    },

    repos: stats.repos,
    organizations: stats.organizations,

    languages: {
      top: stats.languages.top,
      distinct: stats.languages.distinct,
      correctedForVendoring: stats.languages.corrected,
      byBytes: stats.languages.byBytes.slice(0, 12).map((l) => ({
        language: l.language,
        share: `${(l.share * 100).toFixed(1)}%`,
        raw: formatBytes(l.bytes),
        adjusted: l.inflated ? formatBytes(l.adjustedBytes) : "—",
        repos: l.repos,
        oneRepoSupplies: `${Math.round(l.concentration * 100)}%`,
        inflated: l.inflated,
      })),
      byRepoCount: stats.languages.byRepoCount.slice(0, 10),
    },

    breadth: {
      layers: stats.breadth.layers.map((l) => LAYER_LABELS[l]),
      score: `${stats.breadth.score} of 6 layers`,
      evidence: Object.fromEntries(
        Object.entries(stats.breadth.evidence).map(([k, v]) => [k, Number(v.toFixed(2))]),
      ),
    },

    featured: stats.featured,

    reposCreatedByYear: stats.repos.createdByYear,
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-sm uppercase tracking-[0.25em] text-muted">
          Stats · milestone 3
        </h1>
        <Link href="/api/auth/logout" className="font-mono text-xs underline">
          sign out
        </Link>
      </div>

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[13px] leading-relaxed text-muted">
        Everything below is computed deterministically. No model has seen any of it.
      </p>

      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 font-mono text-[13px] leading-relaxed">
        {JSON.stringify(readable, null, 2)}
      </pre>
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

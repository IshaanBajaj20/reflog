import type { CollectedRepo } from "./collect.ts";

export type LanguageStat = {
  language: string;
  /** Raw bytes, summed across every non-fork repo. Shown, never ranked on. */
  bytes: number;
  /** Bytes after the vendored-library cap. Ranking uses this. */
  adjustedBytes: number;
  /** Share of adjusted bytes across all languages, 0..1. */
  share: number;
  /** How many non-fork repos contain this language. */
  repos: number;
  /** Share of this language's raw bytes from its single biggest repo, 0..1. */
  concentration: number;
  /** True when at least one repo's contribution was capped. */
  inflated: boolean;
};

/** A repo above this share of a language's bytes is worth a note in the UI. */
export const CONCENTRATION_LIMIT = 0.4;

/** No single repo may contribute more than this multiple of the median. */
const OUTLIER_MULTIPLE = 10;

/** Floor on the cap, so developers who work in small repos are not over-corrected. */
const MIN_CAP_BYTES = 1_000_000;

/**
 * Aggregates per-repo language bytes into a ranked breakdown.
 *
 * Raw byte counts lie in two specific ways, and both are corrected here.
 *
 * 1. **Forks.** A forked repo's bytes are somebody else's work. Counting them
 *    is the fastest way to tell a developer they write a language they have
 *    never typed a line of.
 *
 * 2. **Vendored and bundled libraries.** A repo that vendors a native SDK can
 *    carry millions of bytes of C++ and make a web developer rank as a systems
 *    programmer. The correction is a cap on how much any SINGLE repository may
 *    contribute to a language: ten times the median per-repo contribution
 *    across everything the developer has written, floored at 1 MB.
 *
 *    A cap keyed to the developer's own median is what makes this work. Bundled
 *    dependencies are an order of magnitude larger than anything a person
 *    hand-writes, so they stand out against that person's own distribution,
 *    whereas any fixed byte threshold is wrong for somebody who works in a
 *    monorepo and wrong again for somebody who works in small services.
 *
 *    An earlier version of this exempted languages that appear in only one
 *    repo, on the grounds that their concentration is trivially 100%. That was
 *    backwards: one repo holding one enormous vendored library is precisely the
 *    motivating case, and the exemption let it through untouched.
 *
 * `concentration` is reported separately so the UI can say "most of this came
 * from a single repository" even where no cap was applied.
 */
export function computeLanguages(repos: CollectedRepo[]): LanguageStat[] {
  const perLanguage = new Map<string, number[]>();
  const allContributions: number[] = [];

  for (const repo of repos) {
    if (repo.isFork) continue;
    for (const [language, bytes] of Object.entries(repo.languages)) {
      if (bytes <= 0) continue;
      const list = perLanguage.get(language) ?? [];
      list.push(bytes);
      perLanguage.set(language, list);
      allContributions.push(bytes);
    }
  }

  const cap = Math.max(MIN_CAP_BYTES, OUTLIER_MULTIPLE * median(allContributions));

  const stats: LanguageStat[] = [];
  for (const [language, contributions] of perLanguage) {
    const bytes = contributions.reduce((a, b) => a + b, 0);
    const largest = Math.max(...contributions);
    const capped = contributions.map((b) => Math.min(b, cap));
    const adjustedBytes = capped.reduce((a, b) => a + b, 0);

    stats.push({
      language,
      bytes,
      adjustedBytes,
      share: 0,
      repos: contributions.length,
      concentration: bytes === 0 ? 0 : largest / bytes,
      inflated: adjustedBytes < bytes,
    });
  }

  const adjustedTotal = stats.reduce((sum, s) => sum + s.adjustedBytes, 0);
  for (const stat of stats) {
    stat.share = adjustedTotal === 0 ? 0 : stat.adjustedBytes / adjustedTotal;
  }

  return stats.sort((a, b) => b.adjustedBytes - a.adjustedBytes);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Language → repo count, using each repo's primary language. Forks excluded. */
export function computeLanguagesByRepoCount(
  repos: CollectedRepo[],
): { language: string; repos: number }[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.isFork || !repo.primaryLanguage) continue;
    counts.set(repo.primaryLanguage, (counts.get(repo.primaryLanguage) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, repoCount]) => ({ language, repos: repoCount }))
    .sort((a, b) => b.repos - a.repos);
}
